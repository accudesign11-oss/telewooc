import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Copy, Trash2, Check, X, Star, Shield, Repeat, Loader2, Send } from "lucide-react";
import { copyText } from "./_shared";

const TYPES = ["all", "logo", "profile", "cover", "post_template", "general", "prompt"];
const STATUSES = ["all", "draft", "generated", "needs_review", "approved", "rejected", "final", "archived"];

export function BrandAssetLibrary() {
  const [assets, setAssets] = useState<any[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, any>>({});

  async function reload() {
    let query = supabase.from("branding_assets").select("*").order("created_at", { ascending: false });
    if (type !== "all") query = query.eq("asset_type", type);
    if (status !== "all") query = query.eq("status", status);
    const { data } = await query;
    let list = data || [];
    if (q) list = list.filter(a => (a.title || "").toLowerCase().includes(q.toLowerCase()) || (a.prompt || "").toLowerCase().includes(q.toLowerCase()));
    setAssets(list);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [type, status]);

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("branding_assets").update(patch).eq("id", id);
    if (error) toast({ title: "فشل", variant: "destructive" });
    else reload();
  }
  async function del(id: string) {
    if (!confirm("حذف؟")) return;
    await supabase.from("branding_assets").delete().eq("id", id);
    reload();
  }

  async function checkConsistency(a: any) {
    if (!a.image_url) { toast({ title: "لا توجد صورة لفحصها", variant: "destructive" }); return; }
    setBusy(a.id);
    try {
      let brandKit: any = null;
      if (a.brand_kit_id) {
        const { data } = await supabase.from("brand_kits").select("*").eq("id", a.brand_kit_id).maybeSingle();
        brandKit = data;
      }
      const { data, error } = await supabase.functions.invoke("branding-check-consistency", {
        body: { image_url: a.image_url, brand_kit: brandKit, asset_type: a.asset_type },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      setReports(r => ({ ...r, [a.id]: data }));
      await supabase.from("branding_assets").update({
        consistency_score: data.score, consistency_report: data,
      }).eq("id", a.id);
      toast({ title: `🎯 ${data.verdict || "تم الفحص"} — ${data.score}/100` });
      reload();
    } catch (e: any) {
      toast({ title: "فشل الفحص", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function regenerate(a: any) {
    if (!a.prompt) { toast({ title: "لا يوجد Prompt", variant: "destructive" }); return; }
    setBusy(a.id);
    try {
      const size = a.size_width && a.size_height ? `${a.size_width}x${a.size_height}` : "1024x1024";
      const { data, error } = await supabase.functions.invoke("branding-generate-image", {
        body: {
          prompt: a.prompt + " — variation, enhanced details, refined composition",
          negative_prompt: a.negative_prompt || "",
          asset_type: a.asset_type, brand_kit_id: a.brand_kit_id, client_id: a.client_id,
          platform: a.platform, size, n: 1, title: `${a.title || a.asset_type} — variant`,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      toast({ title: "✅ تم توليد نسخة جديدة" });
      reload();
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function sendToSocial(a: any) {
    setBusy(a.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("سجّل الدخول أولاً");
      const media = a.image_url ? [{ url: a.image_url, type: "image", source: "branding_studio", asset_id: a.id }] : [];
      const platforms = a.platform ? [a.platform] : ["facebook_page", "instagram"];
      const content: Record<string, string> = {};
      for (const p of platforms) content[p] = a.title ? `${a.title}\n\n${a.prompt || ""}` : (a.prompt || "");
      const { error } = await supabase.from("social_posts").insert({
        user_id: u.user.id,
        title: a.title || "من البراندنج",
        source_type: "branding",
        media,
        generated_content: content,
        selected_platforms: platforms,
        status: "draft",
        approval_status: "pending",
      });
      if (error) throw error;
      toast({ title: "✅ تم الإرسال إلى Social Engine كمسودة" });
    } catch (e: any) {
      toast({ title: "فشل الإرسال", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-3" dir="rtl">
      <Card><CardContent className="p-3 flex flex-wrap gap-2 items-center">
        <select className="h-9 rounded border bg-background px-2 text-sm" value={type} onChange={e => setType(e.target.value)}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="h-9 rounded border bg-background px-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && reload()} placeholder="بحث..." className="max-w-xs" />
        <Button size="sm" variant="outline" onClick={reload}>تطبيق</Button>
        <span className="text-xs text-muted-foreground mr-auto">{assets.length} عنصر</span>
      </CardContent></Card>

      {assets.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد عناصر.</CardContent></Card>}

      <div className="grid md:grid-cols-2 gap-3">
        {assets.map(a => {
          const r = reports[a.id] || (a.consistency_report as any);
          return (
            <Card key={a.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{a.title || a.asset_type}</div>
                    <div className="text-xs text-muted-foreground">{a.platform || "—"} · {a.size_width && `${a.size_width}×${a.size_height}`}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{a.asset_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                    {a.consistency_score != null && (
                      <Badge className="text-[10px]" variant={a.consistency_score >= 75 ? "default" : "destructive"}>
                        {Math.round(a.consistency_score)}/100
                      </Badge>
                    )}
                  </div>
                </div>
                {a.image_url && <img src={a.image_url} className="w-full h-40 object-cover rounded" alt="" />}
                {a.prompt && <p className="text-xs text-muted-foreground line-clamp-3">{a.prompt}</p>}
                {r && (
                  <div className="text-xs bg-muted/30 p-2 rounded space-y-1">
                    <div><b>الحكم:</b> {r.verdict}</div>
                    <div className="grid grid-cols-2 gap-1">
                      <span>الألوان: {r.color_match}/100</span>
                      <span>الطباعة: {r.typography_match}/100</span>
                      <span>النمط: {r.style_match}/100</span>
                      <span>التكوين: {r.composition}/100</span>
                    </div>
                    {r.suggestions?.length > 0 && <div><b>اقتراحات:</b> {(r.suggestions as string[]).join(" · ")}</div>}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyText(a.prompt || "")} title="نسخ"><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a.id, { is_favorite: !a.is_favorite })} title="مفضّل"><Star className={`h-3 w-3 ${a.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a.id, { status: "approved" })} title="اعتماد"><Check className="h-3 w-3 text-green-600" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a.id, { status: "rejected" })} title="رفض"><X className="h-3 w-3 text-red-600" /></Button>
                  {a.image_url && (
                    <Button size="sm" variant="ghost" onClick={() => checkConsistency(a)} disabled={busy === a.id} title="فحص التناسق">
                      {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3 text-blue-600" />}
                    </Button>
                  )}
                  {a.prompt && (
                    <Button size="sm" variant="ghost" onClick={() => regenerate(a)} disabled={busy === a.id} title="نسخة جديدة">
                      <Repeat className="h-3 w-3 text-purple-600" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => sendToSocial(a)} disabled={busy === a.id} title="إرسال إلى Social Engine">
                    <Send className="h-3 w-3 text-emerald-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(a.id)} title="حذف"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
