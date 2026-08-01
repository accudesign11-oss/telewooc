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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, product_id, product_data, product_ids } = await req.json();

    // Get WooCommerce settings
    const { data: wcSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "woocommerce")
      .maybeSingle();

    // IMPORTANT: return 200 to avoid client runtime errors when settings are missing
    if (!wcSettings?.value) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "WC_NOT_CONFIGURED",
          error: "WooCommerce settings not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wc = wcSettings.value as { store_url: string; consumer_key: string; consumer_secret: string };

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

    // List all products
    if (action === "list") {
      const page = product_data?.page || 1;
      const perPage = product_data?.per_page || 50;
      const search = product_data?.search || "";
      
      let path = `products?page=${page}&per_page=${perPage}&orderby=date&order=desc`;
      if (search) {
        path += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetchWoo(path);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch products" }));
        throw new Error(error.message || "Failed to fetch products");
      }

      const products = await response.json();
      const totalProducts = response.headers.get("X-WP-Total");
      const totalPages = response.headers.get("X-WP-TotalPages");

      return new Response(
        JSON.stringify({ 
          products,
          total: parseInt(totalProducts || "0"),
          total_pages: parseInt(totalPages || "1"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get single product
    if (action === "get" && product_id) {
      const response = await fetchWoo(`products/${product_id}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch product" }));
        throw new Error(error.message || "Failed to fetch product");
      }

      const product = await response.json();
      return new Response(
        JSON.stringify({ product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update product
    if (action === "update" && product_id && product_data) {
      const response = await fetchWoo(`products/${product_id}`, {
        method: "PUT",
        body: JSON.stringify(product_data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update product" }));
        throw new Error(error.message || "Failed to update product");
      }

      const product = await response.json();

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "wc_update",
        title: "تم التحديث",
        body: `تم تحديث "${product.name}" على المتجر`,
        level: "success",
      });

      return new Response(
        JSON.stringify({ success: true, product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete product(s)
    if (action === "delete") {
      const idsToDelete = product_ids || (product_id ? [product_id] : []);
      
      if (idsToDelete.length === 0) {
        return new Response(JSON.stringify({ error: "No product IDs provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const id of idsToDelete) {
        try {
          const response = await fetchWoo(`products/${id}?force=true`, {
            method: "DELETE",
          });

          if (response.ok) {
            results.push({ id, success: true });
          } else {
            const error = await response.json().catch(() => ({ message: "Failed to delete product" }));
            results.push({ id, success: false, error: error.message });
          }
        } catch (e) {
          results.push({ id, success: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "wc_delete",
        title: "تم الحذف",
        body: `تم حذف ${successCount} منتج من المتجر`,
        level: successCount > 0 ? "success" : "error",
      });

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("woocommerce-products error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
