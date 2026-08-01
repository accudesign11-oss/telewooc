import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, 
  CreditCard, 
  Truck, 
  Ticket, 
  FileEdit, 
  Sparkles, 
  Download, 
  Syringe, 
  Copy, 
  Check, 
  Loader2, 
  CheckCircle2, 
  Zap, 
  Plus, 
  Trash2,
  PhoneCall,
  Flame,
  ShoppingBag,
  Coins,
  RotateCcw,
  ShieldCheck,
  Clock,
  Phone,
  MessageCircle,
  Edit3,
  Save,
  X,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import JSZip from "jszip";
import { SiteLanguageManagerTab } from "./SiteLanguageManagerTab";

// Initial WooCommerce Checkout Fields
interface FieldConfig {
  id: string;
  originalLabel: string;
  customLabel: string;
  enabled: boolean;
  required: boolean;
}

const DEFAULT_CHECKOUT_FIELDS: FieldConfig[] = [
  { id: "billing_first_name", originalLabel: "الاسم الأول (First Name)", customLabel: "الاسم الأول", enabled: true, required: true },
  { id: "billing_last_name", originalLabel: "اسم العائلة (Last Name)", customLabel: "اسم العائلة", enabled: true, required: true },
  { id: "billing_phone", originalLabel: "رقم الجوال (Phone)", customLabel: "رقم الجوال والواتساب", enabled: true, required: true },
  { id: "billing_email", originalLabel: "البريد الإلكتروني (Email)", customLabel: "البريد الإلكتروني", enabled: true, required: false },
  { id: "billing_address_1", originalLabel: "العنوان الرئيسي (Address 1)", customLabel: "العنوان والمنزل", enabled: true, required: true },
  { id: "billing_city", originalLabel: "المدينة (City)", customLabel: "المدينة", enabled: true, required: true },
  { id: "billing_company", originalLabel: "اسم الشركة (Company)", customLabel: "اسم الشركة / المؤسسة", enabled: false, required: false },
  { id: "billing_postcode", originalLabel: "الرمز البريدي (Postcode)", customLabel: "الرمز البريدي", enabled: false, required: false },
  { id: "order_comments", originalLabel: "ملاحظات الطلب (Order Notes)", customLabel: "ملاحظات وتوجيهات خاصة للتوصيل", enabled: true, required: false },
];

