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
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Invalid token:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`woocommerce-categories: User ${user.id} authenticated`);

    const body = await req.json();
    const { action, category_id, category_data } = body;

    console.log(`woocommerce-categories: Action=${action}, category_id=${category_id}`);

    // Get WooCommerce settings from database (server-side only)
    const { data: wcSettings, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "woocommerce")
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching WooCommerce settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wcSettings?.value) {
      console.log("WooCommerce settings not configured");
      return new Response(
        JSON.stringify({
          success: false,
          code: "WC_NOT_CONFIGURED",
          error: "WooCommerce settings not configured. يرجى إعداد WooCommerce من الإعدادات أولاً",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wc = wcSettings.value as { store_url: string; consumer_key: string; consumer_secret: string };
    
    // Validate WooCommerce credentials exist
    if (!wc.store_url || !wc.consumer_key || !wc.consumer_secret) {
      console.error("Incomplete WooCommerce settings");
      return new Response(
        JSON.stringify({
          success: false,
          code: "WC_INCOMPLETE",
          error: "Incomplete WooCommerce configuration",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    async function fetchWoo(path: string, options: RequestInit = {}) {
      const storeUrl = wc.store_url.replace(/\/+$/, "");
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

    console.log(`woocommerce-categories: Connecting to ${wc.store_url}`);

    // ========== LIST / SYNC CATEGORIES ==========
    if (action === "list" || action === "sync") {
      console.log("Fetching categories from WooCommerce...");
      
      const response = await fetchWoo("products/categories?per_page=100");

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WooCommerce API error:", errorText);
        throw new Error(`فشل في جلب التصنيفات: ${response.status}`);
      }

      const wcCategories = await response.json();
      console.log(`Fetched ${wcCategories.length} categories from WooCommerce`);

      // If sync action, update local cache
      if (action === "sync") {
        // Delete old categories
        const { error: deleteError } = await supabase
          .from("wc_categories_cache")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) {
          console.error("Error deleting old categories:", deleteError);
        }

        // Insert new categories
        if (wcCategories.length > 0) {
          const { error: insertError } = await supabase
            .from("wc_categories_cache")
            .insert(
              wcCategories.map((cat: any) => ({
                user_id: user.id,
                wc_id: cat.id,
                name: cat.name,
                slug: cat.slug,
                parent_id: cat.parent || null,
              }))
            );

          if (insertError) {
            console.error("Error inserting categories:", insertError);
            throw new Error("فشل في حفظ التصنيفات محلياً");
          }
        }

        console.log(`Synced ${wcCategories.length} categories to local cache`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          categories: wcCategories,
          count: wcCategories.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CREATE CATEGORY ==========
    if (action === "create") {
      if (!category_data?.name) {
        return new Response(
          JSON.stringify({ error: "اسم التصنيف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Creating category: ${category_data.name}`);

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: category_data.name,
          slug: category_data.slug || undefined,
          parent: category_data.parent_id || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("WooCommerce create error:", errorData);
        throw new Error(errorData.message || "فشل في إنشاء التصنيف");
      }

      const newCategory = await response.json();
      console.log(`Created category with ID: ${newCategory.id}`);

      return new Response(
        JSON.stringify({ success: true, category: newCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== UPDATE CATEGORY ==========
    if (action === "update") {
      if (!category_id) {
        return new Response(
          JSON.stringify({ error: "معرف التصنيف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!category_data?.name) {
        return new Response(
          JSON.stringify({ error: "اسم التصنيف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Updating category ${category_id}: ${category_data.name}`);

      const response = await fetch(`${baseUrl}/${category_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: category_data.name,
          slug: category_data.slug || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("WooCommerce update error:", errorData);
        throw new Error(errorData.message || "فشل في تحديث التصنيف");
      }

      const updatedCategory = await response.json();
      console.log(`Updated category ${category_id} successfully`);

      return new Response(
        JSON.stringify({ success: true, category: updatedCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DELETE CATEGORY ==========
    if (action === "delete") {
      if (!category_id) {
        return new Response(
          JSON.stringify({ error: "معرف التصنيف مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Deleting category ${category_id}`);

      const response = await fetch(`${baseUrl}/${category_id}?force=true`, {
        method: "DELETE",
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("WooCommerce delete error:", errorData);
        throw new Error(errorData.message || "فشل في حذف التصنيف");
      }

      console.log(`Deleted category ${category_id} successfully`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CHECK CONFIG ==========
    if (action === "check") {
      // Just verify WooCommerce is configured (credentials validated above)
      return new Response(
        JSON.stringify({ success: true, configured: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("woocommerce-categories error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
