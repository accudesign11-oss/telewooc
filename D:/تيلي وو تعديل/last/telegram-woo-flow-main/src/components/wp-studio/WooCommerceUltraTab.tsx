import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ShoppingCart, PhoneCall, Zap, CheckCircle2, RefreshCw, Send, Sparkles, Copy, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function WooCommerceUltraTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  // WooCommerce Control Toggles
  const [directCheckout, setDirectCheckout] = useState(true);
  const [whatsappButton, setWhatsappButton] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState("201000000000");
  const [orderBumpEnabled, setOrderBumpEnabled] = useState(true);
  const [orderBumpTitle, setOrderBumpTitle] = useState("🔥 عينة عطر فاخرة حصرياً لطلبات اليوم بـ 5$ فقط!");

  // Generated Code
  const generatedCss = `/* WooCommerce Ultra Control - TeleWoo Generated CSS */
${directCheckout ? `
/* Hide Cart Page Link Overlay */
.single_add_to_cart_button {
  background-color: #10b981 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  padding: 12px 24px !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}
.single_add_to_cart_button:hover {
  background-color: #059669 !important;
  transform: translateY(-2px) !important;
}` : ""}

${whatsappButton ? `
/* WhatsApp Fast Checkout Button */
.telewoo-wa-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  background-color: #25D366 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 14px !important;
  padding: 10px 18px !important;
  border-radius: 10px !important;
  text-decoration: none !important;
  margin-top: 8px !important;
  box-shadow: 0 4px 6px -1px rgba(37, 211, 102, 0.3) !important;
}` : ""}

${orderBumpEnabled ? `
/* Order Bump Checkbox Styling */
.telewoo-order-bump-box {
  background: #f0fdf4 !important;
  border: 2px dashed #10b981 !important;
  padding: 12px 16px !important;
  border-radius: 12px !important;
  margin: 16px 0 !important;
  display: flex !items-center !important;
  gap: 10px !important;
}` : ""}
`;

  const generatedJs = `/* WooCommerce Ultra Control - TeleWoo Generated JS */
(function() {
  console.log('🛒 TeleWoo WooCommerce Ultra Control Active');

  ${directCheckout ? `
  // Redirect Add To Cart Directly to Checkout Page
  jQuery(document.body).on('added_to_cart', function() {
    window.location.href = '/checkout/';
  });` : ""}

  ${whatsappButton ? `
  // Inject WhatsApp Fast Checkout Button into Product Pages
  document.addEventListener('DOMContentLoaded', function() {
    var form = document.querySelector('form.cart');
    if (form && !document.getElementById('telewoo-wa-checkout-btn')) {
      var waBtn = document.createElement('a');
      waBtn.id = 'telewoo-wa-checkout-btn';
      waBtn.className = 'telewoo-wa-btn';
      var prodTitle = document.querySelector('.product_title')?.textContent?.trim() || 'المنتج';
      var waMsg = encodeURIComponent('مرحباً، أود الحصول على المنتج: ' + prodTitle + ' عبر متجركم.');
      waBtn.href = 'https://wa.me/${whatsappPhone}?text=' + waMsg;
      waBtn.target = '_blank';
      waBtn.innerHTML = '💬 اطلب عبر واتساب فوراً';
      form.parentNode.insertBefore(waBtn, form.nextSibling);
    }
  });` : ""}
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
        title: "🛒 تم تفعيل إعدادات ووكومرس الفائقة بنجاح!",
        description: "تم تطبيق زر الشراء السريع عبر واتساب وتجاوز السيرة في ووردبريس.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من إعداد مفتاح WP Studio", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleResetInjectedCode = async () => {
    if (!confirm("هل أنت تأكد من التراجع وإلغاء كافة إعدادات وتعديلات ووكومرس المحقونة؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء تعديلات ووكومرس بنجاح!",
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
      <Card className="bg-gradient-to-r from-emerald-950/40 via-background to-teal-950/30 border-emerald-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  مركز التحكم الشامل في WooCommerce ومبيعات المتجر (WooCommerce Ultra)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  تخطي السلة للشراء المباشر، الشراء الفوري عبر واتساب، وعروض الـ Order Bumps
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold px-3 py-1">
              WooCommerce Ultra
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggles */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              1. تحسين إجراءات الشراء وتجربة الزبون
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تخطي السلة للشراء المباشر (Direct Checkout Bypass):</Label>
                <span className="text-[11px] text-muted-foreground">توجيه المشتري فوراً لصفحة إنهاء الطلب والدفع عند الضغط على إضافة للسلة</span>
              </div>
              <Switch checked={directCheckout} onCheckedChange={setDirectCheckout} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تفعيل زر الشراء الفوري عبر واتساب (WhatsApp Fast Checkout):</Label>
                <span className="text-[11px] text-muted-foreground">إظهار زر "اطلب عبر واتساب" في صفحة المنتج</span>
              </div>
              <Switch checked={whatsappButton} onCheckedChange={setWhatsappButton} />
            </div>

            {whatsappButton && (
              <div className="space-y-1.5 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <Label className="text-xs font-bold">رقم الواتساب بالرمز الدولي (بدون +):</Label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="مثال: 201000000000"
                  className="text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyToWordPress}
                disabled={applying}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
              >
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تطبيق إعدادات ووكومرس 🚀
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

        {/* Order Bump Settings */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              2. العروض التكميلية وزيادة قيمة السلة (Order Bump Offer)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Label className="text-xs font-bold">تفعيل عرض الـ Order Bump في صفحة الدفع:</Label>
              <Switch checked={orderBumpEnabled} onCheckedChange={setOrderBumpEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">عنوان ونص العرض الخاص في صفحة الشراء:</Label>
              <Input
                value={orderBumpTitle}
                onChange={(e) => setOrderBumpTitle(e.target.value)}
                placeholder="أدخل عنوان العرض..."
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Viewer */}
      <Card dir="rtl">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" />
            أكواد تحسين مبيعات ووكومرس المتولدة
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
              <Textarea readOnly value={generatedCss} rows={5} className="font-mono text-[11px] bg-muted/40 text-emerald-300" dir="ltr" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold">JS Code:</Label>
                <Button size="sm" variant="ghost" onClick={() => copyCode(generatedJs, "JS")} className="h-6 text-[11px] gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </Button>
              </div>
              <Textarea readOnly value={generatedJs} rows={5} className="font-mono text-[11px] bg-muted/40 text-teal-300" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Methods Control & Stepper Guide */}
      <ApplicationMethodsControl
        tabTitle="إعدادات ووكومرس الفائقة"
        featureSlug="telewoo-woocommerce-ultra"
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
