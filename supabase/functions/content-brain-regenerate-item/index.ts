import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { item_id, instruction } = await req.json();
    if (!item_id) return jsonResponse({ ok: false, error: "item_id required" }, 400);

    const { data: item } = await supabase.from("content_brain_items").select("*").eq("id", item_id).eq("user_id", user.id).single();
    if (!item) return jsonResponse({ ok: false, error: "item not found" }, 404);

    const { data: plan } = await supabase.from("content_brain_plans").select("*").eq("id", item.plan_id).single();

    const sys = `أنت كاتب محتوى عربي. أعد توليد منشور بناءً على البيانات الحالية والتعليمات. أعد JSON فقط.`;
    const usr = `أعد توليد هذا المنشور:
الفكرة الحالية: ${item.idea}
النص الحالي: ${item.draft_content}
المنصة: ${item.platform}
نوع المحتوى: ${item.content_type}
الهدف: ${item.objective}
تعليمات إضافية: ${instruction || "اجعله أقوى وأكثر جاذبية"}
سياق البراند: ${plan?.business_description || ""}

أعد JSON: { "hook":"", "draft_content":"", "cta":"", "hashtags":"", "image_prompt":"" }`;

    let next: any;
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      next = r.data;
    } catch (e: any) {
      return jsonResponse({ ok: false, error: `تعذر التحليل: ${e.message}` }, 200);
    }

    await supabase.from("content_brain_item_versions").insert({
      user_id: user.id, item_id, version_number: 1,
      old_data: item, new_data: next, change_reason: instruction || "regenerate",
    });

    await supabase.from("content_brain_items").update({
      hook: next.hook ?? item.hook,
      draft_content: next.draft_content ?? item.draft_content,
      cta: next.cta ?? item.cta,
      hashtags: next.hashtags ?? item.hashtags,
      image_prompt: next.image_prompt ?? item.image_prompt,
      approval_status: "needs_review",
    }).eq("id", item_id);

    return jsonResponse({ ok: true });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});
