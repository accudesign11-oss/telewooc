import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trash2, 
  Loader2, 
  Package,
  Edit,
  CheckSquare,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DraftProduct {
  id: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  product_images: { id: string; url: string; is_featured: boolean | null }[];
}

interface DraftsListTabProps {
  onEditDraft: (productId: string) => void;
  onRefreshNeeded?: () => void;
}

export function DraftsListTab({ onEditDraft, onRefreshNeeded }: DraftsListTabProps) {
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

      let query = supabase
        .from("draft_products")
        .select(`
          id,
          name,
          price,
          currency,
          status,
          created_at,
          product_images (id, url, is_featured)
        `)
        .eq("user_id", user.id)
        .in("status", ["draft", "inbox", "ai_processing", "ai_processed", "review_ready", "failed"]);

      if (activeProfileId !== "prof_default") {
        query = query.eq("original_data->>profile_id", activeProfileId);
      } else {
        query = query.or(`original_data->>profile_id.eq.prof_default,original_data->>profile_id.is.null`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setDrafts((data || []) as DraftProduct[]);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === drafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(drafts.map(d => d.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete related data first
      await supabase.from("product_images").delete().in("draft_product_id", selectedIds);
      await supabase.from("product_attributes").delete().in("draft_product_id", selectedIds);
      await supabase.from("product_variations").delete().in("draft_product_id", selectedIds);
      
      // Delete drafts
      const { error } = await supabase
        .from("draft_products")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({ title: `تم حذف ${selectedIds.length} مسودة` });
      setSelectedIds([]);
      fetchDrafts();
      onRefreshNeeded?.();
    } catch (error: any) {
      console.error("Error deleting drafts:", error);
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      inbox: "صندوق الوارد",
      draft: "مسودة",
      ai_processing: "معالجة AI",
      ai_processed: "تمت المعالجة",
      review_ready: "جاهز للمراجعة",
      failed: "فشل",
    };
    return labels[status || "draft"] || status;
  };

  const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "ai_processed" || status === "review_ready") return "default";
    if (status === "failed") return "destructive";
    if (status === "draft" || status === "inbox") return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">لا توجد مسودات</h3>
          <p className="text-sm text-muted-foreground">
            قم بإنشاء مسودة جديدة من صندوق الوارد
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
          >
            {selectedIds.length === drafts.length ? (
              <CheckSquare className="h-4 w-4 ml-1" />
            ) : (
              <Square className="h-4 w-4 ml-1" />
            )}
            {selectedIds.length === drafts.length ? "إلغاء التحديد" : "تحديد الكل"}
          </Button>
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              تم تحديد {selectedIds.length} مسودة
            </span>
          )}
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 ml-1" />
            )}
            حذف ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Drafts list */}
      <div className="grid gap-3">
        {drafts.map((draft, index) => (
          <motion.div
            key={draft.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.includes(draft.id)}
                    onCheckedChange={() => toggleSelection(draft.id)}
                  />
                  {draft.product_images && draft.product_images[0] ? (
                    <img
                      src={draft.product_images[0].url}
                      alt={draft.name || ""}
                      className="w-12 h-12 rounded-lg object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const currentSrc = e.currentTarget.src;
                        if (!currentSrc.includes("images.weserv.nl")) {
                          e.currentTarget.src = `https://images.weserv.nl/?url=${encodeURIComponent(draft.product_images[0].url)}&output=webp`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {draft.name || "مسودة بدون اسم"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {draft.price ? `${draft.price} ${draft.currency || "ريال"}` : "—"}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(draft.status)}>
                    {getStatusLabel(draft.status)}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditDraft(draft.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {selectedIds.length} مسودة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 ml-1" />
              )}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
