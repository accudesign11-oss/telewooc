import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Loader2, Sparkles, Download, History, RefreshCw, Lightbulb, FileCode2, Merge, Edit3, XCircle, Trash2, Code, Copy, Check, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const PLUGIN_SUGGESTIONS = [
  "Plugin يضيف شارة \"شحن مجاني\" على كل منتج يتجاوز سعره 500",
  "Plugin عداد تنازلي في صفحة المنتج لعروض محدودة",
  "Plugin يضيف تبويب \"مواصفات\" منسق داخل صفحة المنتج",
  "Plugin زر واتساب عائم مع رسالة مسبقة تتضمن اسم المنتج",
  "Plugin يخفي طرق الدفع حسب مبلغ السلة",
  "Plugin أنيميشن ظهور للمنتجات عند التمرير",
  "Plugin شريط علوي متحرك بإعلان الشحن",
  "Plugin قسم منتجات مشاهدة مؤخراً في الفوتر",
  "Plugin ترتيب المنتجات حسب الأكثر مبيعاً افتراضياً",
  "Plugin إشعار سلة صغير أعلى الشاشة بعد الإضافة",
  "Plugin يخفي المنتجات النافدة من القوائم",
  "Plugin يظهر Popup ترحيبي لأول زيارة",
];

function pick3<T>(arr: T[]): T[] {
  const p = [...arr]; const out: T[] = [];
  for (let i = 0; i < 3 && p.length; i++) out.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]);
  return out;
}

async function invokeFn<T = any>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) { try { detail = await error.context.text(); } catch (_) {} }
    throw new Error(detail || "فشل الاستدعاء");
  }
  if (data && data.ok === false) throw new Error(data.error || "خطأ غير معروف");
  return data as T;
}

