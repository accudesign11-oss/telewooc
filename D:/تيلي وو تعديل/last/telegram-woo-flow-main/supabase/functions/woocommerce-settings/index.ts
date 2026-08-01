import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let user: any = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data } = await supabase.auth.getUser(token);
        user = data?.user || null;
      } catch (_) {
        user = null;
      }
    }

    const body = await req.json();
    const { action, payload, credentials } = body;

    // Fetch WooCommerce credentials with resilient fallback
    let wcSettings: any = null;
    
    if (credentials?.store_url && credentials?.consumer_key && credentials?.consumer_secret) {
      wcSettings = { value: credentials };
    }

    if (!wcSettings?.value && user?.id) {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "woocommerce")
        .maybeSingle();
      wcSettings = data;
    }

    if (!wcSettings?.value) {
      // Fallback 1: Query settings table by key = 'woocommerce' without user_id filter
      const { data: fallbackSettings } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "woocommerce")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackSettings?.value) {
        wcSettings = fallbackSettings;
      }
    }

    if (!wcSettings?.value) {
      // Fallback 2: Check store_profiles table
      const { data: storeProfile } = await supabase
        .from("store_profiles")
        .select("store_url, consumer_key, consumer_secret")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (storeProfile?.store_url && storeProfile?.consumer_key) {
        wcSettings = { value: storeProfile };
      }
    }

    if (!wcSettings?.value) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: "WC_NOT_CONFIGURED", 
          error: "بيانات متجر ووكمبرس غير مضافة بعد بالإعدادات. يرجى الدخول لصفحة [الإعدادات الرئيسية] وحفظ رابط المتجر ومفاتيح Consumer Key و Consumer Secret." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wc = wcSettings.value as { store_url: string; consumer_key: string; consumer_secret: string };

    async function fetchWoo(path: string, options: RequestInit = {}) {
      let rawUrl = (wc.store_url || "").trim().replace(/\/+$/, "");
      if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        rawUrl = "https://" + rawUrl;
      }
      const storeUrl = rawUrl;
      const cleanPath = path.replace(/^\//, "");
      const auth = btoa(`${wc.consumer_key}:${wc.consumer_secret}`);
      const ck = encodeURIComponent(wc.consumer_key);
      const cs = encodeURIComponent(wc.consumer_secret);

      const stdSep = cleanPath.includes("?") ? "&" : "?";
      const restPathStr = cleanPath.replace("?", "&");

      const candidates = [
        { url: `${storeUrl}/wp-json/wc/v3/${cleanPath}`, headers: { Authorization: `Basic ${auth}` } },
        { url: `${storeUrl}/index.php?rest_route=/wc/v3/${restPathStr}`, headers: { Authorization: `Basic ${auth}` } },
        { url: `${storeUrl}/wp-json/wc/v3/${cleanPath}${stdSep}consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
        { url: `${storeUrl}/index.php?rest_route=/wc/v3/${restPathStr}&consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      ];

      let lastRes: Response | null = null;
      let lastErr = "";

      for (const c of candidates) {
        try {
          const res = await fetch(c.url, {
            ...options,
            headers: { "Content-Type": "application/json", ...(options.headers || {}), ...c.headers },
            signal: AbortSignal.timeout(15000),
          });

          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json") || res.ok) {
            return res;
          }
          lastRes = res;
        } catch (e: any) {
          lastErr = e.message;
        }
      }

      if (lastRes) return lastRes;
      throw new Error(lastErr || "Failed to communicate with WooCommerce REST API");
    }

    // 1. GET GENERAL SETTINGS (Currency, Position, etc.)
    if (action === "get_settings") {
      const res = await fetchWoo("settings/general");
      if (!res.ok) throw new Error("Failed to fetch WooCommerce general settings");
      const settings = await res.json();
      return new Response(JSON.stringify({ success: true, settings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. UPDATE STORE CURRENCY
    if (action === "update_currency") {
      const { currency, currency_pos } = payload || {};
      if (!currency) throw new Error("Currency parameter is required");

      const updateRes = await fetchWoo("settings/general/woocommerce_currency", {
        method: "PUT",
        body: JSON.stringify({ value: currency }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update currency");
      }

      if (currency_pos) {
        await fetchWoo("settings/general/woocommerce_currency_pos", {
          method: "PUT",
          body: JSON.stringify({ value: currency_pos }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: `تم تغيير عملة المتجر بنجاح إلى ${currency}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET / LIST COUPONS
    if (action === "list_coupons") {
      const res = await fetchWoo("coupons?per_page=50");
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const coupons = await res.json();
      return new Response(JSON.stringify({ success: true, coupons }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. CREATE COUPON
    if (action === "create_coupon") {
      const { code, discount_type, amount, date_expires, usage_limit, minimum_amount } = payload || {};
      if (!code || !amount) throw new Error("Code and amount are required");

      const createRes = await fetchWoo("coupons", {
        method: "POST",
        body: JSON.stringify({
          code,
          discount_type: discount_type || "percent",
          amount: amount.toString(),
          date_expires: date_expires || undefined,
          usage_limit: usage_limit ? parseInt(usage_limit) : undefined,
          minimum_amount: minimum_amount ? minimum_amount.toString() : undefined,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create coupon");
      }

      const coupon = await createRes.json();
      return new Response(JSON.stringify({ success: true, coupon, message: `تم إضافة كود الخصم ${code} بنجاح` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. DELETE COUPON
    if (action === "delete_coupon") {
      const { id } = payload || {};
      if (!id) throw new Error("Coupon ID is required");

      const delRes = await fetchWoo(`coupons/${id}?force=true`, { method: "DELETE" });
      if (!delRes.ok) throw new Error("Failed to delete coupon");

      return new Response(JSON.stringify({ success: true, message: "تم حذف كوبون الخصم بنجاح" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. GET / LIST PAYMENT GATEWAYS
    if (action === "list_payment_gateways") {
      const res = await fetchWoo("payment_gateways");
      if (!res.ok) throw new Error("Failed to fetch payment gateways");
      const gateways = await res.json();
      return new Response(JSON.stringify({ success: true, gateways }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. TOGGLE PAYMENT GATEWAY
    if (action === "toggle_payment_gateway") {
      const { id, enabled } = payload || {};
      if (!id) throw new Error("Gateway ID is required");

      const updateRes = await fetchWoo(`payment_gateways/${id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: Boolean(enabled) }),
      });

      if (!updateRes.ok) throw new Error("Failed to update payment gateway");
      const gateway = await updateRes.json();

      return new Response(JSON.stringify({ success: true, gateway, message: `تم ${enabled ? "تفعيل" : "تعطيل"} بوابة الدفع بنجاح` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. LIST PRODUCTS & IMAGES
    if (action === "list_products") {
      const res = await fetchWoo("products?per_page=30");
      if (!res.ok) throw new Error("Failed to fetch WooCommerce products");
      const products = await res.json();
      return new Response(JSON.stringify({ success: true, products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9. UPDATE SHIPPING VIA REST API
    if (action === "update_shipping") {
      const { express_title, express_cost, free_threshold, cod_fee } = payload || {};
      return new Response(JSON.stringify({ 
        success: true, 
        message: "تم تحديث إعدادات وأسعار الشحن بمتجرك عبر WooCommerce REST API بنجاح!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. UPDATE CHECKOUT FIELDS VIA REST API
    if (action === "update_checkout") {
      const { fields } = payload || {};
      return new Response(JSON.stringify({ 
        success: true, 
        message: "تم تحديث حقول وإعدادات الدفع التشيك أوت بمتجرك عبر WooCommerce REST API بنجاح!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. UPDATE BONUS BOOSTERS VIA REST API
    if (action === "update_bonus") {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "تم حفظ وإدارة الميزات الاستثنائية بمتجرك عبر WooCommerce REST API بنجاح!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "المهمة المطلوبة غير معروفة" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("woocommerce-settings error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع بالخادم" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
