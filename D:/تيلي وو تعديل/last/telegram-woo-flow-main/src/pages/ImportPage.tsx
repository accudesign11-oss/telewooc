import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Link, 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  ImagePlus,
  X,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchProductFromUrl, extractAllImageUrlsFromText } from "@/lib/productScraper";

interface ProductAttribute {
  name: string;
  values: string[];
  is_variation: boolean;
}

interface ImportedProduct {
  id: string;
  sourceUrl: string;
  name: string;
  short_description: string;
  long_description: string;
  price: number | null;
  images: string[];
  selectedIndices: Set<number>;
  tags: string[];
  attributes: ProductAttribute[];
}

// ═══════════════════════════════════════════════════════════════
// SMART PRODUCT IMAGE - Automatically cycles through 6 proxies if error
// ═══════════════════════════════════════════════════════════════

function SmartProductImage({ originalUrl, className }: { originalUrl: string; className?: string }) {
  const cleanUrl = originalUrl
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  const sources = [
    cleanUrl.startsWith("data:") ? cleanUrl : `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=300&q=80`,
    cleanUrl,
    cleanUrl.startsWith("data:") ? cleanUrl : `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=300&q=80`,
    cleanUrl.startsWith("data:") ? cleanUrl : `https://images.weserv.nl/?url=${cleanUrl}&w=300&q=80`,
    cleanUrl.startsWith("data:") ? cleanUrl : `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
    cleanUrl.startsWith("data:") ? cleanUrl : `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`
  ];

  const [srcIndex, setSrcIndex] = useState(0);

  return (
    <img
      src={sources[srcIndex] || cleanUrl}
      alt=""
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (srcIndex < sources.length - 1) {
          setSrcIndex(prev => prev + 1);
        }
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════

export default function ImportPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [urls, setUrls] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [processingProductIdx, setProcessingProductIdx] = useState<number | null>(null);
  
  const [products, setProducts] = useState<ImportedProduct[]>([]);

  // ─── URL Management ───
  const addUrlField = () => setUrls(prev => [...prev, ""]);
  const removeUrlField = (idx: number) => setUrls(prev => prev.filter((_, i) => i !== idx));
  const updateUrl = (idx: number, val: string) => setUrls(prev => prev.map((u, i) => i === idx ? val : u));

  // ─── Import ───
  const handleImport = async () => {
    const validUrls = urls.filter(u => u.trim() !== "");
    if (validUrls.length === 0) {
      toast({ title: "الرجاء إدخال رابط واحد على الأقل", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    const newProducts: ImportedProduct[] = [];

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i].trim();
      setLoadingStatus(`جاري استخراج بيانات المنتج ${i + 1} من ${validUrls.length}...`);
      
      try {
        const scraped = await fetchProductFromUrl(url);

        const descImages = [
          ...extractAllImageUrlsFromText(scraped.short_description || ""),
          ...extractAllImageUrlsFromText(scraped.long_description || "")
        ];

        const allImageUrls = [...new Set([...(scraped.images || []), ...descImages])]
          .map(u => u.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
          .filter(u => u.startsWith('http') || u.startsWith('data:'));

        newProducts.push({
          id: crypto.randomUUID(),
          sourceUrl: url,
          name: scraped.name || "منتج مستورد من رابط",
          short_description: scraped.short_description || `منتج تم استيراده من الرابط: ${url}`,
          long_description: scraped.long_description || scraped.short_description || `وصف المنتج المستورد من الرابط: ${url}`,
          price: scraped.price,
          images: allImageUrls,
          selectedIndices: new Set(allImageUrls.map((_, idx) => idx)), // select all by default
          tags: scraped.tags || ["استيراد حقيقي"],
          attributes: scraped.attributes || [
            { name: "اللون", values: ["أسود", "أبيض", "رمادي"], is_variation: true },
          ],
        });
      } catch (error: any) {
        console.error(`Import error for ${url}:`, error);
        toast({
          title: "خطأ في الاستيراد",
          description: `فشل استيراد: ${url}`,
          variant: "destructive",
        });
      }
    }

    if (newProducts.length > 0) {
      setProducts(newProducts);
      const totalImages = newProducts.reduce((sum, p) => sum + p.images.length, 0);
      toast({ title: "تم الاستيراد بنجاح! 🚀", description: `تم استخراج ${newProducts.length} منتجات و ${totalImages} صورة` });
    }
    
    setIsLoading(false);
    setLoadingStatus("");
  };

  // ─── AI Processing for specific product ───
  const handleFullAIProcess = async (idx: number) => {
    const prod = products[idx];
    setProcessingProductIdx(idx);
    try {
      const originalText = `${prod.name}\n${prod.short_description}\n${prod.long_description}`;
      const { data, error } = await supabase.functions.invoke("ai-process", {
        body: { original_text: originalText, mode: "full" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.result;
      setProducts(prev => prev.map((p, i) => i === idx ? {
        ...p,
        name: result.name || p.name,
        short_description: result.short_description || p.short_description,
        long_description: result.long_description || p.long_description,
        price: result.price ?? p.price,
        tags: result.tags || [],
        attributes: result.attributes || [],
      } : p));
      
      toast({ title: "تمت المعالجة بالذكاء الاصطناعي" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setProcessingProductIdx(null);
    }
  };

  // ─── Image Selection ───
  const toggleImageSelection = (prodIdx: number, imgIdx: number) => {
    setProducts(prev => prev.map((p, i) => {
      if (i === prodIdx) {
        const newSet = new Set(p.selectedIndices);
        if (newSet.has(imgIdx)) newSet.delete(imgIdx);
        else newSet.add(imgIdx);
        return { ...p, selectedIndices: newSet };
      }
      return p;
    }));
  };

  // ─── Send to Auto Pipeline ───
  const handleSendToAutoPipeline = () => {
    if (products.length === 0) return;

    if (products.some(p => p.selectedIndices.size === 0)) {
       toast({ title: "تنبيه", description: "بعض المنتجات ليس لها صور محددة.", variant: "destructive" });
       return;
    }

    const bulkImportProducts = products.map(p => {
      const selectedImages = p.images
        .filter((_, idx) => p.selectedIndices.has(idx));

      return {
        id: p.id,
        aiName: p.name,
        aiShortDesc: p.short_description,
        aiLongDesc: p.long_description,
        price: p.price ? p.price.toString() : "",
        rawImageUrls: selectedImages,
        skipAiVision: true,
      };
    });

    toast({ title: "جاري التوجيه إلى الأوتو بايبلاين..." });
    navigate("/pipeline", { state: { bulkImportProducts } });
  };

  return (
    <AppLayout title="استيراد بالرابط">
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* URL Input */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Link className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">استيراد منتجات متعددة</h2>
              <p className="text-sm text-muted-foreground">أدخل الروابط لاستخراج البيانات تلقائياً</p>
            </div>
            
            <div className="space-y-3">
              {urls.map((u, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input 
                    value={u} 
                    onChange={(e) => updateUrl(idx, e.target.value)} 
                    placeholder="https://example.com/product" 
                    dir="ltr"
                    className="flex-1"
                  />
                  {urls.length > 1 && (
                    <Button variant="ghost" className="text-red-500" onClick={() => removeUrlField(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={addUrlField} className="gap-2 text-primary border-primary/30">
                <Plus className="h-4 w-4" /> إضافة رابط آخر
              </Button>
              <Button onClick={handleImport} disabled={urls.every(u => !u.trim()) || isLoading} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                استيراد البيانات
              </Button>
            </div>

            {isLoading && loadingStatus && (
              <div className="text-center text-sm text-primary font-medium bg-primary/10 p-3 rounded-lg border border-primary/20 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                {loadingStatus}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Editor */}
        {products.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg gap-4">
              <div>
                <h3 className="font-bold text-amber-700">تم استيراد {products.length} منتجات</h3>
                <p className="text-sm text-amber-700/80">
                  {products.reduce((s, p) => s + p.images.length, 0)} صور مستخرجة — راجع واختر الصور المطلوبة ثم اضغط إرسال
                </p>
              </div>
              <Button onClick={handleSendToAutoPipeline} className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 shadow-lg whitespace-nowrap">
                <Zap className="h-4 w-4 fill-black" />
                إرسال الجميع إلى الأوتو بايبلاين
              </Button>
            </div>

            {products.map((product, idx) => (
              <Card key={product.id} className="border-primary/20">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">المنتج {idx + 1}</CardTitle>
                      <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline block mt-1" dir="ltr">
                        {product.sourceUrl}
                      </a>
                    </div>
                    <Button size="sm" onClick={() => handleFullAIProcess(idx)} disabled={processingProductIdx === idx} variant="outline" className="gap-2 border-primary/30 whitespace-nowrap">
                      {processingProductIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                      تحسين النصوص بالذكاء الاصطناعي
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <Label>اسم المنتج</Label>
                        <Input
                          value={product.name}
                          onChange={(e) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                        />
                      </div>
                      <div>
                        <Label>السعر (اختياري الآن)</Label>
                        <Input
                          type="number"
                          value={product.price || ""}
                          onChange={(e) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, price: e.target.value ? parseFloat(e.target.value) : null } : p))}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>الوصف القصير</Label>
                        <Textarea
                          rows={1}
                          value={product.short_description}
                          onChange={(e) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, short_description: e.target.value } : p))}
                        />
                      </div>
                      <div>
                        <Label>الوصف الطويل</Label>
                        <Textarea
                          rows={3}
                          value={product.long_description}
                          onChange={(e) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, long_description: e.target.value } : p))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Images */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>
                        الصور المستخرجة (تم تحديد {product.selectedIndices.size} من {product.images.length})
                      </Label>
                      {product.images.length === 0 && (
                        <Badge variant="destructive" className="text-xs">لم يتم العثور على صور</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                      {product.images.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          onClick={() => toggleImageSelection(idx, imgIdx)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            product.selectedIndices.has(imgIdx) 
                              ? "border-primary ring-2 ring-primary/20" 
                              : "border-transparent opacity-50 hover:opacity-100"
                          }`}
                        >
                          <SmartProductImage
                            originalUrl={imgUrl}
                            className="w-full h-full object-cover bg-muted"
                          />
                          {product.selectedIndices.has(imgIdx) && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-primary-foreground bg-primary rounded-full p-1" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSendToAutoPipeline} className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 h-12 px-8 text-base shadow-lg w-full sm:w-auto">
                <Zap className="h-5 w-5 fill-black" />
                إرسال جميع المنتجات للأوتو بايبلاين
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
