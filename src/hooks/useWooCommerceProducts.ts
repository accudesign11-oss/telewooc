import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/audit";

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  status: string;
  type: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  date_created: string;
  date_modified: string;
}

export function useWooCommerceProducts() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchProducts = useCallback(async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-products", {
        body: {
          action: "list",
          product_data: { page, per_page: 50, search },
        },
      });

      // If the function responds with non-2xx, Supabase returns `error`
      if (error) {
        const msg = (error as any)?.message || "";
        // Don't spam errors for missing WooCommerce settings
        if (!msg.includes("non-2xx")) {
          toast({
            title: "خطأ",
            description: msg || "فشل في جلب منتجات المتجر",
            variant: "destructive",
          });
        }
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      // Function-level signal for missing settings (returned as 200)
      if (data?.code === "WC_NOT_CONFIGURED" || data?.error?.includes("not configured")) {
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      if (data?.error) throw new Error(data.error);

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error: any) {
      const msg = error?.message || "";
      // Avoid triggering 'Try to Fix' for expected config state
      if (!msg.includes("not configured") && !msg.includes("non-2xx")) {
        console.warn("Error fetching WC products:", error);
        toast({
          title: "خطأ",
          description: msg || "فشل في جلب منتجات المتجر",
          variant: "destructive",
        });
      }
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateProduct = useCallback(async (productId: number, productData: Partial<WooProduct>) => {
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-products", {
        body: {
          action: "update",
          product_id: productId,
          product_data: productData,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "تم التحديث",
        description: "تم تحديث المنتج بنجاح",
      });

      return data.product;
    } catch (error: any) {
      console.warn("Error updating product:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث المنتج",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const deleteProducts = useCallback(async (productIds: number[]) => {
    try {
      // Snapshot old values before delete so undo can restore metadata
      const snapshots = products.filter(p => productIds.includes(p.id)).map(p => ({
        id: p.id, name: p.name, sku: p.sku, price: p.price, permalink: p.permalink,
      }));
      const { data, error } = await supabase.functions.invoke("woocommerce-products", {
        body: {
          action: "delete",
          product_ids: productIds,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "تم الحذف",
        description: `تم حذف ${productIds.length} منتج`,
      });

      for (const snap of snapshots) {
        await logActivity({
          action: "delete",
          entity_type: "woo_product",
          entity_id: String(snap.id),
          metadata: { name: snap.name, ids: productIds },
          old_values: snap,
          resource_url: snap.permalink || null,
        });
      }

      return true;
    } catch (error: any) {
      console.warn("Error deleting products:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف المنتجات",
        variant: "destructive",
      });
      await logActivity({
        action: "delete",
        entity_type: "woo_product",
        metadata: { ids: productIds },
        status: "failed",
        error_message: error?.message,
      });
      return false;
    }
  }, [toast, products]);

  return {
    products,
    isLoading,
    total,
    totalPages,
    fetchProducts,
    updateProduct,
    deleteProducts,
  };
}
