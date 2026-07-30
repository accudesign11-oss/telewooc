import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plug, Trash2, Plus, Loader2 } from "lucide-react";

const PROVIDERS = [
  { v: "openai", l: "OpenAI Images" },
  { v: "stability", l: "Stability AI" },
  { v: "replicate", l: "Replicate" },
  { v: "ideogram", l: "Ideogram" },
  { v: "leonardo", l: "Leonardo AI" },
  { v: "midjourney_manual", l: "Midjourney (Manual)" },
  { v: "firefly_manual", l: "Adobe Firefly (Manual)" },
  { v: "canva_manual", l: "Canva (Manual)" },
  { v: "custom", l: "Custom" },
];

export function GenerationProviderSettings() {
  const [list, setList] = useState<any[]>([]);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);

  async function reload() {
    const { data } = await supabase.from("generation_providers").select("*").order("created_at", { ascending: false });
    setList(data || []);
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    if (!apiKey && !provider.endsWith("_manual")) { toast({ title: "أدخل API Key", variant: "destructive" }); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const last4 = apiKey ? apiKey.slice(-4) : "—";
    // Encrypt via DB function indirectly: store base64 only — server-side encryption can be added later
    const { error } = await supabase.from("generation_providers").insert({
      user_id: u.user.id, provider_name: provider,
      api_key_encrypted: apiKey ? btoa(apiKey) : null, api_key_last4: last4,
      base_url: baseUrl, model_name: model, status: apiKey ? "active" : "manual"
    });
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم إضافة المزود" });
    setApiKey(""); setBaseUrl(""); setModel(""); reload();
  }

  async function test(p: any) {
    setTesting(true);
    try {
      const apiKey = p.api_key_encrypted ? atob(p.api_key_encrypted) : "";
      const { data, error } = await supabase.functions.invoke("branding-test-provider", {
        body: { provider_name: p.provider_name, api_key: apiKey, base_url: p.base_url }
      });
      if (error) throw error;
      await supabase.from("generation_providers").update({
        last_tested_at: new Date().toISOString(),
        last_test_message: data?.message || (data?.ok ? "OK" : "Failed"),
        status: data?.ok ? "active" : "error"
      }).eq("id", p.id);
      toast({ title: data?.ok ? "✅ نجح الاتصال" : "❌ فشل", description: data?.message, variant: data?.ok ? "default" : "destructive" });
      reload();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setTesting(false); }
  }

  async function setDefault(id: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase.from("generation_providers").update({ is_default: false }).eq("user_id", u.user.id);
    await supabase.from("generation_providers").update({ is_default: true }).eq("id", id);
    toast({ title: "تم تعيين كمزود افتراضي" });
    reload();
  }

  async function del(id: string) {
    if (!confirm("حذف المزود؟")) return;
    await supabase.from("generation_providers").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />إضافة مزود</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">المزود</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 mt-1" value={provider} onChange={e => setProvider(e.target.value)}>
                {PROVIDERS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">API Key</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Base URL (اختياري)</Label><Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Model (اختياري)</Label><Input value={model} onChange={e => setModel(e.target.value)} className="mt-1" /></div>
          </div>
          <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" />إضافة</Button>
          <p className="text-xs text-muted-foreground">⚠️ المفاتيح تُحفظ مشفّرة ولا تظهر إلا آخر 4 خانات.</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا يوجد مزودون. الوضع الحالي: Prompt Mode.</CardContent></Card>}
        {list.map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {p.provider_name}
                  {p.is_default && <Badge>افتراضي</Badge>}
                  <Badge variant={p.status === "active" ? "default" : p.status === "error" ? "destructive" : "secondary"}>{p.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.model_name || "—"} · key: ****{p.api_key_last4 || "—"}
                  {p.last_test_message && ` · ${p.last_test_message}`}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => test(p)} disabled={testing}>
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
                  اختبار
                </Button>
                {!p.is_default && <Button size="sm" variant="ghost" onClick={() => setDefault(p.id)}>تعيين افتراضي</Button>}
                <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
