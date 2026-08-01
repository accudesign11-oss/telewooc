import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Brain, Copy, Download, ExternalLink, Loader2, Send, Target, Upload } from "lucide-react";

const TOOL_LINKS = [
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Google Flow", url: "https://labs.google/fx/tools/video-fx" },
  { name: "Sora", url: "https://sora.com/" },
  { name: "Runway", url: "https://app.runwayml.com/" },
];

type Props = {
  currentPlan: any | null;
  onPlanReady: (plan: any) => void;
};

export function AdsStrategyTab({ currentPlan, onPlanReady }: Props) {
  const [step, setStep] = useState(1);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState(currentPlan?.website_url || "");
  const [businessDescription, setBusinessDescription] = useState(currentPlan?.business_description || "");
  const [useWoo, setUseWoo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [strategy, setStrategy] = useState<any>(currentPlan?.ads_strategy || currentPlan?.strategy || null);
  const [uploads, setUploads] = useState<Record<number, any[]>>({});

  useEffect(() => {
    setWebsiteUrl(currentPlan?.website_url || websiteUrl);
    setBusinessDescription(currentPlan?.business_description || businessDescription);
    setStrategy(currentPlan?.ads_strategy && Object.keys(currentPlan.ads_strategy).length ? currentPlan.ads_strategy : currentPlan?.strategy || strategy);
  }, [currentPlan?.id]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("social_platform_connections").select("id,platform,account_name,page_name,status").eq("user_id", user.id).in("platform", ["facebook_page", "instagram"]).order("updated_at", { ascending: false });
      setConnections(data || []);
      setSelectedConnections((data || []).filter((c: any) => c.status === "connected").map((c: any) => c.id));
    });
  }, []);

  const creatives = useMemo(() => Array.isArray(strategy?.creatives) ? strategy.creatives : [], [strategy]);

  const toggleConnection = (id: string) => setSelectedConnections((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);

  async function runAnalysis() {
    setLoading(true);
    setProgress(12);
    try {
      const timer = window.setInterval(() => setProgress((p) => Math.min(p + 11, 86)), 900);
      const { data, error } = await supabase.functions.invoke("ads-strategy-brain", {
        body: {
          plan_id: currentPlan?.id,
          name: currentPlan?.name || "استراتيجية إعلانات ممولة",
          business_description: businessDescription,
          website_url: websiteUrl,
          sources: { connection_ids: selectedConnections, website_url: websiteUrl, use_woocommerce: useWoo, business_description: businessDescription },
        },
      });
      window.clearInterval(timer);
      setProgress(100);
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل التحليل");
      setStrategy(data.strategy);
      const { data: plan } = await supabase.from("content_brain_plans").select("*").eq("id", data.plan_id).single();
      if (plan) onPlanReady(plan);
      setStep(3);
      toast.success("تم بناء استراتيجية الإعلانات الممولة");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  function updateCreative(index: number, patch: any) {
    const next = { ...(strategy || {}) };
    next.creatives = [...creatives];
    next.creatives[index] = { ...next.creatives[index], ...patch };
    setStrategy(next);
  }

  async function saveEdits() {
    if (!currentPlan?.id || !strategy) return toast.error("لا توجد استراتيجية محفوظة");
    const { error } = await supabase.from("content_brain_plans").update({ ads_strategy: strategy, strategy }).eq("id", currentPlan.id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ التعديلات");
  }

  async function uploadCreativeFile(index: number, files: FileList | null) {
    if (!files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("سجل دخول أولاً");
    const added: any[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/ads-${Date.now()}-${index}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
      if (error) return toast.error(error.message);
      added.push({ type: file.type.startsWith("video") ? "video" : "image", bucket: "social-media", path, name: file.name, size: file.size });
    }
    setUploads((u) => ({ ...u, [index]: [...(u[index] || []), ...added] }));
    toast.success(`تم رفع ${added.length} ملف`);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(strategy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "telewoo-ads-strategy.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendToPublishing() {
    if (!strategy || !creatives.length) return toast.error("لا توجد Creatives");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("سجل دخول أولاً");
    let created = 0;
    for (let i = 0; i < creatives.length; i++) {
      const c = creatives[i];
      const schedule = strategy.schedule?.[i] || {};
      const d = new Date();
      d.setDate(d.getDate() + i);
      const [h, m] = String(schedule.time || "20:00").split(":");
      d.setHours(Number(h) || 20, Number(m) || 0, 0, 0);
      const platform = schedule.platform === "facebook" ? "facebook_page" : (schedule.platform || "facebook_page");
      const content = [c.hook, c.primary_text, c.headline, c.cta].filter(Boolean).join("\n\n");
      const media = uploads[i] || [];
      const { data: post, error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        title: c.headline || c.hook || "إعلان ممول",
        source_type: "ads_strategy",
        source_post_id: currentPlan?.id || null,
        source_payload: { creative: c, schedule },
        generated_content: { default: content, text: content, [platform]: content, media_prompt_en: c.media_prompt_en, media_prompt_ar: c.media_prompt_ar },
        media,
        selected_platforms: [platform],
        status: "scheduled",
        approval_status: "approved",
        scheduled_at: d.toISOString(),
      }).select().single();
      if (!error && post) {
        await supabase.from("social_schedules").upsert({ post_id: post.id, user_id: user.id, publish_at: d.toISOString(), schedule_type: "once", recurrence_type: "none", timezone: "Africa/Cairo", status: "active" }, { onConflict: "post_id" });
        created++;
      }
    }
    toast.success(`تم إرسال ${created} إعلان إلى النشر والجدولة`);
  }

  function copyPrompt(text: string) {
    navigator.clipboard.writeText(text || "").then(() => toast.success("تم النسخ"));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />استراتيجية إعلانات ممولة</CardTitle>
          <CardDescription>تقرأ الصفحات المربوطة والموقع وبيانات المتجر، ثم تجهز Funnel وAudiences وCreatives بدون توليد وسائط داخلياً.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => <Badge key={n} variant={step === n ? "default" : "outline"}>{n === 1 ? "المصادر" : n === 2 ? "التحليل" : "النتيجة"}</Badge>)}
          </div>
          {loading && <Progress value={progress} />}
          {step <= 2 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Website URL</Label><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" /></div>
                <div className="flex items-end"><label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer"><Checkbox checked={useWoo} onCheckedChange={(v) => setUseWoo(!!v)} /><span className="text-sm">قراءة WooCommerce المرتبط</span></label></div>
              </div>
              <div><Label>وصف النشاط/البراند</Label><Textarea rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} /></div>
              <div>
                <Label className="mb-2 block">صفحات Facebook/Instagram المربوطة</Label>
                <div className="grid md:grid-cols-2 gap-2">
                  {connections.map((c) => (
                    <label key={c.id} className="flex items-center justify-between gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
                      <span className="text-sm"><Checkbox checked={selectedConnections.includes(c.id)} onCheckedChange={() => toggleConnection(c.id)} className="ml-2" />{c.platform} · {c.account_name || c.page_name}</span>
                      <Badge variant={c.status === "connected" ? "default" : "destructive"}>{c.status}</Badge>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={runAnalysis} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Brain className="h-4 w-4 ml-1" />}تشغيل تحليل الإعلانات الممولة</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {strategy && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveEdits} variant="outline">حفظ التعديلات</Button>
            <Button onClick={sendToPublishing}><Send className="h-4 w-4 ml-1" />إرسال إلى النشر والجدولة</Button>
            <Button onClick={exportJson} variant="outline"><Download className="h-4 w-4 ml-1" />JSON</Button>
            <Button onClick={() => window.print()} variant="outline"><Download className="h-4 w-4 ml-1" />PDF</Button>
          </div>

          {/* Market Analysis & KPIs */}
          <section className="grid lg:grid-cols-2 gap-3">
            {strategy.market_analysis && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />تحليل السوق والطلب</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">الطلب: {strategy.market_analysis.demand || "متوسط"}</Badge>
                    <Badge variant="outline">المنافسة: {strategy.market_analysis.competition || "متوسطة"}</Badge>
                    <Badge variant="default">التوجه: {strategy.market_analysis.trend || "مستقر"}</Badge>
                  </div>
                  {strategy.market_analysis.notes && <p className="text-muted-foreground mt-2">{strategy.market_analysis.notes}</p>}
                </CardContent>
              </Card>
            )}

            {strategy.kpis && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />مؤشرات الأداء المتوقعة (KPIs)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-sm">
                  <div className="border rounded p-2 bg-muted/30"><div className="text-xs text-muted-foreground">ROAS المستهدف</div><div className="font-bold text-base text-primary">{strategy.kpis.roas_target || "—"}</div></div>
                  <div className="border rounded p-2 bg-muted/30"><div className="text-xs text-muted-foreground">CPA المستهدف</div><div className="font-bold text-base">{strategy.kpis.cpa_target || "—"}</div></div>
                  <div className="border rounded p-2 bg-muted/30"><div className="text-xs text-muted-foreground">CTR المتوقع</div><div className="font-bold text-base">{strategy.kpis.ctr || "—"}</div></div>
                  <div className="border rounded p-2 bg-muted/30"><div className="text-xs text-muted-foreground">CPC المتوقع</div><div className="font-bold text-base">{strategy.kpis.cpc || "—"}</div></div>
                  <div className="border rounded p-2 bg-muted/30"><div className="text-xs text-muted-foreground">CPM المتوقع</div><div className="font-bold text-base">{strategy.kpis.cpm || "—"}</div></div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Recommended Products & Alternative Products */}
          <section className="grid lg:grid-cols-2 gap-3">
            <Card><CardHeader><CardTitle className="text-base">المنتجات المرشحة للحملة</CardTitle></CardHeader><CardContent className="space-y-2">{(strategy.recommended_products || []).map((p: any, i: number) => <div key={i} className="border rounded p-3 space-y-1"><div className="font-semibold text-primary">{p.name}</div><div className="text-sm text-muted-foreground">{p.why}</div><div className="flex items-center gap-2"><Badge variant="outline">CTR متوقع: {p.expected_ctr_band}</Badge></div><p className="text-sm font-medium mt-1">زاوية الإعلان: {p.hero_angle}</p></div>)}</CardContent></Card>
            {!!strategy.alternative_products?.length && (
              <Card><CardHeader><CardTitle className="text-base">المنتجات البديلة وفرص السوق</CardTitle></CardHeader><CardContent className="space-y-2">{strategy.alternative_products.map((p: any, i: number) => <div key={i} className="border rounded p-3 space-y-1"><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">لماذا هو أفضل: {p.why_better}</div>{p.evidence && <div className="text-xs text-emerald-600 dark:text-emerald-400">الدليل: {p.evidence}</div>}<Badge variant="secondary">الطلب: {p.market_demand || "عالي"}</Badge></div>)}</CardContent></Card>
            )}
          </section>

          {/* Audiences */}
          <Card><CardHeader><CardTitle className="text-base">الجماهير المستهدفة (Target Audiences)</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">{(strategy.audiences || []).map((a: any, i: number) => <div key={i} className="border rounded p-3 space-y-2"><div className="font-semibold text-primary">{a.name}</div><div className="text-xs text-muted-foreground">الأعمار: {a.age_min || a.age || 18} - {a.age_max || 65} سنة · الجنس: {a.gender || "الكل"} · المناطق: {(a.locations || [a.geo]).filter(Boolean).join("، ")}</div>{!!a.interests?.length && <p className="text-xs"><strong>الاهتمامات:</strong> {a.interests.join("، ")}</p>}{!!a.behaviors?.length && <p className="text-xs"><strong>السلوكيات:</strong> {a.behaviors.join("، ")}</p>}{a.detailed_targeting_hint && <p className="text-xs text-muted-foreground italic">توجيه Ads Manager: {a.detailed_targeting_hint}</p>}<Button size="sm" variant="outline" className="w-full text-xs" onClick={() => copyPrompt(JSON.stringify(a, null, 2))}>نسخ إعدادات الجمهور</Button></div>)}</CardContent></Card>

          {/* Budget & Funnel */}
          <section className="grid lg:grid-cols-3 gap-3">
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />توزيع الميزانية</CardTitle></CardHeader><CardContent className="space-y-3"><div className="text-2xl font-bold text-primary">{strategy.budget?.daily_recommended ? `${strategy.budget.daily_recommended} ${strategy.budget.currency || "USD"} / يوم` : "—"}</div><div className="text-xs text-muted-foreground">حد أدنى يومي: {strategy.budget?.daily_min || "—"} | إجمالي: {strategy.budget?.total_recommended || "—"} ({strategy.budget?.duration_days || 14} يوم)</div>{Object.entries(strategy.budget?.split_by_stage || {}).map(([k, v]) => <div key={k} className="mt-2"><div className="flex justify-between text-xs font-medium"><span>مرحلة {k}</span><span>{String(v)}%</span></div><Progress value={Number(v) || 0} className="h-2 mt-1" /></div>)}{strategy.budget?.notes && <p className="text-xs text-muted-foreground mt-2">{strategy.budget.notes}</p>}</CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">مسار القمع الإعلاني (Funnel Pipeline)</CardTitle></CardHeader><CardContent className="grid md:grid-cols-3 gap-2">{(strategy.funnel || []).map((f: any, i: number) => <div key={i} className="border rounded p-2 space-y-1"><Badge>{f.stage}</Badge><div className="font-semibold text-sm mt-1">{f.objective}</div><p className="text-xs text-muted-foreground">أماكن الظهور: {(f.placements || []).join("، ")}</p><p className="text-xs font-medium">نوع المحتوى: {f.creative_type}</p>{!!f.kpis?.length && <p className="text-xs text-emerald-600 dark:text-emerald-400">KPIs: {f.kpis.join("، ")}</p>}</div>)}</CardContent></Card>
          </section>

          {/* Facebook Setup Guide & Warm Up */}
          <section className="grid lg:grid-cols-2 gap-3">
            {strategy.facebook_setup_guide && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />دليل إعداد Meta Ads Manager</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between border-b py-1"><span>هدف الحملة (Campaign Objective):</span><strong className="text-primary">{strategy.facebook_setup_guide.campaign_objective}</strong></div>
                  <div className="flex justify-between border-b py-1"><span>نوع الشراء (Buying Type):</span><strong>{strategy.facebook_setup_guide.buying_type || "AUCTION"}</strong></div>
                  <div className="flex justify-between border-b py-1"><span>حدث التحويل (Optimization Event):</span><strong>{strategy.facebook_setup_guide.optimization_event}</strong></div>
                  <div className="flex justify-between border-b py-1"><span>موقع التحويل (Conversion Location):</span><strong>{strategy.facebook_setup_guide.conversion_location}</strong></div>
                  <div className="flex justify-between border-b py-1"><span>استراتيجية العرض (Bid Strategy):</span><strong>{strategy.facebook_setup_guide.bid_strategy}</strong></div>
                  <div className="flex justify-between py-1"><span>أماكن الظهور (Placements):</span><strong>{(strategy.facebook_setup_guide.placements || []).join("، ")}</strong></div>
                </CardContent>
              </Card>
            )}

            {strategy.warm_up_strategy && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-amber-500" />استراتيجية التهيئة والتسخين (Warm-up)</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={strategy.warm_up_strategy.needed ? "default" : "secondary"}>
                      {strategy.warm_up_strategy.needed ? "مطلوبة قبل الإطلاق" : "غير مطلوبة حالياً"}
                    </Badge>
                    {strategy.warm_up_strategy.duration_days && <span className="text-xs text-muted-foreground">المدة: {strategy.warm_up_strategy.duration_days} أيام</span>}
                  </div>
                  {strategy.warm_up_strategy.why && <p className="text-xs text-muted-foreground">{strategy.warm_up_strategy.why}</p>}
                  {!!strategy.warm_up_strategy.actions?.length && (
                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                      {strategy.warm_up_strategy.actions.map((act: string, idx: number) => <li key={idx}>{act}</li>)}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Step-by-Step Execution Plan */}
          {!!strategy.step_by_step_plan?.length && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />خطة التنفيذ التفصيلية خطوة بخطوة</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {strategy.step_by_step_plan.map((st: any, idx: number) => (
                  <div key={idx} className="border rounded p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0">{st.step || idx + 1}</Badge>
                      <span className="font-semibold text-sm">{st.title}</span>
                    </div>
                    {st.why && <p className="text-xs text-muted-foreground">{st.why}</p>}
                    {!!st.actions?.length && (
                      <div className="text-xs space-y-1 mt-1">
                        <strong>الإجراءات:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                          {st.actions.map((act: string, aIdx: number) => <li key={aIdx}>{act}</li>)}
                        </ul>
                      </div>
                    )}
                    {st.expected_outcome && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">النتيجة المتوقعة: {st.expected_outcome}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Creatives */}
          <Card>
            <CardHeader><CardTitle className="text-base">الإبداعات والنصوص الإعلانية (Creatives & Copy)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {creatives.map((c: any, i: number) => (
                <div key={i} className="border rounded p-3 space-y-2">
                  <div className="flex flex-wrap gap-2"><Badge>#{i + 1}</Badge><Badge variant="secondary">{c.format}</Badge><Badge variant="outline">{c.product_id}</Badge></div>
                  <div><Label className="text-xs">العنوان الرئيسي (Headline)</Label><Input value={c.headline || ""} onChange={(e) => updateCreative(i, { headline: e.target.value })} placeholder="Headline" /></div>
                  <div><Label className="text-xs">النص الإعلاني (Primary Text)</Label><Textarea rows={3} value={c.primary_text || ""} onChange={(e) => updateCreative(i, { primary_text: e.target.value })} placeholder="Primary text" /></div>
                  <div><Label className="text-xs">زر الإجراء (CTA)</Label><Input value={c.cta || ""} onChange={(e) => updateCreative(i, { cta: e.target.value })} placeholder="CTA" /></div>
                  <div><Label className="text-xs">برومبت تصميم الوسائط (Media Prompt EN)</Label><Textarea rows={3} value={c.media_prompt_en || ""} onChange={(e) => updateCreative(i, { media_prompt_en: e.target.value })} placeholder="Media prompt EN" /></div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => copyPrompt(c.media_prompt_en)}><Copy className="h-3 w-3 ml-1" />نسخ البرومبت</Button>
                    {TOOL_LINKS.map((t) => <Button key={t.name} size="sm" variant="ghost" onClick={() => { copyPrompt(c.media_prompt_en); window.open(t.url, "_blank", "noopener,noreferrer"); }}><ExternalLink className="h-3 w-3 ml-1" />{t.name}</Button>)}
                    <label className="inline-flex items-center gap-1 border rounded px-2 py-1 text-xs cursor-pointer hover:bg-muted"><input type="file" multiple className="hidden" accept="image/*,video/*" onChange={(e) => uploadCreativeFile(i, e.target.files)} /><Upload className="h-3 w-3" />رفع الملف</label>
                  </div>
                  {!!uploads[i]?.length && <div className="flex flex-wrap gap-1">{uploads[i].map((u, n) => <Badge key={n} variant="outline">{u.name}</Badge>)}</div>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Retargeting & Schedule */}
          <section className="grid lg:grid-cols-2 gap-3">
            <Card><CardHeader><CardTitle className="text-base">إعادة الاستهداف (Retargeting)</CardTitle></CardHeader><CardContent className="space-y-2">{(strategy.retargeting || []).map((r: any, i: number) => <div key={i} className="border rounded p-2"><Badge variant="outline">{r.window_days} يوم</Badge><div className="font-semibold mt-1 text-sm">{r.segment}</div><p className="text-xs text-muted-foreground">{r.message}</p></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">الجدول الزمني للحملة</CardTitle></CardHeader><CardContent className="space-y-2">{(strategy.schedule || []).map((s: any, i: number) => <div key={i} className="flex items-center justify-between border rounded p-2 text-sm"><span>{s.day} · {s.time}</span><span>{s.platform} · {s.creative_ref || s.product_id}</span></div>)}</CardContent></Card>
          </section>

          {/* Pros / Cons / Risks / Mitigations */}
          {(strategy.pros?.length || strategy.risks?.length) && (
            <Card>
              <CardHeader><CardTitle className="text-base">تقييم المخاطر والمميزات (SWOT & Risk Management)</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3 text-xs">
                {!!strategy.pros?.length && (
                  <div className="space-y-1">
                    <strong className="text-emerald-600 dark:text-emerald-400">نقاط القوة والمميزات:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {strategy.pros.map((p: string, idx: number) => <li key={idx}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {!!strategy.risks?.length && (
                  <div className="space-y-1">
                    <strong className="text-rose-500">المخاطر وطرق الوقاية:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {strategy.risks.map((r: string, idx: number) => <li key={idx}>{r} {strategy.mitigations?.[idx] ? `(الحل: ${strategy.mitigations[idx]})` : ""}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />
        </div>
      )}
    </div>
  );
}