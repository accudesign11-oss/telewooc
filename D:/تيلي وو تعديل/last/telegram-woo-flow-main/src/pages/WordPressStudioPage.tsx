import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Loader2, Save, Rocket, RefreshCw, Download, Plug, Eye,
  Copy, Code2, Lightbulb, ExternalLink, Trash2, CheckCircle2, Package, HelpCircle, ChevronDown, ChevronUp, Globe, MoreHorizontal, Sliders, ShieldCheck, Flame,
  Palette, Gauge, ShoppingCart, Target, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { PluginBuilderTab } from "@/components/wp-studio/PluginBuilderTab";
import { SiteLanguageManagerTab } from "@/components/wp-studio/SiteLanguageManagerTab";
import { FancyCSSStudioTab } from "@/components/wp-studio/FancyCSSStudioTab";
import { InjectionStepperGuide } from "@/components/wp-studio/InjectionStepperGuide";
import { InteractiveImagePromptAnalyzer } from "@/components/wp-studio/InteractiveImagePromptAnalyzer";
import { OtherToolsStudioTab } from "@/components/wp-studio/OtherToolsStudioTab";
import { LetsEncryptSSLStudioTab } from "@/components/wp-studio/LetsEncryptSSLStudioTab";
import { VisualUXStudioTab } from "@/components/wp-studio/VisualUXStudioTab";
import { SpeedPerformanceStudioTab } from "@/components/wp-studio/SpeedPerformanceStudioTab";
import { WooCommerceUltraTab } from "@/components/wp-studio/WooCommerceUltraTab";
import { MarketingPixelsTab } from "@/components/wp-studio/MarketingPixelsTab";
import { UltimateFeaturesTab } from "@/components/wp-studio/UltimateFeaturesTab";
import { SecurityHardeningTab } from "@/components/wp-studio/SecurityHardeningTab";
import { WpResetAndUploaderTools } from "@/components/wp-studio/WpResetAndUploaderTools";
import { RotateCcw } from "lucide-react";

const ALL_SUGGESTIONS = [
  "اجعل الهيدر ستيكي مع خلفية شفافة عند التمرير",
  "أضف أيقونة سلة عائمة في أسفل يمين الشاشة تظهر عدد العناصر",
  "أنيميشن ظهور تدريجي للوصف عند التمرير للأسفل",
  "أزرار متدرجة الألوان مع تأثير Hover ناعم",
  "عداد عرض محدود (Countdown) في صفحة المنتج",
  "شارة \"جديد\" على المنتجات المضافة حديثًا",
  "ظل ناعم وتقريب حواف كروت المنتجات",
  "زر واتساب عائم للتواصل السريع",
  "شريط علوي بإعلان مجاني الشحن قابل للإغلاق",
  "معرض صور المنتج بتأثير Zoom عند تمرير الماوس",
  "تلوين زر الشراء بلون أحمر واضح",
  "إخفاء شريط ووردبريس العلوي في الواجهة",
  "توسيط عنوان الموقع في الهيدر",
  "خط عربي أنيق (Cairo) لجميع النصوص",
  "شبكة منتجات 3 أعمدة على الجوال",
  "تظليل حواف الصور بلون العلامة التجارية",
  "إشعار توست عند إضافة منتج للسلة",
  "خلفية متحركة خفيفة في صفحة الرئيسية",
  "زر \"العودة للأعلى\" ناعم يظهر بعد التمرير",
  "أسعار المنتجات بحجم أكبر ولون مميز",
];

function pickSuggestions(n = 3) {
  const pool = [...ALL_SUGGESTIONS];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

async function invokeFn<T = any>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      try { detail = await error.context.text(); } catch (_) {}
    }
    throw new Error(detail || "فشل الاستدعاء");
  }
  if (data && data.ok === false) throw new Error(data.error || "خطأ غير معروف");
  return data as T;
}

