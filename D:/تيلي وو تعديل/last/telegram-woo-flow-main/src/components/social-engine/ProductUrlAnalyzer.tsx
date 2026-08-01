import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Wand2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onUseAnalysis: (a: any) => void;
}

export function ProductUrlAnalyzer({ onUseAnalysis }: Props) {
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-analyze-product-url", {
        body: { url, source_type: sourceType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("تم تحليل المنتج بنجاح");
    } catch (e: any) {
      toast.error(e.message || "فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  const product = result?.product || {};
  const analysis = result?.analysis || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تحليل منتج من رابط URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-[1fr_200px_auto] gap-2">
            <Input
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourstore.com/product/..."
            />
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">قراءة ذكية تلقائية</SelectItem>
                <SelectItem value="generic">قراءة عامة (HTML)</SelectItem>
                <SelectItem value="woocommerce">WooCommerce API</SelectItem>
                <SelectItem value="wordpress">WordPress REST</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={analyze} disabled={!url || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 ml-1" />}
              تحليل
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ℹ️ لن يتم اختراع مواصفات غير موجودة. الميزات غير المؤكدة تُوصف كـ "مظهر بصري".
          </p>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات المنتج المستخرجة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <Row k="الاسم" v={product.name} />
                <Row k="السعر الحالي" v={product.price} />
                <Row k="السعر قبل الخصم" v={product.regular_price} />
                <Row k="نسبة الخصم" v={product.discount_pct ? `${product.discount_pct}%` : "-"} />
                <Row k="SKU" v={product.sku} />
                <Row k="المخزون" v={product.stock_status} />
              </div>
              {product.short_description && (
                <div className="text-sm bg-muted/30 rounded p-2">{product.short_description}</div>
              )}
              {Array.isArray(product.images) && product.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.images.slice(0, 8).map((img: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded border" />
                  ))}
                </div>
              )}
              {Array.isArray(product.tags) && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.tags.map((t: string, i: number) => (
                    <Badge key={i} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">التحليل التسويقي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {analysis.usp && <Block label="أهم نقاط البيع (USP)" value={analysis.usp} />}
              {analysis.audience && <Block label="الجمهور المستهدف" value={analysis.audience} />}
              {analysis.angle && <Block label="الزاوية التسويقية" value={analysis.angle} />}
              {analysis.hook && <Block label="أفضل Hook" value={analysis.hook} />}
              {analysis.cta && <Block label="أفضل CTA" value={analysis.cta} />}
              {Array.isArray(analysis.hashtags) && (
                <div className="flex flex-wrap gap-1">
                  {analysis.hashtags.map((h: string, i: number) => (
                    <Badge key={i}>{h.startsWith("#") ? h : `#${h}`}</Badge>
                  ))}
                </div>
              )}
              {analysis.formats && (
                <div className="text-xs text-muted-foreground">
                  مناسب لـ: {Array.isArray(analysis.formats) ? analysis.formats.join("، ") : String(analysis.formats)}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onUseAnalysis(result)} className="gap-1.5">
              <Wand2 className="h-4 w-4" />
              إنشاء منشور من هذا المنتج
            </Button>
            <Button variant="outline" onClick={analyze} disabled={loading}>إعادة التحليل</Button>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2));
              toast.success("تم النسخ");
            }}>
              <Copy className="h-4 w-4 ml-1" /> نسخ البيانات
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground truncate">{v ?? "-"}</span>
    </div>
  );
}
function Block({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="bg-muted/30 rounded p-2 whitespace-pre-wrap">{typeof value === "string" ? value : JSON.stringify(value)}</div>
    </div>
  );
}