function b64ToBlob(b64: string, mime = "application/zip") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function PluginBuilderTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState(pick3(PLUGIN_SUGGESTIONS));
  const [basePluginId, setBasePluginId] = useState<string>("new");
  const [generating, setGenerating] = useState(false);
  const [merging, setMerging] = useState(false);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [versions, setVersions] = useState<Record<string, any[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  // Code View & Edit Modal state
  const [viewCodePlugin, setViewCodePlugin] = useState<any | null>(null);
  const [viewingPhpCode, setViewingPhpCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const openCodeModal = async (plugin: any) => {
    setViewCodePlugin(plugin);
    setLoadingCode(true);
    try {
      const { data: latestVer } = await supabase
        .from("wp_plugin_versions")
        .select("*")
        .eq("plugin_id", plugin.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestVer?.php_code) {
        setViewingPhpCode(latestVer.php_code);
      } else {
        setViewingPhpCode(`<?php\n/**\n * Plugin Name: ${plugin.name}\n * Description: ${plugin.description || ""}\n * Version: ${plugin.current_version}\n */\n\nif (!defined('ABSPATH')) exit;\n\n// كود الإضافة الأصلي...\n`);
      }
    } catch (e: any) {
      setViewingPhpCode(`<?php\n// ${plugin.name} v${plugin.current_version}\n`);
    } finally {
      setLoadingCode(false);
    }
  };

  const loadPlugins = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data } = await supabase.from("wp_plugins").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    setPlugins(data || []);
  };

  useEffect(() => { loadPlugins(); }, []);

  const loadVersions = async (pluginId: string) => {
    if (versions[pluginId] && expandedId === pluginId) {
      setExpandedId(null);
      return;
    }
    const { data } = await supabase.from("wp_plugin_versions").select("*").eq("plugin_id", pluginId).order("created_at", { ascending: false });
    setVersions((v) => ({ ...v, [pluginId]: data || [] }));
    setExpandedId(pluginId);
  };

  const handleGenerate = async (overrideBaseId?: string, overridePrompt?: string) => {
    const activePrompt = overridePrompt || prompt;
    const activeBaseId = overrideBaseId || basePluginId;

    if (!activePrompt.trim()) { toast({ title: "اكتب وصف التعديل أو الـ Plugin أولاً", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const r: any = await invokeFn("wp-plugin-builder", {
        prompt: activePrompt,
        base_plugin_id: activeBaseId === "new" ? null : activeBaseId,
      });
      setLastResult(r);
      toast({ title: `تم توليد ${r.name} v${r.version}`, description: r.changelog });
      setSuggestions(pick3(PLUGIN_SUGGESTIONS));
      setEditingPluginId(null);
      setEditPrompt("");
      await loadPlugins();
      downloadResult(r);
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleMergePlugins = async () => {
    if (selectedMergeIds.length < 2) {
      toast({ title: "تنبيه", description: "اختر إضافتين أو أكثر لدمجهما معاً", variant: "destructive" });
      return;
    }
    setMerging(true);
    try {
      const mergedNames = plugins.filter(p => selectedMergeIds.includes(p.id)).map(p => p.name).join(" + ");
      const mergePrompt = `إضافة ووردبريس فتاكة تدمج ميزات ومكونات الإضافات التالية في إضافة واحدة شاملة وموحدة: ${mergedNames}`;

      const r: any = await invokeFn("wp-plugin-builder", {
        prompt: mergePrompt,
        merge_plugin_ids: selectedMergeIds,
      });
      setLastResult(r);
      toast({ title: `تم دمج الإضافات بنجاح في ${r.name} v${r.version}!`, description: r.changelog });
      setSelectedMergeIds([]);
      await loadPlugins();
      downloadResult(r);
    } catch (e: any) {
      toast({ title: "فشل الدمج", description: e.message, variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const handleDeletePlugin = async (id: string) => {
    try {
      await supabase.from("wp_plugins").delete().eq("id", id);
      toast({ title: "تم حذف الإضافة" });
      loadPlugins();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const downloadResult = (r: any) => {
    if (!r?.zip_base64) return;
    const blob = b64ToBlob(r.zip_base64);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = r.zip_filename || `${r.slug}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadVersion = async (versionId: string, slug: string, version: string) => {
    const { data: v } = await supabase.from("wp_plugin_versions").select("*").eq("id", versionId).single();
    if (!v) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder(slug)!;
    folder.file(`${slug}.php`, v.php_code);
    folder.folder("assets")!.file("style.css", v.css || "");
    folder.folder("assets")!.file("script.js", v.js || "");
    folder.file("readme.txt", `=== ${slug} ===\nVersion: ${version}\n\n${v.changelog || ""}\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-${version}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleMergeSelect = (id: string) => {
    if (selectedMergeIds.includes(id)) {
      setSelectedMergeIds(selectedMergeIds.filter(i => i !== id));
    } else {
      setSelectedMergeIds([...selectedMergeIds, id]);
    }
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Create New Plugin Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">مولّد ومطوّر Plugins WordPress</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            صف ما تريده، وسنولّد لك Plugin مستقل بصيغة ZIP جاهز للرفع على <code>wp-admin/plugins.php</code>. كل تعديل يُنشئ إصدارًا جديدًا بنفس الـ slug مع أتمتة التنزيل.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={'مثال: Plugin يضيف شارة "جديد" على المنتجات المضافة خلال آخر 14 يوم مع أنيميشن نبض.'}
            rows={4}
            dir="auto"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={basePluginId} onValueChange={setBasePluginId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Plugin جديد أو تحديث موجود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">✨ Plugin جديد من الصفر</SelectItem>
                {plugins.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    تحديث: {p.name} (v{p.current_version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleGenerate()} disabled={generating || !prompt.trim()}>
              {generating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Sparkles className="h-4 w-4 ml-2" />}
              {basePluginId === "new" ? "إنشاء وتنزيل ملف ZIP" : "إصدار النسخة الجديدة وتنزيل ZIP"}
            </Button>
            <Button variant="outline" onClick={() => setSuggestions(pick3(PLUGIN_SUGGESTIONS))}>
              <RefreshCw className="h-4 w-4 ml-2" /> اقتراحات
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-3 pt-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setPrompt(s)}
                className="text-right text-sm p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/60 hover:bg-primary/5 transition-colors">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </div>
              </button>
            ))}
          </div>

          {lastResult && (
            <Card className="border-emerald-500/30 bg-emerald-500/5 mt-3">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{lastResult.name} <Badge variant="secondary">v{lastResult.version}</Badge></div>
                    <div className="text-xs text-muted-foreground mt-1">{lastResult.changelog}</div>
                  </div>
                  <Button size="sm" onClick={() => downloadResult(lastResult)}>
                    <Download className="h-4 w-4 ml-2" /> تنزيل ملف الإضافة ZIP
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  slug: <code>{lastResult.slug}</code> · الملف: <code>{lastResult.zip_filename}</code>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Merging Action Box */}
      {selectedMergeIds.length >= 2 && (
        <Card className="border-purple-500/30 bg-purple-500/10">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-bold text-sm">دمج الإضافات المحددة ({selectedMergeIds.length} إضافات)</p>
                <p className="text-xs text-muted-foreground">
                  سيقوم الذكاء الاصطناعي بإعادة كتابة الكود ودمج ميزات الإضافات في إضافة واحدة موحدة وأقوى بصيغة ZIP.
                </p>
              </div>
            </div>
            <Button onClick={handleMergePlugins} disabled={merging} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {merging ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Merge className="h-4 w-4 ml-2" />}
              دمج الإضافات وتنزيل ZIP
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plugins List & Evolution */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">إضافاتك (Plugins) وتطوير الإصدارات</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={loadPlugins}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plugins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد إضافات بعد. أنشئ أولها من الأعلى.</p>
          ) : (
            <div className="space-y-3">
              {plugins.map((p) => (
                <div key={p.id} className={`border rounded-lg p-3 transition-colors ${editingPluginId === p.id ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`merge-${p.id}`}
                        checked={selectedMergeIds.includes(p.id)}
                        onCheckedChange={() => toggleMergeSelect(p.id)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <FileCode2 className="h-4 w-4 text-primary" />
                          {p.name} <Badge variant="secondary">v{p.current_version}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                        <code className="text-[10px] text-muted-foreground">{p.slug}</code>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openCodeModal(p)} className="gap-1 font-bold text-xs">
                        <Code className="h-4 w-4 ml-1 text-indigo-500" />
                        عرض الكود
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => loadVersions(p.id)}>
                        <History className="h-4 w-4 ml-1" />
                        {expandedId === p.id ? "إخفاء الإصدارات" : "الإصدارات (Versions)"}
                      </Button>
                      <Button
                        size="sm"
                        variant={editingPluginId === p.id ? "secondary" : "default"}
                        onClick={() => {
                          if (editingPluginId === p.id) {
                            setEditingPluginId(null);
                          } else {
                            setEditingPluginId(p.id);
                            setEditPrompt("");
                          }
                        }}
                      >
                        <Edit3 className="h-4 w-4 ml-1" />
                        {editingPluginId === p.id ? "إلغاء التعديل" : "تعديل بالـ AI"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePlugin(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline AI Edit Box */}
                  {editingPluginId === p.id && (
                    <div className="mt-3 p-3 bg-background rounded-lg border space-y-2">
                      <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        تعديل وتطوير هذه الإضافة بالذكاء الاصطناعي (سيتم إنشاء إصدار جديد v{p.current_version} ➔ v...):
                      </Label>
                      <Textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="اكتب التعديلات المطلوبة (مثال: احذف العداد التنازلي وأضف بدلاً منه زر واتساب مخصص، مع تغيير لون الخلفية للأسود)..."
                        rows={3}
                        dir="auto"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingPluginId(null)}>إلغاء</Button>
                        <Button size="sm" disabled={generating || !editPrompt.trim()} onClick={() => handleGenerate(p.id, editPrompt)}>
                          {generating ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Download className="h-4 w-4 ml-1" />}
                          توليد الإصدار الجديد وتنزيل ZIP
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Version History Subpanel */}
                  {expandedId === p.id && versions[p.id] && (
                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      <Label className="text-xs font-bold text-muted-foreground">أرشيف الإصدارات السابقة (Version History):</Label>
                      {versions[p.id].map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-primary">v{v.version}</div>
                            <div className="text-muted-foreground truncate">{v.changelog || v.prompt}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString("ar-EG")}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => downloadVersion(v.id, p.slug, v.version)}>
                            <Download className="h-3.5 w-3.5 ml-1 text-primary" /> تنزيل ZIP
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View & Edit Plugin Code Dialog */}
      <Dialog open={!!viewCodePlugin} onOpenChange={(open) => !open && setViewCodePlugin(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <FileCode2 className="h-5 w-5" />
              كود الإضافة: {viewCodePlugin?.name} (v{viewCodePlugin?.current_version})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يمكنك معاينة كود الـ PHP الخاص بالإضافة أو نسخه أو إجراء تعديلات إضافية عليه عبر الذكاء الاصطناعي.
            </DialogDescription>
          </DialogHeader>

          {loadingCode ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              جاري جلب كود الإضافة الأصلي...
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs dir-ltr">
                  {viewCodePlugin?.slug}.php
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(viewingPhpCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                    toast({ title: "تم نسخ كود الإضافة بالحافظة!" });
                  }}
                  className="gap-1 font-bold text-xs"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "تم النسخ!" : "نسخ الكود الكامل"}
                </Button>
              </div>

              <Textarea
                value={viewingPhpCode}
                onChange={(e) => setViewingPhpCode(e.target.value)}
                className="font-mono text-xs h-96 dir-ltr bg-slate-950 text-slate-100 rounded-lg p-3 leading-relaxed border-slate-800"
              />

              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewCodePlugin(null)}>
                  إغلاق
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 font-bold"
                  onClick={() => {
                    setViewCodePlugin(null);
                    setEditingPluginId(viewCodePlugin?.id);
                    setEditPrompt("");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  تطوير وإضافة ميزات بالـ AI
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}