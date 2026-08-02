import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Loader2, Sparkles, Download, History, RefreshCw, Lightbulb, FileCode2, Merge, Edit3, XCircle, Trash2, Code, Copy, Check, Eye, Zap, Shield, CreditCard, Truck, Tag, Globe, Sliders, Plus, Key, Cpu, Radio, Activity, Share2, Layers, Settings, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { WpResetAndUploaderTools } from "./WpResetAndUploaderTools";

interface CustomGateway {
  id: string;
  title: string;
  account: string;
  instructions: string;
}

interface CustomShipping {
  id: string;
  title: string;
  cost: string;
}

const AVAILABLE_LANGUAGES = [
  { code: "ar", name: "العربية", flag: "🇸🇦", rtl: true },
  { code: "en", name: "English", flag: "🇬🇧", rtl: false },
  { code: "fr", name: "Français", flag: "🇫🇷", rtl: false },
  { code: "de", name: "Deutsch", flag: "🇩🇪", rtl: false },
  { code: "es", name: "Español", flag: "🇪🇸", rtl: false },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", rtl: false },
];

function b64ToBlob(b64: string, mime = "application/zip") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function invokeFn<T = any>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) { try { detail = await error.context.text(); } catch (_) {} }
    throw new Error(detail || "فشل الاستدعاء");
  }
  if (data && data.ok === false) throw new Error(data.error || "خطأ غير معروف");
  return data as T;
}

