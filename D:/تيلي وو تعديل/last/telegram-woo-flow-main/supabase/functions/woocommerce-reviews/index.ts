import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ReviewItem {
  reviewer_name: string;
  rating: number;
  review_text: string;
  reviewer_email?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing authorization" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ ok: false, error: "Invalid token" });

    const body = await req.json();
    const action: string = body.action; // "publish" | "list" | "delete" | "update"
    const wc_product_id: number | undefined = body.wc_product_id;
    const reviews: ReviewItem[] = body.reviews || [];
    const review_id: number | undefined = body.review_id;

    const { data: wcSettings } = await supabase
      .from("settings").select("value")
      .eq("user_id", user.id).eq("key", "woocommerce").maybeSingle();

    if (!wcSettings?.value) return json({ ok: false, error: "WooCommerce غير مضبوط" });
    const wc = wcSettings.value as { store_url: string; consumer_key: string; consumer_secret: string };
    const base = wc.store_url.replace(/\/+$/, "") + "/wp-json/wc/v3";
    const auth = btoa(`${wc.consumer_key}:${wc.consumer_secret}`);

    const headers = {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    };

    if (action === "list") {
      if (!wc_product_id) return json({ ok: false, error: "wc_product_id مطلوب" });
      const res = await fetch(`${base}/products/reviews?product=${wc_product_id}&per_page=100`, { headers });
      const data = await res.json();
      if (!res.ok) return json({ ok: false, error: data?.message || "فشل في جلب الريفيوهات" });
      return json({ ok: true, reviews: data });
    }

    if (action === "delete") {
      if (!review_id) return json({ ok: false, error: "review_id مطلوب" });
      const res = await fetch(`${base}/products/reviews/${review_id}?force=true`, {
        method: "DELETE", headers,
      });
      const data = await res.json();
      if (!res.ok) return json({ ok: false, error: data?.message || "فشل الحذف" });
      return json({ ok: true });
    }

    if (action === "update") {
      if (!review_id) return json({ ok: false, error: "review_id مطلوب" });
      const payload: any = {};
      if (body.reviewer_name) payload.reviewer = body.reviewer_name;
      if (body.review_text) payload.review = body.review_text;
      if (body.rating) payload.rating = body.rating;
      if (body.reviewer_email) payload.reviewer_email = body.reviewer_email;
      const res = await fetch(`${base}/products/reviews/${review_id}`, {
        method: "POST", headers, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return json({ ok: false, error: data?.message || "فشل التحديث" });
      return json({ ok: true, review: data });
    }

    if (action === "publish") {
      if (!wc_product_id || !reviews?.length) return json({ ok: false, error: "wc_product_id و reviews مطلوبة" });
      const results: any[] = [];
      const errors: any[] = [];

      for (const r of reviews) {
        const payload = {
          product_id: wc_product_id,
          review: r.review_text,
          reviewer: r.reviewer_name,
          reviewer_email: r.reviewer_email || `${(r.reviewer_name || "customer").replace(/\s+/g, ".").toLowerCase()}@example.com`,
          rating: Math.round(r.rating),
          status: "approved",
          verified: true,
        };
        try {
          const res = await fetch(`${base}/products/reviews`, {
            method: "POST", headers, body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            errors.push({ reviewer: r.reviewer_name, error: data?.message || res.status });
          } else {
            results.push(data);
          }
        } catch (e) {
          errors.push({ reviewer: r.reviewer_name, error: String(e) });
        }
      }

      return json({ ok: true, published: results.length, total: reviews.length, errors, results });
    }

    return json({ ok: false, error: "action غير مدعوم" });
  } catch (e) {
    console.error("woocommerce-reviews error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
