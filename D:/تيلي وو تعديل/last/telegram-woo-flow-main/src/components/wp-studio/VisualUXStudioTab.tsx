import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Palette, Sparkles, Moon, Sun, Clock, Zap, Copy, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function VisualUXStudioTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  // Feature Options
  const [glassHeader, setGlassHeader] = useState(true);
  const [darkModeBtn, setDarkModeBtn] = useState(true);
  const [customScrollbar, setCustomScrollbar] = useState(true);
  const [cardHover, setCardHover] = useState(true);

  // FOMO Bar Options
  const [fomoEnabled, setFomoEnabled] = useState(true);
  const [fomoText, setFomoText] = useState("🔥 خصم لفترة محدودة! استخدم كود SPECIAL20 للحصول على 20% خصم إضافي اليوم!");
  const [countdownMinutes, setCountdownMinutes] = useState(45);

  // Generated Code
  const generatedCss = `/* Visual & UX Studio - TeleWoo Generated CSS */
${glassHeader ? `
/* Sticky Glassmorphism Header */
header, .site-header, #masthead {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5) !important;
  transition: all 0.3s ease !important;
}
@media (prefers-color-scheme: dark) {
  header, .site-header, #masthead {
    background: rgba(15, 23, 42, 0.8) !important;
    border-bottom-color: rgba(51, 65, 85, 0.5) !important;
  }
}` : ""}

${customScrollbar ? `
/* Custom Modern Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #059669;
}` : ""}

${cardHover ? `
/* Card Hover Glow & Elevation */
.product, .woocommerce-loop-product__link, .card, .post-item {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease !important;
}
.product:hover, .woocommerce-loop-product__link:hover, .card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}` : ""}

${fomoEnabled ? `
/* FOMO Top Notification Bar */
#telewoo-fomo-bar {
  background: linear-gradient(90deg, #059669, #10b981, #047857);
  color: #ffffff;
  padding: 10px 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  position: relative;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
#telewoo-fomo-timer {
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 10px;
  border-radius: 9999px;
  font-family: monospace;
  letter-spacing: 1px;
}` : ""}
`;

  const generatedJs = `/* Visual & UX Studio - TeleWoo Generated JS */
(function() {
  console.log('✨ TeleWoo Visual UX Studio Active');
  
  ${fomoEnabled ? `
  // FOMO Bar Injector
  if (!document.getElementById('telewoo-fomo-bar')) {
    var fomo = document.createElement('div');
    fomo.id = 'telewoo-fomo-bar';
    fomo.innerHTML = '<span>${fomoText.replace(/'/g, "\\'")}</span> <span id="telewoo-fomo-timer">00:${countdownMinutes}:00</span>';
    document.body.insertBefore(fomo, document.body.firstChild);

    var seconds = ${countdownMinutes * 60};
    setInterval(function() {
      if (seconds <= 0) return;
      seconds--;
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      var timerEl = document.getElementById('telewoo-fomo-timer');
      if (timerEl) {
        timerEl.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      }
    }, 1000);
  }` : ""}

  ${darkModeBtn ? `
  // Floating Dark Mode Button
  if (!document.getElementById('telewoo-darkmode-btn')) {
    var btn = document.createElement('button');
    btn.id = 'telewoo-darkmode-btn';
    btn.innerHTML = '🌙';
    btn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:99999;width:44px;height:44px;border-radius:50%;background:#10b981;color:#fff;border:none;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;';
    btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
    btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
    btn.onclick = function() {
      document.body.classList.toggle('dark-theme');
      var isDark = document.body.classList.contains('dark-theme');
      btn.innerHTML = isDark ? '☀️' : '🌙';
      if (isDark) {
        document.body.style.filter = 'invert(0.9) hue-rotate(180deg)';
      } else {
        document.body.style.filter = 'none';
      }
    };
    document.body.appendChild(btn);
  }` : ""}
})();
`;

  const [resetting, setResetting] = useState(false);

  const handleApplyToWordPress = async () => {
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
        title: "✨ تم تطبيق المؤثرات والجماليات على موقعك بنجاح!",
        description: "تم حقن كود الهيدر الشفاف، الزر الليلي، وشريط العروض في ووردبريس.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من إعداد مفتاح WP Studio", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleResetInjectedCode = async () => {
    if (!confirm("هل أنت تأكد من التراجع وإلغاء كافة الأكواد والتأثيرات المحقونة من هذا التاب في ووردبريس؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء الحقن بنجاح!",
        description: "تمت إزالة الأكواد المحقونة وإعادة ووردبريس لوضعه النظيف الأصلي."
      });
    } catch (e: any) {
      toast({ title: "فشل التراجع", description: e.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `تم نسخ ${label}` });
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <Card className="bg-gradient-to-r from-purple-950/40 via-background to-emerald-950/30 border-purple-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/30 text-purple-400">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-purple-400 flex items-center gap-2">
                  أستوديو الجماليات والمؤثرات البصرية (Visual & UX Studio)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  إضافة الهيدر الشفاف الزجاجي، الوضع الليلي الفخم، شريط العروض الزمني المؤثر، والتنقل السلس
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold px-3 py-1">
              Visual Enhancer
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Toggles */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              1. خيارات المظهر والتصميم الحديث
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">الهيدر الزجاجي الشفاف (Glassmorphism Sticky Header):</Label>
                <span className="text-[11px] text-muted-foreground">تثبيت الهيدر أعلى الصفحة بتأثير الضباب الزجاجي المودرن</span>
              </div>
              <Switch checked={glassHeader} onCheckedChange={setGlassHeader} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">زر الوضع الليلي العائم (Floating Dark Mode):</Label>
                <span className="text-[11px] text-muted-foreground">زر عائم في أسفل الصفحة يتيح للزائر التحويل للوضع المظلم</span>
              </div>
              <Switch checked={darkModeBtn} onCheckedChange={setDarkModeBtn} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">شريط التمرير الأنيق (Modern Emerald Scrollbar):</Label>
                <span className="text-[11px] text-muted-foreground">تحويل شريط تمرير المتصفح للون الزمردي الأنيق</span>
              </div>
              <Switch checked={customScrollbar} onCheckedChange={setCustomScrollbar} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تأثير ارتفاع كروت المنتجات (Card Elevation on Hover):</Label>
                <span className="text-[11px] text-muted-foreground">ارتفاع كروت المنتجات مع توهج ناعم عند مرور الماوس</span>
              </div>
              <Switch checked={cardHover} onCheckedChange={setCardHover} />
            </div>
          </CardContent>
        </Card>

        {/* FOMO Sales Bar */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              2. شريط العروض والحث على الشراء (FOMO Sales Bar)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Label className="text-xs font-bold">تفعيل شريط الإعلانات أعلى الموقع:</Label>
              <Switch checked={fomoEnabled} onCheckedChange={setFomoEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نص الإعلان أو كود الخصم:</Label>
              <Input
                value={fomoText}
                onChange={(e) => setFomoText(e.target.value)}
                placeholder="أدخل نص الخصم أو العرض..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">مدة العداد التنازلي بالدقائق:</Label>
              <Input
                type="number"
                value={countdownMinutes}
                onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyToWordPress}
                disabled={applying}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2"
              >
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                حقن وتطبيق الجماليات 🚀
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
      </div>

      {/* Code Inspection */}
      <Card dir="rtl">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            معاينة أكواد CSS & JS المتولدة تلقائياً
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
              <Textarea readOnly value={generatedCss} rows={6} className="font-mono text-[11px] bg-muted/40 text-purple-300" dir="ltr" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold">JS Code:</Label>
                <Button size="sm" variant="ghost" onClick={() => copyCode(generatedJs, "JS")} className="h-6 text-[11px] gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </Button>
              </div>
              <Textarea readOnly value={generatedJs} rows={6} className="font-mono text-[11px] bg-muted/40 text-emerald-300" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Methods Control & Stepper Guide */}
      <ApplicationMethodsControl
        tabTitle="مظهر وجماليات الموقع"
        featureSlug="telewoo-visual-ux"
        css={generatedCss}
        js={generatedJs}
        onApplyApi={handleApplyToWordPress}
        onResetApi={handleResetInjectedCode}
        applying={applying}
        resetting={resetting}
      />
    </div>
  );
}
