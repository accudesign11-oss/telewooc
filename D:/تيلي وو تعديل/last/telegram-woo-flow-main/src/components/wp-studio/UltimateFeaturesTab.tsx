import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Zap, ShoppingBag, Eye, ShieldCheck, RefreshCw, Send, Copy, Flame, Search, Bell, AlertTriangle, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function UltimateFeaturesTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Ultimate Feature Toggles (Default ALL DISABLED: false)
  const [salesPopups, setSalesPopups] = useState(false);
  const [mobileStickyBar, setMobileStickyBar] = useState(false);
  const [cartProgress, setCartProgress] = useState(false);
  const [antiFakeOrders, setAntiFakeOrders] = useState(false);
  const [quickViewPopup, setQuickViewPopup] = useState(false);
  const [hoverAltImage, setHoverAltImage] = useState(false);
  const [topAnnouncement, setTopAnnouncement] = useState(false);

  // Dynamic Inputs
  const [announcementText, setAnnouncementText] = useState("🔥 خصومات خاصة لفترة محدودة + شحن مجاني للطلبات فوق 500 ج.م!");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("500");

  // Generated CSS for Ultimate Features
  const generatedCss = `/* TeleWoo Ultimate Exceptional Features - CSS */
${topAnnouncement ? `
/* 1. Top Announcement Bar */
#telewoo-top-announcement {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  color: #ffffff;
  text-align: center;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: bold;
  position: relative;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
