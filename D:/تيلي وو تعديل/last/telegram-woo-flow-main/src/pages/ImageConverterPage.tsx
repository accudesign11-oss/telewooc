import { useState, useCallback, useRef } from "react";
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
  Sparkles,
  FolderArchive,
  FolderPlus,
  FileArchive,
  RefreshCw,
  FolderTree
} from "lucide-react";
import { toast } from "sonner";

interface ConvertedImage {
  id: string;
  file: File;
  originalName: string;
  relativePath: string;
  folderName: string;
  originalSize: number;
  originalFormat: string;
  convertedBlob: Blob | null;
  convertedSize: number;
  convertedUrl: string;
  originalUrl: string;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

interface FileWithPath {
  file: File;
  relativePath: string;
}

const SUPPORTED_FORMATS = [
  { value: "webp", label: "WebP (موصى به)", description: "الأفضل للويب - ضغط فائق وسرعة عاليين" },
  { value: "jpeg", label: "JPEG", description: "متوافق مع جميع الأنظمة والمستعرضات" },
  { value: "png", label: "PNG", description: "جودة عالية مع دعم الشفافية" },
];

const QUALITY_PRESETS = [
  { value: 70, label: "اقتصادية (70%)" },
  { value: 82, label: "متوازنة (82%)" },
  { value: 90, label: "عالية (90%)" },
  { value: 95, label: "أقصى (95%)" },
];

// Helper to recursively extract files and subfolder paths from Drag & Drop DataTransferItems
async function extractFilesFromDataTransfer(items: DataTransferItemList): Promise<FileWithPath[]> {
  const result: FileWithPath[] = [];

  const readEntry = async (entry: any, path: string) => {
    if (!entry) return;

    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|svg)$/i.test(file.name))) {
              const relPath = path ? `${path}/${file.name}` : file.name;
              result.push({ file, relativePath: relPath });
            }
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const currentPath = path ? `${path}/${entry.name}` : entry.name;

      const readEntriesBatch = (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries(
            (entries: any[]) => resolve(entries || []),
            () => resolve([])
          );
        });
      };

      let entries = await readEntriesBatch();
      while (entries.length > 0) {
        for (const childEntry of entries) {
          await readEntry(childEntry, currentPath);
        }
        entries = await readEntriesBatch();
      }
    }
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        promises.push(readEntry(entry, ""));
      } else {
        const file = item.getAsFile();
        if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|svg)$/i.test(file.name))) {
          result.push({ file, relativePath: file.webkitRelativePath || file.name });
        }
      }
    }
  }

  await Promise.all(promises);
  return result;
}

