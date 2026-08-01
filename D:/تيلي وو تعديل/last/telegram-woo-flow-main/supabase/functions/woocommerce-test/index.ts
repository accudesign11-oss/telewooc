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

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "غير مصرح" }), {
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
      return new Response(JSON.stringify({ success: false, error: "جلسة غير صالحة" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { store_url, consumer_key, consumer_secret } = body;

    // Validate inputs
    if (!store_url || !consumer_key || !consumer_secret) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "يرجى ملء جميع الحقول المطلوبة" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize store URL
    let rawUrl = (store_url || "").trim().replace(/\/+$/, "");
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = "https://" + rawUrl;
    }
    const normalizedUrl = rawUrl;
    const auth = btoa(`${consumer_key}:${consumer_secret}`);
    const ck = encodeURIComponent(consumer_key);
    const cs = encodeURIComponent(consumer_secret);

    // Build list of candidate endpoints to attempt
    const candidates = [
      { name: "standard_products_auth", url: `${normalizedUrl}/wp-json/wc/v3/products?per_page=1`, headers: { Authorization: `Basic ${auth}` } },
      { name: "rest_route_products_auth", url: `${normalizedUrl}/index.php?rest_route=/wc/v3/products&per_page=1`, headers: { Authorization: `Basic ${auth}` } },
      { name: "standard_products_query", url: `${normalizedUrl}/wp-json/wc/v3/products?per_page=1&consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      { name: "rest_route_products_query", url: `${normalizedUrl}/index.php?rest_route=/wc/v3/products&per_page=1&consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      { name: "system_status_auth", url: `${normalizedUrl}/wp-json/wc/v3/system_status`, headers: { Authorization: `Basic ${auth}` } },
      { name: "system_status_rest_route", url: `${normalizedUrl}/index.php?rest_route=/wc/v3/system_status`, headers: { Authorization: `Basic ${auth}` } },
    ];

    let wcResponse: Response | null = null;
    let responseText = "";
    let contentType = "";
    let workingCandidateName = "";

    for (const cand of candidates) {
      try {
        console.log(`Testing candidate ${cand.name}: ${cand.url}`);
        const res = await fetch(cand.url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...cand.headers,
          },
          signal: AbortSignal.timeout(12000),
        });

        const ct = res.headers.get("content-type") || "";
        const txt = await res.text();

        // If response is JSON, we found a valid WooCommerce REST endpoint!
        if (ct.includes("application/json") || txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
          wcResponse = res;
          responseText = txt;
          contentType = ct;
          workingCandidateName = cand.name;
          break;
        }

        // Store last non-JSON response for error reporting
        wcResponse = res;
        responseText = txt;
        contentType = ct;
      } catch (err: any) {
        console.error(`Candidate ${cand.name} failed:`, err.message);
      }
    }

    const latency = Date.now() - startTime;

    if (!wcResponse) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "فشل الاتصال بالمتجر - يتعذر الوصول إلى سيرفر المتجر",
        status: "network_error"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if response is JSON
    const isJson = contentType.includes("application/json") || responseText.trim().startsWith("{") || responseText.trim().startsWith("[");
    if (!isJson) {
      console.error("Non-JSON response:", responseText.substring(0, 500));
      
      let errorMsg = "رد غير صالح من المتجر";
      if (responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
        if (responseText.includes("404") || responseText.includes("Not Found")) {
          errorMsg = "WooCommerce REST API غير متاحة - تحقق من الروابط وإعدادات المتجر";
        } else if (responseText.includes("401") || responseText.includes("Unauthorized")) {
          errorMsg = "بيانات API غير صحيحة";
        } else if (responseText.includes("403") || responseText.includes("Forbidden")) {
          errorMsg = "جدار الحماية في الموقع يحظر طلبات API (جرب إلغاء حظر Cloudflare/Wordfence)";
        } else {
          errorMsg = "تحقق من رابط المتجر - يجب أن يكون بصيغة https://yourstore.com";
        }
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMsg,
        status: "invalid_response"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "فشل في تحليل رد المتجر",
        status: "parse_error"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!wcResponse.ok) {
      const errorMsg = result.message || result.error || "خطأ في API";
      
      if (wcResponse.status === 401) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "بيانات API غير صحيحة - تحقق من Consumer Key و Secret",
          status: "unauthorized"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (wcResponse.status === 403) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "صلاحيات API غير كافية - تأكد من صلاحية القراءة/الكتابة",
          status: "forbidden"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMsg,
        status: "api_error"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract store info
    const storeInfo = {
      version: result.environment?.version || "جاهز",
      wc_version: result.environment?.wc_version || result.environment?.version || "جاهز",
      php_version: result.environment?.php_version || "معتمد",
      wp_version: result.environment?.wp_version || "معتمد",
      products_count: Array.isArray(result) ? result.length : (result.database?.product_count || 1),
      candidate: workingCandidateName,
    };

    console.log(`WooCommerce test successful via ${workingCandidateName} for user ${user.id}, latency: ${latency}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "تم الاتصال بنجاح!",
      latency_ms: latency,
      store_info: storeInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("woocommerce-test error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "خطأ غير متوقع" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
