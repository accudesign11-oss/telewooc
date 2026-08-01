import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, Trash2, Plus, Star, Upload, RefreshCw, Save,
} from "lucide-react";

export interface ReviewItem {
  id?: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  dialect?: string;
  wc_review_id?: number | null;
  status?: string;
}

interface Props {
  draftProductId?: string | null;
  wcProductId?: number | null;
  productName: string;
  productDescription?: string;
  onSaved?: () => void;
}

const DIALECT_OPTIONS = [
  "مصرية",
  "سعودية",
  "خليجية",
  "مغربية",
  "فصحى",
  "إنجليزية",
  "مخصصة",
];

export function ReviewsManager({
  draftProductId, wcProductId, productName, productDescription, onSaved,
}: Props) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Generation controls
  const [count, setCount] = useState(5);
  const [rating, setRating] = useState(5);
  const [dialect, setDialect] = useState("مصرية");
  const [customDialect, setCustomDialect] = useState("");

  const loadReviews = async () => {
    setLoading(true);
    try {
      let q = supabase.from("product_reviews").select("*").order("created_at", { ascending: false });
      if (draftProductId) q = q.eq("draft_product_id", draftProductId);
      else if (wcProductId) q = q.eq("wc_product_id", wcProductId);
      const { data } = await q;
      setReviews((data || []) as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); /* eslint-disable-next-line */ }, [draftProductId, wcProductId]);

  const handleGenerate = async () => {
    if (!productName) {
      toast({ title: "اسم المنتج مطلوب", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const effectiveDialect = dialect === "مخصصة" ? (customDialect.trim() || "مصرية") : dialect;
      const { data, error } = await supabase.functions.invoke("generate-reviews", {
        body: {
          product_name: productName,
          product_description: productDescription || "",
          count,
          rating,
          dialect: effectiveDialect,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "فشل التوليد");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");

      const toInsert = (data.reviews || []).map((r: any) => ({
        user_id: user.id,
        draft_product_id: draftProductId || null,
        wc_product_id: wcProductId || null,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        review_text: r.review_text,
        dialect: effectiveDialect,
        status: "pending",
      }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("product_reviews").insert(toInsert);
        if (insErr) throw insErr;
      }

      toast({ title: `تم توليد ${toInsert.length} مراجعة` });
      await loadReviews();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateField = async (id: string, patch: Partial<ReviewItem>) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const persistReview = async (r: ReviewItem) => {
    if (!r.id) return;
    const { error } = await supabase.from("product_reviews").update({
      reviewer_name: r.reviewer_name,
      rating: r.rating,
      review_text: r.review_text,
    }).eq("id", r.id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else toast({ title: "تم الحفظ" });
  };

  const handleDelete = async (r: ReviewItem) => {
    if (r.id) {
      await supabase.from("product_reviews").delete().eq("id", r.id);
    }
    // If published to WC, optionally delete from store too
    if (r.wc_review_id && wcProductId) {
      try {
        await supabase.functions.invoke("woocommerce-reviews", {
          body: { action: "delete", review_id: r.wc_review_id },
        });
      } catch {}
    }
    await loadReviews();
  };

  const handleAddManual = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("product_reviews").insert({
      user_id: user.id,
      draft_product_id: draftProductId || null,
      wc_product_id: wcProductId || null,
      reviewer_name: "عميل جديد",
      rating: 5,
      review_text: "",
      dialect,
      status: "pending",
    });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    await loadReviews();
  };

  const handlePublishToStore = async () => {
    if (!wcProductId) {
      toast({ title: "لا يوجد معرّف منتج في المتجر", description: "انشر المنتج أولاً", variant: "destructive" });
      return;
    }
    const pending = reviews.filter(r => !r.wc_review_id && r.review_text.trim().length > 0);
    if (pending.length === 0) {
      toast({ title: "لا توجد مراجعات للنشر" });
      return;
    }
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-reviews", {
        body: {
          action: "publish",
          wc_product_id: wcProductId,
          reviews: pending.map(r => ({
            reviewer_name: r.reviewer_name,
            rating: r.rating,
            review_text: r.review_text,
          })),
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "فشل النشر");

      // Map results back to our records by reviewer name + text
      const results: any[] = data.results || [];
      for (let i = 0; i < pending.length && i < results.length; i++) {
        const localId = pending[i].id;
        const wcId = results[i]?.id;
        if (localId && wcId) {
          await supabase.from("product_reviews").update({
            wc_review_id: wcId,
            status: "published",
          }).eq("id", localId);
        }
      }

      toast({
        title: `تم نشر ${data.published} من ${data.total}`,
        description: data.errors?.length ? `أخطاء: ${data.errors.length}` : undefined,
      });
      await loadReviews();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generator card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">توليد ريفيوهات بالذكاء الاصطناعي</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>العدد: {count}</Label>
              <Slider value={[count]} min={1} max={20} step={1} onValueChange={(v) => setCount(v[0])} />
            </div>
            <div className="space-y-2">
              <Label>التقييم: {rating} ★</Label>
              <Slider value={[rating * 2]} min={2} max={10} step={1} onValueChange={(v) => setRating(v[0] / 2)} />
            </div>
            <div className="space-y-2">
              <Label>اللهجة</Label>
              <Select value={dialect} onValueChange={setDialect}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIALECT_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {dialect === "مخصصة" && (
            <Input
              placeholder="مثال: لهجة كويتية، أو أي لغة"
              value={customDialect}
              onChange={(e) => setCustomDialect(e.target.value)}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Sparkles className="h-4 w-4 ml-2" />}
              توليد
            </Button>
            <Button variant="outline" onClick={handleAddManual}>
              <Plus className="h-4 w-4 ml-1" /> إضافة يدوية
            </Button>
            <Button variant="outline" onClick={loadReviews} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {wcProductId && (
              <Button variant="default" onClick={handlePublishToStore} disabled={publishing}>
                {publishing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
                نشر إلى المتجر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.length === 0 && !loading && (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
            لا توجد مراجعات بعد. ولّد أو أضف مراجعات يدويًا.
          </CardContent></Card>
        )}

        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={r.reviewer_name}
                    onChange={(e) => updateField(r.id!, { reviewer_name: e.target.value })}
                    className="max-w-[200px]"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateField(r.id!, { rating: s })}
                      >
                        <Star className={`h-4 w-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground mr-1">{r.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {r.wc_review_id && <Badge variant="default" className="text-xs">منشور</Badge>}
                  {r.dialect && <Badge variant="outline" className="text-xs">{r.dialect}</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => persistReview(r)}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={r.review_text}
                onChange={(e) => updateField(r.id!, { review_text: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
