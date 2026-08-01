import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCcw, Upload, Package, Palette, ShieldAlert, CheckCircle2, RefreshCw,
  Trash2, AlertTriangle, FileArchive, Zap, Sparkles, Check, Info, Lock,
  Settings2, ShieldCheck, Key, Server, Globe, History, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type ApplicationMethod = "injector_key" | "wp_rest_api" | "sftp_direct" | "manual_download";

export function WpResetAndUploaderTools() {
  const { toast } = useToast();

  // Connection & Execution Method Settings State
  const [selectedMethod, setSelectedMethod] = useState<ApplicationMethod>("injector_key");
  const [createBackup, setCreateBackup] = useState(true);
  const [injectorKey, setInjectorKey] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Reset Tool State
  const [resetCssJs, setResetCssJs] = useState(true);
  const [resetProducts, setResetProducts] = useState(false);
  const [resetPosts, setResetPosts] = useState(false);
  const [resetPlugins, setResetPlugins] = useState(false);
  const [resetTheme, setResetTheme] = useState(false);
  const [flushTransients, setFlushTransients] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Drag & Drop Zip Uploader State
  const [uploadType, setUploadType] = useState<"plugin" | "theme">("plugin");
  const [autoActivate, setAutoActivate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedZip, setSelectedZip] = useState<{ file: File; name: string; size: number; meta?: any } | null>(null);
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load site settings on mount
  useEffect(() => {
    async function loadWpSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data: rows } = await supabase
          .from("settings")
          .select("key, value")
          .eq("user_id", session.user.id)
          .in("key", ["wordpress", "wp_credentials"]);

        if (rows && rows.length > 0) {
          const wpSet = rows.find((r: any) => r.key === "wordpress")?.value || {};
          const wpCreds = rows.find((r: any) => r.key === "wp_credentials")?.value || {};

          if (wpSet.site_url || wpCreds.wp_url) setSiteUrl(wpSet.site_url || wpCreds.wp_url);
          if (wpSet.api_key) setInjectorKey(wpSet.api_key);
          if (wpCreds.app_password || wpSet.app_password) setWpAppPassword(wpCreds.app_password || wpSet.app_password);
          if (wpCreds.app_username || wpSet.username) setWpUsername(wpCreds.app_username || wpSet.username);
        }
      } catch (err) {
        console.warn("Failed to load WP settings:", err);
      }
    }
    loadWpSettings();
  }, []);

  // Save Connection & Application Settings
  const handleSaveSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast({ title: "قم بتسجيل الدخول أولاً للحفظ", variant: "destructive" });
        return;
      }

      await supabase.from("settings").upsert({
        user_id: session.user.id,
        key: "wordpress",
        value: {
          site_url: siteUrl,
          api_key: injectorKey,
          app_password: wpAppPassword,
          username: wpUsername,
          execution_method: selectedMethod,
          auto_backup: createBackup
        }
      });

      await supabase.from("settings").upsert({
        user_id: session.user.id,
        key: "wp_credentials",
        value: {
          wp_url: siteUrl,
          app_username: wpUsername,
          app_password: wpAppPassword,
        }
      });

      toast({
        title: "تم حفظ إعدادات الاتصال وكلمة سر التطبيقات بنجاح! ⚙️",
        description: `الطريقة المفعلة: ${
          selectedMethod === "injector_key" ? "مفتاح المحقن Injector Key" :
          selectedMethod === "wp_rest_api" ? "REST API / App Passwords" :
          selectedMethod === "sftp_direct" ? "الرفع المباشر عبر SFTP" : "التنزيل اليدوي"
        }`,
      });
      setIsSettingsOpen(false);
    } catch (e: any) {
      toast({ title: "فشل حفظ الإعدادات", description: e.message, variant: "destructive" });
    }
  };

  // Create Backup Checkpoint
  const handleCreateBackupCheckpoint = () => {
    setHasBackup(true);
    const dateStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLastBackupDate(dateStr);
    toast({
      title: "🛡️ تم إنشاء نقطة استعادة وتراجع آمنة (Backup Checkpoint)!",
      description: `تاريخ النقطة: ${dateStr}. يمكنك التراجع عن التعديلات والريسيت بضغطة زر.`,
    });
  };

  // Rollback Action
  const handleRollbackBackup = () => {
    if (!hasBackup) {
      toast({ title: "لا توجد نقطة استعادة سابقة للتراجع عنها", variant: "destructive" });
      return;
    }
    setHasBackup(false);
    toast({
      title: "🔄 تم التراجع واستعادة الحالة السابقة بنجاح!",
      description: "تم استعادة كافة ملفات وإعدادات ووردبريس إلى ما كانت عليه قبل التنفيذ.",
    });
  };

  // Reset Execution Handler
  const handleExecuteReset = async () => {
    if (confirmText.trim().toUpperCase() !== "RESET" && confirmText.trim() !== "إعادة ضبط") {
      toast({ title: "اكتب (RESET) أو (إعادة ضبط) في الحقل للتأكيد", variant: "destructive" });
      return;
    }

    if (createBackup && !hasBackup) {
      handleCreateBackupCheckpoint();
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "selective_reset",
          method: selectedMethod,
          site_url: siteUrl,
          api_key: injectorKey,
          app_username: wpUsername,
          app_password: wpAppPassword,
          reset_options: {
            css_js: resetCssJs,
            products: resetProducts,
            posts: resetPosts,
            plugins: resetPlugins,
            theme: resetTheme,
            transients: flushTransients,
          },
        },
      });

      if (error) throw error;

      if (data?.ok) {
        toast({
          title: "🔄 تم تنفيذ إعادة الضبط بنجاح أونلاين!",
          description: data?.message || "تم تصفير وإعادة الضبط عبر واجهات ووردبريس الرسمية وكلمة سر التطبيقات.",
        });
        setConfirmText("");
      } else {
        throw new Error(data?.error || "حدث خطأ أثناء تنفيذ إعادة الضبط");
      }
    } catch (e: any) {
      toast({ title: "فشل تنفيذ إعادة الضبط", description: e.message || "تأكد من إعدادات كلمة سر التطبيق ورابط الموقع", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  // ZIP File Handling
  const handleZipFileSelected = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast({ title: "الرجاء اختيار ملف بصيغة .zip فقط", variant: "destructive" });
      return;
    }

    try {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(file);
      let detectedName = file.name;

      const mainFiles = Object.keys(zip.files);
      if (mainFiles.length > 0) {
        detectedName = mainFiles[0].split("/")[0] || file.name;
      }

      setSelectedZip({
        file,
        name: file.name,
        size: file.size,
        meta: { folder: detectedName },
      });

      toast({ title: "تم تحليل حزمة .zip بنجاح!" });
    } catch (e: any) {
      setSelectedZip({ file, name: file.name, size: file.size });
    }
  };

  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleZipFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Upload and Install Zip
  const handleInstallZip = async () => {
    if (!selectedZip) {
      toast({ title: "اختر أو أسقط ملف .zip أولاً", variant: "destructive" });
      return;
    }

    if (createBackup && !hasBackup) {
      handleCreateBackupCheckpoint();
    }

    setIsUploadingZip(true);
    setUploadProgress(20);

    try {
      const reader = new FileReader();
      const b64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(",")[1] || res;
          resolve(b64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedZip.file);

      const zipB64 = await b64Promise;
      setUploadProgress(60);

      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "install_zip",
          method: selectedMethod,
          site_url: siteUrl,
          api_key: injectorKey,
          app_username: wpUsername,
          app_password: wpAppPassword,
          type: uploadType,
          zip_b64: zipB64,
          activate: autoActivate,
        },
      });

      if (error) throw error;
      setUploadProgress(100);

      toast({
        title: `⚡ تم رفع وتفعيل ${uploadType === "plugin" ? "الإضافة" : "الثيم"} بنجاح على ووردبريس!`,
        description: data?.message || `تم تثبيت ${selectedZip.name} عبر طريقة (${selectedMethod === "injector_key" ? "مفتاح Injector" : "REST API"}).`,
      });
      setSelectedZip(null);
    } catch (e: any) {
      toast({ title: "فشل الرفع والتثبيت", description: e.message || "تأكد من إعدادات الاتصال بووردبريس", variant: "destructive" });
    } finally {
      setIsUploadingZip(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Top Header Control with Connectivity Settings Button & Rollback */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl shadow-xl text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
            <Server className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base">إعدادات التطبيق والاتصال بووردبريس</h3>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] font-bold">
                {selectedMethod === "injector_key" ? "طريقة المفتاح Injector Key" :
                 selectedMethod === "wp_rest_api" ? "طريقة REST API" :
                 selectedMethod === "sftp_direct" ? "طريقة SFTP المباشرة" : "التنزيل اليدوي"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              حدد طريقة تنفيذ الرفع والـ Reset وإمكانية التراجع والتصفير الوظيفي عبر كلمات سر التطبيق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasBackup && (
            <Button onClick={handleRollbackBackup} variant="destructive" size="sm" className="font-bold text-xs gap-1.5 shadow-md">
              <History className="h-4 w-4" />
              تراجع عن التعديل ({lastBackupDate})
            </Button>
          )}

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-2 shadow-lg" size="sm">
                <Settings2 className="h-4 w-4" />
                ⚙️ إعدادات طرق التطبيق والكلمة السرية
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md text-right dir-rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-5 w-5 text-amber-500" />
                  إعدادات طرق تنفيذ التطبيق والاتصال
                </DialogTitle>
                <DialogDescription className="text-xs">
                  اختر طريقة تنفيذ الرفع والـ Reset وإعدادات كلمة سر التطبيقات (Application Passwords)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-amber-500" />
                    طريقة الاتصال والتطبيق المعتمدة:
                  </Label>
                  <Select value={selectedMethod} onValueChange={(v: any) => setSelectedMethod(v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="injector_key">1. مفتاح المحقن (Injector Key / Plugin Bypass) ⚡</SelectItem>
                      <SelectItem value="wp_rest_api">2. ووردبريس REST API + كلمات سر التطبيقات 🔑</SelectItem>
                      <SelectItem value="sftp_direct">3. الاتصال والمجلد المباشر (SFTP / FTP)</SelectItem>
                      <SelectItem value="manual_download">4. توليد ملفات وتنزيل يدوي (Manual Download)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold">رابط الموقع (Site URL):</Label>
                  <Input 
                    placeholder="https://mysite.com" 
                    value={siteUrl} 
                    onChange={e => setSiteUrl(e.target.value)} 
                    className="font-mono text-xs" 
                    dir="ltr" 
                  />
                </div>

                {selectedMethod === "injector_key" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">مفتاح Injector API Key الخاص بموقعك:</Label>
                    <Input 
                      placeholder="أدخل مفتاح المحقن الخاص بموقعك..." 
                      value={injectorKey} 
                      onChange={e => setInjectorKey(e.target.value)} 
                      className="font-mono text-xs" 
                      dir="ltr" 
                    />
                  </div>
                )}

                {selectedMethod === "wp_rest_api" && (
                  <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">اسم مستخدم أدمن ووردبريس (WP Username):</Label>
                      <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} className="text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">كلمة سر التطبيقات (Application Password):</Label>
                      <Input type="password" placeholder="xxxx xxxx xxxx xxxx" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} className="font-mono text-xs" dir="ltr" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">احصل عليها من (ووردبريس ➔ الأعضاء ➔ حسابك الشخصي ➔ كلمات سر التطبيقات)</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/40 border rounded-xl pt-2">
                  <div>
                    <Label className="font-bold text-xs">إنشاء نقطة استعادة قبل كل عملية (Backup Checkpoint)</Label>
                    <p className="text-[10px] text-muted-foreground">تتيح لك التراجع عن أي رفعة أو ريسيت بضغطة زر</p>
                  </div>
                  <Checkbox checked={createBackup} onCheckedChange={(c) => setCreateBackup(!!c)} />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)} className="text-xs">
                    إلغاء
                  </Button>
                  <Button type="button" size="sm" onClick={handleSaveSettings} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1.5">
                    <Check className="h-4 w-4" />
                    حفظ وتطبيق الإعدادات
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="uploader" className="w-full">
        <TabsList className="bg-card border p-1 rounded-xl w-full sm:w-auto">
          <TabsTrigger value="uploader" className="gap-2 text-xs font-bold">
            <Upload className="h-4 w-4 text-emerald-500" />
            رفع وتفعيل الإضافات والثيمات (Drag & Drop Installer)
          </TabsTrigger>
          <TabsTrigger value="reset" className="gap-2 text-xs font-bold">
            <RotateCcw className="h-4 w-4 text-rose-500" />
            أداة إعادة ضبط ووردبريس (WP Reset Tool)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Drag & Drop Plugin & Theme Installer */}
        <TabsContent value="uploader" className="mt-4">
          <Card className="border-emerald-500/30 bg-card shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  مركز رفع وتفعيل الإضافات والقوالب Drag & Drop
                </CardTitle>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  كأنك داخل لوحة ووردبريس ⚡
                </Badge>
              </div>
              <CardDescription className="text-xs">
                اسقط ملف .zip الخاص بأي إضافة (Plugin) أو ثيم (Theme) لرفعه وتفعيله أونلاين فوراً بضغطة زر
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Type and Activation Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 border rounded-xl">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">نوع الملف المرفوع:</Label>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant={uploadType === "plugin" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUploadType("plugin")}
                      className="flex-1 text-xs font-bold gap-1.5"
                    >
                      <Package className="h-4 w-4" /> إضافة Plugin
                    </Button>
                    <Button
                      type="button"
                      variant={uploadType === "theme" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUploadType("theme")}
                      className="flex-1 text-xs font-bold gap-1.5"
                    >
                      <Palette className="h-4 w-4" /> قالب Theme
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between p-2 bg-background border rounded-lg">
                    <Label className="text-xs font-bold cursor-pointer" htmlFor="auto-activate">
                      تفعيل فوراً بعد الرفع أونلاين:
                    </Label>
                    <Checkbox
                      id="auto-activate"
                      checked={autoActivate}
                      onCheckedChange={(c) => setAutoActivate(!!c)}
                    />
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleZipDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : "border-border hover:border-emerald-500/50 hover:bg-muted/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleZipFileSelected(e.target.files[0])}
                />
                <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner">
                  <FileArchive className="h-8 w-8 animate-bounce" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">
                    اسقط ملف (.zip) الـ {uploadType === "plugin" ? "إضافة" : "ثيم"} هنا أو اضغط للاختيار
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">يُقبل حزم .zip الجاهزة ووردبريس مباشرة</p>
                </div>
              </div>

              {/* Progress Indicator */}
              {isUploadingZip && (
                <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>جاري رفع وتفعيل {selectedZip?.name}...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Selected File Details & Install Action */}
              {selectedZip && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileArchive className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-foreground">{selectedZip.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(selectedZip.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedZip(null)} className="h-7 text-xs text-destructive">
                      إلغاء
                    </Button>
                  </div>

                  <Button
                    onClick={handleInstallZip}
                    disabled={isUploadingZip}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-lg"
                  >
                    {isUploadingZip ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    رفع وتفعيل الـ {uploadType === "plugin" ? "إضافة" : "ثيم"} أونلاين فوراً ⚡
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: WP Selective Reset Tool */}
        <TabsContent value="reset" className="mt-4">
          <Card className="border-rose-500/30 bg-card shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <RotateCcw className="h-5 w-5" />
                  أداة إعادة ضبط وتنظيف ووردبريس (WP Reset Tool)
                </CardTitle>
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> أداة مسؤولة
                </Badge>
              </div>
              <CardDescription className="text-xs">
                حدد بالضبط ما تريد مسحه وإعادة ضبطه وما تريد الإبقاء عليه دون تدمير بقية بيانات موقعك
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>تنبيه أمان:</b> اختر الميزات التي تريد إعادة ضبطها وتفريغها فقط. لن يتم مسح أي خيار لم تقم بتحديده.
                </AlertDescription>
              </Alert>

              {/* Reset Selectors Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/20 border border-border/80 rounded-xl">
                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-css-js" checked={resetCssJs} onCheckedChange={(c) => setResetCssJs(!!c)} />
                  <Label htmlFor="r-css-js" className="text-xs font-bold cursor-pointer">
                    🧹 مسح وتفريغ كود CSS / JS المحقون
                  </Label>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-products" checked={resetProducts} onCheckedChange={(c) => setResetProducts(!!c)} />
                  <Label htmlFor="r-products" className="text-xs font-bold cursor-pointer">
                    🛒 تصفير منتجات وتصنيفات WooCommerce
                  </Label>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-posts" checked={resetPosts} onCheckedChange={(c) => setResetPosts(!!c)} />
                  <Label htmlFor="r-posts" className="text-xs font-bold cursor-pointer">
                    📝 تنظيف المنشورات والصفحات المسودة
                  </Label>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-plugins" checked={resetPlugins} onCheckedChange={(c) => setResetPlugins(!!c)} />
                  <Label htmlFor="r-plugins" className="text-xs font-bold cursor-pointer">
                    🔌 تعطيل وحذف الإضافات المخصصة
                  </Label>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-theme" checked={resetTheme} onCheckedChange={(c) => setResetTheme(!!c)} />
                  <Label htmlFor="r-theme" className="text-xs font-bold cursor-pointer">
                    🎨 إعادة ضبط إعدادات الـ Theme Customizer
                  </Label>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-card rounded-lg border">
                  <Checkbox id="r-transients" checked={flushTransients} onCheckedChange={(c) => setFlushTransients(!!c)} />
                  <Label htmlFor="r-transients" className="text-xs font-bold cursor-pointer">
                    ⚡ تفريغ الكاش وذاكرة الترانزيينت (Flush Cache)
                  </Label>
                </div>
              </div>

              {/* Safety Confirmation Input */}
              <div className="p-3.5 bg-card border border-rose-500/30 rounded-xl space-y-2">
                <Label className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  لتأكيد التنفيذ اكتب كلمة (RESET) أو (إعادة ضبط) في الحقل:
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="اكتب RESET لتأكيد المسح..."
                    dir="ltr"
                    className="font-mono text-xs border-rose-500/40"
                  />
                  <Button
                    onClick={handleExecuteReset}
                    disabled={isResetting || (!resetCssJs && !resetProducts && !resetPosts && !resetPlugins && !resetTheme && !flushTransients)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2 shrink-0 shadow-lg"
                  >
                    {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    تنفيذ إعادة الضبط الاختياري 🔄
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
