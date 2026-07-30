import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  Trash2,
  FileImage,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface ConvertedImage {
  id: string;
  file: File;
  originalName: string;
  originalSize: number;
  originalFormat: string;
  convertedBlob: Blob | null;
  convertedSize: number;
  convertedUrl: string;
  originalUrl: string;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

const SUPPORTED_FORMATS = [
  { value: "webp", label: "WebP", description: "الأفضل للويب - ضغط عالي" },
  { value: "jpeg", label: "JPEG", description: "متوافق مع الجميع" },
  { value: "png", label: "PNG", description: "جودة عالية - شفافية" },
];

const QUALITY_PRESETS = [
  { value: 70, label: "اقتصادية" },
  { value: 82, label: "متوازنة" },
  { value: 90, label: "عالية" },
  { value: 95, label: "أقصى" },
];

export default function ImageConverterPage() {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [quality, setQuality] = useState(82);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const getOriginalFormat = (file: File): string => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return ext || "unknown";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const calculateSavings = (original: number, converted: number): string => {
    if (original === 0 || converted === 0) return "0%";
    const savings = ((original - converted) / original) * 100;
    return savings > 0 ? `-${savings.toFixed(0)}%` : `+${Math.abs(savings).toFixed(0)}%`;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      toast.error("لم يتم اختيار أي ملف");
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      toast.error("الملفات المختارة ليست صور صالحة");
      event.target.value = "";
      return;
    }

    const newImages: ConvertedImage[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalName: file.name,
      originalSize: file.size,
      originalFormat: getOriginalFormat(file),
      convertedBlob: null,
      convertedSize: 0,
      convertedUrl: URL.createObjectURL(file),
      originalUrl: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setImages((prev) => [...prev, ...newImages]);
    toast.success(`تم إضافة ${validFiles.length} صورة`);
    event.target.value = "";
  }, []);

  // تحويل الملف إلى base64 أولاً - يعمل بشكل أفضل على الموبايل
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const convertImage = async (file: File, format: string, quality: number): Promise<Blob> => {
    // استخدام base64 بدلاً من URL.createObjectURL - يعمل أفضل على الموبايل
    const base64 = await fileToBase64(file);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);

        const mimeType = format === "webp" ? "image/webp" : 
                        format === "jpeg" ? "image/jpeg" : "image/png";
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert image"));
            }
          },
          mimeType,
          quality / 100
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64; // استخدام base64 مباشرة
    });
  };

  const handleConvertAll = async () => {
    const pendingImages = images.filter((img) => img.status === "pending");
    if (pendingImages.length === 0) {
      toast.error("أضف صور أولاً للتحويل");
      return;
    }

    setIsConverting(true);
    setProgress({ current: 0, total: pendingImages.length });

    for (let i = 0; i < pendingImages.length; i++) {
      const img = pendingImages[i];

      setImages((prev) =>
        prev.map((p) => (p.id === img.id ? { ...p, status: "converting" } : p))
      );

      try {
        const convertedBlob = await convertImage(img.file, outputFormat, quality);
        const convertedUrl = URL.createObjectURL(convertedBlob);

        setImages((prev) =>
          prev.map((p) =>
            p.id === img.id
              ? {
                  ...p,
                  convertedBlob,
                  convertedSize: convertedBlob.size,
                  convertedUrl,
                  status: "done",
                }
              : p
          )
        );
      } catch (error: any) {
        setImages((prev) =>
          prev.map((p) =>
            p.id === img.id
              ? { ...p, status: "error", error: error.message }
              : p
          )
        );
      }

      setProgress({ current: i + 1, total: pendingImages.length });
    }

    setIsConverting(false);
    toast.success(`تم تحويل ${pendingImages.length} صورة بنجاح`);
  };

  const handleDownload = (img: ConvertedImage) => {
    if (!img.convertedBlob) {
      toast.error("لا توجد صورة محولة للتنزيل");
      return;
    }

    const baseName = img.originalName.replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}.${outputFormat}`;

    // Direct download - works on both mobile and desktop
    const url = URL.createObjectURL(img.convertedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success(`تم تنزيل ${fileName}`);
  };

  const handleDownloadAll = () => {
    const doneImages = images.filter((img) => img.status === "done" && img.convertedBlob);
    doneImages.forEach((img, index) => {
      setTimeout(() => handleDownload(img), index * 200);
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleClearAll = () => {
    setImages([]);
  };

  const pendingCount = images.filter((img) => img.status === "pending").length;
  const doneCount = images.filter((img) => img.status === "done").length;

  return (
    <AppLayout title="تحويل الصور">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              محول صيغ الصور
            </CardTitle>
            <CardDescription className="text-xs">
              حوّل صورك إلى WebP أو JPEG أو PNG - يعمل محلياً
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">صيغة الإخراج</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">الجودة: {quality}%</Label>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {QUALITY_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={quality === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuality(preset.value)}
                      className="text-xs px-2 h-7"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardContent className="p-4">
            <label
              htmlFor="image-converter-input"
              className="block border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all active:bg-primary/10"
            >
              <input
                id="image-converter-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                onChange={handleFileSelect}
                className="sr-only"
              />

              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">اضغط لاختيار الصور</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF, BMP
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Images List */}
        {images.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  الصور ({images.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs">
                  <Trash2 className="h-3 w-3 ml-1" />
                  مسح
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Progress */}
              {isConverting && progress.total > 0 && (
                <div className="bg-primary/5 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span>جاري التحويل...</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
                </div>
              )}

              {/* Images */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                  >
                    <img
                      src={img.status === "done" ? img.convertedUrl : img.originalUrl}
                      alt={img.originalName}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{img.originalName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatFileSize(img.originalSize)}</span>
                        {img.status === "done" && (
                          <>
                            <span>→</span>
                            <span className="text-primary font-medium">
                              {formatFileSize(img.convertedSize)}
                            </span>
                            <Badge variant="secondary" className="text-[9px] px-1 h-4">
                              {calculateSavings(img.originalSize, img.convertedSize)}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {img.status === "converting" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {img.status === "done" && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => handleDownload(img)}
                          >
                            <Download className="h-4 w-4 ml-1" />
                            تنزيل
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {doneCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAll}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تنزيل الكل ({doneCount})
                  </Button>
                )}
                {pendingCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleConvertAll}
                    disabled={isConverting}
                    className="flex-1"
                  >
                    {isConverting ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4 ml-2" />
                    )}
                    تحويل ({pendingCount})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
