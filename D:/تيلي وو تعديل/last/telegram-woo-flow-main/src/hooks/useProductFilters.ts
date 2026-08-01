import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ProductFilters {
  status: string[];
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: ProductFilters = {
  status: [],
  priceMin: "",
  priceMax: "",
  dateFrom: "",
  dateTo: "",
};

export function useProductFilters() {
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFilters = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "product_filters")
        .maybeSingle();

      if (data?.value) {
        const savedFilters = data.value as Record<string, any>;
        setFilters({
          status: savedFilters.status || [],
          priceMin: savedFilters.priceMin || "",
          priceMax: savedFilters.priceMax || "",
          dateFrom: savedFilters.dateFrom || "",
          dateTo: savedFilters.dateTo || "",
        });
      }
    } catch (error) {
      console.error("Error loading filters:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveFilters = useCallback(async (newFilters: ProductFilters) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("settings")
        .upsert(
          {
            user_id: user.id,
            key: "product_filters",
            value: newFilters as unknown as Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key" }
        );

      setFilters(newFilters);
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  }, []);

  const updateFilter = useCallback(<K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      // Auto-save on change
      saveFilters(updated);
      return updated;
    });
  }, [saveFilters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    saveFilters(defaultFilters);
  }, [saveFilters]);

  const hasActiveFilters = useCallback(() => {
    return (
      filters.status.length > 0 ||
      filters.priceMin !== "" ||
      filters.priceMax !== "" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== ""
    );
  }, [filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  return {
    filters,
    isLoading,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  };
}
