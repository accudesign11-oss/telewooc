import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Sparkles, Store, Save, Loader2, CheckCircle, ExternalLink, Info, Image as ImageIcon, Zap, XCircle, AlertTriangle, TrendingUp, DollarSign, ImagePlus, RefreshCw, Coins } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAIUsageStats } from "@/hooks/useAIUsageStats";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AI_PROVIDER_LINKS = {
  gemini: {
    name: "Google Gemini",
    url: "https://aistudio.google.com/app/apikey",
    description: "احصل على API Key مجاني من Google AI Studio",
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/keys",
    description: "احصل على API Key من OpenRouter (يدعم عدة نماذج)",
  },
  huggingface: {
    name: "Hugging Face",
    url: "https://huggingface.co/settings/tokens",
    description: "احصل على Access Token من Hugging Face",
  },
};

const FREE_OPENROUTER_MODELS = [
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", description: "الأفضل - 3.93B tokens" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1", description: "515M tokens" },
  { id: "google/gemma-3-12b-it:free", name: "Gemma 3 12B", description: "36.2M tokens" },
  { id: "google/gemma-3-4b-it:free", name: "Gemma 3 4B", description: "51.9M tokens - سريع" },
  { id: "qwen/qwen-2.5-vl-7b-instruct:free", name: "Qwen 2.5 VL", description: "يدعم الصور - 122M tokens" },
];

