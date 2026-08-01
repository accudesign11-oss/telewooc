import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RATE_LIMIT_COOLDOWN_MS = 60_000;

interface AIProductResult {
  name: string;
  short_description: string;
  long_description: string;
  price: number | null;
  tags: string[];
  attributes: {
    name: string;
    values: string[];
    is_variation: boolean;
  }[];
  provider?: string;
  model?: string;
}

export function useAIProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<{ provider: string; model: string } | null>(null);
  const { toast } = useToast();
  const rateLimitUntilRef = useRef<number>(0);

  const getCooldownSeconds = () =>
    Math.max(0, Math.ceil((rateLimitUntilRef.current - Date.now()) / 1000));

  const guardRateLimit = () => {
    const s = getCooldownSeconds();
    if (s <= 0) return false;

    toast({
      title: "تم تجاوز الحد",
      description: `يرجى الانتظار ${s} ثانية ثم المحاولة مجدداً`,
      variant: "destructive",
    });
    return true;
  };

  const activateCooldown = () => {
    rateLimitUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  };

  const formatModelName = (provider: string, model: string): string => {
    const providerNames: Record<string, string> = {
      gemini: "Google Gemini",
      openrouter: "OpenRouter",
      huggingface: "Hugging Face",
    };
    
    // Extract clean model name
    let cleanModel = model;
    if (model.includes("/")) {
      cleanModel = model.split("/").pop() || model;
    }
    if (cleanModel.includes(":")) {
      cleanModel = cleanModel.split(":")[0];
    }
    // Capitalize first letter of each word
    cleanModel = cleanModel.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    const providerName = providerNames[provider] || provider;
    return `${providerName} (${cleanModel})`;
  };

  const processFullProduct = async (originalText: string, draftProductId?: string): Promise<AIProductResult | null> => {
    if (guardRateLimit()) return null;

    setIsProcessing(true);
    setCurrentModel(null);
    try {
      const response = await supabase.functions.invoke("ai-process", {
        body: {
          draft_product_id: draftProductId,
          original_text: originalText,
          mode: "full",
        },
      });

      console.log("AI response:", response);

      // Check for HTTP errors
      if (response.error) {
        const errorMessage = response.error.message || JSON.stringify(response.error);
        console.error("AI function error:", response.error);
        
        toast({
          title: "خطأ في الاتصال",
          description: errorMessage.substring(0, 100),
          variant: "destructive",
        });
        return null;
      }

      // Check if data contains error (from edge function response)
      if (response.data?.error || response.data?.success === false) {
        const errorMsg = response.data.error || "فشل في المعالجة";
        const hint = response.data.hint || "";
        const status = response.data.status;
        console.error("AI data error:", errorMsg, "status:", status, "hint:", hint);
        
        // Only activate cooldown for ACTUAL rate limiting (status 429 from the provider)
        if (status === 429) {
          activateCooldown();
          toast({
            title: "تم تجاوز حد الطلبات",
            description: hint || "يرجى الانتظار دقيقة ثم المحاولة مجدداً",
            variant: "destructive",
          });
          return null;
        }
        
        if (status === 402) {
          toast({
            title: "يرجى إضافة رصيد",
            description: hint || "للاستمرار في استخدام الذكاء الاصطناعي",
            variant: "destructive",
          });
          return null;
        }
        
        // For other errors (404, 500, etc.) show the actual error without cooldown
        toast({
          title: "خطأ في المعالجة",
          description: hint || errorMsg.substring(0, 100),
          variant: "destructive",
        });
        return null;
      }

      const result = response.data?.result;
      const usedProvider = response.data?.provider || "unknown";
      const usedModel = response.data?.model || "unknown";
      
      // Update current model for display
      setCurrentModel({ provider: usedProvider, model: usedModel });
      
      if (result?.error) {
        console.error("AI parsing error:", result.error, result.raw);
        toast({
          title: "خطأ في المعالجة",
          description: "لم نتمكن من تحليل الرد، حاول مجدداً",
          variant: "destructive",
        });
        return null;
      }

      // Format model name for display
      const displayModel = formatModelName(usedProvider, usedModel);
      toast({
        title: "تمت المعالجة بنجاح",
        description: `تم التحليل باستخدام ${displayModel}`,
      });

      return {
        name: result.name || "",
        short_description: result.short_description || "",
        long_description: result.long_description || "",
        price: result.price || null,
        tags: result.tags || [],
        attributes: result.attributes || [],
        provider: usedProvider,
        model: usedModel,
      };
    } catch (error: any) {
      console.error("Error processing product:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في المعالجة",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateField = async (
    field: "name" | "short_description" | "long_description",
    originalText: string,
    draftProductId?: string
  ): Promise<string | null> => {
    if (guardRateLimit()) return null;

    setIsRegenerating(field);
    try {
      const response = await supabase.functions.invoke("ai-process", {
        body: {
          draft_product_id: draftProductId,
          original_text: originalText,
          field,
        },
      });

      console.log("AI regenerate response:", response);

      if (response.error) {
        const errorMessage = response.error.message || JSON.stringify(response.error);
        console.error("AI regenerate error:", response.error);

        toast({
          title: "خطأ في الاتصال",
          description: errorMessage.substring(0, 100),
          variant: "destructive",
        });
        return null;
      }

      // Check if data contains error
      if (response.data?.error || response.data?.success === false) {
        const errorMsg = response.data.error || "فشل في إعادة التوليد";
        const hint = response.data.hint || "";
        const status = response.data.status;
        console.error("AI regenerate data error:", errorMsg, "status:", status);
        
        if (status === 429) {
          activateCooldown();
          toast({
            title: "تم تجاوز حد الطلبات",
            description: hint || "يرجى الانتظار دقيقة ثم المحاولة مجدداً",
            variant: "destructive",
          });
          return null;
        }
        
        if (status === 402) {
          toast({
            title: "يرجى إضافة رصيد",
            description: hint || "للاستمرار في استخدام الذكاء الاصطناعي",
            variant: "destructive",
          });
          return null;
        }
        
        toast({
          title: "خطأ",
          description: hint || errorMsg.substring(0, 100),
          variant: "destructive",
        });
        return null;
      }

      return response.data?.result || null;
    } catch (error: any) {
      console.error(`Error regenerating ${field}:`, error);
      toast({
        title: "خطأ",
        description: "فشل في إعادة التوليد",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsRegenerating(null);
    }
  };

  return {
    isProcessing,
    isRegenerating,
    currentModel,
    processFullProduct,
    regenerateField,
    formatModelName,
  };
}
