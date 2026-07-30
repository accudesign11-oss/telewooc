import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, getAuthedUserAndAI } from "../_shared/social-engine.ts";

/**
 * Reads the user's wp_studio settings (site_url + api_key). Falls back to woocommerce.store_url.
 */
async function loadTarget(supabase: any, userId: string) {
  let { data: rows } = await supabase
    .from("settings")
    .select("key,value")
    .eq("user_id", userId)
    .in("key", ["wp_studio", "woocommerce"]);

  if (!rows || rows.length === 0) {
    const { data: fallbackRows } = await supabase
      .from("settings")
      .select("key,value")
      .in("key", ["wp_studio", "woocommerce"])
      .order("created_at", { ascending: false });
    rows = fallbackRows || [];
  }

  const ws = (rows || []).find((r: any) => r.key === "wp_studio")?.value || {};
  const wc = (rows || []).find((r: any) => r.key === "woocommerce")?.value || {};
  const siteUrl = (ws.site_url || wc.store_url || "").toString().replace(/\/+$/, "");
  const apiKey = (ws.api_key || "").toString();
  return { siteUrl, apiKey, ws, wc };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "apply"); // apply | snapshot | reset | ping
    const { siteUrl, apiKey, wc } = await loadTarget(supabase, user.id);

    if (!siteUrl) return jsonResponse({ ok: false, error: "لم يتم ضبط رابط الموقع. أدخله في إعدادات WordPress Studio." });

    // Handle WooCommerce Currency & Settings Direct DB Sync if passed
    if (body?.currency_config) {
      try {
        const updatedWc = { ...wc, currency: body.currency_config.code, currency_symbol: body.currency_config.symbol };
        await supabase
          .from("settings")
          .upsert({ user_id: user.id, key: "woocommerce", value: updatedWc }, { onConflict: "user_id,key" });
      } catch (_) {}
    }

    if (action !== "ping" && !apiKey) {
      return jsonResponse({
        ok: false,
        error: "لم يتم ربط مفتاح TeleWoo Injector بموقعك بعد. قم بتنزيل إضافة ZIP وتفعيل المفتاح أو إدخاله في تبويب الإعدادات لعمل الحقن المباشر.",
        requires_plugin: true
      });
    }

    const base = `${siteUrl}/wp-json/telewoo/v1`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["X-TeleWoo-Key"] = apiKey;

    let path = "/ping";
    let method = "GET";
    let payload: any = null;

    if (action === "snapshot") { path = "/snapshot"; method = "GET"; }
    else if (action === "reset") { path = "/reset"; method = "POST"; }
    else if (action === "apply") {
      path = "/customize"; method = "POST";
      payload = {
        css: typeof body?.css === "string" ? body.css : null,
        js: typeof body?.js === "string" ? body.js : null,
        php_snippet: typeof body?.php_snippet === "string" ? body.php_snippet : null,
        mode: body?.mode === "append" ? "append" : "replace",
      };
    }

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
    } catch (netErr: any) {
      return jsonResponse({ ok: false, error: "تعذر الوصول إلى الموقع: " + (netErr?.message || "خطأ شبكة") });
    }

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}

    if (!res.ok) {
      return jsonResponse({
        ok: false,
        error: `WordPress رد بحالة ${res.status}. تأكد من تثبيت الملحق telewoo-injector وصحة المفتاح في ووردبريس.`,
        status: res.status,
        details: json || text.slice(0, 500),
      });
    }

    // If apply succeeded and a customization id was passed, mark it applied
    if (action === "apply" && body?.customization_id) {
      try {
        await supabase
          .from("wp_customizations")
          .update({ applied: true, applied_at: new Date().toISOString() })
          .eq("id", body.customization_id)
          .eq("user_id", user.id);
      } catch (_) {}
    }

    return jsonResponse({ ok: true, action, result: json ?? { raw: text } });
  } catch (e: any) {
    console.error("wp-studio-inject error:", e);
    return jsonResponse({ ok: false, error: e?.message || String(e) });
  }
});