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

export function ProfileCoverGenerator() {
  const [kits, setKits] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [kit, setKit] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [overlay, setOverlay] = useState("");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).then(({ data }) => setKits(data || []));
    supabase.from("social_size_presets").select("*").eq("is_active", true).order("platform").then(({ data }) => setPresets(data || []));
  }, []);

  const platforms = Array.from(new Set(presets.map(p => p.platform)));
  const [platform, setPlatform] = useState("");
  const sizesForPlatform = presets.filter(p => p.platform === platform);

  async function gen() {
    if (!kit || !selected) { toast({ title: "اختر Brand Kit ومقاس", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-graphic-prompt", {
        body: {
          asset_type: selected.asset_type, platform: selected.platform,
          width: selected.width, height: selected.height,
          brand: { name_ar: kit.brand_name_ar, name_en: kit.brand_name_en, slogan: kit.slogan, industry: kit.industry },
          colors: kit.colors_json, typography: kit.typography_json,
          dna: kit.brand_dna_json, instructions, text_overlay: overlay
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
    if (!result || !kit || !selected) return;
    const isProfile = selected.asset_type.includes("profile");
    await saveAsset({
      brand_kit_id: kit.id, client_id: kit.client_id,
      asset_type: isProfile ? "profile" : "cover",
      platform: selected.platform, size_width: selected.width, size_height: selected.height,
      title: `${selected.platform} — ${selected.asset_type}`,
      prompt: result.prompt, negative_prompt: result.negative_prompt,
      provider: "prompt-mode", metadata_json: { variations: result.variations, overlay }
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base">البروفايل والكفرات</CardTitle></CardHeader>
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
              <Label className="text-xs">المنصة</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 mt-1" value={platform} onChange={e => { setPlatform(e.target.value); setSelected(null); }}>
                <option value="">— اختر —</option>
                {platforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {platform && (
            <div>
              <Label className="text-xs">المقاس</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sizesForPlatform.map(s => (
                  <Badge key={s.id} variant={selected?.id === s.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelected(s)}>
                    {s.asset_type} ({s.width}×{s.height})
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">نص داخل التصميم (اختياري)</Label>
            <Input value={overlay} onChange={e => setOverlay(e.target.value)} className="mt-1" placeholder="مثال: افتتاح خاص — خصم 20%" />
          </div>
          <div>
            <Label className="text-xs">تعليمات إضافية</Label>
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} className="mt-1" />
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
            <Textarea value={result.prompt} readOnly rows={6} className="text-xs" />
            {result.negative_prompt && <Textarea value={result.negative_prompt} readOnly rows={2} className="text-xs" />}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copyText(result.prompt)}><Copy className="h-3 w-3" />نسخ</Button>
              <Button size="sm" variant="outline" onClick={save}><Save className="h-3 w-3" />حفظ Prompt</Button>
            </div>
            {selected && (
              <div className="pt-3 border-t">
                <RealImageButton
                  prompt={result.prompt}
                  negative_prompt={result.negative_prompt}
                  asset_type={selected.asset_type.includes("profile") ? "profile" : "cover"}
                  brand_kit_id={kit?.id}
                  client_id={kit?.client_id}
                  platform={selected.platform}
                  size={`${selected.width}x${selected.height}`}
                  n={1}
                  title={`${selected.platform} — ${selected.asset_type}`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
