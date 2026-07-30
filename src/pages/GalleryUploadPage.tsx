import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Loader2, CheckCircle, AlertTriangle, ImageIcon, Trash2, Copy, ExternalLink, Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";

type Compression = "high" | "medium" | "low";
type UploadTarget = "external" | "wordpress";
const QUALITY_MAP: Record<Compression, number> = { high: 90, medium: 80, low: 60 };
const COMPRESSION_LABELS: Record<Compression, string> = {
  high: "خفيف (جودة 90)",
  medium: "متوسط (جودة 80) - موصى به",
  low: "اقتصادي (جودة 60)",
};

interface UploadItem {
  id: string;
  originalName: string;
  originalSize: number;
  webpBlob: Blob;
  webpSize: number;
  previewUrl: string;
  status: "ready" | "uploading" | "done" | "error";
  uploadedUrl?: string;
  mediaId?: number;
  error?: string;
}

function convertToWebP(file: File, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0);
      c.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (!b) reject(new Error("convert failed"));
        else resolve(b);
      }, "image/webp", quality / 100);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function GalleryUploadPage() {
  const { toast } = useToast();
  const { imgbb } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [compression, setCompression] = useState<Compression>("medium");
  const [askDialogOpen, setAskDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [uploadingAll, setUploadingAll] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>("external");

  // WordPress credentials
  const [wpOpen, setWpOpen] = useState(false);
  const [wpStoreUrl, setWpStoreUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [wpLoaded, setWpLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wp } = await supabase.from("settings").select("value")
        .eq("user_id", user.id).eq("key", "wordpress").maybeSingle();
      const { data: wc } = await supabase.from("settings").select("value")
        .eq("user_id", user.id).eq("key", "woocommerce").maybeSingle();
      const v = (wp?.value || {}) as any;
      const w = (wc?.value || {}) as any;
      setWpStoreUrl(v.store_url || w.store_url || "");
      setWpUsername(v.username || "");
      setWpAppPassword(v.app_password || "");
      setWpLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (imgbb.api_key) setUploadTarget("external");
    else if (wpUsername && wpAppPassword) setUploadTarget("wordpress");
  }, [imgbb.api_key, wpUsername, wpAppPassword]);

  const saveWP = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("settings").upsert({
      user_id: user.id,
      key: "wordpress",
      value: {
        store_url: wpStoreUrl.trim(),
        username: wpUsername.trim(),
        app_password: wpAppPassword.trim(),
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,key" });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم حفظ بيانات WordPress" }); setWpOpen(false); }
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast({ title: "لا توجد صور صالحة", variant: "destructive" });
      return;
    }
    setPendingFiles(arr);
    setAskDialogOpen(true);
  };

  const startConversion = async () => {
    if (!pendingFiles) return;
    setAskDialogOpen(false);
    setConverting(true);
    setProgress({ current: 0, total: pendingFiles.length });
    const quality = QUALITY_MAP[compression];
    const newItems: UploadItem[] = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const f = pendingFiles[i];
      setProgress({ current: i + 1, total: pendingFiles.length });
      try {
        const blob = await convertToWebP(f, quality);
        newItems.push({
          id: `${Date.now()}-${i}`,
          originalName: f.name,
          originalSize: f.size,
          webpBlob: blob,
          webpSize: blob.size,
          previewUrl: URL.createObjectURL(blob),
          status: "ready",
        });
      } catch (e: any) {
        toast({ title: `فشل تحويل ${f.name}`, description: e.message, variant: "destructive" });
      }
    }
    setItems(prev => [...prev, ...newItems]);
    setPendingFiles(null);
    setConverting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadOne = async (item: UploadItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "uploading" } : i));
    try {
      const b64 = await blobToBase64(item.webpBlob);
      const baseName = item.originalName.replace(/\.[^.]+$/, "");
      const filename = `${baseName}.webp`;
      let uploaded: { url?: string; id?: number } | null = null;

      if (uploadTarget === "external") {
        if (!imgbb.api_key) throw new Error("أضف imgbb API Key من الإعدادات أو اختر رفع WordPress");
        const { data, error } = await supabase.functions.invoke("imgbb-upload", {
          body: { image: b64, apiKey: imgbb.api_key },
        });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "فشل الرفع الخارجي");
        uploaded = { url: data.url };
      } else {
        const { data, error } = await supabase.functions.invoke("wp-media-upload", {
          body: {
            filename,
            mime: "image/webp",
            data_base64: b64,
            alt_text: baseName,
            title: baseName,
          },
        });
        if (error) throw new Error(error.message);
        if (!data?.ok) throw new Error(data?.error || "فشل الرفع إلى WordPress");
        uploaded = { url: data.url, id: data.id };
      }

      if (!uploaded?.url) throw new Error("لم يرجع رابط للصورة بعد الرفع");
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, status: "done", uploadedUrl: uploaded.url, mediaId: uploaded.id,
      } : i));
    } catch (e: any) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, status: "error", error: e.message,
      } : i));
    }
  };

  const uploadAll = async () => {
    setUploadingAll(true);
    for (const i of items.filter(x => x.status === "ready")) {
      await uploadOne(i);
    }
    setUploadingAll(false);
    toast({ title: "اكتمل الرفع" });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const it = prev.find(i => i.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "تم النسخ" });
  };

  const readyCount = items.filter(i => i.status === "ready").length;
  const doneCount = items.filter(i => i.status === "done").length;
  const canUpload = uploadTarget === "external" ? Boolean(imgbb.api_key) : Boolean(wpUsername && wpAppPassword);

  return (
    <AppLayout title="أبلود الجاليري">
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  رفع صور الجاليري إلى ميديا الموقع
                </CardTitle>
                <CardDescription>
                  ارفع صورة أو أكثر، يتم تحويلها أوتوماتيكيًا إلى WebP ثم رفعها مباشرة إلى مكتبة ميديا WordPress.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWpOpen(true)}>
                <Settings className="h-4 w-4 ml-1" /> WordPress
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!wpUsername || !wpAppPassword) && wpLoaded && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  اضبط بيانات WordPress أولاً (اسم المستخدم و App Password) للسماح بالرفع إلى الميديا.
                  <Button variant="link" size="sm" className="px-1" onClick={() => setWpOpen(true)}>اضبط الآن</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>طريقة الرفع</Label>
              <RadioGroup value={uploadTarget} onValueChange={(v: UploadTarget) => setUploadTarget(v)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/40">
                  <RadioGroupItem value="external" id="external-upload" />
                  <span className="text-sm">رفع خارجي كرابط مباشر {imgbb.api_key ? "(مفعل)" : "(يحتاج imgbb)"}</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/40">
                  <RadioGroupItem value="wordpress" id="wordpress-upload" />
                  <span className="text-sm">رفع إلى WordPress Media</span>
                </label>
              </RadioGroup>
              {!canUpload && (
                <p className="text-xs text-destructive">
                  {uploadTarget === "external" ? "أضف imgbb API Key من الإعدادات للرفع الخارجي." : "اضبط بيانات WordPress أولاً."}
                </p>
              )}
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); onFilesPicked(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-accent/30 transition"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">اسحب الصور هنا أو اضغط للاختيار</p>
              <p className="text-xs text-muted-foreground mt-1">سيظهر اختيار مستوى الضغط بعد اختيار الصور</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => onFilesPicked(e.target.files)}
              />
            </div>

            {converting && (
              <div className="space-y-2">
                <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} />
                <p className="text-xs text-muted-foreground text-center">
                  جاري التحويل {progress.current} / {progress.total}
                </p>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">إجمالي: {items.length}</Badge>
                  <Badge variant="secondary">جاهز: {readyCount}</Badge>
                  <Badge variant="default">مرفوع: {doneCount}</Badge>
                </div>
                <Button onClick={uploadAll} disabled={uploadingAll || readyCount === 0 || !canUpload}>
                  {uploadingAll ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
                  رفع الكل إلى الميديا
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => (
              <motion.div key={it.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img src={it.previewUrl} alt={it.originalName} className="w-full h-full object-cover" />
                      <Button size="icon" variant="destructive" className="absolute top-1 left-1 h-7 w-7"
                        onClick={() => removeItem(it.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-medium truncate" title={it.originalName}>{it.originalName}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{formatSize(it.originalSize)} → {formatSize(it.webpSize)}</span>
                        <span className="text-success">
                          ({Math.round((1 - it.webpSize / Math.max(it.originalSize, 1)) * 100)}%)
                        </span>
                      </div>
                      {it.status === "done" && it.uploadedUrl && (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="truncate flex-1" title={it.uploadedUrl}>تم الرفع</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyLink(it.uploadedUrl!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                            <a href={it.uploadedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                          </Button>
                        </div>
                      )}
                      {it.status === "error" && (
                        <p className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> {it.error}
                        </p>
                      )}
                      {it.status === "ready" && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => uploadOne(it)} disabled={!canUpload}>
                          <Upload className="h-3.5 w-3.5 ml-1" /> رفع
                        </Button>
                      )}
                      {it.status === "uploading" && (
                        <div className="flex items-center gap-1 text-primary text-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الرفع...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Compression chooser dialog */}
      <Dialog open={askDialogOpen} onOpenChange={setAskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اختر مستوى ضغط WebP</DialogTitle>
            <DialogDescription>
              سيتم تحويل {pendingFiles?.length || 0} صورة. الموصى به: الضغط المتوسط.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={compression} onValueChange={(v: Compression) => setCompression(v)}>
            {(["high", "medium", "low"] as Compression[]).map((c) => (
              <label key={c} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/40">
                <RadioGroupItem value={c} id={c} />
                <span className="text-sm">{COMPRESSION_LABELS[c]}</span>
              </label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAskDialogOpen(false); setPendingFiles(null); }}>إلغاء</Button>
            <Button onClick={startConversion}>تحويل ومتابعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WordPress creds dialog */}
      <Dialog open={wpOpen} onOpenChange={setWpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بيانات WordPress</DialogTitle>
            <DialogDescription>
              مطلوب اسم مستخدم WordPress و كلمة مرور التطبيق (Application Password) من ملفك الشخصي في WordPress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>رابط الموقع</Label>
              <Input value={wpStoreUrl} onChange={(e) => setWpStoreUrl(e.target.value)} placeholder="https://yourstore.com" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label>اسم المستخدم</Label>
              <Input value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label>Application Password</Label>
              <Input type="password" value={wpAppPassword} onChange={(e) => setWpAppPassword(e.target.value)} dir="ltr" />
              <p className="text-xs text-muted-foreground">
                أنشئها من: WordPress Dashboard → Users → Profile → Application Passwords
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWpOpen(false)}>إلغاء</Button>
            <Button onClick={saveWP}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
