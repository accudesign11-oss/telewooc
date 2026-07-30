import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  History, Package, Bot, Send, Trash2, Edit, Plus, Loader2, Filter,
  ExternalLink, Undo2, Info, CheckCircle2, AlertCircle, Link2, Upload, CalendarClock, RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/audit";

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  old_values: any;
  new_values: any;
  status: string;
  error_message: string | null;
  resource_url: string | null;
  is_reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  publish: <Send className="h-4 w-4" />,
  schedule: <CalendarClock className="h-4 w-4" />,
  ai_process: <Bot className="h-4 w-4" />,
  connect: <Link2 className="h-4 w-4" />,
  disconnect: <Link2 className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  revert: <RefreshCw className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  publish: "نشر",
  schedule: "جدولة",
  ai_process: "معالجة AI",
  connect: "ربط منصة",
  disconnect: "فصل منصة",
  upload: "رفع صورة",
  revert: "تراجع",
};

const entityLabels: Record<string, string> = {
  draft_product: "منتج",
  woo_product: "منتج المتجر",
  social_post: "منشور",
  telegram_post: "منشور تلقرام",
  template: "قالب",
  setting: "إعداد",
  social_connection: "منصة سوشيال",
  telegram_source: "مصدر تلقرام",
  brand_kit: "براند كِت",
  wp_plugin: "بلاجن ووردبريس",
  image: "صورة",
};

