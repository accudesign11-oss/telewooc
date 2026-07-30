import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { copyText } from "./_shared";

export function SeasonalPromptsPanel() {
  const [kits, setKits] = useState<any[]>([]);
  const [kitId, setKitId] = useState<string>("");
  const [season, setSeason] = useState("auto");
  const [events, setEvents] = useState("");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("brand_kits").select("id,brand_name_ar,brand_name_en").order("created_at", { ascending: false })
      .then(({ data }) => setKits(data || []));
  }, []);

  async function generate(save = false) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-seasonal-prompts", {
        body: {
          brand_kit_id: kitId || null,
          season,
          events: events.split(",").map(s => s.trim()).filter(Boolean),
          count,
          save,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      setItems(data.items || []);
      toast({ title: save ? `✅ تم توليد وحفظ ${data.saved} برومبت` : `✅ تم توليد ${data.items?.length || 0} برومبت` });
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3" dir="rtl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex gap-2 items-center"><Sparkles className="h-4 w-4" /> برومبتات موسمية ومناسبات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <select className="h-9 rounded border bg-background px-2 text-sm" value={kitId} onChange={e => setKitId(e.target.value)}>
              <option value="">— بدون Brand Kit —</option>
              {kits.map(k => <option key={k.id} value={k.id}>{k.brand_name_ar || k.brand_name_en}</option>)}
            </select>
            <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="الموسم (مثال: رمضان، الصيف، Black Friday)" />
            <Input value={events} onChange={e => setEvents(e.target.value)} placeholder="مناسبات مفصولة بفواصل (اختياري)" />
            <Input type="number" min={1} max={20} value={count} onChange={e => setCount(parseInt(e.target.value) || 6)} placeholder="العدد" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => generate(false)} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} توليد
            </Button>
            <Button onClick={() => generate(true)} disabled={loading} variant="secondary" className="gap-1">
              <Save className="h-4 w-4" /> توليد + حفظ في المكتبة
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-medium text-sm">{it.title_ar}</div>
                <div className="flex gap-1">
                  {it.occasion && <Badge variant="secondary" className="text-[10px]">{it.occasion}</Badge>}
                  {it.platform_hint && <Badge variant="outline" className="text-[10px]">{it.platform_hint}</Badge>}
                  {it.size && <Badge className="text-[10px]">{it.size}</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{it.prompt}</p>
              {it.negative_prompt && <p className="text-[11px] text-destructive/80">⛔ {it.negative_prompt}</p>}
              <Button size="sm" variant="ghost" onClick={() => copyText(it.prompt)}><Copy className="h-3 w-3 ml-1" /> نسخ Prompt</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
