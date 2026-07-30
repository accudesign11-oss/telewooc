import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Copy, Download, ExternalLink, Loader2, RefreshCw, Send, Sparkles, Upload, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORM_OPTIONS = [
  { id: "facebook_page", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
];

const VIDEO_TOOLS = [
  { name: "Google Flow", url: "https://labs.google/fx/tools/video-fx" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "Sora", url: "https://sora.com/" },
  { name: "Runway", url: "https://app.runwayml.com/" },
];

type ProductLite = {
  id: string | number;
  name?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  permalink?: string | null;
  images?: string[];
};

type Props = {
  open: boolean;
  product: ProductLite | null;
  onOpenChange: (open: boolean) => void;
};

function stripHtml(s?: string | null) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function ProductToSocialDialog({ open, product, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["facebook_page"]);
  const [connections, setConnections] = useState<any[]>([]);
  const [rewriting, setRewriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [extraMedia, setExtraMedia] = useState<string[]>([]);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const baseText = useMemo(() => {
    if (!product) return "";
    const desc = stripHtml(product.short_description || product.description || product.long_description);
    const price = product.price ? `\n\nالسعر: ${product.price}${product.currency ? " " + product.currency : ""}` : "";
    const link = product.permalink ? `\n\n🛒 ${product.permalink}` : "";
    return `${product.name || ""}\n\n${desc}${price}${link}`.trim();
  }, [product]);

  useEffect(() => {
    if (!open) return;
    setText(baseText);
    setExtraMedia([]);
    setVideoPrompt("");
    setVideoUrl("");
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("social_platform_connections").select("id,platform,account_name,status").eq("user_id", user.id);
      setConnections(data || []);
      const connected = (data || []).filter((c: any) => c.status === "connected").map((c: any) => c.platform === "facebook_page" ? "facebook_page" : c.platform);
      if (connected.length) setPlatforms(Array.from(new Set(connected)).slice(0, 3));
    });
  }, [open, baseText]);

  const toggle = (id: string) => setPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const media = useMemo(() => {
    const imgs = (product?.images || []).filter(Boolean);
    return Array.from(new Set([...imgs, ...extraMedia, videoUrl].filter(Boolean)));
  }, [product, extraMedia, videoUrl]);

  async function rewrite() {
    const base = text.trim() || baseText;
    if (!base) return toast.error("لا يوجد نص");
    setRewriting(true);
    try {
      const platform = platforms[0] === "facebook_page" ? "facebook" : platforms[0];
      const { data, error } = await supabase.functions.invoke("rewrite-post", {
        body: { text: base, platform, tone: "تسويقي عربي جذاب للمنتج", objective: "نشر منتج جديد وحث على الشراء" },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل");
      const parts = [data.result?.hook, data.result?.text, data.result?.hashtags].filter(Boolean);
      setText(parts.join("\n\n") || base);
      toast.success("تمت إعادة الصياغة");
    } catch (e: any) { toast.error(e.message); } finally { setRewriting(false); }
  }

  async function buildVideoPrompt() {
    setVideoBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-prompt-from-post", {
        body: { text: text || baseText, media, platform: platforms[0] || "facebook", duration: "8 seconds" },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل");
      setVideoPrompt(data.result?.prompt_en || "");
      toast.success("جاهز — انسخ البرومبت وافتح أداة الفيديو");
    } catch (e: any) { toast.error(e.message); } finally { setVideoBusy(false); }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("سجل دخول");
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/product-social-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      const { data: pub } = supabase.storage.from("social-media").getPublicUrl(path);
      if (pub?.publicUrl) added.push(pub.publicUrl);
    }
    if (added.length) {
      setExtraMedia((m) => [...m, ...added]);
      toast.success(`أُضيف ${added.length} ملف`);
    }
  }

  async function createPost(mode: "publish" | "schedule") {
    if (!product) return;
    if (!text.trim()) return toast.error("النص مطلوب");
    if (!platforms.length) return toast.error("اختر منصة");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجل دخول");
      const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

      const generated: Record<string, any> = { default: text, text, body: text, profile_id: activeProfileId };
      platforms.forEach((p) => { generated[p] = text; });
      const payload: any = {
        user_id: user.id,
        title: (product.name || text.split("\n")[0] || "منتج").slice(0, 80),
        source_type: "product_publish",
        source_payload: { product_id: product.id, product_name: product.name, permalink: product.permalink, profile_id: activeProfileId },
        generated_content: generated,
        media,
        selected_platforms: platforms,
        approval_status: "approved",
        status: mode === "schedule" ? "scheduled" : "draft",
        scheduled_at: mode === "schedule" ? new Date(scheduleAt).toISOString() : null,
      };
      const { data: row, error } = await supabase.from("social_posts").insert(payload).select().single();
      if (error) throw error;
      if (mode === "schedule") {
        await supabase.from("social_schedules").upsert({
          post_id: row.id, user_id: user.id, schedule_type: "once",
          publish_at: new Date(scheduleAt).toISOString(), timezone: "Africa/Cairo",
          recurrence_type: "none", status: "active",
        }, { onConflict: "post_id" });
        toast.success("تمت الجدولة — سينشر تلقائياً");
      } else {
        const { data, error: pubError } = await supabase.functions.invoke("social-publish-post", { body: { post_id: row.id } });
        if (pubError || data?.error || data?.success === false) {
          const failed = (data?.results || []).filter((r: any) => !r.success);
          throw new Error(failed.map((r: any) => `${r.platform}: ${r.error}`).join(" — ") || data?.error || pubError?.message || "فشل النشر");
        }
        toast.success("تم النشر بنجاح");
      }
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>نشر المنتج على السوشيال</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {product?.images?.length ? (
            <div className="space-y-1">
              <Label className="text-xs">صور المنتج — حمّلها لاستخدامها في أدوات الفيديو الخارجية:</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {product.images.map((src, i) => (
                  <div key={i} className="relative group border rounded overflow-hidden">
                    <img src={src} alt={`صورة المنتج ${i + 1}`} className="w-full aspect-square object-cover" />
                    <a
                      href={src}
                      download={`product-${product.id}-${i + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="تحميل الصورة"
                    >
                      <Download className="h-4 w-4 ml-1" />تحميل
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <Label>نص المنشور (قابل للتعديل)</Label>
              <Button size="sm" variant="outline" onClick={rewrite} disabled={rewriting}>
                {rewriting ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Sparkles className="h-3 w-3 ml-1" />}
                إعادة الصياغة
              </Button>
            </div>
            <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div>
            <Label>المنصات (المربوطة تظهر مفعّلة)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORM_OPTIONS.map((p) => {
                const linked = connections.some((c) => c.platform === p.id && c.status === "connected");
                return (
                  <label key={p.id} className="flex items-center gap-2 border rounded px-3 py-1.5 cursor-pointer hover:bg-muted">
                    <Checkbox checked={platforms.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                    <span className="text-sm">{p.label}</span>
                    {linked && <Badge variant="outline" className="text-[10px]">مربوط</Badge>}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1"><Video className="h-3 w-3" />إضافة فيديو للمنتج (اختياري)</Label>
              <Button size="sm" variant="outline" onClick={buildVideoPrompt} disabled={videoBusy}>
                {videoBusy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Sparkles className="h-3 w-3 ml-1" />}
                توليد برومبت فيديو
              </Button>
            </div>
            {videoPrompt && (
              <>
                <Textarea rows={3} value={videoPrompt} readOnly className="text-xs" />
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(videoPrompt); toast.success("تم النسخ"); }}><Copy className="h-3 w-3 ml-1" />نسخ</Button>
                  {VIDEO_TOOLS.map((t) => (
                    <Button key={t.name} size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(videoPrompt); window.open(t.url, "_blank", "noopener,noreferrer"); }}>
                      <ExternalLink className="h-3 w-3 ml-1" />{t.name}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="أو الصق رابط فيديو جاهز" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
              <label className="inline-flex items-center justify-center gap-1 border rounded px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={(e) => uploadFiles(e.target.files)} />
                <Upload className="h-3 w-3" />رفع صور/فيديو
              </label>
            </div>
            {extraMedia.length > 0 && <div className="text-xs text-muted-foreground">وسائط مضافة: {extraMedia.length}</div>}
          </div>

          <div>
            <Label>وقت الجدولة (اختياري)</Label>
            <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </div>

          <Badge variant="secondary">إجمالي الوسائط في المنشور: {media.length}</Badge>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button variant="outline" onClick={() => createPost("schedule")} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CalendarClock className="h-3 w-3 ml-1" />}جدولة
          </Button>
          <Button onClick={() => createPost("publish")} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Send className="h-3 w-3 ml-1" />}نشر الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}