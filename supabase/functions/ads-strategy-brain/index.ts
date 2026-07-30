import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI, decryptToken } from "../_shared/social-engine.ts";

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 25000) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { _error: data?.message || data?.error?.message || `HTTP ${res.status}` };
    return data;
  } catch (e: any) {
    return { _error: e.message };
  }
}

async function graph(path: string, token: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, access_token: token });
  return await fetchJson(`https://graph.facebook.com/v21.0/${path.replace(/^\//, "")}?${q.toString()}`);
}

async function collectSocial(supabase: any, userId: string, connectionIds: string[]) {
  let q = supabase.from("social_platform_connections").select("*").eq("user_id", userId).in("platform", ["facebook_page", "instagram"]);
  if (connectionIds?.length) q = q.in("id", connectionIds);
  const { data: conns } = await q;
  const out: any[] = [];
  for (const c of conns || []) {
    const token = await decryptToken(c.access_token_encrypted);
    if (!token) continue;
    if (c.platform === "facebook_page") {
      const d = await graph(`${c.page_id || c.account_id}/posts`, token, { fields: "id,message,created_time,permalink_url,full_picture", limit: "50" });
      out.push({ platform: "facebook", account: c.account_name, posts: (d.data || []).map((p: any) => ({ id: p.id, text: p.message, image: p.full_picture, link: p.permalink_url, created_at: p.created_time })) });
    }
    if (c.platform === "instagram") {
      const d = await graph(`${c.account_id}/media`, token, { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count", limit: "50" });
      out.push({ platform: "instagram", account: c.account_name, posts: (d.data || []).map((p: any) => ({ id: p.id, text: p.caption, image: p.thumbnail_url || p.media_url, link: p.permalink, likes: p.like_count, comments: p.comments_count, created_at: p.timestamp })) });
    }
  }
  return out;
}

async function collectWoo(supabase: any, userId: string) {
  const { data } = await supabase.from("settings").select("value").eq("user_id", userId).eq("key", "woocommerce").maybeSingle();
  const cfg = (data?.value as any) || {};
  if (!cfg.url || !cfg.consumer_key || !cfg.consumer_secret) return { available: false, products: [], orders: [] };
  const headers = { Authorization: `Basic ${btoa(`${cfg.consumer_key}:${cfg.consumer_secret}`)}` };
  const base = cfg.url.replace(/\/+$/, "");

  let products = await fetchJson(`${base}/wp-json/wc/v3/products?per_page=50&status=publish&orderby=popularity`, { headers });
  if (!Array.isArray(products)) {
    products = await fetchJson(`${base}/index.php?rest_route=/wc/v3/products&per_page=50&status=publish&orderby=popularity`, { headers });
  }

  let orders = await fetchJson(`${base}/wp-json/wc/v3/orders?per_page=50&orderby=date&order=desc`, { headers });
  if (!Array.isArray(orders)) {
    orders = await fetchJson(`${base}/index.php?rest_route=/wc/v3/orders&per_page=50&orderby=date&order=desc`, { headers });
  }

  return {
    available: Array.isArray(products),
    products: Array.isArray(products) ? products.map((p: any) => ({ id: p.id, name: p.name, price: p.price, total_sales: p.total_sales, categories: (p.categories || []).map((c: any) => c.name), link: p.permalink, image: p.images?.[0]?.src })).slice(0, 50) : [],
    orders: Array.isArray(orders) ? orders.map((o: any) => ({ id: o.id, total: o.total, status: o.status, items: (o.line_items || []).map((i: any) => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, total: i.total })) })).slice(0, 50) : [],
    error: (products as any)?._error || (orders as any)?._error || null,
  };
}

async function collectWebsite(url: string) {
  if (!url) return null;
  const base = url.replace(/\/+$/, "");
  const [wp, posts, pages] = await Promise.all([
    fetchJson(`${base}/wp-json`),
    fetchJson(`${base}/wp-json/wp/v2/posts?per_page=5&_fields=title,excerpt,link,date`),
    fetchJson(`${base}/wp-json/wp/v2/pages?per_page=5&_fields=title,excerpt,link`),
  ]);

  if (wp && !wp._error && wp.name) {
    return {
      site_name: wp.name,
      description: wp.description,
      posts: Array.isArray(posts) ? posts.map((p: any) => ({ title: p.title?.rendered, excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, "").slice(0, 200), link: p.link })).slice(0, 5) : [],
      pages: Array.isArray(pages) ? pages.map((p: any) => ({ title: p.title?.rendered, excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, "").slice(0, 200), link: p.link })).slice(0, 5) : [],
      error: null,
    };
  }

  // Fallback for non-WordPress or blocked websites
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      return {
        site_name: titleMatch?.[1]?.trim() || url,
        description: descMatch?.[1]?.trim() || "",
        posts: [],
        pages: [],
        error: null,
      };
    }
  } catch (_) { /* ignore */ }

  return { site_name: url, description: "", posts: [], pages: [], error: wp?._error || null };
}

