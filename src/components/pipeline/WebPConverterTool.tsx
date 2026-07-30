import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Upload,
  Download,
  Loader2,
  X,
  Trash2,
  Settings2,
  FileArchive,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface ConvertedImage {
  id: string;
  originalName: string;
  originalSize: number;
  convertedBlob: Blob;
  convertedSize: number;
  previewUrl: string;
}

export function WebPConverterTool() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  
  // Quality settings
  const [qualityMode, setQualityMode] = useState<"high" | "medium" | "low" | "custom">("medium");
  const [customQuality, setCustomQuality] = useState(80);

  const getQualityValue = () => {
    switch (qualityMode) {
      case "high": return 90;
      case "medium": return 75;
      case "low": return 50;
      case "custom": return customQuality;
      default: return 75;
    }
  };

  const convertToWebP = (file: File, quality: number): Promise<{ blob: Blob; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                reject(new Error("Failed to convert image"));
                return;
              }
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, previewUrl });
            },
            "image/webp",
            quality / 100
          );
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };

      img.src = objectUrl;
    });
  };

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith("image/") && !file.type.includes("gif")
    );

    if (validFiles.length === 0) {
      toast({
        title: "لا توجد صور صالحة",
        description: "يرجى اختيار صور بصيغة JPG, PNG, أو WebP",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    setConversionProgress({ current: 0, total: validFiles.length });

    const quality = getQualityValue();
    const newImages: ConvertedImage[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setConversionProgress({ current: i + 1, total: validFiles.length });

      try {
        const { blob, previewUrl } = await convertToWebP(file, quality);
        newImages.push({
          id: `${Date.now()}-${i}`,
          originalName: file.name,
          originalSize: file.size,
          convertedBlob: blob,
          convertedSize: blob.size,
          previewUrl
        });
      } catch (error) {
        console.error(`Failed to convert ${file.name}:`, error);
      }
    }

    setImages(prev => [...prev, ...newImages]);
    setIsConverting(false);
    setConversionProgress({ current: 0, total: 0 });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    toast({
      title: `تم تحويل ${newImages.length} صورة`,
      description: `الجودة: ${quality}%`
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  const handleDownloadSingle = (image: ConvertedImage) => {
    const link = document.createElement("a");
    link.href = image.previewUrl;
    link.download = image.originalName.replace(/\.[^/.]+$/, ".webp");
    link.click();
  };

  const handleDownloadAll = () => {
    images.forEach((image, index) => {
      setTimeout(() => {
        handleDownloadSingle(image);
      }, index * 200); // Small delay to prevent browser issues
    });
    
    toast({
      title: "جاري التحميل",
      description: `تحميل ${images.length} صورة...`
    });
  };

  const handleDownloadAsZip = async () => {
    try {
      // Dynamic import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      images.forEach(image => {
        const fileName = image.originalName.replace(/\.[^/.]+$/, ".webp");
        zip.file(fileName, image.convertedBlob);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `webp-images-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "تم التحميل",
        description: "تم تحميل الملف المضغوط بنجاح"
      });
    } catch (error) {
      console.error("Zip error:", error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الملف المضغوط",
        variant: "destructive"
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const totalOriginalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalConvertedSize = images.reduce((sum, img) => sum + img.convertedSize, 0);
  const savedPercentage = totalOriginalSize > 0 
    ? Math.round((1 - totalConvertedSize / totalOriginalSize) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            إعدادات التحويل
          </CardTitle>
          <CardDescription>
            اختر جودة الضغط قبل رفع الصور
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={qualityMode}
            onValueChange={(v) => setQualityMode(v as typeof qualityMode)}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="high"
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                qualityMode === "high" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="high" id="high" />
              <div>
                <span className="font-medium">جودة عالية</span>
                <p className="text-xs text-muted-foreground">90% - حجم أكبر</p>
              </div>
            </Label>
            
            <Label
              htmlFor="medium"
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                qualityMode === "medium" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="medium" id="medium" />
              <div>
                <span className="font-medium">متوسطة</span>
                <p className="text-xs text-muted-foreground">75% - موازنة</p>
              </div>
            </Label>
            
            <Label
              htmlFor="low"
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                qualityMode === "low" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="low" id="low" />
              <div>
                <span className="font-medium">ضغط عالي</span>
                <p className="text-xs text-muted-foreground">50% - حجم أصغر</p>
              </div>
            </Label>
            
            <Label
              htmlFor="custom"
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                qualityMode === "custom" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="custom" id="custom" />
              <div>
                <span className="font-medium">مخصص</span>
                <p className="text-xs text-muted-foreground">{customQuality}%</p>
              </div>
            </Label>
          </RadioGroup>

          <AnimatePresence>
            {qualityMode === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label>الجودة: {customQuality}%</Label>
                <Slider
                  value={[customQuality]}
                  onValueChange={([v]) => setCustomQuality(v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelect(e.target.files)}
          />
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            {isConverting ? (
              <div className="space-y-3">
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  جاري التحويل... {conversionProgress.current}/{conversionProgress.total}
                </p>
                <Progress 
                  value={(conversionProgress.current / conversionProgress.total) * 100} 
                  className="max-w-xs mx-auto" 
                />
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">اضغط لرفع صور أو اسحبها هنا</p>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG, WebP, AVIF - متعددة
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                الصور المحولة ({images.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">
                الأصلي: {formatSize(totalOriginalSize)}
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success">
                بعد التحويل: {formatSize(totalConvertedSize)}
              </Badge>
              {savedPercentage > 0 && (
                <Badge className="bg-primary">
                  وفّرت {savedPercentage}%
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Images Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={image.previewUrl}
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={() => handleDownloadSingle(image)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-center">
                    <span className="text-[10px] text-white">
                      {formatSize(image.convertedSize)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll} className="flex-1">
                <Download className="h-4 w-4 ml-2" />
                تحميل الكل ({images.length})
              </Button>
              <Button variant="outline" onClick={handleDownloadAsZip}>
                <FileArchive className="h-4 w-4 ml-2" />
                تحميل كـ ZIP
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
