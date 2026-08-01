import { useState, useRef, useCallback } from "react";
import { 
  Upload, 
  Link as LinkIcon, 
  X, 
  Loader2, 
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fileToWebpBlob, urlToWebpBlob, blobToBase64 } from "@/lib/webp";

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  isUploading?: boolean;
  error?: string;
}

interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  imgbbApiKey?: string;
}

export function ImageUploader({ images, onImagesChange, imgbbApiKey }: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const uploadToImgbb = async (base64Image: string): Promise<{ url: string; thumbUrl?: string } | null> => {
    if (!imgbbApiKey) {
      toast({
        title: "API Key مفقود",
        description: "الرجاء إضافة imgbb API Key في الإعدادات",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await supabase.functions.invoke("imgbb-upload", {
        body: { image: base64Image, apiKey: imgbbApiKey },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || "Upload failed");

      return {
        url: response.data.url,
        thumbUrl: response.data.thumb_url,
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const processFile = async (file: File, index: number): Promise<UploadedImage> => {
    const id = generateId();

    setUploadProgress(prev => prev.map((p, i) =>
      i === index ? { ...p, status: 'uploading' as const, progress: 20 } : p
    ));

    try {
      // Auto convert to WebP before upload (keeps quality, shrinks file, MAX 2200px)
      let base64: string;
      try {
        const webp = await fileToWebpBlob(file, 88);
        base64 = await blobToBase64(webp);
        setUploadProgress(prev => prev.map((p, i) =>
          i === index ? { ...p, progress: 55 } : p
        ));
      } catch (convErr) {
        console.warn("WebP conversion failed, uploading original:", convErr);
        base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(",")[1] || String(r.result));
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }

      setUploadProgress(prev => prev.map((p, i) =>
        i === index ? { ...p, progress: 75 } : p
      ));

      const result = await uploadToImgbb(base64);

      if (result) {
        setUploadProgress(prev => prev.map((p, i) =>
          i === index ? { ...p, status: 'success' as const, progress: 100 } : p
        ));
        return { id, url: result.url, thumbnailUrl: result.thumbUrl };
      }
      setUploadProgress(prev => prev.map((p, i) =>
        i === index ? { ...p, status: 'error' as const, progress: 100, error: 'فشل الرفع' } : p
      ));
      return { id, url: "", error: "فشل الرفع" };
    } catch (e: any) {
      setUploadProgress(prev => prev.map((p, i) =>
        i === index ? { ...p, status: 'error' as const, progress: 100, error: e?.message || 'فشل' } : p
      ));
      return { id, url: "", error: e?.message || "فشل" };
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (!imgbbApiKey) {
      toast({
        title: "API Key مفقود",
        description: "الرجاء إضافة imgbb API Key في الإعدادات",
        variant: "destructive",
      });
      return;
    }

    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|svg|tiff)$/i.test(f.name));
    if (imageFiles.length === 0) return;

    setIsUploading(true);
    setUploadingCount(imageFiles.length);
    
    // Initialize progress for all files
    setUploadProgress(imageFiles.map(f => ({
      fileName: f.name,
      status: 'pending' as const,
      progress: 0
    })));

    const uploadedImages: UploadedImage[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const result = await processFile(file, i);
      if (result.url) {
        uploadedImages.push(result);
        onImagesChange([...images, ...uploadedImages]);
      }
    }

    // Keep progress visible for a moment before clearing
    setTimeout(() => {
      setUploadProgress([]);
      setIsUploading(false);
      setUploadingCount(0);
    }, 1500);
    
    if (uploadedImages.length > 0) {
      toast({ title: `تم رفع ${uploadedImages.length} صورة بنجاح` });
    }
  };

  const handleUrlAdd = async () => {
    const urls = urlInput
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url && (url.startsWith("http://") || url.startsWith("https://")));

    if (urls.length === 0) {
      toast({ title: "الرجاء إدخال روابط صحيحة", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    toast({ title: "جاري الفحص وتحويل الصور إلى WebP..." });

    const newImages: UploadedImage[] = [];
    for (const url of urls) {
      const id = generateId();
      try {
        if (imgbbApiKey) {
          const webpBlob = await urlToWebpBlob(url, 88);
          const base64 = await blobToBase64(webpBlob);
          const result = await uploadToImgbb(base64);
          if (result) {
            newImages.push({ id, url: result.url, thumbnailUrl: result.thumbUrl });
            continue;
          }
        }
        newImages.push({ id, url });
      } catch (err) {
        console.warn("WebP URL conversion fallback:", url, err);
        newImages.push({ id, url });
      }
    }

    onImagesChange([...images, ...newImages]);
    setUrlInput("");
    setIsUploading(false);
    toast({ title: `تم إضافة ${newImages.length} صورة بعد تحويلها إلى WebP ✨` });
  };

  const handleRemove = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [imgbbApiKey, images]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 ml-2" />
            رفع ملفات
          </TabsTrigger>
          <TabsTrigger value="url">
            <LinkIcon className="h-4 w-4 ml-2" />
            إدراج روابط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/tiff,image/bmp,image/avif"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            {isUploading ? (
              <div className="space-y-3 w-full max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <p className="font-medium text-foreground">جاري الرفع...</p>
                </div>
                
                {/* Overall Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>الإجمالي</span>
                    <span>{uploadProgress.filter(p => p.status === 'success').length}/{uploadProgress.length}</span>
                  </div>
                  <Progress 
                    value={(uploadProgress.filter(p => p.status === 'success').length / uploadProgress.length) * 100} 
                  />
                </div>
                
                {/* Individual Files Progress */}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadProgress.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {item.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      {item.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      )}
                      {item.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="truncate flex-1 text-muted-foreground" dir="ltr">
                        {item.fileName}
                      </span>
                      {item.status === 'uploading' && (
                        <span className="text-xs text-primary">{item.progress}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">اسحب الصور هنا أو اضغط للاختيار</p>
                <p className="text-sm text-muted-foreground mt-1">
                  يدعم: JPG, PNG, GIF, WebP, TIFF, BMP, AVIF
                </p>
              </>
            )}
            {!imgbbApiKey && (
              <Badge variant="destructive" className="mt-3">
                يجب إضافة imgbb API Key في الإعدادات
              </Badge>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>روابط الصور (رابط واحد في كل سطر)</Label>
            <Textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg"
              rows={5}
              dir="ltr"
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleUrlAdd} className="w-full" disabled={!urlInput.trim()}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة الصور
          </Button>
        </TabsContent>
      </Tabs>

      {/* Images Preview */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label>الصور المضافة ({images.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <Card key={image.id} className="overflow-hidden group relative">
                <CardContent className="p-0">
                  {image.isUploading ? (
                    <div className="aspect-square flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : image.error ? (
                    <div className="aspect-square flex items-center justify-center bg-destructive/10">
                      <X className="h-8 w-8 text-destructive" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={`صورة ${index + 1}`}
                        className="aspect-square w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          const originalUrl = image.url;
                          // Try weserv.nl proxy as fallback
                          if (!el.src.includes("images.weserv.nl") && originalUrl.startsWith("http")) {
                            el.src = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&output=webp`;
                          } else {
                            el.src = "https://via.placeholder.com/150?text=Error";
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(image.id, image.url);
                          }}
                        >
                          {copiedId === image.id ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(image.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {index === 0 && (
                        <Badge className="absolute top-1 right-1 text-[10px]">رئيسية</Badge>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* URLs List */}
          <div className="space-y-1 mt-2">
            {images.filter(img => img.url).map((image, index) => (
              <div key={image.id} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1">
                <span className="text-muted-foreground">{index + 1}.</span>
                <code className="flex-1 truncate text-foreground" dir="ltr">{image.url}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => handleCopyUrl(image.id, image.url)}
                >
                  {copiedId === image.id ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
