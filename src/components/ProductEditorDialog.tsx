import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Sparkles, 
  Loader2, 
  Check, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fileToWebpBlob, blobToBase64 } from "@/lib/webp";

interface ProductImage {
  id: string;
  url: string;
  is_featured: boolean | null;
}

interface ProductData {
  id: string;
  name: string | null;
  short_description: string | null;
  long_description: string | null;
  price: number | null;
  sale_price?: number | null;
  currency: string | null;
  sku: string | null;
  product_type: string | null;
  status?: string | null;
  slug?: string | null;
  product_images: ProductImage[];
}

interface ProductEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData | null;
  onSave: () => void;
}

interface FieldState {
  value: string;
  aiResult: string | null;
  isProcessing: boolean;
  showAI: boolean;
}

type FieldName = "name" | "short_description" | "long_description";

const FIELD_LABELS: Record<FieldName, string> = {
  name: "اسم المنتج",
  short_description: "الوصف القصير",
  long_description: "الوصف الطويل",
};

export function ProductEditorDialog({ open, onOpenChange, product, onSave }: ProductEditorDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [expandedField, setExpandedField] = useState<FieldName | null>("name");
  const [imageUrls, setImageUrls] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  
  const [fields, setFields] = useState<Record<FieldName, FieldState>>({
    name: { value: "", aiResult: null, isProcessing: false, showAI: false },
    short_description: { value: "", aiResult: null, isProcessing: false, showAI: false },
    long_description: { value: "", aiResult: null, isProcessing: false, showAI: false },
  });
  
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [sku, setSku] = useState("");
  const [productType, setProductType] = useState("simple");
  const [slug, setSlug] = useState("");
  const [enhancingSlug, setEnhancingSlug] = useState(false);

  // Initialize fields when product changes
  useEffect(() => {
    if (product && open) {
      setFields({
        name: { value: product.name || "", aiResult: null, isProcessing: false, showAI: false },
        short_description: { value: product.short_description || "", aiResult: null, isProcessing: false, showAI: false },
        long_description: { value: product.long_description || "", aiResult: null, isProcessing: false, showAI: false },
      });
      setPrice(product.price?.toString() || "");
      setSalePrice(product.sale_price?.toString() || "");
      setCurrency(product.currency || "SAR");
      setSku(product.sku || "");
      setProductType(product.product_type || "simple");
      setProductImages(product.product_images || []);
      setSlug((product as any).slug || "");
      setImageUrls("");
    }
  }, [product, open]);

  const handleEnhanceSlug = async () => {
    if (!fields.name.value.trim()) {
      toast({ title: "أدخل اسم المنتج أولاً", variant: "destructive" });
      return;
    }
    setEnhancingSlug(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-product-slug", {
        body: {
          name: fields.name.value,
          description: fields.short_description.value || fields.long_description.value,
          current_slug: slug,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل");
      setSlug(data.slug);
      toast({ title: "تم توليد رابط SEO", description: data.slug });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setEnhancingSlug(false);
    }
  };

  const processFieldWithAI = async (fieldName: FieldName) => {
    const field = fields[fieldName];
    if (!field.value.trim()) {
      toast({ title: "الحقل فارغ", variant: "destructive" });
      return;
    }

    setFields(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isProcessing: true, showAI: true }
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-process", {
        body: {
          draft_product_id: product?.id,
          original_text: field.value,
          field: fieldName,
        },
      });

      if (response.error) throw response.error;

      const result = response.data?.result || field.value;
      
      setFields(prev => ({
        ...prev,
        [fieldName]: { 
          ...prev[fieldName], 
          aiResult: result, 
          isProcessing: false 
        }
      }));

      toast({ title: "تم التحسين بنجاح" });
    } catch (error: any) {
      console.error("AI error:", error);
      setFields(prev => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], isProcessing: false }
      }));
      toast({ 
        title: "خطأ في المعالجة", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const applyAIResult = (fieldName: FieldName) => {
    const aiResult = fields[fieldName].aiResult;
    if (aiResult) {
      setFields(prev => ({
        ...prev,
        [fieldName]: { 
          ...prev[fieldName], 
          value: aiResult, 
          aiResult: null, 
          showAI: false 
        }
      }));
    }
  };

  const discardAIResult = (fieldName: FieldName) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], aiResult: null, showAI: false }
    }));
  };

  const handleAddImageUrls = async () => {
    if (!imageUrls.trim()) return;
    
    const urls = imageUrls.split("\n").filter(url => url.trim());
    if (urls.length === 0) return;

    setIsUploadingImages(true);
    try {
      for (const url of urls) {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) continue;

        // Check if it's a valid URL
        try {
          new URL(trimmedUrl);
        } catch {
          continue;
        }

        // Add to product_images table
        if (product) {
          const { data, error } = await supabase
            .from("product_images")
            .insert({
              draft_product_id: product.id,
              url: trimmedUrl,
              is_featured: productImages.length === 0,
              sort_order: productImages.length,
            })
            .select()
            .single();

          if (!error && data) {
            setProductImages(prev => [...prev, data]);
          }
        }
      }
      setImageUrls("");
      toast({ title: "تمت إضافة الصور بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ في إضافة الصور", variant: "destructive" });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !product) return;

    setIsUploadingImages(true);
    try {
      for (const file of Array.from(files)) {
        let base64Image = "";
        try {
          const webpBlob = await fileToWebpBlob(file, 88);
          base64Image = await blobToBase64(webpBlob);
        } catch (_) {
          base64Image = await fileToBase64(file);
        }

        const response = await supabase.functions.invoke("imgbb-upload", {
          body: { image: base64Image },
        });

        if (response.error) throw response.error;

        const imgbbUrl = response.data?.url;
        if (imgbbUrl) {
          const { data, error } = await supabase
            .from("product_images")
            .insert({
              draft_product_id: product.id,
              url: imgbbUrl,
              is_featured: productImages.length === 0,
              sort_order: productImages.length,
              source: "imgbb",
            })
            .select()
            .single();

          if (!error && data) {
            setProductImages(prev => [...prev, data]);
          }
        }
      }
      toast({ title: "تم رفع الصور بنجاح" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "خطأ في رفع الصور", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingImages(false);
      e.target.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      await supabase.from("product_images").delete().eq("id", imageId);
      setProductImages(prev => prev.filter(img => img.id !== imageId));
      toast({ title: "تم حذف الصورة" });
    } catch (error) {
      toast({ title: "خطأ في حذف الصورة", variant: "destructive" });
    }
  };

  const handleSetFeatured = async (imageId: string) => {
    if (!product) return;
    try {
      // Remove featured from all
      await supabase
        .from("product_images")
        .update({ is_featured: false })
        .eq("draft_product_id", product.id);
      
      // Set new featured
      await supabase
        .from("product_images")
        .update({ is_featured: true })
        .eq("id", imageId);

      setProductImages(prev => prev.map(img => ({
        ...img,
        is_featured: img.id === imageId
      })));
      
      toast({ title: "تم تعيين الصورة الرئيسية" });
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!product) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("draft_products")
        .update({
          name: fields.name.value,
          short_description: fields.short_description.value,
          long_description: fields.long_description.value,
          price: price ? parseFloat(price) : null,
          sale_price: salePrice ? parseFloat(salePrice) : null,
          currency,
          sku: sku || null,
          product_type: productType,
          slug: slug || null,
        } as any)
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: "تم الحفظ بنجاح" });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ 
        title: "خطأ في الحفظ", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (fieldName: FieldName) => {
    const field = fields[fieldName];
    const isExpanded = expandedField === fieldName;
    const isTextarea = fieldName !== "name";

    return (
      <Collapsible 
        key={fieldName}
        open={isExpanded} 
        onOpenChange={(open) => setExpandedField(open ? fieldName : null)}
      >
        <Card className={cn(
          "transition-all",
          isExpanded && "ring-2 ring-primary/50"
        )}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Label className="cursor-pointer font-medium">
                  {FIELD_LABELS[fieldName]}
                </Label>
                {field.value && (
                  <Badge variant="secondary" className="text-xs">
                    {field.value.length} حرف
                  </Badge>
                )}
                {field.aiResult && (
                  <Badge className="bg-primary text-xs">
                    <Sparkles className="h-3 w-3 ml-1" />
                    تحسين جاهز
                  </Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {isTextarea ? (
                <Textarea
                  value={field.value}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    [fieldName]: { ...prev[fieldName], value: e.target.value }
                  }))}
                  placeholder={`أدخل ${FIELD_LABELS[fieldName]}...`}
                  rows={fieldName === "long_description" ? 6 : 3}
                  className="resize-none"
                />
              ) : (
                <Input
                  value={field.value}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    [fieldName]: { ...prev[fieldName], value: e.target.value }
                  }))}
                  placeholder={`أدخل ${FIELD_LABELS[fieldName]}...`}
                />
              )}

              {/* AI Section */}
              <AnimatePresence>
                {field.showAI && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {field.isProcessing ? (
                      <div className="flex items-center justify-center p-4 bg-primary/5 rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
                        <span className="text-sm text-muted-foreground">جاري التحسين...</span>
                      </div>
                    ) : field.aiResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary">
                            <Sparkles className="h-3 w-3 ml-1" />
                            نتيجة AI
                          </Badge>
                        </div>
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm whitespace-pre-line max-h-40 overflow-y-auto">
                          {field.aiResult}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processFieldWithAI(fieldName)}
                          >
                            <RefreshCw className="h-4 w-4 ml-1" />
                            إعادة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => discardAIResult(fieldName)}
                          >
                            <X className="h-4 w-4 ml-1" />
                            تجاهل
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyAIResult(fieldName)}
                          >
                            <Check className="h-4 w-4 ml-1" />
                            تطبيق
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Button */}
              {!field.showAI && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processFieldWithAI(fieldName)}
                  disabled={!field.value.trim()}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 ml-2" />
                  تحسين بالذكاء الاصطناعي
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل المنتج</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Images Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                صور المنتج
              </Label>
              
              {/* Current Images */}
              {productImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productImages.map((img) => (
                    <div 
                      key={img.id} 
                      className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden group"
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {img.is_featured && (
                        <Badge className="absolute top-1 right-1 text-[8px] px-1">رئيسية</Badge>
                      )}
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!img.is_featured && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleSetFeatured(img.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleRemoveImage(img.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Images by URL */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  إضافة صور بالروابط (رابط في كل سطر)
                </Label>
                <Textarea
                  value={imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  rows={3}
                  className="resize-none text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddImageUrls}
                  disabled={!imageUrls.trim() || isUploadingImages}
                  className="w-full"
                >
                  {isUploadingImages ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 ml-2" />
                  )}
                  إضافة الروابط
                </Button>
              </div>

              {/* Upload Images */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  رفع صور (سيتم تحويلها إلى ImgBB)
                </Label>
                <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingImages}
                  />
                  {isUploadingImages ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">اسحب الصور أو انقر للاختيار</span>
                    </div>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Text Fields with AI */}
          <div className="space-y-3">
            {(["name", "short_description", "long_description"] as FieldName[]).map(renderField)}
          </div>

          {/* Price & Other Fields */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>السعر</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>سعر التخفيض</Label>
                  <Input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>العملة</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">ريال سعودي</SelectItem>
                      <SelectItem value="AED">درهم إماراتي</SelectItem>
                      <SelectItem value="USD">دولار أمريكي</SelectItem>
                      <SelectItem value="EGP">جنيه مصري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="رمز المنتج"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع المنتج</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">منتج بسيط</SelectItem>
                      <SelectItem value="variable">منتج متغير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-1 shrink-0"><LinkIcon className="h-3.5 w-3.5 text-primary" />رابط المنتج (Slug)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleEnhanceSlug} disabled={enhancingSlug || !fields.name.value.trim()} className="h-8 px-2 shrink-0">
                    {enhancingSlug ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Sparkles className="h-4 w-4 ml-1 text-primary" />}
                    <span className="text-xs">تحسين بالذكاء الاصطناعي</span>
                  </Button>
                </div>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" placeholder="my-product-seo-slug" className="w-full min-w-0" />
                <p className="text-xs text-muted-foreground">سيُستخدم كرابط SEO عند النشر على المتجر.</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}