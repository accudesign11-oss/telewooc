import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderTree, RefreshCw, Plus, Loader2, ChevronRight, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  wc_id: number;
  name: string;
  slug: string | null;
  parent_id: number | null;
  synced_at: string;
}

export default function CategoriesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "" });
  const [editCategory, setEditCategory] = useState({ name: "", slug: "" });
  const [hasWooSettings, setHasWooSettings] = useState<boolean | null>(null);

  useEffect(() => {
    checkWooSettings();
    fetchCategories();
  }, []);

  // Check if WooCommerce is configured via Edge Function (no credentials exposed)
  const checkWooSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-categories", {
        body: { action: "check" },
      });

      if (error) {
        console.error("Error checking WooCommerce settings:", error);
        setHasWooSettings(false);
        return;
      }

      setHasWooSettings(data?.configured === true);
    } catch (error) {
      console.error("Error checking WooCommerce settings:", error);
      setHasWooSettings(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wc_categories_cache")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // All WooCommerce API calls now go through Edge Function
  const syncCategories = async () => {
    if (!hasWooSettings) {
      toast.error("يرجى إعداد WooCommerce أولاً من الإعدادات");
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-categories", {
        body: { action: "sync" },
      });

      if (error) {
        console.error("Sync error:", error);
        throw new Error(error.message || "فشل في المزامنة");
      }

      if (data?.code === "WC_NOT_CONFIGURED") {
        toast.error(data.error || "يرجى إعداد WooCommerce أولاً");
        setHasWooSettings(false);
        return;
      }

      if (!data?.success) {
        throw new Error(data?.error || "فشل في المزامنة");
      }

      toast.success(`تم مزامنة ${data.count} تصنيف`);
      fetchCategories();
    } catch (error) {
      console.error("Error syncing categories:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء المزامنة");
    } finally {
      setIsSyncing(false);
    }
  };

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("يرجى إدخال اسم التصنيف");
      return;
    }

    if (!hasWooSettings) {
      toast.error("يرجى إعداد WooCommerce أولاً");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-categories", {
        body: {
          action: "create",
          category_data: {
            name: newCategory.name,
            slug: newCategory.slug || undefined,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "فشل في إنشاء التصنيف");
      }

      if (!data?.success) {
        throw new Error(data?.error || "فشل في إنشاء التصنيف");
      }

      toast.success("تم إنشاء التصنيف بنجاح");
      setIsDialogOpen(false);
      setNewCategory({ name: "", slug: "" });
      syncCategories();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الإنشاء");
    } finally {
      setIsCreating(false);
    }
  };

  const updateCategory = async () => {
    if (!selectedCategory || !editCategory.name.trim()) {
      toast.error("يرجى إدخال اسم التصنيف");
      return;
    }

    if (!hasWooSettings) {
      toast.error("يرجى إعداد WooCommerce أولاً");
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-categories", {
        body: {
          action: "update",
          category_id: selectedCategory.wc_id,
          category_data: {
            name: editCategory.name,
            slug: editCategory.slug || undefined,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "فشل في تحديث التصنيف");
      }

      if (!data?.success) {
        throw new Error(data?.error || "فشل في تحديث التصنيف");
      }

      toast.success("تم تحديث التصنيف بنجاح");
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      syncCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء التحديث");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCategory = async () => {
    if (!selectedCategory) return;

    if (!hasWooSettings) {
      toast.error("يرجى إعداد WooCommerce أولاً");
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-categories", {
        body: {
          action: "delete",
          category_id: selectedCategory.wc_id,
        },
      });

      if (error) {
        throw new Error(error.message || "فشل في حذف التصنيف");
      }

      if (!data?.success) {
        throw new Error(data?.error || "فشل في حذف التصنيف");
      }

      toast.success("تم حذف التصنيف بنجاح");
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
      syncCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setEditCategory({ name: category.name, slug: category.slug || "" });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  // تجميع التصنيفات حسب الأب
  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  if (isLoading || hasWooSettings === null) {
    return (
      <AppLayout title="التصنيفات">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="التصنيفات">
      <div className="container py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {!hasWooSettings && (
            <Card className="mb-4 border-warning bg-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">لم يتم إعداد WooCommerce</p>
                  <p className="text-sm text-muted-foreground">
                    يرجى الذهاب إلى <a href="/settings" className="text-primary underline">الإعدادات</a> وإدخال بيانات المتجر
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderTree className="h-5 w-5" />
                    تصنيفات المتجر
                  </CardTitle>
                  <CardDescription>إدارة تصنيفات المنتجات - مرتبطة مباشرة بمتجر WooCommerce</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={syncCategories}
                    disabled={isSyncing || !hasWooSettings}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 ml-2" />
                    )}
                    مزامنة
                  </Button>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={!hasWooSettings}>
                        <Plus className="h-4 w-4 ml-2" />
                        تصنيف جديد
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إنشاء تصنيف جديد</DialogTitle>
                        <DialogDescription>
                          سيتم إنشاء التصنيف في متجر WooCommerce
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="cat_name">اسم التصنيف *</Label>
                          <Input
                            id="cat_name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="مثال: ملابس رجالية"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cat_slug">الاسم اللطيف (Slug)</Label>
                          <Input
                            id="cat_slug"
                            value={newCategory.slug}
                            onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                            placeholder="men-clothing"
                            dir="ltr"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={createCategory}
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : null}
                          إنشاء
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>لا توجد تصنيفات</p>
                  <p className="text-sm">اضغط على "مزامنة" لجلب التصنيفات من المتجر</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rootCategories.map((category) => (
                    <CategoryItem
                      key={category.id}
                      category={category}
                      getChildren={getChildren}
                      level={0}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل التصنيف</DialogTitle>
              <DialogDescription>
                سيتم تحديث التصنيف في متجر WooCommerce
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_cat_name">اسم التصنيف *</Label>
                <Input
                  id="edit_cat_name"
                  value={editCategory.name}
                  onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_cat_slug">الاسم اللطيف (Slug)</Label>
                <Input
                  id="edit_cat_slug"
                  value={editCategory.slug}
                  onChange={(e) => setEditCategory({ ...editCategory, slug: e.target.value })}
                  dir="ltr"
                />
              </div>
              <Button
                className="w-full"
                onClick={updateCategory}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                تحديث
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف التصنيف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف التصنيف "{selectedCategory?.name}"؟
                <br />
                سيتم حذفه نهائياً من متجر WooCommerce.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

function CategoryItem({
  category,
  getChildren,
  level,
  onEdit,
  onDelete,
}: {
  category: Category;
  getChildren: (parentId: number) => Category[];
  level: number;
  onEdit: (category: Category, e: React.MouseEvent) => void;
  onDelete: (category: Category, e: React.MouseEvent) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const children = getChildren(category.wc_id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors group`}
        style={{ paddingRight: `${level * 24 + 12}px` }}
      >
        <div 
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          {hasChildren ? (
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          ) : (
            <div className="w-4" />
          )}
          <FolderTree className="h-4 w-4 text-primary" />
          <span className="font-medium">{category.name}</span>
          {category.slug && (
            <span className="text-xs text-muted-foreground" dir="ltr">
              /{category.slug}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => onEdit(category, e)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => onDelete(category, e)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {hasChildren && isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          {children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              getChildren={getChildren}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