export function PluginBuilderTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [autoDeploying, setAutoDeploying] = useState(false);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);

  // ====== 13-TAB FEATURE SUITE MATRIX STATES ======
  // 1. Payment Gateways
  const [enableInstaPay, setEnableInstaPay] = useState(true);
  const [instapayTitle, setInstapayTitle] = useState("الدفع السريع عبر إنستا باي (InstaPay)");
  const [instapayHandle, setInstapayHandle] = useState("username@instapay");
  const [instapayInstructions, setInstapayInstructions] = useState("يرجى فتح تطبيق InstaPay وتحويل المبلغ للحساب الموضح أعلاه ثم إرفاق تأكيد التحويل.");

  const [enableMobileWallets, setEnableMobileWallets] = useState(true);
  const [walletsTitle, setWalletsTitle] = useState("الدفع عبر المحافظ الإلكترونية (فودافون كاش / أورانج / اتصالات)");
  const [vodafoneNumber, setVodafoneNumber] = useState("01012345678");
  const [walletsInstructions, setWalletsInstructions] = useState("قم بتحويل المبلغ لرقم المحفظة وإرفاق صورة التحويل بالواتساب.");

  const [enableBankTransfer, setEnableBankTransfer] = useState(false);
  const [bankTitle, setBankTitle] = useState("التحويل البنكي المباشر (Bank Wire)");
  const [bankIban, setBankIban] = useState("EG12345678901234567890123456");
  const [bankInstructions, setBankInstructions] = useState("يرجى إرفاق رقم الطلب كمرجع للتحويل البنكي.");

  const [enableCod, setEnableCod] = useState(true);
  const [customGateways, setCustomGateways] = useState<CustomGateway[]>([]);

  // 2. Shipping Methods
  const [enableExpressShipping, setEnableExpressShipping] = useState(true);
  const [expressTitle, setExpressTitle] = useState("شحن سريع وسريع جداً (خلال 24-48 ساعة)");
  const [expressPrice, setExpressPrice] = useState("60");
  const [customShippingRates, setCustomShippingRates] = useState<CustomShipping[]>([]);

  // 3. Multi-Language Switcher
  const [enableMultiLanguage, setEnableMultiLanguage] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["ar", "en", "fr"]);

  // 4. Checkout Fields & Auto Coupons
  const [hideOrderNotes, setHideOrderNotes] = useState(true);
  const [hideCompanyField, setHideCompanyField] = useState(true);
  const [requirePhoneField, setRequirePhoneField] = useState(true);
  const [enableAutoCoupon, setEnableAutoCoupon] = useState(true);
  const [autoCouponCode, setAutoCouponCode] = useState("OFF10");
  const [autoCouponMinSpend, setAutoCouponMinSpend] = useState("300");

  // 5. Sales & Marketing Boosters
  const [enableWhatsappFloat, setEnableWhatsappFloat] = useState(true);
  const [whatsappFloatNumber, setWhatsappFloatNumber] = useState("201012345678");
  const [whatsappFloatMsg, setWhatsappFloatMsg] = useState("مرحباً، أود الاستفسار عن الطلب وتفاصيل الشحن");
  const [enableStickyMobileBar, setEnableStickyMobileBar] = useState(true);
  const [stickyBarText, setStickyBarText] = useState("⚡ اطلب الآن قبل نفاذ الكمية");
  const [enableTopAnnouncement, setEnableTopAnnouncement] = useState(true);
  const [announcementText, setAnnouncementText] = useState("🎉 خصم حصري 20% لجميع الطلبات اليوم! استخدم كود: VIP20");

  // 6. Security Hardening & Speed Performance
  const [disableRightClick, setDisableRightClick] = useState(true);
  const [hideWpVersion, setHideWpVersion] = useState(true);
  const [disableXmlrpc, setDisableXmlrpc] = useState(true);
  const [disableEmojis, setDisableEmojis] = useState(true);
  const [removeQueryStrings, setRemoveQueryStrings] = useState(true);

  // 7. REST API & Webhooks
  const [enableRestApiEndpoint, setEnableRestApiEndpoint] = useState(true);
  const [enableOrderWebhooks, setEnableOrderWebhooks] = useState(true);
  const [webhookTargetUrl, setWebhookTargetUrl] = useState("https://example.com/webhook");

  // 8. Marketing Pixels
  const [enableMetaPixel, setEnableMetaPixel] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("1234567890");

  // Modal State
  const [viewCodePlugin, setViewCodePlugin] = useState<any | null>(null);
  const [editModalPlugin, setEditModalPlugin] = useState<any | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [updatingPlugin, setUpdatingPlugin] = useState<boolean>(false);
  const [viewingPhpCode, setViewingPhpCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const loadPlugins = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data } = await supabase.from("wp_plugins").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    setPlugins(data || []);
  };

  useEffect(() => { loadPlugins(); }, []);

  const addCustomGateway = () => {
    const nextIdx = customGateways.length + 1;
    setCustomGateways([
      ...customGateways,
      { id: "custom_gw_" + Date.now(), title: "بوابة دفع مخصصة #" + nextIdx, account: "رقم الحساب / المحفظة", instructions: "تعليمات التحويل..." }
    ]);
  };

  const removeCustomGateway = (id: string) => {
    setCustomGateways(customGateways.filter((g) => g.id !== id));
  };

  const addCustomShippingRate = () => {
    const nextIdx = customShippingRates.length + 1;
    setCustomShippingRates([
      ...customShippingRates,
      { id: "custom_ship_" + Date.now(), title: "طريقة شحن مخصصة #" + nextIdx, cost: "40" }
    ]);
  };

  const removeCustomShippingRate = (id: string) => {
    setCustomShippingRates(customShippingRates.filter((s) => s.id !== id));
  };

  const toggleLanguage = (code: string) => {
    if (selectedLanguages.includes(code)) {
      if (selectedLanguages.length > 1) setSelectedLanguages(selectedLanguages.filter((l) => l !== code));
    } else {
      setSelectedLanguages([...selectedLanguages, code]);
    }
  };

  // ====== GENERATE PHP SUITE CODE WITH FULL WP-ADMIN DASHBOARD & AI ENGINE ======
  const generateSuitePhpCode = (pluginName: string = "TeleWoo Ultimate Suite", customPromptText: string = "") => {
    const esc = (s: string) => (s || "").replace(/'/g, "\\'");
    const safeName = esc(pluginName);

    let php = "<?php\n";
    php += "/**\n";
    php += " * Plugin Name: ' + safeName + '\n";
    php += " * Description: إضافة موحدة ومطورة تعتمد على مصفوفة التبويبات الـ 13 مع لوحة تحكم كاملة ومحرك Gemini AI أونلاين.\n";
    php += " * Version: 6.0.0\n";
    php += " * Author: TeleWoo Studio Engine\n";
    php += " */\n\n";
    php += "if (!defined('ABSPATH')) exit;\n\n";

    // 1. WP-ADMIN MENU & SETTINGS PANEL
    php += "// ==================== 1. WP-ADMIN MENU & SETTINGS PANEL ====================\n";
    php += "add_action('admin_menu', function() {\n";
    php += "  add_menu_page('' + safeName + '', '' + safeName + ' ⚡', 'manage_options', 'telewoo-suite-settings', 'telewoo_suite_render_admin_page', 'dashicons-superhero', 56);\n";
    php += "});\n\n";

    php += "function telewoo_suite_render_admin_page() {\n";
    php += "  if (isset($_POST['telewoo_save_settings'])) {\n";
    php += "    update_option('telewoo_gemini_key', sanitize_text_field($_POST['telewoo_gemini_key']));\n";
    php += "    update_option('telewoo_opt_instapay', isset($_POST['telewoo_opt_instapay']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_instapay_title', sanitize_text_field($_POST['telewoo_instapay_title']));\n";
    php += "    update_option('telewoo_instapay_handle', sanitize_text_field($_POST['telewoo_instapay_handle']));\n";
    php += "    update_option('telewoo_opt_vodafone', isset($_POST['telewoo_opt_vodafone']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_vodafone_number', sanitize_text_field($_POST['telewoo_vodafone_number']));\n";
    php += "    update_option('telewoo_opt_bank', isset($_POST['telewoo_opt_bank']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_bank_iban', sanitize_text_field($_POST['telewoo_bank_iban']));\n";
    php += "    update_option('telewoo_opt_express', isset($_POST['telewoo_opt_express']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_express_price', sanitize_text_field($_POST['telewoo_express_price']));\n";
    php += "    update_option('telewoo_opt_lang', isset($_POST['telewoo_opt_lang']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_opt_whatsapp', isset($_POST['telewoo_opt_whatsapp']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_whatsapp_number', sanitize_text_field($_POST['telewoo_whatsapp_number']));\n";
    php += "    update_option('telewoo_opt_sticky', isset($_POST['telewoo_opt_sticky']) ? 'yes' : 'no');\n";
    php += "    update_option('telewoo_sticky_text', sanitize_text_field($_POST['telewoo_sticky_text']));\n";
    php += "    update_option('telewoo_opt_norightclick', isset($_POST['telewoo_opt_norightclick']) ? 'yes' : 'no');\n";
    php += "    if (isset($_POST['telewoo_custom_css'])) update_option('telewoo_ai_css', wp_unslash($_POST['telewoo_custom_css']));\n";
    php += "    if (isset($_POST['telewoo_custom_js'])) update_option('telewoo_ai_js', wp_unslash($_POST['telewoo_custom_js']));\n";
    php += "    echo '<div class=\\'updated notice is-dismissible\\'><p><strong>✅ تم حفظ كافة الإعدادات وخيارات التفعيل بنجاح داخل وردبريس!</strong></p></div>';\n";
    php += "  }\n";
    php += "  $gemini_key = get_option('telewoo_gemini_key', '');\n";
    php += "  $ai_css = get_option('telewoo_ai_css', '');\n";
    php += "  $ai_js = get_option('telewoo_ai_js', '');\n";
    php += "  ?>\n";
    php += "  <div class='wrap' dir='rtl' style='font-family:tahoma,sans-serif;max-width:1100px;margin-top:20px;'>\n";
    php += "    <div style='background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:20px 25px;border-radius:12px;margin-bottom:20px;box-shadow:0 10px 25px rgba(0,0,0,0.3);'>\n";
    php += "      <h1 style='color:#fff;margin:0 0 8px 0;font-size:24px;'>⚡ لوحة تحكم ' + safeName + ' الإدارية</h1>\n";
    php += "      <p style='margin:0;opacity:0.9;font-size:14px;'>تحكم كامل بتفعيل وتعطيل كافة المزايا، إضافة بوابات الدفع والشحن، والحقن التلقائي المباشر بالذكاء الاصطناعي من داخل وردبريس.</p>\n";
    php += "    </div>\n";
    php += "    <form method='post' action=''>\n";
    php += "      <div style='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,0.05);'>\n";
    php += "        <h3 style='margin-top:0;color:#1e293b;border-bottom:2px solid #6366f1;padding-bottom:8px;'>🤖 محرك الحقن المباشر بالذكاء الاصطناعي (AI Live Generator)</h3>\n";
    php += "        <table class='form-table'>\n";
    php += "          <tr><th><label>مفتاح Gemini API Key:</label></th><td><input type='text' name='telewoo_gemini_key' value='<?php echo esc_attr($gemini_key); ?>' class='regular-text' placeholder='AIzaSy...' /></td></tr>\n";
    php += "          <tr><th><label>كود CSS المخصص المحقون:</label></th><td><textarea name='telewoo_custom_css' class='large-text code' rows='5'><?php echo esc_textarea($ai_css); ?></textarea></td></tr>\n";
    php += "          <tr><th><label>كود JS المخصص المحقون:</label></th><td><textarea name='telewoo_custom_js' class='large-text code' rows='5'><?php echo esc_textarea($ai_js); ?></textarea></td></tr>\n";
    php += "        </table>\n";
    php += "      </div>\n";
    php += "      <div style='background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,0.05);'>\n";
    php += "        <h3 style='margin-top:0;color:#1e293b;border-bottom:2px solid #10b981;padding-bottom:8px;'>💳 مصفوفة بوابات الدفع وطرق الشحن والتفعيل</h3>\n";
    php += "        <table class='form-table'>\n";
    php += "          <tr><th><label>تفعيل إنستا باي (InstaPay):</label></th><td><input type='checkbox' name='telewoo_opt_instapay' value='yes' <?php checked(get_option('telewoo_opt_instapay', '' + (enableInstaPay ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل البوابة</strong><br><br><input type='text' name='telewoo_instapay_title' value='<?php echo esc_attr(get_option('telewoo_instapay_title', '' + esc(instapayTitle) + '')); ?>' class='regular-text' placeholder='عنوان البوابة' /><br><input type='text' name='telewoo_instapay_handle' value='<?php echo esc_attr(get_option('telewoo_instapay_handle', '' + esc(instapayHandle) + '')); ?>' class='regular-text' placeholder='معرف InstaPay Handle' /></td></tr>\n";
    php += "          <tr><th><label>تفعيل فودافون كاش:</label></th><td><input type='checkbox' name='telewoo_opt_vodafone' value='yes' <?php checked(get_option('telewoo_opt_vodafone', '' + (enableMobileWallets ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل المحافظ</strong><br><br><input type='text' name='telewoo_vodafone_number' value='<?php echo esc_attr(get_option('telewoo_vodafone_number', '' + esc(vodafoneNumber) + '')); ?>' class='regular-text' placeholder='رقم المحفظة' /></td></tr>\n";
    php += "          <tr><th><label>تفعيل التحويل البنكي:</label></th><td><input type='checkbox' name='telewoo_opt_bank' value='yes' <?php checked(get_option('telewoo_opt_bank', '' + (enableBankTransfer ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل التحويل البنكي</strong><br><br><input type='text' name='telewoo_bank_iban' value='<?php echo esc_attr(get_option('telewoo_bank_iban', '' + esc(bankIban) + '')); ?>' class='regular-text' placeholder='رقم الايبان IBAN' /></td></tr>\n";
    php += "          <tr><th><label>تفعيل الشحن السريع:</label></th><td><input type='checkbox' name='telewoo_opt_express' value='yes' <?php checked(get_option('telewoo_opt_express', '' + (enableExpressShipping ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل الشحن السريع</strong><br><br><input type='text' name='telewoo_express_price' value='<?php echo esc_attr(get_option('telewoo_express_price', '' + esc(expressPrice) + '')); ?>' class='small-text' /> <strong>جنيه</strong></td></tr>\n";
    php += "          <tr><th><label>مغير اللغات بأعلام الدول:</label></th><td><input type='checkbox' name='telewoo_opt_lang' value='yes' <?php checked(get_option('telewoo_opt_lang', '' + (enableMultiLanguage ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>إظهار مغير اللغات العائم</strong></td></tr>\n";
    php += "          <tr><th><label>زر الواتساب العائم:</label></th><td><input type='checkbox' name='telewoo_opt_whatsapp' value='yes' <?php checked(get_option('telewoo_opt_whatsapp', '' + (enableWhatsappFloat ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل زر الواتساب</strong><br><br><input type='text' name='telewoo_whatsapp_number' value='<?php echo esc_attr(get_option('telewoo_whatsapp_number', '' + esc(whatsappFloatNumber) + '')); ?>' class='regular-text' /></td></tr>\n";
    php += "          <tr><th><label>شريط الموبايل الثابت:</label></th><td><input type='checkbox' name='telewoo_opt_sticky' value='yes' <?php checked(get_option('telewoo_opt_sticky', '' + (enableStickyMobileBar ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل شريط الموبايل</strong><br><br><input type='text' name='telewoo_sticky_text' value='<?php echo esc_attr(get_option('telewoo_sticky_text', '' + esc(stickyBarText) + '')); ?>' class='regular-text' /></td></tr>\n";
    php += "          <tr><th><label>حماية الكود ومنع كليك يمين:</label></th><td><input type='checkbox' name='telewoo_opt_norightclick' value='yes' <?php checked(get_option('telewoo_opt_norightclick', '' + (disableRightClick ? 'yes' : 'no') + ''), 'yes'); ?> /> <strong>تفعيل الحماية</strong></td></tr>\n";
    php += "        </table>\n";
    php += "      </div>\n";
    php += "      <p class='submit'><input type='submit' name='telewoo_save_settings' class='button-primary button-hero' value='💾 حفظ وتطبيق كافة الإعدادات أونلاين' /></p>\n";
    php += "    </form>\n";
    php += "  </div>\n";
    php += "  <?php\n";
    php += "}\n\n";

    // 2. WOOCOMMERCE PAYMENT GATEWAYS
    php += "// ==================== 2. WOOCOMMERCE PAYMENT GATEWAYS ====================\n";
    php += "add_action('plugins_loaded', function() {\n";
    php += "  if (!class_exists('WC_Payment_Gateway')) return;\n\n";

    php += "  class WC_Gateway_TeleWoo_InstaPay extends WC_Payment_Gateway {\n";
    php += "    public function __construct() {\n";
    php += "      $this->id = 'telewoo_instapay'; $this->icon = ''; $this->has_fields = false;\n";
    php += "      $this->method_title = 'إنستا باي (InstaPay)'; $this->method_description = 'الدفع الفوري المباشر عبر تطبيق InstaPay';\n";
    php += "      $this->title = get_option('telewoo_instapay_title', '' + esc(instapayTitle) + '');\n";
    php += "      $handle = get_option('telewoo_instapay_handle', '' + esc(instapayHandle) + '');\n";
    php += "      $this->description = '⚡ معرف InstaPay: <code>' . esc_html($handle) . '</code><br><br>' + esc(instapayInstructions) + '';\n";
    php += "      $this->supports = array('products'); $this->init_form_fields(); $this->init_settings();\n";
    php += "      $this->enabled = get_option('telewoo_opt_instapay', '' + (enableInstaPay ? 'yes' : 'no') + '');\n";
    php += "    }\n";
    php += "    public function is_available() { return get_option('telewoo_opt_instapay', '' + (enableInstaPay ? 'yes' : 'no') + '') === 'yes'; }\n";
    php += "    public function process_payment($order_id) {\n";
    php += "      $order = wc_get_order($order_id); $order->update_status('on-hold', 'بانتظار تحويل InstaPay');\n";
    php += "      WC()->cart->empty_cart(); return array('result' => 'success', 'redirect' => $this->get_return_url($order));\n";
    php += "    }\n";
    php += "  }\n\n";

    php += "  class WC_Gateway_TeleWoo_Vodafone extends WC_Payment_Gateway {\n";
    php += "    public function __construct() {\n";
    php += "      $this->id = 'telewoo_vodafone'; $this->icon = ''; $this->has_fields = false;\n";
    php += "      $this->method_title = 'فودافون كاش / المحافظ'; $this->method_description = 'الدفع الإلكتروني عبر المحافظ';\n";
    php += "      $this->title = '' + esc(walletsTitle) + '';\n";
    php += "      $voda = get_option('telewoo_vodafone_number', '' + esc(vodafoneNumber) + '');\n";
    php += "      $this->description = '📱 رقم المحفظة: <code>' . esc_html($voda) . '</code><br><br>' + esc(walletsInstructions) + '';\n";
    php += "      $this->supports = array('products'); $this->init_form_fields(); $this->init_settings();\n";
    php += "      $this->enabled = get_option('telewoo_opt_vodafone', '' + (enableMobileWallets ? 'yes' : 'no') + '');\n";
    php += "    }\n";
    php += "    public function is_available() { return get_option('telewoo_opt_vodafone', '' + (enableMobileWallets ? 'yes' : 'no') + '') === 'yes'; }\n";
    php += "    public function process_payment($order_id) {\n";
    php += "      $order = wc_get_order($order_id); $order->update_status('on-hold', 'بانتظار تحويل فودافون كاش');\n";
    php += "      WC()->cart->empty_cart(); return array('result' => 'success', 'redirect' => $this->get_return_url($order));\n";
    php += "    }\n";
    php += "  }\n\n";

    php += "  class WC_Gateway_TeleWoo_Bank extends WC_Payment_Gateway {\n";
    php += "    public function __construct() {\n";
    php += "      $this->id = 'telewoo_bank'; $this->icon = ''; $this->has_fields = false;\n";
    php += "      $this->method_title = 'التحويل البنكي المباشر';\n";
    php += "      $this->title = '' + esc(bankTitle) + '';\n";
    php += "      $iban = get_option('telewoo_bank_iban', '' + esc(bankIban) + '');\n";
    php += "      $this->description = '🏦 رقم الايبان (IBAN): <code>' . esc_html($iban) . '</code><br><br>' + esc(bankInstructions) + '';\n";
    php += "      $this->supports = array('products'); $this->init_form_fields(); $this->init_settings();\n";
    php += "      $this->enabled = get_option('telewoo_opt_bank', '' + (enableBankTransfer ? 'yes' : 'no') + '');\n";
    php += "    }\n";
    php += "    public function is_available() { return get_option('telewoo_opt_bank', '' + (enableBankTransfer ? 'yes' : 'no') + '') === 'yes'; }\n";
    php += "    public function process_payment($order_id) {\n";
    php += "      $order = wc_get_order($order_id); $order->update_status('on-hold', 'بانتظار التحويل البنكي');\n";
    php += "      WC()->cart->empty_cart(); return array('result' => 'success', 'redirect' => $this->get_return_url($order));\n";
    php += "    }\n";
    php += "  }\n\n";

    customGateways.forEach((cg) => {
      const className = "WC_Gateway_" + cg.id;
      php += "  class ' + className + ' extends WC_Payment_Gateway {\n";
      php += "    public function __construct() {\n";
      php += "      $this->id = '' + cg.id + ''; $this->method_title = '' + esc(cg.title) + '';\n";
      php += "      $this->title = '' + esc(cg.title) + ''; $this->has_fields = false;\n";
      php += "      $this->description = '💳 الحساب/الرقم: <code>' + esc(cg.account) + '</code><br><br>' + esc(cg.instructions) + '';\n";
      php += "      $this->supports = array('products'); $this->init_form_fields(); $this->init_settings(); $this->enabled = 'yes';\n";
      php += "    }\n";
      php += "    public function is_available() { return true; }\n";
      php += "    public function process_payment($order_id) {\n";
      php += "      $order = wc_get_order($order_id); $order->update_status('on-hold', 'بانتظار التحويل');\n";
      php += "      WC()->cart->empty_cart(); return array('result' => 'success', 'redirect' => $this->get_return_url($order));\n";
      php += "    }\n";
      php += "  }\n\n";
    });

    php += "  add_filter('woocommerce_payment_gateways', function($methods) {\n";
    php += "    $methods[] = 'WC_Gateway_TeleWoo_InstaPay';\n";
    php += "    $methods[] = 'WC_Gateway_TeleWoo_Vodafone';\n";
    php += "    $methods[] = 'WC_Gateway_TeleWoo_Bank';\n";
    customGateways.forEach((cg) => { php += "    $methods[] = 'WC_Gateway_' + cg.id + '';\n"; });
    php += "    return $methods;\n";
    php += "  });\n";
    php += "}, 20);\n\n";

    // 3. WOOCOMMERCE SHIPPING METHODS
    php += "// ==================== 3. WOOCOMMERCE SHIPPING METHODS ====================\n";
    php += "add_action('woocommerce_shipping_init', function() {\n";
    php += "  if (!class_exists('WC_Shipping_Method')) return;\n";
    php += "  class WC_TeleWoo_Express_Shipping extends WC_Shipping_Method {\n";
    php += "    public function __construct() {\n";
    php += "      $this->id = 'telewoo_express'; $this->title = get_option('telewoo_express_title', '' + esc(expressTitle) + '');\n";
    php += "      $this->method_title = 'الشحن السريع TeleWoo'; $this->enabled = get_option('telewoo_opt_express', '' + (enableExpressShipping ? 'yes' : 'no') + '');\n";
    php += "    }\n";
    php += "    public function calculate_shipping($package = array()) {\n";
    php += "      $cost = (float) get_option('telewoo_express_price', ' + (parseFloat(expressPrice) || 0) + ');\n";
    php += "      $this->add_rate(array('id' => $this->id, 'label' => $this->title, 'cost' => $cost));\n";
    php += "    }\n";
    php += "  }\n";

    customShippingRates.forEach((cs) => {
      const className = "WC_Shipping_" + cs.id;
      php += "  class ' + className + ' extends WC_Shipping_Method {\n";
      php += "    public function __construct() {\n";
      php += "      $this->id = '' + cs.id + ''; $this->title = '' + esc(cs.title) + '';\n";
      php += "      $this->method_title = '' + esc(cs.title) + ''; $this->enabled = 'yes';\n";
      php += "    }\n";
      php += "    public function calculate_shipping($package = array()) {\n";
      php += "      $this->add_rate(array('id' => $this->id, 'label' => $this->title, 'cost' => ' + (parseFloat(cs.cost) || 0) + '));\n";
      php += "    }\n";
      php += "  }\n";
    });

    php += "});\n";

    php += "add_filter('woocommerce_shipping_methods', function($m) {\n";
    php += "  $m['telewoo_express'] = 'WC_TeleWoo_Express_Shipping';\n";
    customShippingRates.forEach((cs) => { php += "  $m['' + cs.id + ''] = 'WC_Shipping_' + cs.id + '';\n"; });
    php += "  return $m;\n";
    php += "});\n\n";

    // 4. REST API ENDPOINTS
    if (enableRestApiEndpoint) {
      php += "// ==================== 4. REST API ENDPOINTS ====================\n";
      php += "add_action('rest_api_init', function() {\n";
      php += "  register_rest_route('telewoo/v1', '/info', array(\n";
      php += "    'methods' => 'GET',\n";
      php += "    'callback' => function() {\n";
      php += "      return new WP_REST_Response(array(\n";
      php += "        'status' => 'active',\n";
      php += "        'plugin' => '' + safeName + '',\n";
      php += "        'version' => '6.0.0',\n";
      php += "        'gateways' => array('instapay', 'vodafone', 'bank'),\n";
      php += "      ), 200);\n";
      php += "    },\n";
      php += "    'permission_callback' => '__return_true',\n";
      php += "  ));\n";
      php += "});\n\n";
    }

    // 5. FRONT-END ASSETS INJECTION (CSS & JS & MODULES)
    php += "// ==================== 5. FRONT-END ASSETS INJECTION ====================\n";
    php += "add_action('wp_head', function() {\n";
    php += "  $css = get_option('telewoo_ai_css', '');\n";
    php += "  if ($css) echo '<style id='telewoo-ai-css'>' . $css . '</style>';\n";
    php += "});\n\n";

    php += "add_action('wp_footer', function() {\n";
    php += "  $js = get_option('telewoo_ai_js', '');\n";
    php += "  if ($js) echo '<script id='telewoo-ai-js'>' . $js . '</script>';\n";

    if (enableMultiLanguage && selectedLanguages.length > 0) {
      php += "  if (get_option('telewoo_opt_lang', 'yes') === 'yes') {\n";
      php += "    ?>\n";
      php += "    <div id='telewoo-lang-switcher' style='position:fixed;bottom:20px;right:20px;z-index:999999;background:#0f172a;border:1px solid #334155;padding:8px 14px;border-radius:30px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 25px rgba(0,0,0,0.5);'>\n";
      selectedLanguages.forEach((code) => {
        const langObj = AVAILABLE_LANGUAGES.find((l) => l.code === code);
        if (langObj) {
          php += "      <button onclick='document.documentElement.lang='' + code + '';document.documentElement.dir='' + (langObj.rtl ? 'rtl' : 'ltr') + '';' style='background:transparent;border:none;cursor:pointer;font-size:18px;' title='' + langObj.name + ''>' + langObj.flag + '</button>\n";
        }
      });
      php += "    </div>\n";
      php += "    <?php\n";
      php += "  }\n";
    }

    if (enableWhatsappFloat) {
      php += "  if (get_option('telewoo_opt_whatsapp', 'yes') === 'yes') {\n";
      php += "    $wa = get_option('telewoo_whatsapp_number', '' + esc(whatsappFloatNumber) + '');\n";
      php += "    ?>\n";
      php += "    <a href='https://wa.me/' + whatsappFloatNumber.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(whatsappFloatMsg) + '' target='_blank' style='position:fixed;bottom:20px;left:20px;z-index:999999;background:#25d366;color:#fff;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.25);font-size:28px;text-decoration:none;'>💬</a>\n";
      php += "    <?php\n";
      php += "  }\n";
    }

    if (enableStickyMobileBar) {
      php += "  if (get_option('telewoo_opt_sticky', 'yes') === 'yes') {\n";
      php += "    $st = get_option('telewoo_sticky_text', '' + esc(stickyBarText) + '');\n";
      php += "    ?>\n";
      php += "    <div style='position:fixed;bottom:0;left:0;right:0;z-index:999990;background:#1e293b;color:#fff;padding:12px;text-align:center;font-weight:bold;display:flex;align-items:center;justify-content:space-between;'>' + esc(stickyBarText) + ' <a href='/checkout' style='background:#10b981;color:#fff;padding:6px 16px;border-radius:6px;text-decoration:none;'>طلب سريع 🛒</a></div>\n";
      php += "    <?php\n";
      php += "  }\n";
    }

    if (disableRightClick) {
      php += "  if (get_option('telewoo_opt_norightclick', 'yes') === 'yes') {\n";
      php += "    echo '<script>document.addEventListener(\'contextmenu\',function(e){e.preventDefault();});</script>';\n";
      php += "  }\n";
    }

    php += "});\n\n";

    if (customPromptText) {
      php += "// ==================== AI CUSTOM PROMPT INSTRUCTION ====================\n";
      php += "// Instruction: ' + esc(customPromptText) + '\n\n";
    }

    return php;
  };

  // ====== HANDLE GENERATE AND AUTO-UPDATE ======
  const handleGenerateAndDeploy = async (autoDeploy = false, targetBasePlugin: any = null) => {
    if (autoDeploy) setAutoDeploying(true);
    else setGenerating(true);

    try {
      const pluginTitle = targetBasePlugin ? targetBasePlugin.name : "TeleWoo Ultimate 13-Tab Suite";
      const customPhp = generateSuitePhpCode(pluginTitle, prompt);
      
      let matrixSummary = "مصفوفة تفعيل المزايا الـ 13 المحددة:\n";
      matrixSummary += "- InstaPay: " + (enableInstaPay ? "مفعل (" + instapayTitle + ")" : "معطل") + "\n";
      matrixSummary += "- فودافون كاش والمحافظ: " + (enableMobileWallets ? "مفعل (" + walletsTitle + ")" : "معطل") + "\n";
      matrixSummary += "- التحويل البنكي: " + (enableBankTransfer ? "مفعل (" + bankTitle + ")" : "معطل") + "\n";
      matrixSummary += "- الشحن السريع: " + (enableExpressShipping ? "مفعل (" + expressTitle + ")" : "معطل") + "\n";
      matrixSummary += "- مغير اللغات بأعلام الدول: " + (enableMultiLanguage ? "مفعل (" + selectedLanguages.join(", ") + ")" : "معطل") + "\n";
      matrixSummary += "- زر الواتساب العائم: " + (enableWhatsappFloat ? "مفعل (" + whatsappFloatNumber + ")" : "معطل") + "\n";
      matrixSummary += "- شريط الموبايل الثابت: " + (enableStickyMobileBar ? "مفعل" : "معطل") + "\n";
      matrixSummary += "- حماية عدم النسخ وكليك يمين: " + (disableRightClick ? "مفعل" : "معطل") + "\n";
      matrixSummary += "- نقطة REST API: " + (enableRestApiEndpoint ? "مفعل" : "معطل") + "\n";

      const activePrompt = "أنشئ ووحد إضافة WooCommerce شاملة ومحترفة تعمل كـ Plugin قياسي كامل.\n" + matrixSummary + "\nتوجيهات إضافية:\n" + (prompt.trim() || "اعتمد كافة المزايا المحددة بالإعدادات وتأكد من إنشاء لوحة تحكم سريعة.");

      const bodyPayload: any = {
        prompt: activePrompt,
        context: "WooCommerce Arabic RTL Suite Engine",
        extra_php: customPhp,
      };

      if (targetBasePlugin?.id) {
        bodyPayload.base_plugin_id = targetBasePlugin.id;
      }

      const r: any = await invokeFn("wp-plugin-builder", bodyPayload);

      await loadPlugins();

      if (autoDeploy && r?.zip_base64) {
        toast({ title: "🚀 جاري إصدار وتثبيت التحديث أونلاين على متجرك..." });
        const { data: injData, error: injErr } = await supabase.functions.invoke("wp-studio-inject", {
          body: {
            action: "install_zip",
            type: "plugin",
            zip_b64: r.zip_base64,
            activate: true,
          }
        });

        if (injErr || (injData && !injData.ok)) {
          const msg = injData?.error || injErr?.message || "تعذر التحديث التلقائي للموقع";
          toast({ title: "تنبيه التحديث التلقائي", description: msg + " — جاري التنزيل اليدوي...", variant: "destructive" });
          downloadResult(r);
        } else {
          toast({
            title: "⚡ تم إصدار وتثبيت تحديث " + r.name + " v" + r.version + " تلقائياً على متجرك!",
            description: "تم دمج كافة البوابات وطرق الشحن ومغير اللغات ولوحة الإدارة بنجاح."
          });
        }
      } else {
        toast({ title: "تم بناء الإضافة " + r.name + " v" + r.version + " بنجاح!", description: r.changelog });
        downloadResult(r);
      }
    } catch (e: any) {
      toast({ title: "فشل التوليد والتحديث", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setAutoDeploying(false);
    }
  };

  // ====== HANDLE UPDATE EXISTING PLUGIN WITH AI PROMPT ======
  const handleUpdatePluginWithAI = async (plugin: any) => {
    if (!editPrompt.trim()) {
      toast({ title: "الرجاء إدخال وصف التعديل المطلوب بالذكاء الاصطناعي", variant: "destructive" });
      return;
    }
    setUpdatingPlugin(true);
    try {
      const customPhp = generateSuitePhpCode(plugin.name, editPrompt);
      const r: any = await invokeFn("wp-plugin-builder", {
        prompt: editPrompt,
        base_plugin_id: plugin.id,
        context: "Update existing WordPress plugin with AI instructions",
        extra_php: customPhp,
      });

      await loadPlugins();

      toast({ title: "🚀 تم تحديث الإضافة " + r.name + " للنسخة v" + r.version + " بالذكاء الاصطناعي!" });

      if (r?.zip_base64) {
        downloadResult(r);
      }
      setEditModalPlugin(null);
      setEditPrompt("");
    } catch (e: any) {
      toast({ title: "فشل تحديث الإضافة", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingPlugin(false);
    }
  };

  // ====== DELETE PLUGIN ======
  const handleDeletePlugin = async (pluginId: string) => {
    try {
      await supabase.from("wp_plugins").delete().eq("id", pluginId);
      toast({ title: "تم حذف الإضافة بنجاح" });
      await loadPlugins();
    } catch (e: any) {
      toast({ title: "فشل حذف الإضافة", description: e.message, variant: "destructive" });
    }
  };

  const openCodeModal = async (plugin: any) => {
    setViewCodePlugin(plugin);
    setLoadingCode(true);
    try {
      const { data: latestVer } = await supabase
        .from("wp_plugin_versions")
        .select("*")
        .eq("plugin_id", plugin.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestVer?.php_code) {
        setViewingPhpCode(latestVer.php_code);
      } else {
        setViewingPhpCode("<?php\n/**\n * Plugin Name: " + plugin.name + "\n * Description: " + (plugin.description || "") + "\n * Version: " + plugin.current_version + "\n */\n\nif (!defined('ABSPATH')) exit;\n");
      }
    } catch (e: any) {
      setViewingPhpCode("<?php\n// " + plugin.name + " v" + plugin.current_version + "\n");
    } finally {
      setLoadingCode(false);
    }
  };

  const downloadResult = (r: any) => {
    if (!r?.zip_base64) return;
    const blob = b64ToBlob(r.zip_base64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.zip_filename || ((r.slug || "telewoo-plugin") + "-" + (r.version || "1.0.0") + ".zip");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* HEADER BANNER */}
      <Card className="bg-gradient-to-l from-indigo-900/40 via-purple-900/20 to-slate-900 border-indigo-500/30 text-white shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Package className="w-7 h-7 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-black bg-gradient-to-l from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  منصة بناء وتحديث إضافات وردبريس التفاعلية (13-Tab Suite & AI Platform)
                </h2>
              </div>
              <p className="text-sm text-indigo-200/80 max-w-3xl">
                بناء إضافات WordPress كاملة ومستقلة تعتمد على محتوى وتعديلات الـ 13 تاب! مع تفعيل وتعطيل المزايا، توليد لوحة تحكم داخل وردبريس، وإمكانية تعديل وتحديث الإضافة بالذكاء الاصطناعي دون إعادتها من الصفر.
              </p>
            </div>
            <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-400/40 px-3 py-1.5 text-xs font-bold gap-1.5 shadow">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> تحديث أونلاين 1-Click Auto Update
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 13-TAB INTERACTIVE MATRIX FEATURE SELECTORS */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <CardTitle className="text-lg font-bold text-white">مصفوفة اختيار ميزات التبويبات الـ 13 للـ Plugin</CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs">
            حدد الميزات التي ترغب بتضمينها في الإضافة المنشأة. كل ميزة مفعلة ستعمل وتظهر خياراتها تلقائياً داخل صفحة إعدادات الإضافة بوردبريس.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Accordion type="multiple" defaultValue={["gateways", "shipping", "lang", "sales", "security", "api"]} className="w-full space-y-2">
            
            {/* 1. PAYMENT GATEWAYS */}
            <AccordionItem value="gateways" className="border border-slate-800 rounded-lg bg-slate-950/60 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                  <CreditCard className="w-5 h-5" /> 💳 1. بوابات الدفع التفاعلية والمخصصة
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4 text-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* InstaPay */}
                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-amber-400 flex items-center gap-1.5">⚡ إنستا باي (InstaPay)</Label>
                      <Switch checked={enableInstaPay} onCheckedChange={setEnableInstaPay} />
                    </div>
                    {enableInstaPay && (
                      <div className="space-y-2 pt-1">
                        <Input value={instapayTitle} onChange={(e) => setInstapayTitle(e.target.value)} placeholder="عنوان البوابة" className="bg-slate-950 text-xs border-slate-800" />
                        <Input value={instapayHandle} onChange={(e) => setInstapayHandle(e.target.value)} placeholder="معرف InstaPay Handle" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                        <Textarea value={instapayInstructions} onChange={(e) => setInstapayInstructions(e.target.value)} placeholder="تعليمات التحويل" className="bg-slate-950 text-xs border-slate-800 h-16" />
                      </div>
                    )}
                  </div>

                  {/* Vodafone Cash */}
                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-rose-400 flex items-center gap-1.5">📱 المحافظ الإلكترونية / فودافون كاش</Label>
                      <Switch checked={enableMobileWallets} onCheckedChange={setEnableMobileWallets} />
                    </div>
                    {enableMobileWallets && (
                      <div className="space-y-2 pt-1">
                        <Input value={walletsTitle} onChange={(e) => setWalletsTitle(e.target.value)} placeholder="عنوان البوابة" className="bg-slate-950 text-xs border-slate-800" />
                        <Input value={vodafoneNumber} onChange={(e) => setVodafoneNumber(e.target.value)} placeholder="رقم المحفظة" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                        <Textarea value={walletsInstructions} onChange={(e) => setWalletsInstructions(e.target.value)} placeholder="تعليمات التحويل" className="bg-slate-950 text-xs border-slate-800 h-16" />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Custom Gateways List */}
                  {customGateways.map((cg, idx) => (
                    <div key={cg.id} className="p-3 border border-indigo-500/40 rounded-lg bg-indigo-950/20 space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-indigo-300 flex items-center gap-1.5">💳 بوابة دفع مخصصة جديدة #{idx + 1}</Label>
                        <Button size="sm" variant="ghost" onClick={() => removeCustomGateway(cg.id)} className="h-7 text-xs text-rose-400 hover:bg-rose-950/50">
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        <Input value={cg.title} onChange={(e) => {
                          const updated = [...customGateways];
                          updated[idx].title = e.target.value;
                          setCustomGateways(updated);
                        }} placeholder="اسم البوابة المخصصة" className="bg-slate-950 text-xs border-slate-800" />
                        <Input value={cg.account} onChange={(e) => {
                          const updated = [...customGateways];
                          updated[idx].account = e.target.value;
                          setCustomGateways(updated);
                        }} placeholder="رقم الحساب / المحفظة" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                        <Textarea value={cg.instructions} onChange={(e) => {
                          const updated = [...customGateways];
                          updated[idx].instructions = e.target.value;
                          setCustomGateways(updated);
                        }} placeholder="تعليمات وتفاصيل التحويل والدفع..." className="bg-slate-950 text-xs border-slate-800 h-16 md:col-span-2" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button size="sm" onClick={addCustomGateway} variant="outline" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/50 text-xs font-bold gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-400" /> ➕ إضافة بوابة دفع مخصصة جديدة
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. SHIPPING METHODS */}
            <AccordionItem value="shipping" className="border border-slate-800 rounded-lg bg-slate-950/60 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <Truck className="w-5 h-5" /> 🚚 2. طرق الشحن المخصصة والديناميكية
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4 text-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-emerald-400">الشحن السريع (Express Shipping)</Label>
                      <Switch checked={enableExpressShipping} onCheckedChange={setEnableExpressShipping} />
                    </div>
                    {enableExpressShipping && (
                      <div className="space-y-2 pt-1">
                        <Input value={expressTitle} onChange={(e) => setExpressTitle(e.target.value)} placeholder="عنوان طريقة الشحن" className="bg-slate-950 text-xs border-slate-800" />
                        <Input value={expressPrice} onChange={(e) => setExpressPrice(e.target.value)} placeholder="تكلفة الشحن" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                      </div>
                    )}
                  </div>

                  {customShippingRates.map((cs, idx) => (
                    <div key={cs.id} className="p-3 border border-emerald-500/40 rounded-lg bg-emerald-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-emerald-300">طريقة شحن مخصصة جديدة #{idx + 1}</Label>
                        <Button size="sm" variant="ghost" onClick={() => removeCustomShippingRate(cs.id)} className="h-7 text-xs text-rose-400 hover:bg-rose-950/50">
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </Button>
                      </div>
                      <div className="space-y-2 pt-1">
                        <Input value={cs.title} onChange={(e) => {
                          const updated = [...customShippingRates];
                          updated[idx].title = e.target.value;
                          setCustomShippingRates(updated);
                        }} placeholder="عنوان طريقة الشحن" className="bg-slate-950 text-xs border-slate-800" />
                        <Input value={cs.cost} onChange={(e) => {
                          const updated = [...customShippingRates];
                          updated[idx].cost = e.target.value;
                          setCustomShippingRates(updated);
                        }} placeholder="التكلفة" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button size="sm" onClick={addCustomShippingRate} variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 text-xs font-bold gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-400" /> ➕ إضافة طريقة شحن مخصصة جديدة
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. MULTI-LANGUAGE SWITCHER */}
            <AccordionItem value="lang" className="border border-slate-800 rounded-lg bg-slate-950/60 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                  <Globe className="w-5 h-5" /> 🌐 3. مغير اللغات بأعلام الدول (Multi-Language Switcher)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4 text-slate-200">
                <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-cyan-300">تفعيل مغير اللغات بأعلام الدول في الواجهة</Label>
                    <Switch checked={enableMultiLanguage} onCheckedChange={setEnableMultiLanguage} />
                  </div>
                  {enableMultiLanguage && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-bold text-slate-300 block">اختر اللغات المتاحة للتبديل:</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_LANGUAGES.map((l) => {
                          const isActive = selectedLanguages.includes(l.code);
                          return (
                            <button
                              key={l.code}
                              onClick={() => toggleLanguage(l.code)}
                              className={"flex items-center justify-between p-2 rounded text-xs font-bold border transition " + (
                                isActive ? "bg-cyan-950/60 border-cyan-500 text-cyan-200" : "bg-slate-950 border-slate-800 text-slate-400"
                              )}
                            >
                              <span>{l.flag} {l.name}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. SALES & MARKETING & SECURITY */}
            <AccordionItem value="sales" className="border border-slate-800 rounded-lg bg-slate-950/60 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                  <Sparkles className="w-5 h-5" /> 🚀 4. ميزات التسويق والواتساب والحماية
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4 text-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-green-400">💬 زر الواتساب العائم للتواصل</Label>
                      <Switch checked={enableWhatsappFloat} onCheckedChange={setEnableWhatsappFloat} />
                    </div>
                    {enableWhatsappFloat && (
                      <div className="space-y-2 pt-1">
                        <Input value={whatsappFloatNumber} onChange={(e) => setWhatsappFloatNumber(e.target.value)} placeholder="رقم الواتساب" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                      </div>
                    )}
                  </div>

                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-rose-400">📱 شريط الموبايل الثابت لطلب سريع</Label>
                      <Switch checked={enableStickyMobileBar} onCheckedChange={setEnableStickyMobileBar} />
                    </div>
                    {enableStickyMobileBar && (
                      <div className="pt-1">
                        <Input value={stickyBarText} onChange={(e) => setStickyBarText(e.target.value)} placeholder="نص الشريط الثابت" className="bg-slate-950 text-xs border-slate-800" />
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. REST API & WEBHOOKS */}
            <AccordionItem value="api" className="border border-slate-800 rounded-lg bg-slate-950/60 px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <Cpu className="w-5 h-5" /> 🔌 5. REST API Endpoints & Webhooks
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4 text-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-amber-400">تفعيل REST API Endpoint (/wp-json/telewoo/v1/info)</Label>
                      <Switch checked={enableRestApiEndpoint} onCheckedChange={setEnableRestApiEndpoint} />
                    </div>
                  </div>

                  <div className="p-3 border border-slate-800 rounded-lg bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-amber-400">تفعيل Webhook عند إتمام طلب جديد</Label>
                      <Switch checked={enableOrderWebhooks} onCheckedChange={setEnableOrderWebhooks} />
                    </div>
                    {enableOrderWebhooks && (
                      <Input value={webhookTargetUrl} onChange={(e) => setWebhookTargetUrl(e.target.value)} placeholder="رابط الـ Webhook المستهدف" className="bg-slate-950 text-xs border-slate-800 font-mono" />
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* AI PROMPT INPUT BOX */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <Label className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              أضف ميزة مخصصة أخرى بالذكاء الاصطناعي (أو اكتب أي وصف إضافي لتضمينه في الـ Plugin):
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب طلبك بلغتك الحرة (مثل: أضف شارة جديد على المنتجات، أضف زر العودة للأعلى بسلاسة، إلخ...)..."
              className="bg-slate-950 border-slate-800 text-white min-h-[90px] focus:border-indigo-500"
            />
          </div>

          {/* ACTION BUTTONS: 1-CLICK AUTO UPDATE & MANUAL DOWNLOAD */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              onClick={() => handleGenerateAndDeploy(true)}
              disabled={generating || autoDeploying}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm px-6 py-5 shadow-lg gap-2"
            >
              {autoDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> جاري التوليد والتحديث التلقائي أونلاين...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300" /> 🚀 إصدار وتحديث الإضافة أونلاين تلقائياً (1-Click Auto Update)
                </>
              )}
            </Button>

            <Button
              onClick={() => handleGenerateAndDeploy(false)}
              disabled={generating || autoDeploying}
              variant="outline"
              className="w-full sm:w-auto border-indigo-500/40 hover:bg-indigo-950/50 text-indigo-200 font-bold text-sm px-5 py-5 gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> جاري التوليد...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-400" /> 📥 تنزيل حزمة ZIP يدوياً
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PLUGINS MANAGEMENT DASHBOARD & HISTORY */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" /> منصة إدارة وتعديل الإضافات المنشأة بالحساب
            </CardTitle>
            <Badge variant="outline" className="text-slate-400 border-slate-700">{plugins.length} إضافة</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {plugins.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">لم تقم بإنشاء أي إضافات بعد. استخدم المولد أعلاه لبدء التوليد والتحديث التلقائي.</p>
          ) : (
            plugins.map((p) => (
              <div key={p.id} className="border border-slate-800 rounded-lg p-3 bg-slate-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{p.name}</h4>
                    <Badge className="bg-indigo-600/30 text-indigo-300 text-[10px]">v{p.current_version}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{p.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditModalPlugin(p)} className="text-xs font-bold text-amber-300 border-amber-500/40 hover:bg-amber-950/50 gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> تعديل بالـ AI
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openCodeModal(p)} className="text-xs font-bold text-indigo-300 hover:bg-indigo-950/50 gap-1">
                    <Eye className="w-3.5 h-3.5" /> عرض الكود
                  </Button>
                  <Button size="sm" onClick={() => handleGenerateAndDeploy(true, p)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1">
                    <Zap className="w-3.5 h-3.5" /> إطلاق التحديث
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeletePlugin(p.id)} className="text-xs font-bold text-rose-400 hover:bg-rose-950/50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* EDIT & MODIFY PLUGIN MODAL */}
      <Dialog open={!!editModalPlugin} onOpenChange={(o) => !o && setEditModalPlugin(null)}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white dir-rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" /> التعديل على الإضافة بالذكاء الاصطناعي: {editModalPlugin?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              اكتب التعديلات المحددة التي تريد إضافتها أو تعديلها في الإضافة الحالية. سيقوم الذكاء الاصطناعي بدمجها مع الكود الحالي وإصدار تحديث جديد دون مسح البيانات.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-200">التعديل أو الميزة الجديدة المطلوبة:</Label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="مثال: أضف صفحة إعدادات جديدة، أضف بوابة دفع Stripe، أنشئ REST Endpoint، غيّر التصميم..."
                className="bg-slate-900 border-slate-800 text-white min-h-[120px] text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <Button
              onClick={() => handleUpdatePluginWithAI(editModalPlugin)}
              disabled={updatingPlugin}
              className="bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-bold text-xs px-5 py-2 gap-1.5"
            >
              {updatingPlugin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              تحديث وحفظ الإضافة (Update Plugin)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditModalPlugin(null)} className="text-xs text-slate-400">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CODE VIEW MODAL */}
      <Dialog open={!!viewCodePlugin} onOpenChange={(o) => !o && setViewCodePlugin(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-slate-950 border-slate-800 text-white overflow-hidden flex flex-col dir-rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-indigo-300 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" /> كود الـ Plugin: {viewCodePlugin?.name} (v{viewCodePlugin?.current_version})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto my-2 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {loadingCode ? (
              <div className="flex items-center justify-center py-12 text-indigo-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin" /> جاري تحميل الكود...
              </div>
            ) : (
              <Textarea
                value={viewingPhpCode}
                onChange={(e) => setViewingPhpCode(e.target.value)}
                className="font-mono text-xs bg-transparent border-none text-emerald-400 min-h-[350px] focus-visible:ring-0 leading-relaxed"
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(viewingPhpCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="text-xs border-slate-700 gap-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? "تم النسخ!" : "نسخ الكود"}
            </Button>

            <Button size="sm" onClick={() => setViewCodePlugin(null)} className="bg-indigo-600 text-white font-bold text-xs">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
