import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Save, Loader2 } from "lucide-react";
import { copyText, saveAsset } from "./_shared";
import { RealImageButton } from "./RealImageButton";

const CATS = ["خلفية براند", "Abstract", "Pattern", "Luxury", "موسمية", "Thank you", "Contact us", "Delivery", "Warranty", "Payment", "About us", "Review BG", "FAQ BG", "Offer BG", "Coming soon", "New collection", "Sale", "Eid", "Ramadan", "New year", "Black Friday", "Summer sale", "Wedding", "Furniture mood", "Interior lifestyle"];

export function GeneralBrandImagesPanel() {
  const [kits, setKits] = useState<any[]>([]);
  const [kit, setKit] = useState<any>(null);
  const [category, setCategory] = useState("Abstract");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).then(({ data }) => setKits(data || [])); }, []);

  async function gen() {
    if (!kit) { toast({ title: "اختر Brand Kit", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-graphic-prompt", {
        body: {
          asset_type: "general", platform: "any", width, height,
          brand: { name_ar: kit.brand_name_ar, name_en: kit.brand_name_en, slogan: kit.slogan, industry: kit.industry },
          colors: kit.colors_json, dna: kit.brand_dna_json,
          instructions: `صورة عامة للبراند — ${category}. ${extra}`
        }
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      setResult(data);
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function save() {
    if (!result || !kit) return;
    await saveAsset({
      brand_kit_id: kit.id, client_id: kit.client_id, asset_type: "general",
      size_width: width, size_height: height, title: `${category}`,
      prompt: result.prompt, negative_prompt: result.negative_prompt, provider: "prompt-mode",
      metadata_json: { category }
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base">صور عامة للبراند</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand Kit</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 mt-1" value={kit?.id || ""} onChange={e => setKit(kits.find(k => k.id === e.target.value))}>
                <option value="">— اختر —</option>
                {kits.map(k => <option key={k.id} value={k.id}>{k.brand_name_ar || k.brand_name_en}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">الفئة</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
                {CATS.map(c => <Badge key={c} variant={category === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory(c)}>{c}</Badge>)}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label className="text-xs">العرض</Label><Input type="number" value={width} onChange={e => setWidth(+e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">الارتفاع</Label><Input type="number" value={height} onChange={e => setHeight(+e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <Label className="text-xs">تعليمات إضافية</Label>
            <Textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2} className="mt-1" />
          </div>
          <Button onClick={gen} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            توليد Prompt
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Textarea value={result.prompt} readOnly rows={6} className="text-xs" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copyText(result.prompt)}><Copy className="h-3 w-3" />نسخ</Button>
              <Button size="sm" variant="outline" onClick={save}><Save className="h-3 w-3" />حفظ Prompt</Button>
            </div>
            <div className="pt-3 border-t">
              <RealImageButton
                prompt={result.prompt}
                negative_prompt={result.negative_prompt}
                asset_type="general"
                brand_kit_id={kit?.id}
                client_id={kit?.client_id}
                size={`${width}x${height}`}
                n={1}
                title={category}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
