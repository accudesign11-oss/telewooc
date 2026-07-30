import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai } = await getAuthedUserAndAI(req);
    const { text, media = [], platform = "instagram", duration = "8 seconds" } = await req.json();
    const sys = "You are a senior video prompt engineer for Sora, Runway, Google Flow, Veo, Gemini and ChatGPT. Generate external video prompts only. Never say that you generated a video. Return JSON only.";
    const usr = `Create a production-ready English video generation prompt from this social post. Keep product identity faithful.\nPlatform: ${platform}\nDuration: ${duration}\nOriginal text: ${text || ""}\nReference media URLs: ${JSON.stringify(media).slice(0, 2000)}\n\nReturn JSON: {"prompt_en":"...", "brief_ar":"ملخص عربي قصير", "shots":["..."], "negative_prompt":"..."}`;
    const { text: out, provider } = await callAI(ai, sys, usr);
    let parsed: any = null;
    try {
      const m = out.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0].replace(/،/g, ",")) : null;
    } catch { parsed = null; }
    return jsonResponse({ ok: true, provider, result: parsed || { prompt_en: out.trim(), brief_ar: "برومبت فيديو جاهز", shots: [], negative_prompt: "" } });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message || "فشل توليد برومبت الفيديو" }, 200);
  }
});