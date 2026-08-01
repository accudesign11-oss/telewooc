import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, decryptToken, getAuthedUserAndAI } from "../_shared/social-engine.ts";

async function graphGet(path: string, token: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`https://graph.facebook.com/v21.0/${path.replace(/^\//, "")}?${q.toString()}`, {
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data?.error?.message || `Graph ${res.status}`);
  return data;
}

function mediaFromFacebook(post: any) {
  const out: any[] = [];
  if (post.full_picture) out.push({ type: "image", url: post.full_picture });
  for (const att of post.attachments?.data || []) {
    const add = (a: any) => {
      const url = a?.media?.image?.src || a?.url;
      if (url) out.push({ type: String(a?.type || "image").includes("video") ? "video" : "image", url });
    };
    add(att);
    for (const sub of att.subattachments?.data || []) add(sub);
  }
  return out.filter((m, i, a) => m.url && a.findIndex((x) => x.url === m.url) === i).slice(0, 10);
}

function normalizeFacebook(post: any) {
  const reactions = post.insights?.data?.find((x: any) => x.name === "post_reactions_by_type_total")?.values?.[0]?.value || {};
  const likes = typeof reactions === "object" ? Object.values(reactions).reduce((a: any, b: any) => Number(a) + Number(b || 0), 0) : 0;
  return {
    id: post.id,
    text: post.message || "",
    media: mediaFromFacebook(post),
    stats: {
      likes,
      comments: 0,
      reach: post.insights?.data?.find((x: any) => x.name === "post_impressions")?.values?.[0]?.value || 0,
      engaged: post.insights?.data?.find((x: any) => x.name === "post_engaged_users")?.values?.[0]?.value || 0,
    },
    permalink: post.permalink_url,
    created_at: post.created_time,
    raw: post,
  };
}

function normalizeInstagram(m: any) {
  return {
    id: m.id,
    text: m.caption || "",
    media: [{ type: String(m.media_type || "").toLowerCase().includes("video") ? "video" : "image", url: m.thumbnail_url || m.media_url }].filter((x) => x.url),
    stats: { likes: m.like_count || 0, comments: m.comments_count || 0, reach: 0 },
    permalink: m.permalink,
    created_at: m.timestamp,
    raw: m,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const { connection_id, platform, limit = 25, after } = body;
    if (!connection_id) return jsonResponse({ ok: false, error: "connection_id required" }, 200);

    const { data: conn } = await supabase.from("social_platform_connections").select("*").eq("id", connection_id).eq("user_id", user.id).single();
    if (!conn) return jsonResponse({ ok: false, error: "connection not found" }, 200);
    const token = await decryptToken(conn.access_token_encrypted);
    if (!token) return jsonResponse({ ok: false, error: "فشل فك تشفير التوكن. أعد ربط المنصة." }, 200);

    const target = platform || (conn.platform === "facebook_page" ? "facebook" : conn.platform);
    let data: any;
    let posts: any[] = [];
    if (target === "facebook" || conn.platform === "facebook_page") {
      const pageId = conn.page_id || conn.account_id;
      try {
        data = await graphGet(`${pageId}/posts`, token, {
          fields: "id,message,created_time,permalink_url,full_picture,attachments{media,subattachments,type,url},insights.metric(post_impressions,post_engaged_users,post_reactions_by_type_total)",
          limit: String(Math.min(Number(limit) || 25, 100)),
          ...(after ? { after } : {}),
        });
      } catch {
        data = await graphGet(`${pageId}/posts`, token, {
          fields: "id,message,created_time,permalink_url,full_picture,attachments{media,subattachments,type,url}",
          limit: String(Math.min(Number(limit) || 25, 100)),
          ...(after ? { after } : {}),
        });
      }
      posts = (data.data || []).map(normalizeFacebook);
    } else if (target === "instagram" || conn.platform === "instagram") {
      const igId = conn.account_id;
      data = await graphGet(`${igId}/media`, token, {
        fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        limit: String(Math.min(Number(limit) || 25, 100)),
        ...(after ? { after } : {}),
      });
      posts = (data.data || []).map(normalizeInstagram);
    } else {
      return jsonResponse({ ok: false, error: "يدعم الجلب حالياً Facebook و Instagram فقط" }, 200);
    }

    for (const post of posts) {
      await supabase.from("social_page_posts_cache").upsert({
        user_id: user.id,
        connection_id: conn.id,
        platform: target === "facebook" ? "facebook" : "instagram",
        external_post_id: post.id,
        payload: post,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "user_id,connection_id,platform,external_post_id" });
    }

    return jsonResponse({ ok: true, posts, paging: data.paging || null });
  } catch (e: any) {
    console.error("fetch-page-posts", e);
    return jsonResponse({ ok: false, error: e.message || "فشل جلب منشورات الصفحة" }, 200);
  }
});