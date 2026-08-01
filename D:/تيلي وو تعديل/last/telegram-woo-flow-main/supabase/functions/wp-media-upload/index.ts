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

function normalizeStoreUrl(input: string): string {
  let value = String(input || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "");
}

function cleanAppPassword(input: string): string {
  // WordPress app passwords are often copied as groups with spaces: xxxx xxxx xxxx xxxx
  return String(input || "").trim().replace(/\s+/g, "");
}

function safeFilename(input: string): string {
  const raw = String(input || "upload.webp").trim();
  const ext = raw.includes(".") ? raw.split(".").pop() : "webp";
  const base = raw.replace(/\.[^.]+$/, "") || "upload";
  return `${base.replace(/[\\/\"'<>:#?%{}|^~`\[\]]+/g, "-").slice(0, 90)}.${ext}`;
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
    const { filename, mime, data_base64, alt_text, title } = body;
    if (!filename || !mime || !data_base64) return json({ ok: false, error: "filename, mime, data_base64 مطلوبة" });

    // Load WP creds (separate from WC keys for the WordPress REST media API)
    const { data: wpRow } = await supabase
      .from("settings").select("value")
      .eq("user_id", user.id).eq("key", "wordpress").maybeSingle();

    // Fallback: try WC store_url with provided WP app password
    const { data: wcRow } = await supabase
      .from("settings").select("value")
      .eq("user_id", user.id).eq("key", "woocommerce").maybeSingle();

    const wp = (wpRow?.value || {}) as any;
    const wc = (wcRow?.value || {}) as any;

    const storeUrl: string = wp.store_url || wc.store_url;
    const username: string = String(wp.username || "").trim();
    const appPassword: string = cleanAppPassword(wp.app_password);

    if (!storeUrl) return json({ ok: false, error: "رابط المتجر غير مضبوط" });
    if (!username || !appPassword) {
      return json({ ok: false, error: "اضبط اسم مستخدم WordPress و App Password في الإعدادات" });
    }

    let base = "";
    try {
      base = normalizeStoreUrl(storeUrl);
    } catch (_) {
      return json({ ok: false, error: "رابط الموقع غير صحيح. اكتب الرابط مثل https://example.com" });
    }
    const url = `${base}/wp-json/wp/v2/media`;
    const auth = btoa(`${username}:${appPassword}`);
    const uploadName = safeFilename(filename);

    // Decode base64 to bytes
    const bin = atob(data_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${uploadName}"`,
      },
      body: bytes,
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }

    if (!res.ok) {
      const code = data?.code || "";
      let message = data?.message || `WP error ${res.status}`;
      if (res.status === 401 || code === "rest_cannot_create") {
        message = "بيانات WordPress غير صحيحة أو المستخدم لا يملك صلاحية رفع الملفات. استخدم Application Password لمستخدم بصلاحية Administrator/Editor.";
      } else if (code === "rest_upload_no_content_disposition" || code === "rest_upload_invalid_disposition") {
        message = "الموقع رفض اسم الملف أثناء الرفع. جرّب اسم ملف أبسط.";
      } else if (code === "rest_upload_unknown_error") {
        message = "الموقع رفض رفع الصورة. تأكد أن WordPress يسمح بصيغة WebP وأن مساحة الاستضافة كافية.";
      }
      return json({ ok: false, error: message, status: res.status, details: data });
    }

    // Optionally update alt/title
    if ((alt_text || title) && data?.id) {
      try {
        await fetch(`${base}/wp-json/wp/v2/media/${data.id}`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            alt_text: alt_text || "",
            title: title || filename,
          }),
        });
      } catch (_) { /* non-fatal */ }
    }

    return json({
      ok: true,
      id: data.id,
      url: data.source_url,
      filename: data.slug,
      mime_type: data.mime_type,
    });
  } catch (e) {
    console.error("wp-media-upload error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
