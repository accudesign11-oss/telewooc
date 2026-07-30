import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

// Deterministic fallback: spread N posts across best hours (10, 13, 18, 21) starting from tomorrow
function fallbackSchedule(count: number, startFrom = new Date(Date.now() + 3600000)) {
  const bestHours = [10, 13, 18, 21];
  const out: string[] = [];
  const start = new Date(startFrom);
  start.setMinutes(0, 0, 0);
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / bestHours.length);
    const hour = bestHours[i % bestHours.length];
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    out.push(d.toISOString());
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const { post_ids = [], strategy = "smart", start_at, timezone = "Africa/Cairo" } = body;
    if (!Array.isArray(post_ids) || !post_ids.length) return jsonResponse({ ok: false, error: "post_ids مطلوبة" }, 200);

    const { data: posts } = await supabase
      .from("social_posts")
      .select("id,title,selected_platforms,generated_content,scheduled_at")
      .in("id", post_ids)
      .eq("user_id", user.id);
    if (!posts?.length) return jsonResponse({ ok: false, error: "لا توجد منشورات مطابقة" }, 200);

    const startFrom = start_at ? new Date(start_at) : new Date(Date.now() + 3600000);
    let plan: { post_id: string; scheduled_at: string; reason?: string }[] = [];

    if (strategy === "ai") {
      const sys = "أنت خبير جدولة سوشيال ميديا عربي. اقترح أفضل مواعيد نشر (تاريخ + ساعة) لكل منشور بناءً على المحتوى والمنصات وأنماط تفاعل الجمهور العربي (ذروة 10ص، 1ظ، 6م، 9م بتوقيت القاهرة). أعد JSON فقط.";
      const usr = `المنطقة الزمنية: ${timezone}\nابدأ من: ${startFrom.toISOString()}\nوزّع هذه المنشورات على ${Math.max(3, Math.ceil(posts.length / 2))} أيام قادمة مع تفادي تكرار نفس الساعة في اليوم:\n${JSON.stringify(posts.map((p: any) => ({ id: p.id, title: p.title, platforms: p.selected_platforms, snippet: (p.generated_content?.default || p.generated_content?.text || "").slice(0, 160) })))}\n\nأعد JSON: {"schedule":[{"post_id":"...","scheduled_at":"ISO8601","reason":"سبب مختصر"}]}`;
      try {
        const { text } = await callAI(ai, sys, usr);
        const parsed = extractJson(text);
        const arr = Array.isArray(parsed?.schedule) ? parsed.schedule : [];
        const seen = new Set<string>();
        for (const s of arr) {
          if (!s?.post_id || !s?.scheduled_at || seen.has(s.post_id)) continue;
          const t = new Date(s.scheduled_at);
          if (isNaN(t.getTime()) || t < new Date()) continue;
          seen.add(s.post_id);
          plan.push({ post_id: s.post_id, scheduled_at: t.toISOString(), reason: s.reason });
        }
      } catch (_) { /* fall through to fallback */ }
    }

    // Fill missing posts using deterministic fallback
    const missing = posts.filter((p: any) => !plan.find((x) => x.post_id === p.id));
    if (missing.length) {
      const times = fallbackSchedule(missing.length, startFrom);
      missing.forEach((p: any, i: number) => plan.push({ post_id: p.id, scheduled_at: times[i], reason: "توزيع ذكي على أفضل الساعات" }));
    }

    // Persist
    const applied: any[] = [];
    for (const item of plan) {
      const { error } = await supabase.from("social_posts").update({
        scheduled_at: item.scheduled_at,
        status: "scheduled",
        approval_status: "approved",
      }).eq("id", item.post_id).eq("user_id", user.id);
      if (!error) {
        await supabase.from("social_schedules").upsert({
          post_id: item.post_id, user_id: user.id, schedule_type: "once",
          publish_at: item.scheduled_at, timezone, recurrence_type: "none", status: "active",
        }, { onConflict: "post_id" });
        applied.push(item);
      }
    }

    return jsonResponse({ ok: true, applied, count: applied.length });
  } catch (e: any) {
    console.error("ai-optimize-schedule", e);
    return jsonResponse({ ok: false, error: e.message || "فشل التوزيع الذكي" }, 200);
  }
});