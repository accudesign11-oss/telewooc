import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, 
  Image as ImageIcon, 
  Check, 
  ArrowLeft,
  Calendar,
  Loader2,
  Inbox as InboxIcon,
  PenLine,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Camera,
  Layers,
  Palette,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTelegramPosts } from "@/hooks/useTelegramPosts";
import { useDraftProduct } from "@/hooks/useDraftProduct";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageAnalysisDialog } from "@/components/pipeline/ImageAnalysisDialog";
import { ImageConversionBanner } from "@/components/pipeline/ImageConversionBanner";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
}

interface InboxTabProps {
  onNext: (productId: string) => void;
}

export function InboxTab({ onNext }: InboxTabProps) {
  const { posts, isLoading, isSyncing, syncPosts } = useTelegramPosts();
  const { createDraftFromPost } = useDraftProduct();
  const { imgbb } = useSettings();
  const { toast } = useToast();
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Record<string, string[]>>({});
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);

  // Multi-image selection for combined products
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [globalSelectedImages, setGlobalSelectedImages] = useState<{ postId: string; url: string; mediaId: string }[]>([]);
  const [isAnalyzingMultiple, setIsAnalyzingMultiple] = useState(false);

  // Manual entry state
  const [manualText, setManualText] = useState("");
  const [manualImages, setManualImages] = useState<UploadedImage[]>([]);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Image analysis state
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [isPreparingAnalysisImage, setIsPreparingAnalysisImage] = useState(false);
  const [imageToAnalyze, setImageToAnalyze] = useState<{ url: string; base64?: string; urls?: string[]; previewUrl?: string; additionalBase64?: string[] } | null>(null);
  const analysisFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previewUrl = imageToAnalyze?.previewUrl;
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [imageToAnalyze?.previewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (chunksRef.current.length === 0) return;

        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const base64 = await blobToBase64(audioBlob);

          const { data, error } = await supabase.functions.invoke("voice-to-text", {
            body: { audio: base64 },
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          if (data.text) {
            setManualText(prev => prev ? `${prev}\n${data.text}` : data.text);
          }
        } catch (error: any) {
          toast({
            title: "خطأ في تحويل الصوت",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      toast({ title: "جاري التسجيل...", description: "تحدث الآن" });
    } catch (error: any) {
      toast({
        title: "خطأ في الميكروفون",
        description: "تأكد من إعطاء صلاحية الميكروفون",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const toggleImage = (postId: string, imageUrl: string) => {
    setSelectedImages(prev => {
      const current = prev[postId] || [];
      return {
        ...prev,
        [postId]: current.includes(imageUrl)
          ? current.filter(url => url !== imageUrl)
          : [...current, imageUrl]
      };
    });
  };

  const toggleGlobalImage = (postId: string, url: string, mediaId: string) => {
    setGlobalSelectedImages(prev => {
      const exists = prev.find(img => img.mediaId === mediaId);
      if (exists) {
        return prev.filter(img => img.mediaId !== mediaId);
      }
      return [...prev, { postId, url, mediaId }];
    });
  };

  const handleConvert = async (post: typeof posts[0]) => {
    setProcessingPostId(post.id);
    const images = selectedImages[post.id] || post.telegram_media.map(m => m.remote_url).filter(Boolean) as string[];
    
    // If post has no text but has images, analyze the first image
    if (!post.text?.trim() && images.length > 0) {
      await handleAnalyzeTelegramImage(images[0], images);
      setProcessingPostId(null);
      return;
    }
    
    const productId = await createDraftFromPost(post.id, post.text || "", images);
    setProcessingPostId(null);
    
    if (productId) {
      onNext(productId);
    }
  };

  // تحويل URL إلى base64 عبر Edge Function proxy لتجنب CORS ومشكلة انتهاء صلاحية روابط Telegram
  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      // استخدام Edge Function كـ proxy لتجاوز CORS
      const { data, error } = await supabase.functions.invoke('telegram-proxy', {
        body: { url }
      });

      if (error || !data?.success) {
        console.error("Proxy error:", error || data?.error);
        return null;
      }

      return data.base64;
    } catch (error) {
      console.error("Failed to fetch image as base64:", error);
      return null;
    }
  };

  const handleAnalyzeTelegramImage = async (primaryImageUrl: string, allImageUrls?: string[]) => {
    setIsPreparingAnalysisImage(true);
    
    try {
      // تحويل الصورة الرئيسية إلى base64
      const primaryBase64 = await fetchImageAsBase64(primaryImageUrl);
      
      if (!primaryBase64) {
        toast({
          title: "خطأ في جلب الصورة",
          description: "تعذر تحميل الصورة. قد يكون الرابط منتهي الصلاحية.",
          variant: "destructive",
        });
        setIsPreparingAnalysisImage(false);
        return;
      }

      // تحويل الصور الإضافية إلى base64
      let additionalBase64: string[] = [];
      if (allImageUrls && allImageUrls.length > 1) {
        const otherUrls = allImageUrls.slice(1);
        const results = await Promise.all(otherUrls.map(fetchImageAsBase64));
        additionalBase64 = results.filter((b): b is string => b !== null);
      }

      setImageToAnalyze({ 
        url: "", // لا نستخدم URL مباشر
        base64: primaryBase64,
        urls: allImageUrls, // للعرض فقط
        additionalBase64,
      });
      setAnalysisDialogOpen(true);
    } catch (error: any) {
      console.error("Error preparing telegram image:", error);
      toast({
        title: "خطأ",
        description: "فشل تجهيز الصورة للتحليل",
        variant: "destructive",
      });
    } finally {
      setIsPreparingAnalysisImage(false);
    }
  };

  const handleAnalyzeMultipleImages = async () => {
    if (globalSelectedImages.length === 0) {
      toast({ title: "الرجاء اختيار صور أولاً", variant: "destructive" });
      return;
    }

    setIsAnalyzingMultiple(true);
    
    try {
      const urls = globalSelectedImages.map(img => img.url);
      
      // تحويل جميع الصور إلى base64
      const base64Results = await Promise.all(urls.map(fetchImageAsBase64));
      const validBase64 = base64Results.filter((b): b is string => b !== null);
      
      if (validBase64.length === 0) {
        toast({
          title: "خطأ في جلب الصور",
          description: "تعذر تحميل الصور. قد تكون الروابط منتهية الصلاحية.",
          variant: "destructive",
        });
        return;
      }

      setImageToAnalyze({ 
        url: "", 
        base64: validBase64[0],
        urls: urls,
        additionalBase64: validBase64.slice(1),
      });
      setAnalysisDialogOpen(true);
    } catch (error: any) {
      console.error("Error preparing multiple images:", error);
      toast({
        title: "خطأ",
        description: "فشل تجهيز الصور للتحليل",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingMultiple(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      toast({ title: "الرجاء إدخال نص المنتج", variant: "destructive" });
      return;
    }

    setIsSubmittingManual(true);
    try {
      const images = manualImages.map(img => img.url);
      const productId = await createDraftFromPost(null, manualText, images);
      
      if (productId) {
        setManualText("");
        setManualImages([]);
        toast({ title: "تم إنشاء المسودة بنجاح" });
        onNext(productId);
      }
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("فشل قراءة الصورة"));
      reader.onabort = () => reject(new Error("تم إلغاء قراءة الصورة"));
      reader.readAsDataURL(file);
    });

  const transcodeAndResizeImage = (
    file: File,
    opts: {
      mimeType: "image/webp" | "image/jpeg";
      quality: number;
      maxDimension: number;
    },
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const maxSide = Math.max(img.width, img.height);
          const scale = maxSide > opts.maxDimension ? opts.maxDimension / maxSide : 1;

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context not available");

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                reject(new Error("Failed to transcode image"));
                return;
              }

              const ext = opts.mimeType === "image/webp" ? "webp" : "jpg";
              const nextName = file.name.replace(/\.[^/.]+$/, `.${ext}`);
              resolve(
                new File([blob], nextName, {
                  type: opts.mimeType,
                }),
              );
            },
            opts.mimeType,
            opts.quality,
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

  const handleImageAnalysis = async (fileOrFiles: File | File[]) => {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (files.length === 0) return;

    const first = files[0];
    // Guard for extremely large files (prevents browser freezing)
    const MAX_MB = 25;
    const oversize = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversize) {
      toast({
        title: "الصورة كبيرة جداً",
        description: `الحد الأقصى ${MAX_MB}MB. جرّب تقليل الحجم أو تفعيل WebP.`,
        variant: "destructive",
      });
      return;
    }

    setIsPreparingAnalysisImage(true);

    // Open dialog immediately with a local preview
    let processedFiles: File[] = files;

    try {
      const shouldWebp = Boolean(imgbb.require_conversion && imgbb.convert_to_webp);
      const transcoded: File[] = [];
      for (const f of files) {
        const shouldCompress = shouldWebp || f.size > 4 * 1024 * 1024; // 4MB+
        if (shouldCompress) {
          try {
            const t = await transcodeAndResizeImage(f, {
              mimeType: shouldWebp ? "image/webp" : "image/jpeg",
              quality: 0.85,
              maxDimension: 2048,
            });
            transcoded.push(t);
          } catch (e) {
            console.warn("Image transcode failed, using original:", e);
            transcoded.push(f);
          }
        } else {
          transcoded.push(f);
        }
      }
      processedFiles = transcoded;

      const previewUrl = URL.createObjectURL(processedFiles[0]);
      setImageToAnalyze({ url: "", previewUrl });
      setAnalysisDialogOpen(true);

      // Convert all files to base64 in parallel
      const allBase64 = await Promise.all(processedFiles.map((f) => readFileAsDataURL(f)));
      const primaryB64 = allBase64[0];
      const additionalBase64 = allBase64.slice(1);

      // If imgbb is configured, upload all so we can pass real URLs to save step
      let primaryUrl = "";
      let uploadedUrls: string[] = [];
      if (imgbb.api_key && imgbb.require_conversion) {
        try {
          const uploads = await Promise.all(
            allBase64.map((b64) =>
              supabase.functions.invoke("imgbb-upload", {
                body: { image: b64, apiKey: imgbb.api_key },
              })
            )
          );
          uploadedUrls = uploads
            .map((r) => (r.data?.success ? (r.data.url as string) : ""))
            .filter(Boolean);
          primaryUrl = uploadedUrls[0] || "";
        } catch (error: any) {
          console.warn("imgbb upload failed, using base64:", error?.message);
          toast({ title: "تنبيه", description: "فشل رفع الصور لـ imgbb، سيتم التحليل بدون رفع" });
        }
      }

      setImageToAnalyze({
        url: primaryUrl,
        base64: primaryB64,
        previewUrl,
        urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        additionalBase64,
      });
    } catch (error: any) {
      console.error("Failed to prepare image for analysis:", error);
      toast({
        title: "خطأ",
        description: error?.message || "فشل تجهيز الصورة للتحليل",
        variant: "destructive",
      });
      setAnalysisDialogOpen(false);
      setImageToAnalyze(null);
    } finally {
      setIsPreparingAnalysisImage(false);
    }
  };

  const handleAnalysisSave = async (data: any, imageUrl: string) => {
    setIsSubmittingManual(true);
    try {
      // Use all selected images if available
      const images = imageToAnalyze?.urls || [imageUrl];
      
      // Determine product type based on analysis
      let productType = "simple";
      let productNote = "";
      
      if (data.is_same_design_different_colors) {
        productType = "variable";
        productNote = "منتج متنوع - نفس التصميم بألوان مختلفة";
      } else if (data.is_different_designs) {
        productType = "grouped";
        productNote = "منتج مجمع - تصميمات مختلفة";
      } else if (images.length > 1) {
        // Multiple images without specific classification
        productType = "simple";
        productNote = "منتج بصور متعددة";
      }
      
      // Create a text representation from the analysis
      const textContent = `${data.name}\n${data.short_description}\n${data.long_description}${productNote ? `\n\n[${productNote}]` : ''}`;
      
      const productId = await createDraftFromPost(null, textContent, images);
      
      if (productId) {
        // Update the draft with the analyzed data
        await supabase.from("draft_products").update({
          name: data.name,
          short_description: data.short_description,
          long_description: data.long_description,
          tags: data.tags || [],
          product_type: productType,
          ai_processed_data: {
            ...data,
            analyzed_from_image: true,
            is_same_design_different_colors: data.is_same_design_different_colors,
            is_different_designs: data.is_different_designs,
            image_count: images.length,
            product_note: productNote
          },
          status: "ai_processed"
        }).eq("id", productId);

        // Add attributes if any
        if (data.attributes && data.attributes.length > 0) {
          const attributesData = data.attributes
            .filter((attr: any) => attr.name && attr.values?.length > 0)
            .map((attr: any) => ({
              draft_product_id: productId,
              name: attr.name,
              values: attr.values,
              is_variation: attr.is_variation ?? true
            }));
          
          if (attributesData.length > 0) {
            await supabase.from("product_attributes").insert(attributesData);
          }
        }

        toast({ 
          title: "تم إنشاء المنتج من الصور بنجاح!",
          description: productNote || `تم تحليل ${images.length} صورة`
        });
        
        // Clear multi-select
        setGlobalSelectedImages([]);
        setMultiSelectMode(false);
        
        onNext(productId);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في حفظ المنتج",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  // Get all images across all posts for multi-select mode
  const allImages = posts.flatMap(post => 
    post.telegram_media.map(media => ({
      postId: post.id,
      url: media.remote_url || "",
      mediaId: media.id,
      postText: post.text,
      postDate: post.date
    }))
  ).filter(img => img.url);

  return (
    <div className="space-y-6">
      {/* Image Conversion Settings Banner */}
      <ImageConversionBanner />
      {/* Image Analysis Dialog */}
      {imageToAnalyze && (
        <ImageAnalysisDialog
          open={analysisDialogOpen}
          onOpenChange={setAnalysisDialogOpen}
          imageUrl={imageToAnalyze.url}
          imageBase64={imageToAnalyze.base64}
          previewUrl={imageToAnalyze.previewUrl}
          additionalImageUrls={imageToAnalyze.urls?.slice(1)}
          additionalBase64={imageToAnalyze.additionalBase64}
          onSave={handleAnalysisSave}
        />
      )}

      {/* Hidden file input for image analysis */}
      <input
        ref={analysisFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) handleImageAnalysis(files);
          e.target.value = "";
        }}
      />

      {/* Multi-Select Mode Banner */}
      {multiSelectMode && (
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-foreground">وضع اختيار الصور المتعددة</h3>
                  <p className="text-sm text-muted-foreground">
                    تم اختيار {globalSelectedImages.length} صور - اختر الصور لإنشاء منتج واحد
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMultiSelectMode(false);
                    setGlobalSelectedImages([]);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleAnalyzeMultipleImages}
                  disabled={globalSelectedImages.length === 0 || isAnalyzingMultiple}
                >
                  {isAnalyzingMultiple ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 ml-2" />
                  )}
                  تحليل ودمج ({globalSelectedImages.length})
                </Button>
              </div>
            </div>
            
            {globalSelectedImages.length >= 2 && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span>إذا كانت نفس التصميم بألوان مختلفة = منتج متنوع</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>إذا كانت تصميمات مختلفة = منتج مجمع</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Analysis Section */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">تحليل صورة بالذكاء الاصطناعي</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            ارفع صورة أو عدة صور لنفس المنتج وسيتم تحليلها ودمجها في منتج واحد تلقائياً
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full h-24 border-dashed border-2 hover:border-purple-500/50 hover:bg-purple-500/5"
            onClick={() => analysisFileInputRef.current?.click()}
            disabled={isPreparingAnalysisImage}
          >
            <div className="flex flex-col items-center gap-2">
              {isPreparingAnalysisImage ? (
                <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              ) : (
                <Camera className="h-8 w-8 text-purple-500" />
              )}
              <span>{isPreparingAnalysisImage ? "جاري تجهيز الصور..." : "اضغط لرفع صورة أو عدة صور لنفس المنتج"}</span>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Manual Entry Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">إدخال يدوي</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            أدخل بيانات المنتج يدوياً أو تحدث بها
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>نص المنتج</Label>
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                ) : isRecording ? (
                  <MicOff className="h-4 w-4 ml-1" />
                ) : (
                  <Mic className="h-4 w-4 ml-1" />
                )}
                {isRecording ? "إيقاف" : "تحدث"}
              </Button>
            </div>
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="اكتب أو تحدث عن المنتج...
              
اسم المنتج: قميص قطني
السعر: 150 ريال
الألوان: أبيض، أسود، رمادي"
              rows={5}
              dir="auto"
            />
          </div>

          <div className="space-y-2">
            <Label>الصور (اختياري)</Label>
            <ImageUploader
              images={manualImages}
              onImagesChange={setManualImages}
              imgbbApiKey={imgbb.api_key}
            />
          </div>

          <Button 
            onClick={handleManualSubmit} 
            disabled={isSubmittingManual || !manualText.trim()}
            className="w-full"
          >
            {isSubmittingManual ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                إنشاء مسودة
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Telegram Posts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">منشورات Telegram</h2>
            <p className="text-sm text-muted-foreground">
              {posts.length} منشور غير معالج
            </p>
          </div>
          <div className="flex gap-2">
            {!multiSelectMode && allImages.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => setMultiSelectMode(true)}
              >
                <Layers className="h-4 w-4 ml-2" />
                دمج صور متعددة
              </Button>
            )}
            <Button onClick={syncPosts} disabled={isSyncing}>
              <RefreshCw className={cn("h-4 w-4 ml-2", isSyncing && "animate-spin")} />
              {isSyncing ? "جاري المزامنة..." : "مزامنة الآن"}
            </Button>
          </div>
        </div>

        {/* Multi-select grid view */}
        {multiSelectMode && allImages.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {allImages.map((img) => {
                  const isSelected = globalSelectedImages.some(s => s.mediaId === img.mediaId);
                  return (
                    <button
                      key={img.mediaId}
                      onClick={() => toggleGlobalImage(img.postId, img.url, img.mediaId)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-standard",
                        isSelected ? "border-orange-500 ring-2 ring-orange-500/30" : "border-transparent hover:border-muted"
                      )}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center bg-orange-500/30 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}>
                        <Check className="h-6 w-6 text-white bg-orange-500 rounded-full p-1" />
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {globalSelectedImages.findIndex(s => s.mediaId === img.mediaId) + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="p-8 text-center">
              <InboxIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">لا توجد منشورات</h3>
              <p className="text-sm text-muted-foreground mb-4">
                قم بمزامنة قناة Telegram أو استخدم الإدخال اليدوي
              </p>
              <Button onClick={syncPosts} disabled={isSyncing}>
                <RefreshCw className={cn("h-4 w-4 ml-2", isSyncing && "animate-spin")} />
                مزامنة الآن
              </Button>
            </CardContent>
          </Card>
        ) : !multiSelectMode && (
          <div className="grid gap-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "transition-all duration-standard card-hover",
                  selectedPosts.includes(post.id) && "ring-2 ring-primary"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedPosts.includes(post.id)}
                          onCheckedChange={() => togglePost(post.id)}
                        />
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(post.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!post.text?.trim() && post.telegram_media.length > 0 && (
                          <Badge variant="outline" className="text-purple-500 border-purple-500/30">
                            <Sparkles className="h-3 w-3 ml-1" />
                            صورة فقط
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          <ImageIcon className="h-3 w-3 ml-1" />
                          {post.telegram_media.length} صورة
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {post.text ? (
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed line-clamp-4">
                        {post.text}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        لا يوجد نص - سيتم تحليل الصور بالذكاء الاصطناعي
                      </p>
                    )}

                    {post.telegram_media.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {post.telegram_media.map((media, imgIndex) => {
                          const imageUrl = media.remote_url || "";
                          const isSelected = (selectedImages[post.id] || []).includes(imageUrl);
                          return (
                            <button
                              key={media.id}
                              onClick={() => toggleImage(post.id, imageUrl)}
                              className={cn(
                                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-standard",
                                isSelected ? "border-primary" : "border-transparent"
                              )}
                            >
                              <img
                                src={imageUrl}
                                alt={`صورة ${imgIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className={cn(
                                "absolute inset-0 flex items-center justify-center bg-primary/20 transition-opacity",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}>
                                <Check className="h-6 w-6 text-primary-foreground bg-primary rounded-full p-1" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      onClick={() => handleConvert(post)}
                      className="w-full"
                      disabled={!selectedPosts.includes(post.id) || processingPostId === post.id}
                    >
                      {processingPostId === post.id ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          {!post.text?.trim() ? "جاري التحليل..." : "جاري التحويل..."}
                        </>
                      ) : (
                        <>
                          {!post.text?.trim() ? (
                            <>
                              <Sparkles className="h-4 w-4 ml-2" />
                              تحليل الصور وإنشاء منتج
                            </>
                          ) : (
                            <>
                              <ArrowLeft className="h-4 w-4 ml-2" />
                              حوّل إلى منتج
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
