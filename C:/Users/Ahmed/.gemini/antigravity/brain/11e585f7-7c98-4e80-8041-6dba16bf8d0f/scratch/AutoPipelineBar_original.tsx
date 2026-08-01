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
  Plus,
  Download
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
import { stripCssFromHtml } from "@/lib/cleanDescription";
import { useEffect } from "react";

export interface AutoPipelineSettings {
  enabled: boolean;
  enableProfessionalCss: boolean;
  enableAutoReviews: boolean;
  enableAnimations?: boolean;
  customInstructions?: string;
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
  const { toast } = useToast();

  const handleDownloadCustomCss = () => {
    const cssContent = `/* TeleWoo WooCommerce Custom Additional CSS Styles */
.tlv-description { direction: rtl; text-align: right; font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.7; }
.tlv-service-cards, .tlv-feature-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; padding: 0; }
.tlv-service-card, .tlv-feature-card { flex: 1; min-width: 110px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.3s ease; }
.tlv-service-card:hover, .tlv-feature-card:hover { border-color: #3b82f6; transform: translateY(-3px); }
.tlv-service-emoji, .tlv-feature-icon { font-size: 24px; display: block; margin-bottom: 4px; }
.tlv-service-card h3, .tlv-feature-card h3 { font-size: 13px; font-weight: 700; margin: 0 0 3px 0; color: #0f172a; }
.tlv-service-card p, .tlv-feature-card p { font-size: 11px; color: #64748b; margin: 0; }
.tlv-main-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 20px 0 10px 0; border-right: 4px solid #3b82f6; padding-right: 10px; }
.tlv-desc-img { max-width: 100%; height: auto; border-radius: 12px; margin: 14px auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.tlv-marquee { background: #eff6ff; color: #1d4ed8; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; margin-bottom: 14px; }
.tlv-live-help { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px; text-align: center; margin-top: 20px; }
.tlv-live-help h2 { font-size: 15px; font-weight: 700; color: #166534; margin: 0 0 4px 0; }
.tlv-live-help p { font-size: 12px; color: #15803d; margin: 0; }
`;
    const blob = new Blob([cssContent], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Additional-CSS.css";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "📥 تم تنزيل ملف Additional CSS بنجاح!",
      description: "يمكنك نسخ محتويات الملف ولصقها في (تخصيص القالب -> تنسيقات CSS إضافية) أو رفعها لموقعك مباشرة.",
    });
  };

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
            <DialogContent className="sm:max-w-md text-right dir-rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-5 w-5 text-amber-500" />
                  إعدادات معالجة الأوتو بايبلاين والوصف
                </DialogTitle>
                <DialogDescription className="text-xs">
                  خصص خيارات البايبلاين والتعليمات المخصصة للذكاء الاصطناعي
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">تفعيل الأوتو بايبلاين التلقائي</Label>
                    <p className="text-xs text-muted-foreground">معالجة المسودة تلقائياً فور الرفع</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">وصف CSS وتنسيق مبهرج</Label>
                    <p className="text-xs text-muted-foreground">تطبيق كروت الخدمة والتنسيق الملون الناتيف</p>
                  </div>
                  <Switch
                    checked={settings.enableProfessionalCss}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, enableProfessionalCss: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">تفعيل التأثيرات والأنيميشن</Label>
                    <p className="text-xs text-muted-foreground">تفعيل التأثيرات البصرية والانتقالات</p>
                  </div>
                  <Switch
                    checked={settings.enableAnimations !== false}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, enableAnimations: checked })}
                  />
                </div>

                <div className="space-y-2 border p-3 rounded-lg bg-muted/30">
                  <Label className="font-bold text-sm flex items-center justify-between">
                    <span>تعليمات مخصصة للمعالجة والوصف (Custom Instructions)</span>
                    <Badge variant="outline" className="text-[10px]">اختياري</Badge>
                  </Label>
                  <textarea
                    rows={3}
                    placeholder="اكتب أي تعليمات خاصة هنا (مثال: اكتب الوصف بنبرة تسويقية فاخرة، أضف جدول مقارنة، ركز على فوائد المنتج...)"
                    value={settings.customInstructions || ""}
                    onChange={(e) => onSettingsChange({ ...settings, customInstructions: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  />
                </div>

                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">تنزيل ملف الـ CSS المخصص للـ Additional CSS</div>
                  <Button variant="outline" size="sm" onClick={handleDownloadCustomCss} className="gap-1.5 text-xs border-amber-500/40 hover:bg-amber-500/10 font-bold shrink-0">
                    <Download className="h-4 w-4 text-amber-500" />
                    تنزيل ملف Additional CSS 📥
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="default" onClick={() => setIsSettingsOpen(false)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs">
                  إغلاق وحفظ الإعدادات
                </Button>
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
      setErrorMsg("");
      setCurrentProductIndex(0);
    }
  }, [isOpen, initialProducts]);

  const markStep = (stepIdx: number, status: "pending" | "running" | "done" | "error") => {
    setStepStatus(prev => {
      const next = [...prev];
      next[stepIdx] = status;
      return next;
    });
  };

  const handleStartRun = async () => {
    setPhase("running");
    setErrorMsg("");

    const updatedProducts = [...products];

    for (let pIdx = 0; pIdx < updatedProducts.length; pIdx++) {
      setCurrentProductIndex(pIdx);
      const prod = updatedProducts[pIdx];

      const updateProd = (changes: Partial<BulkProduct>) => {
        Object.assign(prod, changes);
        setProducts([...updatedProducts]);
      };

      try {
        // ─── STEP 0: ImgBB Upload ───
        setCurrentStep(0);
        markStep(0, "running");
        setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: جاري تجهيز ورفع الصور عبر WebP & ImgBB...`);

        const base64Images: string[] = [];
        const finalUrls: string[] = [];
        const effectiveKey = imgbb?.api_key || "";

        if (prod.files && prod.files.length > 0) {
          for (let i = 0; i < prod.files.length; i++) {
            const file = prod.files[i];
            let webpBlob: Blob;
            try {
              webpBlob = await fileToWebpBlob(file, 800, 0.85);
            } catch {
              webpBlob = file;
            }
            const base64 = await blobToBase64(webpBlob);
            base64Images.push(base64);

            let uploaded = false;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const { data, error } = await supabase.functions.invoke("imgbb-upload", {
                  body: { image: base64, apiKey: effectiveKey },
                });
                if (!error && data?.success && data?.url) {
                  finalUrls.push(data.url);
                  uploaded = true;
                  break;
                }
              } catch {}
              if (!uploaded && attempt < 2) {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }

            if (!uploaded) {
              finalUrls.push(`data:image/webp;base64,${base64}`);
            }
          }
        } else if (prod.previews && prod.previews.length > 0) {
          for (const url of prod.previews) {
            const cleanUrl = url.trim();
            if (cleanUrl.startsWith("data:")) {
              const base64 = cleanUrl.split(",")[1] || "";
              base64Images.push(base64);

            
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
            if (proRes.data?.html) {
              aiLongDesc = stripCssFromHtml(proRes.data.html);
              updateProd({ aiLongDesc });
            }
          }
        } catch (e) {
          console.warn("Fancy desc error:", e);
        }
        markStep(3, "done");

        // ─── STEP 4: Save draft to DB ───
        setCurrentStep(4);
        markStep(4, "running");
        setStatusText(`منتج ${pIdx + 1}/${updatedProducts.length}: حفظ المسودة...`);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("المستخدم غير مسجل دخول");

        const { data: draftData, error: draftErr } = await supabase
          .from("draft_products")
          .insert({
            user_id: session.user.id,
            name: aiName,
            short_description: aiShortDesc,
            long_description: aiLongDesc,
            status: "draft",
            currency: "SAR",
          })
          .select()
          .single();

        if (draftErr || !draftData) throw new Error("فشل إنشاء المسودة");

        const draftId = draftData.id;
        updateProd({ draftId });

        if (finalUrls.length > 0) {
          const imgInserts = finalUrls.map((url, i) => ({
            draft_product_id: draftId,
            url,
            is_featured: i === 0,
            sort_order: i,
            source: "auto_pipeline",
          }));
          await supabase.from("product_images").insert(imgInserts);
        }

        markStep(4, "done");
        await logActivity("توليد منتج أوتو بايبلاين", `تم حفظ مسودة المنتج "${aiName}" بنجاح`, "draft", draftId);

      } catch (err: any) {
        console.error(`Error in product ${pIdx}:`, err);
        updateProd({ error: err.message || "حدث خطأ غير معروف" });
      }
    }

    setPhase("price");
  };

  const handlePublishAll = async () => {
    setPhase("publishing");

    for (let pIdx = 0; pIdx < products.length; pIdx++) {
      const prod = products[pIdx];
      if (prod.error) continue;

      try {
        // ─── STEP 5: Egyptian Reviews Generator ───
        setCurrentStep(5);
        markStep(5, "running");
        setStatusText(`منتج ${pIdx + 1}/${products.length}: توليد التقييمات...`);

        let generatedReviews: { reviewer: string; reviewer_email: string; rating: number; review: string }[] = [];
        if (settings.enableAutoReviews !== false) {
          try {
            const revRes = await supabase.functions.invoke("generate-reviews", {
              body: {
                productName: prod.aiName || "منتج",
                productDescription: prod.aiLongDesc || "",
                count: 3,
              },
            });
            if (revRes.data?.reviews) {
              generatedReviews = revRes.data.reviews;
            }
          } catch (e) {
            console.warn("Reviews gen error:", e);
          }
        }
        markStep(5, "done");

        // ─── STEP 6: Price confirmation ───
        setCurrentStep(6);
        markStep(6, "done");

        // ─── STEP 7: Publish to WooCommerce ───
        setCurrentStep(7);
        markStep(7, "running");
        setStatusText(`منتج ${pIdx + 1}/${products.length}: جاري النشر لـ WooCommerce...`);

        const wooData = {
          name: prod.aiName || "منتج بدون عنوان",
          regular_price: prod.price || "100",
          short_description: prod.aiShortDesc || "",
          description: prod.aiLongDesc || "",
          images: (prod.finalUrls || []).map(u => ({ src: u })),
          status: "publish" as const,
        };

        const result = await publishProduct(wooData);
        if (!result.success) {
          throw new Error(result.error || "فشل النشر إلى WooCommerce");
        }

        const permalink = (result.data as any)?.permalink || "";
        const wooId = (result.data as any)?.id;
        prod.permalink = permalink;

        if (prod.draftId) {
          await supabase
            .from("draft_products")
            .update({ status: "published", woo_product_id: wooId ? String(wooId) : null })
            .eq("id", prod.draftId);
        }

        markStep(7, "done");

        // ─── STEP 8: Post Reviews to Woo ───
        setCurrentStep(8);
        if (wooId && generatedReviews.length > 0) {
          markStep(8, "running");
          setStatusText(`منتج ${pIdx + 1}/${products.length}: إرسال التقييمات لـ WooCommerce...`);

          for (const rev of generatedReviews) {
            try {
              await supabase.functions.invoke("post-review", {
                body: {
                  productId: wooId,
                  review: rev.review,
                  reviewer: rev.reviewer,
                  reviewer_email: rev.reviewer_email,
                  rating: rev.rating,
                },
              });
            } catch (e) {
              console.warn("Post review error:", e);
            }
          }
        }
        markStep(8, "done");
        await logActivity("نشر منتج أوتو بايبلاين", `تم نشر المنتج "${prod.aiName}" بنجاح على WooCommerce`, "product", prod.draftId);

      } catch (err: any) {
        console.error(`Publish error for prod ${pIdx}:`, err);
        prod.error = err.message || "فشل النشر";
        setProducts([...products]);
      }
    }

    setPhase("done");
    onPublished();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto text-right dir-rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
            أوتو بايبلاين الذكي ⚡
          </DialogTitle>
          <DialogDescription className="text-xs">
            معالجة الصور، التحليل بالذكاء الاصطناعي، تطبيق التعليمات المخصصة، والنشر إلى متجرك تلقائياً
          </DialogDescription>
        </DialogHeader>

        {phase === "upload" && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/40 border border-amber-500/20 rounded-xl space-y-3">
              <Label className="text-xs font-bold text-foreground">المنتجات الجاهزة للمعالجة تلقائياً:</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {products.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-background border rounded-lg text-xs">
                    <span className="font-bold">منتج #{idx + 1}: {p.aiName || p.files?.[0]?.name || "منتج جديد"}</span>
                    <Badge variant="outline" className="text-[10px]">{p.previews?.length || p.files?.length || 0} صور</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleStartRun} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm gap-2 shadow-lg">
              <Zap className="h-4 w-4 fill-black" />
              بدء تشغيل البايبلاين التلقائي الآن 🚀
            </Button>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4 py-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
            <div>
              <p className="font-bold text-sm text-foreground">{statusText}</p>
              <p className="text-xs text-muted-foreground mt-1">يتم التوليد والتطوير بالذكاء الاصطناعي الحقيقي سحابياً...</p>
            </div>
          </div>
        )}

        {phase === "price" && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              <b>تمت المعالجة بنجاح! 🎉</b> أدخل أسعار المنتجات قبل إكمال عملية النشر لـ WooCommerce.
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {products.map((p, idx) => (
                <div key={p.id} className="p-3 bg-card border rounded-xl space-y-2">
                  <span className="font-bold text-xs">#{idx + 1} {p.aiName}</span>
                  <Input
                    type="number"
                    placeholder="السعر (ر.س)..."
                    value={p.price}
                    onChange={(e) => {
                      p.price = e.target.value;
                      setProducts([...products]);
                    }}
                    className="text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <Button onClick={handlePublishAll} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm gap-2">
              <Zap className="h-4 w-4 fill-black" />
              إكمال النشر لـ WooCommerce 🚀
            </Button>
          </div>
        )}

        {phase === "publishing" && (
          <div className="space-y-4 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
            <p className="font-bold text-sm text-foreground">{statusText}</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">تمت عملية الأوتو بايبلاين والنشر بنجاح! ⚡</h3>
              <p className="text-xs text-muted-foreground mt-1">تمت معالجة وتوليد الأوصاف والتقييمات ونشر المنتجات لمتجرك.</p>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button onClick={onClose} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs">
                إغلاق
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
































































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








































