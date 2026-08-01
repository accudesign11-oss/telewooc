import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { name, days = 7, posts_per_day = 1, niche, tone, platforms } = await req.json();
    if (!niche) return jsonResponse({ error: "niche required" });
    const total = days * posts_per_day;
    const platformList: string[] = Array.isArray(platforms) && platforms.length ? platforms : ["facebook_page"];

    const sys = `أنت خبير تسويق سوشيال ميديا عربي. تنتج خطط محتوى متنوعة (عرض/تعليمي/قصة عميل/Behind the scenes/سؤال تفاعلي/شهادة/عرض محدود) بدون تكرار.`;
    const usr = `أنشئ خطة محتوى عربية من ${total} عنصر موزعة على ${days} يوم (${posts_per_day} يوميًا).
النبرة: ${tone}
المنصات المتاحة: ${platformList.join(", ")} (وزّع العناصر عليها بالتناوب).
وصف النشاط/المنتجات/الجمهور:
${niche}

أعد JSON فقط بالشكل:
{ "items": [ { "day": 1, "slot": 1, "platform": "facebook_page", "content_type": "عرض/تعليمي/قصة/سؤال/شهادة", "goal": "Awareness/Engagement/Sales", "idea": "ملخص الفكرة في سطر", "draft_content": "نص المنشور الفعلي جاهز للنشر مع إيموجي", "cta": "Call to action", "hashtags": "#tag1 #tag2", "image_prompt": "وصف صورة مقترحة بالإنجليزية" } ] }`;

    const { text } = await callAI(ai, sys, usr);
    let parsed: any;
    try { parsed = extractJson(text); } catch { return jsonResponse({ error: "تعذر تحليل خطة الذكاء الاصطناعي" }); }
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    if (!items.length) return jsonResponse({ error: "لم تُولَّد عناصر" });

    const { data: plan, error: pe } = await supabase.from("content_plans").insert({
      user_id: user.id,
      name: name || "خطة محتوى",
      goal: "mixed",
      duration: `${days} days`,
      platforms: platformList,
      sources: { niche },
      settings: { tone, posts_per_day },
      status: "active",
    }).select().single();
    if (pe) throw pe;

    const now = new Date();
    const rows = items.map((it: any, idx: number) => {
      const day = Math.max(1, +it.day || Math.floor(idx / posts_per_day) + 1);
      const slot = Math.max(1, +it.slot || (idx % posts_per_day) + 1);
      const dt = new Date(now);
      dt.setDate(dt.getDate() + (day - 1));
      const hour = 10 + (slot - 1) * 4;
      return {
        plan_id: plan.id, user_id: user.id,
        date: dt.toISOString().slice(0, 10),
        time: `${String(hour).padStart(2, "0")}:00:00`,
        platform: it.platform || platformList[idx % platformList.length],
        content_type: it.content_type || null,
        goal: it.goal || null,
        idea: it.idea || null,
        draft_content: it.draft_content || it.idea || "",
        cta: it.cta || null,
        hashtags: it.hashtags || null,
        image_prompt: it.image_prompt || null,
        status: "pending",
      };
    });

    const { error: ie } = await supabase.from("content_plan_items").insert(rows);
    if (ie) throw ie;

    return jsonResponse({ success: true, plan_id: plan.id, items_count: rows.length });
  } catch (e: any) {
    console.error("generate-plan error:", e);
    return jsonResponse({ error: e.message || "فشل التوليد" });
  }
});
