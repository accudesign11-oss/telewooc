import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useWooCommerce() {
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const publishProduct = async (
    productId: string,
    asDraft: boolean = false
  ): Promise<{ success: boolean; permalink?: string }> => {
    setIsPublishing(true);
    try {
      const response = await supabase.functions.invoke("woocommerce-publish", {
        body: {
          draft_product_id: productId,
          publish_status: asDraft ? "draft" : "publish", // Send proper status
        },
      });

      if (response.error) {
        // Handle specific errors
        if (response.error.message?.includes("WooCommerce not configured")) {
          toast({
            title: "تنبيه",
            description: "يرجى إعداد WooCommerce أولاً من الإعدادات",
            variant: "destructive",
          });
          return { success: false };
        }
        throw response.error;
      }

      toast({
        title: "تم النشر بنجاح!",
        description: "تم نشر المنتج إلى متجر WooCommerce",
      });

      return {
        success: true,
        permalink: response.data?.permalink,
      };
    } catch (error: any) {
      console.error("Publish error:", error);
      toast({
        title: "خطأ في النشر",
        description: error.message || "فشل في نشر المنتج",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    isPublishing,
    publishProduct,
  };
}
