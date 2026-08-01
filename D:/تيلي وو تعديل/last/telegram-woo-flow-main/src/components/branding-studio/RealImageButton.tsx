import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, ImageDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Props = {
  prompt: string;
  negative_prompt?: string;
  asset_type: string;
  brand_kit_id?: string | null;
  client_id?: string | null;
  platform?: string | null;
  size?: string;
  n?: number;
  title?: string;
  onDone?: (assets: any[]) => void;
};

export function RealImageButton(p: Props) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);

  async function run() {
    if (!p.prompt) { toast({ title: "لا يوجد Prompt", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-image", {
        body: {
          prompt: p.prompt,
          negative_prompt: p.negative_prompt || "",
          asset_type: p.asset_type,
          brand_kit_id: p.brand_kit_id || null,
          client_id: p.client_id || null,
          platform: p.platform || null,
          size: p.size || "1024x1024",
          n: p.n || 1,
          title: p.title || null,
          fallback_to_lovable: true,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "فشل التوليد");
      setAssets(data.assets || []);
      p.onDone?.(data.assets || []);
      toast({
        title: `✅ تم توليد ${data.assets?.length || 0} صورة`,
        description: `المزود: ${(data.providers || []).join(" → ")}`,
      });
    } catch (e: any) {
      toast({ title: "فشل التوليد الفعلي", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={loading} size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        توليد صورة فعلية
        <Badge variant="secondary" className="ml-1">{p.size || "1024x1024"}</Badge>
      </Button>
      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {assets.map((a) => (
            <div key={a.id} className="border rounded-lg overflow-hidden bg-muted/30">
              {a.image_url ? (
                <img src={a.image_url} alt={a.title || ""} className="w-full h-auto" loading="lazy" />
              ) : (
                <div className="p-4 text-xs text-muted-foreground">لا يوجد رابط</div>
              )}
              <div className="p-2 flex items-center justify-between">
                <span className="text-xs truncate">{a.title}</span>
                {a.image_url && (
                  <a href={a.image_url} download target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><ImageDown className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
