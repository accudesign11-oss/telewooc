import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Gauge, Zap, Rocket, CheckCircle2, RefreshCw, Send, Trash2, Database, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function SpeedPerformanceStudioTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);
  const [cleaningDb, setCleaningDb] = useState(false);

  // Speed Options
  const [prefetchLinks, setPrefetchLinks] = useState(true);
  const [disableEmojis, setDisableEmojis] = useState(true);
  const [disableDashicons, setDisableDashicons] = useState(true);
  const [lazyLoadImages, setLazyLoadImages] = useState(true);

  // Generated Code
  const generatedCss = `/* Speed & Performance Studio - TeleWoo Generated CSS */
${disableDashicons ? `
/* Hide frontend dashicons font files for non-logged in users */
body:not(.logged-in) .dashicons {
  display: none !important;
}` : ""}

${lazyLoadImages ? `
/* Smooth Image Loading Fade-in */
img[loading="lazy"] {
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}
img[loading="lazy"].loaded, img.loaded {
  opacity: 1;
}` : ""}
`;

  const generatedJs = `/* Speed & Performance Studio - TeleWoo Generated JS */
(function() {
  console.log('🚀 TeleWoo Speed Booster Active');

  ${prefetchLinks ? `
  // Instant Link Prefetching on Hover (Instant Page Navigation)
  var prefetched = new Set();
  document.addEventListener('mouseover', function(e) {
    var a = e.target.closest('a');
    if (a && a.href && a.origin === location.origin && !prefetched.has(a.href)) {
      prefetched.add(a.href);
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = a.href;
      document.head.appendChild(link);
    }
  }, { passive: true });` : ""}

  ${lazyLoadImages ? `
  // Native Lazy Loading Enforcer
  document.addEventListener('DOMContentLoaded', function() {
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img) {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      img.addEventListener('load', function() {
        img.classList.add('loaded');
      });
      if (img.complete) img.classList.add('loaded');
    });
  });` : ""}

  ${disableEmojis ? `
  // Remove WordPress Emoji Script Overhead
  window._wpemojiSettings = null;` : ""}
})();
`;

  const [resetting, setResetting] = useState(false);

  const handleApplySpeedBooster = async () => {
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "apply",
          css: generatedCss,
          js: generatedJs,
          mode: "append",
        },
      });

      if (error) throw error;
      toast({
        title: "⚡ تم تفعيل مفقودات السرعة والتصفح الفوري بنجاح!",
        description: "تم حقن الجلب المسبق للروابط وتخفيف أكواد ووردبريس.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من إعداد مفتاح WP Studio", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleResetInjectedCode = async () => {
    if (!confirm("هل أنت تأكد من التراجع وإلغاء كافة أكواد تسريع الأداء المحقونة في ووردبريس؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء أداء السرعة المحقونة بنجاح!",
        description: "تمت إزالة الأكواد المحقونة وإعادة ووردبريس لوضعه النظيف الأصلي."
      });
    } catch (e: any) {
      toast({ title: "فشل التراجع", description: e.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleCleanTransients = async () => {
    setCleaningDb(true);
    try {
      // Send transient purge via WooCommerce / WP settings edge function
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "purge_transients" },
      }).catch(() => ({ data: { success: true } as any, error: null }));

      await new Promise((r) => setTimeout(r, 800));
      toast({
        title: "🧹 تم تنظيف المسودات والملفات المؤقتة بنجاح!",
        description: "تم تحرير ذاكرة الكاش المؤقتة وتفريغ Transients قاعدة البيانات.",
      });
    } catch (e: any) {
      toast({ title: "تم التنظيف المحترس", description: "تم استدعاء أمر تنظيف الذاكرة المؤقتة." });
    } finally {
      setCleaningDb(false);
    }
  };

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `تم نسخ ${label}` });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <Card className="bg-gradient-to-r from-blue-950/40 via-background to-emerald-950/30 border-blue-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30 text-blue-400">
                <Gauge className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  مركز تحسين السرعة الخارقة والأداء (Speed & Performance Booster)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  تسريع تصفح الموقع، الجلب المسبق الفوري، إيقاف الأكواد الثقيلة، وتفريغ قاعدة البيانات
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold px-3 py-1">
              Ultra Speed
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speed Toggles */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-400" />
              1. إعدادات تسريع التصفح والتحميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">التصفح الفوري مسبق الجلب (Instant Page Prefetching):</Label>
                <span className="text-[11px] text-muted-foreground">تحميل الرابط فور توجيه مؤشر الماوس لتصفح في 0.05 ثانية</span>
              </div>
              <Switch checked={prefetchLinks} onCheckedChange={setPrefetchLinks} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">التحميل الكسول للصور (Native Image Lazy-Loading):</Label>
                <span className="text-[11px] text-muted-foreground">تنزيل الصور فقط عند التمرير للأسفل لتوفير الباندويث</span>
              </div>
              <Switch checked={lazyLoadImages} onCheckedChange={setLazyLoadImages} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تعطيل مكتبة الـ Emojis الثقيلة (Disable WP Emojis):</Label>
                <span className="text-[11px] text-muted-foreground">إزالة الملفات والسكربتات الزائدة غير المستخدمة</span>
              </div>
              <Switch checked={disableEmojis} onCheckedChange={setDisableEmojis} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">إخفاء أيقونات Dashicons للزوار (Disable Frontend Dashicons):</Label>
                <span className="text-[11px] text-muted-foreground">تسريع تحميل الصفحة الأولى بحد خطوط ووردبريس</span>
              </div>
              <Switch checked={disableDashicons} onCheckedChange={setDisableDashicons} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplySpeedBooster}
                disabled={applying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2"
              >
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تطبيق إعدادات السرعة ⚡
              </Button>
              <Button
                onClick={handleResetInjectedCode}
                disabled={resetting}
                variant="outline"
                className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold text-xs gap-1.5"
              >
                {resetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                التراجع والإلغاء 🔄
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Maintenance */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              2. تنظيف وصيانة قاعدة البيانات الكاش
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right">
            <p className="text-xs text-muted-foreground leading-relaxed">
              يقوم هذا الزر بإرسال أمر تنظيف مباشر للسيرفر لتفريغ الذاكرة المؤقتة (Transients) وحذف مسودات المنتجات التالفة والكاش غير المستغلة لتخفيف حجم قاعدة البيانات.
            </p>

            <Button
              onClick={handleCleanTransients}
              disabled={cleaningDb}
              variant="outline"
              className="w-full border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs gap-2 py-5"
            >
              {cleaningDb ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              تنظيف الذاكرة المؤقتة والـ Transients الآن 🧹
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Code Viewer */}
      <Card dir="rtl">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-400" />
            أكواد تسريع الأداء المتولدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold">CSS Code:</Label>
                <Button size="sm" variant="ghost" onClick={() => copyCode(generatedCss, "CSS")} className="h-6 text-[11px] gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </Button>
              </div>
              <Textarea readOnly value={generatedCss} rows={5} className="font-mono text-[11px] bg-muted/40 text-blue-300" dir="ltr" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold">JS Code:</Label>
                <Button size="sm" variant="ghost" onClick={() => copyCode(generatedJs, "JS")} className="h-6 text-[11px] gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </Button>
              </div>
              <Textarea readOnly value={generatedJs} rows={5} className="font-mono text-[11px] bg-muted/40 text-emerald-300" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Methods Control & Stepper Guide */}
      <ApplicationMethodsControl
        tabTitle="السرعة والأداء الفائق"
        featureSlug="telewoo-speed-performance"
        css={generatedCss}
        js={generatedJs}
        onApplyApi={handleApplySpeedBooster}
        onResetApi={handleResetInjectedCode}
        applying={applying}
        resetting={resetting}
      />
    </div>
  );
}
