import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Brain, Sparkles, Target, ListChecks, CalendarRange, History, Loader2, Check, X, RefreshCw, Edit3, Send, Trash2, Plus, ChevronRight, Search, Upload, ExternalLink, Wand2, Image as ImageIcon, Video, BarChart3, Download, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdsStrategyTab } from "@/pages/content-brain/tabs/AdsStrategyTab";

const PLATFORMS = [
  { v: "facebook", l: "Facebook" }, { v: "instagram", l: "Instagram" },
  { v: "tiktok", l: "TikTok" }, { v: "youtube", l: "YouTube Shorts" },
  { v: "linkedin", l: "LinkedIn" }, { v: "google_business", l: "Google Business" },
  { v: "whatsapp", l: "WhatsApp" }, { v: "pinterest", l: "Pinterest" },
  { v: "threads", l: "Threads" }, { v: "telegram", l: "Telegram" },
];
const CONTENT_PREFS = ["صور","فيديوهات","Reels","Stories","Carousel","نصوص فقط","عروض","محتوى ثقة","محتوى تعليمي","محتوى منتجات","محتوى براندنج"];
const GOALS = [
  { v: "sales", l: "مبيعات" }, { v: "whatsapp_leads", l: "رسائل واتساب" },
  { v: "traffic", l: "زيارات للموقع" }, { v: "trust", l: "بناء ثقة" },
  { v: "branding", l: "تعريف بالبراند" }, { v: "launch", l: "إطلاق منتج" },
  { v: "offers", l: "حملة عروض" }, { v: "educational", l: "محتوى تعليمي" },
  { v: "entertainment", l: "محتوى ترفيهي" }, { v: "followers", l: "زيادة المتابعين" },
  { v: "booking", l: "حجز موعد" }, { v: "retargeting", l: "Retargeting" },
  { v: "mixed", l: "Mixed Campaign" },
];
const DURATIONS = [{v:7,l:"أسبوع"},{v:14,l:"أسبوعين"},{v:30,l:"شهر"},{v:45,l:"45 يوم"},{v:90,l:"3 شهور"}];

