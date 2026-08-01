import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai } = await getAuthedUserAndAI(req);
    const { text, platform = "facebook", tone = "تسويقي عربي جذاب", objective = "إعادة نشر محسّنة" } = await req.json();
    if (!String(text || "").trim()) return jsonResponse({ ok: false, error: "النص مطلوب" }, 200);
    const sys = "أنت كاتب محتوى سوشيال عربي محترف. أعد صياغة المنشور بدون اختراع حقائق أو أسعار، واجعله جاهزاً للنشر. أعد JSON فقط.";
    const usr = `المنصة: ${platform}\nالنبرة: ${tone}\nالهدف: ${objective}\nالنص الأصلي:\n${text}\n\nأعد JSON: {"text":"النص العربي الجديد", "hook":"هوك قصير", "hashtags":"هاشتاجات مناسبة"}`;
    const { text: out, provider } = await callAI(ai, sys, usr);
    let parsed: any = null;
    try {
      const m = out.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0].replace(/،/g, ",")) : null;
    } catch { parsed = null; }
    return jsonResponse({ ok: true, provider, result: parsed || { text: out.trim(), hook: "", hashtags: "" } });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message || "فشل إعادة الصياغة" }, 200);
  }
});