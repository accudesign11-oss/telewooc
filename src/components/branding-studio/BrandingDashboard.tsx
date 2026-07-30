import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Package, Palette, LayoutTemplate, Image as ImgIcon, Wand2,
  Sparkles, BadgeCheck, AlertCircle, Plug, Lightbulb, Loader2, FolderOpen
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BrandingDashboard({ onNavigate }: { onNavigate: (t: string) => void }) {
  const [stats, setStats] = useState({
    clients: 0, kits: 0, logos: 0, templates: 0, covers: 0, generals: 0, prompts: 0, needsReview: 0, provider: "—"
  });
  const [lastKit, setLastKit] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }, { count: c5 }, { count: c6 }, { count: c7 }, { count: c8 }] = await Promise.all([
        supabase.from("branding_clients").select("*", { count: "exact", head: true }),
        supabase.from("brand_kits").select("*", { count: "exact", head: true }),
        supabase.from("branding_assets").select("*", { count: "exact", head: true }).eq("asset_type", "logo"),
        supabase.from("branding_templates").select("*", { count: "exact", head: true }),
        supabase.from("branding_assets").select("*", { count: "exact", head: true }).in("asset_type", ["cover", "profile"]),
        supabase.from("branding_assets").select("*", { count: "exact", head: true }).eq("asset_type", "general"),
        supabase.from("branding_assets").select("*", { count: "exact", head: true }).eq("asset_type", "prompt"),
        supabase.from("branding_assets").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
      ]);
      const { data: kit } = await supabase.from("brand_kits").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: prov } = await supabase.from("generation_providers").select("provider_name").eq("is_default", true).maybeSingle();
      setStats({
        clients: c1 || 0, kits: c2 || 0, logos: c3 || 0, templates: c4 || 0,
        covers: c5 || 0, generals: c6 || 0, prompts: c7 || 0, needsReview: c8 || 0,
        provider: prov?.provider_name || "Lovable AI (افتراضي)"
      });
      setLastKit(kit);
    })();
  }, []);

  async function getSuggestions() {
    setLoadingSugg(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-suggest-actions", {
        body: { stats, last_kit: lastKit },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      setSuggestions(data.suggestions || []);
    } catch (e: any) {
      toast({ title: "فشل جلب الاقتراحات", description: e.message, variant: "destructive" });
    } finally { setLoadingSugg(false); }
  }

  const cards = [
    { i: Users, l: "العملاء", v: stats.clients },
    { i: Package, l: "Brand Kits", v: stats.kits },
    { i: Palette, l: "اللوجوهات", v: stats.logos },
    { i: LayoutTemplate, l: "القوالب", v: stats.templates },
    { i: ImgIcon, l: "بروفايل/كفرات", v: stats.covers },
    { i: ImgIcon, l: "صور عامة", v: stats.generals },
    { i: Wand2, l: "برومبتات محفوظة", v: stats.prompts },
    { i: AlertCircle, l: "تحتاج مراجعة", v: stats.needsReview },
  ];

  const actionMap: Record<string, string> = {
    go_logo: "logo", go_covers: "covers", go_templates: "templates",
    go_general: "general", go_create: "create", go_prompts: "prompts", go_library: "library",
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{c.l}</div>
                <div className="text-2xl font-bold mt-1">{c.v}</div>
              </div>
              <c.i className="h-6 w-6 text-primary opacity-60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />إجراءات سريعة</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onNavigate("create")}><Sparkles className="h-4 w-4" />هوية جديدة</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("logo")}><Palette className="h-4 w-4" />توليد لوجو</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("covers")}><ImgIcon className="h-4 w-4" />بروفايل / كفر</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("templates")}><LayoutTemplate className="h-4 w-4" />قالب منشور</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("general")}><ImgIcon className="h-4 w-4" />صورة عامة</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("prompts")}><Wand2 className="h-4 w-4" />Prompt جرافيك</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("library")}><FolderOpen className="h-4 w-4" />المكتبة</Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("providers")}><Plug className="h-4 w-4" />المزودون</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" />اقتراحات الذكاء الاصطناعي</CardTitle>
          <Button size="sm" onClick={getSuggestions} disabled={loadingSugg} className="gap-1">
            {loadingSugg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            توليد اقتراحات
          </Button>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">اضغط «توليد اقتراحات» للحصول على خطوات ذكية حسب حالة البراند الحالية.</div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {s.title}
                      <Badge variant={s.priority === "high" ? "destructive" : s.priority === "medium" ? "default" : "secondary"} className="text-[10px]">{s.priority}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{s.reason}</div>
                  </div>
                  {actionMap[s.action] && (
                    <Button size="sm" variant="outline" onClick={() => onNavigate(actionMap[s.action])}>اذهب</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BadgeCheck className="h-4 w-4" />آخر Brand Kit</CardTitle></CardHeader>
        <CardContent>
          {lastKit ? (
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">{lastKit.brand_name_ar || lastKit.brand_name_en || "بدون اسم"}</span> — {lastKit.industry || "—"}</div>
              <div className="text-muted-foreground">{lastKit.slogan}</div>
              <div className="text-xs text-muted-foreground">المزود الحالي: {stats.provider}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">لا يوجد Brand Kit بعد. ابدأ بإنشاء هوية جديدة.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