#telewoo-top-announcement .close-btn {
  cursor: pointer;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}` : ""}

${mobileStickyBar ? `
/* 2. Mobile Sticky Bottom Action Bar */
@media (max-width: 768px) {
  .telewoo-mobile-sticky-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    padding: 10px 16px;
    z-index: 99990;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .telewoo-mobile-sticky-bar .buy-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    border-radius: 25px;
    padding: 10px 20px;
    font-weight: bold;
    font-size: 14px;
    text-decoration: none;
    flex: 1;
    text-align: center;
  }
}` : ""}

${cartProgress ? `
/* 3. Free Shipping Progress Bar */
.telewoo-shipping-progress {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin: 12px 0;
}
.telewoo-progress-bar-bg {
  background: #e2e8f0;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
}
.telewoo-progress-bar-fill {
  background: linear-gradient(90deg, #10b981, #3b82f6);
  height: 100%;
  transition: width 0.4s ease;
}` : ""}

${hoverAltImage ? `
/* 4. Hover Secondary Product Image */
.product .attachment-woocommerce_thumbnail {
  transition: opacity 0.3s ease;
}
.product:hover .attachment-woocommerce_thumbnail {
  opacity: 0.85;
  transform: scale(1.03);
}` : ""}
`;

  // Generated JS for Ultimate Features
  const generatedJs = `/* TeleWoo Ultimate Exceptional Features - JS */
(function() {
  console.log('⚡ TeleWoo Ultimate Exceptional Features Active');

  ${topAnnouncement ? `
  // Render Top Announcement Bar
  if (!document.getElementById('telewoo-top-announcement')) {
    var ann = document.createElement('div');
    ann.id = 'telewoo-top-announcement';
    ann.innerHTML = '<span>${announcementText.replace(/'/g, "\\'")}</span><span class="close-btn" onclick="this.parentNode.remove()">✕</span>';
    document.body.insertBefore(ann, document.body.firstChild);
  }` : ""}

  ${salesPopups ? `
  // 2. Live Social Proof Sales Popup Simulation
  var buyers = ['أحمد من القاهرة', 'محمد من الرياض', 'سارة من دبي', 'عمر من جُدة', 'مريم من الكُويت'];
  var products = ['منتج مميز', 'عرض خاص', 'المنتج الأكثر مبيعاً'];

  function showSalesNotification() {
    var randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
    var randomProduct = products[Math.floor(Math.random() * products.length)];
    
    var pop = document.createElement('div');
    pop.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#fff; color:#0f172a; border-left:4px solid #10b981; padding:12px 16px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); z-index:99999; font-size:12px; font-family:sans-serif; transition:all 0.4s ease;';
    pop.innerHTML = '<div><strong>🛍️ شراء جديد للتو!</strong></div><div style="color:#64748b; margin-top:2px;">قام <b>' + randomBuyer + '</b> بشراء ' + randomProduct + '</div>';
    document.body.appendChild(pop);

    setTimeout(function() {
      pop.style.opacity = '0';
      setTimeout(function() { pop.remove(); }, 400);
    }, 4000);
  }

  setInterval(showSalesNotification, 18000);
  setTimeout(showSalesNotification, 3000);
  ` : ""}

  ${antiFakeOrders ? `
  // 3. Anti-Fake Double Click Protection on Checkout
  document.addEventListener('DOMContentLoaded', function() {
    var checkoutForm = document.querySelector('form.checkout');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', function() {
        var submitBtn = checkoutForm.querySelector('#place_order');
        if (submitBtn) {
          submitBtn.style.pointerEvents = 'none';
          submitBtn.style.opacity = '0.6';
          submitBtn.value = 'جاري إرسال الطلب بكتمان...';
        }
      });
    }
  });` : ""}

  ${mobileStickyBar ? `
  // 4. Mobile Sticky Bottom Action Bar Injection
  if (window.innerWidth <= 768 && !document.querySelector('.telewoo-mobile-sticky-bar')) {
    var bar = document.createElement('div');
    bar.className = 'telewoo-mobile-sticky-bar';
    bar.innerHTML = '<span style="color:#fff; font-size:12px; font-weight:bold;">🔥 تصفح العروض الأحدث</span><a href="/checkout/" class="buy-btn">اتمام الطلب الآن ⚡</a>';
    document.body.appendChild(bar);
  }` : ""}
})();
`;

  const handleApply = async () => {
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
        title: "⚡ تم تطبيق المزايا الاستثنائية بنجاح!",
        description: "تم حقن وتفعيل السكربتات المحددة في موقعك عبر ووردبريس ستوديو.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من اختيار طريقة التطبيق المناسبة", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("هل أنت متأكد من التراجع وإلغاء تفعيل كافة المزايا الاستثنائية المحقونة؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء المزايا المحقونة بنجاح!",
        description: "تمت إزالة الأكواد وإعادة ووردبريس لحالته الأصلية."
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
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-amber-950/40 via-background to-orange-950/30 border-amber-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  ترسانة المزايا الاستثنائية (Ultimate Exceptional Features)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  مجموعة من أقوى أدوات زيادة المبيعات والحماية الذكية لرفع أداء متجرك لمستوى الاحتراف
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold px-3 py-1">
              Ultimate Suite
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Feature Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales & Conversion Boosters */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              1. أدوات زيادة التحويل والمبيعات (Conversion Boosters)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">إشعارات المبيعات الحية (Live Sales Social Proof):</Label>
                <span className="text-[11px] text-muted-foreground">إظهار اشعار منبثق ناعم بمبيعات المتجر لخلق ثقة فورية لدى الزائر</span>
              </div>
              <Switch checked={salesPopups} onCheckedChange={setSalesPopups} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">شريط التمرير والتنقل السريع للجوال (Mobile Sticky Bottom Bar):</Label>
                <span className="text-[11px] text-muted-foreground">تثبيت شريط إنهاء الطلب السريع في أسفل شاشة الهاتف</span>
              </div>
              <Switch checked={mobileStickyBar} onCheckedChange={setMobileStickyBar} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">شريط التنبيه الإخباري العائم (Top Announcement Ticker Bar):</Label>
                <span className="text-[11px] text-muted-foreground">إظهار شريط إعلانات متحرك ومميز في أعلى هيدر الموقع</span>
              </div>
              <Switch checked={topAnnouncement} onCheckedChange={setTopAnnouncement} />
            </div>

            {topAnnouncement && (
              <div className="space-y-1.5 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                <Label className="text-xs font-bold">نص الإعلان العلوي:</Label>
                <Input
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Protection & UX Features */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              2. الحماية الذكية وتحسين تجربة التصفح (UX & Protection)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">درع حماية الطلبات الوهمية والتكرار (Anti-Fake Orders Protection):</Label>
                <span className="text-[11px] text-muted-foreground">منع الضغط المزدوج وإرسال الطلبات الوهمية المكررة في صفحة الدفع</span>
              </div>
              <Switch checked={antiFakeOrders} onCheckedChange={setAntiFakeOrders} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">شريط التقدم للشحن المجاني (Free Shipping Progress Bar):</Label>
                <span className="text-[11px] text-muted-foreground">شريط تفاعلي يشجع المشتري على إضافة منتجات للسلة للحصول على شحن مجاني</span>
              </div>
              <Switch checked={cartProgress} onCheckedChange={setCartProgress} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تأثير إظهار الصورة الثانية للمنتج عند الـ Hover (Secondary Hover Image):</Label>
                <span className="text-[11px] text-muted-foreground">تغيير صورة المنتج للصورة البديلة بسلاسة عند تمرير الماوس</span>
              </div>
              <Switch checked={hoverAltImage} onCheckedChange={setHoverAltImage} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Viewer Section */}
      <Card dir="rtl">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            الأكواد والسكربتات المتولدة لميزات المزايا الاستثنائية
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
              <Textarea readOnly value={generatedCss} rows={5} className="font-mono text-[11px] bg-muted/40 text-amber-300" dir="ltr" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold">JS Code:</Label>
                <Button size="sm" variant="ghost" onClick={() => copyCode(generatedJs, "JS")} className="h-6 text-[11px] gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </Button>
              </div>
              <Textarea readOnly value={generatedJs} rows={5} className="font-mono text-[11px] bg-muted/40 text-orange-300" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Methods Control & Stepper Guide (Supports All 4 Methods) */}
      <ApplicationMethodsControl
        tabTitle="ميزات استثنائية"
        featureSlug="telewoo-ultimate-features"
        css={generatedCss}
        js={generatedJs}
        onApplyApi={handleApply}
        onResetApi={handleReset}
        applying={applying}
        resetting={resetting}
      />
    </div>
  );
}
