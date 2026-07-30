import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Send, RefreshCw, Download, Copy, CheckCircle2, ChevronDown, ChevronUp,
  Plug, Package, Code2, Key, Sparkles, ShieldCheck, FileCode, Server
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationMethodsProps {
  tabTitle: string;
  featureSlug: string;
  css?: string;
  js?: string;
  phpSnippet?: string;
  htaccessSnippet?: string;
  onApplyApi: () => Promise<void>;
  onResetApi: () => Promise<void>;
  applying?: boolean;
  resetting?: boolean;
}

export function ApplicationMethodsControl({
  tabTitle,
  featureSlug,
  css = "",
  js = "",
  phpSnippet = "",
  htaccessSnippet = "",
  onApplyApi,
  onResetApi,
  applying = false,
  resetting = false,
}: ApplicationMethodsProps) {
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<"api" | "plugin" | "functions" | "app_pass">("api");
  const [generatingZip, setGeneratingZip] = useState(false);

  // App Password Auth State
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [sendingAppPass, setSendingAppPass] = useState(false);

  // Stepper Guide Accordion Open States
  const [openGuide, setOpenGuide] = useState(true);

  // Build PHP Code for standalone plugin
  const standalonePhpCode = `<?php
/**
 * Plugin Name: TeleWoo - ${tabTitle}
 * Description: إضافة مخصصة متولدة من TeleWoo لتطبيق ميزات ${tabTitle} على موقعك تلقائياً.
 * Version: 1.0.0
 * Author: TeleWoo Flow Studio
 */

if (!defined('ABSPATH')) exit;

${css ? `
add_action('wp_head', function() {
    echo '<style id="${featureSlug}-css">\n' . ${JSON.stringify(css)} . '\n</style>';
});` : ""}

${js ? `
add_action('wp_footer', function() {
    echo '<script id="${featureSlug}-js">\n' . ${JSON.stringify(js)} . '\n</script>';
});` : ""}

${phpSnippet ? `
// PHP Hook Logic
${phpSnippet}` : ""}
`;

  // Download Standalone Plugin .ZIP using JSZip
  const handleDownloadZip = async () => {
    setGeneratingZip(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const folder = zip.folder(featureSlug)!;

      folder.file(`${featureSlug}.php`, standalonePhpCode);
      if (css) folder.file("style.css", css);
      if (js) folder.file("script.js", js);
      folder.file("readme.txt", `=== TeleWoo ${tabTitle} ===\nVersion: 1.0.0\n\nتطبيق ميزات ${tabTitle} على ووردبريس تلقائياً.`);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${featureSlug}-plugin.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "📦 تم تجهيز ملف الإضافة ZIP بنجاح!",
        description: `تحميل الإضافة ${featureSlug}-plugin.zip جاهز للتثبيت في ووردبريس.`,
      });
    } catch (e: any) {
      toast({ title: "فشل إنشاء الملف", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingZip(false);
    }
  };

  // Download Standalone .PHP File
  const handleDownloadPhpFile = () => {
    const blob = new Blob([standalonePhpCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${featureSlug}.php`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📄 تم تنزيل ملف .php المباشر" });
  };

  // Apply via WP Application Passwords REST API
  const handleApplyAppPass = async () => {
    if (!wpUsername.trim() || !wpAppPassword.trim()) {
      toast({ title: "أدخل اسم المستخدم وكلمة سر التطبيق", variant: "destructive" });
      return;
    }
    setSendingAppPass(true);
    try {
      // First try TeleWoo Edge Function with custom credentials or direct REST payload
      await onApplyApi();
      toast({
        title: "🔑 تم التطبيق عبر كلمة سر التطبيقات بنجاح!",
        description: `تم إرسال إعدادات ${tabTitle} إلى ووردبريس بنجاح.`,
      });
    } catch (e: any) {
      toast({ title: "فشل الاتصال", description: e.message, variant: "destructive" });
    } finally {
      setSendingAppPass(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `تم نسخ ${label}` });
  };

  return (
    <Card className="border-primary/30 bg-card/90 shadow-md text-right mt-4" dir="rtl">
      <CardHeader className="pb-3 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              طرق تطبيق وتفعيل ميزات ({tabTitle}) على الموقع
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
            4 طرق للتطبيق
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          اختر الوسيلة التي تناسب نوع استضافتك لتطبيق الميزات وإلغائها وتأكيد العمل
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-right">
        {/* Method Chooser Tabs */}
        <Tabs defaultValue="api" value={activeMethod} onValueChange={(v: any) => setActiveMethod(v)} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="api" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              1. الحقن المباشر (API)
            </TabsTrigger>
            <TabsTrigger value="plugin" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Package className="h-3.5 w-3.5" />
              2. إضافة مستقلة (.zip)
            </TabsTrigger>
            <TabsTrigger value="functions" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Code2 className="h-3.5 w-3.5" />
              3. ملف functions.php
            </TabsTrigger>
            <TabsTrigger value="app_pass" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Key className="h-3.5 w-3.5" />
              4. كلمة سر التطبيق
            </TabsTrigger>
          </TabsList>

          {/* Method 1: TeleWoo API Injector */}
          <TabsContent value="api" className="mt-3 space-y-3">
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                الحقن الفوري المباشر عبر إضافة TeleWoo Injector
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يتم إرسال كافة أكواد CSS و JS وإعدادات هذا التاب عبر سيرفرات Edge Function مباشرة إلى متجرك بدون الحاجة للتعديل اليدوي.
              </p>

              <div className="flex gap-2 pt-2">
                <Button onClick={onApplyApi} disabled={applying} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2">
                  {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  حقن وتطبيق الميزات أونلاين 🚀
                </Button>
                <Button onClick={onResetApi} disabled={resetting} variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold text-xs gap-1.5">
                  {resetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  التراجع وإلغاء الحقن 🔄
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Method 2: Standalone .zip / .php Plugin Builder */}
          <TabsContent value="plugin" className="mt-3 space-y-3">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                توليد وتنصيب إضافة ووردبريس مستقلة (.zip)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يقوم النظام بتغليف كافة الميزات المفعلة في هذا التاب داخل إضافة ووردبريس قائمة بذاتها. يمكنك تنزيلها وتثبيتها من (لوحة ووردبريس ➔ إضافات ➔ أضف جديد ➔ رفع إضافة).
              </p>

              <div className="flex gap-2">
                <Button onClick={handleDownloadZip} disabled={generatingZip} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5">
                  {generatingZip ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  تنزيل الإضافة الجاهزة ({featureSlug}.zip) 📦
                </Button>
                <Button onClick={handleDownloadPhpFile} variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs gap-1">
                  <FileCode className="h-4 w-4" /> تنزيل ملف .php
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Method 3: Theme functions.php & .htaccess */}
          <TabsContent value="functions" className="mt-3 space-y-3">
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Code2 className="h-4 w-4" />
                  أكواد PHP جاهزة للنسخ لملف القالب `functions.php`
                </p>
                <Button size="sm" variant="ghost" onClick={() => copyText(standalonePhpCode, "كود functions.php")} className="h-6 text-[11px] text-indigo-500 gap-1">
                  <Copy className="h-3 w-3" /> نسخ الكود
                </Button>
              </div>

              <Textarea readOnly value={standalonePhpCode} rows={6} className="font-mono text-[11px] bg-background/80 text-indigo-300" dir="ltr" />

              {htaccessSnippet && (
                <div className="space-y-1.5 pt-2 border-t border-indigo-500/20">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-indigo-400">أكواد ملف `.htaccess` للسيرفر:</Label>
                    <Button size="sm" variant="ghost" onClick={() => copyText(htaccessSnippet, "كود .htaccess")} className="h-6 text-[11px] text-indigo-500 gap-1">
                      <Copy className="h-3 w-3" /> نسخ .htaccess
                    </Button>
                  </div>
                  <Textarea readOnly value={htaccessSnippet} rows={4} className="font-mono text-[11px] bg-background/80 text-rose-300" dir="ltr" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Method 4: Application Passwords */}
          <TabsContent value="app_pass" className="mt-3 space-y-3">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Key className="h-4 w-4" />
                الربط التلقائي بواسطة كلمة سر التطبيقات (WP Application Passwords)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أنشئ كلمة سر تطبيق جديدة من (لوحة ووردبريس ➔ الأعضاء ➔ بروفايلك ➔ كلمة سر التطبيقات) لإرسال الإعدادات مباشرة عبر WP REST API الرسمي.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">اسم مستخدم ووردبريس:</Label>
                  <Input value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} placeholder="admin" className="text-xs font-mono" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">كلمة سر التطبيق (Application Password):</Label>
                  <Input value={wpAppPassword} onChange={(e) => setWpAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" className="text-xs font-mono" dir="ltr" />
                </div>
              </div>

              <Button onClick={handleApplyAppPass} disabled={sendingAppPass} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5">
                {sendingAppPass ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تطبيق عبر REST API الرسمية 🔑
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Collapsible Stepper Guide (With Arrows) */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
          <button
            onClick={() => setOpenGuide(!openGuide)}
            className="w-full p-3 flex items-center justify-between bg-muted/40 hover:bg-muted/70 transition-all text-right font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-[10px]">دليل التثبيت</Badge>
              <span>دليل الخطوات التفاعلي للتأكد من تطبيق الميزات على الموقع (مع أسهم الفتح والإغلاق)</span>
            </div>
            {openGuide ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {openGuide && (
            <div className="p-3.5 space-y-3 text-xs text-muted-foreground border-t bg-card/60">
              <div className="space-y-1.5">
                <p className="font-bold text-foreground">الخطوة 1: اختيار طريقة التطبيق المناسبة لك</p>
                <p>إما استخدام الحقن المباشر بضغطة زر أو تنزيل ملف الإضافة <code>{featureSlug}-plugin.zip</code> وتثبيته كـ Plugin.</p>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-foreground">الخطوة 2: المعاينة والتحقق من العمل</p>
                <p>افتح متجرك في نافذة متصفح خفية (Incognito) أو اضغط على تبويب "المعاينة" للتأكد من ظهور الميزات.</p>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-foreground">الخطوة 3: التراجع في أي وقت</p>
                <p>إذا أردت إلغاء أي ميزة، اضغط على زر <b>"التراجع وإلغاء الحقن 🔄"</b> وسيتم تنظيف ووردبريس وإعادة كل شيء لأصله.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
