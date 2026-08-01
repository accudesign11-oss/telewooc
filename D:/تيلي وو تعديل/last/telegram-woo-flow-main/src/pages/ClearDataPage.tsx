import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, Loader2, Database, ImageIcon, History, HardDrive, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Counts = {
  product_images: number;
  variation_images: number;
  published_drafts: number;
  activity_log: number;
};

export default function ClearDataPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({ product_images: 0, variation_images: 0, published_drafts: 0, activity_log: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [selected, setSelected] = useState({
    draftImages: true,
    publishedDrafts: false,
    activityLog: false,
    browserCache: false,
  });

  const loadCounts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: drafts }, imagesCount, variationsCount, activityCount] = await Promise.all([
      supabase.from("draft_products").select("id, status").eq("user_id", user.id),
      supabase.from("product_images").select("id", { count: "exact", head: true })
        .in("draft_product_id", (
          (await supabase.from("draft_products").select("id").eq("user_id", user.id)).data?.map(d => d.id) || []
        )),
      supabase.from("product_variations").select("id", { count: "exact", head: true })
        .not("image_url", "is", null)
        .in("draft_product_id", (
          (await supabase.from("draft_products").select("id").eq("user_id", user.id)).data?.map(d => d.id) || []
        )),
      supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    setCounts({
      product_images: imagesCount.count || 0,
      variation_images: variationsCount.count || 0,
      published_drafts: (drafts || []).filter(d => d.status === "published").length,
      activity_log: activityCount.count || 0,
    });
    setLoading(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const runClear = async () => {
    if (!userId) return;
    if (!Object.values(selected).some(Boolean)) {
      toast({ title: "اختر شيئًا للمسح", variant: "destructive" });
      return;
    }
    if (!confirm("هل تريد تنفيذ المسح؟ لا يمكن التراجع.")) return;

    setRunning(true);
    try {
      const myDrafts = (await supabase.from("draft_products").select("id, status").eq("user_id", userId)).data || [];
      const allIds = myDrafts.map(d => d.id);
      const publishedIds = myDrafts.filter(d => d.status === "published").map(d => d.id);

      if (selected.draftImages && allIds.length > 0) {
        await supabase.from("product_images").delete().in("draft_product_id", allIds);
        await supabase.from("product_variations").update({ image_url: null }).in("draft_product_id", allIds);
      }
      if (selected.publishedDrafts && publishedIds.length > 0) {
        // children cascade on delete via FK? if not, clear referencing rows first
        await supabase.from("product_images").delete().in("draft_product_id", publishedIds);
        await supabase.from("product_variations").delete().in("draft_product_id", publishedIds);
        await supabase.from("product_attributes").delete().in("draft_product_id", publishedIds);
        await supabase.from("draft_products").delete().in("id", publishedIds);
      }
      if (selected.activityLog) {
        // activity_log is append-only via policies; attempt and ignore failure
        const { error } = await supabase.from("activity_log").delete().eq("user_id", userId);
        if (error) console.warn("activity_log delete blocked by policy:", error.message);
      }
      if (selected.browserCache) {
        try {
          // Preserve auth session
          const authKeys: { k: string; v: string }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!;
            if (k.startsWith("sb-") || k.includes("supabase")) {
              authKeys.push({ k, v: localStorage.getItem(k)! });
            }
          }
          localStorage.clear();
          sessionStorage.clear();
          for (const { k, v } of authKeys) localStorage.setItem(k, v);

          // IndexedDB
          if ("indexedDB" in window && (indexedDB as any).databases) {
            const dbs = await (indexedDB as any).databases();
            for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
          }
          // Caches API
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (e) {
          console.warn("Browser cache partial clear:", e);
        }
      }

      toast({ title: "تم المسح بنجاح", description: "تم تحرير المساحة المختارة." });
      await loadCounts();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const items: { key: keyof typeof selected; label: string; desc: string; icon: any; count?: number; badge?: string }[] = [
    {
      key: "draftImages",
      label: "صور المسودات (product_images + variation images)",
      desc: "يحذف الصور المخزنة بقاعدة البيانات. روابط imgbb الخارجية لا تتأثر داخل WooCommerce.",
      icon: ImageIcon,
      count: counts.product_images + counts.variation_images,
    },
    {
      key: "publishedDrafts",
      label: "المسودات المنشورة بالفعل في المتجر",
      desc: "يحذف سجلات draft_products التي اتنشرت ووتدائر مع متعلقاتها. لا يحذف المنتج من WooCommerce.",
      icon: Database,
      count: counts.published_drafts,
    },
    {
      key: "activityLog",
      label: "سجل النشاط (activity_log)",
      desc: "قد يكون مقيدًا بسياسة Append-only؛ سيُحاول وإن فشل يُتجاهل.",
      icon: History,
      count: counts.activity_log,
    },
    {
      key: "browserCache",
      label: "كاش المتصفح (localStorage / IndexedDB / Caches API)",
      desc: "يمسح كاش التطبيق في هذا الجهاز فقط، يحافظ على جلسة الدخول.",
      icon: HardDrive,
    },
  ];

  return (
    <AppLayout title="مسح البيانات">
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              مسح بيانات Cloud / Cache
            </CardTitle>
            <CardDescription>
              اختر ما تريد مسحه لتفريغ المساحة. عملية المسح نهائية ولا يمكن التراجع.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p>المسح لا يحذف منتجاتك من WooCommerce نفسه، فقط البيانات داخل تطبيق تيليوو.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <label
                      key={it.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selected[it.key] ? "border-primary bg-primary/5" : "hover:bg-accent/30"
                      }`}
                    >
                      <Checkbox
                        checked={selected[it.key]}
                        onCheckedChange={(c) => setSelected((s) => ({ ...s, [it.key]: !!c }))}
                        className="mt-0.5"
                      />
                      <Icon className="h-4 w-4 text-primary shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{it.label}</span>
                          {typeof it.count === "number" && (
                            <Badge variant="secondary">{it.count}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={loadCounts} disabled={loading || running}>
                إعادة الحساب
              </Button>
              <Button variant="destructive" onClick={runClear} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Trash2 className="h-4 w-4 ml-2" />}
                تنفيذ المسح
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
