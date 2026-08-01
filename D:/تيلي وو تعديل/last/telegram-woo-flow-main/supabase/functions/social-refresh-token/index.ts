import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, decryptToken, encryptToken } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: ue } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { connection_id, app_id, app_secret } = await req.json();
    if (!connection_id) return jsonResponse({ error: "connection_id required" });

    const { data: conn } = await supabase.from("social_platform_connections").select("*").eq("id", connection_id).eq("user_id", user.id).single();
    if (!conn) return jsonResponse({ error: "not found" });

    if (conn.platform !== "facebook_page" && conn.platform !== "instagram") {
      return jsonResponse({ error: "تحديث التوكن متاح حاليًا لـ Facebook/Instagram فقط" });
    }

    const shortToken = await decryptToken(conn.access_token_encrypted);
    if (!shortToken) return jsonResponse({ error: "decryption failed" });

    if (!app_id || !app_secret) return jsonResponse({ error: "app_id و app_secret مطلوبان لتحديث التوكن إلى Long-Lived" });

    const r = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${app_id}&client_secret=${app_secret}&fb_exchange_token=${shortToken}`);
    const data = await r.json();
    if (!r.ok || data.error) return jsonResponse({ error: data.error?.message || "فشل التحديث" });

    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // ~60 days
    const enc = await encryptToken(newToken);
    await supabase.from("social_platform_connections").update({
      access_token_encrypted: enc,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_tested_at: new Date().toISOString(),
      last_error: null,
      status: "connected",
    }).eq("id", connection_id);

    return jsonResponse({ success: true, expires_in_days: Math.floor(expiresIn / 86400) });
  } catch (e: any) {
    return jsonResponse({ error: e.message });
  }
});
