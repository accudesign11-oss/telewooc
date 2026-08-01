import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORM_OPTIONS = [
  { id: "facebook_page", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
];

type Props = {
  open: boolean;
  originalText: string;
  originalMedia?: any[];
  sourcePostId?: string;
  defaultPlatform?: string;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

export function PostRewriteDialog({ open, originalText, originalMedia = [], sourcePostId, defaultPlatform = "facebook_page", onOpenChange, onDone }: Props) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("تسويقي عربي جذاب");
  const [objective, setObjective] = useState("إعادة نشر محسّنة");
  const [platforms, setPlatforms] = useState<string[]>([defaultPlatform]);
  const [scheduleAt, setScheduleAt] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [rewriting, setRewriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setText(originalText || "");
      setHistory([]);
      setPlatforms([defaultPlatform]);
    }
  }, [open, originalText, defaultPlatform]);

  const toggle = (id: string) => setPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  async function rewrite() {
    const base = text.trim() || originalText;
    if (!base) return toast.error("لا يوجد نص لإعادة الصياغة");
    setRewriting(true);
    try {
      const platform = platforms[0] === "facebook_page" ? "facebook" : platforms[0];
      const { data, error } = await supabase.functions.invoke("rewrite-post", {
        body: { text: base, platform, tone, objective },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل إعادة الصياغة");
      const parts = [data.result?.hook, data.result?.text, data.result?.hashtags].filter(Boolean);
      const next = parts.join("\n\n") || base;
      setHistory((h) => [text, ...h].slice(0, 5));
      setText(next);
      toast.success("تمت إعادة الصياغة — يمكنك تكرارها أو التعديل");
    } catch (e: any) {
      toast.error(e.message || "فشل إعادة الصياغة");
    } finally {
      setRewriting(false);
    }
  }

  async function createPost(mode: "publish" | "schedule") {
    if (!text.trim()) return toast.error("النص مطلوب");
    if (!platforms.length) return toast.error("اختر منصة");
    if (mode === "schedule" && !scheduleAt) return toast.error("اختر وقت الجدولة");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجل دخول أولاً");
      const generated: Record<string, string> = { default: text, text, body: text };
      platforms.forEach((p) => { generated[p] = text; });
      const media = originalMedia.map((m: any) => typeof m === "string" ? m : m.url).filter(Boolean);
      const payload: any = {
        user_id: user.id,
        title: (text.split("\n")[0] || "منشور معاد صياغته").slice(0, 80),
        source_type: sourcePostId ? "page_post_rewrite" : "manual_rewrite",
        source_post_id: sourcePostId || null,
        original_external_post_id: sourcePostId || null,
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
        toast.success("تمت الجدولة — الكرون سينشر تلقائياً في الموعد");
      } else {
        const { data, error: pubError } = await supabase.functions.invoke("social-publish-post", { body: { post_id: row.id } });
        if (pubError || data?.error || data?.success === false) {
          const failed = (data?.results || []).filter((r: any) => !r.success);
          throw new Error(failed.map((r: any) => `${r.platform}: ${r.error}`).join(" — ") || data?.error || pubError?.message || "فشل النشر");
        }
        toast.success("تم النشر بنجاح");
      }
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إعادة صياغة + نشر / جدولة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {originalText && (
            <div>
              <Label className="text-xs text-muted-foreground">النص الأصلي</Label>
              <div className="text-xs bg-muted rounded p-2 whitespace-pre-wrap max-h-24 overflow-y-auto">{originalText}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>النبرة</Label><Input value={tone} onChange={(e) => setTone(e.target.value)} /></div>
            <div><Label>الهدف</Label><Input value={objective} onChange={(e) => setObjective(e.target.value)} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>النص الجديد (قابل للتعديل)</Label>
              <Button size="sm" variant="outline" onClick={rewrite} disabled={rewriting}>
                {rewriting ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <RefreshCw className="h-3 w-3 ml-1" />}
                {history.length ? "إعادة صياغة مرة أخرى" : "إعادة الصياغة بالذكاء"}
              </Button>
            </div>
            <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
            {history.length > 0 && (
              <div className="mt-2 space-y-1">
                <Label className="text-xs text-muted-foreground">النسخ السابقة (اضغط لاستعادة)</Label>
                {history.map((h, i) => (
                  <button key={i} type="button" onClick={() => setText(h)} className="block w-full text-right text-xs bg-muted/50 hover:bg-muted rounded p-1.5 truncate">
                    {h.split("\n")[0].slice(0, 100) || "(فارغ)"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>المنصات</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORM_OPTIONS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 border rounded px-3 py-1.5 cursor-pointer hover:bg-muted">
                  <Checkbox checked={platforms.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>وقت الجدولة (للجدولة فقط)</Label>
            <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </div>
          {originalMedia.length > 0 && (
            <Badge variant="secondary">وسائط مرفقة: {originalMedia.length}</Badge>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button variant="outline" onClick={() => createPost("schedule")} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CalendarClock className="h-3 w-3 ml-1" />}
            جدولة
          </Button>
          <Button onClick={() => createPost("publish")} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Send className="h-3 w-3 ml-1" />}
            نشر الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}