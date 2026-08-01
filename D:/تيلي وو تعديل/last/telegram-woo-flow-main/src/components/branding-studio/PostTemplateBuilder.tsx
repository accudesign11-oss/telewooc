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
import { copyText } from "./_shared";
import { RealImageButton } from "./RealImageButton";

const CATEGORIES = ["ترحيبي", "عرض", "خصم", "منتج جديد", "مميزات", "سؤال وجواب", "مراجعة عميل", "قبل وبعد", "اقتباس", "تهنئة", "موسمي", "رمضان", "العيد", "الجمعة", "Story", "Reel Cover", "YouTube Thumbnail", "WhatsApp Status", "Google Business Post", "Carousel", "Product Promo", "ضمان", "توصيل", "وسائل دفع"];

export function PostTemplateBuilder() {
  const [kits, setKits] = useState<any[]>([]);
  const [kit, setKit] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("عرض");
  const [platform, setPlatform] = useState("instagram");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cta, setCta] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).then(({ data }) => setKits(data || [])); }, []);

  async function gen() {
    if (!kit) { toast({ title: "اختر Brand Kit", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-graphic-prompt", {
        body: {
          asset_type: "post_template", platform, width, height,
          brand: { name_ar: kit.brand_name_ar, name_en: kit.brand_name_en, slogan: kit.slogan, industry: kit.industry },
          colors: kit.colors_json, typography: kit.typography_json, dna: kit.brand_dna_json,
          instructions: `قالب منشور — فئة: ${category}`,
          text_overlay: [title, subtitle, cta].filter(Boolean).join(" | ")
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
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const { error } = await supabase.from("branding_templates").insert({
      user_id: u.user.id, client_id: kit.client_id, brand_kit_id: kit.id,
      name: name || `قالب ${category}`, category, platform, width, height,
      layout_json: { title, subtitle, cta }, editable_fields_json: { title, subtitle, cta },
      prompt: result.prompt, status: "generated"
    });
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم حفظ القالب" });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base">قوالب المنشورات</CardTitle></CardHeader>
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
              <Label className="text-xs">اسم القالب</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">نوع القالب</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
              {CATEGORIES.map(c => (
                <Badge key={c} variant={category === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory(c)}>{c}</Badge>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">المنصة</Label>
              <Input value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">العرض</Label>
              <Input type="number" value={width} onChange={e => setWidth(+e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">الارتفاع</Label>
              <Input type="number" value={height} onChange={e => setHeight(+e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label className="text-xs">العنوان</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">العنوان الفرعي</Label><Input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">CTA</Label><Input value={cta} onChange={e => setCta(e.target.value)} className="mt-1" /></div>
          </div>
          <Button onClick={gen} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            توليد Prompt للقالب
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">القالب الناتج</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={result.prompt} readOnly rows={6} className="text-xs" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copyText(result.prompt)}><Copy className="h-3 w-3" />نسخ</Button>
              <Button size="sm" variant="outline" onClick={save}><Save className="h-3 w-3" />حفظ القالب</Button>
            </div>
            <div className="pt-3 border-t">
              <RealImageButton
                prompt={result.prompt}
                negative_prompt={result.negative_prompt}
                asset_type="post_template"
                brand_kit_id={kit?.id}
                client_id={kit?.client_id}
                platform={platform}
                size={`${width}x${height}`}
                n={1}
                title={name || `قالب ${category}`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
