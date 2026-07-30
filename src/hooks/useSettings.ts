import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/audit";
import type { Json } from "@/integrations/supabase/types";

interface TelegramSettings {
  source_id?: string;
  bot_token: string;
  chat_id: string;
  auto_sync: boolean;
  has_token?: boolean; // Indicates if token is configured (without exposing it)
}

interface WooCommerceSettings {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  currency: "EGP" | "USD" | "AED";
}

interface AISettings {
  provider: "gemini" | "openrouter" | "huggingface";
  gemini_api_key?: string;
  openrouter_api_key?: string;
  openrouter_model?: string;
  huggingface_api_key?: string;
}

interface ImgbbSettings {
  api_key: string;
  require_conversion: boolean; // If false, skip imgbb conversion and use original URLs
  convert_to_webp: boolean; // Convert images to WebP format before upload
}

export function useSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [telegram, setTelegram] = useState<TelegramSettings>({
    bot_token: "",
    chat_id: "",
    auto_sync: true,
    has_token: false,
  });
  const [woocommerce, setWoocommerce] = useState<WooCommerceSettings>({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    currency: "EGP", // Default to Egyptian Pound
  });
  const [ai, setAI] = useState<AISettings>({
    provider: "gemini",
    huggingface_api_key: undefined,
  });
  const [imgbb, setImgbb] = useState<ImgbbSettings>({
    api_key: "",
    require_conversion: true, // Default to requiring conversion
    convert_to_webp: false, // Default to not converting to WebP
  });
  const { toast } = useToast();

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch settings from settings table for active user
      let query = supabase.from("settings").select("key, value");
      if (user) {
        query = query.eq("user_id", user.id);
      }
      let { data: settings } = await query;

      if (settings && settings.length > 0) {
        const storeProfilesRow = settings.find(s => s.key === "store_profiles")?.value as any;
        const activeProfileId = storeProfilesRow?.active_id || localStorage.getItem("telewoo_active_profile_id");
        const activeProfile = Array.isArray(storeProfilesRow?.list)
          ? storeProfilesRow.list.find((p: any) => p.id === activeProfileId || p.is_active)
          : null;

        const isSubProfile = activeProfileId && activeProfileId !== "prof_default";

        // WooCommerce profile isolated loading
        const wooRow = settings.find(s => s.key === "woocommerce")?.value as any;
        const activeWoo = isSubProfile ? (activeProfile?.woocommerce || {}) : (activeProfile?.woocommerce || wooRow || {});

        if (activeWoo.store_url && activeWoo.consumer_key) {
          const wooData: WooCommerceSettings = {
            store_url: activeWoo.store_url || "",
            consumer_key: activeWoo.consumer_key || "",
            consumer_secret: activeWoo.consumer_secret || "",
            currency: activeWoo.currency || "EGP",
          };
          setWoocommerce(wooData);
          localStorage.setItem("telewoo_woocommerce_settings", JSON.stringify(wooData));
        } else {
          setWoocommerce({ store_url: "", consumer_key: "", consumer_secret: "", currency: "EGP" });
          localStorage.removeItem("telewoo_woocommerce_settings");
        }

        // AI Provider Settings profile isolated loading
        const aiRow = settings.find(s => s.key === "ai")?.value as any || {};
        const activeAI = isSubProfile ? (activeProfile?.ai || {}) : (activeProfile?.ai || aiRow);
        const rawProvider = activeAI.provider || "gemini";
        let provider: "gemini" | "openrouter" | "huggingface" = "gemini";
        if (rawProvider === "openrouter") provider = "openrouter";
        else if (rawProvider === "huggingface") provider = "huggingface";
        
        setAI({
          provider,
          gemini_api_key: activeAI.gemini_api_key,
          openrouter_api_key: activeAI.openrouter_api_key,
          openrouter_model: activeAI.openrouter_model,
          huggingface_api_key: activeAI.huggingface_api_key,
        });

        // Imgbb Settings profile isolated loading
        const imgbbRow = settings.find(s => s.key === "imgbb")?.value as any || {};
        const activeImgbb = isSubProfile ? (activeProfile?.imgbb || {}) : (activeProfile?.imgbb || imgbbRow);
        setImgbb({
          api_key: activeImgbb.api_key || "",
          require_conversion: activeImgbb.require_conversion !== false,
          convert_to_webp: activeImgbb.convert_to_webp === true,
        });

        // Telegram Settings profile isolated loading
        const activeTelegram = isSubProfile ? (activeProfile?.telegram || {}) : null;
        if (activeTelegram) {
          setTelegram({
            bot_token: "",
            chat_id: activeTelegram.chat_id || "",
            auto_sync: activeTelegram.auto_sync ?? true,
            has_token: !!activeTelegram.bot_token || activeTelegram.has_token || false,
          });
        } else if (user) {
          try {
            const response = await supabase.functions.invoke("telegram-settings", {
              body: { action: "get" },
            });

            if (response.data?.sources?.[0]) {
              const source = response.data.sources[0];
              setTelegram({
                source_id: source.id,
                bot_token: "",
                chat_id: source.chat_id || "",
                auto_sync: source.auto_sync ?? true,
                has_token: source.has_token || false,
              });
            } else {
              setTelegram({ bot_token: "", chat_id: "", auto_sync: true, has_token: false });
            }
          } catch (_) {
            setTelegram({ bot_token: "", chat_id: "", auto_sync: true, has_token: false });
          }
        }
      } else {
        setWoocommerce({ store_url: "", consumer_key: "", consumer_secret: "", currency: "EGP" });
        setTelegram({ bot_token: "", chat_id: "", auto_sync: true, has_token: false });
        setAI({ provider: "gemini" });
        setImgbb({ api_key: "", require_conversion: true, convert_to_webp: false });
        localStorage.removeItem("telewoo_woocommerce_settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "00000000-0000-0000-0000-000000000000";

      const { error } = await supabase
        .from("settings")
        .upsert(
          {
            user_id: userId,
            key,
            value: value as Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key" }
        );

      if (error) console.warn(`DB save for ${key} notice:`, error.message);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const updateProfileSettingsInMemoryAndDB = async (updateKey: string, updateVal: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: pRow } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "store_profiles")
      .maybeSingle();

    const pVal = pRow?.value as any;
    if (pVal && Array.isArray(pVal.list)) {
      const activeId = pVal.active_id || localStorage.getItem("telewoo_active_profile_id");
      const updatedList = pVal.list.map((p: any) => {
        if (p.id === activeId || p.is_active) {
          return {
            ...p,
            [updateKey]: updateVal
          };
        }
        return p;
      });

      await supabase.from("settings").upsert({
        user_id: user.id,
        key: "store_profiles",
        value: { list: updatedList, active_id: activeId } as any
      }, { onConflict: "user_id,key" });
    }
  };

  const saveTelegram = async (settings: TelegramSettings) => {
    setIsSaving(true);
    try {
      const response = await supabase.functions.invoke("telegram-settings", {
        body: {
          action: "save",
          source_id: settings.source_id,
          bot_token: settings.bot_token,
          chat_id: settings.chat_id,
          auto_sync: settings.auto_sync,
          name: "Telegram Bot",
        },
      });

      if (response.error) throw new Error(response.error.message || "Failed to save settings");
      if (response.data?.error) throw new Error(response.data.error);

      const telegramObj = {
        source_id: settings.source_id,
        chat_id: settings.chat_id,
        auto_sync: settings.auto_sync,
        has_token: true,
      };

      setTelegram({
        ...settings,
        bot_token: "",
        has_token: true,
      });

      await updateProfileSettingsInMemoryAndDB("telegram", telegramObj);
      
      toast({ title: "تم حفظ إعدادات Telegram للبروفايل الحسابي بشكل آمن" });
    } catch (error: any) {
      console.error("Error saving telegram:", error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveWooCommerce = async (settings: WooCommerceSettings) => {
    setIsSaving(true);
    try {
      if (settings.store_url && settings.consumer_key) {
        localStorage.setItem("telewoo_woocommerce_settings", JSON.stringify(settings));
      } else {
        localStorage.removeItem("telewoo_woocommerce_settings");
      }

      const old = { ...woocommerce };
      await saveSetting("woocommerce", settings);
      setWoocommerce(settings);

      await updateProfileSettingsInMemoryAndDB("woocommerce", settings);
      await updateProfileSettingsInMemoryAndDB("store_url", settings.store_url);

      const mask = (s: WooCommerceSettings) => ({ store_url: s.store_url, currency: s.currency, has_key: !!s.consumer_key, has_secret: !!s.consumer_secret });
      await logActivity({
        action: "update", entity_type: "setting",
        metadata: { key: "woocommerce" },
        old_values: mask(old), new_values: mask(settings),
      });
      toast({ title: "تم حفظ وتثبيت إعدادات WooCommerce للبروفايل الحسابي بنجاح" });
    } catch (error: any) {
      setWoocommerce(settings);
      toast({ title: "تم حفظ الإعدادات محلياً", description: "تم حفظ مفاتيح المتجر للبروفايل الحسابي" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAI = async (settings: AISettings) => {
    setIsSaving(true);
    try {
      const old = { ...ai };
      await saveSetting("ai", settings);
      setAI(settings);
      await updateProfileSettingsInMemoryAndDB("ai", settings);
      toast({ title: "تم حفظ إعدادات الذكاء الاصطناعي للبروفايل الحسابي" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveImgbb = async (settings: ImgbbSettings) => {
    setIsSaving(true);
    try {
      await saveSetting("imgbb", settings);
      setImgbb(settings);
      await updateProfileSettingsInMemoryAndDB("imgbb", settings);
      toast({ title: "تم حفظ إعدادات imgbb للبروفايل الحسابي" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    isLoading,
    isSaving,
    telegram,
    woocommerce,
    ai,
    imgbb,
    saveTelegram,
    saveWooCommerce,
    saveAI,
    saveImgbb,
    refetch: fetchSettings,
  };
}
