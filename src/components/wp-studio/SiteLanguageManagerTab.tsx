import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, Download, CheckCircle2, ShieldCheck, Zap, Plus, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INITIAL_LANGUAGES = [
  { code: "ar", name: "العربية (Arabic)" },
  { code: "en", name: "الإنجليزية (English)" },
  { code: "fr", name: "الفرنسية (French)" },
  { code: "es", name: "الإسبانية (Spanish)" },
  { code: "de", name: "الألمانية (German)" },
  { code: "tr", name: "التركية (Turkish)" },
  { code: "it", name: "الإيطالية (Italian)" },
  { code: "ru", name: "الروسية (Russian)" },
];

export function SiteLanguageManagerTab() {
  const { toast } = useToast();
  const [langMode, setLangMode] = useState<"single" | "multi">("multi");
  const [primaryLang, setPrimaryLang] = useState("ar");
  const [availableLangs, setAvailableLangs] = useState(INITIAL_LANGUAGES);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["ar", "en", "fr"]);
  const [position, setPosition] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("bottom-right");
  const [autoDirection, setAutoDirection] = useState(true);
  
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");

  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const toggleLanguage = (code: string) => {
    if (code === primaryLang) return; 
    if (selectedLangs.includes(code)) {
      setSelectedLangs(selectedLangs.filter(c => c !== code));
    } else {
      setSelectedLangs([...selectedLangs, code]);
    }
  };

  const handleAddCustomLanguage = () => {
    const code = customCode.trim().toLowerCase();
    const name = customName.trim();

    if (!code || !name) {
      toast({ title: "تنبيه", description: "يرجى كتابة رمز اللغة واسم اللغة المخصصة", variant: "destructive" });
      return;
    }

    if (availableLangs.some(l => l.code === code)) {
      toast({ title: "تنبيه", description: "هذه اللغة موجودة بالفعل في القائمة", variant: "destructive" });
      return;
    }

    const newLang = { code, name };
    setAvailableLangs(prev => [...prev, newLang]);
    setSelectedLangs(prev => [...prev, code]);
    setCustomCode("");
    setCustomName("");
    toast({ title: "تم إضافة اللغة المخصصة!", description: `تمت إضافة ${name} (${code}) بنجاح إلى قائمة اللغات.` });
  };

  const generatePluginZip = async () => {
    setDownloading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const folder = zip.folder("telewoo-live-translator")!;

      const activeLangsObjects = selectedLangs.map(c => ({
        code: c,
        name: availableLangs.find(l => l.code === c)?.name || c
      }));

      const phpMainCode = `<?php
/**
 * Plugin Name: TeleWoo Live Auto-Translator & Layout Adaptive
 * Description: إضافة ترجمة فورية حية شاملة وتكييف محاذاة الصفحة والـ RTL/LTR تلقائياً.
 * Version: 2.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) { exit; }

add_action('wp_footer', function() {
    $primary = '${primaryLang}';
    $active_json = json_encode(${JSON.stringify(activeLangsObjects)});
    $pos = '${position}';
    $autodir = ${autoDirection ? "true" : "false"};
    
    $pos_styles = 'bottom:20px; right:20px;';
    if ($pos === 'top-right') $pos_styles = 'top:20px; right:20px;';
    if ($pos === 'top-left') $pos_styles = 'top:20px; left:20px;';
    if ($pos === 'bottom-left') $pos_styles = 'bottom:20px; left:20px;';
    ?>
    <style>
      #telewoo-lang-switcher { position: fixed; <?php echo $pos_styles; ?> z-index: 999999; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border: 1px solid #cbd5e1; border-radius: 30px; padding: 6px 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-family: system-ui, sans-serif; display: flex; align-items: center; gap: 8px; direction: ltr; }
      #telewoo-lang-select { border: none; background: transparent; font-weight: bold; font-size: 13px; cursor: pointer; outline: none; color: #0f172a; }
      .goog-te-banner-frame, .skiptranslate, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; visibility: hidden !important; }
      body { top: 0px !important; position: relative !important; }
    </style>
    <div id="telewoo-lang-switcher">
      <span>🌐</span>
      <select id="telewoo-lang-select"></select>
    </div>
    <div id="google_translate_element" style="display:none;"></div>
    <script>
      var telewooLangs = <?php echo $active_json; ?>;
      function adaptLayoutDirection(langCode) {
        if (!<?php echo $autodir ? 'true' : 'false'; ?>) return;
        var isRTL = ['ar', 'fa', 'he', 'ur'].indexOf(langCode.toLowerCase()) !== -1;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.body.style.textAlign = isRTL ? 'right' : 'left';
      }
      function googleTranslateElementInit() {
        new google.translate.TranslateElement({pageLanguage: '${primaryLang}', includedLanguages: telewooLangs.map(l => l.code).join(','), autoDisplay: false}, 'google_translate_element');
      }
      document.addEventListener('DOMContentLoaded', function(){
        var select = document.getElementById('telewoo-lang-select');
        telewooLangs.forEach(l => {
          var opt = document.createElement('option');
          opt.value = l.code; opt.textContent = l.name; select.appendChild(opt);
        });
        select.addEventListener('change', function(){
          var combo = document.querySelector('.goog-te-combo');
          if(combo) { combo.value = this.value; combo.dispatchEvent(new Event('change')); }
          adaptLayoutDirection(this.value);
        });
        var gt = document.createElement('script');
        gt.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(gt);
      });
    </script>
    <?php
});`;

      folder.file("telewoo-live-translator.php", phpMainCode);
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "telewoo-live-translator.zip";
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "تم التنزيل بنجاح!", description: "قم برفع الملف إلى ووردبريس." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
        const { error } = await supabase.functions.invoke("wp-studio-inject", {
          body: { action: "apply", mode: langMode === "single" ? "replace" : "append", css: "", js: langMode === "single" ? "var el = document.getElementById('telewoo-lang-switcher'); if(el) el.remove();" : "// Logic added via plugin" }
        });
        if (error) throw error;
        toast({ title: "تم التطبيق!", description: "تم تحديث إعدادات الموقع." });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            مُنشئ إضافة الترجمة الفورية وتكييف المحاذاة
          </CardTitle>
          <CardDescription>
            قم بتوليد وتنزيل إضافة ووردبريس للترجمة الفورية التفاعلية مع تحويل المحاذاة والاتجاه (RTL / LTR) تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div onClick={() => setLangMode("single")} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${langMode === "single" ? "border-primary bg-primary/5" : "border-muted"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> لغة واحدة</span>
                {langMode === "single" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
            </div>
            <div onClick={() => setLangMode("multi")} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${langMode === "multi" ? "border-primary bg-primary/5" : "border-muted"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm flex items-center gap-1.5"><Globe className="h-4 w-4 text-blue-500" /> متعدد اللغات التكيُّفي</span>
                {langMode === "multi" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
            </div>
          </div>

          {langMode === "multi" && (
            <div className="space-y-5 p-4 bg-background rounded-lg border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs">اللغة الأصلية للموقع:</Label>
                  <Select value={primaryLang} onValueChange={setPrimaryLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableLangs.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs">موقع الشارة:</Label>
                  <Select value={position} onValueChange={(v: any) => setPosition(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">أسفل اليمين</SelectItem>
                      <SelectItem value="bottom-left">أسفل اليسار</SelectItem>
                      <SelectItem value="top-right">أعلى اليمين</SelectItem>
                      <SelectItem value="top-left">أعلى اليسار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <Label className="font-bold text-xs flex items-center gap-1.5"><SlidersHorizontal className="h-4 w-4 text-primary" /> ضبط اتجاه الصفحة تلقائياً (RTL / LTR)</Label>
                </div>
                <Switch checked={autoDirection} onCheckedChange={setAutoDirection} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">اختر اللغات المتاحة:</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableLangs.map(l => (
                    <div key={l.code} className="flex items-center space-x-2 space-x-reverse border p-2.5 rounded bg-muted/20">
                      <Checkbox id={`lang-${l.code}`} checked={selectedLangs.includes(l.code)} onCheckedChange={() => toggleLanguage(l.code)} />
                      <label htmlFor={`lang-${l.code}`} className="text-xs font-medium cursor-pointer">{l.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleApply} disabled={applying} className="font-bold flex-1">
              {applying ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Zap className="h-4 w-4 ml-2" />}
              حفظ الإعدادات أونلاين
            </Button>
            {langMode === "multi" && (
              <Button onClick={generatePluginZip} disabled={downloading} variant="outline" className="font-bold flex-1">
                {downloading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
                تنزيل إضافة اللغات ZIP المباشرة للموقع
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

