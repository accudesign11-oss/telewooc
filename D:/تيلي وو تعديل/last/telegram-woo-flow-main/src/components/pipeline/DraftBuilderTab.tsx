import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  GripVertical,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraftProduct } from "@/hooks/useDraftProduct";
import { useSettings } from "@/hooks/useSettings";
import { ImageUploader } from "@/components/ImageUploader";
import { ProfessionalDescriptionPanel, DEFAULT_PRO_SETTINGS, ProfessionalDescriptionSettings } from "@/components/ProfessionalDescriptionPanel";
import { supabase } from "@/integrations/supabase/client";
import { stripCssFromHtml } from "@/lib/cleanDescription";

interface DraftBuilderTabProps {
  productId: string;
  onNext: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

export function DraftBuilderTab({ productId, onNext, onBack, onDelete }: DraftBuilderTabProps) {
  const { product, isLoading, isSaving, updateDraft, updateAttributes, deleteDraft, refetch } = useDraftProduct(productId);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذه المسودة؟")) return;
    setIsDeleting(true);
    const success = await deleteDraft(productId);
    setIsDeleting(false);
    if (success && onDelete) {
      onDelete();
    }
  };
  const { imgbb } = useSettings();
  
  const [formData, setFormData] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    price: "",
    currency: "SAR",
    productType: "simple",
    sku: "",
  });

  const [attributes, setAttributes] = useState<{ name: string; values: string[] }[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; thumbnailUrl?: string }[]>([]);
  const [proSettings, setProSettings] = useState<ProfessionalDescriptionSettings>(DEFAULT_PRO_SETTINGS);
  const [proHtml, setProHtml] = useState<string>("");

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        shortDescription: product.short_description || "",
        longDescription: product.long_description || "",
        price: product.price?.toString() || "",
        currency: product.currency || "EGP",
        productType: product.product_type || "simple",
        sku: product.sku || "",
      });
      setAttributes(
        product.product_attributes.map((a) => ({
          name: a.name,
          values: (a.values as string[]) || [],
        }))
      );
      setUploadedImages(
        (product.product_images || []).map((img) => ({
          id: img.id,
          url: img.url,
        }))
      );
    }
  }, [product]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Track whether user has modified images (added/removed) vs just loading from DB
  const [imagesModified, setImagesModified] = useState(false);

  const handleSave = async () => {
    const finalLongDesc = proSettings.enabled && proHtml ? proHtml : formData.longDescription;
    await updateDraft({
      name: formData.name,
      short_description: formData.shortDescription,
      long_description: stripCssFromHtml(finalLongDesc),
      price: formData.price ? parseFloat(formData.price) : null,
      currency: formData.currency,
      product_type: formData.productType,
      sku: formData.sku || null,
      status: "draft",
    });
    await updateAttributes(attributes);

    // Only re-save images if the user actually changed them
    // This prevents accidentally wiping DB images when state hasn't loaded yet
    const validImagesToSave = uploadedImages.filter(img => img.url && !img.isUploading);
    
    if (imagesModified && validImagesToSave.length > 0) {
      await supabase.from("product_images").delete().eq("draft_product_id", productId);
      const inserts = validImagesToSave.map((img, i) => ({
        draft_product_id: productId,
        url: img.url,
        is_featured: i === 0,
        sort_order: i,
        source: "builder",
      }));
      await supabase.from("product_images").insert(inserts);
    }
    // If images not modified OR no valid images, leave DB images untouched
  };

  const handleNext = async () => {
    await handleSave();
    onNext();
  };

  const addAttribute = () => {
    setAttributes(prev => [...prev, { name: "", values: [] }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const updateAttributeName = (index: number, name: string) => {
    setAttributes(prev => prev.map((a, i) => i === index ? { ...a, name } : a));
  };

  const addAttributeValue = (index: number, value: string) => {
    if (!value.trim()) return;
    setAttributes(prev => prev.map((a, i) => 
      i === index ? { ...a, values: [...a.values, value.trim()] } : a
    ));
  };

  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    setAttributes(prev => prev.map((a, i) => 
      i === attrIndex ? { ...a, values: a.values.filter((_, vi) => vi !== valueIndex) } : a
    ));
  };

  if (isLoading) {
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
          <h2 className="text-lg font-bold text-foreground">بناء المنتج</h2>
          <p className="text-sm text-muted-foreground">
            أكمل بيانات المنتج ثم تابع لإنشاء المتغيرات
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* Form */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المنتج</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="أدخل اسم المنتج"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">الوصف القصير</Label>
              <Textarea
                id="shortDesc"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                placeholder="وصف مختصر للمنتج"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longDesc">الوصف الطويل</Label>
              <Textarea
                id="longDesc"
                value={formData.longDescription}
                onChange={(e) => handleInputChange("longDescription", e.target.value)}
                placeholder="وصف تفصيلي للمنتج"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Description */}
        <Card className="md:col-span-2">
          <CardContent className="p-0">
            <ProfessionalDescriptionPanel
              value={proSettings}
              onChange={setProSettings}
              productName={formData.name}
              productType={formData.productType}
              baseDescription={formData.longDescription || formData.shortDescription}
              images={(product?.product_images || []).map((i: any) => i.url).filter(Boolean)}
              generatedHtml={proHtml}
              onGenerated={setProHtml}
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">التسعير والتصنيف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">السعر</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="AED">درهم إماراتي</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (اختياري)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="رمز المنتج"
              />
            </div>

            <div className="space-y-2">
              <Label>نوع المنتج</Label>
              <Select
                value={formData.productType}
                onValueChange={(value) => handleInputChange("productType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">منتج بسيط</SelectItem>
                  <SelectItem value="variable">منتج متغير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">الصور</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploader
              images={uploadedImages}
              onImagesChange={(newImages) => {
                setUploadedImages(newImages);
                setImagesModified(true);
              }}
              imgbbApiKey={imgbb.api_key}
            />
          </CardContent>
        </Card>

        {/* Attributes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">الخصائص</CardTitle>
            <Button size="sm" variant="outline" onClick={addAttribute}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {attributes.map((attr, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-muted rounded-lg"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-grab" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={attr.name}
                    onChange={(e) => updateAttributeName(index, e.target.value)}
                    placeholder="اسم الخاصية (مثل: المقاس)"
                    className="h-8"
                  />
                  <div className="flex flex-wrap gap-1">
                    {attr.values.map((value, vIndex) => (
                      <Badge key={vIndex} variant="secondary" className="gap-1">
                        {value}
                        <button 
                          className="hover:text-destructive"
                          onClick={() => removeAttributeValue(index, vIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      placeholder="قيمة جديدة"
                      className="h-6 w-24 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addAttributeValue(index, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeAttribute(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button 
          variant="destructive" 
          onClick={handleDelete} 
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 ml-2" />
          )}
          حذف المسودة
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <Button onClick={handleNext} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4 ml-2" />
            )}
            حفظ ومتابعة
          </Button>
        </div>
      </div>
    </div>
  );
}
