import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Plus, 
  Edit, 
  ExternalLink, 
  Loader2, 
  Package, 
  Trash2,
  RefreshCw,
  Store,
  Inbox,
  Pencil,
  Star,
  Wand2,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductEditorDialog } from "@/components/ProductEditorDialog";
import { WooProductEditorDialog } from "@/components/WooProductEditorDialog";
import { ProductFiltersSheet } from "@/components/ProductFiltersSheet";
import { ReviewsManager } from "@/components/ReviewsManager";
import { RepublishDescriptionDialog } from "@/components/RepublishDescriptionDialog";
import { ProductToSocialDialog } from "@/components/ProductToSocialDialog";
import { useWooCommerceProducts, WooProduct } from "@/hooks/useWooCommerceProducts";
import { useProductFilters } from "@/hooks/useProductFilters";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductImage {
  id: string;
  url: string;
  is_featured: boolean | null;
}

interface ProductWithRelations {
  id: string;
  name: string | null;
  short_description: string | null;
  long_description: string | null;
  price: number | null;
  sale_price?: number | null;
  currency: string | null;
  sku: string | null;
  product_type: string | null;
  status: string | null;
  created_at: string;
  product_images: ProductImage[];
  wc_mappings: { wc_permalink: string | null; wc_product_id: number | null }[];
}

