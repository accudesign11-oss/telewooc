import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type DraftProduct = Tables<"draft_products">;
type ProductImage = Tables<"product_images">;
type ProductAttribute = Tables<"product_attributes">;

interface DraftProductWithRelations extends DraftProduct {
  product_images: ProductImage[];
  product_attributes: ProductAttribute[];
}

export function useDraftProduct(productId?: string) {
  const [product, setProduct] = useState<DraftProductWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchProduct = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("draft_products")
        .select(`
          *,
          product_images (*),
          product_attributes (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDraftFromPost = async (
    postId: string | null,
    postText: string,
    selectedImages: string[]
  ): Promise<string | null> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract basic info from post text
      const priceMatch = postText.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:ريال|SAR|درهم|AED|\$|USD)/i);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : null;

      // Get active profile ID
      const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

      // Create draft product
      const { data: draft, error: draftError } = await supabase
        .from("draft_products")
        .insert({
          user_id: user.id,
          telegram_post_id: postId || undefined,
          name: postText.split("\n")[0].slice(0, 100),
          long_description: postText,
          short_description: postText.slice(0, 200),
          price,
          currency: "SAR",
          status: "draft",
          original_data: { post_text: postText, source: postId ? "telegram" : "manual", profile_id: activeProfileId },
        })
        .select()
        .single();

      if (draftError) throw draftError;

      // Add images
      if (selectedImages.length > 0) {
        const imageInserts = selectedImages.map((url, index) => ({
          draft_product_id: draft.id,
          url,
          is_featured: index === 0,
          sort_order: index,
          source: postId ? "telegram" : "manual",
        }));

        await supabase.from("product_images").insert(imageInserts);
      }

      // Mark telegram post as processed (only if from telegram)
      if (postId) {
        await supabase
          .from("telegram_posts")
          .update({ is_processed: true })
          .eq("id", postId);
      }

      toast({
        title: "تم إنشاء المسودة",
        description: "يمكنك الآن تعديل بيانات المنتج",
      });

      return draft.id;
    } catch (error: any) {
      console.error("Error creating draft:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المسودة",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = async (updates: TablesUpdate<"draft_products">) => {
    if (!product) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("draft_products")
        .update(updates)
        .eq("id", product.id);

      if (error) throw error;

      setProduct((prev) => prev ? { ...prev, ...updates } : null);
      toast({ title: "تم الحفظ" });
    } catch (error: any) {
      console.error("Error updating draft:", error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateAttributes = async (attributes: { name: string; values: string[]; is_variation?: boolean }[]) => {
    if (!product) return;
    try {
      // Delete existing
      await supabase
        .from("product_attributes")
        .delete()
        .eq("draft_product_id", product.id);

      // Insert new
      if (attributes.length > 0) {
        const inserts = attributes.map((attr) => ({
          draft_product_id: product.id,
          name: attr.name,
          values: attr.values,
          is_variation: attr.is_variation ?? false,
        }));

        await supabase.from("product_attributes").insert(inserts);
      }

      await fetchProduct(product.id);
    } catch (error) {
      console.error("Error updating attributes:", error);
    }
  };

  const deleteDraft = async (id: string): Promise<boolean> => {
    try {
      // Delete related data first
      await supabase.from("product_images").delete().eq("draft_product_id", id);
      await supabase.from("product_attributes").delete().eq("draft_product_id", id);
      await supabase.from("product_variations").delete().eq("draft_product_id", id);
      
      // Delete the draft product
      const { error } = await supabase.from("draft_products").delete().eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "تم حذف المسودة" });
      return true;
    } catch (error: any) {
      console.error("Error deleting draft:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف المسودة",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  return {
    product,
    isLoading,
    isSaving,
    createDraftFromPost,
    updateDraft,
    updateAttributes,
    deleteDraft,
    refetch: () => productId && fetchProduct(productId),
  };
}