const STATUS_BADGE: Record<string, string> = {
  suggested: "bg-muted text-muted-foreground",
  needs_review: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  converted_to_post: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

interface Plan { id:string; name:string; goal:string; duration_days:number; selected_platforms:any; content_preferences:any; analysis:any; strategy:any; status:string; created_at:string; business_description:string; website_url:string; social_links:any; brand_kit_id:string|null; notes:string; posting_frequency:string; start_date:string|null; wp_site_url?:string; wp_username?:string; wp_app_password?:string; use_woocommerce?:boolean; use_social_scan?:boolean; scanned_context?:any; plan_type?: string; sources?: any; ads_strategy?: any; }
interface Item { id:string; plan_id:string; item_index:number; scheduled_date:string; day_name:string; scheduled_time:string; platform:string; content_type:string; objective:string; idea:string; hook:string; draft_content:string; cta:string; hashtags:string; media_type:string; needs_image:boolean; needs_video:boolean; needs_carousel:boolean; needs_story:boolean; image_prompt:string; video_prompt:string; design_notes:string; priority:string; approval_status:string; linked_post_id:string|null; uploaded_media?:any; asset_status?:string; external_tool_used?:string; notes?:string; product_or_service?:string|null; reference_media?:any; }

export default function ContentBrainPage() {
  const [tab, setTab] = useState("setup");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandKits, setBrandKits] = useState<any[]>([]);

  // Setup form
  const [form, setForm] = useState({
    name: "", brand_kit_id: "none", business_description: "", website_url: "",
    facebook_url: "", instagram_url: "", tiktok_url: "", linkedin_url: "", google_business_url: "",
    notes: "", goal: "mixed", duration_days: 30, posting_frequency: "auto",
    selected_platforms: ["facebook","instagram"] as string[],
    content_preferences: ["صور","عروض","محتوى ثقة"] as string[],
    wp_site_url: "", wp_username: "", wp_app_password: "",
    use_woocommerce: false, use_social_scan: true,
  });
  const [scanning, setScanning] = useState(false);

  useEffect(() => { loadPlans(); loadBrandKits(); }, []);
  useEffect(() => { if (currentPlan) loadItems(currentPlan.id); else setItems([]); }, [currentPlan?.id]);

  async function loadPlans() {
    const { data } = await supabase.from("content_brain_plans").select("*").order("created_at",{ascending:false});
    setPlans((data as any) || []);
  }
  async function loadBrandKits() {
    const { data } = await supabase.from("brand_kits").select("id, brand_name").order("created_at",{ascending:false}).limit(20);
    setBrandKits(data || []);
  }
  async function loadItems(planId: string) {
    const { data } = await supabase.from("content_brain_items").select("*").eq("plan_id", planId).order("item_index");
    setItems((data as any) || []);
  }

  async function savePlan() {
    if (!form.name.trim()) return toast.error("اسم الخطة مطلوب");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("سجل دخول أولاً");
    const payload = {
      user_id: user.id,
      name: form.name,
      brand_kit_id: form.brand_kit_id !== "none" ? form.brand_kit_id : null,
      business_description: form.business_description,
      website_url: form.website_url,
      social_links: { facebook: form.facebook_url, instagram: form.instagram_url, tiktok: form.tiktok_url, linkedin: form.linkedin_url, google_business: form.google_business_url },
      notes: form.notes,
      goal: form.goal,
      duration_days: form.duration_days,
      posting_frequency: form.posting_frequency,
      selected_platforms: form.selected_platforms,
      content_preferences: form.content_preferences,
      wp_site_url: form.wp_site_url || null,
      wp_username: form.wp_username || null,
      wp_app_password: form.wp_app_password || null,
      use_woocommerce: form.use_woocommerce,
      use_social_scan: form.use_social_scan,
      start_date: new Date().toISOString().slice(0,10),
    };
    if (currentPlan) {
      const { data, error } = await supabase.from("content_brain_plans").update(payload).eq("id", currentPlan.id).select().single();
      if (error) return toast.error(error.message);
      setCurrentPlan(data as any); toast.success("تم الحفظ");
    } else {
      const { data, error } = await supabase.from("content_brain_plans").insert(payload).select().single();
      if (error) return toast.error(error.message);
      setCurrentPlan(data as any); toast.success("تم إنشاء الخطة");
    }
    loadPlans();
  }

  async function runScanSources() {
    if (!currentPlan) return toast.error("احفظ الخطة أولاً");
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-brain-scan-sources", { body: { plan_id: currentPlan.id } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success("تم مسح المصادر");
      const { data: p } = await supabase.from("content_brain_plans").select("*").eq("id", currentPlan.id).single();
      setCurrentPlan(p as any);
    } catch (e: any) { toast.error(e.message); } finally { setScanning(false); }
  }
  async function runAnalyze() {
    if (!currentPlan) return toast.error("احفظ الخطة أولاً");
    setLoading(true);
    try {
      // Auto-scan sources before analysis if not scanned yet
      if (!currentPlan.scanned_context || Object.keys(currentPlan.scanned_context).length === 0) {
        await supabase.functions.invoke("content-brain-scan-sources", { body: { plan_id: currentPlan.id } });
      }
      const { data, error } = await supabase.functions.invoke("content-brain-analyze", { body: { plan_id: currentPlan.id } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success("اكتمل التحليل");
      const { data: p } = await supabase.from("content_brain_plans").select("*").eq("id", currentPlan.id).single();
      setCurrentPlan(p as any); setTab("analysis");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function runStrategy() {
    if (!currentPlan?.analysis) return toast.error("شغّل التحليل أولاً");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-brain-generate-strategy", { body: { plan_id: currentPlan.id } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success("تم بناء الاستراتيجية");
      const { data: p } = await supabase.from("content_brain_plans").select("*").eq("id", currentPlan.id).single();
      setCurrentPlan(p as any); setTab("strategy");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function runGeneratePlan() {
    if (!currentPlan?.analysis) return toast.error("شغّل التحليل أولاً");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-brain-generate-plan", { body: { plan_id: currentPlan.id, replace: true } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success(`تم توليد ${data.count} عنصر`);
      loadItems(currentPlan.id); setTab("plan");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function runFullBrainAutoFlow() {
    if (!currentPlan) return toast.error("احفظ الخطة أولاً");
    setLoading(true);
    try {
      toast.info("1/4: جاري مسح المصادر والمنتجات والصفحات المربوطة...");
      await supabase.functions.invoke("content-brain-scan-sources", { body: { plan_id: currentPlan.id } });

      toast.info("2/4: جاري تحليل النشاط والجمهور واستخراج الرؤى...");
      const { data: aData, error: aErr } = await supabase.functions.invoke("content-brain-analyze", { body: { plan_id: currentPlan.id } });
      if (aErr || !aData?.ok) throw new Error(aData?.error || aErr?.message || "فشل التحليل");

      toast.info("3/4: جاري بناء استراتيجية توزيع المحتوى وتوزيع المنصات...");
      const { data: sData, error: sErr } = await supabase.functions.invoke("content-brain-generate-strategy", { body: { plan_id: currentPlan.id } });
      if (sErr || !sData?.ok) throw new Error(sData?.error || sErr?.message || "فشل بناء الاستراتيجية");

      toast.info("4/4: جاري توليد عناصر المحتوى كاملة والنصوص والبرومبتات...");
      const { data: gData, error: gErr } = await supabase.functions.invoke("content-brain-generate-plan", { body: { plan_id: currentPlan.id, replace: true } });
      if (gErr || !gData?.ok) throw new Error(gData?.error || gErr?.message || "فشل توليد العناصر");

      toast.success(`🎉 اكتمل تشغيل المخ بنجاح! تم إنشاء وتجهيز ${gData.count || 0} منشوراً.`);
      const { data: p } = await supabase.from("content_brain_plans").select("*").eq("id", currentPlan.id).single();
      setCurrentPlan(p as any);
      loadItems(currentPlan.id);
      setTab("plan");
    } catch (e: any) {
      toast.error(`تعطل المخ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function publishItemNow(item: Item) {
    setLoading(true);
    try {
      // approve + convert single item scheduled to now
      await supabase.from("content_brain_items").update({ approval_status: "approved" }).eq("id", item.id);
      const { data, error } = await supabase.functions.invoke("content-brain-execute-approved", {
        body: { plan_id: currentPlan!.id, mode: "scheduled", item_ids: [item.id] },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success("تم إرسال المنشور للنشر");
      if (currentPlan) loadItems(currentPlan.id);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  async function updateItem(id: string, patch: Partial<Item>) {
    const { error } = await supabase.from("content_brain_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.map(i => i.id === id ? { ...i, ...patch } as Item : i));
  }
  async function regenerateItem(id: string, instruction: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-brain-regenerate-item", { body: { item_id: id, instruction } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success("تم إعادة التوليد");
      if (currentPlan) loadItems(currentPlan.id);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function bulkApprove() {
    if (!currentPlan) return;
    const ids = items.filter(i => i.approval_status !== "converted_to_post" && i.approval_status !== "rejected").map(i => i.id);
    if (!ids.length) return;
    await supabase.from("content_brain_items").update({ approval_status: "approved" }).in("id", ids);
    toast.success(`تم اعتماد ${ids.length} عنصر`);
    loadItems(currentPlan.id);
  }
  async function executeApproved(mode: "draft" | "needs_review" | "scheduled") {
    if (!currentPlan) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-brain-execute-approved", { body: { plan_id: currentPlan.id, mode } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success(`تم تحويل ${data.converted} منشور (مجدول: ${data.scheduled}, متجاوز: ${data.skipped})`);
      loadItems(currentPlan.id);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  async function deletePlan(p: Plan) {
    if (!confirm("حذف الخطة وكل عناصرها؟")) return;
    await supabase.from("content_brain_plans").delete().eq("id", p.id);
    if (currentPlan?.id === p.id) setCurrentPlan(null);
    loadPlans();
  }

  const stats = useMemo(() => ({
    total: items.length,
    suggested: items.filter(i => i.approval_status === "suggested").length,
    approved: items.filter(i => i.approval_status === "approved").length,
    rejected: items.filter(i => i.approval_status === "rejected").length,
    converted: items.filter(i => i.approval_status === "converted_to_post").length,
  }), [items]);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">مخ خطة المحتوى</h1>
            <p className="text-sm text-muted-foreground">يخطط ويفكر وينظم — لا ينشر مباشرة. الموافقة ثم التحويل إلى تاب النشر والجدولة.</p>
          </div>
          {currentPlan && (
            <div className="mr-auto flex items-center gap-2">
              <Badge variant="secondary">
                {currentPlan.name} <span className="opacity-60 mx-1">·</span> {currentPlan.status}
              </Badge>
              <Button onClick={runFullBrainAutoFlow} disabled={loading} size="sm" className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold shadow">
                {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Zap className="h-4 w-4 ml-1 fill-current" />}
                تشغيل المخ بالكامل (تلقائي)
              </Button>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="setup"><Plus className="h-4 w-4 ml-1"/>إعداد الخطة</TabsTrigger>
            <TabsTrigger value="analysis"><Sparkles className="h-4 w-4 ml-1"/>التحليل</TabsTrigger>
            <TabsTrigger value="strategy"><Target className="h-4 w-4 ml-1"/>الاستراتيجية</TabsTrigger>
            <TabsTrigger value="ads"><BarChart3 className="h-4 w-4 ml-1"/>استراتيجية إعلانات ممولة</TabsTrigger>
            <TabsTrigger value="plan"><ListChecks className="h-4 w-4 ml-1"/>الجدول</TabsTrigger>
            <TabsTrigger value="approval"><Check className="h-4 w-4 ml-1"/>الموافقة والتنفيذ</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarRange className="h-4 w-4 ml-1"/>التقويم</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 ml-1"/>السجل</TabsTrigger>
          </TabsList>

          {/* SETUP */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إعداد خطة المحتوى</CardTitle>
                <CardDescription>أدخل بيانات النشاط والمصادر والمنصات والهدف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>اسم الخطة *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                  <div>
                    <Label>Brand Kit</Label>
                    <Select value={form.brand_kit_id} onValueChange={v=>setForm({...form,brand_kit_id:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        {brandKits.map(b=><SelectItem key={b.id} value={b.id}>{b.brand_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>وصف النشاط</Label><Textarea rows={3} value={form.business_description} onChange={e=>setForm({...form,business_description:e.target.value})}/></div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Website URL</Label><Input value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})}/></div>
                  <div><Label>Facebook Page</Label><Input value={form.facebook_url} onChange={e=>setForm({...form,facebook_url:e.target.value})}/></div>
                  <div><Label>Instagram</Label><Input value={form.instagram_url} onChange={e=>setForm({...form,instagram_url:e.target.value})}/></div>
                  <div><Label>TikTok</Label><Input value={form.tiktok_url} onChange={e=>setForm({...form,tiktok_url:e.target.value})}/></div>
                  <div><Label>LinkedIn</Label><Input value={form.linkedin_url} onChange={e=>setForm({...form,linkedin_url:e.target.value})}/></div>
                  <div><Label>Google Business</Label><Input value={form.google_business_url} onChange={e=>setForm({...form,google_business_url:e.target.value})}/></div>
                </div>
                <div><Label>ملاحظات إضافية</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>

                <Separator/>
                <div className="space-y-3 border rounded p-3 bg-muted/20">
                  <div className="font-semibold text-sm flex items-center gap-2"><Search className="h-4 w-4"/>مصادر البناء (يقرأها المخ لبناء الخطة)</div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div><Label>رابط ووردبريس (لتصفح الموقع)</Label><Input placeholder="https://example.com" value={form.wp_site_url} onChange={e=>setForm({...form,wp_site_url:e.target.value})}/></div>
                    <div><Label>WP Username</Label><Input value={form.wp_username} onChange={e=>setForm({...form,wp_username:e.target.value})}/></div>
                    <div><Label>WP Application Password</Label><Input type="password" placeholder="xxxx xxxx xxxx" value={form.wp_app_password} onChange={e=>setForm({...form,wp_app_password:e.target.value})}/></div>
                  </div>
                  <p className="text-xs text-muted-foreground">أنشئ Application Password من WP Admin → Users → Profile → Application Passwords. اختياري لتصفح صفحات ومنشورات محمية.</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.use_woocommerce} onCheckedChange={c=>setForm({...form,use_woocommerce:!!c})}/><span className="text-sm">قراءة منتجات WooCommerce المرتبطة</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.use_social_scan} onCheckedChange={c=>setForm({...form,use_social_scan:!!c})}/><span className="text-sm">تصفح صفحات Facebook/Instagram المربوطة</span></label>
                  </div>
                  {currentPlan && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={runScanSources} disabled={scanning}>
                        {scanning ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <Search className="h-4 w-4 ml-1"/>}
                        مسح المصادر الآن
                      </Button>
                      {currentPlan.scanned_context?.scanned_at && (
                        <span className="text-xs text-muted-foreground">آخر مسح: {new Date(currentPlan.scanned_context.scanned_at).toLocaleString("ar-EG")}</span>
                      )}
                      {currentPlan.scanned_context?.wp?.posts?.length ? <Badge variant="secondary">WP: {currentPlan.scanned_context.wp.posts.length} منشور</Badge> : null}
                      {currentPlan.scanned_context?.woo?.count ? <Badge variant="secondary">Woo: {currentPlan.scanned_context.woo.count} منتج</Badge> : null}
                      {currentPlan.scanned_context?.social?.length ? <Badge variant="secondary">Social: {currentPlan.scanned_context.social.length} حساب</Badge> : null}
                    </div>
                  )}
                </div>



                <Separator/>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>الهدف</Label>
                    <Select value={form.goal} onValueChange={v=>setForm({...form,goal:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{GOALS.map(g=><SelectItem key={g.v} value={g.v}>{g.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>المدة</Label>
                    <Select value={String(form.duration_days)} onValueChange={v=>setForm({...form,duration_days:+v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{DURATIONS.map(d=><SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>تردد النشر</Label>
                    <Select value={form.posting_frequency} onValueChange={v=>setForm({...form,posting_frequency:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto Suggest</SelectItem>
                        <SelectItem value="3w">3 أسبوعياً</SelectItem>
                        <SelectItem value="5w">5 أسبوعياً</SelectItem>
                        <SelectItem value="daily">يومياً</SelectItem>
                        <SelectItem value="2daily">2 يومياً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">المنصات</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p=>(
                      <label key={p.v} className="flex items-center gap-2 border rounded px-3 py-1.5 cursor-pointer hover:bg-muted">
                        <Checkbox checked={form.selected_platforms.includes(p.v)} onCheckedChange={c=>setForm({...form, selected_platforms: c ? [...form.selected_platforms,p.v] : form.selected_platforms.filter(x=>x!==p.v)})}/>
                        <span className="text-sm">{p.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">تفضيلات المحتوى</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_PREFS.map(c=>(
                      <label key={c} className="flex items-center gap-2 border rounded px-3 py-1.5 cursor-pointer hover:bg-muted">
                        <Checkbox checked={form.content_preferences.includes(c)} onCheckedChange={v=>setForm({...form, content_preferences: v ? [...form.content_preferences,c] : form.content_preferences.filter(x=>x!==c)})}/>
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={savePlan}>{currentPlan ? "تحديث الخطة" : "حفظ الخطة"}</Button>
                  <Button onClick={runFullBrainAutoFlow} disabled={!currentPlan || loading} className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold">
                    {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <Zap className="h-4 w-4 ml-1 fill-current"/>}
                    ⚡ تشغيل المخ بالكامل (مسح + تحليل + استراتيجية + منشورات)
                  </Button>
                  <Button onClick={runAnalyze} disabled={!currentPlan || loading} variant="outline">
                    {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <Sparkles className="h-4 w-4 ml-1"/>}
                    تحليل وبناء استراتيجية فقط
                  </Button>
                  <Button variant="outline" onClick={()=>{setCurrentPlan(null); setForm({...form,name:"",business_description:""}); }}>خطة جديدة</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYSIS */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div><CardTitle>تحليل البراند والمصادر</CardTitle><CardDescription>قراءة المدخلات واستخراج رؤى</CardDescription></div>
                <Button onClick={runAnalyze} disabled={!currentPlan || loading}>
                  {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <RefreshCw className="h-4 w-4 ml-1"/>}
                  إعادة تحليل
                </Button>
              </CardHeader>
              <CardContent>
                {!currentPlan?.analysis ? (
                  <p className="text-muted-foreground text-sm">لم يتم التحليل بعد. احفظ الخطة ثم اضغط "تحليل".</p>
                ) : (
                  <div className="space-y-4">
                    <InfoCard title="ملخص التحليل" content={currentPlan.analysis.summary}/>
                    {currentPlan.analysis.quantitative_recommendations && (
                      <Card className="bg-primary/5 border-primary/30">
                        <CardHeader className="pb-2"><CardTitle className="text-base">التوصيات الكمية للمحتوى</CardTitle><CardDescription>سيتم توليد هذه الأعداد عند "توليد المنشورات"</CardDescription></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                            <StatBox label="Reels" value={currentPlan.analysis.quantitative_recommendations.reels}/>
                            <StatBox label="فيديوهات" value={currentPlan.analysis.quantitative_recommendations.videos}/>
                            <StatBox label="صور" value={currentPlan.analysis.quantitative_recommendations.images}/>
                            <StatBox label="نصوص" value={currentPlan.analysis.quantitative_recommendations.texts}/>
                            <StatBox label="Carousel" value={currentPlan.analysis.quantitative_recommendations.carousels}/>
                            <StatBox label="Branding" value={currentPlan.analysis.quantitative_recommendations.branding}/>
                            <StatBox label="الإجمالي" value={currentPlan.analysis.quantitative_recommendations.total}/>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                      <ListCard title="✅ نقاط القوة" items={currentPlan.analysis.strengths || currentPlan.analysis.selling_points}/>
                      <ListCard title="⚠️ نقاط الضعف" items={currentPlan.analysis.weaknesses || currentPlan.analysis.issues_to_address}/>
                      <ListCard title="💡 الفرص" items={currentPlan.analysis.opportunities}/>
                      <ListCard title="🎯 محاور التركيز" items={currentPlan.analysis.focus_areas}/>
                      <InfoCard title="الجمهور المستهدف" content={currentPlan.analysis.target_audience}/>
                      <InfoCard title="أسلوب التواصل" content={currentPlan.analysis.communication_style}/>
                      <ListCard title="أفضل المنصات" items={currentPlan.analysis.best_platforms}/>
                      <ListCard title="أفضل أنواع المحتوى" items={currentPlan.analysis.best_content_types}/>
                      <ListCard title="🚀 التوصيات العملية" items={currentPlan.analysis.recommendations}/>
                      <ListCard title="تحذيرات" items={currentPlan.analysis.warnings}/>
                    </div>
                  </div>
                )}
                {currentPlan?.analysis && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={runGeneratePlan} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <ListChecks className="h-4 w-4 ml-1"/>}
                      ولّد المنشورات ({currentPlan.analysis?.quantitative_recommendations?.total || 0})
                    </Button>
                    <Button variant="outline" onClick={runStrategy} disabled={loading}>
                      <Target className="h-4 w-4 ml-1"/>بناء استراتيجية مفصلة (اختياري)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STRATEGY */}
          <TabsContent value="strategy" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div><CardTitle>الاستراتيجية المقترحة</CardTitle><CardDescription>توزيع المنشورات بذكاء حسب الهدف</CardDescription></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={runStrategy} disabled={loading}><RefreshCw className="h-4 w-4 ml-1"/>إعادة توليد</Button>
                  <Button onClick={runGeneratePlan} disabled={!currentPlan?.strategy || loading}>
                    {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin"/> : <ListChecks className="h-4 w-4 ml-1"/>}
                    توليد جدول المحتوى
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!currentPlan?.strategy ? (
                  <p className="text-muted-foreground text-sm">لم تُبنَ بعد.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <StatBox label="إجمالي المنشورات" value={currentPlan.strategy.total_posts}/>
                      <StatBox label="Stories" value={currentPlan.strategy.stories}/>
                      <StatBox label="Reels" value={currentPlan.strategy.reels}/>
                      <StatBox label="Carousel" value={currentPlan.strategy.carousels}/>
                      <StatBox label="منشورات منتجات" value={currentPlan.strategy.product_posts}/>
                      <StatBox label="عروض" value={currentPlan.strategy.offer_posts}/>
                      <StatBox label="ثقة" value={currentPlan.strategy.trust_posts}/>
                      <StatBox label="تعليمي" value={currentPlan.strategy.educational_posts}/>
                      <StatBox label="براند" value={currentPlan.strategy.brand_posts}/>
                      <StatBox label="WhatsApp" value={currentPlan.strategy.whatsapp_messages}/>
                      <StatBox label="Google Biz" value={currentPlan.strategy.google_business_posts}/>
                      <StatBox label="مدة" value={`${currentPlan.strategy.duration_days} يوم`}/>
                    </div>
                    {currentPlan.strategy.best_days && (
                      <div><Label>أفضل الأيام: </Label>{(currentPlan.strategy.best_days||[]).join("، ")}</div>
                    )}
                    {currentPlan.strategy.best_times && (
                      <div><Label>أفضل الأوقات: </Label>{(currentPlan.strategy.best_times||[]).join("، ")}</div>
                    )}
                    {currentPlan.strategy.reasoning && (
                      <div className="bg-muted/40 p-3 rounded text-sm whitespace-pre-wrap">{currentPlan.strategy.reasoning}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <AdsStrategyTab currentPlan={currentPlan} onPlanReady={(plan) => { setCurrentPlan(plan); loadPlans(); loadItems(plan.id); }} />
          </TabsContent>

          {/* PLAN ITEMS */}
          <TabsContent value="plan" className="space-y-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>جدول خطة المحتوى</CardTitle>
                    <CardDescription>{stats.total} عنصر · معتمد {stats.approved} · مرفوض {stats.rejected} · مُحول {stats.converted}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={runGeneratePlan} disabled={loading}><RefreshCw className="h-4 w-4 ml-1"/>إعادة توليد</Button>
                    <Button onClick={bulkApprove}><Check className="h-4 w-4 ml-1"/>اعتماد الكل</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!items.length ? <p className="text-muted-foreground text-sm">لا توجد عناصر — ولّد الخطة من تاب الاستراتيجية.</p> : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {items.map(it => <ItemCard key={it.id} item={it} onUpdate={updateItem} onRegenerate={regenerateItem} onPublishNow={publishItemNow}/>)}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPROVAL */}
          <TabsContent value="approval" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>الموافقة والتنفيذ</CardTitle><CardDescription>تحويل العناصر المعتمدة إلى منشورات في تاب النشر والجدولة</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <StatBox label="الكل" value={stats.total}/>
                  <StatBox label="مقترح" value={stats.suggested}/>
                  <StatBox label="معتمد" value={stats.approved}/>
                  <StatBox label="مرفوض" value={stats.rejected}/>
                  <StatBox label="مُحول" value={stats.converted}/>
                </div>
                <Separator/>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={bulkApprove}><Check className="h-4 w-4 ml-1"/>اعتماد كل المقترحات</Button>
                  <Button onClick={()=>executeApproved("draft")} disabled={!stats.approved || loading} variant="outline">
                    <Send className="h-4 w-4 ml-1"/>تحويل لمسودات
                  </Button>
                  <Button onClick={()=>executeApproved("needs_review")} disabled={!stats.approved || loading} variant="outline">
                    <Edit3 className="h-4 w-4 ml-1"/>تحويل لمراجعة
                  </Button>
                  <Button onClick={()=>executeApproved("scheduled")} disabled={!stats.approved || loading}>
                    <CalendarRange className="h-4 w-4 ml-1"/>تحويل وجدولة فورية
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">العناصر المعتمدة فقط تُحول. النشر الفعلي يتم تلقائياً من تاب النشر والجدولة (pg_cron كل دقيقة).</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDAR */}
          <TabsContent value="calendar" className="space-y-3">
            <CalendarView items={items}/>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>سجل الخطط</CardTitle></CardHeader>
              <CardContent>
                {!plans.length ? <p className="text-muted-foreground text-sm">لا توجد خطط بعد.</p> : (
                  <div className="space-y-2">
                    {plans.map(p => (
                      <div key={p.id} className={`border rounded p-3 flex items-center justify-between ${currentPlan?.id===p.id ? "border-primary bg-primary/5" : ""}`}>
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.goal} · {p.duration_days} يوم · {p.status} · {new Date(p.created_at).toLocaleDateString("ar-EG")}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={()=>{setCurrentPlan(p); setForm({
                            ...form, name:p.name, brand_kit_id: p.brand_kit_id || "none",
                            business_description: p.business_description||"", website_url:p.website_url||"",
                            facebook_url: p.social_links?.facebook||"", instagram_url: p.social_links?.instagram||"",
                            tiktok_url: p.social_links?.tiktok||"", linkedin_url: p.social_links?.linkedin||"",
                            google_business_url: p.social_links?.google_business||"", notes: p.notes||"",
                            goal: p.goal||"mixed", duration_days: p.duration_days||30, posting_frequency: p.posting_frequency||"auto",
                            selected_platforms: p.selected_platforms||[], content_preferences: p.content_preferences||[],
                            wp_site_url: (p as any).wp_site_url||"", wp_username: (p as any).wp_username||"", wp_app_password: (p as any).wp_app_password||"",
                            use_woocommerce: !!(p as any).use_woocommerce, use_social_scan: (p as any).use_social_scan !== false,
                          }); setTab("setup"); }}><ChevronRight className="h-4 w-4"/>فتح</Button>
                          <Button size="sm" variant="ghost" onClick={()=>deletePlan(p)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function InfoCard({title, content}:{title:string;content:any}) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{content || "—"}</CardContent></Card>;
}
function ListCard({title, items}:{title:string;items:any}) {
  const list = Array.isArray(items) ? items : [];
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{list.length ? <ul className="text-sm space-y-1 list-disc pr-4">{list.map((x,i)=><li key={i}>{String(x)}</li>)}</ul> : <span className="text-xs text-muted-foreground">—</span>}</CardContent></Card>;
}
function StatBox({label, value}:{label:string;value:any}) {
  return <div className="border rounded p-2 text-center bg-muted/30"><div className="text-2xl font-bold">{value ?? "—"}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}

function ItemCard({ item, onUpdate, onRegenerate, onPublishNow }: { item: Item; onUpdate:(id:string,p:Partial<Item>)=>void; onRegenerate:(id:string,instr:string)=>void; onPublishNow?:(item:Item)=>void; }) {
  const [editing, setEditing] = useState(false);
  const [regen, setRegen] = useState(false);
  const [instr, setInstr] = useState("");
  const [draft, setDraft] = useState(item);
  useEffect(()=>setDraft(item),[item]);

  return (
    <Card className={item.approval_status==="approved" ? "border-green-500/30" : item.approval_status==="rejected" ? "border-red-500/30 opacity-60" : ""}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">#{item.item_index}</Badge>
          <Badge>{item.platform}</Badge>
          <Badge variant="secondary">{item.content_type}</Badge>
          <Badge className={STATUS_BADGE[item.approval_status]||""}>{item.approval_status}</Badge>
          <span className="text-xs text-muted-foreground">{item.scheduled_date} · {item.day_name} · {item.scheduled_time}</span>
          <Badge variant="outline" className="mr-auto">{item.priority}</Badge>
        </div>
        <div className="text-sm font-semibold">{item.idea}</div>
        {!editing ? (
          <>
            {item.hook && <div className="text-sm italic">{item.hook}</div>}
            <div className="text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded">{item.draft_content}</div>
            {item.cta && <div className="text-sm"><strong>CTA:</strong> {item.cta}</div>}
            {item.hashtags && <div className="text-xs text-blue-600">{item.hashtags}</div>}
            {item.image_prompt && <div className="text-xs text-muted-foreground"><strong>Image prompt:</strong> {item.image_prompt}</div>}
            {item.video_prompt && <div className="text-xs text-muted-foreground"><strong>Video prompt:</strong> {item.video_prompt}</div>}
          </>
        ) : (
          <div className="space-y-2">
            <Input placeholder="فكرة" value={draft.idea||""} onChange={e=>setDraft({...draft,idea:e.target.value})}/>
            <Input placeholder="Hook" value={draft.hook||""} onChange={e=>setDraft({...draft,hook:e.target.value})}/>
            <Textarea rows={4} value={draft.draft_content||""} onChange={e=>setDraft({...draft,draft_content:e.target.value})}/>
            <Input placeholder="CTA" value={draft.cta||""} onChange={e=>setDraft({...draft,cta:e.target.value})}/>
            <Input placeholder="Hashtags" value={draft.hashtags||""} onChange={e=>setDraft({...draft,hashtags:e.target.value})}/>
            <Textarea rows={2} placeholder="Image prompt (EN)" value={draft.image_prompt||""} onChange={e=>setDraft({...draft,image_prompt:e.target.value})}/>
            <Textarea rows={2} placeholder="Video prompt (EN)" value={draft.video_prompt||""} onChange={e=>setDraft({...draft,video_prompt:e.target.value})}/>
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.content_type||"post"} onValueChange={v=>setDraft({...draft,content_type:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["post","reel","story","carousel","sales","offer","trust","educational","brand"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={draft.media_type||"image"} onValueChange={v=>setDraft({...draft,media_type:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["image","video","carousel","story","text"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="date" value={draft.scheduled_date||""} onChange={e=>setDraft({...draft,scheduled_date:e.target.value})}/>
              <Input type="time" value={draft.scheduled_time||""} onChange={e=>setDraft({...draft,scheduled_time:e.target.value})}/>
              <Select value={draft.platform} onValueChange={v=>setDraft({...draft,platform:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p=><SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea rows={2} placeholder="ملاحظات" value={draft.notes||""} onChange={e=>setDraft({...draft,notes:e.target.value})}/>
          </div>
        )}

        <MediaSlot item={item} onUpdate={onUpdate}/>

        <div className="flex flex-wrap gap-1 pt-1">
          {!editing ? (
            <>
              <Button size="sm" variant="outline" onClick={()=>onUpdate(item.id,{approval_status:"approved"})}><Check className="h-3 w-3 ml-1"/>اعتماد</Button>
              <Button size="sm" variant="outline" onClick={()=>onUpdate(item.id,{approval_status:"rejected"})}><X className="h-3 w-3 ml-1"/>رفض</Button>
              <Button size="sm" variant="ghost" onClick={()=>setEditing(true)}><Edit3 className="h-3 w-3 ml-1"/>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={()=>setRegen(true)}><RefreshCw className="h-3 w-3 ml-1"/>إعادة توليد</Button>
              {onPublishNow && (
                <Button size="sm" variant="default" onClick={()=>onPublishNow(item)} disabled={item.approval_status==="converted_to_post"}>
                  <Send className="h-3 w-3 ml-1"/>انشر/جدول
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="sm" onClick={()=>{onUpdate(item.id, draft); setEditing(false);}}>حفظ</Button>
              <Button size="sm" variant="ghost" onClick={()=>{setDraft(item); setEditing(false);}}>إلغاء</Button>
            </>
          )}
        </div>
        <Dialog open={regen} onOpenChange={setRegen}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إعادة توليد</DialogTitle></DialogHeader>
            <Textarea placeholder="تعليمات (مثلاً: اجعله أكثر إقناعاً، أضف عرض)" value={instr} onChange={e=>setInstr(e.target.value)}/>
            <DialogFooter>
              <Button onClick={()=>{onRegenerate(item.id, instr); setRegen(false); setInstr("");}}>توليد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

const IMAGE_TOOLS = [
  { name: "Nano Banana", url: "https://gemini.google.com/" },
  { name: "Midjourney", url: "https://www.midjourney.com/imagine" },
  { name: "DALL·E", url: "https://chatgpt.com/?model=gpt-4o" },
  { name: "Ideogram", url: "https://ideogram.ai/t/explore" },
  { name: "Leonardo", url: "https://app.leonardo.ai/" },
];
const VIDEO_TOOLS = [
  { name: "Sora", url: "https://sora.com/" },
  { name: "Veo", url: "https://labs.google/fx/tools/video-fx" },
  { name: "Runway", url: "https://app.runwayml.com/" },
  { name: "Pika", url: "https://pika.art/" },
  { name: "Kling", url: "https://klingai.com/" },
];

function MediaSlot({ item, onUpdate }: { item: Item; onUpdate:(id:string,p:Partial<Item>)=>void }) {
  const [uploading, setUploading] = useState(false);
  const media: any[] = Array.isArray(item.uploaded_media) ? item.uploaded_media : [];
  const isVideo = item.media_type === "video" || item.media_type === "reel" || item.needs_video;
  const tools = isVideo ? VIDEO_TOOLS : IMAGE_TOOLS;
  const prompt = isVideo ? item.video_prompt : item.image_prompt;

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("سجل دخول");
      const { data: row } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key","imgbb").maybeSingle();
      const apiKey = (row?.value as any)?.api_key;
      const newItems: any[] = [];
      for (const f of Array.from(files)) {
        const isVid = f.type.startsWith("video");
        if (isVid || !apiKey) {
          // Store as data URL for videos or when no imgbb; recommended: user hosts videos separately
          const b64 = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.onerror=rej; r.readAsDataURL(f); });
          newItems.push({ type: isVid?"video":"image", name: f.name, size: f.size, dataUrl: b64.slice(0, 200000) ? undefined : b64, uploaded_at: new Date().toISOString() });
          if (isVid) toast.warning(`الفيديو ${f.name} كبير — ارفعه لاستضافة خارجية والصق الرابط في الملاحظات`);
        } else {
          const b64 = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const s=String(r.result); res(s.split(",")[1]||s); }; r.onerror=rej; r.readAsDataURL(f); });
          const { data, error } = await supabase.functions.invoke("imgbb-upload", { body: { image: b64, apiKey } });
          if (error || !data?.url) throw new Error(data?.error || "فشل رفع");
          newItems.push({ type:"image", name:f.name, url: data.url, thumb: data.thumb || data.url, uploaded_at: new Date().toISOString() });
        }
      }
      const merged = [...media, ...newItems];
      await onUpdate(item.id, { uploaded_media: merged, asset_status: merged.length ? "ready" : "pending" } as any);
      toast.success(`تم رفع ${newItems.length}`);
    } catch (e:any) { toast.error(e.message); } finally { setUploading(false); }
  }

  function removeMedia(idx: number) {
    const next = media.filter((_,i)=>i!==idx);
    onUpdate(item.id, { uploaded_media: next, asset_status: next.length ? "ready" : "pending" } as any);
  }

  function openTool(url: string, toolName: string) {
    if (prompt) {
      navigator.clipboard.writeText(prompt).then(()=>toast.success(`تم نسخ البرومبت — يفتح ${toolName}`));
    }
    window.open(url, "_blank");
    onUpdate(item.id, { external_tool_used: toolName } as any);
  }

  return (
    <div className="border-t pt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={media.length ? "default" : "outline"}>
          {isVideo ? <Video className="h-3 w-3 ml-1"/> : <ImageIcon className="h-3 w-3 ml-1"/>}
          {media.length ? `${media.length} ملف مرفوع` : "لا يوجد ملف"}
        </Badge>
        <Badge variant="outline">الأصل: {item.asset_status || "pending"}</Badge>
        {item.external_tool_used && <Badge variant="secondary">أداة: {item.external_tool_used}</Badge>}
        {item.product_or_service && <Badge variant="outline">🛒 {item.product_or_service}</Badge>}
      </div>

      {Array.isArray(item.reference_media) && item.reference_media.length > 0 && (
        <div className="border rounded p-2 bg-muted/20 space-y-1">
          <div className="text-xs font-semibold flex items-center gap-1"><ImageIcon className="h-3 w-3"/>صور مرجعية من المنتج — نزّلها واستخدمها في أدوات {isVideo ? "الفيديو" : "الصور"}:</div>
          <div className="grid grid-cols-4 gap-2">
            {item.reference_media.map((rm: any, i: number) => (
              <div key={i} className="relative border rounded overflow-hidden group">
                <img src={rm.url} alt={rm.name || "reference"} className="w-full aspect-square object-cover"/>
                <a
                  href={rm.url}
                  download={`ref-${item.item_index}-${i + 1}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-[10px] opacity-0 group-hover:opacity-100"
                  title="تحميل الصورة"
                >
                  <Download className="h-3 w-3 ml-1"/>تحميل
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {prompt && (
        <div className="text-xs bg-muted/30 p-2 rounded">
          <div className="flex items-center justify-between">
            <strong>برومبت التوليد ({isVideo?"فيديو":"صورة"}):</strong>
            <Button size="sm" variant="ghost" onClick={()=>{navigator.clipboard.writeText(prompt); toast.success("تم النسخ");}}>نسخ</Button>
          </div>
          <div className="mt-1 whitespace-pre-wrap">{prompt}</div>
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        <label className="cursor-pointer">
          <input type="file" multiple accept={isVideo?"video/*,image/*":"image/*"} className="hidden" onChange={e=>handleUpload(e.target.files)}/>
          <span className="inline-flex items-center gap-1 border rounded px-2 py-1 text-xs hover:bg-muted">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Upload className="h-3 w-3"/>} رفع ملف
          </span>
        </label>
        {tools.map(t => (
          <Button key={t.name} size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>openTool(t.url, t.name)} title={`افتح ${t.name} مع نسخ البرومبت`}>
            <ExternalLink className="h-3 w-3 ml-1"/>{t.name}
          </Button>
        ))}
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative border rounded overflow-hidden group">
              {m.type === "video" ? (
                <div className="aspect-square bg-muted flex items-center justify-center text-xs p-1 text-center">
                  <Video className="h-6 w-6 opacity-50"/>
                  <span className="truncate">{m.name}</span>
                </div>
              ) : (
                <img src={m.thumb || m.url || m.dataUrl} alt={m.name} className="w-full aspect-square object-cover"/>
              )}
              <button onClick={()=>removeMedia(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 opacity-0 group-hover:opacity-100 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function CalendarView({ items }: { items: Item[] }) {
  const byDate = useMemo(() => {
    const m: Record<string, Item[]> = {};
    items.forEach(i => { const k = i.scheduled_date || "—"; (m[k] ||= []).push(i); });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b));
  }, [items]);
  return (
    <Card>
      <CardHeader><CardTitle>التقويم</CardTitle></CardHeader>
      <CardContent>
        {!byDate.length ? <p className="text-muted-foreground text-sm">لا توجد عناصر.</p> : (
          <div className="space-y-3">
            {byDate.map(([date, list]) => (
              <div key={date} className="border rounded p-2">
                <div className="font-semibold mb-1 text-sm">{date} <span className="text-xs text-muted-foreground">({list[0]?.day_name})</span></div>
                <div className="grid md:grid-cols-2 gap-2">
                  {list.map(i => (
                    <div key={i.id} className="bg-muted/40 p-2 rounded text-xs">
                      <div className="flex gap-1 items-center"><Badge variant="outline" className="text-[10px]">{i.scheduled_time}</Badge><Badge className="text-[10px]">{i.platform}</Badge><Badge variant="secondary" className="text-[10px]">{i.content_type}</Badge></div>
                      <div className="mt-1 line-clamp-2">{i.idea}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
