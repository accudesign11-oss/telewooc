import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type TelegramPost = Tables<"telegram_posts"> & {
  telegram_media: Tables<"telegram_media">[];
};

export function useTelegramPosts() {
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("telegram_posts")
        .select(`
          *,
          telegram_media (*)
        `)
        .eq("user_id", user.id)
        .eq("is_processed", false)
        .order("date", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب المنشورات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncPosts = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!user || !session) throw new Error("Not authenticated");

      // Get user's telegram source
      const { data: sources } = await supabase
        .from("telegram_sources")
        .select("id, bot_token_encrypted, updated_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sources) {
        toast({
          title: "تنبيه",
          description: "يرجى إعداد Telegram أولاً من الإعدادات",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("telegram-sync", {
        body: { source_id: sources.id },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.details || response.data.error);

      toast({
        title: response.data.imported_count > 0 ? "تمت المزامنة" : "تم الفحص",
        description: `تم فحص ${response.data.checked_updates || 0} تحديث واستيراد ${response.data.imported_count || 0} منشور جديد`,
      });

      await fetchPosts();
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "خطأ في المزامنة",
        description: error.message || "فشل في مزامنة المنشورات",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const markAsProcessed = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("telegram_posts")
        .update({ is_processed: true })
        .eq("id", postId);

      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Error marking post:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    isLoading,
    isSyncing,
    syncPosts,
    markAsProcessed,
    refetch: fetchPosts,
  };
}
