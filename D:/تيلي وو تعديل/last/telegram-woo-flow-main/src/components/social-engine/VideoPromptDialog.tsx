import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ExternalLink, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PagePost } from "./PagePostCard";

const VIDEO_TOOLS = [
  { name: "Google Flow", url: "https://labs.google/fx/tools/video-fx" },
  { name: "Sora", url: "https://sora.com/" },
  { name: "Runway", url: "https://app.runwayml.com/" },
  { name: "Veo", url: "https://labs.google/fx/tools/video-fx" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "ChatGPT", url: "https://chatgpt.com/" },
];

type Props = {
  open: boolean;
  post: PagePost | null;
  onOpenChange: (open: boolean) => void;
  onUseVideo: (post: PagePost, media: any[]) => void;
};

export function VideoPromptDialog({ open, post, onOpenChange, onUseVideo }: Props) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState("");
  const [uploaded, setUploaded] = useState<any[]>([]);

  async function generate() {
    if (!post) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-prompt-from-post", {
        body: { text: post.text, media: post.media, platform: "instagram" },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل التوليد");
      setPrompt(data.result?.prompt_en || "");
      setBrief(data.result?.brief_ar || "");
      toast.success(`تم توليد البرومبت عبر ${data.provider || "AI"}`);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !post) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجل دخول أولاً");
      const next: any[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "mp4";
        const path = `${user.id}/${post.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("social-media").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        next.push({ type: file.type.startsWith("video") ? "video" : "image", bucket: "social-media", path, name: file.name, size: file.size });
      }
      setUploaded((m) => [...m, ...next]);
      toast.success(`تم رفع ${next.length} ملف`);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  function openTool(url: string, name: string) {
    if (prompt) navigator.clipboard.writeText(prompt).then(() => toast.success(`تم نسخ البرومبت — افتح ${name}`));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>تحويل المنشور إلى برومبت فيديو خارجي</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(post?.media || []).slice(0, 6).map((m, i) => <img key={i} src={m.url} alt="مرجع بصري" className="aspect-video rounded object-cover border" />)}
          </div>
          <p className="text-sm bg-muted/30 rounded p-2 whitespace-pre-wrap">{post?.text || "—"}</p>
          <Button onClick={generate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}توليد برومبت فيديو</Button>
          {brief && <Badge variant="secondary">{brief}</Badge>}
          <Textarea rows={8} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="سيظهر برومبت الفيديو الإنجليزي هنا" />
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(prompt); toast.success("تم النسخ"); }}><Copy className="h-3 w-3 ml-1" />نسخ</Button>
            {VIDEO_TOOLS.map((t) => <Button key={t.name} size="sm" variant="ghost" onClick={() => openTool(t.url, t.name)}><ExternalLink className="h-3 w-3 ml-1" />{t.name}</Button>)}
          </div>
          <div className="border rounded p-3 space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input className="hidden" type="file" multiple accept="video/*,image/*" onChange={(e) => upload(e.target.files)} />
              <span className="inline-flex items-center gap-1 border rounded px-3 py-2 hover:bg-muted"><Upload className="h-4 w-4" />Upload video</span>
            </label>
            <div className="flex flex-wrap gap-2">{uploaded.map((m, i) => <Badge key={i} variant="outline">{m.name}</Badge>)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button disabled={!post || !uploaded.length} onClick={() => post && onUseVideo(post, uploaded)}>استخدام الفيديو في منشور جديد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}