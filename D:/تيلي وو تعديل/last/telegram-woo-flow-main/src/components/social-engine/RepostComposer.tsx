import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PagePost } from "./PagePostCard";

const PLATFORM_OPTIONS = [
  { id: "facebook_page", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "threads", label: "Threads" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
];

type Props = {
  open: boolean;
  post: PagePost | null;
  mode: "publish" | "schedule";
  initialText?: string;
  extraMedia?: any[];
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

export function RepostComposer({ open, post, mode, initialText, extraMedia, onOpenChange, onDone }: Props) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["facebook_page"]);
  const [scheduleAt, setScheduleAt] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!post) return;
    setText(initialText || post.text || "");
    setTitle((post.text || "إعادة نشر").slice(0, 80));
  }, [post, initialText, open]);

  const media = useMemo(() => extraMedia?.length ? extraMedia : (post?.media || []).map((m) => m.url), [extraMedia, post]);

  const toggle = (id: string) => setPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  async function submit() {
    if (!post) return;
    if (!text.trim()) return toast.error("النص مطلوب");
    if (!platforms.length) return toast.error("اختر منصة واحدة على الأقل");
    if (mode === "schedule" && !scheduleAt) return toast.error("اختر وقت الجدولة");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجل دخول أولاً");
      const generated: Record<string, string> = { default: text, text, body: text };
      platforms.forEach((p) => { generated[p] = text; });
      const payload: any = {
        user_id: user.id,
        title: title || "إعادة نشر",
        source_type: "page_post_repost",
        source_post_id: post.id,
        original_external_post_id: post.id,
        source_payload: post as any,
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
          post_id: row.id,
          user_id: user.id,
          schedule_type: "once",
          publish_at: new Date(scheduleAt).toISOString(),
          timezone: "Africa/Cairo",
          recurrence_type: "none",
          status: "active",
        }, { onConflict: "post_id" });
        toast.success("تمت الجدولة وستُنشر بالخلفية تلقائياً");
      } else {
        const { data, error: pubError } = await supabase.functions.invoke("social-publish-post", { body: { post_id: row.id } });
        if (pubError || data?.error || data?.success === false) {
          const failed = (data?.results || []).filter((r: any) => !r.success);
          throw new Error(failed.map((r: any) => `${r.platform}: ${r.error}`).join(" — ") || data?.error || pubError?.message || "فشل النشر");
        }
        toast.success("تم النشر بنجاح");
      }
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message || "فشل التنفيذ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{mode === "schedule" ? "إعادة جدولة منشور" : "إعادة نشر منشور"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>العنوان</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>النص</Label><Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} /></div>
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
          {mode === "schedule" && <div><Label>وقت النشر</Label><Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} /></div>}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">وسائط مرفقة: {media.length}</Badge>
            {media.slice(0, 4).map((m, i) => {
              const src = typeof m === "string" ? m : m.url;
              return src ? <img key={i} src={src} alt="وسائط إعادة النشر" className="h-12 w-12 rounded object-cover border" /> : <Badge key={i} variant="outline">{m.name || "ملف مرفوع"}</Badge>;
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Send className="h-4 w-4 ml-1" />}{mode === "schedule" ? "جدولة" : "نشر الآن"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}