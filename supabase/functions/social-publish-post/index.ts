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

async function samePlatformConnectedElsewhere(supabase: any, userId: string, platform: string, candidates: any[]) {
  const ids = candidates.map((c) => c.account_id || c.page_id).filter(Boolean);
  if (!ids.length) return false;
  const { data } = await supabase
    .from("social_platform_connections")
    .select("id")
    .eq("platform", platform)
    .eq("status", "connected")
    .neq("user_id", userId)
    .or(ids.map((id) => `account_id.eq.${id},page_id.eq.${id}`).join(","))
    .limit(1);
  return !!data?.length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: ue } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { post_id } = await req.json();
    if (!post_id) return jsonResponse({ error: "post_id required" });

    const { data: post } = await supabase.from("social_posts").select("*").eq("id", post_id).eq("user_id", user.id).single();
    if (!post) return jsonResponse({ error: "post not found" });
    if (post.approval_status !== "approved") return jsonResponse({ error: "المنشور يتطلب الموافقة قبل النشر" });

    const platforms: string[] = [...new Set((post.selected_platforms || []).map((p: string) => normalizePlatform(p)))];
    const content = post.generated_content || {};
    const media = await resolvePublishMedia(supabase, post.media || []);

    const { data: connections } = await supabase.from("social_platform_connections").select("*").eq("user_id", user.id);

    const results: any[] = [];
    for (const p of platforms) {
      const message = content[p] || content[platforms.find((x) => normalizePlatform(x) === p) || p] || content.facebook || content.facebook_page || content.instagram || content.text || content.body || content.default || "";
      const candidates = getConnectionCandidates(connections, p);
      const attempts: any[] = [];
      let published = false;

      if (!candidates.length) {
        const error = "المنصة غير مربوطة على نفس الحساب الذي أنشأ المنشور. اربطها من تبويب «ربط المنصات» ثم أنشئ/حدّث المنشور.";
        results.push({ platform: p, success: false, error });
        await supabase.from("social_publish_logs").insert({ user_id: user.id, post_id, platform: p, action: "publish", status: "failed", error_message: error });
        continue;
      }

      for (const conn of candidates) {
        try {
          const token = await decryptToken(conn.access_token_encrypted);
          if (!token) throw new Error("فشل فك تشفير التوكن. أعد ربط المنصة.");
          const result = await publishToPlatform(p, token, conn, message, media);
          published = true;
          results.push({ platform: p, success: true, platform_post_id: result.id, published_url: result.url, connection_id: conn.id });
          await markConnectionStatus(supabase, conn.id, true);
          await supabase.from("social_publish_logs").insert({
            user_id: user.id, post_id, platform: p, action: "publish", status: "success",
            platform_post_id: result.id, published_url: result.url,
            response_summary: result.raw || {},
          });
          break;
        } catch (e: any) {
          const msg = e.message || "فشل النشر";
          attempts.push({ connection_id: conn.id, status: conn.status, error: msg });
          console.error(`Publish failed [${p}] conn=${conn.id}:`, msg);
          if (isAuthOrPermissionError(msg)) await markConnectionStatus(supabase, conn.id, false, msg);
        }
      }

      if (!published) {
        const finalError = attempts.map((a) => a.error).filter(Boolean).join(" | ") || "فشل النشر";
        const linkedElsewhere = await samePlatformConnectedElsewhere(supabase, user.id, p, candidates);
        const error = linkedElsewhere
          ? `${finalError} — ملاحظة مهمة: يوجد ربط ناجح لنفس الصفحة على حساب دخول آخر داخل التطبيق. افتح نفس حساب الدخول الذي أنشأ هذا المنشور وأعد ربط المنصة عليه، أو أنشئ المنشور من الحساب الذي نجح فيه الاختبار.`
          : finalError;
        results.push({ platform: p, success: false, error, attempts });
        await supabase.from("social_publish_logs").insert({
          user_id: user.id, post_id, platform: p, action: "publish", status: "failed", error_message: error,
          response_summary: { attempts },
        });
      }
    }

    const okCount = results.filter(r => r.success).length;
    const failCount = results.length - okCount;
    const newStatus = failCount === 0 ? "published" : okCount === 0 ? "failed" : "partially_published";

    await supabase.from("social_posts").update({
      status: newStatus,
      published_at: okCount > 0 ? new Date().toISOString() : null,
    }).eq("id", post_id);

    return jsonResponse({ success: failCount === 0, results, status: newStatus });
  } catch (e: any) {
    console.error("publish-post error:", e);
    return jsonResponse({ error: e.message || "فشل النشر" });
  }
});
