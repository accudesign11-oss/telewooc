import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StoreProfile {
  id: string;
  name: string;
  is_active: boolean;
  store_url?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  woocommerce?: {
    store_url: string;
    consumer_key: string;
    consumer_secret: string;
    currency?: string;
  };
  wp_studio?: {
    site_url: string;
    api_key: string;
  };
  telegram?: {
    bot_token: string;
    chat_id: string;
    auto_sync: boolean;
  };
  ai?: {
    provider: "gemini" | "openrouter" | "huggingface";
    gemini_api_key?: string;
    openrouter_api_key?: string;
    openrouter_model?: string;
    huggingface_api_key?: string;
  };
  imgbb?: {
    api_key: string;
    require_conversion: boolean;
    convert_to_webp: boolean;
  };
  facebook?: {
    page_id: string;
    page_name?: string;
    access_token?: string;
  };
  branding?: {
    brand_name: string;
  };
  created_at: string;
}

export function useStoreProfiles() {
  const [profiles, setProfiles] = useState<StoreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch store_profiles setting
      const { data: rows } = await supabase
        .from("settings")
        .select("key, value")
        .eq("user_id", user.id)
        .in("key", ["store_profiles", "woocommerce", "wp_studio", "facebook", "branding"]);

      const profilesRow = (rows || []).find(r => r.key === "store_profiles")?.value as any;
      let existingProfiles: StoreProfile[] = Array.isArray(profilesRow?.list) ? profilesRow.list : [];

      // If no profiles exist yet, auto-create default profile from existing settings
      if (existingProfiles.length === 0) {
        const wc = (rows || []).find(r => r.key === "woocommerce")?.value || {};
        const wp = (rows || []).find(r => r.key === "wp_studio")?.value || {};
        const fb = (rows || []).find(r => r.key === "facebook")?.value || {};
        const br = (rows || []).find(r => r.key === "branding")?.value || {};

        const defaultUrl = (wc.store_url || wp.site_url || "").toString();
        let defaultName = br.brand_name || "المتجر الرئيسي";
        if (defaultUrl) {
          try {
            defaultName = new URL(defaultUrl).hostname.replace("www.", "");
          } catch (_) {}
        }

        const defaultProf: StoreProfile = {
          id: "prof_default",
          name: defaultName,
          is_active: true,
          store_url: defaultUrl,
          woocommerce: wc,
          wp_studio: wp,
          facebook: fb,
          branding: br,
          created_at: new Date().toISOString(),
        };

        existingProfiles = [defaultProf];

        await supabase.from("settings").upsert({
          user_id: user.id,
          key: "store_profiles",
          value: { list: existingProfiles, active_id: defaultProf.id } as any,
        }, { onConflict: "user_id,key" });
      }

      setProfiles(existingProfiles);
    } catch (e: any) {
      console.error("Error loading store profiles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;

  const saveProfilesList = async (newList: StoreProfile[], activeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("غير مسجل الدخول");

    // Save active profile ID to localStorage for instant client reference
    localStorage.setItem("telewoo_active_profile_id", activeId);

    // Update profiles list
    await supabase.from("settings").upsert({
      user_id: user.id,
      key: "store_profiles",
      value: { list: newList, active_id: activeId } as any,
    }, { onConflict: "user_id,key" });

    // Sync active profile settings into primary keys
    const target = newList.find(p => p.id === activeId) || newList[0];
    if (target) {
      const targetWoo = target.woocommerce || { store_url: "", consumer_key: "", consumer_secret: "", currency: "EGP" };
      await supabase.from("settings").upsert({
        user_id: user.id,
        key: "woocommerce",
        value: targetWoo as any,
      }, { onConflict: "user_id,key" });

      if (targetWoo.store_url && targetWoo.consumer_key) {
        localStorage.setItem("telewoo_woocommerce_settings", JSON.stringify(targetWoo));
      } else {
        localStorage.removeItem("telewoo_woocommerce_settings");
      }

      const targetWp = target.wp_studio || { site_url: target.store_url || "", api_key: "" };
      await supabase.from("settings").upsert({
        user_id: user.id,
        key: "wp_studio",
        value: targetWp as any,
      }, { onConflict: "user_id,key" });

      const targetFb = target.facebook || {};
      await supabase.from("settings").upsert({
        user_id: user.id,
        key: "facebook",
        value: targetFb as any,
      }, { onConflict: "user_id,key" });

      const targetBr = target.branding || { brand_name: target.name };
      await supabase.from("settings").upsert({
        user_id: user.id,
        key: "branding",
        value: targetBr as any,
      }, { onConflict: "user_id,key" });
    }

    setProfiles(newList);
  };

  const switchProfile = async (profileId: string) => {
    try {
      const newList = profiles.map(p => ({
        ...p,
        is_active: p.id === profileId,
      }));
      await saveProfilesList(newList, profileId);
      const target = newList.find(p => p.id === profileId);
      toast({
        title: "تم تبديل الحساب/البروفايل النشط بنجاح",
        description: `أنت الآن داخل حساب "${target?.name || "المتجر المختار"}" ببياناته المستقلة.`,
      });
      // Refresh page to apply active profile across all hooks
      window.location.reload();
    } catch (e: any) {
      toast({ title: "خطأ في التبديل", description: e.message, variant: "destructive" });
    }
  };

  const createProfile = async (data: {
    name: string;
    store_url?: string;
    supabase_url?: string;
    supabase_anon_key?: string;
    woocommerce?: any;
    wp_studio?: any;
    telegram?: any;
    ai?: any;
    imgbb?: any;
    facebook?: any;
    branding?: any;
    activateNow?: boolean;
  }) => {
    try {
      const newId = "prof_" + Math.random().toString(36).slice(2, 8);
      const activate = data.activateNow ?? true;

      // Brand new profile gets completely FRESH empty settings (no inherited keys from old main profile)
      const newProf: StoreProfile = {
        id: newId,
        name: data.name.trim() || "حساب جديد",
        is_active: activate,
        store_url: data.store_url || "",
        supabase_url: data.supabase_url || "",
        supabase_anon_key: data.supabase_anon_key || "",
        woocommerce: data.woocommerce || { store_url: "", consumer_key: "", consumer_secret: "", currency: "EGP" },
        wp_studio: data.wp_studio || { site_url: "", api_key: "" },
        telegram: data.telegram || { bot_token: "", chat_id: "", auto_sync: true, has_token: false },
        ai: data.ai || { provider: "gemini" },
        imgbb: data.imgbb || { api_key: "", require_conversion: true, convert_to_webp: false },
        facebook: data.facebook || { page_id: "", page_name: "", access_token: "" },
        branding: data.branding || { brand_name: data.name.trim() },
        created_at: new Date().toISOString(),
      };

      const newList = profiles.map(p => ({
        ...p,
        is_active: activate ? false : p.is_active,
      }));
      newList.push(newProf);

      // Remove previous local storage cache before activating new profile
      if (activate) {
        localStorage.removeItem("telewoo_woocommerce_settings");
      }

      await saveProfilesList(newList, activate ? newId : (activeProfile?.id || newId));

      toast({
        title: "⚡ تم إنشاء البروفايل/الحساب الفرعي الجديد بنجاح!",
        description: `تم إعداد حساب "${newProf.name}" ببيانات مستقبّلية جديدة كلياً.`,
      });

      if (activate) window.location.reload();
    } catch (e: any) {
      toast({ title: "خطأ في الإنشاء", description: e.message, variant: "destructive" });
    }
  };

  const updateProfile = async (id: string, updates: Partial<StoreProfile>) => {
    try {
      const newList = profiles.map(p => p.id === id ? { ...p, ...updates } : p);
      await saveProfilesList(newList, activeProfile?.id || id);
      toast({ title: "تم تحديث بيانات البروفايل" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const deleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      toast({ title: "تنبيه", description: "يجب أن يتوفر بروفايل متجر واحد على الأقل في الحساب", variant: "destructive" });
      return;
    }
    try {
      const newList = profiles.filter(p => p.id !== id);
      const wasActive = profiles.find(p => p.id === id)?.is_active;
      if (wasActive && newList.length > 0) {
        newList[0].is_active = true;
      }
      await saveProfilesList(newList, newList.find(p => p.is_active)?.id || newList[0].id);
      toast({ title: "تم حذف البروفايل" });
      if (wasActive) window.location.reload();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return {
    profiles,
    activeProfile,
    loading,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    loadProfiles,
  };
}