export default function ActivityLogPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [detailsItem, setDetailsItem] = useState<ActivityItem | null>(null);
  const [undoTarget, setUndoTarget] = useState<ActivityItem | null>(null);
  const [undoing, setUndoing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") query = query.eq("action", filter);

      const { data, error } = await query;
      if (error) throw error;
      setActivities((data as any) || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canUndo = (a: ActivityItem) => {
    if (a.is_reverted || a.status === "failed") return false;
    if (a.action !== "update" && a.action !== "create") return false;
    if (!a.old_values || !a.entity_id) return false;
    return ["setting", "social_post", "brand_kit", "draft_product", "wp_plugin"].includes(a.entity_type);
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const { error } = await supabase.from("activity_log").delete().eq("id", id);
      if (error) throw error;
      setActivities(prev => prev.filter(a => a.id !== id));
      toast({ title: "تم حذف السجل" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleClearAllActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("activity_log").delete().eq("user_id", user.id);
      if (error) throw error;
      setActivities([]);
      toast({ title: "تم تفريغ سجل النشاط بالكامل" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const performUndo = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      const tableMap: Record<string, string> = {
        setting: "settings",
        social_post: "social_posts",
        brand_kit: "brand_kits",
        draft_product: "draft_products",
        wp_plugin: "wp_plugins",
      };
      const table = tableMap[undoTarget.entity_type];
      if (!table) throw new Error("نوع العنصر لا يدعم التراجع محلياً");

      const { error } = await (supabase as any).from(table).update(undoTarget.old_values).eq("id", undoTarget.entity_id);
      if (error) throw error;

      await supabase.from("activity_log")
        .update({ is_reverted: true, reverted_at: new Date().toISOString() } as any)
        .eq("id", undoTarget.id);

      await logActivity({
        action: "revert",
        entity_type: undoTarget.entity_type as any,
        entity_id: undoTarget.entity_id,
        metadata: { reverted_activity_id: undoTarget.id },
        old_values: undoTarget.new_values,
        new_values: undoTarget.old_values,
      });

      toast({ title: "تم التراجع بنجاح!", description: "تم استرجاع البيانات والقيم السابقة" });
      setUndoTarget(null);
      fetchActivities();
    } catch (e: any) {
      toast({ title: "فشل التراجع", description: e?.message, variant: "destructive" });
    } finally {
      setUndoing(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "bg-green-500/10 text-green-500";
      case "update": return "bg-blue-500/10 text-blue-500";
      case "delete": return "bg-red-500/10 text-red-500";
      case "publish": return "bg-purple-500/10 text-purple-500";
      case "schedule": return "bg-indigo-500/10 text-indigo-500";
      case "ai_process": return "bg-yellow-500/10 text-yellow-500";
      case "connect": return "bg-emerald-500/10 text-emerald-500";
      case "disconnect": return "bg-rose-500/10 text-rose-500";
      case "upload": return "bg-cyan-500/10 text-cyan-500";
      case "revert": return "bg-orange-500/10 text-orange-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AppLayout title="سجل النشاط">
      <div className="container py-6 space-y-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    سجل النشاط
                  </CardTitle>
                  <CardDescription>سجل كامل بكل عملية داخل التطبيق مع إمكانية عرض التفاصيل والتراجع</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <Filter className="h-4 w-4 ml-2" />
                      <SelectValue placeholder="فلترة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {Object.entries(actionLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activities.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearAllActivities} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 ml-1" /> مسح السجل
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>لا يوجد نشاط حتى الآن</p>
                  <p className="text-xs mt-1">العمليات ستظهر هنا تلقائياً مع كل تعديل أو نشر أو ربط منصة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.4) }}
                      className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors"
                    >
                      <div className={`p-2 rounded-lg self-start ${getActionColor(activity.action)}`}>
                        {actionIcons[activity.action] || <Package className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{actionLabels[activity.action] || activity.action}</Badge>
                          <span className="text-sm font-semibold">{entityLabels[activity.entity_type] || activity.entity_type}</span>
                          {activity.metadata?.name && (
                            <span className="text-sm font-medium truncate max-w-[200px]">"{activity.metadata.name}"</span>
                          )}
                          {activity.status === "failed" ? (
                            <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />فشل</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" />نجاح</Badge>
                          )}
                          {activity.is_reverted && <Badge variant="outline" className="gap-1"><Undo2 className="h-3 w-3" />تم التراجع</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(activity.created_at), "PPpp", { locale: ar })}</p>
                        {activity.error_message && <p className="text-xs text-destructive mt-1 truncate">⚠ {activity.error_message}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1 sm:flex-nowrap">
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setDetailsItem(activity)}>
                          <Info className="h-4 w-4" /><span className="mr-1 text-xs">تفاصيل</span>
                        </Button>
                        {activity.resource_url && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                            <a href={activity.resource_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" /><span className="mr-1 text-xs">فتح</span>
                            </a>
                          </Button>
                        )}
                        {canUndo(activity) && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-orange-600 hover:text-orange-700" onClick={() => setUndoTarget(activity)}>
                            <Undo2 className="h-4 w-4" /><span className="mr-1 text-xs">تراجع</span>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteActivity(activity.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={!!detailsItem} onOpenChange={(o) => !o && setDetailsItem(null)}>
        <DialogContent className="w-[95vw] max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل النشاط</DialogTitle>
            <DialogDescription>{detailsItem && format(new Date(detailsItem.created_at), "PPpp", { locale: ar })}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 text-sm">
              <div><b>العملية:</b> {detailsItem && (actionLabels[detailsItem.action] || detailsItem.action)}</div>
              <div><b>النوع:</b> {detailsItem && (entityLabels[detailsItem.entity_type] || detailsItem.entity_type)}</div>
              <div><b>المعرف:</b> <code className="text-xs" dir="ltr">{detailsItem?.entity_id || "-"}</code></div>
              <div><b>الحالة:</b> {detailsItem?.status === "failed" ? "فشل" : "نجاح"}</div>
              {detailsItem?.error_message && <div className="text-destructive"><b>خطأ:</b> {detailsItem.error_message}</div>}
              {detailsItem?.resource_url && (
                <div><b>الرابط:</b> <a href={detailsItem.resource_url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all" dir="ltr">{detailsItem.resource_url}</a></div>
              )}
              {detailsItem?.old_values && (
                <div><b>القيم القديمة:</b><pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto" dir="ltr">{JSON.stringify(detailsItem.old_values, null, 2)}</pre></div>
              )}
              {detailsItem?.new_values && (
                <div><b>القيم الجديدة:</b><pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto" dir="ltr">{JSON.stringify(detailsItem.new_values, null, 2)}</pre></div>
              )}
              {detailsItem?.metadata && Object.keys(detailsItem.metadata || {}).length > 0 && (
                <div><b>بيانات إضافية:</b><pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto" dir="ltr">{JSON.stringify(detailsItem.metadata, null, 2)}</pre></div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!undoTarget} onOpenChange={(o) => !o && setUndoTarget(null)}>
        <DialogContent className="w-[95vw] max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5" />تأكيد التراجع</DialogTitle>
            <DialogDescription>
              سيتم استرجاع القيم السابقة لهذا العنصر داخل قاعدة البيانات. هذا التراجع محلي فقط ولا يعيد النشر/الحذف من منصات خارجية إذا كانت قد تأثرت بالفعل.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[40vh] overflow-y-auto text-xs bg-muted p-2 rounded">
            <b>سيتم استرجاع:</b>
            <pre dir="ltr">{undoTarget && JSON.stringify(undoTarget.old_values, null, 2)}</pre>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUndoTarget(null)} disabled={undoing}>إلغاء</Button>
            <Button onClick={performUndo} disabled={undoing} className="bg-orange-600 hover:bg-orange-700 text-white">
              {undoing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Undo2 className="h-4 w-4 ml-2" />}
              تأكيد التراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}