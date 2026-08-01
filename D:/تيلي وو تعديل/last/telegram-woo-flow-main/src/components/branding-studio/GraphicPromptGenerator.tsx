import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Save, ExternalLink, Loader2 } from "lucide-react";
import { copyText, saveAsset, EXTERNAL_TOOLS } from "./_shared";

const TYPES = ["لوجو", "بروفايل", "كفر فيسبوك", "كفر يوتيوب", "بوست سوشيال", "Story", "Reel Cover", "Carousel", "إعلان منتج", "خلفية براند", "Pattern", "صورة موسمية", "فيديو قصير", "Google Flow Video"];

export function GraphicPromptGenerator() {
  const [kits, setKits] = useState<any[]>([]);
  const [kit, setKit] = useState<any>(null);
  const [type, setType] = useState("بوست سوشيال");
  const [platform, setPlatform] = useState("instagram");
  const [size, setSize] = useState("1080x1080");
  const [overlay, setOverlay] = useState("");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).then(({ data }) => setKits(data || [])); }, []);

  async function gen() {
    if (!kit) { toast({ title: "اختر Brand Kit", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const [w, h] = size.split("x").map(Number);
      const { data, error } = await supabase.functions.invoke("branding-generate-graphic-prompt", {
        body: {
          asset_type: type, platform, width: w, height: h,
          brand: { name_ar: kit.brand_name_ar, name_en: kit.brand_name_en, slogan: kit.slogan, industry: kit.industry },
          colors: kit.colors_json, typography: kit.typography_json, dna: kit.brand_dna_json,
          instructions: extra, text_overlay: overlay
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
    const [w, h] = size.split("x").map(Number);
    await saveAsset({
      brand_kit_id: kit.id, client_id: kit.client_id, asset_type: "prompt",
      platform, size_width: w, size_height: h, title: type,
      prompt: result.prompt, negative_prompt: result.negative_prompt,
      provider: "external", metadata_json: { type, overlay }
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base">مولد برومبتات الجرافيك الخارجية</CardTitle></CardHeader>
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
              <Label className="text-xs">نوع البرومبت</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto">
                {TYPES.map(t => <Badge key={t} variant={type === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setType(t)}>{t}</Badge>)}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label className="text-xs">المنصة</Label><Input value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">المقاس (WxH)</Label><Input value={size} onChange={e => setSize(e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">نص داخل التصميم</Label><Input value={overlay} onChange={e => setOverlay(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">تعليمات إضافية</Label><Textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2} className="mt-1" /></div>
          <Button onClick={gen} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            توليد Prompt
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Prompt جاهز للأدوات الخارجية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={result.prompt} readOnly rows={6} className="text-xs" />
            {result.negative_prompt && (
              <div>
                <Label className="text-xs">Negative</Label>
                <Textarea value={result.negative_prompt} readOnly rows={2} className="text-xs mt-1" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copyText(result.prompt)}><Copy className="h-3 w-3" />نسخ</Button>
              <Button size="sm" variant="outline" onClick={save}><Save className="h-3 w-3" />حفظ</Button>
            </div>
            <div>
              <Label className="text-xs">فتح في أداة خارجية</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {EXTERNAL_TOOLS.map(t => (
                  <Button key={t.name} size="sm" variant="outline" onClick={() => { copyText(result.prompt, "تم النسخ — ألصق في الأداة"); window.open(t.url, "_blank"); }} className="gap-1">
                    <ExternalLink className="h-3 w-3" />{t.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
