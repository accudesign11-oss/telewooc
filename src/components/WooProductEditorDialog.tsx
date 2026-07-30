import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Save, X, Link as LinkIcon, RefreshCw } from "lucide-react";
import { WooProduct } from "@/hooks/useWooCommerceProducts";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { urlToWebpBlob, blobToBase64 } from "@/lib/webp";
import { logActivity, withAudit } from "@/lib/audit";

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
}

interface WooProductEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: WooProduct | null;
  onSave: (productId: number, data: Partial<WooProduct>) => Promise<any>;
}

export function WooProductEditorDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: WooProductEditorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    short_description: "",
    regular_price: "",
    sale_price: "",
    sku: "",
    status: "publish",
    slug: "",
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [enhancingSlug, setEnhancingSlug] = useState(false);
  const [freshingSlug, setFreshingSlug] = useState(false);
  const { imgbb } = useSettings();
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        short_description: product.short_description || "",
        regular_price: product.regular_price || "",
        sale_price: product.sale_price || "",
        sku: product.sku || "",
        status: product.status || "publish",
        slug: product.slug || "",
      });
      setImages(product.images?.map((img, i) => ({ 
        id: `img-${i}`, 
        url: img.src,
      })) || []);
    }
  }, [product]);

  const invokeSlug = async (mode: "enhance" | "fresh") => {
    const { data, error } = await supabase.functions.invoke("enhance-product-slug", {
      body: {
        name: formData.name,
        description: formData.short_description || formData.description,
        categories: (product?.categories || []).map((c) => c.name),
        current_slug: formData.slug,
        mode,
      },
    });

    if (error) {
      let detail = error.message;
      if (error instanceof FunctionsHttpError) {
        try { detail = await error.context.text(); } catch (_) {}
      }
      throw new Error(detail || "فشل الاتصال بخدمة توليد الرابط");
    }
    if (!data?.ok) throw new Error(data?.error || "لم يتم توليد رابط");
    return data.slug as string;
  };

  const handleEnhanceSlug = async () => {
    setEnhancingSlug(true);
    try {
      const slug = await invokeSlug("enhance");
      setFormData((p) => ({ ...p, slug }));
      toast({ title: "تم تحسين الرابط", description: slug });
    } catch (e: any) {
      toast({ title: "خطأ في تحسين الرابط", description: e.message, variant: "destructive" });
    } finally {
      setEnhancingSlug(false);
    }
  };

  const handleFreshSlug = async () => {
    if (!formData.name.trim()) {
      toast({ title: "أدخل اسم المنتج أولاً", variant: "destructive" });
      return;
    }
    setFreshingSlug(true);
    try {
      const slug = await invokeSlug("fresh");
      setFormData((p) => ({ ...p, slug }));
      toast({ title: "تم توليد رابط جديد", description: slug });
    } catch (e: any) {
      toast({ title: "خطأ في توليد الرابط", description: e.message, variant: "destructive" });
    } finally {
      setFreshingSlug(false);
    }
  };

  const handleEnhanceField = async (field: string, currentValue: string) => {
    if (!currentValue.trim()) {
      toast({ title: "لا يوجد محتوى للتحسين", variant: "destructive" });
      return;
    }

    // Map WooCommerce field names to ai-process field names
    const fieldMap: Record<string, string> = {
      name: "name",
      short_description: "short_description",
      description: "long_description",
    };
    
    const aiField = fieldMap[field];
    if (!aiField) {
      toast({ title: "لا يمكن تحسين هذا الحقل", variant: "destructive" });
      return;
    }

    setEnhancingField(field);
    try {
      const { data, error } = await supabase.functions.invoke("ai-process", {
        body: {
          original_text: currentValue,
          field: aiField,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.result) {
        setFormData(prev => ({ ...prev, [field]: data.result }));
        toast({ title: "تم التحسين بنجاح" });
      }
    } catch (error: any) {
      console.error("Enhance error:", error);
      toast({
        title: "خطأ في التحسين",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnhancingField(null);
    }
  };

  const handleImagesChange = (newImages: UploadedImage[]) => {
    setImages(newImages);
  };

  const handleSave = async () => {
    if (!product) return;

    setIsSaving(true);
    toast({ title: "جاري الفحص وتحويل جميع الصور إلى صيغة WebP قبل النشر..." });

    let finalImages = images;
    try {
      finalImages = await Promise.all(
        images.map(async (img) => {
          if (img.url.toLowerCase().includes(".webp")) {
            return img; // Already WebP format
          }
          try {
            if (imgbb?.api_key) {
              const webpBlob = await urlToWebpBlob(img.url, 88);
              const base64 = await blobToBase64(webpBlob);
              const res = await supabase.functions.invoke("imgbb-upload", {
                body: { image: base64, apiKey: imgbb.api_key },
              });
              if (res.data?.success && res.data?.url) {
                return { ...img, url: res.data.url };
              }
            }
          } catch (err) {
            console.warn("WebP conversion before WooCommerce publish failed for image:", img.url, err);
          }
          return img;
        })
      );
      setImages(finalImages);
    } catch (e) {
      console.warn("Image conversion error in handleSave", e);
    }

    const oldValues = {
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      sku: product.sku,
      status: product.status,
      slug: product.slug,
      images_count: product.images?.length || 0,
    };
    const newValues = { ...formData, images_count: finalImages.length };
    try {
      await withAudit(
        {
          action: "update",
          entity_type: "woo_product",
          entity_id: String(product.id),
          metadata: { name: formData.name, id: product.id },
          old_values: oldValues,
          resource_url: product.permalink || null,
        },
        () =>
          onSave(product.id, {
            ...formData,
            images: finalImages.map((img, i) => ({ src: img.url, alt: formData.name, position: i })),
          } as any),
      );
      // record new values separately with actual final data
      await logActivity({
        action: "update",
        entity_type: "woo_product",
        entity_id: String(product.id),
        metadata: { name: formData.name, id: product.id, note: "post-save snapshot" },
        new_values: newValues,
        resource_url: product.permalink || null,
      });
      toast({ title: "تم حفظ المنتج ونشره بصور WebP بنجاح ✨" });
      onOpenChange(false);
    } catch {
      // toast handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (
    label: string,
    field: keyof typeof formData,
    isTextarea = false
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleEnhanceField(field, formData[field])}
          disabled={enhancingField === field || !formData[field]}
        >
          {enhancingField === field ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="mr-1">تحسين AI</span>
        </Button>
      </div>
      {isTextarea ? (
        <Textarea
          value={formData[field]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          rows={4}
          dir="auto"
        />
      ) : (
        <Input
          value={formData[field]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          dir="auto"
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>تعديل المنتج</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] pl-2 sm:pl-4">
          <div className="space-y-6 py-4">
            {/* Images */}
            <div className="space-y-2">
              <Label>الصور</Label>
              <ImageUploader 
                images={images} 
                onImagesChange={handleImagesChange}
                imgbbApiKey={imgbb.api_key}
              />
            </div>

            {renderField("اسم المنتج", "name")}
            {renderField("الوصف القصير", "short_description", true)}
            {renderField("الوصف الكامل", "description", true)}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="flex items-center gap-1 shrink-0"><LinkIcon className="h-3.5 w-3.5 text-primary" />رابط المنتج (Slug)</Label>
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={handleEnhanceSlug} disabled={enhancingSlug || freshingSlug || !formData.name.trim()} className="h-8 px-2">
                    {enhancingSlug ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Sparkles className="h-4 w-4 ml-1 text-primary" />}
                    <span className="text-xs">تحسين AI</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleFreshSlug} disabled={enhancingSlug || freshingSlug || !formData.name.trim()} title="توليد رابط جديد مختلف" className="h-8 px-2">
                    {freshingSlug ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <RefreshCw className="h-4 w-4 ml-1" />}
                    <span className="text-xs">جديد</span>
                  </Button>
                </div>
              </div>
              <div className="w-full min-w-0">
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  dir="ltr"
                  placeholder="product-name-seo-friendly"
                  className="w-full min-w-0"
                />
              </div>
              {product?.permalink && (
                <p className="text-xs text-muted-foreground break-all" dir="ltr">
                  {product.permalink.replace(/\/[^/]+\/?$/, "/")}{formData.slug || "…"}/
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("السعر", "regular_price")}
              {renderField("سعر العرض", "sale_price")}
            </div>

            {renderField("SKU", "sku")}

            <div className="space-y-2">
              <Label>الحالة</Label>
              <div className="flex gap-2">
                {["publish", "draft", "pending"].map(status => (
                  <Badge
                    key={status}
                    variant={formData.status === status ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                  >
                    {status === "publish" ? "منشور" : status === "draft" ? "مسودة" : "معلق"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:w-auto">
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ التغييرات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
