import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, getAuthedUserAndAI } from "../_shared/social-engine.ts";

function normalizePlatform(platform?: string) {
  if (platform === "facebook") return "facebook_page";
  if (platform === "twitter") return "x";
  if (platform === "youtube") return "youtube_community";
  return platform || "facebook_page";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase } = await getAuthedUserAndAI(req);
    const { plan_id, mode = "draft", item_ids } = await req.json();
    // mode: 'draft' | 'needs_review' | 'scheduled'
    if (!plan_id) return jsonResponse({ ok: false, error: "plan_id required" }, 400);

    let q = supabase.from("content_brain_items").select("*").eq("plan_id", plan_id).eq("user_id", user.id).eq("approval_status", "approved");
    if (Array.isArray(item_ids) && item_ids.length) q = q.in("id", item_ids);
    const { data: items, error } = await q;
    if (error) throw error;
    if (!items?.length) return jsonResponse({ ok: false, error: "لا توجد عناصر معتمدة" });

    let converted = 0;
    let scheduled = 0;
    let skipped = 0;

    for (const it of items) {
      try {
        const scheduledAt = it.scheduled_date && it.scheduled_time
          ? new Date(`${it.scheduled_date}T${it.scheduled_time}:00`).toISOString()
          : (mode === "scheduled" ? new Date(Date.now() + (converted + 1) * 60 * 60 * 1000).toISOString() : null);

        const content = [it.hook, it.draft_content, it.cta, it.hashtags].filter(Boolean).join("\n\n");
        const platform = normalizePlatform(it.platform);
        const media = Array.isArray(it.uploaded_media) ? it.uploaded_media.filter((m: any) => m?.url || m?.path) : [];

        const { data: post, error: pe } = await supabase.from("social_posts").insert({
          user_id: user.id,
          title: it.idea || it.draft_content?.slice(0, 80) || "منشور من مخ الخطة",
          source_type: "content_brain",
          generated_content: {
            default: content,
            text: content,
            [platform]: content,
            hook: it.hook,
            cta: it.cta,
            hashtags: it.hashtags,
            image_prompt: it.image_prompt,
            video_prompt: it.video_prompt,
            content_type: it.content_type,
            objective: it.objective,
          },
          media,
          selected_platforms: [platform],
          status: mode === "scheduled" ? "scheduled" : "draft",
          approval_status: mode === "scheduled" ? "approved" : (mode === "needs_review" ? "needs_review" : "draft"),
          scheduled_at: scheduledAt,
        }).select().single();

        if (pe) { skipped++; continue; }

        await supabase.from("social_post_platforms").insert({
          post_id: post.id,
          user_id: user.id,
          platform,
          content,
          schedule_time: scheduledAt,
          status: mode === "scheduled" ? "scheduled" : "pending",
        });

        if (mode === "scheduled" && scheduledAt) {
          await supabase.from("social_schedules").upsert({
            post_id: post.id,
            user_id: user.id,
            schedule_type: "once",
            publish_at: scheduledAt,
            timezone: "Africa/Cairo",
            recurrence_type: "none",
            status: "active",
          }, { onConflict: "post_id" });
        }

        await supabase.from("content_brain_items").update({
          linked_post_id: post.id,
          schedule_status: mode === "scheduled" ? "scheduled" : "converted",
          approval_status: "converted_to_post",
        }).eq("id", it.id);

        converted++;
        if (mode === "scheduled") scheduled++;
      } catch {
        skipped++;
      }
    }

    await supabase.from("content_brain_executions").insert({
      user_id: user.id, plan_id, execution_type: mode,
      items_count: items.length, approved_count: items.length,
      converted_count: converted, scheduled_count: scheduled, skipped_count: skipped,
      status: "completed",
    });

    return jsonResponse({ ok: true, converted, scheduled, skipped });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});