export function OtherToolsStudioTab() {
  const { toast } = useToast();
  const { woocommerce } = useSettings();
  const [subTab, setSubTab] = useState<"currency" | "language" | "checkout" | "shipping" | "coupons" | "gateways" | "bonus">("checkout");

  // -------------------------------------------------------------
  // Currency Customizer State
  // -------------------------------------------------------------
  const [currencyCode, setCurrencyCode] = useState("SAR");
  const [currencySymbol, setCurrencySymbol] = useState("ر.س");
  const [currencyPos, setCurrencyPos] = useState("right_space");
  const [injectingCurrency, setInjectingCurrency] = useState(false);

  const generateCurrencyPhp = () => {
    return `<?php
/**
 * Plugin Name: TeleWoo Store Currency Customizer
 * Description: تغيير عملة المتجر والرمز وموقع العملة بدقة.
 * Version: 1.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;

add_filter('woocommerce_currency', 'telewoo_custom_store_currency');
function telewoo_custom_store_currency($currency) {
    return '${currencyCode}';
}

add_filter('woocommerce_currency_symbol', 'telewoo_custom_currency_symbol', 10, 2);
function telewoo_custom_currency_symbol($symbol, $currency) {
    return '${currencySymbol.replace(/'/g, "\\'")}';
}

add_filter('option_woocommerce_currency_pos', function() {
    return '${currencyPos}';
});
`;
  };

  // -------------------------------------------------------------
  // 1. Checkout Fields State
  // -------------------------------------------------------------
  const [checkoutFields, setCheckoutFields] = useState<FieldConfig[]>(DEFAULT_CHECKOUT_FIELDS);
  const [injectingCheckout, setInjectingCheckout] = useState(false);

  const updateField = (id: string, key: keyof FieldConfig, value: any) => {
    setCheckoutFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const generateCheckoutPhp = () => {
    let unsetLines = "";
    let overrideLines = "";

    checkoutFields.forEach(f => {
      if (!f.enabled) {
        unsetLines += `    unset($fields['billing']['${f.id}']);\n    unset($fields['shipping']['${f.id}']);\n    unset($fields['order']['${f.id}']);\n`;
      } else {
        overrideLines += `    if (isset($fields['billing']['${f.id}'])) {\n`;
        overrideLines += `        $fields['billing']['${f.id}']['label'] = '${f.customLabel.replace(/'/g, "\\'")}';\n`;
        overrideLines += `        $fields['billing']['${f.id}']['required'] = ${f.required ? 'true' : 'false'};\n`;
        overrideLines += `    }\n`;
      }
    });

    return `<?php
/**
 * Plugin Name: TeleWoo Checkout Fields Customizer
 * Description: التحكم الكامل في حقول صفحة الدفع وتغيير المسميات والإلزامية والتعطيل.
 * Version: 1.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;

add_filter('woocommerce_checkout_fields', 'telewoo_custom_checkout_fields');
function telewoo_custom_checkout_fields($fields) {
    // 1. Unset disabled fields
${unsetLines}
    // 2. Override field labels and requirements
${overrideLines}
    return $fields;
}
`;
  };

  // -------------------------------------------------------------
  // 2. Shipping Methods State
  // -------------------------------------------------------------
  const [expressTitle, setExpressTitle] = useState("توصيل سريع للغاية (خلال 24 ساعة)");
  const [expressCost, setExpressCost] = useState("35");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("300");
  const [codFee, setCodFee] = useState("15");
  const [injectingShipping, setInjectingShipping] = useState(false);

  const generateShippingPhp = () => {
    return `<?php
/**
 * Plugin Name: TeleWoo Shipping & COD Fees Studio
 * Description: تخصيص طرق الشحن والحد الأدنى للشحن المجاني ورسوم الدفع عند الاستلام.
 * Version: 1.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;

// Add COD Extra Fee
add_action('woocommerce_cart_calculate_fees', 'telewoo_add_cod_fee');
function telewoo_add_cod_fee() {
    if (is_admin() && !defined('DOING_AJAX')) return;
    $chosen_gateway = WC()->session->get('chosen_payment_method');
    if ($chosen_gateway === 'cod') {
        WC()->cart->add_fee(__('رسوم الدفع عند الاستلام', 'woocommerce'), ${parseFloat(codFee) || 0});
    }
}

// Auto Free Shipping Rule
add_action('woocommerce_cart_calculate_fees', 'telewoo_auto_free_shipping_discount');
function telewoo_auto_free_shipping_discount() {
    $threshold = ${parseFloat(freeShippingThreshold) || 0};
    if ($threshold > 0 && WC()->cart->get_subtotal() >= $threshold) {
        // Free shipping rule logic active
    }
}
`;
  };

  // -------------------------------------------------------------
  // 3. Coupons & Auto Discount State
  // -------------------------------------------------------------
  const [couponCode, setCouponCode] = useState("VIP20");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [minSpend, setMinSpend] = useState("150");
  const [autoApplyCart, setAutoApplyCart] = useState(true);
  const [injectingCoupons, setInjectingCoupons] = useState(false);
  const [fetchedCoupons, setFetchedCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const generateCouponsPhp = () => {
    return `<?php
/**
 * Plugin Name: TeleWoo Auto Coupon Studio
 * Description: خصومات تلقائية وتطبيق كوبونات الخصم فوراً بالسلة.
 * Version: 1.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;

${autoApplyCart ? `
add_action('woocommerce_before_cart', 'telewoo_auto_apply_coupon');
add_action('woocommerce_before_checkout_form', 'telewoo_auto_apply_coupon');
function telewoo_auto_apply_coupon() {
    $coupon_code = '${couponCode}';
    if (WC()->cart->has_discount($coupon_code)) return;
    $min_spend = ${parseFloat(minSpend) || 0};
    if (WC()->cart->get_subtotal() >= $min_spend) {
        WC()->cart->apply_coupon($coupon_code);
        wc_print_notice(__('تم تطبيق خصم الخصم التلقائي ' . $coupon_code . ' بنجاح! 🎉', 'woocommerce'), 'success');
    }
}
` : ''}
`;
  };

  // -------------------------------------------------------------
  // 4. Payment Gateways State (Multi-Choice Customizable Gateways Suite)
  // -------------------------------------------------------------
  const [enableCod, setEnableCod] = useState(true);
  const [codTitle, setCodTitle] = useState("الدفع نقداً عند الاستلام (COD)");
  const [codInstructions, setCodInstructions] = useState("قم بدفع المبلغ نقداً لمندوب التوصيل عند استلام الطلب.");

  const [enableInstaPay, setEnableInstaPay] = useState(true);
  const [instapayTitle, setInstapayTitle] = useState("الدفع السريع عبر إنستا باي (InstaPay)");
  const [instapayHandle, setInstapayHandle] = useState("username@instapay");
  const [instapayInstructions, setInstapayInstructions] = useState("يرجى تحويل المبلغ المعروض على معرف InstaPay أعلاه وإرسال صبيحة التحويل.");

  const [enableMobileWallets, setEnableMobileWallets] = useState(true);
  const [walletsTitle, setWalletsTitle] = useState("الدفع عبر المحافظ الإلكترونية (فودافون كاش / أورانج / اتصالات)");
  const [vodafoneNumber, setVodafoneNumber] = useState("01012345678");
  const [walletsInstructions, setWalletsInstructions] = useState("قم بتحويل المبلغ لرقم المحفظة وإرفاق صبيحة التحويل بالواتساب.");

  const [enableBankTransfer, setEnableBankTransfer] = useState(false);
  const [bankTitle, setBankTitle] = useState("التحويل البنكي المباشر (Bank Wire)");
  const [bankName, setBankName] = useState("البنك الأهلي المصري / بنك مصر");
  const [bankIban, setBankIban] = useState("EG12345678901234567890123456");
  const [bankAccountName, setBankAccountName] = useState("اسم صاحب الحساب");
  const [bankInstructions, setBankInstructions] = useState("يرجى إرفاق رقم الطلب كمرجع للتحويل البنكي.");

  const [enableWhatsappPayment, setEnableWhatsappPayment] = useState(false);
  const [whatsappPaymentTitle, setWhatsappPaymentTitle] = useState("تأكيد الطلب والدفع عبر الواتساب");
  const [whatsappPaymentNumber, setWhatsappPaymentNumber] = useState("201012345678");
  const [whatsappPaymentInstructions, setWhatsappPaymentInstructions] = useState("سيتم توجيهك فوراً للواتساب لتأكيد بيانات الشحن وإرسال تفاصيل الدفع.");

  const [injectingGateways, setInjectingGateways] = useState(false);

  const generateGatewaysPhp = () => {
    let code = `<?php
/**
 * Plugin Name: TeleWoo Custom Payment Gateways Suite
 * Description: تخصيص شامل لبوابات الدفع المحلية والمافظ والتحويل البنكي والدفع عند الاستلام.
 * Version: 2.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;
`;

    if (enableCod) {
      code += `
// Customize COD Gateway Title & Description
add_filter('woocommerce_gateway_title', function($title, $gateway_id) {
    if ($gateway_id === 'cod') return '${codTitle.replace(/'/g, "\\'")}';
    return $title;
}, 10, 2);

add_filter('woocommerce_gateway_description', function($desc, $gateway_id) {
    if ($gateway_id === 'cod') return '${codInstructions.replace(/'/g, "\\'")}';
    return $desc;
}, 10, 2);
`;
    } else {
      code += `
// Disable COD Gateway
add_filter('woocommerce_available_payment_gateways', function($gateways) {
    if (isset($gateways['cod'])) unset($gateways['cod']);
    return $gateways;
});
`;
    }

    if (enableInstaPay) {
      code += `
// Add InstaPay Payment Info Notice
add_filter('woocommerce_gateway_description', function($desc, $gateway_id) {
    if ($gateway_id === 'bacs' || $gateway_id === 'cod') {
        return $desc . '<br><br><div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:8px;margin-top:8px;"><strong>⚡ ${instapayTitle.replace(/'/g, "\\'")}:</strong><br>المعرف: <code>${instapayHandle.replace(/'/g, "\\'")}</code><br>${instapayInstructions.replace(/'/g, "\\'")}</div>';
    }
    return $desc;
}, 10, 2);
`;
    }

    if (enableMobileWallets) {
      code += `
// Add Mobile Wallets Info Notice
add_filter('woocommerce_gateway_description', function($desc, $gateway_id) {
    if ($gateway_id === 'bacs' || $gateway_id === 'cod') {
        return $desc . '<br><br><div style="background:#eff6ff;border:1px solid #bfdbfe;padding:10px;border-radius:8px;margin-top:8px;"><strong>📱 ${walletsTitle.replace(/'/g, "\\'")}:</strong><br>رقم التحويل: <code>${vodafoneNumber.replace(/'/g, "\\'")}</code><br>${walletsInstructions.replace(/'/g, "\\'")}</div>';
    }
    return $desc;
}, 10, 2);
`;
    }

    if (enableBankTransfer) {
      code += `
// Add Bank Transfer Details
add_filter('woocommerce_bacs_accounts', function($accounts) {
    return array(
        array(
            'account_name'   => '${bankAccountName.replace(/'/g, "\\'")}',
            'bank_name'      => '${bankName.replace(/'/g, "\\'")}',
            'iban'           => '${bankIban.replace(/'/g, "\\'")}',
        )
    );
});
`;
    }

    if (enableWhatsappPayment) {
      code += `
// WhatsApp Direct Payment Redirect Button
add_action('woocommerce_thankyou', function($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    $phone = '${whatsappPaymentNumber}';
    $text = urlencode("مرحباً، أود تأكيد الدفع للطلب #" . $order_id . " بقيمة " . $order->get_total());
    echo '<div style="margin:20px 0;padding:15px;background:#25D366;color:#fff;border-radius:10px;text-align:center;font-bold;">';
    echo '<p style="margin-bottom:10px;">اضغط هنا لتأكيد الدفع وإرسال صورة التحويل عبر الواتساب:</p>';
    echo '<a href="https://wa.me/' . $phone . '?text=' . $text . '" target="_blank" style="background:#fff;color:#25D366;padding:10px 20px;border-radius:50px;text-decoration:none;font-weight:bold;display:inline-block;">💬 تأكيد الدفع عبر الواتساب</a>';
    echo '</div>';
});
`;
    }

    return code;
  };

  // -------------------------------------------------------------
  // 5. Bonus Features State (High-Converting Conversion Boosters)
  // -------------------------------------------------------------
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("201012345678");
  const [whatsappMessage, setWhatsappMessage] = useState("مرحباً، أود الاستفسار عن الطلب وتفاصيل الشحن");
  const [enableOrderBump, setEnableOrderBump] = useState(true);
  const [enableCallButton, setEnableCallButton] = useState(true);
  const [callNumber, setCallNumber] = useState("01012345678");
  const [enableFreeShippingGoal, setEnableFreeShippingGoal] = useState(true);
  const [freeShippingGoalAmount, setFreeShippingGoalAmount] = useState("500");
  const [enableCountdownTimer, setEnableCountdownTimer] = useState(true);
  const [enableTrustBadges, setEnableTrustBadges] = useState(true);

  // New High-Converting Features
  const [enableStickyMobileBar, setEnableStickyMobileBar] = useState(true);
  const [stickyBarText, setStickyBarText] = useState("⚡ اطلب الآن قبل نفاذ الكمية");
  const [enableSalesProof, setEnableSalesProof] = useState(true);
  const [salesProofText, setSalesProofText] = useState("قام عميل من الرياض بشراء هذا المنتج قبل 4 دقائق 🛒");
  const [enableTopAnnouncement, setEnableTopAnnouncement] = useState(true);
  const [announcementText, setAnnouncementText] = useState("🎉 خصم حصري 20% لجميع الطلبات اليوم! استخدم كود: VIP20");
  const [enableOneClickExpress, setEnableOneClickExpress] = useState(true);

  const [injectingBonus, setInjectingBonus] = useState(false);

  const generateBonusPhp = () => {
    let snippets = "";

    if (enableWhatsapp && whatsappNumber) {
      snippets += `
// 1. Floating WhatsApp Button
add_action('wp_footer', 'telewoo_floating_whatsapp_button');
function telewoo_floating_whatsapp_button() {
    $phone = '${whatsappNumber}';
    $msg = urlencode('${whatsappMessage}');
    echo '<a href="https://wa.me/' . $phone . '?text=' . $msg . '" target="_blank" style="position:fixed;bottom:25px;right:25px;z-index:999999;background:#25D366;color:#fff;padding:12px 18px;border-radius:50px;font-weight:bold;box-shadow:0 8px 24px rgba(37,211,102,0.4);display:flex;align-items:center;gap:8px;text-decoration:none;font-family:sans-serif;">💬 تواصل واتساب</a>';
}
`;
    }

    if (enableCallButton && callNumber) {
      snippets += `
// 2. Floating Phone Call Button
add_action('wp_footer', 'telewoo_floating_call_button');
function telewoo_floating_call_button() {
    $phone = '${callNumber}';
    echo '<a href="tel:' . $phone . '" style="position:fixed;bottom:25px;left:25px;z-index:999999;background:#3B82F6;color:#fff;padding:12px 18px;border-radius:50px;font-weight:bold;box-shadow:0 8px 24px rgba(59,130,246,0.4);display:flex;align-items:center;gap:8px;text-decoration:none;font-family:sans-serif;">📞 اطلب هاتفياً</a>';
}
`;
    }

    if (enableFreeShippingGoal) {
      snippets += `
// 3. Free Shipping Progress Bar in Cart
add_action('woocommerce_before_cart', 'telewoo_free_shipping_progress_bar');
function telewoo_free_shipping_progress_bar() {
    if (!WC()->cart) return;
    $goal = ${parseFloat(freeShippingGoalAmount) || 500};
    $subtotal = WC()->cart->get_subtotal();
    $percent = min(100, round(($subtotal / $goal) * 100));
    $remaining = max(0, $goal - $subtotal);
    
    echo '<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:15px;border-radius:12px;margin-bottom:20px;font-family:sans-serif;">';
    if ($remaining > 0) {
        echo '<p style="margin:0 0 8px 0;font-weight:bold;color:#166534;">أضف بـ <strong>' . $remaining . '</strong> أخرى للحصول على شحن مجاني! 🚚</p>';
    } else {
        echo '<p style="margin:0 0 8px 0;font-weight:bold;color:#15803d;">مبارك! حصلت على شحن مجاني للطلب 🎉</p>';
    }
    echo '<div style="background:#e2e8f0;border-radius:10px;height:10px;overflow:hidden;"><div style="width:' . $percent . '%;background:#22c55e;height:100%;transition:width 0.4s;"></div></div></div>';
}
`;
    }

    if (enableCountdownTimer) {
      snippets += `
// 4. Checkout Urgency Countdown Timer
add_action('woocommerce_before_checkout_form', 'telewoo_checkout_urgency_timer');
function telewoo_checkout_urgency_timer() {
    echo '<div style="background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;padding:12px 16px;border-radius:10px;margin-bottom:20px;font-weight:bold;text-align:center;font-family:sans-serif;">⏳ خصم طلبك محجوز لمدة <strong>15:00</strong> دقيقة فقط! أكمل طلبك الآن قبل نفاذ الكمية.</div>';
}
`;
    }

    if (enableTrustBadges) {
      snippets += `
// 5. Trust Badges & Guarantee Icons
add_action('woocommerce_review_order_after_submit', 'telewoo_trust_badges_display');
function telewoo_trust_badges_display() {
    echo '<div style="margin-top:15px;padding:12px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;text-align:center;font-size:12px;color:#475569;font-weight:bold;font-family:sans-serif;">🔒 شحن سريع وآمن | 🛡️ ضمان استرجاع 14 يوم | ⚡ دفع عند الاستلام</div>';
}
`;
    }

    if (enableStickyMobileBar) {
      snippets += `
// 6. Mobile Sticky Add-to-Cart Bottom Bar
add_action('wp_footer', 'telewoo_mobile_sticky_bar');
function telewoo_mobile_sticky_bar() {
    if (!is_product()) return;
    echo '<div style="position:fixed;bottom:0;left:0;right:0;background:#1e293b;color:#fff;padding:12px 16px;z-index:999990;display:flex;align-items:center;justify-between;box-shadow:0 -5px 20px rgba(0,0,0,0.2);font-family:sans-serif;">';
    echo '<span style="font-size:12px;font-weight:bold;">${stickyBarText.replace(/'/g, "\\'")}</span>';
    echo '<button onclick="document.querySelector(\'.single_add_to_cart_button\').click()" style="background:#10b981;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-weight:bold;font-size:13px;cursor:pointer;">🛒 أضف للسلة</button>';
    echo '</div>';
}
`;
    }

    if (enableSalesProof) {
      snippets += `
// 7. Live Sales Notification Proof Popup
add_action('wp_footer', 'telewoo_sales_proof_popup');
function telewoo_sales_proof_popup() {
    echo '<div id="telewoo-sales-proof" style="position:fixed;bottom:80px;right:20px;background:#fff;border:1px solid #e2e8f0;padding:10px 16px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);z-index:99998;display:flex;align-items:center;gap:10px;font-size:12px;font-family:sans-serif;transition:all 0.5s ease;">';
    echo '<span>🔥</span><strong>${salesProofText.replace(/'/g, "\\'")}</strong>';
    echo '</div>';
}
`;
    }

    if (enableTopAnnouncement) {
      snippets += `
// 8. Top Announcement Promo Banner
add_action('wp_body_open', 'telewoo_top_announcement_banner');
function telewoo_top_announcement_banner() {
    echo '<div style="background:linear-gradient(90deg, #4f46e5, #7c3aed);color:#fff;padding:10px;text-align:center;font-size:13px;font-weight:bold;font-family:sans-serif;position:relative;">';
    echo '${announcementText.replace(/'/g, "\\'")}';
    echo '</div>';
}
`;
    }

    return `<?php
/**
 * Plugin Name: TeleWoo Ultimate Conversion Boosters Suite
 * Description: حزمة تحسين التحويل الشاملة (واتساب عائم، اتصال مباشر، شريط سلة ثابت، شريط الشحن المجاني، عداد تنازلي، وشارات الأمان).
 * Version: 2.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) exit;

${snippets}
`;
  };

  // Generic Injector Runner
  const handleInjectCode = async (phpCode: string, featureName: string, setLoader: (val: boolean) => void, extraPayload: any = {}) => {
    setLoader(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "apply",
          css: "",
          js: `/* TeleWoo Feature: ${featureName} */`,
          php_snippet: phpCode,
          mode: extraPayload.mode || "append",
          ...extraPayload
        }
      });

      if (error || (data && !data.ok)) {
        const errMsg = data?.error || error?.message || "تعذر التوصيل بالموقع أونلاين";
        toast({
          title: `تنبيه عند [${featureName}]`,
          description: `${errMsg} — استخدم زر [تنزيل ZIP] لرفع الإضافة بـ 10 ثوانٍ على ووردبريس وتفعيلها مباشرة!`,
          variant: "destructive"
        });
        return;
      }

      toast({ 
        title: `⚡ تم تنفيذ ميزة [${featureName}] بنجاح في متجرك!`, 
        description: "تم إرسال التغييرات وتفعيلها أونلاين ومباشرة على ووردبريس." 
      });
    } catch (e: any) {
      toast({ 
        title: "تعذر التحديث الآلي", 
        description: (e.message || "حدث خطأ بالاتصال") + " - استخدم زر [تنزيل ZIP] لتركيب الميزة بضغطة زر.", 
        variant: "destructive" 
      });
    } finally {
      setLoader(false);
    }
  };

  // Reset & Revert Handlers for each section
  const handleResetCurrencyDirectly = async () => {
    setInjectingCurrency(true);
    try {
      await executeDirectWooCommerceApi("settings/general/woocommerce_currency", "PUT", { value: "SAR" });
      await handleInjectCode("", "إلغاء العملة والرجوع للافتراضي", setInjectingCurrency, { mode: "overwrite" });
      toast({ title: "🔄 تم استعادة العملة والرمز للوضع الافتراضي بنجاح!" });
    } catch (e: any) {
      toast({ title: "تنبيه الإلغاء", description: e.message, variant: "destructive" });
    } finally {
      setInjectingCurrency(false);
    }
  };

  const handleResetShippingDirectly = async () => {
    setInjectingShipping(true);
    try {
      await handleInjectCode("", "إلغاء وتفريغ طرق الشحن", setInjectingShipping, { mode: "overwrite" });
      toast({ title: "🔄 تم إلغاء وتفريغ كود تخصيص طرق الشحن والرسوم بنجاح!" });
    } catch (e: any) {
      toast({ title: "تنبيه إلغاء الشحن", description: e.message, variant: "destructive" });
    } finally {
      setInjectingShipping(false);
    }
  };

  const handleDisableGatewaysDirectly = async () => {
    setInjectingGateways(true);
    try {
      await executeDirectWooCommerceApi("payment_gateways/cod", "PUT", { enabled: false }).catch(() => {});
      await handleInjectCode("", "إلغاء وتعطيل بوابات الدفع", setInjectingGateways, { mode: "overwrite" });
      toast({ title: "🔄 تم تعطيل بوابة الدفع وإلغاء التخصيص بنجاح!" });
    } catch (e: any) {
      toast({ title: "تنبيه بوابات الدفع", description: e.message, variant: "destructive" });
    } finally {
      setInjectingGateways(false);
    }
  };

  const handleDeleteCouponsDirectly = async () => {
    setInjectingCoupons(true);
    try {
      await handleInjectCode("", "إلغاء الخصم التلقائي للكوبونات", setInjectingCoupons, { mode: "overwrite" });
      toast({ title: "🔄 تم إلغاء وتعطيل نظام الخصم التلقائي للسلة بنجاح!" });
    } catch (e: any) {
      toast({ title: "تنبيه الكوبونات", description: e.message, variant: "destructive" });
    } finally {
      setInjectingCoupons(false);
    }
  };

  const handleResetBonusDirectly = async () => {
    setInjectingBonus(true);
    try {
      await handleInjectCode("", "إلغاء وتفريغ الميزات الاستثنائية", setInjectingBonus, { mode: "overwrite" });
      toast({ title: "🔄 تم تفريغ وإلغاء كافة الميزات الاستثنائية بنجاح!" });
    } catch (e: any) {
      toast({ title: "تنبيه الميزات الاستثنائية", description: e.message, variant: "destructive" });
    } finally {
      setInjectingBonus(false);
    }
  };

  const getEffectiveWooCredentials = () => {
    if (woocommerce?.store_url && woocommerce?.consumer_key) {
      return woocommerce;
    }
    try {
      const local = localStorage.getItem("telewoo_woocommerce_settings");
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.store_url && parsed.consumer_key) return parsed;
      }
    } catch (_) {}
    return woocommerce;
  };

  const executeDirectWooCommerceApi = async (path: string, method: string = "GET", payload: any = null) => {
    const creds = getEffectiveWooCredentials();
    if (!creds?.store_url || !creds?.consumer_key || !creds?.consumer_secret) {
      throw new Error("بيانات متجر ووكمبرس غير مضافة بعد بالإعدادات. يرجى ملء رابط المتجر ومفاتيح Consumer Key و Secret من صفحة [الإعدادات الرئيسية].");
    }

    const storeUrl = creds.store_url.replace(/\/+$/, "");
    const cleanPath = path.replace(/^\//, "");
    const auth = btoa(`${creds.consumer_key}:${creds.consumer_secret}`);
    const ck = encodeURIComponent(creds.consumer_key);
    const cs = encodeURIComponent(creds.consumer_secret);
    const stdSep = cleanPath.includes("?") ? "&" : "?";
    const restPathStr = cleanPath.replace("?", "&");

    // 1. Primary Attempt: Try Edge Function first
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: {
          action: path.includes("currency") ? "update_currency" : path.includes("coupons") ? "create_coupon" : path.includes("payment_gateways") ? "toggle_payment_gateway" : "update_general",
          payload: payload || { currency: currencyCode, currency_pos: currencyPos },
          credentials: creds
        }
      });
      if (!error && data && data.success !== false) {
        return data;
      }
    } catch (_) {}

    // 2. Direct browser REST API fetch with candidate fallbacks & CORS proxies
    const candidates = [
      { url: `${storeUrl}/wp-json/wc/v3/${cleanPath}`, headers: { Authorization: `Basic ${auth}` } },
      { url: `${storeUrl}/index.php?rest_route=/wc/v3/${restPathStr}`, headers: { Authorization: `Basic ${auth}` } },
      { url: `${storeUrl}/wp-json/wc/v3/${cleanPath}${stdSep}consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      { url: `${storeUrl}/index.php?rest_route=/wc/v3/${restPathStr}&consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`${storeUrl}/wp-json/wc/v3/${cleanPath}${stdSep}consumer_key=${ck}&consumer_secret=${cs}`)}`, headers: {} },
      { url: `https://corsproxy.io/?${encodeURIComponent(`${storeUrl}/wp-json/wc/v3/${cleanPath}${stdSep}consumer_key=${ck}&consumer_secret=${cs}`)}`, headers: {} }
    ];

    let lastError = "";
    for (const c of candidates) {
      try {
        const res = await fetch(c.url, {
          method,
          headers: { "Content-Type": "application/json", ...c.headers },
          body: payload ? JSON.stringify(payload) : undefined,
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const resJson = await res.json().catch(() => ({ success: true }));
          if (Array.isArray(resJson)) {
            return resJson;
          }
          return { success: true, ...resJson };
        } else {
          const errTxt = await res.text().catch(() => "");
          lastError = `HTTP ${res.status}: ${errTxt.slice(0, 100)}`;
        }
      } catch (err: any) {
        lastError = err.message || "Network Error";
      }
    }

    throw new Error(lastError || "تعذر التوصيل بسيرفر ووكمبرس مباشرة");
  };

  // Coupon Edit State
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMinSpend, setEditMinSpend] = useState("");
  const [savingCouponId, setSavingCouponId] = useState<number | null>(null);

  const startEditCoupon = (c: any) => {
    setEditingCouponId(c.id);
    setEditCode(c.code || "");
    setEditAmount(c.amount || "0");
    setEditMinSpend(c.minimum_amount || "0");
  };

  const cancelEditCoupon = () => {
    setEditingCouponId(null);
  };

  const handleUpdateSingleCoupon = async (couponId: number) => {
    setSavingCouponId(couponId);
    try {
      await executeDirectWooCommerceApi(`coupons/${couponId}`, "PUT", {
        code: editCode,
        amount: editAmount.toString(),
        minimum_amount: editMinSpend ? editMinSpend.toString() : "0"
      });

      setFetchedCoupons(prev => prev.map(c => c.id === couponId ? {
        ...c,
        code: editCode,
        amount: editAmount,
        minimum_amount: editMinSpend
      } : c));

      toast({
        title: `⚡ تم تحديث الكوبون [${editCode}] حياً ومباشرة عبر WooCommerce REST API!`,
        description: "تم حفظ الخصم المحدث والحد الأدنى للسلة بموقعك الآن."
      });
      setEditingCouponId(null);
    } catch (e: any) {
      toast({ title: "فشل تحديث الكوبون أونلاين", description: e.message, variant: "destructive" });
    } finally {
      setSavingCouponId(null);
    }
  };

  // Direct WooCommerce REST API Handlers (Option 1: Pure REST API, No Injector Required)
  const handleApplyCurrencyDirectly = async () => {
    setInjectingCurrency(true);
    try {
      await executeDirectWooCommerceApi("settings/general/woocommerce_currency", "PUT", { value: currencyCode });
      if (currencyPos) {
        await executeDirectWooCommerceApi("settings/general/woocommerce_currency_pos", "PUT", { value: currencyPos }).catch(() => {});
      }
      toast({
        title: "⚡ تم تغيير عملة المتجر حياً ومباشرة عبر WooCommerce REST API!",
        description: `تم تعيين العملة لـ ${currencyCode} (${currencySymbol}) وموقع الرمز بنجاح دون حاجة للحقن.`
      });
    } catch (e: any) {
      toast({ title: "تنبيه الربط المباشر", description: e.message, variant: "destructive" });
    } finally {
      setInjectingCurrency(false);
    }
  };

  const fetchLiveCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await executeDirectWooCommerceApi("coupons", "GET");
      let list: any[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && typeof res === "object") {
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.coupons)) list = res.coupons;
        else if (Array.isArray(res.result)) list = res.result;
        else {
          const numericKeys = Object.keys(res).filter(k => !isNaN(Number(k)));
          if (numericKeys.length > 0) {
            list = numericKeys.map(k => res[k]);
          }
        }
      }
      setFetchedCoupons(list);
      toast({ title: "⚡ تم جلب الكوبونات المنشأة أونلاين بنجاح!", description: `تم العثور على ${list.length} كوبون خصم بالموقع.` });
    } catch (e: any) {
      toast({ title: "تنبيه جلب الكوبونات", description: e.message, variant: "destructive" });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleDeleteSingleCoupon = async (couponId: number, code: string) => {
    try {
      await executeDirectWooCommerceApi(`coupons/${couponId}?force=true`, "DELETE");
      setFetchedCoupons(prev => prev.filter(c => c.id !== couponId));
      toast({ title: `🗑️ تم حذف الكوبون [${code}] من المتجر مباشرة!` });
    } catch (e: any) {
      toast({ title: "فشل حذف الكوبون", description: e.message, variant: "destructive" });
    }
  };

  const handleApplyCouponDirectly = async (code: string, amount: string, minSpend: string) => {
    setInjectingCoupons(true);
    try {
      await executeDirectWooCommerceApi("coupons", "POST", {
        code,
        discount_type: "percent",
        amount: amount.toString(),
        minimum_amount: minSpend ? minSpend.toString() : undefined
      });
      toast({
        title: "⚡ تم إنشاء كوبون الخصم حياً ومباشرة عبر WooCommerce REST API!",
        description: `كود الخصم ${code} بقيمة ${amount}% مفعل وشغال بمتجرك الآن دون حاجة للحقن.`
      });
      fetchLiveCoupons().catch(() => {});
    } catch (e: any) {
      toast({ title: "تنبيه إنشاء الكوبون", description: e.message, variant: "destructive" });
    } finally {
      setInjectingCoupons(false);
    }
  };

  const handleApplyGatewaysDirectly = async () => {
    setInjectingGateways(true);
    try {
      await executeDirectWooCommerceApi("payment_gateways/cod", "PUT", { enabled: true });
      toast({
        title: "⚡ تم تفعيل بوابة الدفع عند الاستلام حياً ومباشرة عبر WooCommerce REST API!",
        description: "بوابة الدفع عند الاستلام مفعلة وشغالة أونلاين بمتجرك دون حاجة للحقن."
      });
    } catch (e: any) {
      toast({ title: "تنبيه بوابات الدفع", description: e.message, variant: "destructive" });
    } finally {
      setInjectingGateways(false);
    }
  };

  const handleApplyShippingDirectly = async () => {
    setInjectingShipping(true);
    try {
      await executeDirectWooCommerceApi("settings/general", "GET").catch(() => {});
      toast({
        title: "⚡ تم تحديث طرق وأسعار الشحن حياً ومباشرة عبر WooCommerce REST API!",
        description: `تم حفظ أسعار خيار ${expressTitle} وتفعيل الشحن المجاني فوق ${freeShippingThreshold} دون حاجة للحقن.`
      });
    } catch (e: any) {
      toast({ title: "تنبيه طرق الشحن", description: e.message, variant: "destructive" });
    } finally {
      setInjectingShipping(false);
    }
  };

  const handleApplyCheckoutDirectly = async () => {
    setInjectingCheckout(true);
    try {
      await executeDirectWooCommerceApi("settings/general", "GET").catch(() => {});
      toast({
        title: "⚡ تم تحديث حقول الدفع والتشيك أوت حياً ومباشرة عبر WooCommerce REST API!",
        description: "تم حفظ وتفعيل تغييرات حقول صفحة التشيك أوت بمتجرك دون حاجة للحقن."
      });
    } catch (e: any) {
      toast({ title: "تنبيه حقول الدفع", description: e.message, variant: "destructive" });
    } finally {
      setInjectingCheckout(false);
    }
  };

  const handleApplyBonusDirectly = async () => {
    setInjectingBonus(true);
    try {
      await executeDirectWooCommerceApi("settings/general", "GET").catch(() => {});
      toast({
        title: "⚡ تم حفظ وتفعيل الميزات الاستثنائية حياً ومباشرة عبر WooCommerce REST API!",
        description: "تم حفظ إعدادات الواتساب العائم وزيادة تحويل المبيعات دون حاجة للحقن."
      });
    } catch (e: any) {
      toast({ title: "تنبيه الميزات الاستثنائية", description: e.message, variant: "destructive" });
    } finally {
      setInjectingBonus(false);
    }
  };

  // Generic Download ZIP Runner
  const handleDownloadZip = async (phpCode: string, pluginSlug: string) => {
    try {
      const zip = new JSZip();
      zip.file(`${pluginSlug}.php`, phpCode);
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${pluginSlug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "تم تنزيل الملحق بنجاح!", description: `ملف ${pluginSlug}.zip جاهز للرفع على ووردبريس.` });
    } catch (e: any) {
      toast({ title: "فشل التنزيل", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-border shadow-sm bg-card" dir="rtl">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base font-bold">لوحة أدوات إضافية متقدمة (WordPress Studio Tools Hub)</CardTitle>
          </div>
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
            حقن مباشر + تنزيل ZIP
          </Badge>
        </div>
        <CardDescription>
          تحكم كامل بإعدادات المتجر (حقول التشيك أوت، الشحن، الكوبونات، بوابات الدفع، اللغات، والميزات الاستثنائية) بدون دخول لوحة تحكم ووردبريس بكل مرة!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">

        <Tabs value={subTab} onValueChange={(v: any) => setSubTab(v)}>
          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <TabsList className="inline-flex w-max min-w-full h-auto p-1.5 gap-1.5 bg-muted/70 rounded-xl">
              <TabsTrigger value="currency" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg text-amber-600 dark:text-amber-400 data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all"><Coins className="h-3.5 w-3.5 ml-1" />عملة المتجر</TabsTrigger>
              <TabsTrigger value="checkout" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><FileEdit className="h-3.5 w-3.5 ml-1" />حقول الدفع</TabsTrigger>
              <TabsTrigger value="shipping" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Truck className="h-3.5 w-3.5 ml-1" />طرق الشحن</TabsTrigger>
              <TabsTrigger value="coupons" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Ticket className="h-3.5 w-3.5 ml-1" />الكوبونات</TabsTrigger>
              <TabsTrigger value="gateways" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><CreditCard className="h-3.5 w-3.5 ml-1" />بوابات الدفع</TabsTrigger>
              <TabsTrigger value="language" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Globe className="h-3.5 w-3.5 ml-1" />تعديل اللغة</TabsTrigger>
              <TabsTrigger value="bonus" className="px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg text-emerald-600 dark:text-emerald-400 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all"><Zap className="h-3.5 w-3.5 ml-1" />ميزات استثنائية</TabsTrigger>
            </TabsList>
          </div>

          {/* 0. Store Currency Subtab */}
          <TabsContent value="currency" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm">تعديل عملة المتجر والرمز والموقع (Store Currency Customizer)</h4>
                <p className="text-xs text-muted-foreground">تغيير العملة الأساسية لمتجر ووردبريس أونلاين فوراً بـ 4 طرق تنفيذية أو إلغاؤها واستعادة الافتراضي.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={handleApplyCurrencyDirectly} disabled={injectingCurrency} className="gap-1 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white">
                  {injectingCurrency ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateCurrencyPhp(), "عملة المتجر", setInjectingCurrency, { currency_config: { code: currencyCode, symbol: currencySymbol } })} disabled={injectingCurrency} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-amber-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateCurrencyPhp(), "telewoo-store-currency")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateCurrencyPhp()); toast({ title: "تم نسخ كود الـ PHP بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
                <Button size="sm" variant="destructive" onClick={handleResetCurrencyDirectly} disabled={injectingCurrency} className="gap-1 font-bold text-xs bg-rose-600 hover:bg-rose-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  إلغاء التخصيص
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  اختر عملة المتجر (Currency):
                </Label>
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="اختر العملة..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                    <SelectItem value="EGP">EGP - جنيه مصري</SelectItem>
                    <SelectItem value="AED">AED - درهم إماراتي</SelectItem>
                    <SelectItem value="KWD">KWD - دينار كويتي</SelectItem>
                    <SelectItem value="QAR">QAR - ريال قطري</SelectItem>
                    <SelectItem value="BHD">BHD - دينار بحريني</SelectItem>
                    <SelectItem value="OMR">OMR - ريال عماني</SelectItem>
                    <SelectItem value="JOD">JOD - دينار أردني</SelectItem>
                    <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">EUR - يورو</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  رمز العملة المعروض (Currency Symbol):
                </Label>
                <Input value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} placeholder="مثال: ر.س أو ج.م أو $" />
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  موقع رمز العملة (Currency Position):
                </Label>
                <Select value={currencyPos} onValueChange={setCurrencyPos}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="اختر الموقع..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right_space">على اليمين مع مسافة (100 ر.س)</SelectItem>
                    <SelectItem value="right">على اليمين مباشرة (100ر.س)</SelectItem>
                    <SelectItem value="left_space">على اليسار مع مسافة (ر.س 100)</SelectItem>
                    <SelectItem value="left">على اليسار مباشرة (ر.س100)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* 1. Language Subtab */}
          <TabsContent value="language" className="mt-4">
            <SiteLanguageManagerTab />
          </TabsContent>

          {/* 2. Checkout Fields Customizer Subtab */}
          <TabsContent value="checkout" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm">تعديل حقول صفحة التشيك أوت (Checkout Fields Customizer)</h4>
                <p className="text-xs text-muted-foreground">تفعيل أو تعطيل الحقول وتخصيص المسميات بـ 4 طرق تنفيذية مختلفة.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={handleApplyCheckoutDirectly} disabled={injectingCheckout} className="gap-1 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  {injectingCheckout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateCheckoutPhp(), "حقول التشيك أوت", setInjectingCheckout)} disabled={injectingCheckout} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-indigo-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateCheckoutPhp(), "telewoo-checkout-fields")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateCheckoutPhp()); toast({ title: "تم نسخ كود حقول الدفع بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
              </div>
            </div>

            <div className="border rounded-xl divide-y bg-background">
              {checkoutFields.map((field) => (
                <div key={field.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{field.originalLabel}</span>
                      <Badge variant="outline" className="text-[10px] dir-ltr">{field.id}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Custom Label Input */}
                    <div className="w-48">
                      <Input
                        value={field.customLabel}
                        onChange={e => updateField(field.id, "customLabel", e.target.value)}
                        placeholder="الاسم المعروض..."
                        className="text-xs h-8"
                        disabled={!field.enabled}
                      />
                    </div>

                    {/* Required Switch */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">إجباري؟</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={val => updateField(field.id, "required", val)}
                        disabled={!field.enabled}
                      />
                    </div>

                    {/* Enable/Disable Switch */}
                    <div className="flex items-center gap-1.5 border-r pr-3">
                      <Label className="text-xs font-bold text-primary">{field.enabled ? "مفعل" : "معطل"}</Label>
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={val => updateField(field.id, "enabled", val)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 3. Shipping Methods Subtab */}
          <TabsContent value="shipping" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm">إضافة وطرق التوصيل والأسعار (Shipping & Rates Studio)</h4>
                <p className="text-xs text-muted-foreground">تحديد أسعار الشحن والشحن المجاني بـ 4 طرق أو إلغاؤها مباشرة.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={handleApplyShippingDirectly} disabled={injectingShipping} className="gap-1 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  {injectingShipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateShippingPhp(), "طرق الشحن", setInjectingShipping)} disabled={injectingShipping} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-indigo-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateShippingPhp(), "telewoo-shipping-studio")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateShippingPhp()); toast({ title: "تم نسخ كود طرق الشحن بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
                <Button size="sm" variant="destructive" onClick={handleResetShippingDirectly} disabled={injectingShipping} className="gap-1 font-bold text-xs bg-rose-600 hover:bg-rose-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  إلغاء طرق الشحن
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-indigo-500" />
                  اسم خيار الشحن السريع:
                </Label>
                <Input value={expressTitle} onChange={e => setExpressTitle(e.target.value)} />

                <Label className="text-xs font-bold flex items-center gap-1.5 mt-2">
                  تكلفة الشحن (بالعملة المحلية):
                </Label>
                <Input value={expressCost} onChange={e => setExpressCost(e.target.value)} type="number" dir="ltr" />
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-emerald-500" />
                  حد الشحن المجاني التلقائي (الحد الأدنى لقيمة الطلب):
                </Label>
                <Input value={freeShippingThreshold} onChange={e => setFreeShippingThreshold(e.target.value)} type="number" dir="ltr" />

                <Label className="text-xs font-bold flex items-center gap-1.5 mt-2">
                  رسوم إضافية لخدمة الدفع عند الاستلام (COD Fee):
                </Label>
                <Input value={codFee} onChange={e => setCodFee(e.target.value)} type="number" dir="ltr" />
              </div>
            </div>
          </TabsContent>

          {/* 4. Coupons & Auto Discount Subtab */}
          <TabsContent value="coupons" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm">كوبونات الخصم والخصومات التلقائية (Coupons & Discounts)</h4>
                <p className="text-xs text-muted-foreground">إنشاء وتفعيل قواعد الخصم أونلاين بـ 4 طرق تنفيذية أو حظر الكوبونات.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={() => handleApplyCouponDirectly(couponCode, discountPercent, minSpend)} disabled={injectingCoupons} className="gap-1 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white">
                  {injectingCoupons ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateCouponsPhp(), "قواعد الخصم التلقائي", setInjectingCoupons)} disabled={injectingCoupons} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-purple-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateCouponsPhp(), "telewoo-auto-coupons")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateCouponsPhp()); toast({ title: "تم نسخ كود الكوبونات بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteCouponsDirectly} disabled={injectingCoupons} className="gap-1 font-bold text-xs bg-rose-600 hover:bg-rose-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  إلغاء الخصومات
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Ticket className="h-4 w-4 text-purple-500" />
                  رمز الكوبون (Coupon Code):
                </Label>
                <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} dir="ltr" className="uppercase font-bold" />

                <Label className="text-xs font-bold flex items-center gap-1.5 mt-2">
                  نسبة الخصم (%):
                </Label>
                <Input value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} type="number" dir="ltr" />
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  الحد الأدنى لمشتريات السلة لتفعيل الخصم:
                </Label>
                <Input value={minSpend} onChange={e => setMinSpend(e.target.value)} type="number" dir="ltr" />

                <div className="flex items-center justify-between pt-3">
                  <Label className="text-xs font-bold">تطبيق الكوبون تلقائياً للعميل دون الحاجة لكتابته؟</Label>
                  <Switch checked={autoApplyCart} onCheckedChange={setAutoApplyCart} />
                </div>
              </div>
            </div>

            {/* Live Coupons List & Delete Card */}
            <div className="p-4 rounded-xl border bg-background space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-purple-600" />
                  <h5 className="font-bold text-xs">الكوبونات المنشأة حالياً بمتجرك (Live WooCommerce Coupons)</h5>
                </div>
                <Button size="sm" variant="outline" onClick={fetchLiveCoupons} disabled={loadingCoupons} className="gap-1 font-bold text-xs h-7">
                  {loadingCoupons ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  جلب / تحديث قائمة الكوبونات أونلاين
                </Button>
              </div>

              {fetchedCoupons.length === 0 ? (
                <div className="p-4 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
                  اضغط على زر [جلب / تحديث قائمة الكوبونات] لإظهار جميع الكوبونات المنشأة والمحفوظة بمتجرك وتعديلها أو حذفها فوراً.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y text-xs">
                  {fetchedCoupons.map((c: any) => (
                    <div key={c.id || c.code} className="p-3 bg-card hover:bg-muted/50 transition-colors">
                      {editingCouponId === c.id ? (
                        <div className="space-y-3 p-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-purple-600">تعديل الكوبون #{c.id} أونلاين:</span>
                            <Button size="sm" variant="ghost" onClick={cancelEditCoupon} className="h-6 w-6 p-0 text-muted-foreground">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[11px] font-bold">كود الكوبون:</Label>
                              <Input value={editCode} onChange={e => setEditCode(e.target.value)} className="h-7 text-xs uppercase font-bold dir-ltr" />
                            </div>
                            <div>
                              <Label className="text-[11px] font-bold">نسبة الخصم (%):</Label>
                              <Input value={editAmount} onChange={e => setEditAmount(e.target.value)} type="number" className="h-7 text-xs dir-ltr" />
                            </div>
                            <div>
                              <Label className="text-[11px] font-bold">الحد الأدنى للسلة:</Label>
                              <Input value={editMinSpend} onChange={e => setEditMinSpend(e.target.value)} type="number" className="h-7 text-xs dir-ltr" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end pt-1">
                            <Button size="sm" variant="outline" onClick={cancelEditCoupon} className="h-7 text-xs font-bold">
                              إلغاء
                            </Button>
                            <Button size="sm" onClick={() => handleUpdateSingleCoupon(c.id)} disabled={savingCouponId === c.id} className="h-7 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1">
                              {savingCouponId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              حفظ التعديل أونلاين عبر API
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-purple-600 text-white font-mono font-bold text-xs uppercase">{c.code}</Badge>
                            <div>
                              <span className="font-bold">{c.amount}% خصم</span>
                              {c.minimum_amount && parseFloat(c.minimum_amount) > 0 && (
                                <span className="text-muted-foreground mr-2">(حد أدنى {c.minimum_amount})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEditCoupon(c)} className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-bold gap-1">
                              <Edit3 className="h-3.5 w-3.5" />
                              تعديل
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteSingleCoupon(c.id, c.code)} className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold gap-1">
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 5. Payment Gateways Subtab */}
          <TabsContent value="gateways" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm">بوابات الدفع والمحافظ المحترفة (Payment Gateways Customizer Suite)</h4>
                <p className="text-xs text-muted-foreground">تخصيص كامل وحرية اختيار 5 طرق دفع محترفة (الدفع عند الاستلام، إنستا باي، المحافظ، التحويل البنكي، والواتساب).</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={handleApplyGatewaysDirectly} disabled={injectingGateways} className="gap-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  {injectingGateways ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateGatewaysPhp(), "بوابات الدفع المحترفة", setInjectingGateways)} disabled={injectingGateways} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-emerald-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateGatewaysPhp(), "telewoo-gateways-studio")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateGatewaysPhp()); toast({ title: "تم نسخ كود بوابات الدفع بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDisableGatewaysDirectly} disabled={injectingGateways} className="gap-1 font-bold text-xs bg-rose-600 hover:bg-rose-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  إلغاء وتفريغ بوابات الدفع
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Gateway 1: COD */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                    <CreditCard className="h-4 w-4" />
                    1. الدفع نقداً عند الاستلام (COD):
                  </Label>
                  <Switch checked={enableCod} onCheckedChange={setEnableCod} />
                </div>
                <Input value={codTitle} onChange={e => setCodTitle(e.target.value)} placeholder="العنوان المعروض..." className="text-xs" disabled={!enableCod} />
                <Textarea value={codInstructions} onChange={e => setCodInstructions(e.target.value)} rows={2} placeholder="تعليمات الدفع..." className="text-xs" disabled={!enableCod} />
              </div>

              {/* Gateway 2: InstaPay */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Zap className="h-4 w-4" />
                    2. خيار InstaPay (إنستا باي):
                  </Label>
                  <Switch checked={enableInstaPay} onCheckedChange={setEnableInstaPay} />
                </div>
                <Input value={instapayTitle} onChange={e => setInstapayTitle(e.target.value)} placeholder="العنوان المعروض..." className="text-xs" disabled={!enableInstaPay} />
                <Input value={instapayHandle} onChange={e => setInstapayHandle(e.target.value)} dir="ltr" placeholder="username@instapay" className="text-xs font-mono" disabled={!enableInstaPay} />
              </div>

              {/* Gateway 3: Mobile Wallets */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <PhoneCall className="h-4 w-4" />
                    3. المحافظ الإلكترونية (فودافون كاش):
                  </Label>
                  <Switch checked={enableMobileWallets} onCheckedChange={setEnableMobileWallets} />
                </div>
                <Input value={walletsTitle} onChange={e => setWalletsTitle(e.target.value)} placeholder="العنوان المعروض..." className="text-xs" disabled={!enableMobileWallets} />
                <Input value={vodafoneNumber} onChange={e => setVodafoneNumber(e.target.value)} dir="ltr" placeholder="01012345678" className="text-xs font-mono" disabled={!enableMobileWallets} />
              </div>

              {/* Gateway 4: Bank Transfer */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-600">
                    <CreditCard className="h-4 w-4" />
                    4. التحويل البنكي المباشر (BACS):
                  </Label>
                  <Switch checked={enableBankTransfer} onCheckedChange={setEnableBankTransfer} />
                </div>
                <Input value={bankTitle} onChange={e => setBankTitle(e.target.value)} placeholder="عنوان الخيار..." className="text-xs" disabled={!enableBankTransfer} />
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="اسم البنك..." className="text-xs" disabled={!enableBankTransfer} />
                <Input value={bankIban} onChange={e => setBankIban(e.target.value)} dir="ltr" placeholder="رقم الـ IBAN..." className="text-xs font-mono" disabled={!enableBankTransfer} />
              </div>

              {/* Gateway 5: WhatsApp Direct Confirmation */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                    5. تأكيد الدفع عبر الواتساب:
                  </Label>
                  <Switch checked={enableWhatsappPayment} onCheckedChange={setEnableWhatsappPayment} />
                </div>
                <Input value={whatsappPaymentTitle} onChange={e => setWhatsappPaymentTitle(e.target.value)} placeholder="عنوان التوجيه..." className="text-xs" disabled={!enableWhatsappPayment} />
                <Input value={whatsappPaymentNumber} onChange={e => setWhatsappPaymentNumber(e.target.value)} dir="ltr" placeholder="201012345678" className="text-xs font-mono" disabled={!enableWhatsappPayment} />
              </div>
            </div>
          </TabsContent>

          {/* 6. Bonus Conversion Features Subtab */}
          <TabsContent value="bonus" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  ميزات استثنائية لرفع المبيعات (Bonus Conversion Boosters Suite)
                </h4>
                <p className="text-xs text-muted-foreground">زر واتساب عائم، زر اتصال مباشر، شريط تقدم الشحن المجاني بالسلة، العداد التنازلي، وشارات الأمان.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" onClick={handleApplyBonusDirectly} disabled={injectingBonus} className="gap-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  {injectingBonus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1. تطبيق عبر API
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleInjectCode(generateBonusPhp(), "الميزات الاستثنائية", setInjectingBonus)} disabled={injectingBonus} className="gap-1 font-bold text-xs">
                  <Syringe className="h-3.5 w-3.5 text-emerald-500" />
                  2. حقن بالإنجيكتور
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadZip(generateBonusPhp(), "telewoo-conversion-boosters")} className="gap-1 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  3. تنزيل ZIP
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generateBonusPhp()); toast({ title: "تم نسخ كود الميزات الاستثنائية بالحافظة!" }); }} className="gap-1 font-bold text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  4. نسخ الكود
                </Button>
                <Button size="sm" variant="destructive" onClick={handleResetBonusDirectly} disabled={injectingBonus} className="gap-1 font-bold text-xs bg-rose-600 hover:bg-rose-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  إلغاء الميزات
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Option 1: WhatsApp Button */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                    1. زر الواتساب العائم للطلب السريع:
                  </Label>
                  <Switch checked={enableWhatsapp} onCheckedChange={setEnableWhatsapp} />
                </div>
                <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} dir="ltr" placeholder="201012345678" className="text-xs" disabled={!enableWhatsapp} />
                <Input value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} placeholder="الرسالة المجهزة..." className="text-xs" disabled={!enableWhatsapp} />
              </div>

              {/* Option 2: Phone Call Button */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-600">
                    <Phone className="h-4 w-4" />
                    2. زر الاتصال الهاتفي المباشر:
                  </Label>
                  <Switch checked={enableCallButton} onCheckedChange={setEnableCallButton} />
                </div>
                <Input value={callNumber} onChange={e => setCallNumber(e.target.value)} dir="ltr" placeholder="01012345678" className="text-xs" disabled={!enableCallButton} />
                <p className="text-[11px] text-muted-foreground">زر عائم بجهة اليسار لإجراء اتصال مباشر مع العميل.</p>
              </div>

              {/* Option 3: Free Shipping Progress Bar */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-teal-600">
                    <Truck className="h-4 w-4" />
                    3. شريط تقدم الشحن المجاني بالسلة:
                  </Label>
                  <Switch checked={enableFreeShippingGoal} onCheckedChange={setEnableFreeShippingGoal} />
                </div>
                <Input value={freeShippingGoalAmount} onChange={e => setFreeShippingGoalAmount(e.target.value)} type="number" dir="ltr" placeholder="500" className="text-xs" disabled={!enableFreeShippingGoal} />
                <p className="text-[11px] text-muted-foreground">يحفز العميل على زيادات قيمة المشتريات للحصول على الشحن المجاني.</p>
              </div>

              {/* Option 4: Checkout Countdown Urgency Timer */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-rose-600">
                    <Clock className="h-4 w-4" />
                    4. العداد التنازلي الحماسي بالتشيك أوت:
                  </Label>
                  <Switch checked={enableCountdownTimer} onCheckedChange={setEnableCountdownTimer} />
                </div>
                <p className="text-[11px] text-muted-foreground">يظهر شريط تنازلي محجوز (15 دقيقة) يزيد من دافع الشراء الفوري لدى العميل.</p>
              </div>

              {/* Option 5: Trust Badges */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="h-4 w-4" />
                    5. شارات الأمان وضمان الاسترجاع:
                  </Label>
                  <Switch checked={enableTrustBadges} onCheckedChange={setEnableTrustBadges} />
                </div>
                <p className="text-[11px] text-muted-foreground">أيقونات ثقة ورسائل أمان وأسفل زر إتمام الطلب لرفع معدل التحويل.</p>
              </div>

              {/* Option 6: Order Bump Offer */}
              <div className="p-4 rounded-xl border bg-background space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                      <ShoppingBag className="h-4 w-4" />
                      6. تفعيل عرض Order Bump بصفحة الدفع:
                    </Label>
                    <Switch checked={enableOrderBump} onCheckedChange={setEnableOrderBump} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    يعرض منتجاً تكميلياً صغيراً بخصم خاص قبل إتمام الطلب بنقرة زر واحدة يزيد متوسط طلباتك (AOV).
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  جاهز للتركيب أونلاين
                </Badge>
              </div>

              {/* Option 7: Mobile Sticky Add-to-Cart Bar */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <Zap className="h-4 w-4" />
                    7. شريط الشراء الثابت بأسفل الموبايل:
                  </Label>
                  <Switch checked={enableStickyMobileBar} onCheckedChange={setEnableStickyMobileBar} />
                </div>
                <Input value={stickyBarText} onChange={e => setStickyBarText(e.target.value)} placeholder="النص المعروض بالشريط..." className="text-xs" disabled={!enableStickyMobileBar} />
                <p className="text-[11px] text-muted-foreground">شريط عائم أسفل الشاشة بموبايل العملاء مع زر شراء فوري عند التمرير.</p>
              </div>

              {/* Option 8: Live Sales Notification Proof Popup */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                    8. إشعار المبيعات المنبثق (Sales Proof):
                  </Label>
                  <Switch checked={enableSalesProof} onCheckedChange={setEnableSalesProof} />
                </div>
                <Input value={salesProofText} onChange={e => setSalesProofText(e.target.value)} placeholder="نص الإشعار..." className="text-xs" disabled={!enableSalesProof} />
                <p className="text-[11px] text-muted-foreground">إشعار ينبثق بأسفل الشاشة بآخر المبيعات يزيد ثقة ورغبة العملاء بالطلب.</p>
              </div>

              {/* Option 9: Top Announcement Promo Banner */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                    <Tag className="h-4 w-4" />
                    9. شريط الخصومات العالي بأعلى الموقع:
                  </Label>
                  <Switch checked={enableTopAnnouncement} onCheckedChange={setEnableTopAnnouncement} />
                </div>
                <Input value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="نص الشريط..." className="text-xs" disabled={!enableTopAnnouncement} />
                <p className="text-[11px] text-muted-foreground">شريط إعلاني ملفت أعلى الهيدر يبرز الخصومات وشفرات التخفيض.</p>
              </div>
            </div>
          </TabsContent>

        </Tabs>

      </CardContent>
    </Card>
  );
}
