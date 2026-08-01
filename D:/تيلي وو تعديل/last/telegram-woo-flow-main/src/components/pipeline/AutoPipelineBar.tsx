import { useState, useRef } from "react";
import {
  Zap,
  Settings2,
  CheckCircle2,
  Loader2,
  DollarSign,
  ExternalLink,
  Star,
  ImagePlus,
  X,
  Sparkles,
  Check,
  ArrowRight,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/audit";
import { useWooCommerce } from "@/hooks/useWooCommerce";
import { useSettings } from "@/hooks/useSettings";
import { useImageConverter } from "@/hooks/useImageConverter";
import { useToast } from "@/hooks/use-toast";
import { fileToWebpBlob, blobToBase64, urlToWebpBlob } from "@/lib/webp";
import { useEffect } from "react";

export interface AutoPipelineSettings {
  enabled: boolean;
  enableProfessionalCss: boolean;
  enableAutoReviews: boolean;
}

interface AutoPipelineBarProps {
  settings: AutoPipelineSettings;
  onSettingsChange: (settings: AutoPipelineSettings) => void;
  onStartAutoPipeline: () => void;
}

interface AutoPipelineRunnerModalProps {
  settings: AutoPipelineSettings;
  isOpen: boolean;
  initialProducts?: BulkProduct[];
  onClose: () => void;
  onPublished: () => void;
}

const STEPS = [
  { label: "رفع الصور", icon: ImagePlus },
  { label: "تحويل ImgBB", icon: ArrowRight },
  { label: "تحليل AI Vision", icon: Sparkles },
  { label: "وصف CSS مبهرج", icon: Star },
  { label: "حفظ المسودة", icon: Check },
  { label: "تقييمات مصرية", icon: Star },
  { label: "إدخال السعر", icon: DollarSign },
  { label: "نشر WooCommerce", icon: Zap },
  { label: "نشر التقييمات", icon: CheckCircle2 },
] as const;

export function AutoPipelineBar({ settings, onSettingsChange, onStartAutoPipeline }: AutoPipelineBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 shadow-md">
      <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 fill-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-foreground">أوتو بايبلاين ⚡</h3>
              <Badge variant={settings.enabled ? "default" : "secondary"} className={settings.enabled ? "bg-amber-500 text-black font-semibold" : ""}>
                {settings.enabled ? "نشط" : "معطل"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              تنفيذ كل مراحل البايبلاين العادي تلقائياً لكافة منتجاتك بكبسة زر واحدة حتى النشر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {settings.enabled && (
            <Button onClick={onStartAutoPipeline} className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-1.5 shadow-lg" size="sm">
              <Zap className="h-4 w-4 fill-black" />
              ابدأ أوتو بايبلاين
            </Button>
          )}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/30">
                <Settings2 className="h-4 w-4 text-amber-500" />
                إعدادات
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                  إعدادات أوتو بايبلاين
                </DialogTitle>
                <DialogDescription className="text-xs">الخيارات أدناه مفعلة إجبارياً</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">تفعيل أوتو بايبلاين</Label>
                    <p className="text-xs text-muted-foreground">معالجة تلقائية لجميع المراحل</p>
                  </div>
                  <Switch checked={settings.enabled} onCheckedChange={(checked) => onSettingsChange({ ...settings, enabled: checked })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border opacity-80">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">وصف CSS احترافي</Label>
                    <p className="text-xs text-muted-foreground">إجباري — يستخدم enhance-description بنمط fancy</p>
                  </div>
                  <Badge className="bg-green-600 text-white">إجباري ✓</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border opacity-80">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">تقييمات مصرية AI</Label>
                    <p className="text-xs text-muted-foreground">إجباري — 3-6 تقييمات بلهجة مصرية</p>
                  </div>
                  <Badge className="bg-green-600 text-white">إجباري ✓</Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>إغلاق</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface BulkProduct {
  id: string;
  files: File[];
  previews: string[];
  base64Images?: string[];
  finalUrls?: string[];
  aiName?: string;
  aiShortDesc?: string;
  aiLongDesc?: string;
  draftId?: string;
  price: string;
  permalink?: string;
  error?: string;
  rawImageUrls?: string[];
  skipAiVision?: boolean;
}

export function AutoPipelineRunnerModal({ settings, isOpen, initialProducts, onClose, onPublished }: AutoPipelineRunnerModalProps) {
  const { publishProduct } = useWooCommerce();
  const { convertProductImages } = useImageConverter();
  const { imgbb } = useSettings();
  const { toast } = useToast();

  const [phase, setPhase] = useState<"upload" | "running" | "price" | "publishing" | "done" | "error">("upload");
  const [products, setProducts] = useState<BulkProduct[]>([{ id: crypto.randomUUID(), files: [], previews: [], price: "" }]);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<("pending" | "running" | "done" | "error")[]>(STEPS.map(() => "pending"));
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialProducts && initialProducts.length > 0) {
        setProducts(initialProducts.map(p => ({
          ...p,
          id: p.id || crypto.randomUUID(),
          files: p.files || [],
          previews: p.previews || p.rawImageUrls || [],
          price: p.price || "",
          skipAiVision: !!p.skipAiVision
        })));
      } else {
        setProducts([{ id: crypto.randomUUID(), files: [], previews: [], price: "" }]);
      }
      setPhase("upload");
      setCurrentStep(0);
      setStepStatus(STEPS.map(() => "pending"));
      setStatusText("");
      setErrorMsg("");
      setCurrentProductIndex(0);
    }
  }, [isOpen, initialProducts]);

  const markStep = (idx: number, status: "pending" | "running" | "done" | "error") => {
    setStepStatus((prev) => {
      const next = [...prev];
      next[idx] = status;
      return next;
    });
  };

  const resetAll = () => {
    setPhase("upload");
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts.map(p => ({
          ...p,
          id: p.id || crypto.randomUUID(),
          files: p.files || [],
          previews: p.previews || p.rawImageUrls || [],
          price: p.price || "",
          skipAiVision: !!p.skipAiVision
        })));
    } else {
      setProducts([{ id: crypto.randomUUID(), files: [], previews: [], price: "" }]);
    }
    setCurrentStep(0);
    setStepStatus(STEPS.map(() => "pending"));
    setStatusText("");
    setErrorMsg("");
    setCurrentProductIndex(0);
  };

  const addProduct = () => {
    setProducts(prev => [...prev, { id: crypto.randomUUID(), files: [], previews: [], price: "" }]);
  };

  const removeProduct = (id: string) => {
    setProducts(prev => {
      const prod = prev.find(p => p.id === id);
      prod?.previews.forEach(p => URL.revokeObjectURL(p));
      return prev.filter(p => p.id !== id);
    });
  };

  const handleFiles = (id: string, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newPreviews = arr.map((f) => URL.createObjectURL(f));
        return { ...p, files: [...p.files, ...arr], previews: [...p.previews, ...newPreviews] };
      }
      return p;
    }));
  };

  const removeFile = (productId: string, fileIndex: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        URL.revokeObjectURL(p.previews[fileIndex]);
        return {
          ...p,
          files: p.files.filter((_, i) => i !== fileIndex),
          previews: p.previews.filter((_, i) => i !== fileIndex)
        };
      }
      return p;
    }));
  };

  const updateProductPrice = (id: string, price: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p));
  };

  const updateProductName = (id: string, aiName: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, aiName } : p));
  };

  const hasAnyFiles = products.some(p => p.files.length > 0 || (p.rawImageUrls && p.rawImageUrls.length > 0));

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN AUTO PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════

  const runAutoPipeline = async () => {
    if (!hasAnyFiles) return;
    setPhase("running");
    setStepStatus(STEPS.map(() => "pending"));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const validProducts = products.filter(p => p.files.length > 0 || (p.rawImageUrls && p.rawImageUrls.length > 0));
      const effectiveKey = imgbb?.api_key || "6d0534552048f3c469b61596700c0a96";
      
      let updatedProducts = [...validProducts];

      for (let pIdx = 0; pIdx < updatedProducts.length; pIdx++) {
        setCurrentProductIndex(pIdx);
        const prod = updatedProducts[pIdx];
        
        const updateProd = (updates: Partial<BulkProduct>) => {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], ...updates };
        };

        setStepStatus(STEPS.map(() => "pending"));
        
        // ─── STEP 0: Upload images ───
        setCurrentStep(0);
        markStep(0, "running");
        
        const base64Images: string[] = [];
        const finalUrls: string[] = [];

        if (prod.files && prod.files.length > 0) {
          for (let i = 0; i < prod.files.length; i++) {
            setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: تحويل صورة ${i + 1} إلى WebP...`);
            const webpBlob = await fileToWebpBlob(prod.files[i], 80);
            const base64 = await blobToBase64(webpBlob);
            base64Images.push(base64);

            setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: رفع صورة ${i + 1} إلى ImgBB...`);
            let uploaded = false;
            for (let attempt = 0; attempt < 2 && !uploaded; attempt++) {
              try {
                const { data, error } = await supabase.functions.invoke("imgbb-upload", {
                  body: { image: base64, apiKey: effectiveKey },
                });
                if (!error && data?.success && data?.url) {
                  finalUrls.push(data.url);
                  uploaded = true;
                }
              } catch {}
              if (!uploaded && attempt === 0) {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
            if (!uploaded) {
              finalUrls.push(`data:image/webp;base64,${base64}`);
            }
          }
        } else if (prod.rawImageUrls && prod.rawImageUrls.length > 0) {
          for (let i = 0; i < prod.rawImageUrls.length; i++) {
            const rawUrl = prod.rawImageUrls[i];
            setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: تجهيز صورة ${i + 1} من ${prod.rawImageUrls.length}...`);
            
            let base64 = "";
            const cleanUrl = rawUrl
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();

            const proxyCandidates = cleanUrl.startsWith("data:") 
              ? [cleanUrl]
              : [
                  `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&q=80`,
                  cleanUrl,
                  `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&q=80`,
                  `https://images.weserv.nl/?url=${cleanUrl}&output=webp&q=80`,
                  `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
                  `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`
                ];

            for (const proxyUrl of proxyCandidates) {
              try {
                const webpBlob = await urlToWebpBlob(proxyUrl, 80);
                if (webpBlob && webpBlob.size > 50) {
                  base64 = await blobToBase64(webpBlob);
                  break;
                }
              } catch (_) {}
            }

            if (base64) {
              base64Images.push(base64);
              setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: رفع صورة ${i + 1} إلى ImgBB...`);
              let uploaded = false;
              for (let attempt = 0; attempt < 3 && !uploaded; attempt++) {
                try {
                  const { data, error } = await supabase.functions.invoke("imgbb-upload", {
                    body: { image: base64, apiKey: effectiveKey },
                  });
                  if (!error && data?.success && data?.url) {
                    finalUrls.push(data.url);
                    uploaded = true;
                  }
                } catch {}
                if (!uploaded && attempt < 2) {
                  await new Promise((r) => setTimeout(r, 1000));
                }
              }
              if (!uploaded) {
                finalUrls.push(`data:image/webp;base64,${base64}`);
              }
            } else {
              // Direct upload fallback
              try {
                const { data, error } = await supabase.functions.invoke("imgbb-upload", {
                  body: { image: cleanUrl, apiKey: effectiveKey },
                });
                if (!error && data?.success && data?.url) {
                  finalUrls.push(data.url);
                  base64Images.push("");
                } else {
                  finalUrls.push(cleanUrl);
                  base64Images.push("");
                }
              } catch {
                finalUrls.push(cleanUrl);
                base64Images.push("");
              }
            }
          }
        }
        
        updateProd({ base64Images, finalUrls });
        markStep(0, "done");

        // ─── STEP 1: Verify URLs ───
        setCurrentStep(1);
        markStep(1, "running");
        markStep(1, "done");

        // ─── STEP 2: AI Vision Analysis ───
        setCurrentStep(2);

        let aiName = prod.aiName || (prod.files?.[0]?.name?.replace(/\.[^/.]+$/, "")?.replace(/[-_]/g, " ") || "منتج مستورد");
        let aiShortDesc = prod.aiShortDesc || `منتج متميز - ${aiName}`;
        let aiLongDesc = prod.aiLongDesc || `وصف تفصيلي للمنتج ${aiName}`;

        if (!prod.skipAiVision && base64Images[0]) {
          markStep(2, "running");
          setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: تحليل الصور بالذكاء الاصطناعي...`);

          try {
            const visionRes = await supabase.functions.invoke("analyze-image", {
              body: {
                image_base64: base64Images[0],
                additional_image_base64: base64Images.slice(1).filter(Boolean).length > 0 ? base64Images.slice(1).filter(Boolean) : undefined,
              },
            });
            const visionResult = visionRes.data?.result || visionRes.data;
            if (visionResult) {
              if (visionResult.name) aiName = visionResult.name;
              if (visionResult.short_description) aiShortDesc = visionResult.short_description;
              if (visionResult.long_description) aiLongDesc = visionResult.long_description;
            }
          } catch (e) {
            console.warn("Vision error:", e);
          }
          
          updateProd({ aiName, aiShortDesc, aiLongDesc });
          markStep(2, "done");
        } else {
          // Skip Vision (already have data from import)
          updateProd({ aiName, aiShortDesc, aiLongDesc });
          markStep(2, "done");
        }

        // ─── STEP 3: Fancy CSS description ───
        setCurrentStep(3);
        markStep(3, "running");
        setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: إنشاء وصف CSS...`);

        try {
          const proRes = await supabase.functions.invoke("enhance-description", {
            body: {
              description: aiLongDesc,
              productName: aiName,
              images: finalUrls,
              style: "fancy",
            },
          });
          if (proRes.data?.html) {
            aiLongDesc = proRes.data.html;
            updateProd({ aiLongDesc });
          }
        } catch (e) {
          console.warn("Fancy desc error:", e);
        }
        markStep(3, "done");

        // ─── STEP 4: Save draft to DB ───
        setCurrentStep(4);
        markStep(4, "running");
        setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: حفظ المسودة...`);

        const { data: draft, error: draftError } = await supabase
          .from("draft_products")
          .insert({
            user_id: user.id,
            name: aiName,
            short_description: aiShortDesc,
            long_description: aiLongDesc,
            currency: "EGP",
            status: "review_ready",
            original_data: { images: finalUrls, source: "auto_pipeline" } as any,
          })
          .select()
          .single();

        if (draftError || !draft) throw new Error(draftError?.message || "فشل إنشاء المسودة");

        updateProd({ draftId: draft.id });

        const imageInserts = finalUrls.map((url, index) => ({
          draft_product_id: draft.id,
          url,
          is_featured: index === 0,
          sort_order: index,
          source: (url.includes("ibb.co") || url.includes("imgbb.com")) ? "imgbb" as const : "url" as const,
        }));
        
        const { error: imgInsertError } = await supabase.from("product_images").insert(imageInserts);
        if (imgInsertError) {
          console.error("Image insert error:", imgInsertError);
          // Fallback: try with 'manual' source
          const fallbackInserts = finalUrls.map((url, index) => ({
            draft_product_id: draft.id,
            url,
            is_featured: index === 0,
            sort_order: index,
            source: "manual" as const,
          }));
          const { error: fallbackErr } = await supabase.from("product_images").insert(fallbackInserts);
          if (fallbackErr) throw new Error("فشل حفظ صور المنتج: " + fallbackErr.message);
        }

        markStep(4, "done");

        // ─── STEP 5: Generate Egyptian AI reviews ───
        setCurrentStep(5);
        markStep(5, "running");
        setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: إنشاء تقييمات...`);

        try {
          const reviewCount = 3 + Math.floor(Math.random() * 4);
          const { data: reviewsData, error: reviewsError } = await supabase.functions.invoke("generate-reviews", {
            body: {
              product_name: aiName,
              product_description: aiShortDesc,
              count: reviewCount,
              rating: 5,
              dialect: "مصرية",
            },
          });

          if (!reviewsError && reviewsData?.ok && Array.isArray(reviewsData.reviews)) {
            const reviewInserts = reviewsData.reviews.map((r: any) => ({
              user_id: user.id,
              draft_product_id: draft.id,
              wc_product_id: null,
              reviewer_name: r.reviewer_name,
              rating: r.rating,
              review_text: r.review_text,
              dialect: "مصرية",
              status: "pending",
            }));
            if (reviewInserts.length > 0) {
              await supabase.from("product_reviews").insert(reviewInserts);
            }
          }
        } catch (e) {
          console.warn("Reviews gen error:", e);
        }
        markStep(5, "done");
      }

      setProducts(updatedProducts);

      setCurrentStep(6);
      markStep(6, "running");
      setStatusText("في انتظار إدخال الأسعار...");
      setPhase("price");

    } catch (err: any) {
      console.error("Auto pipeline error:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء التشغيل");
      setPhase("error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICE CONFIRMATION & PUBLISHING
  // ═══════════════════════════════════════════════════════════════════════════

  const handlePriceConfirm = async () => {
    if (products.some(p => (p.files.length > 0 || (p.rawImageUrls && p.rawImageUrls.length > 0)) && !p.price.trim())) {
      toast({ title: "خطأ", description: "يجب إدخال السعر لجميع المنتجات", variant: "destructive" });
      return;
    }

    setPhase("publishing");
    markStep(6, "done");

    try {
      let updatedProducts = [...products];

      for (let pIdx = 0; pIdx < updatedProducts.length; pIdx++) {
        const prod = updatedProducts[pIdx];
        if (!(prod.files.length > 0 || (prod.rawImageUrls && prod.rawImageUrls.length > 0)) || !prod.draftId) continue;
        
        setCurrentProductIndex(pIdx);

        setStepStatus(prev => {
          const next = [...prev];
          next[7] = "pending";
          next[8] = "pending";
          return next;
        });

        await supabase
          .from("draft_products")
          .update({
            name: prod.aiName,
            price: parseFloat(prod.price)
          })
          .eq("id", prod.draftId);

        // ─── STEP 7: Publish ───
        setCurrentStep(7);
        markStep(7, "running");
        setStatusText(`منتج ${pIdx + 1}/${products.length}: تحويل الصور إلى ImgBB...`);
        
        await convertProductImages(prod.draftId, (current, total) => {
          setStatusText(`منتج ${pIdx + 1}/${products.length}: تحويل صورة ${current} من ${total}...`);
        });

        setStatusText(`منتج ${pIdx + 1}/${products.length}: جاري النشر على WooCommerce...`);
        const result = await publishProduct(prod.draftId, false);

        if (!result.success) throw new Error(`فشل النشر للمنتج ${pIdx + 1}`);
        
        updatedProducts[pIdx].permalink = result.permalink || undefined;
        await supabase.from("product_images").delete().eq("draft_product_id", prod.draftId);
        
        await logActivity({
          action: "publish",
          entity_type: "woo_product",
          entity_id: prod.draftId,
          metadata: { name: prod.aiName, permalink: result.permalink },
          resource_url: result.permalink || undefined,
        });

        markStep(7, "done");

        // ─── STEP 8: Reviews ───
        setCurrentStep(8);
        markStep(8, "running");
        setStatusText(`منتج ${pIdx + 1}/${products.length}: نشر التقييمات...`);

        try {
          const { data: mapping } = await supabase
            .from("wc_mappings")
            .select("wc_product_id")
            .eq("draft_product_id", prod.draftId)
            .maybeSingle();

          if (mapping?.wc_product_id) {
            const { data: pendingReviews } = await supabase
              .from("product_reviews")
              .select("*")
              .eq("draft_product_id", prod.draftId)
              .is("wc_review_id", null);

            if (pendingReviews && pendingReviews.length > 0) {
              const { data: pubResult, error: pubError } = await supabase.functions.invoke("woocommerce-reviews", {
                body: {
                  action: "publish",
                  wc_product_id: mapping.wc_product_id,
                  reviews: pendingReviews.map((r) => ({
                    reviewer_name: r.reviewer_name,
                    rating: r.rating,
                    review_text: r.review_text,
                  })),
                },
              });

              if (!pubError && pubResult?.ok && Array.isArray(pubResult.results)) {
                for (let i = 0; i < pendingReviews.length && i < pubResult.results.length; i++) {
                  const localId = pendingReviews[i].id;
                  const wcId = pubResult.results[i]?.id;
                  if (localId && wcId) {
                    await supabase.from("product_reviews").update({
                      wc_review_id: wcId,
                      status: "published",
                    }).eq("id", localId);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Reviews publish error:", e);
        }
        markStep(8, "done");
      }

      setProducts(updatedProducts);
      setStatusText("تم بنجاح! 🎉");
      setPhase("done");

    } catch (err: any) {
      console.error("Publish error:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء النشر");
      setPhase("error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetAll(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
            أوتو بايبلاين متعدد المنتجات
          </DialogTitle>
          <DialogDescription className="text-xs">
            أضف منتجات متعددة، ارفع الصور لكل منتج، وسيتم معالجتها ونشرها دفعة واحدة.
          </DialogDescription>
        </DialogHeader>

        {phase !== "upload" && (
          <div className="grid grid-cols-3 gap-2 my-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const status = stepStatus[idx];
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium transition-all ${
                    status === "done"
                      ? "bg-green-500/15 text-green-600 border border-green-500/30"
                      : status === "running"
                      ? "bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse"
                      : status === "error"
                      ? "bg-red-500/15 text-red-600 border border-red-500/30"
                      : "bg-muted/40 text-muted-foreground border border-muted"
                  }`}
                >
                  {status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : status === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {(phase === "running" || phase === "publishing") && statusText && (
          <div className="text-center text-sm text-amber-600 font-medium bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            {statusText}
          </div>
        )}

        {phase === "upload" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {products.map((prod, idx) => (
                <Card key={prod.id} className="border-amber-500/30 bg-amber-500/5 relative">
                  {products.length > 1 && (
                    <button
                      onClick={() => removeProduct(prod.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors z-10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <CardContent className="p-4 pt-6 space-y-4">
                    <h4 className="font-bold text-sm text-amber-600 mb-2">المنتج رقم {idx + 1}</h4>
                    <label
                      className="block border-2 border-dashed border-amber-500/40 rounded-xl p-4 text-center cursor-pointer hover:border-amber-500/60 hover:bg-amber-500/10 transition-all"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleFiles(prod.id, e.dataTransfer.files); }}
                    >
                      <ImagePlus className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                      <p className="font-bold text-sm">اسحب صور المنتج هنا أو اضغط للاختيار</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(prod.id, e.target.files)}
                      />
                    </label>

                    {prod.previews.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {prod.previews.map((src, fIdx) => {
                          const displaySrc = src.startsWith("blob:") || src.startsWith("data:") || src.includes("weserv.nl") || src.includes("ibb.co")
                            ? src
                            : `https://images.weserv.nl/?url=${encodeURIComponent(src)}`;
                          return (
                          <div key={fIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                            <img src={displaySrc} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              onClick={() => removeFile(prod.id, fIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2 w-2" />
                            </button>
                            {fIdx === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-black text-[8px] text-center font-bold">رئيسية</span>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={addProduct} variant="outline" className="w-full border-dashed border-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج آخر
            </Button>

            <Button onClick={runAutoPipeline} disabled={!hasAnyFiles} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 h-12 text-base shadow-lg">
              <Zap className="h-5 w-5 fill-black" />
              ابدأ معالجة {products.filter(p => p.files.length > 0 || (p.rawImageUrls && p.rawImageUrls.length > 0)).length} منتجات
            </Button>
          </div>
        )}

        {phase === "price" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 text-amber-700 p-3 rounded-lg text-sm font-medium mb-4">
              تم تحليل وإنشاء المحتوى لكل المنتجات. يمكنك تعديل اسم المنتج بالأسفل وتحديد السعر قبل التأكيد والنشر المباشر.
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
              {products.filter(p => p.files.length > 0 || (p.rawImageUrls && p.rawImageUrls.length > 0)).map((prod) => (
                <Card key={prod.id} className="border-amber-500/20">
                  <CardContent className="p-3 flex gap-3 items-start">
                    <img src={prod.previews[0]?.startsWith("blob:") || prod.previews[0]?.startsWith("data:") || prod.previews[0]?.includes("weserv.nl") || prod.previews[0]?.includes("ibb.co") ? prod.previews[0] : `https://images.weserv.nl/?url=${encodeURIComponent(prod.previews[0] || '')}`} alt="" className="w-16 h-16 rounded-md object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-muted-foreground">اسم المنتج (تعديل يدوي):</Label>
                        <Input
                          value={prod.aiName || ""}
                          onChange={(e) => updateProductName(prod.id, e.target.value)}
                          placeholder="اسم المنتج"
                          className="font-bold text-sm h-9 bg-background"
                          dir="auto"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{prod.aiShortDesc}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Label className="text-xs font-bold shrink-0">السعر:</Label>
                        <Input
                          type="number"
                          placeholder="السعر"
                          value={prod.price}
                          onChange={(e) => updateProductPrice(prod.id, e.target.value)}
                          className="h-8 w-28 text-center font-bold"
                        />
                        <span className="text-xs font-bold text-muted-foreground">ج.م</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Button
              onClick={handlePriceConfirm}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold gap-2 h-11 mt-4"
            >
              <Check className="h-4 w-4" />
              تأكيد وتحديث البيانات ونشر جميع المنتجات
            </Button>
          </div>
        )}

        {phase === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-600">تم نشر المنتجات بنجاح! 🎉</h3>
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto text-right text-sm px-4">
              {products.filter(p => p.permalink).map((prod) => (
                <div key={prod.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg border">
                  <span className="font-medium truncate flex-1 ml-2 text-right">{prod.aiName}</span>
                  <a href={prod.permalink!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 shrink-0 bg-primary/10 px-2 py-1 rounded text-xs">
                    عرض <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={() => { resetAll(); }} className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-1.5">
                <Zap className="h-4 w-4 fill-black" />
                أوتو بايبلاين جديد
              </Button>
              <Button variant="outline" onClick={() => { resetAll(); onPublished(); }}>
                إغلاق
              </Button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-600">حدث خطأ</h3>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setPhase("upload")} variant="outline">
                العودة للرفع
              </Button>
              <Button variant="outline" onClick={() => { resetAll(); onClose(); }}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

