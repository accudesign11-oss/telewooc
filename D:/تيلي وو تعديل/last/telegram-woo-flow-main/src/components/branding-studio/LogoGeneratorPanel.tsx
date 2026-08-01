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

export function LogoGeneratorPanel() {
  const [kits, setKits] = useState<any[]>([]);
  const [kit, setKit] = useState<any>(null);
  const [icon, setIcon] = useState("");
  const [style, setStyle] = useState("Minimal");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).then(({ data }) => setKits(data || [])); }, []);

  async function gen() {
    if (!kit) { toast({ title: "اختر Brand Kit", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-logo-prompt", {
        body: {
          brand_name_ar: kit.brand_name_ar, brand_name_en: kit.brand_name_en, slogan: kit.slogan,
          industry: kit.industry, colors: kit.colors_json, typography: kit.typography_json,
          personality: kit.personality_json, icon_idea: icon, logo_style: style,
          dna: kit.brand_dna_json
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
      brand_kit_id: kit.id, client_id: kit.client_id, asset_type: "logo",
      title: `Logo — ${kit.brand_name_ar || kit.brand_name_en}`,
      prompt: result.prompt, negative_prompt: result.negative_prompt,
      provider: "prompt-mode", metadata_json: { variations: result.variations, style }
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base">مولد اللوجو — Prompt Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand Kit</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 mt-1" value={kit?.id || ""} onChange={e => setKit(kits.find(k => k.id === e.target.value))}>
                <option value="">— اختر —</option>
                {kits.map(k => <option key={k.id} value={k.id}>{k.brand_name_ar || k.brand_name_en || "بدون اسم"}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Logo Style</Label>
              <Input value={style} onChange={e => setStyle(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">فكرة الأيقونة (اختياري)</Label>
            <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="مثال: تاج صغير، حرف عربي مرسوم..." className="mt-1" />
          </div>
          <Button onClick={gen} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            توليد Prompt
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">النتيجة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Prompt</Label>
              <Textarea value={result.prompt} readOnly rows={6} className="mt-1 text-xs" />
            </div>
            {result.negative_prompt && (
              <div>
                <Label className="text-xs">Negative Prompt</Label>
                <Textarea value={result.negative_prompt} readOnly rows={3} className="mt-1 text-xs" />
              </div>
            )}
            {result.variations?.length > 0 && (
              <div>
                <Label className="text-xs">Variations</Label>
                <div className="space-y-2 mt-1">
                  {result.variations.map((v: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Textarea value={v} readOnly rows={2} className="text-xs" />
                      <Button size="sm" variant="outline" onClick={() => copyText(v)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => copyText(result.prompt)} className="gap-1"><Copy className="h-3 w-3" />نسخ</Button>
              <Button size="sm" variant="outline" onClick={save} className="gap-1"><Save className="h-3 w-3" />حفظ Prompt</Button>
              <Badge variant="secondary">Prompt Mode</Badge>
            </div>
            <div className="pt-3 border-t">
              <RealImageButton
                prompt={result.prompt}
                negative_prompt={result.negative_prompt}
                asset_type="logo"
                brand_kit_id={kit?.id}
                client_id={kit?.client_id}
                size="1024x1024"
                n={1}
                title={`Logo — ${kit?.brand_name_ar || kit?.brand_name_en}`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
