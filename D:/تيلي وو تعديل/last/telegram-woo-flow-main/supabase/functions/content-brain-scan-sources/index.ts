import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, getAuthedUserAndAI, decryptToken } from "../_shared/social-engine.ts";

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 15000): Promise<any> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return { _error: `${r.status}` };
    return await r.json();
  } catch (e: any) { return { _error: e.message }; }
}

async function scanWordPress(siteUrl: string, username?: string, appPassword?: string) {
  if (!siteUrl) return null;
  const base = siteUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (username && appPassword) {
    headers["Authorization"] = `Basic ${btoa(`${username}:${appPassword}`)}`;
  }
  const [posts, pages, siteInfo] = await Promise.all([
    fetchJson(`${base}/wp-json/wp/v2/posts?per_page=10&_fields=id,title,excerpt,link,date`, { headers }),
    fetchJson(`${base}/wp-json/wp/v2/pages?per_page=8&_fields=id,title,excerpt,link`, { headers }),
    fetchJson(`${base}/wp-json`, { headers }),
  ]);
  return {
    site_name: siteInfo?.name || null,
    site_description: siteInfo?.description || null,
    posts: Array.isArray(posts) ? posts.slice(0, 10).map((p: any) => ({
      title: p.title?.rendered, excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, "").slice(0, 300), link: p.link,
    })) : [],
    pages: Array.isArray(pages) ? pages.slice(0, 8).map((p: any) => ({
      title: p.title?.rendered, excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, "").slice(0, 200), link: p.link,
    })) : [],
    error: (posts as any)?._error || null,
  };
}

async function scanWoo(supabase: any, userId: string) {
  const { data } = await supabase.from("settings").select("value").eq("user_id", userId).eq("key", "woocommerce").maybeSingle();
  const cfg = (data?.value as any) || {};
  if (!cfg.url || !cfg.consumer_key || !cfg.consumer_secret) return null;
  const auth = btoa(`${cfg.consumer_key}:${cfg.consumer_secret}`);
  const base = cfg.url.replace(/\/+$/, "");

  let products = await fetchJson(`${base}/wp-json/wc/v3/products?per_page=20&status=publish`, { headers: { Authorization: `Basic ${auth}` } });
  if (!Array.isArray(products)) {
    products = await fetchJson(`${base}/index.php?rest_route=/wc/v3/products&per_page=20&status=publish`, { headers: { Authorization: `Basic ${auth}` } });
  }

  if (!Array.isArray(products)) return { error: products?._error || "failed", count: 0, products: [] };
  return {
    count: products.length,
    products: products.slice(0, 20).map((p: any) => ({
      id: p.id, name: p.name, price: p.price, categories: (p.categories || []).map((c: any) => c.name),
      short_description: (p.short_description || "").replace(/<[^>]+>/g, "").slice(0, 200),
      image: p.images?.[0]?.src, link: p.permalink,
    })),
  };
}

async function scanSocialConnections(supabase: any, userId: string) {
  const { data: conns } = await supabase.from("social_platform_connections")
    .select("id, platform, account_id, page_id, account_name, page_name, access_token_encrypted, status").eq("user_id", userId).eq("status", "connected");
  const results: any[] = [];
  for (const c of conns || []) {
    try {
      if (c.platform === "facebook_page" && (c.page_id || c.account_id)) {
        const token = await decryptToken(c.access_token_encrypted);
        if (!token) { results.push({ platform: c.platform, name: c.account_name, error: "no token" }); continue; }
        const posts = await fetchJson(
          `https://graph.facebook.com/v21.0/${c.page_id || c.account_id}/posts?fields=message,created_time,permalink_url,full_picture&limit=25&access_token=${encodeURIComponent(token)}`
        );
        results.push({
          platform: "facebook", name: c.account_name,
          recent_posts: (posts?.data || []).map((p: any) => ({ message: p.message?.slice(0, 300), image: p.full_picture, link: p.permalink_url, created: p.created_time })).slice(0, 25),
          error: posts?._error || posts?.error?.message || null,
        });
      } else if (c.platform === "instagram" && c.account_id) {
        const token = await decryptToken(c.access_token_encrypted);
        if (!token) { results.push({ platform: c.platform, name: c.account_name, error: "no token" }); continue; }
        const media = await fetchJson(
          `https://graph.facebook.com/v21.0/${c.account_id}/media?fields=caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}`
        );
        results.push({
          platform: "instagram", name: c.account_name,
          recent_media: (media?.data || []).map((m: any) => ({ caption: m.caption?.slice(0, 300), type: m.media_type, url: m.thumbnail_url || m.media_url, permalink: m.permalink, likes: m.like_count, comments: m.comments_count })).slice(0, 25),
          error: media?._error || media?.error?.message || null,
        });
      } else {
        results.push({ platform: c.platform, name: c.account_name, note: "no scanner available" });
      }
    } catch (e: any) {
      results.push({ platform: c.platform, name: c.account_name, error: e.message });
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase } = await getAuthedUserAndAI(req);
    const { plan_id } = await req.json();
    if (!plan_id) return jsonResponse({ ok: false, error: "plan_id required" }, 400);
    const { data: plan } = await supabase.from("content_brain_plans").select("*").eq("id", plan_id).eq("user_id", user.id).single();
    if (!plan) return jsonResponse({ ok: false, error: "plan not found" }, 404);

    const [wp, woo, social] = await Promise.all([
      plan.wp_site_url || plan.website_url ? scanWordPress(plan.wp_site_url || plan.website_url, plan.wp_username, plan.wp_app_password) : null,
      plan.use_woocommerce ? scanWoo(supabase, user.id) : null,
      plan.use_social_scan ? scanSocialConnections(supabase, user.id) : null,
    ]);
    const scanned_context = { wp, woo, social, scanned_at: new Date().toISOString() };
    await supabase.from("content_brain_plans").update({ scanned_context }).eq("id", plan_id);
    return jsonResponse({ ok: true, scanned_context });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});
