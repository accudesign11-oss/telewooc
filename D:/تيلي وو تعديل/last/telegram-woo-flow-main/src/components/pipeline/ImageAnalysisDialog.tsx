import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Loader2, 
  Save, 
  X, 
  Wand2,
  Tag,
  Palette,
  Ruler,
  DollarSign,
  Layers,
  Package,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  name: string;
  short_description: string;
  long_description: string;
  category?: string;
  suggested_price?: number | null;
  tags?: string[];
  detected_features?: {
    color?: string;
    material?: string;
    style?: string;
    target_audience?: string;
  };
  attributes?: Array<{
    name: string;
    values: string[];
    is_variation: boolean;
  }>;
  is_same_design_different_colors?: boolean;
  is_different_designs?: boolean;
}

interface ImageAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Remote URL (http/https) only. */
  imageUrl: string;
  /** data:... base64 */
  imageBase64?: string;
  /** Local preview URL (blob:...) - used for preview only, not sent to backend. */
  previewUrl?: string;
  additionalImageUrls?: string[]; // يمكن أن تكون URLs أو base64
  /** Additional images as base64 - already converted from URLs */
  additionalBase64?: string[];
  onSave: (data: AnalysisResult, imageUrl: string) => void;
}

export function ImageAnalysisDialog({
  open,
  onOpenChange,
  imageUrl,
  imageBase64,
  previewUrl,
  additionalImageUrls = [],
  additionalBase64: propAdditionalBase64 = [],
  onSave,
}: ImageAnalysisDialogProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState<AnalysisResult>({
    name: "",
    short_description: "",
    long_description: "",
    tags: [],
    attributes: [],
    is_same_design_different_colors: false,
    is_different_designs: false,
  });
  const [newTag, setNewTag] = useState("");

  // دالة لتنسيق اسم الموديل للعرض
  const formatModelName = (provider: string, model: string): string => {
    const providerNames: Record<string, string> = {
      lovable: "Lovable AI",
      gemini: "Google Gemini",
      openrouter: "OpenRouter",
      huggingface: "Hugging Face",
    };
    
    let cleanModel = model;
    if (model.includes("/")) {
      cleanModel = model.split("/").pop() || model;
    }
    if (cleanModel.includes(":")) {
      cleanModel = cleanModel.split(":")[0];
    }
    cleanModel = cleanModel.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    const providerName = providerNames[provider] || provider;
    return `${providerName} (${cleanModel})`;
  };

  const isRemoteUrl = (url: string) => url.startsWith("http://") || url.startsWith("https://");
  const remoteImageUrl = isRemoteUrl(imageUrl) ? imageUrl : undefined;
  const isReadyToAnalyze = Boolean(imageBase64 || remoteImageUrl);

  // التعامل مع كل من URLs و base64
  const primaryImage = previewUrl || imageBase64 || imageUrl;
  const allImages = [primaryImage, ...additionalImageUrls].filter(Boolean);
  const hasMultipleImages = allImages.length > 1;

  useEffect(() => {
    if (open && isReadyToAnalyze) {
      setCurrentImageIndex(0);
      analyzeImage();
    }
  }, [open, imageUrl, imageBase64]);

  const analyzeImage = async () => {
    if (!isReadyToAnalyze) return;

    setIsAnalyzing(true);
    try {
      // فصل base64 عن URLs في additionalImageUrls
      const isBase64 = (str: string) => str.startsWith("data:");

      const additionalBase64FromUrls = additionalImageUrls.filter(isBase64);
      const additionalUrls = additionalImageUrls
        .filter((url) => !isBase64(url))
        .filter((url) => isRemoteUrl(url));

      // دمج base64 من كلا المصدرين (propAdditionalBase64 و additionalBase64FromUrls)
      const allAdditionalBase64 = [...propAdditionalBase64, ...additionalBase64FromUrls];

      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: {
          image_url: remoteImageUrl || undefined,
          image_base64: imageBase64 || undefined,
          additional_image_urls: additionalUrls.length > 0 ? additionalUrls : undefined,
          additional_image_base64: allAdditionalBase64.length > 0 ? allAdditionalBase64 : undefined,
          analyze_multiple: hasMultipleImages,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.result) {
        setFormData({
          name: data.result.name || "",
          short_description: data.result.short_description || "",
          long_description: data.result.long_description || "",
          category: data.result.category,
          suggested_price: data.result.suggested_price,
          tags: data.result.tags || [],
          detected_features: data.result.detected_features,
          attributes: data.result.attributes || [],
          is_same_design_different_colors: data.result.is_same_design_different_colors || false,
          is_different_designs: data.result.is_different_designs || false,
        });
        
        // عرض الموديل المستخدم
        const provider = data.provider || "unknown";
        const model = data.model || "unknown";
        const displayModel = formatModelName(provider, model);
        
        toast({
          title: hasMultipleImages ? `تم تحليل ${allImages.length} صور بنجاح!` : "تم تحليل الصورة بنجاح!",
          description: `باستخدام ${displayModel}`,
        });
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "خطأ في تحليل الصورة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnhanceField = async (field: "name" | "short_description" | "long_description") => {
    if (!formData[field]) return;
    
    setIsEnhancing(field);
    try {
      const { data, error } = await supabase.functions.invoke("ai-process", {
        body: { 
          original_text: formData[field],
          field 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({ ...prev, [field]: data.result }));
      
      // عرض الموديل المستخدم
      const provider = data.provider || "unknown";
      const model = data.model || "unknown";
      const displayModel = formatModelName(provider, model);
      
      toast({ 
        title: "تم التحسين!", 
        description: `باستخدام ${displayModel}` 
      });
    } catch (error: any) {
      toast({
        title: "خطأ في التحسين",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const handleAttributeChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes?.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      ) || []
    }));
  };

  const handleAddAttributeValue = (index: number, value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes?.map((attr, i) => 
        i === index 
          ? { ...attr, values: [...attr.values, value.trim()] }
          : attr
      ) || []
    }));
  };

  const handleRemoveAttributeValue = (attrIndex: number, valueIndex: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes?.map((attr, i) => 
        i === attrIndex 
          ? { ...attr, values: attr.values.filter((_, vi) => vi !== valueIndex) }
          : attr
      ) || []
    }));
  };

  const handleAddAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...(prev.attributes || []), { name: "", values: [], is_variation: true }]
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "الرجاء إدخال اسم المنتج", variant: "destructive" });
      return;
    }
    onSave(formData, imageUrl);
    onOpenChange(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] md:w-full p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            تحليل {hasMultipleImages ? `${allImages.length} صور` : "الصورة"} بالذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Product Type Badge */}
            {hasMultipleImages && !isAnalyzing && (
              <div className="flex items-center gap-2">
                {formData.is_same_design_different_colors && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Palette className="h-3 w-3 ml-1" />
                    منتج متنوع - نفس التصميم بألوان مختلفة
                  </Badge>
                )}
                {formData.is_different_designs && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                    <Package className="h-3 w-3 ml-1" />
                    منتج مجمع - تصميمات مختلفة
                  </Badge>
                )}
                {!formData.is_same_design_different_colors && !formData.is_different_designs && (
                  <Badge variant="secondary">
                    <Layers className="h-3 w-3 ml-1" />
                    {allImages.length} صور
                  </Badge>
                )}
              </div>
            )}

            {/* Image Preview */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full max-w-[200px] mx-auto md:max-w-none md:w-48 shrink-0">
                <div className="aspect-square rounded-lg overflow-hidden border">
                  <img 
                    src={allImages[currentImageIndex]} 
                    alt="Product" 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {hasMultipleImages && (
                  <>
                    <div className="absolute inset-y-0 left-0 flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 shadow"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 shadow"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-2 py-1 rounded text-xs">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                {/* Thumbnail strip */}
                {hasMultipleImages && (
                  <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "w-10 h-10 rounded overflow-hidden border-2 shrink-0 transition-all",
                          idx === currentImageIndex ? "border-primary" : "border-transparent opacity-60"
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isAnalyzing ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-3" />
                    <p className="font-medium text-foreground">
                      جاري تحليل {hasMultipleImages ? `${allImages.length} صور` : "الصورة"}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasMultipleImages 
                        ? "يتم مقارنة الصور وتحديد نوع المنتج" 
                        : "يتم استخراج تفاصيل المنتج"}
                    </p>
                  </div>
                </div>
              ) : formData.detected_features && (
                <div className="flex-1 space-y-3">
                  <h4 className="font-medium text-foreground">الخصائص المكتشفة:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.detected_features.color && (
                      <div className="flex items-center gap-2 text-sm">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <span>اللون: {formData.detected_features.color}</span>
                      </div>
                    )}
                    {formData.detected_features.material && (
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span>المادة: {formData.detected_features.material}</span>
                      </div>
                    )}
                    {formData.detected_features.style && (
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span>الستايل: {formData.detected_features.style}</span>
                      </div>
                    )}
                    {formData.detected_features.target_audience && (
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                        <span>الفئة: {formData.detected_features.target_audience}</span>
                      </div>
                    )}
                  </div>
                  {formData.category && (
                    <Badge variant="secondary">{formData.category}</Badge>
                  )}
                  {formData.suggested_price && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">السعر المقترح: {formData.suggested_price}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Editable Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>اسم المنتج *</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnhanceField("name")}
                    disabled={isEnhancing === "name" || !formData.name}
                  >
                    {isEnhancing === "name" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    <span className="mr-1">تحسين</span>
                  </Button>
                </div>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم المنتج"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الوصف القصير</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnhanceField("short_description")}
                    disabled={isEnhancing === "short_description" || !formData.short_description}
                  >
                    {isEnhancing === "short_description" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    <span className="mr-1">تحسين</span>
                  </Button>
                </div>
                <Textarea
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="وصف قصير للمنتج"
                  rows={2}
                />
              </div>

              {/* Long Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الوصف التفصيلي</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEnhanceField("long_description")}
                    disabled={isEnhancing === "long_description" || !formData.long_description}
                  >
                    {isEnhancing === "long_description" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    <span className="mr-1">تحسين</span>
                  </Button>
                </div>
                <Textarea
                  value={formData.long_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, long_description: e.target.value }))}
                  placeholder="وصف تفصيلي للمنتج"
                  rows={5}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>التاغات</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="أضف تاغ جديد"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  />
                  <Button variant="outline" onClick={handleAddTag}>إضافة</Button>
                </div>
              </div>

              <Separator />

              {/* Attributes/Variations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">المتغيرات (ألوان، مقاسات، إلخ)</Label>
                  <Button variant="outline" size="sm" onClick={handleAddAttribute}>
                    إضافة متغير
                  </Button>
                </div>

                {formData.attributes?.map((attr, attrIndex) => (
                  <Card key={attrIndex}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={attr.name}
                          onChange={(e) => handleAttributeChange(attrIndex, "name", e.target.value)}
                          placeholder="اسم المتغير (مثل: اللون، المقاس)"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            attributes: prev.attributes?.filter((_, i) => i !== attrIndex)
                          }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {attr.values.map((value, valueIndex) => (
                          <Badge key={valueIndex} variant="outline" className="gap-1">
                            {value}
                            <button onClick={() => handleRemoveAttributeValue(attrIndex, valueIndex)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="أضف قيمة جديدة"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddAttributeValue(attrIndex, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 md:p-6 pt-0 flex flex-col-reverse sm:flex-row gap-2 justify-end border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant="outline" onClick={analyzeImage} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
            إعادة التحليل
          </Button>
          <Button onClick={handleSave} disabled={isAnalyzing}>
            <Save className="h-4 w-4 ml-2" />
            حفظ وإنشاء مسودة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
