import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Copy, Send, CalendarClock, Save, Upload, X, Loader2, ImagePlus,
  Link as LinkIcon, ArrowUp, ArrowDown, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fileToWebpBlob, blobToBase64 } from "@/lib/webp";
import { logActivity } from "@/lib/audit";

const PLATFORMS = [
  { id: "facebook_page", label: "Facebook Page" },
  { id: "facebook_group", label: "Facebook Group" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "pinterest", label: "Pinterest" },
  { id: "threads", label: "Threads" },
  { id: "google_business", label: "Google Business" },
  { id: "whatsapp", label: "WhatsApp" },
];

interface BulkPost {
  key: string;
  title: string;
  caption: string;
  hashtags: string;
  media: string[];
  product_url: string;
  external_link: string;
  platforms: string[];
  publish_mode: "now" | "schedule" | "draft";
  scheduled_at: string;
  saving: boolean;
  saved_id?: string;
  status?: string;
}

const emptyPost = (): BulkPost => ({
  key: Math.random().toString(36).slice(2),
  title: "",
  caption: "",
  hashtags: "",
  media: [],
  product_url: "",
  external_link: "",
  platforms: ["facebook_page"],
  publish_mode: "draft",
  scheduled_at: "",
  saving: false,
});

export function BulkPublishTab() {
  const [posts, setPosts] = useState<BulkPost[]>([emptyPost()]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [imgbbKey, setImgbbKey] = useState<string>("");
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "imgbb").maybeSingle();
      setImgbbKey((data?.value as any)?.api_key || "");
    })();
  }, []);

  const update = (i: number, patch: Partial<BulkPost>) =>
    setPosts(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p));

  const move = (i: number, dir: -1 | 1) => {
    setPosts(ps => {
      const next = [...ps];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const togglePlatform = (i: number, pid: string) => {
    update(i, { platforms: posts[i].platforms.includes(pid) ? posts[i].platforms.filter(x => x !== pid) : [...posts[i].platforms, pid] });
  };

  const uploadImages = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    if (!imgbbKey) { toast.error("أضف مفتاح imgbb في الإعدادات"); return; }
    update(i, { saving: true });
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const blob = await fileToWebpBlob(f, 85);
        const b64 = await blobToBase64(blob);
        const { data, error } = await supabase.functions.invoke("imgbb-upload", { body: { image: b64, apiKey: imgbbKey } });
        if (error || !data?.url) throw new Error(error?.message || data?.error || "فشل رفع صورة");
        urls.push(data.url);
      }
      update(i, { media: [...posts[i].media, ...urls], saving: false });
      toast.success(`رُفعت ${urls.length} صورة (WebP)`);
    } catch (e: any) {
      update(i, { saving: false });
      toast.error(e.message);
    }
  };

  const addUrlImage = (i: number, url: string) => {
    if (!/^https?:\/\//i.test(url)) { toast.error("رابط غير صالح"); return; }
    update(i, { media: [...posts[i].media, url] });
  };

  const removeMedia = (i: number, mi: number) => {
    update(i, { media: posts[i].media.filter((_, x) => x !== mi) });
  };

  const moveMedia = (i: number, mi: number, dir: -1 | 1) => {
    const arr = [...posts[i].media];
    const j = mi + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[mi], arr[j]] = [arr[j], arr[mi]];
    update(i, { media: arr });
  };

  const savePost = async (i: number, action: "draft" | "now" | "schedule"): Promise<string | null> => {
    const p = posts[i];
    if (!p.caption.trim()) { toast.error("رقم " + (i + 1) + ": النص فارغ"); return null; }
    if (!p.platforms.length) { toast.error("رقم " + (i + 1) + ": اختر منصة"); return null; }
    if (action === "schedule" && !p.scheduled_at) { toast.error("رقم " + (i + 1) + ": حدد وقت الجدولة"); return null; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("سجل دخول"); return null; }

    const fullText = p.hashtags ? `${p.caption}\n\n${p.hashtags}` : p.caption;
    const generated: Record<string, string> = {};
    p.platforms.forEach(pl => { generated[pl] = fullText + (p.product_url ? `\n${p.product_url}` : p.external_link ? `\n${p.external_link}` : ""); });

    const payload: any = {
      user_id: user.id,
      title: p.title || `منشور دفعي ${i + 1}`,
      source_type: "bulk",
      source_url: p.product_url || p.external_link || null,
      generated_content: generated,
      media: p.media,
      selected_platforms: p.platforms,
      status: action === "now" ? "publishing" : action === "schedule" ? "scheduled" : "draft",
      approval_status: action === "draft" ? "pending" : "approved",
      scheduled_at: action === "schedule" ? new Date(p.scheduled_at).toISOString() : null,
    };

    let row: any;
    if (p.saved_id) {
      const { data, error } = await supabase.from("social_posts").update(payload).eq("id", p.saved_id).select().single();
      if (error) { toast.error(error.message); return null; }
      row = data;
    } else {
      const { data, error } = await supabase.from("social_posts").insert(payload).select().single();
      if (error) { toast.error(error.message); return null; }
      row = data;
      update(i, { saved_id: row.id });
    }

    if (action === "schedule") {
      await supabase.from("social_schedules").upsert({
        post_id: row.id, user_id: user.id, schedule_type: "once",
        publish_at: payload.scheduled_at, timezone: "Africa/Cairo", status: "active",
      }, { onConflict: "post_id" });
    }

    await logActivity({
      action: action === "schedule" ? "schedule" : action === "now" ? "publish" : "create",
      entity_type: "social_post",
      entity_id: row.id,
      metadata: { title: payload.title, platforms: p.platforms, mode: action },
      new_values: { caption: p.caption, hashtags: p.hashtags, media_count: p.media.length, scheduled_at: payload.scheduled_at },
      resource_url: p.product_url || p.external_link || null,
    });

    return row.id as string;
  };

  const publishNow = async (i: number) => {
    update(i, { saving: true });
    try {
      const id = await savePost(i, "now");
      if (!id) return;
      const { data, error } = await supabase.functions.invoke("social-publish-post", { body: { post_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ok = (data.results || []).filter((r: any) => r.success).length;
      const fail = (data.results || []).filter((r: any) => !r.success).length;
      if (fail === 0) { toast.success(`نُشر منشور ${i + 1} على ${ok} منصة`); update(i, { status: "published" }); }
      else if (ok === 0) { toast.error(`منشور ${i + 1}: فشل النشر`); update(i, { status: "failed" }); }
      else { toast.warning(`منشور ${i + 1}: نجح ${ok}, فشل ${fail}`); update(i, { status: "partial" }); }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      update(i, { saving: false });
    }
  };

  const runBulk = async (action: "draft" | "schedule" | "now") => {
    setBulkRunning(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < posts.length; i++) {
      try {
        if (action === "now") {
          await publishNow(i);
        } else {
          const id = await savePost(i, action);
          if (id) ok++; else fail++;
        }
      } catch { fail++; }
    }
    setBulkRunning(false);
    if (action !== "now") toast.success(`تم حفظ ${ok} منشور${fail ? ` (فشل ${fail})` : ""}`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-primary" /> النشر الدفعي — Bulk Publish
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPosts(ps => [...ps, emptyPost()])}>
                <Plus className="h-4 w-4 ml-1" /> منشور جديد
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPosts([emptyPost(), emptyPost(), emptyPost()])}>
                3 منشورات
              </Button>
              <Button size="sm" variant="secondary" disabled={bulkRunning} onClick={() => runBulk("draft")}>
                <Save className="h-4 w-4 ml-1" /> حفظ الكل مسودات
              </Button>
              <Button size="sm" disabled={bulkRunning} onClick={() => runBulk("schedule")}>
                <CalendarClock className="h-4 w-4 ml-1" /> جدولة الكل
              </Button>
              <Button size="sm" variant="destructive" disabled={bulkRunning} onClick={() => runBulk("now")}>
                <Send className="h-4 w-4 ml-1" /> نشر الكل الآن
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          أنشئ عدة منشورات دفعة واحدة. كل منشور مستقل — نص، صور (تُحوَّل تلقائياً إلى WebP)، منصات، وقت الجدولة، ثم احفظ أو انشر.
          {!imgbbKey && <span className="block text-destructive mt-1">⚠ أضف مفتاح imgbb في الإعدادات لتفعيل رفع الصور.</span>}
        </CardContent>
      </Card>

      {posts.map((p, i) => (
        <Card key={p.key} className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{i + 1}</Badge>
                {p.saved_id && <Badge variant="outline" className="text-[10px]">محفوظ</Badge>}
                {p.status && <Badge className="text-[10px]">{p.status}</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === posts.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewIdx(i)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPosts(ps => [...ps.slice(0, i + 1), { ...p, key: Math.random().toString(36).slice(2), saved_id: undefined }, ...ps.slice(i + 1)])}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPosts(ps => ps.filter((_, x) => x !== i))} disabled={posts.length === 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>عنوان داخلي</Label>
                <Input value={p.title} onChange={e => update(i, { title: e.target.value })} placeholder="اختياري" />
              </div>
              <div>
                <Label>وقت الجدولة (اختياري)</Label>
                <Input type="datetime-local" value={p.scheduled_at} onChange={e => update(i, { scheduled_at: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>نص المنشور *</Label>
              <Textarea rows={4} value={p.caption} onChange={e => update(i, { caption: e.target.value })} placeholder="اكتب نص المنشور..." />
            </div>

            <div>
              <Label>Hashtags</Label>
              <Input value={p.hashtags} onChange={e => update(i, { hashtags: e.target.value })} placeholder="#تسويق #منتج" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1"><LinkIcon className="h-3 w-3" />رابط منتج</Label>
                <Input value={p.product_url} onChange={e => update(i, { product_url: e.target.value })} placeholder="https://store.com/product/..." dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><LinkIcon className="h-3 w-3" />رابط خارجي</Label>
                <Input value={p.external_link} onChange={e => update(i, { external_link: e.target.value })} placeholder="https://..." dir="ltr" />
              </div>
            </div>

            <div>
              <Label>الصور ({p.media.length})</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="border rounded px-3 py-2 text-xs cursor-pointer hover:bg-muted/40 inline-flex items-center gap-1.5">
                  {p.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  رفع صور (WebP تلقائي)
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => uploadImages(i, e.target.files)} />
                </label>
                <Input placeholder="أو رابط صورة مباشر واضغط إضافة" className="max-w-xs" dir="ltr"
                  onKeyDown={e => { if (e.key === "Enter") { addUrlImage(i, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} />
              </div>
              {!!p.media.length && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.media.map((m, mi) => (
                    <div key={mi} className="relative group">
                      <img src={m} alt="" className="w-20 h-20 object-cover rounded border" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 rounded transition-opacity">
                        <button className="text-white text-xs bg-black/50 rounded px-1" onClick={() => moveMedia(i, mi, -1)}>◀</button>
                        <button className="text-white text-xs bg-black/50 rounded px-1" onClick={() => moveMedia(i, mi, 1)}>▶</button>
                        <button className="text-white bg-destructive rounded p-1" onClick={() => removeMedia(i, mi)}><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>المنصات *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-1">
                {PLATFORMS.map(pl => (
                  <label key={pl.id} className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-muted/30 text-xs">
                    <Checkbox checked={p.platforms.includes(pl.id)} onCheckedChange={() => togglePlatform(i, pl.id)} />
                    <span>{pl.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="secondary" onClick={() => savePost(i, "draft")} disabled={p.saving}>
                {p.saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />} حفظ كمسودة
              </Button>
              <Button size="sm" onClick={() => savePost(i, "schedule")} disabled={p.saving || !p.scheduled_at}>
                <CalendarClock className="h-4 w-4 ml-1" /> جدولة
              </Button>
              <Button size="sm" variant="destructive" onClick={() => publishNow(i)} disabled={p.saving}>
                {p.saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Send className="h-4 w-4 ml-1" />} نشر الآن
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Preview dialog */}
      {previewIdx !== null && posts[previewIdx] && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewIdx(null)}>
          <div className="bg-card rounded-xl max-w-md w-full p-4 space-y-3" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">معاينة المنشور #{previewIdx + 1}</h3>
              <Button size="icon" variant="ghost" onClick={() => setPreviewIdx(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="text-sm whitespace-pre-wrap">{posts[previewIdx].caption}</div>
            {posts[previewIdx].hashtags && <div className="text-xs text-primary">{posts[previewIdx].hashtags}</div>}
            {posts[previewIdx].media.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {posts[previewIdx].media.slice(0, 4).map((m, mi) => <img key={mi} src={m} alt="" className="rounded aspect-square object-cover" />)}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {posts[previewIdx].platforms.map(pid => <Badge key={pid} variant="secondary">{PLATFORMS.find(p => p.id === pid)?.label || pid}</Badge>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}