import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDraftProduct } from "@/hooks/useDraftProduct";
import { useAIProcessing } from "@/hooks/useAIProcessing";
import { cn } from "@/lib/utils";

interface AIProcessingTabProps {
  productId: string;
  onNext: () => void;
  onBack: () => void;
}

export function AIProcessingTab({ productId, onNext, onBack }: AIProcessingTabProps) {
  const { product, updateDraft, updateAttributes, isLoading, isSaving } = useDraftProduct(productId);
  const { isProcessing, isRegenerating, currentModel, processFullProduct, regenerateField, formatModelName } = useAIProcessing();
  
  const [processed, setProcessed] = useState(false);
  const [usedModel, setUsedModel] = useState<{ provider: string; model: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    short_description: "",
    long_description: "",
    price: "",
    tags: [] as string[],
  });
  const [attributes, setAttributes] = useState<{ name: string; values: string[]; is_variation: boolean }[]>([]);

  // Initialize from product when loaded
  useEffect(() => {
    if (product && !processed) {
      setFormData({
        name: product.name || "",
        short_description: product.short_description || "",
        long_description: product.long_description || "",
        price: product.price?.toString() || "",
        tags: [],
      });
    }
  }, [product, processed]);

  const handleProcess = async () => {
    if (!product) return;
    
    const originalText = product.long_description || product.short_description || product.name || "";
    if (!originalText.trim()) {
      return;
    }

    const result = await processFullProduct(originalText, productId);
    
    if (result) {
      setFormData({
        name: result.name || product.name || "",
        short_description: result.short_description || "",
        long_description: result.long_description || "",
        price: result.price?.toString() || product.price?.toString() || "",
        tags: result.tags || [],
      });
      setAttributes(result.attributes || []);
      if (result.provider && result.model) {
        setUsedModel({ provider: result.provider, model: result.model });
      }
      setProcessed(true);
    }
  };

  const handleRegenerate = async (field: "name" | "short_description" | "long_description") => {
    if (!product) return;
    
    const originalText = product.long_description || product.short_description || product.name || "";
    const result = await regenerateField(field, originalText, productId);
    
    if (result) {
      setFormData(prev => ({ ...prev, [field]: result }));
    }
  };

  const handleSaveAndNext = async () => {
    await updateDraft({
      name: formData.name,
      short_description: formData.short_description,
      long_description: formData.long_description,
      price: formData.price ? parseFloat(formData.price) : null,
      ai_processed_data: {
        name: formData.name,
        short_description: formData.short_description,
        long_description: formData.long_description,
        tags: formData.tags,
        attributes: attributes,
      },
      status: "ai_processed",
      product_type: attributes.length > 0 ? "variable" : "simple",
    });

    // Save attributes
    if (attributes.length > 0) {
      await updateAttributes(attributes);
    }

    onNext();
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
          <h2 className="text-lg font-bold text-foreground">المعالجة الذكية</h2>
          <p className="text-sm text-muted-foreground">
            {processed ? "راجع وعدّل النتائج" : "اضغط لبدء المعالجة بالذكاء الاصطناعي"}
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* Processing Button */}
      {!processed && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                {isProcessing && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {isProcessing ? "جاري التحليل والمعالجة..." : "جاهز للمعالجة الذكية"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isProcessing 
                    ? (currentModel 
                        ? `جاري المعالجة بـ ${formatModelName(currentModel.provider, currentModel.model)}`
                        : "يتم استخراج الاسم والوصف والمتغيرات تلقائياً")
                    : "سيتم تحليل النص واستخراج كل بيانات المنتج"
                  }
                </p>
              </div>
              {!isProcessing && (
                <Button onClick={handleProcess} size="lg">
                  <Sparkles className="h-4 w-4 ml-2" />
                  بدء المعالجة الذكية
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Form */}
      {processed && (
        <div className="space-y-4">
          {/* Used Model Badge */}
          {usedModel && (
            <div className="flex items-center justify-center">
              <Badge variant="secondary" className="gap-2 py-1.5 px-3">
                <Sparkles className="h-3.5 w-3.5" />
                تمت المعالجة بـ {formatModelName(usedModel.provider, usedModel.model)}
              </Badge>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
          {/* Name */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  اسم المنتج
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRegenerate("name")}
                  disabled={isRegenerating === "name"}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    isRegenerating === "name" && "animate-spin"
                  )} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="اسم المنتج"
              />
            </CardContent>
          </Card>

          {/* Price */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">السعر</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
            </CardContent>
          </Card>

          {/* Short Description */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  الوصف القصير
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRegenerate("short_description")}
                  disabled={isRegenerating === "short_description"}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    isRegenerating === "short_description" && "animate-spin"
                  )} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.short_description}
                onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                placeholder="وصف قصير للمنتج"
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Long Description */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  الوصف التفصيلي
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRegenerate("long_description")}
                  disabled={isRegenerating === "long_description"}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    isRegenerating === "long_description" && "animate-spin"
                  )} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.long_description}
                onChange={(e) => setFormData(prev => ({ ...prev, long_description: e.target.value }))}
                placeholder="وصف تفصيلي للمنتج"
                rows={5}
              />
            </CardContent>
          </Card>

          {/* Attributes / Variations */}
          {attributes.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  المتغيرات المستخرجة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Label className="min-w-[80px] font-medium">{attr.name}:</Label>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((value, vIndex) => (
                        <Badge key={vIndex} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                    {attr.is_variation && (
                      <Badge variant="outline" className="mr-auto">
                        متغير
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {formData.tags.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">الوسوم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
        {processed && (
          <Button onClick={handleSaveAndNext} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4 ml-2" />
            )}
            حفظ ومتابعة للمراجعة
          </Button>
        )}
      </div>
    </div>
  );
}
