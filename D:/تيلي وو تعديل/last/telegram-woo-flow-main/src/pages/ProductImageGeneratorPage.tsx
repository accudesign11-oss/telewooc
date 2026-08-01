import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageAnalysisDialog } from "@/components/pipeline/ImageAnalysisDialog";
import { 
  Upload, 
  Download, 
  Trash2, 
  ImageIcon, 
  Loader2,
  Sparkles,
  Wand2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ====== Types ======
type GenerationMode = 'display' | 'dimensions' | 'context' | 'model';

interface GenerationInfo {
  model: string;
  provider: 'gemini';
  latency_ms: number;
}

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  base64: string;
  generatedImage: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  error?: string;
  selected: boolean;
  generationInfo?: GenerationInfo;
}

// ====== Constants ======
const BACKGROUND_OPTIONS = [
  { value: 'white', label: 'أبيض نظيف', prompt: 'pure white studio background' },
  { value: 'gradient', label: 'تدرج رمادي', prompt: 'soft gray gradient background' },
  { value: 'studio', label: 'استوديو احترافي', prompt: 'professional photography studio with soft lighting' },
  { value: 'marble', label: 'رخام فاخر', prompt: 'elegant marble surface background' },
  { value: 'wood', label: 'خشب طبيعي', prompt: 'natural wood texture background' },
];

const CONTEXT_OPTIONS = [
  { value: 'living', label: 'غرفة معيشة', prompt: 'modern living room interior' },
  { value: 'bedroom', label: 'غرفة نوم', prompt: 'cozy bedroom interior' },
  { value: 'office', label: 'مكتب', prompt: 'professional office space' },
  { value: 'outdoor', label: 'خارجي', prompt: 'beautiful outdoor setting' },
];

// ====== Helpers ======
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const convertToWebP = (base64: string, quality: number): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/webp', quality / 100));
    };
    img.onerror = () => resolve(null);
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
};