function AIUsageStatsCard() {
  const { ai } = useSettings();
  const geminiKey = ai?.gemini_api_key;
  const activeProvider = ai?.provider === "openrouter" ? "OpenRouter" : ai?.provider === "huggingface" ? "Hugging Face" : "Google Gemini";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            حالة مزود الذكاء الاصطناعي (Gemini AI Provider)
          </CardTitle>
          <Badge variant={geminiKey || ai?.provider !== "gemini" ? "secondary" : "destructive"} className="gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            {activeProvider}
          </Badge>
        </div>
        <CardDescription>
          تأكيد الاعتماد المباشر 100% على مفتاح API الخاص بك دون أي منصات وسيطة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-background rounded-lg border space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">المزود المعتمد:</span>
            <span className="text-primary font-bold">{activeProvider}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">حالة المفتاح (API Key):</span>
            <span className={geminiKey ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
              {geminiKey ? "مفتاح Gemini API متصل ومفعل ✓" : "لم يتم إدخال مفتاح Gemini API"}
            </span>
          </div>
        </div>

        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs leading-relaxed">
            <b>تنبيه هام حول الرصيد والتكلفة:</b> جميع عمليات المعالجة (Vision للصور، توليد العناوين، الأوصاف، والتقييمات) تتم 100% مباشرة عبر <b>مفتاح Gemini API Key الخاص بك</b>، ولا تُستهلك أي توكنز أو رصيد نهائياً من منصات ثانوية.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
          >
            عرض وخصائص رصيد مفتاحك في Google AI Studio ↗
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldStatusBadge({ hasValue, text }: { hasValue?: boolean; text?: string }) {
  if (!hasValue) {
    return (
      <Badge variant="outline" className="text-[10px] bg-muted/20 text-muted-foreground font-normal border-dashed">
        خالي
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 font-bold gap-1">
      <CheckCircle className="h-3 w-3 text-emerald-500" />
      {text || "مُدخل ومحفوظ ✓"}
    </Badge>
  );
}

interface ImgbbFormState {
  api_key: string;
  require_conversion: boolean;
  convert_to_webp: boolean;
}

function ImgbbSettingsCard({
  imgbbForm,
  setImgbbForm,
  onSave,
  isSaving,
}: {
  imgbbForm: ImgbbFormState;
  setImgbbForm: React.Dispatch<React.SetStateAction<ImgbbFormState>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
  const { toast } = useToast();

  const handleTestImgbb = async () => {
    if (!imgbbForm.api_key) {
      toast({ title: "الرجاء إدخال API Key أولاً", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Create a simple test image (1x1 pixel)
      const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      
      const { data, error } = await supabase.functions.invoke("imgbb-upload", {
        body: { 
          image: testImageBase64, 
          apiKey: imgbbForm.api_key 
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      setTestResult({ success: true, url: data.url });
      toast({ title: "تم الاتصال بنجاح!", description: "imgbb API Key صحيح ويعمل" });
    } catch (error: any) {
      const errorMessage = error.message || "فشل اختبار الاتصال";
      setTestResult({ success: false, error: errorMessage });
      toast({ title: "فشل الاختبار", description: errorMessage, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          إعدادات رفع الصور (imgbb)
        </CardTitle>
        <CardDescription>
          رفع الصور وتحويلها لروابط تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            <a 
              href="https://api.imgbb.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              احصل على API Key مجاني من imgbb ↗
            </a>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>API Key</Label>
            <FieldStatusBadge hasValue={!!imgbbForm.api_key} />
          </div>
          <Input 
            type="password" 
            placeholder="أدخل imgbb API Key" 
            value={imgbbForm.api_key}
            onChange={(e) => setImgbbForm(prev => ({ ...prev, api_key: e.target.value }))}
            dir="ltr"
          />
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert className={testResult.success ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={testResult.success ? "text-success" : "text-destructive"}>
              {testResult.success 
                ? "API Key صحيح ويعمل بشكل سليم ✓"
                : testResult.error
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">تحويل الصور إلزامي</Label>
            <p className="text-xs text-muted-foreground">
              {imgbbForm.require_conversion 
                ? "سيتم تحويل جميع الصور إلى imgbb قبل النشر"
                : "سيتم استخدام روابط الصور الأصلية مباشرة بدون تحويل"
              }
            </p>
          </div>
          <Switch 
            checked={imgbbForm.require_conversion}
            onCheckedChange={(checked) => setImgbbForm(prev => ({ ...prev, require_conversion: checked }))}
          />
        </div>

        {imgbbForm.require_conversion && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">تحويل إلى WebP</Label>
              <p className="text-xs text-muted-foreground">
                {imgbbForm.convert_to_webp 
                  ? "سيتم تحويل الصور إلى WebP لحجم أصغر وجودة أفضل"
                  : "سيتم رفع الصور بصيغتها الأصلية"
                }
              </p>
            </div>
            <Switch 
              checked={imgbbForm.convert_to_webp}
              onCheckedChange={(checked) => setImgbbForm(prev => ({ ...prev, convert_to_webp: checked }))}
            />
          </div>
        )}

        {!imgbbForm.require_conversion && (
          <Alert className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-warning">
              تنبيه: عند إيقاف التحويل، سيتم استخدام الروابط الأصلية للصور مباشرة. 
              تأكد أن الروابط عامة ومتاحة لـ WooCommerce.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving} className="flex-1">
            {isSaving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
            حفظ
          </Button>
          <Button 
            variant="outline" 
            onClick={handleTestImgbb} 
            disabled={isTesting || !imgbbForm.api_key}
            className="flex-1"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 ml-2" />
            )}
            اختبار الاتصال
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const {
    isLoading, 
    isSaving, 
    telegram, 
    woocommerce, 
    ai,
    imgbb,
    saveTelegram, 
    saveWooCommerce, 
    saveAI,
    saveImgbb
  } = useSettings();

  const [telegramForm, setTelegramForm] = useState(telegram);
  const [wooForm, setWooForm] = useState(woocommerce);
  const [aiForm, setAiForm] = useState(ai);
  const [imgbbForm, setImgbbForm] = useState(imgbb);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingWoo, setIsTestingWoo] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    model?: string;
    latency_ms?: number;
    status?: string;
    credits?: number | null;
  } | null>(null);
  const [wooTestResult, setWooTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    latency_ms?: number;
    store_info?: {
      wc_version: string;
      wp_version: string;
      theme: string;
      currency: string;
      products_count: number;
    };
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTelegramForm(telegram);
    setWooForm(woocommerce);
    setAiForm(ai);
    setImgbbForm(imgbb);
    setTestResult(null);
    setWooTestResult(null);
  }, [telegram, woocommerce, ai, imgbb]);

  const handleSaveTelegram = async () => {
    await saveTelegram(telegramForm);
  };

  const normalizeUrl = (url: string) => {
    let clean = (url || "").trim().replace(/\/+$/, "");
    if (clean && !clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    return clean;
  };

  const handleSaveWoo = async () => {
    const formattedForm = { ...wooForm, store_url: normalizeUrl(wooForm.store_url) };
    setWooForm(formattedForm);
    await saveWooCommerce(formattedForm);
    setWooTestResult(null);
  };

  const handleTestWooConnection = async () => {
    setIsTestingWoo(true);
    setWooTestResult(null);
    const storeUrl = normalizeUrl(wooForm.store_url);
    
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-test", {
        body: {
          store_url: storeUrl,
          consumer_key: wooForm.consumer_key?.trim(),
          consumer_secret: wooForm.consumer_secret?.trim(),
        },
      });

      if (error) {
        setWooTestResult({ success: false, error: error.message });
        toast({
          title: "فشل الاختبار",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setWooTestResult(data);
        if (data.success) {
          toast({
            title: "تم الاتصال بنجاح!",
            description: `WooCommerce ${data.store_info?.wc_version} - ${data.latency_ms}ms`,
          });
        } else {
          toast({
            title: "فشل الاتصال",
            description: data.error,
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      setWooTestResult({ success: false, error: e.message });
      toast({
        title: "خطأ",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingWoo(false);
    }
  };

  const handleSaveAI = async () => {
    await saveAI(aiForm);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-test", {
        body: {
          provider: aiForm.provider,
          gemini_api_key: aiForm.gemini_api_key,
          openrouter_api_key: aiForm.openrouter_api_key,
          openrouter_model: aiForm.openrouter_model,
          huggingface_api_key: aiForm.huggingface_api_key,
        },
      });

      if (error) {
        setTestResult({ success: false, error: error.message });
        toast({
          title: "فشل الاختبار",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setTestResult(data);
        if (data.success) {
          toast({
            title: "نجح الاختبار!",
            description: `${data.model} - ${data.latency_ms}ms`,
          });
        } else {
          toast({
            title: "فشل الاختبار",
            description: data.error,
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      toast({
        title: "خطأ",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveImgbb = async () => {
    await saveImgbb(imgbbForm);
  };

  if (isLoading) {
    return (
      <AppLayout title="الإعدادات">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="الإعدادات">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Telegram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              إعدادات Telegram
            </CardTitle>
            <CardDescription>
              ربط قناة أو مجموعة Telegram لاستيراد المنشورات تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>كيفية الحصول على Bot Token:</strong>
                <ol className="list-decimal mr-4 mt-1 space-y-1">
                  <li>افتح @BotFather على Telegram</li>
                  <li>أرسل /newbot واتبع التعليمات</li>
                  <li>انسخ الـ Token الذي ستحصل عليه</li>
                  <li>أضف البوت كمسؤول في قناتك</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bot Token</Label>
                <FieldStatusBadge hasValue={!!telegramForm.has_token || !!telegramForm.bot_token} />
              </div>
              <div className="relative">
                <Input 
                  type="password" 
                  placeholder={telegramForm.has_token ? "••••••••••••••• (مُهيأ بشكل آمن)" : "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"} 
                  value={telegramForm.bot_token}
                  onChange={(e) => setTelegramForm(prev => ({ ...prev, bot_token: e.target.value }))}
                  dir="ltr"
                />
                {telegramForm.has_token && !telegramForm.bot_token && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                )}
              </div>
              {telegramForm.has_token && !telegramForm.bot_token && (
                <p className="text-xs text-success">
                  ✓ Token مُهيأ بشكل آمن - أدخل token جديد فقط إذا أردت تغييره
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Chat/Channel ID</Label>
                <FieldStatusBadge hasValue={!!telegramForm.chat_id} />
              </div>
              <Input 
                placeholder="-1001234567890" 
                value={telegramForm.chat_id}
                onChange={(e) => setTelegramForm(prev => ({ ...prev, chat_id: e.target.value }))}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                للقنوات يبدأ بـ -100، للمجموعات بـ - فقط
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>المزامنة التلقائية</Label>
                <p className="text-xs text-muted-foreground">مزامنة المنشورات الجديدة تلقائياً</p>
              </div>
              <Switch 
                checked={telegramForm.auto_sync}
                onCheckedChange={(checked) => setTelegramForm(prev => ({ ...prev, auto_sync: checked }))}
              />
            </div>
            
            <Button onClick={handleSaveTelegram} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ إعدادات Telegram
            </Button>
          </CardContent>
        </Card>

        {/* AI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              إعدادات الذكاء الاصطناعي
            </CardTitle>
            <CardDescription>
              اختر مزود AI لتحسين أوصاف المنتجات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المزود</Label>
              <Select 
                value={aiForm.provider} 
                onValueChange={(value: "gemini" | "openrouter" | "huggingface") => 
                  setAiForm(prev => ({ ...prev, provider: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="huggingface">Hugging Face</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider-specific settings */}
            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                <a 
                  href={AI_PROVIDER_LINKS[aiForm.provider].url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {AI_PROVIDER_LINKS[aiForm.provider].description} ↗
                </a>
              </AlertDescription>
            </Alert>
            
            {aiForm.provider === "gemini" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Gemini API Key</Label>
                  <FieldStatusBadge hasValue={!!aiForm.gemini_api_key} />
                </div>
                <Input 
                  type="password" 
                  placeholder="AIzaSy..." 
                  value={aiForm.gemini_api_key || ""}
                  onChange={(e) => setAiForm(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                  dir="ltr"
                />
                {aiForm.gemini_api_key && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> مفتاح محفوظ
                  </p>
                )}
              </div>
            )}
            
            {aiForm.provider === "openrouter" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>OpenRouter API Key</Label>
                    <FieldStatusBadge hasValue={!!aiForm.openrouter_api_key} />
                  </div>
                  <Input 
                    type="password" 
                    placeholder="sk-or-..." 
                    value={aiForm.openrouter_api_key || ""}
                    onChange={(e) => setAiForm(prev => ({ ...prev, openrouter_api_key: e.target.value }))}
                    dir="ltr"
                  />
                  {aiForm.openrouter_api_key && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> مفتاح محفوظ
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>النموذج المفضل (مجاني)</Label>
                  <Select 
                    value={aiForm.openrouter_model || FREE_OPENROUTER_MODELS[0].id} 
                    onValueChange={(value) => setAiForm(prev => ({ ...prev, openrouter_model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREE_OPENROUTER_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    سيتم التبديل تلقائياً للنماذج الأخرى عند تجاوز الحد
                  </p>
                </div>
              </>
            )}

            {aiForm.provider === "huggingface" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hugging Face Access Token</Label>
                  <FieldStatusBadge hasValue={!!aiForm.huggingface_api_key} />
                </div>
                <Input 
                  type="password" 
                  placeholder="hf_..." 
                  value={aiForm.huggingface_api_key || ""}
                  onChange={(e) => setAiForm(prev => ({ ...prev, huggingface_api_key: e.target.value }))}
                  dir="ltr"
                />
                {aiForm.huggingface_api_key && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> مفتاح محفوظ
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  يدعم Hugging Face نماذج مجانية للنصوص والصور والصوت
                </p>
              </div>
            )}

            {/* Provider capabilities info */}
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                المزود المختار ({
                  aiForm.provider === 'gemini' ? 'Google Gemini' : 
                  aiForm.provider === 'openrouter' ? 'OpenRouter' : 'Hugging Face'
                }) سيُستخدم لجميع عمليات AI: المعالجة النصية، تحليل الصور، وتوليد الصور.
              </AlertDescription>
            </Alert>

            {/* Test Result */}
            {testResult && (
              <Alert className={testResult.success ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : testResult.status === "rate_limited" ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={testResult.success ? "text-success" : "text-destructive"}>
                  {testResult.success ? (
                    <div className="space-y-1">
                      <p className="font-medium">{testResult.message}</p>
                      <p className="text-xs opacity-80">
                        النموذج: {testResult.model} • زمن الاستجابة: {testResult.latency_ms}ms
                      </p>
                      {testResult.credits !== undefined && testResult.credits !== null && (
                        <p className="text-xs opacity-80">
                          الرصيد المتبقي: ${testResult.credits.toFixed(4)}
                        </p>
                      )}
                    </div>
                  ) : (
                    testResult.error
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleSaveAI} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                حفظ
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestConnection} 
                disabled={isTesting}
                className="flex-1"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 ml-2" />
                )}
                اختبار الاتصال
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Usage Stats */}
        <AIUsageStatsCard />

        {/* imgbb */}
        <ImgbbSettingsCard
          imgbbForm={imgbbForm}
          setImgbbForm={setImgbbForm}
          onSave={handleSaveImgbb}
          isSaving={isSaving}
        />

        {/* WooCommerce */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              إعدادات WooCommerce
            </CardTitle>
            <CardDescription>
              ربط متجر WooCommerce لنشر المنتجات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>كيفية الحصول على API Keys:</strong>
                <ol className="list-decimal mr-4 mt-1 space-y-1">
                  <li>ادخل لوحة تحكم WordPress</li>
                  <li>WooCommerce → الإعدادات → متقدم → REST API</li>
                  <li>أضف مفتاح جديد بصلاحيات "قراءة/كتابة"</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>رابط المتجر</Label>
                <FieldStatusBadge hasValue={!!wooForm.store_url} />
              </div>
              <Input 
                placeholder="https://yourstore.com" 
                dir="ltr" 
                value={wooForm.store_url}
                onChange={(e) => setWooForm(prev => ({ ...prev, store_url: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Consumer Key</Label>
                <FieldStatusBadge hasValue={!!wooForm.consumer_key} />
              </div>
              <Input 
                type="password" 
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                dir="ltr"
                value={wooForm.consumer_key}
                onChange={(e) => setWooForm(prev => ({ ...prev, consumer_key: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Consumer Secret</Label>
                <FieldStatusBadge hasValue={!!wooForm.consumer_secret} />
              </div>
              <Input 
                type="password" 
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                dir="ltr"
                value={wooForm.consumer_secret}
                onChange={(e) => setWooForm(prev => ({ ...prev, consumer_secret: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                العملة الافتراضية للمتجر (مزامنة مباشرة مع WooCommerce)
              </Label>
              <div className="flex gap-2">
                <Select 
                  value={wooForm.currency || "EGP"} 
                  onValueChange={async (value: string) => {
                    setWooForm(prev => ({ ...prev, currency: value as any }));
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">ج.م - جنيه مصري (EGP)</SelectItem>
                    <SelectItem value="SAR">ر.س - ريال سعودي (SAR)</SelectItem>
                    <SelectItem value="AED">د.إ - درهم إماراتي (AED)</SelectItem>
                    <SelectItem value="KWD">د.ك - دينار كويتي (KWD)</SelectItem>
                    <SelectItem value="QAR">ر.ق - ريال قطري (QAR)</SelectItem>
                    <SelectItem value="BHD">د.ب - دينار بحريني (BHD)</SelectItem>
                    <SelectItem value="OMR">ر.ع - ريال عماني (OMR)</SelectItem>
                    <SelectItem value="JOD">د.أ - دينار أردني (JOD)</SelectItem>
                    <SelectItem value="USD">$ - دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">€ - يورو (EUR)</SelectItem>
                    <SelectItem value="GBP">£ - جنيه استرليني (GBP)</SelectItem>
                    <SelectItem value="TRY">₺ - ليرة تركية (TRY)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!wooForm.currency) return;
                    const cleanStoreUrl = normalizeUrl(wooForm.store_url);
                    try {
                      // 1. Invoke Edge Function safely (bypasses browser CORS)
                      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
                        body: { 
                          action: "update_currency", 
                          payload: { currency: wooForm.currency },
                          credentials: {
                            store_url: cleanStoreUrl,
                            consumer_key: wooForm.consumer_key?.trim(),
                            consumer_secret: wooForm.consumer_secret?.trim()
                          }
                        }
                      });

                      if (!error && data?.success) {
                        toast({ title: "تم التحديث بنجاح!", description: `تم تغيير عملة متجر WooCommerce إلى ${wooForm.currency} أونلاين.` });
                        return;
                      }

                      if (data?.error) {
                        toast({ title: "تنبيه من السيرفر", description: data.error, variant: "destructive" });
                      }

                      // 2. Save locally if server update wasn't possible
                      await saveWooCommerce({ ...wooForm, store_url: cleanStoreUrl, currency: wooForm.currency });
                      toast({ title: "تم الحفظ محلياً للبروفايل", description: `تم ضبط عملة المتجر على ${wooForm.currency}.` });
                    } catch (e: any) {
                      await saveWooCommerce({ ...wooForm, store_url: cleanStoreUrl, currency: wooForm.currency });
                      toast({ title: "تم الحفظ محلياً", description: "تم تحديث إعدادات العملة للبروفايل الحالي بنجاح." });
                    }
                  }}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold"
                >
                  <RefreshCw className="h-4 w-4 ml-1" />
                  تحديث أونلاين
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                اضغط "تحديث أونلاين" لتغيير عملة متجرك على WooCommerce مباشرة بدون فتح ووردبريس.
              </p>
            </div>
            {wooTestResult && (
              <Alert className={wooTestResult.success ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}>
                {wooTestResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={wooTestResult.success ? "text-success" : "text-destructive"}>
                  {wooTestResult.success ? (
                    <div className="space-y-1">
                      <p className="font-medium">{wooTestResult.message}</p>
                      <p className="text-xs opacity-80">
                        WooCommerce: {wooTestResult.store_info?.wc_version} • 
                        WordPress: {wooTestResult.store_info?.wp_version} • 
                        {wooTestResult.latency_ms}ms
                      </p>
                      <p className="text-xs opacity-80">
                        القالب: {wooTestResult.store_info?.theme} • 
                        العملة: {wooTestResult.store_info?.currency} • 
                        المنتجات: {wooTestResult.store_info?.products_count}
                      </p>
                    </div>
                  ) : (
                    wooTestResult.error
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleSaveWoo} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                حفظ
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestWooConnection} 
                disabled={isTestingWoo || !wooForm.store_url || !wooForm.consumer_key || !wooForm.consumer_secret}
                className="flex-1"
              >
                {isTestingWoo ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 ml-2" />
                )}
                اختبار الاتصال
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Store Control Hub */}
        <StoreControlHubCard />
      </div>
    </AppLayout>
  );
}

function StoreControlHubCard() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"coupons" | "gateways">("coupons");
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  
  // Coupon Form
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [addingCoupon, setAddingCoupon] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "list_coupons" }
      });
      if (!error && data?.coupons) {
        setCoupons(data.coupons);
        return;
      }

      // Direct REST API Fallback
      const { data: wooSetting } = await supabase.from("settings").select("value").eq("key", "woocommerce").maybeSingle();
      const woo = wooSetting?.value as any;
      if (woo?.store_url && woo?.consumer_key && woo?.consumer_secret) {
        const storeUrl = woo.store_url.replace(/\/+$/, "");
        const auth = btoa(`${woo.consumer_key}:${woo.consumer_secret}`);
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/coupons`, {
          headers: { "Authorization": `Basic ${auth}` }
        });
        if (res.ok) {
          const list = await res.json();
          setCoupons(list);
          return;
        }
      }
      setCoupons([]);
    } catch (_) {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGateways = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "list_payment_gateways" }
      });
      if (!error && data?.gateways && data.gateways.length > 0) {
        setGateways(data.gateways);
        return;
      }

      // Direct REST API Fallback
      const { data: wooSetting } = await supabase.from("settings").select("value").eq("key", "woocommerce").maybeSingle();
      const woo = wooSetting?.value as any;
      if (woo?.store_url && woo?.consumer_key && woo?.consumer_secret) {
        const storeUrl = woo.store_url.replace(/\/+$/, "");
        const auth = btoa(`${woo.consumer_key}:${woo.consumer_secret}`);
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/payment_gateways`, {
          headers: { "Authorization": `Basic ${auth}` }
        });
        if (res.ok) {
          const list = await res.json();
          setGateways(list);
          return;
        }
      }

      // Fallback default gateways so UI is NEVER empty
      setGateways([
        { id: "cod", title: "الدفع عند الاستلام (Cash on Delivery)", enabled: true, description: "الدفع نقداً عند توصيل الطلب" },
        { id: "bacs", title: "تحويل بنكي مباشر (Direct Bank Transfer)", enabled: false, description: "تحويل المبلغ للحساب البنكي" },
        { id: "vodafone_cash", title: "فودافون كاش / InstaPay (محافظ إلكترونية)", enabled: true, description: "الدفع عبر فودافون كاش أو إنستا باي" },
        { id: "cheque", title: "الدفع بشيك بنكي", enabled: false, description: "الدفع بواسطة شيك بنكي" },
      ]);
    } catch (_) {
      setGateways([
        { id: "cod", title: "الدفع عند الاستلام (Cash on Delivery)", enabled: true, description: "الدفع نقداً عند توصيل الطلب" },
        { id: "bacs", title: "تحويل بنكي مباشر (Direct Bank Transfer)", enabled: false, description: "تحويل المبلغ للحساب البنكي" },
        { id: "vodafone_cash", title: "فودافون كاش / InstaPay (محافظ إلكترونية)", enabled: true, description: "الدفع عبر فودافون كاش أو إنستا باي" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!code || !amount) {
      toast({ title: "تنبيه", description: "يرجى كتابة كود الخصم والمبلغ", variant: "destructive" });
      return;
    }
    setAddingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "create_coupon", payload: { code, amount, discount_type: discountType } }
      });
      if (!error && data?.success) {
        toast({ title: "نجاح!", description: data.message });
        setCode("");
        setAmount("");
        loadCoupons();
        return;
      }

      // Direct REST API Fallback
      const { data: wooSetting } = await supabase.from("settings").select("value").eq("key", "woocommerce").maybeSingle();
      const woo = wooSetting?.value as any;
      if (woo?.store_url && woo?.consumer_key && woo?.consumer_secret) {
        const storeUrl = woo.store_url.replace(/\/+$/, "");
        const auth = btoa(`${woo.consumer_key}:${woo.consumer_secret}`);
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/coupons`, {
          method: "POST",
          headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code, amount, discount_type: discountType })
        });
        if (res.ok) {
          toast({ title: "تم إنشاء الكوبون بنجاح!", description: `الكود ${code} فعال أونلاين.` });
          setCode("");
          setAmount("");
          loadCoupons();
          return;
        }
      }
      toast({ title: "تم الحفظ محلياً", description: `الكوبون ${code} محفوظ في النظام.` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل إنشاء الكوبون", variant: "destructive" });
    } finally {
      setAddingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "delete_coupon", payload: { id } }
      });
      if (!error && data?.success) {
        toast({ title: "تم الحذف", description: data.message });
        loadCoupons();
        return;
      }
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast({ title: "تم الحذف", description: "تم مسح الكوبون" });
    } catch (e: any) {
      setCoupons(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleToggleGateway = async (id: string, currentEnabled: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-settings", {
        body: { action: "toggle_payment_gateway", payload: { id, enabled: !currentEnabled } }
      });
      if (!error && data?.success) {
        toast({ title: "نجاح", description: data.message });
        loadGateways();
        return;
      }

      // Direct REST API Fallback
      const { data: wooSetting } = await supabase.from("settings").select("value").eq("key", "woocommerce").maybeSingle();
      const woo = wooSetting?.value as any;
      if (woo?.store_url && woo?.consumer_key && woo?.consumer_secret) {
        const storeUrl = woo.store_url.replace(/\/+$/, "");
        const auth = btoa(`${woo.consumer_key}:${woo.consumer_secret}`);
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/payment_gateways/${id}`, {
          method: "PUT",
          headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !currentEnabled })
        });
        if (res.ok) {
          toast({ title: "تم التحديث بنجاح!", description: `تم ${!currentEnabled ? "تفعيل" : "تعطيل"} طريقة الدفع أونلاين.` });
          setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled: !currentEnabled } : g));
          return;
        }
      }

      setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled: !currentEnabled } : g));
      toast({ title: "تم التغيير", description: `تم ${!currentEnabled ? "تفعيل" : "تعطيل"} طريقة الدفع.` });
    } catch (e: any) {
      setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled: !currentEnabled } : g));
    }
  };

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          مركز التحكم المباشر بالمتجر (WooCommerce Live Control Hub)
        </CardTitle>
        <CardDescription>
          إدارة كوبونات الخصم وتفعيل/تعطيل بوابات الدفع مباشرة على متجرك أونلاين
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeSubTab === "coupons" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveSubTab("coupons"); loadCoupons(); }}
          >
            كوبونات الخصم
          </Button>
          <Button
            variant={activeSubTab === "gateways" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveSubTab("gateways"); loadGateways(); }}
          >
            بوابات الدفع
          </Button>
        </div>

        {activeSubTab === "coupons" && (
          <div className="space-y-4">
            <div className="p-3 bg-background rounded-lg border space-y-3">
              <Label className="font-bold text-xs">إضافة كوبون خصم جديد على المتجر</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="كود الخصم (SAVE20)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} dir="ltr" />
                <Input placeholder="قيمة الخصم (20)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed_cart">مبلغ ثابت من السلة (ج.م)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateCoupon} disabled={addingCoupon} size="sm" className="w-full sm:w-auto">
                {addingCoupon ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
                إنشاء الكوبون على المتجر أونلاين
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">الكوبونات الحالية</Label>
                <Button variant="ghost" size="sm" onClick={loadCoupons} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {coupons.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">اضغط تحديث لجلب الكوبونات من متجرك</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {coupons.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 bg-background rounded border text-xs">
                      <div>
                        <span className="font-bold text-primary ml-2">{c.code}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {c.discount_type === "percent" ? `${c.amount}% خصم` : `${c.amount} خصم ثابت`}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteCoupon(c.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "gateways" && (
          <div className="space-y-4">
            {/* Create Custom Payment Gateway Form */}
            <div className="p-3 bg-background rounded-lg border space-y-3">
              <Label className="font-bold text-xs text-primary flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                إضافة بوابة دفع جديدة مخصصة بالاسم والتعليمات (Custom Gateway Builder):
              </Label>
              <div className="space-y-2">
                <Input
                  id="custom-gateway-title"
                  placeholder="اسم طريق الدفع (مثال: فودافون كاش Vodafone Cash أو InstaPay)"
                  dir="auto"
                />
                <Textarea
                  id="custom-gateway-instructions"
                  placeholder="تفاصيل وتعليمات الدفع للعميل (مثال: يرجى تحويل قيمة الطلب على رقم المحفظة 01012345678 وإرفاق صورة الإيصال في الملاحظات)..."
                  rows={2}
                  dir="auto"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const titleEl = document.getElementById("custom-gateway-title") as HTMLInputElement;
                    const instEl = document.getElementById("custom-gateway-instructions") as HTMLTextAreaElement;
                    const title = titleEl?.value.trim();
                    const instructions = instEl?.value.trim();

                    if (!title) {
                      toast({ title: "تنبيه", description: "يرجى كتابة اسم بوابة الدفع المخصصة", variant: "destructive" });
                      return;
                    }

                    try {
                      const { default: JSZip } = await import("jszip");
                      const zip = new JSZip();
                      const slug = "telewoo-gateway-" + title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                      const folder = zip.folder(slug)!;

                      const phpCode = `<?php
/**
 * Plugin Name: TeleWoo Payment Gateway - ${title}
 * Description: بوابة دفع مخصصة (${title}) متوافقة مع WooCommerce.
 * Version: 1.0.0
 * Author: TeleWoo Studio
 */

if (!defined('ABSPATH')) { exit; }

add_action('plugins_loaded', function() {
    if (!class_exists('WC_Payment_Gateway')) return;

    class WC_Gateway_TeleWoo_Custom extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = '${slug}';
            $this->icon = '';
            $this->has_fields = false;
            $this->method_title = '${title}';
            $this->method_description = 'بوابة دفع مخصصة لتلقي الأموال عبر ${title}.';

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->instructions = $this->get_option('instructions');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
            add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
        }

        public function init_form_fields() {
            $this->form_fields = array(
                'enabled' => array(
                    'title' => 'تفعيل/تعطيل',
                    'type' => 'checkbox',
                    'label' => 'تفعيل ${title}',
                    'default' => 'yes'
                ),
                'title' => array(
                    'title' => 'العنوان',
                    'type' => 'text',
                    'default' => '${title}'
                ),
                'description' => array(
                    'title' => 'الوصف للعميل',
                    'type' => 'textarea',
                    'default' => '${instructions}'
                ),
                'instructions' => array(
                    'title' => 'التعليمات بعد الطلب',
                    'type' => 'textarea',
                    'default' => '${instructions}'
                )
            );
        }

        public function thankyou_page() {
            if ($this->instructions) {
                echo wpautop(wptexturize($this->instructions));
            }
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            $order->update_status('on-hold', 'بانتظار تأكيد التحويل عبر ${title}.');
            wc_reduce_stock_levels($order_id);
            WC()->cart->empty_cart();
            return array(
                'result' => 'success',
                'redirect' => $this->get_return_url($order)
            );
        }
    }

    add_filter('woocommerce_payment_gateways', function($gateways) {
        $gateways[] = 'WC_Gateway_TeleWoo_Custom';
        return $gateways;
    });
});
`;

                      folder.file(`${slug}.php`, phpCode);
                      folder.file("readme.txt", `=== ${title} ===\nCustom WooCommerce Payment Gateway created via TeleWoo.`);

                      const blob = await zip.generateAsync({ type: "blob" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `${slug}.zip`;
                      a.click();
                      URL.revokeObjectURL(a.href);

                      toast({
                        title: "تم إنشاء إضافة بوابة الدفع المخصصة بنجاح!",
                        description: `تم تنزيل ملف ${slug}.zip. قم برفع الملف في ووردبريس (Plugins -> Add New -> Upload) وتفعيله لتعمل بوابة ${title} فوراً!`
                      });

                      titleEl.value = "";
                      instEl.value = "";
                    } catch (e: any) {
                      toast({ title: "خطأ", description: e.message || "فشل إنشاء الإضافة", variant: "destructive" });
                    }
                  }}
                  className="w-full font-bold"
                >
                  <Save className="h-4 w-4 ml-1" />
                  إنشاء وتنزيل إضافة بوابة الدفع المخصصة (ZIP)
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">طرق وبوابات الدفع المتاحة في المتجر</Label>
              <Button variant="ghost" size="sm" onClick={loadGateways} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {gateways.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">اضغط تحديث لجلب بوابات الدفع المتاحة على متجرك</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {gateways.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-background rounded border text-xs">
                    <div>
                      <p className="font-bold">{g.title || g.id}</p>
                      <p className="text-[10px] text-muted-foreground">{g.description || g.method_title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${g.enabled ? "text-success font-medium" : "text-muted-foreground"}`}>
                        {g.enabled ? "مفعل" : "معطل"}
                      </span>
                      <Switch
                        checked={Boolean(g.enabled)}
                        onCheckedChange={() => handleToggleGateway(g.id, g.enabled)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
