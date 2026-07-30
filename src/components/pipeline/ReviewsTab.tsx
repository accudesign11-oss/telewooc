import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { ReviewsManager } from "@/components/ReviewsManager";

interface Props {
  productId: string;
  onNext: () => void;
  onBack: () => void;
}

export function ReviewsTab({ productId, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [wcProductId, setWcProductId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: draft } = await supabase
        .from("draft_products")
        .select("name, short_description, long_description")
        .eq("id", productId).single();
      setName(draft?.name || "");
      setDesc(draft?.short_description || draft?.long_description || "");
      const { data: map } = await supabase
        .from("wc_mappings")
        .select("wc_product_id")
        .eq("draft_product_id", productId).maybeSingle();
      setWcProductId((map as any)?.wc_product_id || null);
      setLoading(false);
    })();
  }, [productId]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-lg mb-1">ريفيوهات العملاء</h2>
          <p className="text-sm text-muted-foreground">
            ولّد ريفيوهات بالذكاء الاصطناعي للمنتج "{name || "—"}" أو أضفها يدويًا.
            {!wcProductId && " (سيتم النشر للمتجر بعد نشر المنتج)"}
          </p>
        </CardContent>
      </Card>

      <ReviewsManager
        draftProductId={productId}
        wcProductId={wcProductId}
        productName={name}
        productDescription={desc}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="h-4 w-4 ml-1" /> رجوع
        </Button>
        <Button onClick={onNext}>
          متابعة <ArrowLeft className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}
