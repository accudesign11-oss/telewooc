import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Upload, 
  Eye,
  Loader2,
  CheckCircle,
  ExternalLink,
  Image,
  AlertTriangle,
  Plus,
  Link,
  X,
  Copy,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDraftProduct } from "@/hooks/useDraftProduct";
import { useWooCommerce } from "@/hooks/useWooCommerce";
import { useImageConverter } from "@/hooks/useImageConverter";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/audit";

interface ReviewTabProps {
  productId: string;
  onBack: () => void;
  onReset: () => void;
}

export function ReviewTab({ productId, onBack, onReset }: ReviewTabProps) {
  const { product, refetch } = useDraftProduct(productId);
  const { isPublishing, publishProduct } = useWooCommerce();
  const { convertProductImages, convertVariationImages, isImgbbUrl, convertToImgbb } = useImageConverter();
  const { imgbb } = useSettings();
  const { toast } = useToast();
  const [published, setPublished] = useState(false);
  const [publishAsDraft, setPublishAsDraft] = useState(false);
  const [permalink, setPermalink] = useState<string | null>(null);
  const [isConvertingImages, setIsConvertingImages] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0, stage: "" });
  const [showImgbbWarning, setShowImgbbWarning] = useState(false);
  const [pendingPublish, setPendingPublish] = useState(false);
  const [imagesConverted, setImagesConverted] = useState(false);

  // Image upload states
  const [showAddImages, setShowAddImages] = useState(false);
  const [imageUrls, setImageUrls] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video states
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-dedup product images on mount (removes any duplicate URLs)
  useEffect(() => {
    if (!product?.product_images || product.product_images.length === 0) return;
    const seen = new Map<string, string>();
    const dupIds: string[] = [];
    for (const img of product.product_images) {
      if (seen.has(img.url)) dupIds.push(img.id);
      else seen.set(img.url, img.id);
    }
    if (dupIds.length > 0) {
      supabase.from("product_images").delete().in("id", dupIds).then(() => {
        console.log(`Removed ${dupIds.length} duplicate images`);
        refetch();
      });
    }
  }, [product?.id]);

  const existingUrls = new Set((product?.product_images || []).map(i => i.url));
  const hasNonImgbbImages = product?.product_images?.some(img => !isImgbbUrl(img.url)) || false;
  const allImagesAreImgbb = product?.product_images?.every(img => isImgbbUrl(img.url)) || false;

  // Delete images from database after successful publish
  const deleteProductImages = async () => {
    try {
      // Delete product images
      await supabase
        .from("product_images")
        .delete()
        .eq("draft_product_id", productId);
      
      // Delete variation images (set to null)
      await supabase
        .from("product_variations")
        .update({ image_url: null })
        .eq("draft_product_id", productId);
        
      console.log("Deleted images from database to save space");
    } catch (error) {
      console.error("Failed to delete images:", error);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload (always converts to WebP via convertToImgbb)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const newImages: { url: string; draft_product_id: string }[] = [];
      const batchSeen = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const base64 = await fileToBase64(file);

        let finalUrl: string | null = null;
        if (imgbb.api_key) {
          finalUrl = await convertToImgbb(base64); // converts to WebP + uploads
        } else {
          finalUrl = base64;
        }
        if (!finalUrl) continue;

        // Dedup: skip if already in DB or in this batch
        if (existingUrls.has(finalUrl) || batchSeen.has(finalUrl)) {
          console.log("Skipped duplicate image");
          continue;
        }
        batchSeen.add(finalUrl);
        newImages.push({ url: finalUrl, draft_product_id: productId });
      }

      if (newImages.length > 0) {
        await supabase.from("product_images").insert(newImages);
        await refetch();
        toast({
          title: "تم إضافة الصور",
          description: `تم إضافة ${newImages.length} صورة بنجاح (WebP)`,
        });
      } else {
        toast({ title: "لا صور جديدة", description: "الصور المختارة مكررة بالفعل" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "خطأ", description: "فشل في رفع بعض الصور", variant: "destructive" });
    } finally {
      setIsUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUrlsAdd = async () => {
    const urls = Array.from(new Set(
      imageUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0)
    ));

    if (urls.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress({ current: 0, total: urls.length });

    try {
      const newImages: { url: string; draft_product_id: string }[] = [];
      const batchSeen = new Set<string>();

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        setUploadProgress({ current: i + 1, total: urls.length });

        let finalUrl = url;
        if (imgbb.api_key && !isImgbbUrl(url)) {
          const converted = await convertToImgbb(url);
          finalUrl = converted || url;
        }

        if (existingUrls.has(finalUrl) || batchSeen.has(finalUrl)) continue;
        batchSeen.add(finalUrl);
        newImages.push({ url: finalUrl, draft_product_id: productId });
      }

      if (newImages.length > 0) {
        await supabase.from("product_images").insert(newImages);
        await refetch();
        setImageUrls("");
        toast({ title: "تم إضافة الصور", description: `${newImages.length} صورة (WebP)` });
      } else {
        toast({ title: "لا صور جديدة", description: "كل الروابط مكررة" });
      }
    } catch (error) {
      console.error("URL add error:", error);
      toast({ title: "خطأ", description: "فشل في إضافة بعض الصور", variant: "destructive" });
    } finally {
      setIsUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // ===== Video handling =====
  const detectVideoEmbed = (url: string): string => {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (yt) {
      return `<div class="tlv-video" style="position:relative;padding-bottom:56.25%;height:0;margin:16px 0;"><iframe src="https://www.youtube.com/embed/${yt[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;" allowfullscreen></iframe></div>`;
    }
    // Vimeo
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) {
      return `<div class="tlv-video" style="position:relative;padding-bottom:56.25%;height:0;margin:16px 0;"><iframe src="https://player.vimeo.com/video/${vm[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;" allowfullscreen></iframe></div>`;
    }
    // Direct mp4/webm
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
      return `<video controls style="width:100%;max-width:100%;border-radius:12px;margin:16px 0;" src="${url}"></video>`;
    }
    // Fallback: link
    return `<p style="margin:16px 0;"><a href="${url}" target="_blank" rel="noopener">فيديو المنتج</a></p>`;
  };

  const appendVideoToDescription = async (videoHtml: string) => {
    if (!product) return;
    const current = product.long_description || "";
    if (current.includes(videoHtml)) {
      toast({ title: "الفيديو موجود بالفعل" });
      return;
    }
    const newDesc = `${current}\n\n${videoHtml}`.trim();
    await supabase.from("draft_products").update({ long_description: newDesc }).eq("id", productId);
    await refetch();
    toast({ title: "تم إضافة الفيديو إلى الوصف" });
  };

  const handleVideoUrlAdd = async () => {
    if (!videoUrlInput.trim()) return;
    const html = detectVideoEmbed(videoUrlInput.trim());
    await appendVideoToDescription(html);
    setVideoUrlInput("");
  };

  const handleVideoFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      toast({ title: "ملف غير صالح", description: "اختر ملف فيديو", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "الملف كبير جدًا", description: "الحد الأقصى 50MB. ارفع لـ YouTube/Vimeo والصق الرابط بدلاً من ذلك.", variant: "destructive" });
      return;
    }

    setIsUploadingVideo(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => {
          const s = r.result as string;
          resolve(s.split(",")[1] || s);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("wp-media-upload", {
        body: {
          filename: file.name,
          mime: file.type,
          data_base64: b64,
          alt_text: product?.name || "video",
          title: product?.name || file.name,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "فشل الرفع");

      const html = `<video controls style="width:100%;max-width:100%;border-radius:12px;margin:16px 0;" src="${data.url}"></video>`;
      await appendVideoToDescription(html);
      toast({ title: "تم رفع الفيديو", description: data.url });
    } catch (e: any) {
      toast({ title: "فشل رفع الفيديو", description: e.message, variant: "destructive" });
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  // Remove image
  const handleRemoveImage = async (imageId: string) => {
    try {
      await supabase.from("product_images").delete().eq("id", imageId);
      await refetch();
      toast({
        title: "تم حذف الصورة",
      });
    } catch (error) {
      console.error("Remove error:", error);
    }
  };

  // Convert all images to imgbb manually
  const handleConvertAllToImgbb = async () => {
    if (!imgbb.api_key) {
      toast({
        title: "imgbb غير مفعل",
        description: "يرجى إضافة API Key في الإعدادات",
        variant: "destructive",
      });
      return;
    }

    setIsConvertingImages(true);
    
    try {
      // Convert main product images
      setConversionProgress({ current: 0, total: 0, stage: "تحويل صور المنتج إلى imgbb..." });
      await convertProductImages(productId, (current, total) => {
        setConversionProgress({ current, total, stage: "تحويل صور المنتج إلى imgbb..." });
      });

      // Convert variation images if variable product
      if (product?.product_type === "variable") {
        setConversionProgress({ current: 0, total: 0, stage: "تحويل صور المتغيرات..." });
        await convertVariationImages(productId, (current, total) => {
          setConversionProgress({ current, total, stage: "تحويل صور المتغيرات..." });
        });
      }

      // Refresh product data to get new image URLs
      await refetch();
      setImagesConverted(true);
      
      toast({
        title: "تم التحويل بنجاح",
        description: "تم تحويل جميع الصور إلى روابط imgbb",
      });
    } catch (error) {
      console.error("Image conversion error:", error);
      toast({
        title: "خطأ في التحويل",
        description: "فشل في تحويل بعض الصور",
        variant: "destructive",
      });
    } finally {
      setIsConvertingImages(false);
    }
  };

  const handlePublish = async (skipImgbbConversion = false) => {
    // Check if imgbb API key is configured and there are non-imgbb images
    if (!skipImgbbConversion && hasNonImgbbImages && !imgbb.api_key) {
      setShowImgbbWarning(true);
      setPendingPublish(true);
      return;
    }

    setShowImgbbWarning(false);
    setPendingPublish(false);
    
    // Convert images if imgbb API key is available
    if (imgbb.api_key && hasNonImgbbImages) {
      setIsConvertingImages(true);
      
      try {
        // Convert main product images
        setConversionProgress({ current: 0, total: 0, stage: "تحويل صور المنتج..." });
        await convertProductImages(productId, (current, total) => {
          setConversionProgress({ current, total, stage: "تحويل صور المنتج..." });
        });

        // Convert variation images if variable product
        if (product?.product_type === "variable") {
          setConversionProgress({ current: 0, total: 0, stage: "تحويل صور المتغيرات..." });
          await convertVariationImages(productId, (current, total) => {
            setConversionProgress({ current, total, stage: "تحويل صور المتغيرات..." });
          });
        }

        // Refresh product data to get new image URLs
        await refetch();
      } catch (error) {
        console.error("Image conversion error:", error);
        toast({
          title: "تحذير",
          description: "بعض الصور لم يتم تحويلها لكن سيتم المتابعة",
          variant: "default",
        });
      } finally {
        setIsConvertingImages(false);
      }
    }

    // Then publish
    const result = await publishProduct(productId, publishAsDraft);
    if (result.success) {
      setPublished(true);
      setPermalink(result.permalink || null);

      await logActivity({
        action: "publish",
        entity_type: "woo_product",
        entity_id: productId,
        metadata: { name: product?.name, permalink: result.permalink },
        resource_url: result.permalink || null,
      });
      
      // Delete images from database after successful publish
      await deleteProductImages();
      
      toast({
        title: "تم النشر بنجاح",
        description: "تم حذف الصور من قاعدة البيانات لتوفير المساحة",
      });
    }
  };

  const handleContinueWithoutImgbb = () => {
    handlePublish(true);
  };

  if (published) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
                >
                  <CheckCircle className="h-10 w-10 text-success" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    تم النشر بنجاح! 🎉
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    تم نشر المنتج "{product?.name}" إلى متجرك
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {permalink && (
                      <Button variant="outline" asChild>
                        <a href={permalink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 ml-2" />
                          عرض في المتجر
                        </a>
                      </Button>
                    )}
                    <Button onClick={onReset}>
                      نشر منتج آخر
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">مراجعة ونشر</h2>
          <p className="text-sm text-muted-foreground">
            راجع التفاصيل النهائية قبل النشر
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">معاينة المنتج</CardTitle>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 ml-1" />
              معاينة كاملة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Images */}
            <div className="space-y-3">
              {product.product_images.length > 0 && (
                <>
                  <div className="aspect-square rounded-2xl overflow-hidden">
                    <img
                      src={product.product_images[0]?.url}
                      alt="المنتج"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        const origUrl = product.product_images[0]?.url;
                        if (!el.src.includes("images.weserv.nl") && origUrl?.startsWith("http")) {
                          el.src = `https://images.weserv.nl/?url=${encodeURIComponent(origUrl)}&output=webp`;
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {product.product_images.map((img, index) => (
                      <div
                        key={img.id}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-primary relative group"
                      >
                        <img
                          src={img.url}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            if (!el.src.includes("images.weserv.nl") && img.url?.startsWith("http")) {
                              el.src = `https://images.weserv.nl/?url=${encodeURIComponent(img.url)}&output=webp`;
                            }
                          }}
                        />
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {/* Add More Images Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddImages(!showAddImages)}
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة صور أخرى
              </Button>
              
              {/* Add Images Panel */}
              {showAddImages && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 space-y-3">
                    {/* File Upload */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.webp,.avif"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImages}
                      >
                        <Upload className="h-4 w-4 ml-2" />
                        رفع صور (WebP, JPG, PNG...)
                      </Button>
                    </div>
                    
                    {/* URL Input */}
                    <div className="space-y-2">
                      <Label className="text-xs">أو أضف روابط صور (كل رابط في سطر)</Label>
                      <Textarea
                        placeholder="https://example.com/image1.webp&#10;https://example.com/image2.jpg"
                        value={imageUrls}
                        onChange={(e) => setImageUrls(e.target.value)}
                        className="text-xs h-20"
                        dir="ltr"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={handleUrlsAdd}
                        disabled={isUploadingImages || !imageUrls.trim()}
                      >
                        <Link className="h-4 w-4 ml-2" />
                        إضافة الروابط
                      </Button>
                    </div>
                    
                    {/* Upload Progress */}
                    {isUploadingImages && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>جاري الرفع...</span>
                          <span>{uploadProgress.current}/{uploadProgress.total}</span>
                        </div>
                        <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-1" />
                      </div>
                    )}
                    
                    {/* imgbb Status */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {imgbb.api_key ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          سيتم تحويل الصور إلى imgbb تلقائياً
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          imgbb غير مفعل - الصور ستُحفظ كما هي
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {product.product_type === "variable" ? "منتج متغير" : "منتج بسيط"}
                </Badge>
                <h3 className="text-xl font-bold text-foreground">
                  {product.name}
                </h3>
              </div>

              <p className="text-muted-foreground">
                {product.short_description}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {product.price}
                </span>
                <span className="text-muted-foreground">
                  {product.currency === "EGP" ? "جنيه" : 
                   product.currency === "SAR" ? "ريال" : 
                   product.currency === "TRY" ? "ليرة" : 
                   product.currency === "USD" ? "دولار" : 
                   product.currency}
                </span>
              </div>

              <div className="space-y-2">
                <Label>الوصف التفصيلي</Label>
                <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-line max-h-40 overflow-y-auto">
                  {product.long_description}
                </div>
              </div>

              {product.sku && (
                <div className="text-sm text-muted-foreground">
                  SKU: {product.sku}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publish Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">خيارات النشر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>نشر كمسودة</Label>
              <p className="text-sm text-muted-foreground">
                سيتم حفظ المنتج كمسودة يمكنك نشرها لاحقاً
              </p>
            </div>
            <Switch
              checked={publishAsDraft}
              onCheckedChange={setPublishAsDraft}
            />
          </div>
        </CardContent>
      </Card>

      {/* Video Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🎬 فيديو المنتج (اختياري)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            اختر طريقة الإضافة: لصق رابط YouTube/Vimeo/MP4 (الأفضل والأخف)، أو رفع ملف فيديو (حد 50MB) إلى ميديا WordPress.
          </p>

          <div className="space-y-2">
            <Label className="text-xs">رابط فيديو</Label>
            <div className="flex gap-2">
              <Input
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... أو https://...mp4"
                dir="ltr"
                className="text-xs"
              />
              <Button size="sm" onClick={handleVideoUrlAdd} disabled={!videoUrlInput.trim()}>
                <Plus className="h-4 w-4 ml-1" /> إضافة للوصف
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">أو ارفع ملف فيديو</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoFileUpload(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadingVideo}
            >
              {isUploadingVideo ? (
                <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جاري الرفع...</>
              ) : (
                <><Upload className="h-4 w-4 ml-2" /> اختر ملف فيديو</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image URLs Card - Show imgbb status and URLs */}
      {imgbb.api_key && product.product_images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                روابط الصور (imgbb)
              </CardTitle>
              {hasNonImgbbImages && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConvertAllToImgbb}
                  disabled={isConvertingImages}
                >
                  {isConvertingImages ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 ml-2" />
                  )}
                  تحويل الكل إلى imgbb
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              {allImagesAreImgbb ? (
                <>
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">جميع الصور محولة إلى imgbb ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-warning font-medium">
                    {product.product_images.filter(img => !isImgbbUrl(img.url)).length} صورة تحتاج تحويل
                  </span>
                </>
              )}
            </div>

            {/* Image URLs List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {product.product_images.map((img, index) => {
                const isImgbb = isImgbbUrl(img.url);
                return (
                  <div
                    key={img.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isImgbb ? "bg-success/10" : "bg-warning/10"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`صورة ${index + 1}`}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {isImgbb ? (
                          <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
                        )}
                        <span className={isImgbb ? "text-success" : "text-warning"}>
                          {isImgbb ? "imgbb" : "غير محول"}
                        </span>
                      </div>
                      <p className="truncate text-muted-foreground font-mono" dir="ltr">
                        {img.url.length > 50 ? `${img.url.substring(0, 50)}...` : img.url}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(img.url);
                        toast({ title: "تم نسخ الرابط" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Warning if not all converted */}
            {hasNonImgbbImages && (
              <Alert className="bg-warning/10 border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs text-warning">
                  يُنصح بتحويل جميع الصور إلى imgbb قبل النشر لضمان استمرارية الروابط
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* imgbb Warning */}
      {showImgbbWarning && (
        <Alert className="bg-warning/10 border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="mr-2">
            <div className="space-y-2">
              <p className="font-medium">لم يتم تكوين imgbb API</p>
              <p className="text-sm text-muted-foreground">
                الصور لن يتم تحويلها لروابط imgbb. هل تريد المتابعة بدون تحويل؟
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setShowImgbbWarning(false)}>
                  إلغاء
                </Button>
                <Button size="sm" variant="destructive" onClick={handleContinueWithoutImgbb}>
                  متابعة بدون تحويل
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack} disabled={isConvertingImages || isPublishing}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
        <Button
          onClick={() => handlePublish()}
          disabled={isPublishing || isConvertingImages}
          className="min-w-[180px]"
        >
          {isConvertingImages ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{conversionProgress.stage}</span>
            </div>
          ) : isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              جاري النشر...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 ml-2" />
              نشر إلى WooCommerce
            </>
          )}
        </Button>
      </div>

      {/* Conversion Progress */}
      {isConvertingImages && conversionProgress.total > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-primary animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{conversionProgress.stage}</span>
                  <span className="text-xs text-muted-foreground">
                    {conversionProgress.current}/{conversionProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(conversionProgress.current / conversionProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
