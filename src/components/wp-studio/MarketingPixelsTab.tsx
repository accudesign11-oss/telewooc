import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Target, BarChart3, Zap, CheckCircle2, RefreshCw, Send, Copy, Sparkles, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function MarketingPixelsTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  // Pixel IDs
  const [fbPixelId, setFbPixelId] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [snapPixelId, setSnapPixelId] = useState("");
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");

  const [trackAddToCart, setTrackAddToCart] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  // Generated Code
  const generatedJs = `/* Multi-Pixel & Marketing Analytics - TeleWoo Generated JS */
(function() {
  console.log('📈 TeleWoo Marketing Pixels Active');

  ${fbPixelId.trim() ? `
  // Facebook Pixel Injection
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${fbPixelId.trim()}');
  fbq('track', 'PageView');` : ""}

  ${tiktokPixelId.trim() ? `
  // TikTok Pixel Injection
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndDefer(ttq,ttq.methods[e]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('${tiktokPixelId.trim()}');
    ttq.page();
  }(window, document, 'ttq');` : ""}

  ${snapPixelId.trim() ? `
  // Snap Pixel Injection
  (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
  {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
  a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
  r.src=n;var u=t.getElementsByTagName(s)[0];
  u.parentNode.insertBefore(r,u);})(window,document,
  'https://sc-static.net/scevent.min.js');
  snaptr('init', '${snapPixelId.trim()}');
  snaptr('track', 'PAGE_VIEW');` : ""}

  ${ga4MeasurementId.trim() ? `
  // Google Analytics 4 (GA4) Injection
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId.trim()}';
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga4MeasurementId.trim()}');` : ""}

  ${trackAddToCart ? `
  // Automatic Add To Cart Event Tracker
  jQuery(document.body).on('added_to_cart', function() {
    if (window.fbq) fbq('track', 'AddToCart');
    if (window.ttq) ttq.track('AddToCart');
    if (window.snaptr) snaptr('track', 'ADD_CART');
  });` : ""}
})();
`;

  const [resetting, setResetting] = useState(false);

  const handleApplyPixels = async () => {
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "apply",
          css: "",
          js: generatedJs,
          mode: "append",
        },
      });

      if (error) throw error;
      toast({
        title: "📈 تم حقن بيكسل المنصات والـ Analytics بنجاح!",
        description: "تم تفعيل تتبع الزوار وأحداث الشراء على فيسبوك وتيك توك وسناب شات وجوجل.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من إعداد مفتاح WP Studio", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleResetInjectedCode = async () => {
    if (!confirm("هل أنت تأكد من التراجع وإلغاء كافة أكواد وبيكسلات التتبع المحقونة؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء أكواد البيكسل المحقونة بنجاح!",
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
      <Card className="bg-gradient-to-r from-amber-950/40 via-background to-orange-950/30 border-amber-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  مركز بيكسل المنصات والتتبع الإعلاني (Multi-Pixel & Marketing Analytics)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  حقن بيكسل فيسبوك، تيك توك، سناب شات، وجوجل أناليتكس بضغطة زر وبدون إضافة ثقيلة
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold px-3 py-1">
              Multi-Pixel Injector
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pixel IDs Input Form */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              1. إدخال معرّفات البيكسل (Pixel IDs)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Facebook Pixel ID:</Label>
              <Input
                value={fbPixelId}
                onChange={(e) => setFbPixelId(e.target.value)}
                placeholder="مثال: 123456789012345"
                className="text-xs font-mono text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">TikTok Pixel ID:</Label>
              <Input
                value={tiktokPixelId}
                onChange={(e) => setTiktokPixelId(e.target.value)}
                placeholder="مثال: C1234567890ABCDEF"
                className="text-xs font-mono text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Snapchat Pixel ID:</Label>
              <Input
                value={snapPixelId}
                onChange={(e) => setSnapPixelId(e.target.value)}
                placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="text-xs font-mono text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Google Analytics 4 (GA4 Measurement ID):</Label>
              <Input
                value={ga4MeasurementId}
                onChange={(e) => setGa4MeasurementId(e.target.value)}
                placeholder="مثال: G-XXXXXXXXXX"
                className="text-xs font-mono text-left"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Tracking Toggles */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              2. التتبع التلقائي لأحداث الشراء والسلة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تتبع إضافة المنتج للسلة تلقائياً (AddToCart Event):</Label>
                <span className="text-[11px] text-muted-foreground">إرسال حدث AddToCart لكافة المنصات فور ضغط الزبون على الشراء</span>
              </div>
              <Switch checked={trackAddToCart} onCheckedChange={setTrackAddToCart} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تتبع إتمام الطلب الشراء (Purchase Event):</Label>
                <span className="text-[11px] text-muted-foreground">إرسال قيمة وعملة الطلب للمنصات فور إنهاء الدفع</span>
              </div>
              <Switch checked={trackPurchase} onCheckedChange={setTrackPurchase} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyPixels}
                disabled={applying}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2"
              >
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                حقن وتفعيل البيكسل 📈
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

      {/* Generated JS Viewer */}
      <Card dir="rtl">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            معاينة كود البيكسل المحقون
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-right">
          <div className="flex justify-between items-center mb-1">
            <Label className="text-xs font-bold">JavaScript Code:</Label>
            <Button size="sm" variant="ghost" onClick={() => copyCode(generatedJs, "كود البيكسل")} className="h-6 text-[11px] gap-1 text-amber-400">
              <Copy className="h-3 w-3" /> نسخ
            </Button>
          </div>
          <Textarea readOnly value={generatedJs} rows={6} className="font-mono text-[11px] bg-muted/40 text-amber-300" dir="ltr" />
        </CardContent>
      </Card>

      {/* Application Methods Control & Stepper Guide */}
      <ApplicationMethodsControl
        tabTitle="بيكسل وتتبع التسويق"
        featureSlug="telewoo-marketing-pixels"
        js={generatedJs}
        onApplyApi={handleApplyPixels}
        onResetApi={handleResetInjectedCode}
        applying={applying}
        resetting={resetting}
      />
    </div>
  );
}
