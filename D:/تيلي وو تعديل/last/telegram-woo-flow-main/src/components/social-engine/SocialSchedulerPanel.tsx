import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Send, Trash2, Copy, Calendar as CalendarIcon, List, Repeat, Upload, Loader2, Brain, LayoutGrid, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { anyToJpegBase64 } from "@/lib/webp";
import { Link } from "react-router-dom";

type View = "list" | "calendar";

export function SocialSchedulerPanel() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [preparing, setPreparing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>(["facebook"]);
  const [bulkStart, setBulkStart] = useState<string>(() => new Date(Date.now()+3600000).toISOString().slice(0,16));
  const [bulkGapHours, setBulkGapHours] = useState(4);
  const [bulkDistribution, setBulkDistribution] = useState<"linear"|"smart">("linear");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiReschedBusy, setAiReschedBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

    let query = supabase.from("social_posts").select("*").eq("user_id", user.id);
    if (activeProfileId !== "prof_default") {
      query = query.eq("generated_content->>profile_id", activeProfileId);
    } else {
      query = query.or("generated_content->>profile_id.eq.prof_default,generated_content->>profile_id.is.null");
    }

    const { data } = await query.order("scheduled_at", { ascending: true, nullsFirst: false });
    setPosts(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleSelect = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const selectAllVisible = () => setSelectedIds(posts.filter(p => p.status !== "published").map(p => p.id));
  const clearSelection = () => setSelectedIds([]);

  const aiReschedule = async (strategy: "smart" | "ai") => {
    if (!selectedIds.length) return toast.error("اختر منشورات أولاً");
    setAiReschedBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-optimize-schedule", {
        body: { post_ids: selectedIds, strategy },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل التوزيع");
      toast.success(`تم توزيع ${data.count} منشور على أفضل الأوقات — الكرون سينشر تلقائياً`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAiReschedBusy(false); }
  };

  const runBulkSchedule = async () => {
    const lines = bulkText.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    if (!lines.length) { toast.error("أدخل منشورات (افصل بينها بسطر فارغ)"); return; }
    if (!bulkPlatforms.length) { toast.error("اختر منصة"); return; }
    setBulkBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجّل دخول");
      const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

      const startMs = new Date(bulkStart).getTime();
      const gap = bulkGapHours * 3600 * 1000;
      // Smart distribution: spread across best hours (10, 13, 18, 21)
      const bestHours = [10, 13, 18, 21];
      const rows = lines.map((body, i) => {
        let when: Date;
        if (bulkDistribution === "linear") {
          when = new Date(startMs + i * gap);
        } else {
          const dayOffset = Math.floor(i / bestHours.length);
          const hour = bestHours[i % bestHours.length];
          when = new Date(startMs); when.setDate(when.getDate() + dayOffset); when.setHours(hour, 0, 0, 0);
        }
        const title = body.split("\n")[0].slice(0, 80);
        return {
          user_id: user.id,
          title,
          generated_content: { text: body, body, profile_id: activeProfileId } as any,
          selected_platforms: bulkPlatforms as any,
          status: "scheduled",
          approval_status: "approved",
          scheduled_at: when.toISOString(),
        };
      });
      const { error } = await supabase.from("social_posts").insert(rows);
      if (error) throw error;
      toast.success(`تمت جدولة ${rows.length} منشور`);
      setBulkOpen(false); setBulkText("");
      load();
    } catch (e:any) { toast.error(e.message); } finally { setBulkBusy(false); }
  };


  const publish = async (id: string) => {
    // Clear schedule + force approved so cron won't grab it and status flows correctly
    await supabase.from("social_posts").update({
      approval_status: "approved",
      scheduled_at: null,
      status: "publishing",
    }).eq("id", id);
    const { data, error } = await supabase.functions.invoke("social-publish-post", { body: { post_id: id } });
    if (error || data?.error || data?.success === false) {
      const failed = (data?.results || []).filter((r: any) => !r.success);
      const message = failed.map((r: any) => `${r.platform}: ${r.error}`).join(" — ");
      toast.error(message || data?.error || error?.message || "فشل النشر");
    } else {
      toast.success("تم النشر بنجاح");
    }
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف؟")) return;
    await supabase.from("social_posts").delete().eq("id", id);
    load();
  };

  const dup = async (p: any) => {
    const { id, created_at, updated_at, published_at, ...rest } = p;
    await supabase.from("social_posts").insert({ ...rest, status: "draft", approval_status: "pending", scheduled_at: null });
    toast.success("تم التكرار");
    load();
  };

  const preparePostMedia = async (p: any) => {
    const media: string[] = Array.isArray(p.media) ? p.media : [];
    if (!media.length) return;
    setPreparing(p.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");
      const { data: row } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "imgbb").maybeSingle();
      const apiKey = (row?.value as any)?.api_key;
      if (!apiKey) throw new Error("أضف مفتاح imgbb في الإعدادات");

      const converted: string[] = [];
      for (const url of media) {
        if (!/^https?:\/\//i.test(url)) continue;
        const { base64 } = await anyToJpegBase64(url, 86);
        const { data, error } = await supabase.functions.invoke("imgbb-upload", { body: { image: base64, apiKey } });
        if (error || !data?.url) throw new Error(data?.error || error?.message || "فشل تجهيز صورة");
        converted.push(data.url);
      }
      if (!converted.length) throw new Error("لا توجد صور قابلة للتجهيز");
      await supabase.from("social_posts").update({ media: Array.from(new Set(converted)) }).eq("id", p.id);
      toast.success("تم تجهيز الصور بصيغة مناسبة للنشر");
      load();
    } catch (e: any) {
      toast.error(`${e.message || "فشل تجهيز الصور"}. لو الرابط لا يسمح بالتحويل، افتح إنشاء منشور وارفع الصور من جهازك.`);
    } finally {
      setPreparing(null);
    }
  };

  // Build a 14-day calendar
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0,0,0,0); return d;
  });
  const byDay = (d: Date) => posts.filter(p => p.scheduled_at && new Date(p.scheduled_at).toDateString() === d.toDateString());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> الجدولة والمسودات</span>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><LayoutGrid className="h-3 w-3 ml-1" />جدولة جماعية</Button>
            <Button size="sm" variant="outline" onClick={() => aiReschedule("ai")} disabled={aiReschedBusy || !selectedIds.length} title="يعيد جدولة المنشورات المحددة بأفضل الأوقات">
              {aiReschedBusy ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Sparkles className="h-3 w-3 ml-1" />}
              جدولة ذكية بالمخ {selectedIds.length ? `(${selectedIds.length})` : ""}
            </Button>
            <Button size="sm" variant="outline" asChild><Link to="/content-brain"><Brain className="h-3 w-3 ml-1" />إنشاء عبر المخ</Link></Button>
            <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}><List className="h-3 w-3" /></Button>
            <Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}><CalendarIcon className="h-3 w-3" /></Button>
          </div>
        </CardTitle>
      </CardHeader>
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>جدولة جماعية لعدة منشورات</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>المنشورات (افصل بين كل منشور بسطر فارغ)</Label>
              <Textarea rows={10} value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder={"منشور 1 السطر الأول عنوان...\nالسطر الثاني نص\n\nمنشور 2..."}/>
              <p className="text-xs text-muted-foreground mt-1">{bulkText.split(/\n\s*\n/).filter(s=>s.trim()).length} منشور</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>بداية الجدولة</Label><Input type="datetime-local" value={bulkStart} onChange={e=>setBulkStart(e.target.value)}/></div>
              <div><Label>الفاصل (ساعات) - للتوزيع الخطي</Label><Input type="number" min={1} value={bulkGapHours} onChange={e=>setBulkGapHours(+e.target.value||1)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>التوزيع</Label>
                <Select value={bulkDistribution} onValueChange={(v:any)=>setBulkDistribution(v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">خطي (كل X ساعات)</SelectItem>
                    <SelectItem value="smart">ذكي (أفضل الساعات: 10, 13, 18, 21)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المنصات</Label>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["facebook","instagram","twitter","linkedin","tiktok","youtube"].map(pl => (
                    <Button key={pl} type="button" size="sm" variant={bulkPlatforms.includes(pl)?"default":"outline"} onClick={()=>setBulkPlatforms(p=>p.includes(pl)?p.filter(x=>x!==pl):[...p,pl])}>{pl}</Button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">💡 للمنشورات مع صور/فيديو أو تحليل ذكي بواسطة AI، استخدم <Link to="/content-brain" className="text-primary underline">مخ خطة المحتوى</Link>.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setBulkOpen(false)}>إلغاء</Button>
            <Button onClick={runBulkSchedule} disabled={bulkBusy}>{bulkBusy && <Loader2 className="h-3 w-3 animate-spin ml-1"/>}جدولة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">جاري التحميل...</div>
        ) : !posts.length ? (
          <div className="text-sm text-muted-foreground py-6 text-center">لا توجد منشورات بعد</div>
        ) : view === "list" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button size="sm" variant="ghost" onClick={selectAllVisible}>تحديد الكل</Button>
              {!!selectedIds.length && <Button size="sm" variant="ghost" onClick={clearSelection}>مسح ({selectedIds.length})</Button>}
            </div>
            {posts.map(p => (
              <div key={p.id} className="border rounded p-3 flex flex-wrap items-center justify-between gap-2">
                <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{p.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center mt-1">
                    <Badge variant={p.status === "published" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge>
                    <Badge variant="outline">{p.approval_status}</Badge>
                    {p.scheduled_at && <span>📅 {new Date(p.scheduled_at).toLocaleString("ar-EG")}</span>}
                    <span>{(p.selected_platforms || []).length} منصة</span>
                    {p.recurring_rule?.type && p.recurring_rule.type !== "none" && (
                      <Badge variant="outline" className="gap-1"><Repeat className="h-3 w-3" />{p.recurring_rule.type}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => dup(p)}><Copy className="h-3 w-3" /></Button>
                  {(p.media || []).length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => preparePostMedia(p)} disabled={preparing === p.id}>
                      {preparing === p.id ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Upload className="h-3 w-3 ml-1" />}
                      تجهيز الصور
                    </Button>
                  )}
                  {(p.status === "failed" || p.status === "draft" || p.status === "scheduled") && p.approval_status === "approved" && (
                    <Button size="sm" onClick={() => publish(p.id)}><Send className="h-3 w-3 ml-1" /> نشر</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const items = byDay(d);
              return (
                <div key={i} className="border rounded p-1.5 min-h-24 bg-card">
                  <div className="text-[10px] text-muted-foreground mb-1">{d.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" })}</div>
                  <div className="space-y-1">
                    {items.map(p => (
                      <div key={p.id} className="text-[10px] bg-primary/10 rounded px-1 py-0.5 truncate" title={p.title}>
                        {new Date(p.scheduled_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} · {p.title?.slice(0, 12) || "—"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