export default function ProductsPage() {
  const [localProducts, setLocalProducts] = useState<ProductWithRelations[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocalProduct, setSelectedLocalProduct] = useState<ProductWithRelations | null>(null);
  const [localEditorOpen, setLocalEditorOpen] = useState(false);
  const [selectedWooProduct, setSelectedWooProduct] = useState<WooProduct | null>(null);
  const [wooEditorOpen, setWooEditorOpen] = useState(false);
  const [selectedLocalIds, setSelectedLocalIds] = useState<string[]>([]);
  const [selectedWooIds, setSelectedWooIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ price: "", status: "", currency: "" });
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const [hasFetchedWoo, setHasFetchedWoo] = useState(false);
  const [reviewsTarget, setReviewsTarget] = useState<{ draftId?: string; wcId?: number; name: string; desc?: string } | null>(null);
  const [republishTarget, setRepublishTarget] = useState<{ draftId?: string; wcId?: number; name: string; desc: string; images?: string[] } | null>(null);
  const [socialTarget, setSocialTarget] = useState<any | null>(null);
  const { toast } = useToast();
  const { filters, updateFilter, resetFilters, hasActiveFilters } = useProductFilters();

  const {
    products: wooProducts,
    isLoading: isLoadingWoo,
    fetchProducts: fetchWooProducts,
    updateProduct: updateWooProduct,
    deleteProducts: deleteWooProducts,
  } = useWooCommerceProducts();

  const fetchLocalProducts = async () => {
    setIsLoadingLocal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("draft_products")
        .select(`
          id,
          name,
          short_description,
          long_description,
          price,
          sale_price,
          currency,
          sku,
          product_type,
          status,
          created_at,
          product_images (id, url, is_featured),
          wc_mappings (wc_permalink, wc_product_id)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocalProducts((data || []) as unknown as ProductWithRelations[]);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchLocalProducts();
  }, []);

  useEffect(() => {
    if (activeTab !== "woo") return;
    if (hasFetchedWoo) return;
    setHasFetchedWoo(true);
    fetchWooProducts();
  }, [activeTab, hasFetchedWoo, fetchWooProducts]);

  const handleEditLocalProduct = (product: ProductWithRelations) => {
    setSelectedLocalProduct(product);
    setLocalEditorOpen(true);
  };

  const handleEditWooProduct = (product: WooProduct) => {
    setSelectedWooProduct(product);
    setWooEditorOpen(true);
  };

  const toggleLocalSelection = (id: string) => {
    setSelectedLocalIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleWooSelection = (id: number) => {
    setSelectedWooIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllLocal = () => {
    if (selectedLocalIds.length === filteredLocalProducts.length) {
      setSelectedLocalIds([]);
    } else {
      setSelectedLocalIds(filteredLocalProducts.map(p => p.id));
    }
  };

  const selectAllWoo = () => {
    if (selectedWooIds.length === filteredWooProducts.length) {
      setSelectedWooIds([]);
    } else {
      setSelectedWooIds(filteredWooProducts.map(p => p.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (activeTab === "local" && selectedLocalIds.length > 0) {
      try {
        const { error } = await supabase
          .from("draft_products")
          .delete()
          .in("id", selectedLocalIds);
        
        if (error) throw error;
        toast({ title: `تم حذف ${selectedLocalIds.length} منتج` });
        setSelectedLocalIds([]);
        fetchLocalProducts();
      } catch (error: any) {
        toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
      }
    } else if (activeTab === "woo" && selectedWooIds.length > 0) {
      const success = await deleteWooProducts(selectedWooIds);
      if (success) {
        setSelectedWooIds([]);
        fetchWooProducts();
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleBulkEdit = async () => {
    if (activeTab === "local" && selectedLocalIds.length > 0) {
      setIsBulkUpdating(true);
      try {
        const updates: any = {};
        if (bulkEditData.price) updates.price = parseFloat(bulkEditData.price);
        if (bulkEditData.status) updates.status = bulkEditData.status;
        if (bulkEditData.currency) updates.currency = bulkEditData.currency;

        if (Object.keys(updates).length === 0) {
          toast({ title: "لم يتم تحديد أي تغييرات", variant: "destructive" });
          return;
        }

        const { error } = await supabase
          .from("draft_products")
          .update(updates)
          .in("id", selectedLocalIds);

        if (error) throw error;
        toast({ title: `تم تحديث ${selectedLocalIds.length} منتج` });
        setSelectedLocalIds([]);
        setBulkEditDialogOpen(false);
        setBulkEditData({ price: "", status: "", currency: "" });
        fetchLocalProducts();
      } catch (error: any) {
        toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
      } finally {
        setIsBulkUpdating(false);
      }
    }
  };

  const filteredLocalProducts = useMemo(() => {
    return localProducts.filter(p => {
      // Search filter
      if (searchQuery && !(p.name || "").toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(p.status || "")) {
        return false;
      }
      // Price filter
      if (filters.priceMin && (p.price === null || p.price < parseFloat(filters.priceMin))) {
        return false;
      }
      if (filters.priceMax && (p.price === null || p.price > parseFloat(filters.priceMax))) {
        return false;
      }
      // Date filter
      if (filters.dateFrom && new Date(p.created_at) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(p.created_at) > new Date(filters.dateTo + "T23:59:59")) {
        return false;
      }
      return true;
    });
  }, [localProducts, searchQuery, filters]);

  const filteredWooProducts = useMemo(() => {
    return wooProducts.filter(p => {
      // Search filter
      if (searchQuery && !(p.name || "").toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(p.status || "")) {
        return false;
      }
      // Price filter
      const price = parseFloat(p.price || "0");
      if (filters.priceMin && price < parseFloat(filters.priceMin)) {
        return false;
      }
      if (filters.priceMax && price > parseFloat(filters.priceMax)) {
        return false;
      }
      // Date filter
      if (filters.dateFrom && new Date(p.date_created) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(p.date_created) > new Date(filters.dateTo + "T23:59:59")) {
        return false;
      }
      return true;
    });
  }, [wooProducts, searchQuery, filters]);

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      inbox: "صندوق الوارد",
      draft: "مسودة",
      ai_processing: "معالجة AI",
      ai_processed: "تمت المعالجة",
      review_ready: "جاهز للمراجعة",
      publishing: "جاري النشر",
      published: "منشور",
      failed: "فشل",
      publish: "منشور",
      pending: "معلق",
      private: "خاص",
    };
    return labels[status || "draft"] || status;
  };

  const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "published" || status === "publish") return "default";
    if (status === "failed") return "destructive";
    if (status === "draft" || status === "inbox") return "secondary";
    return "outline";
  };

  const isLoading = activeTab === "local" ? isLoadingLocal : isLoadingWoo;
  const hasSelection = activeTab === "local" ? selectedLocalIds.length > 0 : selectedWooIds.length > 0;
  const selectionCount = activeTab === "local" ? selectedLocalIds.length : selectedWooIds.length;

  return (
    <AppLayout title="إدارة المنتجات">
      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">
              <Inbox className="h-4 w-4 ml-2" />
              منتجات الأداة ({localProducts.length})
            </TabsTrigger>
            <TabsTrigger value="woo">
              <Store className="h-4 w-4 ml-2" />
              منتجات المتجر ({wooProducts.length})
            </TabsTrigger>
          </TabsList>

          {/* Search & Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث في المنتجات..." 
                className="pr-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ProductFiltersSheet
              filters={filters}
              onUpdateFilter={updateFilter}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters()}
              type={activeTab as "local" | "woo"}
            />
            <Button 
              variant="outline"
              size="icon"
              onClick={() => activeTab === "local" ? fetchLocalProducts() : fetchWooProducts()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {hasSelection && (
              <>
                {activeTab === "local" && (
                  <Button variant="outline" size="sm" onClick={() => setBulkEditDialogOpen(true)}>
                    <Pencil className="h-4 w-4 ml-1" />
                    تعديل جماعي ({selectionCount})
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  حذف ({selectionCount})
                </Button>
              </>
            )}
            <Button size="sm" asChild>
              <a href="/pipeline">
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </a>
            </Button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">الفلاتر:</span>
              {filters.status.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  الحالة: {filters.status.length}
                </Badge>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="text-xs">
                  السعر: {filters.priceMin || "0"} - {filters.priceMax || "∞"}
                </Badge>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="text-xs">
                  التاريخ
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {activeTab === "local" ? filteredLocalProducts.length : filteredWooProducts.length} نتيجة
              </Badge>
            </div>
          )}

          <TabsContent value="local" className="mt-4">
            {isLoadingLocal ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLocalProducts.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">لا توجد منتجات</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ابدأ بإضافة منتج جديد من Pipeline
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <Checkbox 
                    checked={selectedLocalIds.length === filteredLocalProducts.length && filteredLocalProducts.length > 0}
                    onCheckedChange={selectAllLocal}
                  />
                  <span className="text-sm text-muted-foreground">تحديد الكل</span>
                </div>
                <div className="grid gap-3">
                  {filteredLocalProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="card-hover"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Checkbox 
                              checked={selectedLocalIds.includes(product.id)}
                              onCheckedChange={() => toggleLocalSelection(product.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {product.product_images && product.product_images[0] ? (
                              <img 
                                src={product.product_images[0].url} 
                                alt={product.name || ""} 
                                className="w-12 h-12 rounded-lg object-cover shrink-0" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditLocalProduct(product)}>
                              <h3 className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
                                {product.name || "منتج بدون اسم"}
                              </h3>
                              <p className="text-primary font-bold text-xs sm:text-sm">
                                {product.price ? `${product.price} ${product.currency === "SAR" ? "ريال" : product.currency || ""}` : "—"}
                              </p>
                            </div>
                            <Badge variant={getStatusVariant(product.status)} className="shrink-0">
                              {getStatusLabel(product.status)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 justify-end pt-2 border-t border-border/40 sm:border-0 sm:pt-0">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditLocalProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="إدارة الريفيوهات"
                              onClick={() => setReviewsTarget({
                                draftId: product.id,
                                name: product.name || "",
                                desc: product.short_description || product.long_description || "",
                              })}
                            >
                              <Star className="h-4 w-4 text-yellow-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="إعادة التوليد والوصف"
                              onClick={() => setRepublishTarget({
                                draftId: product.id,
                                name: product.name || "",
                                desc: product.short_description || product.long_description || "",
                                images: (product.product_images || []).map((i: any) => i.url),
                              })}
                            >
                              <Wand2 className="h-4 w-4 text-purple-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="نشر للسوشيال ميديا"
                              onClick={() => setSocialTarget({
                                draftId: product.id,
                                name: product.name || "",
                                shortDesc: product.short_description || "",
                                longDesc: product.long_description || "",
                                images: (product.product_images || []).map((i: any) => i.url),
                                permalink: product.wc_mappings?.[0]?.wc_permalink || undefined,
                              })}
                            >
                              <Share2 className="h-4 w-4 text-blue-500" />
                            </Button>
                            {product.wc_mappings?.[0]?.wc_permalink && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                <a href={product.wc_mappings[0].wc_permalink} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="woo" className="mt-4">
            {isLoadingWoo ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredWooProducts.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">لا توجد منتجات في المتجر</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    تأكد من إعداد WooCommerce في الإعدادات
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <Checkbox 
                    checked={selectedWooIds.length === filteredWooProducts.length && filteredWooProducts.length > 0}
                    onCheckedChange={selectAllWoo}
                  />
                  <span className="text-sm text-muted-foreground">تحديد الكل</span>
                </div>
                <div className="grid gap-3">
                  {filteredWooProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="card-hover"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Checkbox 
                              checked={selectedWooIds.includes(product.id)}
                              onCheckedChange={() => toggleWooSelection(product.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {product.images?.[0] ? (
                              <img 
                                src={product.images[0].src} 
                                alt={product.name || ""} 
                                className="w-12 h-12 rounded-lg object-cover shrink-0" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditWooProduct(product)}>
                              <h3 className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
                                {product.name || "منتج بدون اسم"}
                              </h3>
                              <p className="text-primary font-bold text-xs sm:text-sm">
                                {product.price || "—"}
                              </p>
                            </div>
                            <Badge variant={getStatusVariant(product.status)} className="shrink-0">
                              {getStatusLabel(product.status)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 justify-end pt-2 border-t border-border/40 sm:border-0 sm:pt-0">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditWooProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="إدارة الريفيوهات"
                              onClick={() => setReviewsTarget({
                                wcId: product.id,
                                name: product.name || "",
                                desc: (product as any).short_description || (product as any).description || "",
                              })}
                            >
                              <Star className="h-4 w-4 text-yellow-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="تحسين الوصف وإعادة النشر"
                              onClick={() => setRepublishTarget({
                                wcId: product.id,
                                name: product.name || "",
                                desc: (product as any).description || (product as any).short_description || "",
                                images: ((product as any).images || []).map((i: any) => i.src).filter(Boolean),
                              })}
                            >
                              <Wand2 className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="نشر على السوشيال"
                              onClick={() => setSocialTarget({
                                id: product.id,
                                name: product.name,
                                short_description: (product as any).short_description,
                                description: (product as any).description,
                                price: product.price,
                                permalink: product.permalink,
                                images: ((product as any).images || []).map((i: any) => i.src).filter(Boolean),
                              })}
                            >
                              <Share2 className="h-4 w-4 text-primary" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              asChild
                            >
                              <a href={product.permalink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Local Product Editor */}
      <ProductEditorDialog
        open={localEditorOpen}
        onOpenChange={setLocalEditorOpen}
        product={selectedLocalProduct}
        onSave={fetchLocalProducts}
      />

      {/* WooCommerce Product Editor */}
      <WooProductEditorDialog
        open={wooEditorOpen}
        onOpenChange={setWooEditorOpen}
        product={selectedWooProduct}
        onSave={async (id, data) => {
          const result = await updateWooProduct(id, data);
          if (result) fetchWooProducts();
          return result;
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {selectionCount} منتج؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل جماعي ({selectedLocalIds.length} منتج)</DialogTitle>
            <DialogDescription>
              التغييرات ستطبق على جميع المنتجات المحددة. اترك الحقول فارغة لعدم تغييرها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_price">السعر</Label>
              <Input
                id="bulk_price"
                type="number"
                value={bulkEditData.price}
                onChange={(e) => setBulkEditData({ ...bulkEditData, price: e.target.value })}
                placeholder="اترك فارغاً لعدم التغيير"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_currency">العملة</Label>
              <Select
                value={bulkEditData.currency}
                onValueChange={(value) => setBulkEditData({ ...bulkEditData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                  <SelectItem value="USD">دولار (USD)</SelectItem>
                  <SelectItem value="TRY">ليرة تركية (TRY)</SelectItem>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_status">الحالة</Label>
              <Select
                value={bulkEditData.status}
                onValueChange={(value) => setBulkEditData({ ...bulkEditData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="review_ready">جاهز للمراجعة</SelectItem>
                  <SelectItem value="inbox">صندوق الوارد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleBulkEdit}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              تطبيق التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews Manager Dialog */}
      <Dialog open={!!reviewsTarget} onOpenChange={(o) => !o && setReviewsTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة الريفيوهات — {reviewsTarget?.name}</DialogTitle>
            <DialogDescription>
              ولّد ريفيوهات بالذكاء الاصطناعي، عدّلها يدويًا، ثم انشرها مباشرة إلى المتجر.
            </DialogDescription>
          </DialogHeader>
          {reviewsTarget && (
            <ReviewsManager
              draftProductId={reviewsTarget.draftId}
              wcProductId={reviewsTarget.wcId}
              productName={reviewsTarget.name}
              productDescription={reviewsTarget.desc}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Republish Description Dialog */}
      <RepublishDescriptionDialog
        open={!!republishTarget}
        onOpenChange={(o) => !o && setRepublishTarget(null)}
        productName={republishTarget?.name || ""}
        baseDescription={republishTarget?.desc || ""}
        images={republishTarget?.images || []}
        wcProductId={republishTarget?.wcId}
        draftProductId={republishTarget?.draftId}
        onPublished={() => {
          fetchLocalProducts();
          if (activeTab === "woo") fetchWooProducts();
        }}
      />

      {/* Product → Social publisher */}
      <ProductToSocialDialog
        open={!!socialTarget}
        product={socialTarget}
        onOpenChange={(o) => !o && setSocialTarget(null)}
      />
    </AppLayout>
  );
}