function scoreProducts(woo: any, social: any[]) {
  const engagementText = JSON.stringify(social).toLowerCase();
  return (woo.products || []).map((p: any) => {
    const mentions = p.name ? (engagementText.match(new RegExp(String(p.name).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
    const sales = Number(p.total_sales || 0);
    return { ...p, score: sales * 3 + mentions * 5 + (p.image ? 2 : 0) };
  }).sort((a: any, b: any) => b.score - a.score).slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const { plan_id, sources = {}, name, business_description, website_url, facebook_page_url, product_url, budget, currency, country } = body;

    let plan: any = null;
    if (plan_id) {
      const { data } = await supabase.from("content_brain_plans").select("*").eq("id", plan_id).eq("user_id", user.id).single();
      plan = data;
    }

    const sourceConfig = {
      ...(plan?.sources || {}),
      ...sources,
      website_url: sources.website_url || website_url || plan?.website_url,
      business_description: business_description || plan?.business_description,
      facebook_page_url: sources.facebook_page_url || facebook_page_url || plan?.sources?.facebook_page_url,
      product_url: sources.product_url || product_url || plan?.sources?.product_url,
      budget: sources.budget || budget || plan?.sources?.budget || null,
      currency: sources.currency || currency || plan?.sources?.currency || "USD",
      country: sources.country || country || plan?.sources?.country || "",
    };

    const [social, woo, website] = await Promise.all([
      collectSocial(supabase, user.id, sourceConfig.connection_ids || []),
      sourceConfig.use_woocommerce === false ? Promise.resolve({ available: false, products: [], orders: [] }) : collectWoo(supabase, user.id),
      sourceConfig.website_url ? collectWebsite(sourceConfig.website_url) : Promise.resolve(null),
    ]);
    const topProducts = scoreProducts(woo, social);

    // Optional: fetch external product page text if provided
    let extProduct: any = null;
    if (sourceConfig.product_url) {
      try {
        const r = await fetch(sourceConfig.product_url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0 TeleWooAds/1.0" } });
        if (r.ok) {
          const html = await r.text();
          extProduct = {
            url: sourceConfig.product_url,
            text: html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000),
          };
        }
      } catch { /* ignore */ }
    }

    const sys = `أنت مدير تسويق أداء Performance Marketing خبير في Facebook/Instagram Ads Manager. مهمتك: بناء استراتيجية إعلانات ممولة عملية جاهزة للتنفيذ مباشرة داخل Ads Manager بناءً على البيانات الحقيقية. لا تخترع أرقامًا. إذا كانت الميزانية غير محددة اقترح ميزانية معقولة بناءً على البلد والفئة. أعد JSON صارم فقط، بدون markdown.`;
    const usr = `بيانات النشاط:\n${JSON.stringify({
      name: name || plan?.name,
      business_description: sourceConfig.business_description,
      selected_platforms: plan?.selected_platforms || ["facebook", "instagram"],
      country: sourceConfig.country,
      currency: sourceConfig.currency,
      budget_user_input: sourceConfig.budget,
      facebook_page_url: sourceConfig.facebook_page_url,
      external_product: extProduct,
      website,
      woo: { products: woo.products?.slice(0, 30), orders: woo.orders?.slice(0, 20), error: woo.error },
      social,
      scored_products: topProducts,
    }).slice(0, 18000)}

قواعد صارمة:
- اقترح **منتجًا موصى به رئيسيًا** مع سبب واضح (why) وإشارة سوق (market_signal) ومستوى المنافسة.
- اقترح **منتجات بديلة** أفضل إن رأيت فرصة سوق أقوى، مع دليل من البيانات.
- حدد الجمهور المستهدف بدقة: عمر (min/max)، جنس، مواقع جغرافية (مدن/دول)، اهتمامات تُطابق خيارات Facebook Ads Manager، سلوكيات.
- ميزانية: يومي، إجمالي، مدة، تقسيم على مراحل القمع (warm/cold/retargeting).
- إن كانت الصفحة ضعيفة (تفاعل قليل)، ابدأ بـ **warm_up_strategy** قبل الحملات المدفوعة.
- step_by_step_plan: خطوات مرقّمة عملية جاهزة للتنفيذ.
- facebook_setup_guide: كل خانة في Ads Manager مع القيمة المقترحة.

أعد JSON بهذا الشكل الكامل فقط:
{
  "recommended_products": [{"id":"...", "name":"...", "why":"...", "hero_angle":"...", "expected_ctr_band":"..."}],
  "alternative_products": [{"name":"...", "why_better":"...", "evidence":"...", "market_demand":"high|medium|low"}],
  "market_analysis": {"demand":"high|medium|low", "competition":"high|medium|low", "trend":"rising|stable|declining", "notes":"..."},
  "audiences": [{"name":"...", "age_min": 18, "age_max": 45, "gender":"all|male|female", "locations":["..."], "interests":["..."], "behaviors":["..."], "detailed_targeting_hint":"...", "lookalike_seed":"..."}],
  "budget": {"currency":"USD", "daily_min": 0, "daily_recommended": 0, "total_recommended": 0, "duration_days": 14, "split_by_stage":{"awareness": 40, "consideration": 30, "conversion": 30}, "notes":"..."},
  "funnel": [{"stage":"awareness", "objective":"...", "placements":["..."], "creative_type":"...", "kpis":["..."]}],
  "warm_up_strategy": {"needed": true, "why":"...", "actions":["..."], "duration_days": 7},
  "step_by_step_plan": [{"step": 1, "title":"...", "why":"...", "actions":["..."], "expected_outcome":"..."}],
  "facebook_setup_guide": {"campaign_objective":"...", "buying_type":"AUCTION", "placements":["..."], "optimization_event":"...", "bid_strategy":"...", "special_categories":"none|credit|employment|housing|social_issues", "conversion_location":"website|profile|messenger"},
  "creatives": [{"product_id":"...", "format":"image", "hook":"...", "primary_text":"...", "headline":"...", "cta":"...", "media_prompt_en":"...", "media_prompt_ar":"..."}],
  "retargeting": [{"segment":"...", "window_days": 7, "message":"..."}],
  "schedule": [{"day":"...", "time":"20:00", "product_id":"...", "platform":"facebook", "creative_ref":"..."}],
  "kpis": {"cpm":"...", "cpc":"...", "ctr":"...", "roas_target":"...", "cpa_target":"..."},
  "pros": ["..."], "cons": ["..."], "risks": ["..."], "mitigations": ["..."]
}`;

    let strategy: any;
    let provider = "fallback";
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      strategy = r.data;
      provider = r.provider;
    } catch (e: any) {
      return jsonResponse({ ok: false, error: `تعذر بناء الاستراتيجية: ${e.message}` }, 200);
    }

    const planPayload = {
      user_id: user.id,
      name: name || plan?.name || `استراتيجية إعلانات ${new Date().toLocaleDateString("ar-EG")}`,
      business_description: sourceConfig.business_description || "",
      website_url: sourceConfig.website_url || null,
      goal: "paid_ads",
      selected_platforms: plan?.selected_platforms || ["facebook", "instagram"],
      content_preferences: ["إعلانات ممولة", "برومبتات وسائط", "Retargeting"],
      posting_frequency: "campaign",
      plan_type: "ads_strategy",
      sources: sourceConfig,
      ads_strategy: { ...strategy, provider, collected: { social_count: social.length, products_count: woo.products?.length || 0, website_ok: !!website } },
      strategy,
      analysis: { top_products: topProducts, social_summary: social.map((s) => ({ platform: s.platform, account: s.account, posts: s.posts?.length || 0 })), website },
      status: "ads_strategy_ready",
    };

    let saved: any;
    if (plan?.id) {
      const { data, error } = await supabase.from("content_brain_plans").update(planPayload).eq("id", plan.id).select().single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase.from("content_brain_plans").insert(planPayload).select().single();
      if (error) throw error;
      saved = data;
    }

    await supabase.from("content_brain_items").delete().eq("plan_id", saved.id).eq("user_id", user.id).contains("ads_metadata", { source: "ads_strategy" });
    const today = new Date();
    const itemRows = (strategy.creatives || []).slice(0, 20).map((c: any, idx: number) => {
      const sch = strategy.schedule?.[idx] || {};
      const d = new Date(today); d.setDate(today.getDate() + idx);
      return {
        user_id: user.id,
        plan_id: saved.id,
        item_index: idx + 1,
        scheduled_date: d.toISOString().slice(0, 10),
        day_name: sch.day || d.toLocaleDateString("ar-EG", { weekday: "long" }),
        scheduled_time: sch.time || "20:00",
        platform: sch.platform || "facebook_page",
        content_type: c.format || "image",
        objective: "paid_ads",
        idea: c.headline || c.hook || "إعلان ممول",
        product_or_service: c.product_id || null,
        hook: c.hook || "",
        draft_content: c.primary_text || "",
        cta: c.cta || "",
        media_type: c.format || "image",
        needs_image: c.format !== "video",
        needs_video: c.format === "video",
        image_prompt: c.format === "video" ? "" : c.media_prompt_en,
        video_prompt: c.format === "video" ? c.media_prompt_en : "",
        design_notes: c.media_prompt_ar || "",
        priority: idx < 3 ? "high" : "medium",
        approval_status: "suggested",
        ads_metadata: { source: "ads_strategy", creative: c },
      };
    });
    if (itemRows.length) await supabase.from("content_brain_items").insert(itemRows);

    return jsonResponse({ ok: true, plan_id: saved.id, provider, strategy, collected: { social, woo: { products: woo.products?.length || 0, orders: woo.orders?.length || 0 }, website } });
  } catch (e: any) {
    console.error("ads-strategy-brain", e);
    return jsonResponse({ ok: false, error: e.message || "فشل بناء استراتيجية الإعلانات" }, 200);
  }
});