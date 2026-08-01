import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsageStats {
  totalRequests: number;
  imageGenerations: number;
  textRequests: number;
  todayImageGenerations: number;
  thisMonthTotal: number;
  thisMonthImages: number;
  last7DaysImages: number;
  last30DaysImages: number;
  estimatedCost: number;
  estimatedImageCost: number;
  isLoading: boolean;
  error: string | null;
}

interface DailyUsage {
  date: string;
  count: number;
  cost: number;
}

// Estimated costs per request type (in USD)
const COST_PER_IMAGE_GENERATION = 0.03; // ~$0.03 per image
const COST_PER_TEXT_REQUEST = 0.005; // ~$0.005 per text request

export function useAIUsageStats() {
  const [stats, setStats] = useState<UsageStats>({
    totalRequests: 0,
    imageGenerations: 0,
    textRequests: 0,
    todayImageGenerations: 0,
    thisMonthTotal: 0,
    thisMonthImages: 0,
    last7DaysImages: 0,
    last30DaysImages: 0,
    estimatedCost: 0,
    estimatedImageCost: 0,
    isLoading: true,
    error: null,
  });

  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStats(prev => ({ ...prev, isLoading: false, error: "غير مسجل الدخول" }));
        return;
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all requests for this month
      const { data: requests, error } = await supabase
        .from("ai_requests")
        .select("id, created_at, model, provider, status")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allRequests = requests || [];
      
      // Calculate stats
      const imageGenerations = allRequests.filter(r => 
        r.model?.includes('image') || r.model?.includes('imagen')
      );
      
      const todayRequests = allRequests.filter(r => r.created_at >= todayStart);
      const last7DaysRequests = allRequests.filter(r => r.created_at >= last7Days);
      const last30DaysRequests = allRequests.filter(r => r.created_at >= last30Days);

      const todayImages = todayRequests.filter(r => 
        r.model?.includes('image') || r.model?.includes('imagen')
      );
      const last7DaysImages = last7DaysRequests.filter(r => 
        r.model?.includes('image') || r.model?.includes('imagen')
      );
      const last30DaysImages = last30DaysRequests.filter(r => 
        r.model?.includes('image') || r.model?.includes('imagen')
      );

      const textRequests = allRequests.length - imageGenerations.length;

      const estimatedImageCost = imageGenerations.length * COST_PER_IMAGE_GENERATION;
      const estimatedTextCost = textRequests * COST_PER_TEXT_REQUEST;
      const estimatedCost = estimatedImageCost + estimatedTextCost;

      // Calculate daily usage for chart
      const dailyMap = new Map<string, number>();
      allRequests.forEach(r => {
        const date = r.created_at.split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      });

      const dailyUsageData: DailyUsage[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const count = dailyMap.get(dateStr) || 0;
        dailyUsageData.push({
          date: dateStr,
          count,
          cost: count * COST_PER_IMAGE_GENERATION, // Simplified cost calculation
        });
      }

      setDailyUsage(dailyUsageData);
      setStats({
        totalRequests: allRequests.length,
        imageGenerations: imageGenerations.length,
        textRequests,
        todayImageGenerations: todayImages.length,
        thisMonthTotal: allRequests.length,
        thisMonthImages: imageGenerations.length,
        last7DaysImages: last7DaysImages.length,
        last30DaysImages: last30DaysImages.length,
        estimatedCost,
        estimatedImageCost,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error("Error fetching AI usage stats:", error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "خطأ في جلب الإحصائيات",
      }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...stats,
    dailyUsage,
    refetch: fetchStats,
    COST_PER_IMAGE_GENERATION,
    COST_PER_TEXT_REQUEST,
  };
}