// ====== Component ======
export default function ProductImageGeneratorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Images state
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Mode & settings
  const [mode, setMode] = useState<GenerationMode>('display');
  const [background, setBackground] = useState('white');
  const [context, setContext] = useState('living');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // WebP settings
  const [convertWebP, setConvertWebP] = useState(true);
  const [webpQuality, setWebpQuality] = useState(82);
  
  // Product creation
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<{ primaryImage: string; additionalImages: string[] }>({ primaryImage: '', additionalImages: [] });

  // Error dialog state (no more fallback to Lovable)
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    imageId: string;
    geminiError: string;
  }>({ open: false, imageId: '', geminiError: '' });

  // ====== Build prompt based on mode ======
  const buildPrompt = useCallback((): string => {
    let prompt = '';
    
    switch (mode) {
      case 'display':
        const bg = BACKGROUND_OPTIONS.find(b => b.value === background);
        prompt = `Create a professional e-commerce product photo. Place the product on a ${bg?.prompt || 'white background'}. Ultra-realistic, high-quality product photography with perfect lighting. The product should be the main focus, clearly visible and attractive for online store display.`;
        break;
        
      case 'dimensions':
        prompt = `Create a technical product image with precise measurement annotations like AutoCAD drawings. Show the product with dimension lines, arrows, and measurements in centimeters. Clean technical drawing style with white background. Professional blueprint-style with clear readable dimensions.`;
        break;
        
      case 'context':
        const ctx = CONTEXT_OPTIONS.find(c => c.value === context);
        prompt = `Place this product naturally in a ${ctx?.prompt || 'modern interior'}. Ultra-realistic interior design photography. The product should be integrated seamlessly into the scene, looking natural and attractive. Professional real estate/interior photography style.`;
        break;
        
      case 'model':
        prompt = `Show this clothing item being worn by a professional model. Ultra-realistic fashion photography, natural pose, attractive setting. High-quality editorial style photo.`;
        break;
    }
    
    if (customPrompt.trim()) {
      prompt += ` Additional requirements: ${customPrompt}`;
    }
    
    return prompt;
  }, [mode, background, context, customPrompt]);

  // ====== Handle file selection ======
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    const newImages: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      const preview = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      
      newImages.push({
        id: `${Date.now()}-${i}`,
        file,
        preview,
        base64,
        generatedImage: null,
        status: 'pending',
        selected: false
      });
    }
    
    setImages(prev => [...prev, ...newImages]);
  }, []);

  // ====== Generate single image ======
  // ====== Generate single image (Gemini only) ======
  const generateSingleImage = async (image: ImageItem): Promise<ImageItem> => {
    const prompt = buildPrompt();
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          prompt,
          images: [{
            type: 'image_url',
            image_url: { url: `data:${image.file.type};base64,${image.base64}` }
          }],
          mode
        }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'فشل في توليد الصورة');
      if (!data?.generatedImage) throw new Error('لم يتم إرجاع صورة');

      // Convert to WebP if enabled
      let finalImage = data.generatedImage;
      if (convertWebP) {
        const webp = await convertToWebP(data.generatedImage, webpQuality);
        if (webp) finalImage = webp;
      }

      // Extract generation info
      const generationInfo: GenerationInfo = {
        model: data.model || 'unknown',
        provider: 'gemini',
        latency_ms: data.latency_ms || 0
      };

      return { 
        ...image, 
        generatedImage: finalImage, 
        status: 'done',
        generationInfo 
      };
    } catch (err: any) {
      console.error('Generation error:', err);
      return { ...image, status: 'error', error: err.message };
    }
  };
  
  // ====== Close error dialog ======
  const handleCloseErrorDialog = () => {
    const imageId = errorDialog.imageId;
    const geminiError = errorDialog.geminiError;

    setErrorDialog({ open: false, imageId: '', geminiError: '' });

    // Mark as error with Gemini error message
    if (imageId) {
      setImages(prev => prev.map(i => 
        i.id === imageId ? { ...i, status: 'error', error: `فشل Gemini: ${geminiError || 'غير معروف'}` } : i
      ));
    }
  };

  // ====== Generate all pending images ======
  const handleGenerateAll = async () => {
    const pending = images.filter(img => img.status === 'pending');
    if (pending.length === 0) {
      toast({ title: "لا توجد صور للتوليد", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    let failCount = 0;
    let lastModel: string | null = null;

    for (const img of pending) {
      setImages(prev => prev.map(i => 
        i.id === img.id ? { ...i, status: 'generating' } : i
      ));

      const result = await generateSingleImage(img);
      
      if (result.status === 'done') {
        successCount++;
        if (result.generationInfo) {
          lastModel = result.generationInfo.model;
        }
      } else {
        failCount++;
      }

      setImages(prev => prev.map(i => 
        i.id === img.id ? result : i
      ));
    }

    setIsGenerating(false);
    
    const modelShort = lastModel?.split('/').pop() || lastModel;
    
    toast({
      title: failCount > 0 ? "انتهى مع أخطاء" : "تم التوليد بنجاح ✨",
      description: `نجح: ${successCount} | فشل: ${failCount}${lastModel ? ` | Gemini (${modelShort})` : ''}`,
      variant: failCount > 0 ? "destructive" : undefined
    });
  };

  // ====== Regenerate single image ======
  const handleRegenerate = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img) return;

    setImages(prev => prev.map(i => 
      i.id === imageId ? { ...i, status: 'generating', error: undefined } : i
    ));

    const result = await generateSingleImage({ ...img, status: 'pending' });
    
    setImages(prev => prev.map(i => 
      i.id === imageId ? result : i
    ));

    if (result.status === 'done') {
      const modelShort = result.generationInfo?.model?.split('/').pop() || '';
      toast({ 
        title: "تم إعادة التوليد ✨",
        description: `Gemini (${modelShort})`
      });
    } else {
      toast({ title: "فشل", description: result.error, variant: "destructive" });
    }
  };

  // ====== Download image ======
  const handleDownload = (image: ImageItem) => {
    if (!image.generatedImage) return;
    
    const link = document.createElement('a');
    link.href = image.generatedImage;
    link.download = `generated_${image.file.name.split('.')[0]}.${convertWebP ? 'webp' : 'png'}`;
    link.click();
  };

  // ====== Remove image ======
  const handleRemove = (imageId: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== imageId);
    });
  };

  // ====== Clear all ======
  const handleClearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  // ====== Toggle selection ======
  const toggleSelect = (imageId: string) => {
    setImages(prev => prev.map(i => 
      i.id === imageId ? { ...i, selected: !i.selected } : i
    ));
  };

  // ====== Create product from selected images ======
  const handleCreateProduct = () => {
    const selected = images.filter(i => i.selected && i.status === 'done');
    if (selected.length === 0) {
      toast({ title: "اختر صور أولاً", variant: "destructive" });
      return;
    }

    // Use first image as primary, rest as additional
    const primaryImage = selected[0].generatedImage || '';
    const additionalImages = selected.slice(1).map(img => img.generatedImage || '').filter(Boolean);
    
    setSelectedForAnalysis({ primaryImage, additionalImages });
    setAnalysisOpen(true);
  };

  const handleAnalysisSave = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
        return;
      }

      const { data: product, error } = await supabase
        .from("draft_products")
        .insert({
          user_id: user.id,
          name: data.name,
          short_description: data.short_description,
          long_description: data.long_description,
          price: data.suggested_price || null,
          status: "draft",
          tags: data.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      const selected = images.filter(i => i.selected && i.status === 'done');
      const imageInserts = selected.map((img, index) => ({
        draft_product_id: product.id,
        url: img.generatedImage || '',
        is_featured: index === 0,
        sort_order: index,
        source: 'ai_generated'
      }));

      if (imageInserts.length > 0) {
        await supabase.from("product_images").insert(imageInserts);
      }

      toast({ title: "تم إنشاء المنتج بنجاح!" });
      navigate(`/pipeline?productId=${product.id}&step=2`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const pendingCount = images.filter(i => i.status === 'pending').length;
  const doneCount = images.filter(i => i.status === 'done').length;
  const selectedCount = images.filter(i => i.selected).length;

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              مولد صور المنتجات
            </h1>
            <p className="text-muted-foreground">حوّل صور منتجاتك إلى صور احترافية</p>
          </div>
          
          {doneCount > 0 && (
            <Button onClick={handleCreateProduct} disabled={selectedCount === 0}>
              إنشاء منتج ({selectedCount})
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">إعدادات التوليد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-2">
                <Label>وضع التوليد</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as GenerationMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">عرض المنتج</SelectItem>
                    <SelectItem value="dimensions">مقاسات تقنية</SelectItem>
                    <SelectItem value="context">في سياق</SelectItem>
                    <SelectItem value="model">على موديل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode-specific options */}
              {mode === 'display' && (
                <div className="space-y-2">
                  <Label>الخلفية</Label>
                  <Select value={background} onValueChange={setBackground}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === 'context' && (
                <div className="space-y-2">
                  <Label>السياق</Label>
                  <Select value={context} onValueChange={setContext}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom prompt */}
              <div className="space-y-2">
                <Label>إضافات مخصصة (اختياري)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="أضف تفاصيل إضافية..."
                  rows={3}
                />
              </div>

              {/* WebP Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>تحويل إلى WebP</Label>
                  <Switch checked={convertWebP} onCheckedChange={setConvertWebP} />
                </div>
                
                {convertWebP && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>الجودة</span>
                      <span>{webpQuality}%</span>
                    </div>
                    <Slider
                      value={[webpQuality]}
                      onValueChange={([v]) => setWebpQuality(v)}
                      min={50}
                      max={100}
                      step={1}
                    />
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateAll} 
                disabled={isGenerating || pendingCount === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 ml-2" />
                    توليد الكل ({pendingCount})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Images Panel */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">الصور</CardTitle>
              {images.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  مسح الكل
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <label
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-4"
                onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-muted-foreground">اسحب الصور هنا أو انقر للرفع</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </label>

              {/* Images Grid */}
              {images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد صور. ارفع صور منتجاتك للبدء.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img) => (
                    <div 
                      key={img.id} 
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        img.selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                      }`}
                    >
                      {/* Image Display */}
                      <div className="aspect-square relative bg-muted">
                        {img.status === 'done' && img.generatedImage ? (
                          <img 
                            src={img.generatedImage} 
                            alt="Generated" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={img.preview} 
                            alt="Original" 
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Status Overlay */}
                        {img.status === 'generating' && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                              <p className="text-sm mt-2">جاري التوليد...</p>
                            </div>
                          </div>
                        )}

                        {img.status === 'error' && (
                          <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                            <div className="text-center p-2">
                              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                              <p className="text-xs mt-1 text-destructive">{img.error}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {img.status === 'pending' && (
                          <Badge variant="secondary">في الانتظار</Badge>
                        )}
                        {img.status === 'done' && (
                          <Badge className="bg-green-500">تم</Badge>
                        )}
                        {img.status === 'error' && (
                          <Badge variant="destructive">خطأ</Badge>
                        )}
                      </div>

                      {/* Provider Info Badge */}
                      {img.status === 'done' && img.generationInfo && (
                        <div className="absolute bottom-12 left-1 right-1">
                          <Badge 
                            variant="outline" 
                            className="w-full justify-center text-[10px] bg-background/90 backdrop-blur-sm"
                          >
                            🔷 Gemini • {' '}
                            {img.generationInfo.model?.split('/').pop()?.replace('-image-preview', '')} • {' '}
                            {(img.generationInfo.latency_ms / 1000).toFixed(1)}s
                          </Badge>
                        </div>
                      )}

                      {/* Selection checkbox for done images */}
                      {img.status === 'done' && (
                        <button
                          onClick={() => toggleSelect(img.id)}
                          className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            img.selected 
                              ? 'bg-primary border-primary text-primary-foreground' 
                              : 'bg-background/80 border-muted-foreground/50'
                          }`}
                        >
                          {img.selected && <Check className="h-4 w-4" />}
                        </button>
                      )}

                      {/* Actions */}
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1 justify-center">
                          {img.status === 'done' && (
                            <>
                              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleDownload(img)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleRegenerate(img.id)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {img.status === 'error' && (
                            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleRegenerate(img.id)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleRemove(img.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analysis Dialog */}
      <ImageAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        imageUrl=""
        imageBase64={selectedForAnalysis.primaryImage}
        additionalImageUrls={selectedForAnalysis.additionalImages}
        onSave={handleAnalysisSave}
      />
      
      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => {
        if (!open) handleCloseErrorDialog();
      }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              فشل توليد الصورة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-2">
              <p>فشل توليد الصورة باستخدام Gemini API.</p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                الخطأ: {errorDialog.geminiError}
              </p>
              <p>تأكد من صحة مفتاح API أو جرب لاحقاً.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseErrorDialog}>
              حسناً
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
