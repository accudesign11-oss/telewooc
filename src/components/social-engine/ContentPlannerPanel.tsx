import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange, Sparkles, Loader2, Trash2, Send, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ContentPlannerPanel() {
  const [plans, setPlans] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [name, setName] = useState("خطة المحتوى الأسبوعية");
  const [days, setDays] = useState(7);
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("جذاب تسويقي");
  const [platformsCsv, setPlatformsCsv] = useState("facebook_page,instagram");

  const loadPlans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("content_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPlans(data || []);
    if (data && data.length && !activePlanId) setActivePlanId(data[0].id);
  };

  const loadItems = async (planId: string) => {
    setLoading(true);
    const { data } = await supabase.from("content_plan_items").select("*").eq("plan_id", planId).order("date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);
  useEffect(() => { if (activePlanId) loadItems(activePlanId); else setItems([]); }, [activePlanId]);

  const generatePlan = async () => {
    if (!niche.trim()) { toast.error("اكتب وصف النيتش أو المنتجات"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-generate-plan", {
        body: {
          name, days, posts_per_day: postsPerDay, niche, tone,
          platforms: platformsCsv.split(",").map(s => s.trim()).filter(Boolean),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`تم إنشاء ${data.items_count} عنصر`);
      await loadPlans();
      if (data.plan_id) setActivePlanId(data.plan_id);
    } catch (e: any) {
      toast.error(e.message || "فشل التوليد");
    } finally {
      setGenerating(false);
    }
  };

  const convertToPost = async (item: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const platforms: string[] = item.platform ? [item.platform] : ["facebook_page"];
      const content: Record<string, string> = {};
      const body = [item.draft_content || item.idea || "", item.cta || "", item.hashtags || ""].filter(Boolean).join("\n\n");
      for (const p of platforms) content[p] = body;
      let scheduledAt: string | null = null;
      if (item.date) {
        const t = item.time || "10:00:00";
        scheduledAt = new Date(`${item.date}T${t}`).toISOString();
      }
      const { data: post, error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        title: item.idea?.slice(0, 80) || "من خطة المحتوى",
        source_type: "content_plan",
        generated_content: content,
        selected_platforms: platforms,
        media: [],
        status: scheduledAt ? "scheduled" : "draft",
        approval_status: "pending",
        scheduled_at: scheduledAt,
      }).select().single();
      if (error) throw error;
      await supabase.from("content_plan_items").update({ status: "converted", scheduled_post_id: post.id }).eq("id", item.id);
      toast.success("تم تحويله لمنشور — اعتمده من الجدولة");
      loadItems(activePlanId!);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("content_plan_items").delete().eq("id", id);
    loadItems(activePlanId!);
  };

  const deletePlan = async (id: string) => {
    if (!confirm("حذف الخطة وكل عناصرها؟")) return;
    await supabase.from("content_plan_items").delete().eq("plan_id", id);
    await supabase.from("content_plans").delete().eq("id", id);
    if (activePlanId === id) setActivePlanId(null);
    loadPlans();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" /> توليد خطة محتوى بالذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>اسم الخطة</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>النبرة</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["جذاب تسويقي","رسمي","فاخر Premium","مصري عامي","ودود","Storytelling"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>عدد الأيام</Label><Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(+e.target.value)} /></div>
            <div><Label>منشورات/يوم</Label><Input type="number" min={1} max={5} value={postsPerDay} onChange={(e) => setPostsPerDay(+e.target.value)} /></div>
            <div className="md:col-span-2"><Label>المنصات (مفصولة بفواصل)</Label>
              <Input value={platformsCsv} onChange={(e) => setPlatformsCsv(e.target.value)} placeholder="facebook_page,instagram,tiktok" />
            </div>
            <div className="md:col-span-2"><Label>وصف النيتش / المنتجات / الجمهور</Label>
              <Textarea rows={3} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="مثال: متجر أثاث منزلي فاخر، الجمهور: عرسان ومجهزي شقق، منتجات رئيسية: غرف نوم وأنتريهات." />
            </div>
          </div>
          <Button onClick={generatePlan} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            توليد الخطة
          </Button>
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>الخطط المحفوظة</span>
              <Button size="sm" variant="ghost" onClick={loadPlans}><RefreshCw className="h-3 w-3" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {plans.map(p => (
                <button key={p.id} onClick={() => setActivePlanId(p.id)}
                  className={`text-xs border rounded-full px-3 py-1 flex items-center gap-2 ${activePlanId === p.id ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}>
                  {p.name}
                  <Trash2 className="h-3 w-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); deletePlan(p.id); }} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activePlanId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">عناصر الخطة ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-6 text-center">جاري التحميل...</div>
            ) : !items.length ? (
              <div className="text-sm text-muted-foreground py-6 text-center">لا توجد عناصر</div>
            ) : (
              <div className="space-y-2">
                {items.map(it => (
                  <div key={it.id} className="border rounded p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={it.status === "converted" ? "default" : "secondary"}>{it.status || "pending"}</Badge>
                      {it.date && <span className="text-xs text-muted-foreground">📅 {it.date} {it.time || ""}</span>}
                      {it.platform && <span className="text-xs text-muted-foreground">{it.platform}</span>}
                      {it.content_type && <Badge variant="outline" className="text-[10px]">{it.content_type}</Badge>}
                    </div>
                    {it.idea && <div className="text-sm font-semibold">{it.idea}</div>}
                    {it.draft_content && <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2">{it.draft_content}</div>}
                    {it.cta && <div className="text-xs text-primary">CTA: {it.cta}</div>}
                    {it.hashtags && <div className="text-xs text-muted-foreground">{it.hashtags}</div>}
                    <div className="flex gap-2">
                      {it.status !== "converted" && (
                        <Button size="sm" onClick={() => convertToPost(it)} className="gap-1">
                          <Send className="h-3 w-3" /> تحويل لمنشور
                        </Button>
                      )}
                      {it.status === "converted" && (
                        <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> تم التحويل</Badge>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteItem(it.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