export default function WordPressStudioPage() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>(pickSuggestions());
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pinging, setPinging] = useState(false);

  const [currentCss, setCurrentCss] = useState("");
  const [currentJs, setCurrentJs] = useState("");
  const [explanation, setExplanation] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [customizationId, setCustomizationId] = useState<string | null>(null);

  // Settings
  const [siteUrl, setSiteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [pingStatus, setPingStatus] = useState<null | "ok" | "fail">(null);
  const [showKeyGuide, setShowKeyGuide] = useState(false);
  const [useProxyPreview, setUseProxyPreview] = useState(true);

  const cleanSiteUrl = useMemo(() => {
    if (!siteUrl) return "";
    let u = siteUrl.trim().replace(/\/+$/, "");
    if (!u.startsWith("http://") && !u.startsWith("https://")) {
      u = `https://${u}`;
    }
    return u;
  }, [siteUrl]);

  const previewUrl = useMemo(
    () => (cleanSiteUrl ? `${cleanSiteUrl}/?telewoo=preview&t=${Date.now()}` : ""),
    [cleanSiteUrl]
  );

  // Load user's saved settings for the active profile
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: rows } = await supabase
        .from("settings")
        .select("key,value")
        .eq("user_id", uid)
        .in("key", ["wp_studio", "woocommerce", "store_profiles"]);

      const profilesRow = (rows || []).find((r) => r.key === "store_profiles")?.value as any;
      const activeId = profilesRow?.active_id || localStorage.getItem("telewoo_active_profile_id");
      const activeProfile = Array.isArray(profilesRow?.list)
        ? profilesRow.list.find((p: any) => p.id === activeId || p.is_active)
        : null;

      const ws = activeProfile?.wp_studio || (rows || []).find((r) => r.key === "wp_studio")?.value as any;
      const wc = activeProfile?.woocommerce || (rows || []).find((r) => r.key === "woocommerce")?.value as any;

      setSiteUrl(ws?.site_url || wc?.store_url || "");
      setApiKey(ws?.api_key || "");
    })();
  }, []);

  const rotateSuggestions = () => setSuggestions(pickSuggestions());

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "اكتب طلبك أولاً", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const r: any = await invokeFn("wp-studio-generate", {
        prompt,
        current_css: currentCss,
        current_js: currentJs,
      });
      setCurrentCss(r.css || "");
      setCurrentJs(r.js || "");
      setExplanation(r.explanation || "");
      setProvider(r.provider || null);
      setCustomizationId(r.id || null);
      rotateSuggestions();
      toast({ title: "تم توليد الكود", description: r.explanation?.slice(0, 80) });
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async (mode: "replace" | "append" = "append") => {
    if (!currentCss && !currentJs) {
      toast({ title: "لا يوجد كود لحقنه", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      await invokeFn("wp-studio-inject", {
        action: "apply",
        css: currentCss,
        js: currentJs,
        mode,
        customization_id: customizationId,
      });
      toast({ title: "تم الحقن في ووردبريس", description: mode === "append" ? "أُضيف للكود الحالي" : "استبدل الكود السابق" });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      const r: any = await invokeFn("wp-studio-inject", { action: "snapshot" });
      setCurrentCss(r.result?.css || "");
      setCurrentJs(r.result?.js || "");
      toast({ title: "تم جلب الكود الحالي من ووردبريس" });
    } catch (e: any) {
      toast({ title: "فشل الجلب", description: e.message, variant: "destructive" });
    } finally {
      setSnapshotting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("سيتم مسح كل CSS/JS المحقون في ووردبريس. متأكد؟")) return;
    setResetting(true);
    try {
      await invokeFn("wp-studio-inject", { action: "reset" });
      setCurrentCss("");
      setCurrentJs("");
      toast({ title: "تم المسح" });
    } catch (e: any) {
      toast({ title: "فشل المسح", description: e.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handlePing = async () => {
    setPinging(true); setPingStatus(null);
    try {
      await invokeFn("wp-studio-inject", { action: "ping" });
      setPingStatus("ok");
      toast({ title: "الاتصال ناجح" });
    } catch (e: any) {
      setPingStatus("fail");
      toast({ title: "فشل الاتصال", description: e.message, variant: "destructive" });
    } finally {
      setPinging(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("غير مسجل الدخول");
      const cleanUrl = siteUrl.trim().replace(/\/+$/, "");
      const { error } = await supabase
        .from("settings")
        .upsert(
          { user_id: uid, key: "wp_studio", value: { site_url: cleanUrl, api_key: apiKey.trim() } as any },
          { onConflict: "user_id,key" }
        );
      if (error) throw error;
      setSiteUrl(cleanUrl);
      toast({ title: "تم حفظ الإعدادات" });
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `تم نسخ ${label}` });
    } catch (_) {}
  };

  const download = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AppLayout title="WordPress Studio">
      <div className="p-2 sm:p-4 max-w-6xl mx-auto space-y-4 overflow-x-hidden text-right" dir="rtl">
        <Tabs defaultValue="studio" className="w-full">
          {/* Scrollable Responsive Main Tabs List */}
          <div className="w-full overflow-x-auto no-scrollbar pb-2 pt-1 -mx-2 px-2">
            <TabsList className="inline-flex w-max min-w-full h-auto p-1.5 gap-1.5 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm">
              <TabsTrigger value="studio" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Sparkles className="h-4 w-4 ml-1.5" />
                الأستوديو
              </TabsTrigger>
              <TabsTrigger value="ultimate" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-amber-500 dark:text-amber-400 data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
                <Flame className="h-4 w-4 ml-1.5" />
                ميزات استثنائية 🔥
              </TabsTrigger>
              <TabsTrigger value="fancy-css" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-amber-600 dark:text-amber-400 data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
                <Sparkles className="h-4 w-4 ml-1.5" />
                وصف مبهرج & CSS
              </TabsTrigger>
              <TabsTrigger value="visual-ux" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-purple-600 dark:text-purple-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">
                <Palette className="h-4 w-4 ml-1.5" />
                مظهر وجماليات
              </TabsTrigger>
              <TabsTrigger value="speed" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-blue-600 dark:text-blue-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <Gauge className="h-4 w-4 ml-1.5" />
                السرعة والأداء
              </TabsTrigger>
              <TabsTrigger value="woo-ultra" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-emerald-600 dark:text-emerald-400 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                <ShoppingCart className="h-4 w-4 ml-1.5" />
                تحكم WooCommerce الشامل
              </TabsTrigger>
              <TabsTrigger value="security" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-rose-600 dark:text-rose-400 data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">
                <Lock className="h-4 w-4 ml-1.5" />
                درع الحماية والأمان
              </TabsTrigger>
              <TabsTrigger value="pixels" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-amber-600 dark:text-amber-400 data-[state=active]:bg-amber-600 data-[state=active]:text-white transition-all">
                <Target className="h-4 w-4 ml-1.5" />
                بيكسل وتتبع التسويق
              </TabsTrigger>
              <TabsTrigger value="ssl" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-teal-600 dark:text-teal-400 data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all">
                <ShieldCheck className="h-4 w-4 ml-1.5" />
                شهادة SSL (Let's Encrypt)
              </TabsTrigger>
              <TabsTrigger value="wp-reset" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-rose-600 dark:text-rose-400 data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">
                <RotateCcw className="h-4 w-4 ml-1.5" />
                إعادة الضبط والرفع (WP Reset & Installer)
              </TabsTrigger>
              <TabsTrigger value="other" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl text-indigo-600 dark:text-indigo-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">
                <Sliders className="h-4 w-4 ml-1.5" />
                أخرى (أدوات)
              </TabsTrigger>
              <TabsTrigger value="plugins" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Package className="h-4 w-4 ml-1.5" />
                Plugins
              </TabsTrigger>
              <TabsTrigger value="language" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Globe className="h-4 w-4 ml-1.5" />
                اللغات
              </TabsTrigger>
              <TabsTrigger value="preview" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Eye className="h-4 w-4 ml-1.5" />
                المعاينة
              </TabsTrigger>
              <TabsTrigger value="setup" className="px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Plug className="h-4 w-4 ml-1.5" />
                الإعدادات
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ultimate" className="mt-4">
            <UltimateFeaturesTab />
          </TabsContent>

          <TabsContent value="visual-ux" className="mt-4">
            <VisualUXStudioTab />
          </TabsContent>

          <TabsContent value="speed" className="mt-4">
            <SpeedPerformanceStudioTab />
          </TabsContent>

          <TabsContent value="woo-ultra" className="mt-4">
            <WooCommerceUltraTab />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <SecurityHardeningTab />
          </TabsContent>

          <TabsContent value="wp-reset" className="mt-4">
            <WpResetAndUploaderTools />
          </TabsContent>

          <TabsContent value="pixels" className="mt-4">
            <MarketingPixelsTab />
          </TabsContent>

          <TabsContent value="ssl" className="mt-4">
            <LetsEncryptSSLStudioTab />
          </TabsContent>

          <TabsContent value="other" className="mt-4">
            <OtherToolsStudioTab />
          </TabsContent>

          <TabsContent value="fancy-css" className="mt-4">
            <FancyCSSStudioTab />
          </TabsContent>

          <TabsContent value="plugins" className="mt-4">
            <PluginBuilderTab />
          </TabsContent>

          <TabsContent value="language" className="mt-4">
            <SiteLanguageManagerTab />
          </TabsContent>

          <TabsContent value="studio" className="mt-4 space-y-4 text-right" dir="rtl">
            {/* Prompt */}
            <Card className="border-primary/20 bg-primary/5" dir="rtl">
              <CardHeader className="pb-3 text-right">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground text-right">ماذا تريد أن تفعل في متجرك؟</h3>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  اكتب طلبك بلغتك (مثل: "خلي الهيدر ستيكي" أو "حط أيقونة سلة"). سيولّد الذكاء الاصطناعي CSS/JS ويطبقها فورًا.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-right">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثال: أضف أيقونة سلة عائمة في أسفل يمين الشاشة تعرض عدد المنتجات، مع أنيميشن نبضة عند إضافة منتج."
                  rows={4}
                  dir="rtl"
                  className="text-right"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                    {generating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Sparkles className="h-4 w-4 ml-2" />}
                    نفّذ بالذكاء الاصطناعي
                  </Button>
                  <Button variant="outline" onClick={rotateSuggestions}>
                    <RefreshCw className="h-4 w-4 ml-2" />
                    اقتراحات جديدة
                  </Button>
                  {provider && <Badge variant="secondary">النموذج: {provider}</Badge>}
                </div>

                {/* Suggestions */}
                <div className="grid gap-2 md:grid-cols-3 pt-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      className="text-right text-sm p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prebuilt Snippets Library */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">مكتبة التعديلات والأكواد الجاهزة (1-Click Ready Snippets)</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">جاهز للحقن المباشر</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  اضغط على أي تعديل جاهز لإدراجه فوراً في المحرر وحقنه في متجرك بضغطة زر.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      title: "💬 زر واتساب عائم للتواصل السريع",
                      desc: "أيقونة واتساب ثابتة بأسفل اليسار بلمعة أنيميشن خفيفة ورسالة مسبقة",
                      css: `#telewoo-wa-btn { position: fixed; bottom: 20px; left: 20px; z-index: 99999; background: #25D366; color: #fff; border-radius: 50px; padding: 10px 18px; font-family: sans-serif; font-weight: bold; font-size: 13px; text-decoration: none; box-shadow: 0 10px 25px rgba(37,211,102,0.3); display: flex; align-items: center; gap: 8px; transition: transform 0.2s ease; }
#telewoo-wa-btn:hover { transform: translateY(-3px) scale(1.03); }`,
                      js: `(function(){
  if (document.getElementById('telewoo-wa-btn')) return;
  var a = document.createElement('a');
  a.id = 'telewoo-wa-btn';
  a.href = 'https://wa.me/201000000000?text=' + encodeURIComponent('مرحباً، أود الاستفسار عن منتجات متجركم');
  a.target = '_blank';
  a.innerHTML = '<span>💬</span> تواصل عبر واتساب';
  document.body.appendChild(a);
})();`
                    },
                    {
                      title: "📌 هيدر زجاجي تثبيتي عند السكرول",
                      desc: "يجعل الهيدر العلوي تثبيتاً في الشاشة مع تأثير زجاجي شفاف فاخر",
                      css: `.site-header, header.entry-header, #masthead { position: sticky !important; top: 0 !important; z-index: 9999 !important; backdrop-filter: blur(12px) !important; background: rgba(255, 255, 255, 0.85) !important; transition: all 0.3s ease !important; box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important; }`,
                      js: `// Sticky Glass Header Active`
                    },
                    {
                      title: "🔥 تلوين وتكبير زر الشراء والطلب",
                      desc: "تلوين أزرار إضافة إلى السلة وتأكيد الطلب بتدرج نيون جذّاب وزيادة التحويلات",
                      css: `.single_add_to_cart_button, .button.alt, button[name="add-to-cart"], .checkout-button { background: linear-gradient(135deg, #10b981, #059669) !important; color: #ffffff !important; border-radius: 30px !important; padding: 14px 28px !important; font-size: 16px !important; font-weight: 800 !important; box-shadow: 0 8px 25px rgba(16,185,129,0.35) !important; border: none !important; transition: all 0.25s ease !important; }
.single_add_to_cart_button:hover, .button.alt:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 30px rgba(16,185,129,0.5) !important; }`,
                      js: `// Enhanced High-Converting Buy Button`
                    },
                    {
                      title: "🔝 زر العودة للأعلى الذكي",
                      desc: "زر عائم أنيق يظهر عند التمرير 300px ويعود لأعلى الصفحة بسلاسة",
                      css: `#telewoo-totop { position: fixed; bottom: 20px; right: 20px; z-index: 99999; background: #0f172a; color: #fff; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; border: none; box-shadow: 0 6px 20px rgba(0,0,0,0.2); opacity: 0; pointer-events: none; transition: all 0.3s ease; }
#telewoo-totop.show { opacity: 1; pointer-events: auto; }`,
                      js: `(function(){
  if (document.getElementById('telewoo-totop')) return;
  var btn = document.createElement('button');
  btn.id = 'telewoo-totop';
  btn.innerHTML = '▲';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function(){
    if (window.scrollY > 300) btn.classList.add('show');
    else btn.classList.remove('show');
  });
  btn.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
})();`
                    },
                    {
                      title: "🚫 إخفاء شريط ووردبريس العلوي للعملاء",
                      desc: "إخفاء شريط ووردبريس Admin Bar العلوي في الواجهة للحفاظ على المظهر الاحترافي",
                      css: `#wpadminbar { display: none !important; }
html { margin-top: 0px !important; }
body { top: 0px !important; }`,
                      js: `// Admin Bar hidden for clean customer view`
                    },
                    {
                      title: "⭐ تبريز الأسعار والتقييمات بالذهب",
                      desc: "تكبير خط السعر وإبراز نجوم التقييم باللون الذهبي البراق",
                      css: `.woocommerce-Price-amount, .amount { font-size: 1.25rem !important; font-weight: 800 !important; color: #d97706 !important; }
.star-rating span::before { color: #f59e0b !important; }`,
                      js: `// Enhanced Price & Gold Stars`
                    }
                  ].map((snip, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentCss(snip.css);
                        setCurrentJs(snip.js);
                        setExplanation(`تم إدراج كود: ${snip.title}`);
                        toast({ title: "تم تحميل الكود الجاهز!", description: "اضغط على زر (إضافة إلى الكود) أو (استبدال ونشر) للحقن في متجرك." });
                      }}
                      className="p-3.5 rounded-lg border cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all space-y-1"
                    >
                      <div className="font-bold text-xs text-foreground">{snip.title}</div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{snip.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            {explanation && (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm">{explanation}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Code */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">الكود المولد</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleSnapshot} disabled={snapshotting}>
                      {snapshotting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <RefreshCw className="h-4 w-4 ml-2" />}
                      جلب الحالي
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleApply("append")} disabled={applying || (!currentCss && !currentJs)}>
                      {applying ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Rocket className="h-4 w-4 ml-2" />}
                      إضافة إلى الكود
                    </Button>
                    <Button size="sm" onClick={() => handleApply("replace")} disabled={applying || (!currentCss && !currentJs)}>
                      {applying ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                      استبدال ونشر
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleReset} disabled={resetting}>
                      {resetting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Trash2 className="h-4 w-4 ml-2" />}
                      مسح الكل
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="css">
                  <TabsList>
                    <TabsTrigger value="css">CSS</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                  </TabsList>
                  <TabsContent value="css" className="mt-3 space-y-2">
                    <Textarea
                      value={currentCss}
                      onChange={(e) => setCurrentCss(e.target.value)}
                      dir="ltr"
                      rows={12}
                      className="font-mono text-xs"
                      placeholder="/* الكود المولد سيظهر هنا */"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(currentCss, "CSS")}><Copy className="h-3 w-3 ml-1" />نسخ</Button>
                      <Button size="sm" variant="outline" onClick={() => download(currentCss, "telewoo.css")}><Download className="h-3 w-3 ml-1" />تنزيل</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="js" className="mt-3 space-y-2">
                    <Textarea
                      value={currentJs}
                      onChange={(e) => setCurrentJs(e.target.value)}
                      dir="ltr"
                      rows={12}
                      className="font-mono text-xs"
                      placeholder="// الكود المولد سيظهر هنا"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(currentJs, "JS")}><Copy className="h-3 w-3 ml-1" />نسخ</Button>
                      <Button size="sm" variant="outline" onClick={() => download(currentJs, "telewoo.js")}><Download className="h-3 w-3 ml-1" />تنزيل</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-4 text-right" dir="rtl">
            <Card dir="rtl" className="text-right">
              <CardHeader className="pb-3 text-right">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-right">معاينة الموقع التفاعلية (Live Site & Image Inspector)</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={useProxyPreview ? "default" : "outline"}
                      onClick={() => setUseProxyPreview(!useProxyPreview)}
                      className="gap-1.5 font-bold text-xs"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {useProxyPreview ? "مُفعل: بروكسي جلب الصور الآمن ⚡" : "تفعيل بروكسي جلب الصور (Proxy)"}
                    </Button>
                    {previewUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" />فتح الموقع في تبويب خارجي</a>
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  معاينة فورية لموقعك مع فك حظر الروابط والصور الجانبية لضمان تحميل جميع الصور وسكربتات المظهر دون أخطاء.
                </p>
              </CardHeader>
              <CardContent className="text-right space-y-3">
                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border shadow-inner bg-white">
                    <iframe
                      src={useProxyPreview ? `https://corsproxy.io/?${encodeURIComponent(previewUrl)}` : previewUrl}
                      className="w-full h-[68vh] border-0"
                      title="Site preview"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">أدخل رابط الموقع في تبويب الإعدادات أولاً لمعاينته وجلب صوره.</p>
                )}
              </CardContent>
            </Card>

            {/* AI Image Analyzer & Prompt Generator */}
            <InteractiveImagePromptAnalyzer initialImageUrl="" siteUrl={cleanSiteUrl} />
          </TabsContent>

          <TabsContent value="setup" className="mt-4 space-y-4 text-right" dir="rtl">
            {/* Sequential Stepper Guide */}
            <InjectionStepperGuide />
            <Card dir="rtl" className="text-right">
              <CardHeader className="pb-3 text-right">
                <div className="flex items-center gap-2">
                  <Plug className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-right">1) ثبّت ملحق TeleWoo Injector في ووردبريس</h3>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  ملحق صغير جدًا (ملف PHP واحد) يستقبل الكود ويطبعه في واجهة موقعك. لا يعدّل أي ملفات قالب.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-right">
                <ol className="list-decimal pr-5 text-sm space-y-1.5 text-foreground text-right">
                  <li>حمّل الملف من هنا:{" "}
                    <a href="/telewoo-injector.php" download className="text-primary underline">telewoo-injector.php</a>
                  </li>
                  <li>ارفعه إلى مجلد <code>wp-content/mu-plugins/</code> عبر FTP أو مدير الملفات (أنشئ المجلد إن لم يكن موجودًا).</li>
                  <li>افتح لوحة تحكم ووردبريس — سترى إشعارًا بمفتاح الربط. انسخه.</li>
                  <li>الصقه في حقل "مفتاح TeleWoo" بالأسفل واحفظ.</li>
                </ol>
                <div className="text-xs text-muted-foreground text-right">
                  لا يحتاج تفعيل يدوي — mu-plugins تعمل تلقائيًا.
                </div>
              </CardContent>
            </Card>

            <Card dir="rtl" className="text-right">
              <CardHeader className="pb-3 text-right">
                <h3 className="font-semibold text-right">2) بيانات الربط الإعدادية</h3>
              </CardHeader>
              <CardContent className="space-y-3 text-right">
                <div className="space-y-1.5 text-right">
                  <Label className="text-right">رابط الموقع (WordPress Site URL)</Label>
                  <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} dir="ltr" placeholder="https://example.com" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-right">مفتاح TeleWoo (X-TeleWoo-Key)</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowKeyGuide(!showKeyGuide)}
                      className="text-xs text-primary h-7 px-2 hover:bg-primary/10"
                    >
                      <HelpCircle className="h-3.5 w-3.5 ml-1" />
                      إرشادات: كيف تجد هذا الزر/المفتاح؟
                      {showKeyGuide ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                    </Button>
                  </div>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} dir="ltr" placeholder="الصق المفتاح من إشعار ووردبريس" />

                  {/* Expandable Guide Card */}
                  {showKeyGuide && (
                    <Card dir="rtl" className="border-primary/30 bg-primary/5 mt-2 animate-fadeIn text-right">
                      <CardContent className="p-4 space-y-3 text-xs sm:text-sm text-right">
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <HelpCircle className="h-4 w-4" />
                          <span>خطوات الحصول على مفتاح TeleWoo (X-TeleWoo-Key):</span>
                        </div>
                        <ol className="list-decimal pr-5 space-y-2 text-foreground/90 text-right">
                          <li>قم بتنزيل ملف <code>telewoo-injector.php</code> واشحنه إلى مجلد <code>wp-content/mu-plugins/</code> في استضافة موقعك.</li>
                          <li>قم بتسجيل الدخول إلى لوحة تحكم موقعك (WordPress Admin Dashboard).</li>
                          <li>ستظهر لك رسالة تنبيه زرقاء أعلى الشاشة تحتوي على <strong>"TeleWoo Secret Key"</strong>.</li>
                          <li>اضغط على زر <strong>"نسخ المفتاح" (Copy Key)</strong> الموجود داخل التنبيه.</li>
                          <li>عد إلى هذه الصفحة والصق المفتاح في الحقل أعلاه ثم اضغط على زر <strong>"حفظ"</strong> و <strong>"اختبار الاتصال"</strong>.</li>
                        </ol>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={handleSaveSettings} disabled={savingSettings || !siteUrl.trim()}>
                    {savingSettings ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    حفظ الإعدادات
                  </Button>
                  <Button variant="outline" onClick={handlePing} disabled={pinging || !siteUrl.trim()}>
                    {pinging ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plug className="h-4 w-4 mr-1.5" />}
                    اختبار الاتصال
                  </Button>
                  {pingStatus === "ok" && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">متصل بنجاح</Badge>}
                  {pingStatus === "fail" && <Badge variant="destructive">فشل الاتصال</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card dir="rtl" className="border-yellow-500/30 bg-yellow-500/5 text-right">
              <CardContent className="p-4 text-sm space-y-2 text-right">
                <p className="font-semibold text-right">بديل بدون ملحق:</p>
                <p className="text-muted-foreground text-right">
                  إن رفضت تثبيت الملحق، يمكنك نسخ CSS من تبويب الأستوديو ولصقه يدويًا في:
                  <br />
                  <span className="font-mono text-xs" dir="ltr">Appearance → Customize → Additional CSS</span>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}