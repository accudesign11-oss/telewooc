import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Eye, Download, Package, Loader2, Copy, FileArchive } from "lucide-react";
import { copyText } from "./_shared";
import JSZip from "jszip";

export function BrandKitViewer() {
  const [kits, setKits] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase.from("brand_kits").select("*").order("created_at", { ascending: false });
    setKits(data || []);
  }
  useEffect(() => { reload(); }, []);

  async function del(id: string) {
    if (!confirm("حذف Brand Kit؟")) return;
    const { error } = await supabase.from("brand_kits").delete().eq("id", id);
    if (error) { toast({ title: "فشل الحذف", variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    reload();
  }

  function downloadJson(kit: any) {
    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${kit.brand_name_en || kit.brand_name_ar || "brand-kit"}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function fullExport(kit: any) {
    setExporting(kit.id);
    try {
      const { data, error } = await supabase.functions.invoke("branding-export-kit", {
        body: { kit_id: kit.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      setExportData(data);
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e.message, variant: "destructive" });
    } finally { setExporting(null); }
  }

  async function downloadZip(kit: any) {
    setExporting(kit.id);
    try {
      const { data, error } = await supabase.functions.invoke("branding-export-kit", { body: { kit_id: kit.id } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      const zip = new JSZip();
      zip.file("brand-kit.json", JSON.stringify(data.kit, null, 2));
      zip.file("brand.css", data.exports.css_variables);
      zip.file("tailwind.brand.json", JSON.stringify(data.exports.tailwind_config, null, 2));
      zip.file("BRAND-GUIDELINES.md", data.exports.markdown_guidelines);
      const assets = data.assets || [];
      zip.file("assets/index.json", JSON.stringify(assets, null, 2));
      // Fetch images (best-effort)
      const folder = zip.folder("assets/images")!;
      await Promise.all(assets.filter((a: any) => a.image_url).map(async (a: any, i: number) => {
        try {
          const r = await fetch(a.image_url); if (!r.ok) return;
          const b = await r.blob();
          const ext = (b.type.split("/")[1] || "png").split("+")[0];
          folder.file(`${a.asset_type}-${i}-${a.id?.slice(0,8) || ""}.${ext}`, b);
        } catch {}
      }));
      // Prompts as markdown
      const prompts = assets.filter((a: any) => a.prompt).map((a: any) =>
        `## ${a.title || a.asset_type}\n- النوع: ${a.asset_type}\n- المنصة: ${a.platform || "—"}\n\n\`\`\`\n${a.prompt}\n\`\`\`\n`
      ).join("\n");
      if (prompts) zip.file("PROMPTS.md", `# برومبتات Brand Kit\n\n${prompts}`);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${kit.brand_name_en || kit.brand_name_ar || "brand-kit"}.zip`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: "✅ تم تحميل ZIP" });
    } catch (e: any) {
      toast({ title: "فشل ZIP", description: e.message, variant: "destructive" });
    } finally { setExporting(null); }
  }

  function downloadText(name: string, content: string, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  if (kits.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد Brand Kits. ابدأ من تاب «إنشاء هوية».</CardContent></Card>;

  return (
    <div className="space-y-3" dir="rtl">
      {kits.map(k => (
        <Card key={k.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex justify-between items-center">
              <span>{k.brand_name_ar || k.brand_name_en || "بدون اسم"}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setOpen(open?.id === k.id ? null : k)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => downloadJson(k)} title="تنزيل JSON"><Download className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => fullExport(k)} disabled={exporting === k.id} title="تصدير كامل">
                  {exporting === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4 text-primary" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => downloadZip(k)} disabled={exporting === k.id} title="ZIP كامل">
                  <FileArchive className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex gap-2 flex-wrap">
              {k.industry && <Badge variant="secondary">{k.industry}</Badge>}
              {k.slogan && <Badge variant="outline">{k.slogan}</Badge>}
              <Badge>{k.status}</Badge>
            </div>
            <div className="flex gap-1">
              {Object.values(k.colors_json || {}).map((c: any, i) => (
                <div key={i} className="h-6 w-6 rounded border" style={{ background: c }} title={c} />
              ))}
            </div>
            {open?.id === k.id && (
              <div className="pt-3 border-t mt-3 space-y-2">
                <div><b>الوصف:</b> {k.description || "—"}</div>
                <div><b>الموقع:</b> {k.website_url || "—"}</div>
                <div><b>الخطوط:</b> {JSON.stringify(k.typography_json)}</div>
                <Button size="sm" variant="outline" onClick={() => copyText(JSON.stringify(k.brand_dna_json, null, 2))}>نسخ Brand DNA</Button>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">عرض Brand DNA</summary>
                  <pre className="text-xs bg-muted/30 p-2 rounded mt-2 max-h-60 overflow-auto whitespace-pre-wrap">{JSON.stringify(k.brand_dna_json, null, 2)}</pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!exportData} onOpenChange={(o) => !o && setExportData(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>تصدير Brand Kit الكامل</DialogTitle></DialogHeader>
          {exportData && (
            <Tabs defaultValue="css">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="css">CSS Variables</TabsTrigger>
                <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                <TabsTrigger value="md">Guidelines</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="css" className="space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => copyText(exportData.exports.css_variables)}><Copy className="h-3 w-3" />نسخ</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadText("brand.css", exportData.exports.css_variables, "text/css")}><Download className="h-3 w-3" />تحميل</Button>
                </div>
                <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">{exportData.exports.css_variables}</pre>
              </TabsContent>
              <TabsContent value="tailwind" className="space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => copyText(JSON.stringify(exportData.exports.tailwind_config, null, 2))}><Copy className="h-3 w-3" />نسخ</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadText("tailwind.brand.json", JSON.stringify(exportData.exports.tailwind_config, null, 2), "application/json")}><Download className="h-3 w-3" />تحميل</Button>
                </div>
                <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(exportData.exports.tailwind_config, null, 2)}</pre>
              </TabsContent>
              <TabsContent value="md" className="space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => copyText(exportData.exports.markdown_guidelines)}><Copy className="h-3 w-3" />نسخ</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadText("brand-guidelines.md", exportData.exports.markdown_guidelines, "text/markdown")}><Download className="h-3 w-3" />تحميل</Button>
                </div>
                <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">{exportData.exports.markdown_guidelines}</pre>
              </TabsContent>
              <TabsContent value="json" className="space-y-2">
                <div className="text-xs text-muted-foreground">يشمل الـ Brand Kit + {exportData.assets?.length || 0} أصل مرتبط</div>
                <Button size="sm" variant="outline" onClick={() => downloadText("brand-kit-full.json", JSON.stringify(exportData, null, 2), "application/json")}><Download className="h-3 w-3" />تحميل JSON كامل</Button>
                <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(exportData.kit, null, 2)}</pre>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
