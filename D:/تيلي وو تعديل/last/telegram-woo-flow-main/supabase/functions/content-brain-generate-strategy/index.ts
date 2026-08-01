import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { plan_id, adjustments } = await req.json();
    if (!plan_id) return jsonResponse({ ok: false, error: "plan_id required" }, 400);

    const { data: plan } = await supabase.from("content_brain_plans").select("*").eq("id", plan_id).eq("user_id", user.id).single();
    if (!plan) return jsonResponse({ ok: false, error: "plan not found" }, 404);

    const sys = `أنت خبير محتوى. تنشئ استراتيجية توزيع منشورات ذكية تتناسب مع الهدف والمدة والمنصات. أعد JSON فقط.`;
    const usr = `بناءً على التحليل التالي، أنشئ استراتيجية توزيع المحتوى:

التحليل: ${JSON.stringify(plan.analysis || {})}
الهدف: ${plan.goal}
المدة: ${plan.duration_days} يوم
المنصات: ${JSON.stringify(plan.selected_platforms || [])}
تفضيلات: ${JSON.stringify(plan.content_preferences || [])}
تردد النشر: ${plan.posting_frequency || "auto"}
تعديلات المستخدم: ${adjustments || "لا يوجد"}

أعد JSON بالشكل:
{
  "duration_days": 30,
  "total_posts": 24,
  "stories": 8,
  "reels": 6,
  "carousels": 4,
  "product_posts": 5,
  "offer_posts": 4,
  "trust_posts": 5,
  "educational_posts": 4,
  "brand_posts": 2,
  "whatsapp_messages": 4,
  "google_business_posts": 0,
  "best_days": ["السبت","الاثنين","الأربعاء"],
  "best_times": ["10:00","14:00","20:00"],
  "platform_distribution": { "facebook": 12, "instagram": 8, "tiktok": 4 },
  "reasoning": "سبب الاختيار في فقرة عربية"
}`;

    const { text } = await callAI(ai, sys, usr);
    let strategy: any;
    try { strategy = extractJson(text); } catch { return jsonResponse({ ok: false, error: "تعذر التحليل" }); }

    await supabase.from("content_brain_plans").update({ strategy, status: "strategy_ready" }).eq("id", plan_id);
    return jsonResponse({ ok: true, strategy });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});
