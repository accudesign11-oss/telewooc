import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  Upload,
  Image as ImageIcon,
  Link2,
  X,
  RefreshCw,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDraftProduct } from "@/hooks/useDraftProduct";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VariationsTabProps {
  productId: string;
  onNext: () => void;
  onBack: () => void;
}

interface Variation {
  id: string;
  attributes: Record<string, string>;
  price: number | null;
  sale_price: number | null;
  sku: string;
  image_url: string | null;
}

export function VariationsTab({ productId, onNext, onBack }: VariationsTabProps) {
  const { product, isLoading } = useDraftProduct(productId);
  const { imgbb } = useSettings();
  const { toast } = useToast();
  
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Generate variations from attributes
  useEffect(() => {
    if (product && product.product_attributes) {
      const variationAttrs = product.product_attributes.filter(attr => attr.is_variation);
      
      if (variationAttrs.length > 0) {
        // Generate all combinations
        const generateCombinations = (
          attrs: typeof variationAttrs, 
          index = 0, 
          current: Record<string, string> = {}
        ): Record<string, string>[] => {
          if (index >= attrs.length) {
            return [{ ...current }];
          }
          
          const attr = attrs[index];
          const values = Array.isArray(attr.values) ? attr.values : [];
          const results: Record<string, string>[] = [];
          
          for (const value of values) {
            results.push(...generateCombinations(attrs, index + 1, { ...current, [attr.name]: value as string }));
          }
          
          return results;
        };
        
        const combinations = generateCombinations(variationAttrs);
        
        setVariations(combinations.map((attrs, idx) => ({
          id: `var-${idx}`,
          attributes: attrs,
          price: product.price,
          sale_price: product.sale_price,
          sku: "",
          image_url: null,
        })));
      }
    }
  }, [product]);

  const handleImageUpload = async (index: number, file: File) => {
    const imgbbKey = imgbb?.api_key;
    if (!imgbbKey) {
      toast({
        title: "مطلوب API Key",
        description: "الرجاء إضافة imgbb API Key في الإعدادات",
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(index);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      // Upload to imgbb
      const { data, error } = await supabase.functions.invoke("imgbb-upload", {
        body: { image: base64, apiKey: imgbbKey },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "فشل رفع الصورة");
      }

      setVariations(prev => prev.map((v, i) => 
        i === index ? { ...v, image_url: data.url } : v
      ));

      toast({ title: "تم رفع الصورة" });
    } catch (error: any) {
      toast({
        title: "خطأ في رفع الصورة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleUrlInput = (index: number, url: string) => {
    setVariations(prev => prev.map((v, i) => 
      i === index ? { ...v, image_url: url } : v
    ));
  };

  const handlePriceChange = (index: number, field: "price" | "sale_price", value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setVariations(prev => prev.map((v, i) => 
      i === index ? { ...v, [field]: numValue } : v
    ));
  };

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      // Delete existing variations
      await supabase
        .from("product_variations")
        .delete()
        .eq("draft_product_id", productId);

      // Insert new variations
      if (variations.length > 0) {
        const inserts = variations.map(v => ({
          draft_product_id: productId,
          attributes: v.attributes,
          price: v.price,
          sale_price: v.sale_price,
          sku: v.sku || null,
          image_url: v.image_url,
        }));

        const { error } = await supabase.from("product_variations").insert(inserts);
        if (error) throw error;
      }

      toast({ title: "تم حفظ المتغيرات" });
      onNext();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setVariations(prev => prev.map((v, i) => 
      i === index ? { ...v, image_url: null } : v
    ));
  };

  const getVariationLabel = (attrs: Record<string, string>) => {
    return Object.values(attrs).join(" - ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Skip if not a variable product
  if (product?.product_type !== "variable" || variations.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="bg-muted/50">
          <CardContent className="p-8 text-center">
            <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">لا توجد متغيرات</h3>
            <p className="text-muted-foreground text-sm mb-4">
              هذا منتج بسيط بدون متغيرات (ألوان/مقاسات)
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowRight className="h-4 w-4 ml-2" />
                رجوع
              </Button>
              <Button onClick={onNext}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                متابعة للمراجعة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">إدارة المتغيرات</h2>
          <p className="text-sm text-muted-foreground">
            {variations.length} متغير - أضف صورة لكل متغير
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* Variations List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {variations.map((variation, index) => (
          <Card key={variation.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="secondary">{index + 1}</Badge>
                {getVariationLabel(variation.attributes)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Image Area */}
              <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 relative overflow-hidden bg-muted/50">
                {variation.image_url ? (
                  <>
                    <img 
                      src={variation.image_url} 
                      alt={getVariationLabel(variation.attributes)}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
                    {uploadingIndex === index ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          اسحب صورة أو اضغط للرفع
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Image Input Options */}
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="upload" className="text-xs">
                    <Upload className="h-3 w-3 ml-1" />
                    رفع
                  </TabsTrigger>
                  <TabsTrigger value="url" className="text-xs">
                    <Link2 className="h-3 w-3 ml-1" />
                    رابط
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="text-xs h-8"
                    disabled={uploadingIndex === index}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(index, file);
                    }}
                  />
                </TabsContent>
                <TabsContent value="url" className="mt-2">
                  <Input
                    type="url"
                    placeholder="https://..."
                    className="text-xs h-8"
                    dir="ltr"
                    value={variation.image_url || ""}
                    onChange={(e) => handleUrlInput(index, e.target.value)}
                  />
                </TabsContent>
              </Tabs>

              {/* Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">السعر</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={variation.price || ""}
                    onChange={(e) => handlePriceChange(index, "price", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">سعر العرض</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={variation.sale_price || ""}
                    onChange={(e) => handlePriceChange(index, "sale_price", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
        <Button onClick={handleSaveAndNext} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4 ml-2" />
          )}
          حفظ ومتابعة للمراجعة
        </Button>
      </div>
    </div>
  );
}
