// Public cron endpoint that publishes due scheduled posts.
// Triggered by pg_cron twice every minute. No user auth header required; we use service role.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, decryptToken } from "../_shared/social-engine.ts";
import { getConnectionCandidates, isAuthOrPermissionError, normalizePlatform, publishToPlatform, resolvePublishMedia } from "../_shared/social-publish.ts";

async function markConnectionStatus(supabase: any, connectionId: string, ok: boolean, error?: string) {
  await supabase.from("social_platform_connections").update({
    status: ok ? "connected" : "error",
    last_error: ok ? null : (error || "فشل النشر"),
    last_tested_at: new Date().toISOString(),
  }).eq("id", connectionId);
}

function nextRecurrence(current: Date, rule: any): Date | null {
  if (!rule || !rule.type || rule.type === "none") return null;
  const next = new Date(current);
  if (rule.type === "daily") next.setDate(next.getDate() + (rule.interval || 1));
  else if (rule.type === "weekly") next.setDate(next.getDate() + 7 * (rule.interval || 1));
  else if (rule.type === "monthly") next.setMonth(next.getMonth() + (rule.interval || 1));
  else if (rule.type === "every_n_days") next.setDate(next.getDate() + (rule.interval || 1));
  else return null;
  if (rule.ends_at && next > new Date(rule.ends_at)) return null;
  return next;
}

async function claimDuePosts(supabase: any, now: string) {
  const { data } = await supabase
    .from("social_posts")
    .select("*")
    .eq("status", "scheduled")
    .eq("approval_status", "approved")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  const claimed: any[] = [];
  for (const post of data || []) {
    const { data: row } = await supabase
      .from("social_posts")
      .update({ status: "publishing" })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("*")
      .maybeSingle();
    if (row) claimed.push({ ...post, status: "publishing" });
  }
  return claimed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    const due = await claimDuePosts(supabase, now);

    const results: any[] = [];
    for (const post of due || []) {
      const { data: connections } = await supabase.from("social_platform_connections").select("*").eq("user_id", post.user_id);

      const platforms: string[] = [...new Set((post.selected_platforms || []).map((p: string) => normalizePlatform(p)))];
      const content = post.generated_content || {};
      const media = await resolvePublishMedia(supabase, post.media || []);
      const platformResults: any[] = [];

      for (const p of platforms) {
        const candidates = getConnectionCandidates(connections, p);
        const attempts: any[] = [];
        let published = false;

        if (!candidates.length) {
          const error = "منصة غير مربوطة";
          platformResults.push({ platform: p, success: false, error });
          await supabase.from("social_publish_logs").insert({ user_id: post.user_id, post_id: post.id, platform: p, action: "publish", status: "failed", error_message: error });
          continue;
        }

        for (const conn of candidates) {
          try {
            const token = await decryptToken(conn.access_token_encrypted);
            if (!token) throw new Error("decrypt failed");
            const message = content[p] || content.facebook || content.facebook_page || content.instagram || content.text || content.body || content.default || "";
            const res = await publishToPlatform(p, token, conn, message, media);
            published = true;
            platformResults.push({ platform: p, success: true, id: res.id });
            await markConnectionStatus(supabase, conn.id, true);
            await supabase.from("social_publish_logs").insert({
              user_id: post.user_id, post_id: post.id, platform: p, action: "publish",
              status: "success", platform_post_id: res.id, published_url: res.url, response_summary: res.raw || {},
            });
            break;
          } catch (e: any) {
            const msg = e.message || "فشل النشر";
            attempts.push({ connection_id: conn.id, status: conn.status, error: msg });
            if (isAuthOrPermissionError(msg)) await markConnectionStatus(supabase, conn.id, false, msg);
          }
        }

        if (!published) {
          const error = attempts.map((a) => a.error).filter(Boolean).join(" | ") || "فشل النشر";
          platformResults.push({ platform: p, success: false, error, attempts });
          await supabase.from("social_publish_logs").insert({
            user_id: post.user_id, post_id: post.id, platform: p, action: "publish",
            status: "failed", error_message: error, response_summary: { attempts },
          });
        }
      }

      const ok = platformResults.filter(r => r.success).length;
      const fail = platformResults.length - ok;
      const newStatus = fail === 0 ? "published" : ok === 0 ? "failed" : "partially_published";

      // Recurring schedule
      const { data: sched } = await supabase.from("social_schedules").select("*").eq("post_id", post.id).maybeSingle();
      let rescheduled = false;
      if (sched && sched.recurrence_type && sched.recurrence_type !== "none") {
        const next = nextRecurrence(new Date(post.scheduled_at), {
          type: sched.recurrence_type,
          interval: sched.recurrence_interval,
          ends_at: sched.recurrence_ends_at,
        });
        if (next) {
          await supabase.from("social_posts").update({
            status: "scheduled", scheduled_at: next.toISOString(), published_at: null,
          }).eq("id", post.id);
          rescheduled = true;
        }
      }

      if (!rescheduled) {
        await supabase.from("social_posts").update({
          status: newStatus,
          published_at: ok > 0 ? new Date().toISOString() : null,
        }).eq("id", post.id);
      }

      results.push({ post_id: post.id, status: newStatus, platforms: platformResults });
    }

    return jsonResponse({ success: true, processed: results.length, results });
  } catch (e: any) {
    console.error("publish-cron error:", e);
    return jsonResponse({ error: e.message });
  }
});
