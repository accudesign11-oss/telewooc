import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai } = await getAuthedUserAndAI(req);
    const { content, platform, product } = await req.json();
    if (!content) return jsonResponse({ error: "content required" });

    const sys = `أنت خبير تسويق سوشيال ميديا. قيّم قوة المنشور التالي وأرجع JSON فقط بدون أي نص آخر.`;
    const usr = `قيّم هذا المنشور على منصة ${platform || "عام"}:
"""
${content}
"""
${product ? `\nبيانات المنتج: ${JSON.stringify(product).slice(0, 1000)}` : ""}

أرجع JSON:
{
  "score": 0-100,
  "hook_strength": "ضعيف|متوسط|قوي",
  "cta_clarity": "ضعيف|متوسط|قوي",
  "emotional_appeal": "ضعيف|متوسط|قوي",
  "length_fit": "قصير|مناسب|طويل",
  "hashtags_quality": "ضعيف|متوسط|قوي",
  "issues": ["مشكلة 1", "مشكلة 2"],
  "improvements": ["تحسين 1", "تحسين 2"],
  "verdict": "ملخص في سطر واحد"
}`;

    const { text, provider } = await callAI(ai, sys, usr);
    let scored: any;
    try { scored = extractJson(text); } catch { scored = { score: 50, verdict: text.slice(0, 200) }; }
    return jsonResponse({ success: true, ...scored, provider });
  } catch (e: any) {
    return jsonResponse({ error: e.message || "فشل التقييم" });
  }
});