export default function ImageConverterPage() {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [quality, setQuality] = useState(82);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  const addFilesToState = useCallback((fileItems: FileWithPath[]) => {
    if (fileItems.length === 0) return;

    const newImages: ConvertedImage[] = fileItems.map(({ file, relativePath }) => {
      const parts = relativePath.split("/");
      const folderName = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
      
      return {
        id: crypto.randomUUID(),
        file,
        originalName: file.name,
        relativePath: relativePath || file.name,
        folderName,
        originalSize: file.size,
        originalFormat: getOriginalFormat(file),
        convertedBlob: null,
        convertedSize: 0,
        convertedUrl: URL.createObjectURL(file),
        originalUrl: URL.createObjectURL(file),
        status: "pending" as const,
      };
    });

    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validItems: FileWithPath[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|svg)$/i.test(file.name))) {
        validItems.push({
          file,
          relativePath: file.webkitRelativePath || file.name,
        });
      }
    }

    if (validItems.length === 0) {
      toast.error("الملفات المختارة ليست صوراً صالحة");
      event.target.value = "";
      return;
    }

    addFilesToState(validItems);
    toast.success(`تم إضافة ${validItems.length} صورة`);
    event.target.value = "";
  }, [addFilesToState]);

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      toast.info("جاري فك وقراءة الملفات والمجلدات المرفوعة...");
      const extracted = await extractFilesFromDataTransfer(e.dataTransfer.items);
      if (extracted.length > 0) {
        addFilesToState(extracted);
        toast.success(`تم إضافة ${extracted.length} صورة من المجلدات المسحوبة 📁⚡`);
      } else {
        toast.error("لم يتم العثور على صور صالحة داخل العناصر المسحوبة");
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|svg)$/i.test(f.name)
      );
      if (files.length > 0) {
        addFilesToState(files.map((f) => ({ file: f, relativePath: f.name })));
        toast.success(`تم إضافة ${files.length} صورة`);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const convertImage = async (file: File, format: string, quality: number): Promise<Blob> => {
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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
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
      img.src = base64;
    });
  };

  const handleConvertAll = async () => {
    const pendingImages = images.filter((img) => img.status === "pending");
    if (pendingImages.length === 0) {
      toast.error("جميع الصور محولة بالفعل أو لا توجد صور جديدة للتحويل");
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
    toast.success(`تم تحويل ${pendingImages.length} صورة إلى صيغة ${outputFormat.toUpperCase()} بنجاح! 🎉`);
  };

  const handleDownloadSingle = (img: ConvertedImage) => {
    if (!img.convertedBlob) {
      toast.error("لا توجد صورة محولة للتنزيل");
      return;
    }

    const baseName = img.originalName.replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}.${outputFormat}`;

    const url = URL.createObjectURL(img.convertedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success(`تم تنزيل ${fileName}`);
  };

  // Download All Preserving Folder Structure inside ZIP archive
  const handleDownloadZipWithFolders = async () => {
    const doneImages = images.filter((img) => img.status === "done" && img.convertedBlob);
    if (doneImages.length === 0) {
      toast.error("لا توجد صور محولة جاهزة للتحميل");
      return;
    }

    try {
      toast.info("جاري تجميع الملفات وإعادة بناء هيكل المجلدات داخل ملف ZIP...");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      doneImages.forEach((img) => {
        // Reconstruct relative file path with target format extension
        const cleanPath = img.relativePath.replace(/\.[^/.]+$/, `.${outputFormat}`);
        zip.file(cleanPath, img.convertedBlob!);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `telewoo-converted-images-${outputFormat}-${Date.now()}.zip`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);

      toast.success("تم تنزيل ملف ZIP بداخل المجلدات الأصلية والصور المحولة بنجاح! 📦✨");
    } catch (err: any) {
      console.error("ZIP Error:", err);
      toast.error("فشل في إنشاء ملف ZIP: " + (err?.message || "خطأ غير معروف"));
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
      if (img?.originalUrl) URL.revokeObjectURL(img.originalUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach((img) => {
      if (img.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
      if (img.originalUrl) URL.revokeObjectURL(img.originalUrl);
    });
    setImages([]);
  };

  const pendingCount = images.filter((img) => img.status === "pending").length;
  const doneCount = images.filter((img) => img.status === "done").length;
  const foldersCount = new Set(images.map((img) => img.folderName).filter(Boolean)).size;

  const totalOriginalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalConvertedSize = images.filter((img) => img.status === "done").reduce((sum, img) => sum + img.convertedSize, 0);

  return (
    <AppLayout title="محول صيغ الصور والمجلدات">
      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto text-right" dir="rtl">
        {/* Header Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-background to-blue-950/20 border-primary/30">
          <CardHeader className="pb-3 text-right">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/20 rounded-2xl border border-primary/30 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    محول صيغ الصور والمجلدات الذكي (WebP / JPEG / PNG)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    تحويل الملفات والمجلدات الكاملة مع إعادة إنشاء الهيكل التنظيمي وإخراج ملف ZIP مضغوط
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-bold px-3 py-1">
                سحب وإفلات + مجلدات ZIP 📁
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Upload & Drag and Drop Area */}
        <Card className={`transition-all duration-300 relative overflow-hidden ${
          isDragging 
            ? "border-2 border-primary bg-primary/10 shadow-2xl scale-[1.01]" 
            : "border-2 border-dashed border-primary/30 hover:border-primary/60 bg-card"
        }`}>
          <CardContent className="p-6 text-center">
            {/* Hidden Input Files */}
            <input
              ref={fileInputRef}
              id="image-converter-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Hidden Input Directory Folder */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is supported in modern browsers
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center space-y-4 py-6 cursor-pointer"
            >
              <div className={`p-4 rounded-3xl transition-transform ${isDragging ? "scale-125 bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                <FolderArchive className="h-10 w-10 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  {isDragging ? "أفلت المجلدات والصور هنا الآن! 📥" : "قم بسحب وإفلات الصور أو المجلدات من جهازك مباشرة"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  يدعم سحب عدة مجلدات فرعية متداخلة وسيتم إعادة بناء الهيكل الداخلي كاملاً عند التحميل كـ ZIP.
                </p>
              </div>

              {/* Action Buttons inside Dropzone */}
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 px-5 py-2.5 rounded-xl shadow-md"
                >
                  <Upload className="h-4 w-4" />
                  اختيار صور منفردة 🖼️
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs gap-2 px-5 py-2.5 rounded-xl shadow-md"
                >
                  <FolderPlus className="h-4 w-4" />
                  اختيار مجلد كامل 📁
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Control Card */}
        <Card dir="rtl">
          <CardContent className="p-4 space-y-4 text-right">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">صيغة التحويل المطلوبة:</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {SUPPORTED_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value} className="text-xs">
                        <span className="font-bold">{format.label}</span> - <span className="text-muted-foreground">{format.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">نسبة الجودة والضغط: ({quality}%)</Label>
                  <span className="text-[11px] text-primary font-bold">
                    {quality >= 90 ? "أقصى وضوح" : quality >= 80 ? "جودة متوازنة ممتازة" : "ضغط قوي للسرعة"}
                  </span>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {QUALITY_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={quality === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuality(preset.value)}
                      className="text-[11px] font-bold px-2.5 h-7 rounded-lg"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={20}
                  max={100}
                  step={2}
                  className="pt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Converted Images List & Actions */}
        {images.length > 0 && (
          <Card dir="rtl">
            <CardHeader className="pb-3 text-right border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <FileImage className="h-4 w-4 text-primary" />
                    قائمة الصور والمجلدات ({images.length})
                  </CardTitle>
                  {foldersCount > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-[11px]">
                      📁 {foldersCount} مجلد فرعي متداخل
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs text-rose-500 hover:bg-rose-500/10 font-bold gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                    مسح القائمة
                  </Button>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="flex items-center gap-3 text-xs pt-2 flex-wrap">
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  حجم الصور الأصلية: {formatFileSize(totalOriginalSize)}
                </Badge>
                {doneCount > 0 && (
                  <>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px] font-bold">
                      بعد التحويل: {formatFileSize(totalConvertedSize)}
                    </Badge>
                    <Badge className="bg-primary text-white text-[11px] font-bold">
                      وفرت {calculateSavings(totalOriginalSize, totalConvertedSize)}
                    </Badge>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-right">
              {/* Batch Conversion Progress */}
              {isConverting && progress.total > 0 && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-primary">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري تحويل الصور والمجلدات...
                    </span>
                    <span>{progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)</span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                </div>
              )}

              {/* Scrollable Images List */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={img.status === "done" ? img.convertedUrl : img.originalUrl}
                        alt={img.originalName}
                        className="w-12 h-12 object-cover rounded-lg border shrink-0 bg-muted"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold truncate text-foreground">{img.originalName}</p>
                          {img.folderName && (
                            <Badge variant="outline" className="text-[10px] bg-slate-900 text-blue-300 border-blue-500/30 gap-1 dir-ltr">
                              <FolderTree className="h-3 w-3 shrink-0" />
                              {img.folderName}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{formatFileSize(img.originalSize)}</span>
                          {img.status === "done" && (
                            <>
                              <span>→</span>
                              <span className="text-emerald-500 font-extrabold">
                                {formatFileSize(img.convertedSize)}
                              </span>
                              <span className="text-[10px] text-primary font-bold">
                                ({calculateSavings(img.originalSize, img.convertedSize)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {img.status === "converting" && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {img.status === "done" && (
                        <>
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleDownloadSingle(img)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            تنزيل
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => handleRemoveImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
                {pendingCount > 0 && (
                  <Button
                    size="lg"
                    onClick={handleConvertAll}
                    disabled={isConverting}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 py-5 rounded-xl shadow-lg"
                  >
                    {isConverting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    بدء تحويل جميع الصور ({pendingCount}) ⚡
                  </Button>
                )}

                {doneCount > 0 && (
                  <Button
                    size="lg"
                    onClick={handleDownloadZipWithFolders}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 py-5 rounded-xl shadow-lg"
                  >
                    <FileArchive className="h-4 w-4" />
                    تحميل الكل كـ ZIP (مع حفظ المجلدات) ({doneCount}) 📦
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
