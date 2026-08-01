import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Lock, EyeOff, CheckCircle2, RefreshCw, Send, Copy, AlertTriangle, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

export function SecurityHardeningTab() {
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  // Security Toggles
  const [hideWpVersion, setHideWpVersion] = useState(true);
  const [disableRightClick, setDisableRightClick] = useState(false);
  const [disableTextSelection, setDisableTextSelection] = useState(false);
  const [securityHeaders, setSecurityHeaders] = useState(true);

  // Generated Code
  const generatedCss = `/* Security & Hardening Shield - TeleWoo Generated CSS */
${disableTextSelection ? `
/* Disable Text Selection & Image Copying */
body {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
}
img {
  pointer-events: none !important;
}` : ""}
`;

  const generatedJs = `/* Security & Hardening Shield - TeleWoo Generated JS */
(function() {
  console.log('🛡️ TeleWoo Security Hardening Active');

  ${hideWpVersion ? `
  // Hide WP Generator Meta Tag from DOM
  var meta = document.querySelector('meta[name="generator"]');
  if (meta && meta.content.indexOf('WordPress') !== -1) {
    meta.remove();
  }` : ""}

  ${disableRightClick ? `
  // Disable Context Menu (Right Click Protect)
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });` : ""}
})();
`;

  const htaccessSecurityCode = `# TeleWoo Security Hardening Rules for .htaccess
# 1. Disable Directory Browsing
Options -Indexes

# 2. Block XML-RPC Exploits
<Files xmlrpc.php>
order deny,allow
deny from all
</Files>

# 3. Protect wp-config.php
<Files wp-config.php>
order deny,allow
deny from all
</Files>

# 4. Security Headers
<IfModule mod_headers.c>
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
</IfModule>`;

  const [resetting, setResetting] = useState(false);

  const handleApplySecurity = async () => {
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
        title: "🛡️ تم تفعيل درع الحماية وإخفاء ثغرات ووردبريس بنجاح!",
        description: "تم حجب إصدار ووردبريس وحماية الأكواد البرمجية للموقع.",
      });
    } catch (e: any) {
      toast({ title: "فشل الحقن", description: e.message || "تأكد من إعداد مفتاح WP Studio", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleResetInjectedCode = async () => {
    if (!confirm("هل أنت تأكد من التراجع وإلغاء كافة إعدادات وأكواد الحماية المحقونة؟")) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset" }
      });
      if (error) throw error;
      toast({
        title: "🔄 تم التراجع وإلغاء درع الحماية المحقون بنجاح!",
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
      <Card className="bg-gradient-to-r from-slate-950/40 via-background to-rose-950/30 border-rose-500/30">
        <CardHeader className="pb-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
                  درع الحماية وإخفاء الثغرات (Security & Hardening Shield)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  إخفاء هوية ووردبريس، تعطيل ثغرة XML-RPC، حماية الصور والنصوص، وتأمين ملفات السيرفر
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold px-3 py-1">
              Hardening Shield
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggles */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-400" />
              1. إعدادات درع الحماية وحجب هوية الموقع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">إخفاء رقم إصدار ووردبريس (Hide WP Version Meta):</Label>
                <span className="text-[11px] text-muted-foreground">حذف وسام إصدار ووردبريس لمنع البوتات الهجومية من معرفة النسخة</span>
              </div>
              <Switch checked={hideWpVersion} onCheckedChange={setHideWpVersion} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">منع تحديد النص ونسخ الصور (Disable Text Selection):</Label>
                <span className="text-[11px] text-muted-foreground">تعطيل تحديد نصوص وصور المحتوى لحمايتها من السرقة</span>
              </div>
              <Switch checked={disableTextSelection} onCheckedChange={setDisableTextSelection} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
              <div>
                <Label className="text-xs font-bold block">تعطيل القائمة اليمنى الماوس (Disable Right Click):</Label>
                <span className="text-[11px] text-muted-foreground">إيقاف زر الماوس الأيمن لمنع فتح أداة المطورين بسهولة</span>
              </div>
              <Switch checked={disableRightClick} onCheckedChange={setDisableRightClick} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplySecurity}
                disabled={applying}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2"
              >
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تطبيق درع الحماية 🛡️
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

        {/* Server .htaccess Rules */}
        <Card dir="rtl">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Key className="h-4 w-4 text-rose-400" />
              2. قواعد حماية ملف `.htaccess` والسيرفر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">أكواد إغلاق ثغرة XML-RPC وحماية wp-config:</Label>
              <Button size="sm" variant="ghost" onClick={() => copyCode(htaccessSecurityCode, "أكواد الحماية")} className="h-6 text-[11px] gap-1 text-rose-400">
                <Copy className="h-3 w-3" /> نسخ الأكواد
              </Button>
            </div>
            <Textarea
              readOnly
              value={htaccessSecurityCode}
              rows={8}
              className="font-mono text-xs text-left bg-muted/50 text-rose-300"
              dir="ltr"
            />
          </CardContent>
        </Card>
      </div>

      {/* Application Methods Control & Stepper Guide */}
      <ApplicationMethodsControl
        tabTitle="درع الحماية وإخفاء الثغرات"
        featureSlug="telewoo-security-hardening"
        css={generatedCss}
        js={generatedJs}
        htaccessSnippet={htaccessSecurityCode}
        onApplyApi={handleApplySecurity}
        onResetApi={handleResetInjectedCode}
        applying={applying}
        resetting={resetting}
      />
    </div>
  );
}
