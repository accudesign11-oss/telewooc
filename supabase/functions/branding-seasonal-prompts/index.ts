// Generates a seasonal/events branding prompt batch grounded in a Brand Kit.
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai } = await getAuthedUserAndAI(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { brand_kit_id, season = "auto", events = [], count = 6, save = false } = body || {};

    let kit: any = null;
    if (brand_kit_id) {
      const { data } = await admin.from("brand_kits").select("*").eq("id", brand_kit_id).maybeSingle();
      kit = data;
    }

    const today = new Date().toISOString().slice(0, 10);
    const sys = `أنت Art Director خبير في البراندنج الموسمي والمناسبات. تكتب برومبتات صور احترافية بالإنجليزية مع عنوان عربي قصير لكل بطاقة. تلتزم بهوية البراند (ألوان/خطوط/أسلوب/نبرة) وتدمج إشارات موسمية ذكية بدون كليشيهات.`;
    const usr = `اليوم: ${today}
الموسم/السياق: ${season}
المناسبات المطلوبة (إن وُجدت): ${events.join(", ") || "اقترح من الموسم الحالي"}
عدد البطاقات: ${count}

${kit ? `Brand DNA:\n${JSON.stringify({
  name: kit.brand_name_en || kit.brand_name_ar,
  industry: kit.industry,
  slogan: kit.slogan,
  colors: kit.colors_json,
  typography: kit.typography_json,
  dna: kit.brand_dna_json,
}, null, 2)}` : "لا يوجد Brand Kit — استخدم نمطًا حديثًا نظيفًا."}

أعد JSON فقط بهذا الشكل:
{ "items": [ { "title_ar": "...", "occasion": "...", "platform_hint": "instagram|facebook|story|post", "size": "1080x1080", "prompt": "english prompt ...", "negative_prompt": "..." } ] }`;

    const { text, provider } = await callAI(ai, sys, usr);
    let parsed: any = {};
    try { parsed = extractJson(text); } catch { parsed = { items: [] }; }
    const items = (parsed.items || []).slice(0, count);

    let saved = 0;
    if (save && items.length) {
      const rows = items.map((it: any) => ({
        user_id: u.user.id,
        brand_kit_id: brand_kit_id || null,
        asset_type: "prompt",
        platform: it.platform_hint || null,
        title: it.title_ar || it.occasion || "موسمي",
        prompt: it.prompt || "",
        negative_prompt: it.negative_prompt || "",
        provider,
        size_width: parseInt(String(it.size || "1080x1080").split("x")[0], 10) || null,
        size_height: parseInt(String(it.size || "1080x1080").split("x")[1], 10) || null,
        status: "draft",
        metadata_json: { seasonal: true, occasion: it.occasion },
      }));
      const { error } = await admin.from("branding_assets").insert(rows);
      if (!error) saved = rows.length;
    }

    return jsonResponse({ ok: true, items, provider, saved });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message || String(e) });
  }
});
