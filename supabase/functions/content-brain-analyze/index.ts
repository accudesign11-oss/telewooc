import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI, decryptToken } from "../_shared/social-engine.ts";

async function fetchSafe(url: string, init?: RequestInit, ms = 15000) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    if (!r.ok) return { _error: `HTTP ${r.status}` } as any;
    return await r.json();
  } catch (e: any) { return { _error: e.message } as any; }
}

async function fetchText(url: string, ms = 12000): Promise<string> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "User-Agent": "Mozilla/5.0 TeleWooBrain/1.0" } });
    if (!r.ok) return "";
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
  } catch { return ""; }
}

async function deepScan(supabase: any, userId: string, plan: any) {
  const out: any = { scanned_at: new Date().toISOString(), wp: null, woo: null, social: [], website_text: null };

  // Homepage / website plain-text
  const siteUrl = plan.wp_site_url || plan.website_url;
  if (siteUrl) {
    out.website_text = await fetchText(siteUrl);
    const base = siteUrl.replace(/\/+$/, "");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (plan.wp_username && plan.wp_app_password) headers["Authorization"] = `Basic ${btoa(`${plan.wp_username}:${plan.wp_app_password}`)}`;
    const [posts, pages, info] = await Promise.all([
      fetchSafe(`${base}/wp-json/wp/v2/posts?per_page=10&_fields=title,content,excerpt,link,date`, { headers }),
      fetchSafe(`${base}/wp-json/wp/v2/pages?per_page=10&_fields=title,content,excerpt,link`, { headers }),
      fetchSafe(`${base}/wp-json`, { headers }),
    ]);
    out.wp = {
      site_name: info?.name || null,
      site_description: info?.description || null,
      posts: Array.isArray(posts) ? posts.slice(0, 10).map((p: any) => ({
        title: p.title?.rendered, text: (p.content?.rendered || p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").slice(0, 1500), link: p.link,
      })) : [],
      pages: Array.isArray(pages) ? pages.slice(0, 10).map((p: any) => ({
        title: p.title?.rendered, text: (p.content?.rendered || p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").slice(0, 1500), link: p.link,
      })) : [],
    };
  }

  // WooCommerce
  if (plan.use_woocommerce) {
    const { data: cfgRow } = await supabase.from("settings").select("value").eq("user_id", userId).eq("key", "woocommerce").maybeSingle();
    const cfg = (cfgRow?.value as any) || {};
    if (cfg.url && cfg.consumer_key && cfg.consumer_secret) {
      const auth = btoa(`${cfg.consumer_key}:${cfg.consumer_secret}`);
      const products = await fetchSafe(`${cfg.url.replace(/\/+$/, "")}/wp-json/wc/v3/products?per_page=25&status=publish&orderby=popularity`, { headers: { Authorization: `Basic ${auth}` } });
      out.woo = {
        count: Array.isArray(products) ? products.length : 0,
        products: Array.isArray(products) ? products.slice(0, 25).map((p: any) => ({
          id: p.id, name: p.name, price: p.price, total_sales: p.total_sales,
          categories: (p.categories || []).map((c: any) => c.name),
          short_description: (p.short_description || "").replace(/<[^>]+>/g, "").slice(0, 400),
          description: (p.description || "").replace(/<[^>]+>/g, "").slice(0, 800),
          image: p.images?.[0]?.src, link: p.permalink,
        })) : [],
      };
    }
  }

  // Social pages
  if (plan.use_social_scan) {
    const { data: conns } = await supabase.from("social_platform_connections")
      .select("id, platform, account_id, page_id, account_name, page_name, access_token_encrypted, status")
      .eq("user_id", userId).eq("status", "connected");
    
    if (conns?.length) {
      const socialResults = await Promise.all((conns || []).map(async (c: any) => {
        try {
          const token = await decryptToken(c.access_token_encrypted);
          if (!token) return null;
          if (c.platform === "facebook_page") {
            const d = await fetchSafe(`https://graph.facebook.com/v21.0/${c.page_id || c.account_id}/posts?fields=message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true)&limit=15&access_token=${encodeURIComponent(token)}`, {}, 8000);
            return {
              platform: "facebook", name: c.account_name || c.page_name,
              posts: (d?.data || []).slice(0, 15).map((p: any) => ({
                text: (p.message || "").slice(0, 400), image: p.full_picture, link: p.permalink_url,
                created: p.created_time, likes: p.likes?.summary?.total_count || 0, comments: p.comments?.summary?.total_count || 0,
              })),
            };
          } else if (c.platform === "instagram") {
            const d = await fetchSafe(`https://graph.facebook.com/v21.0/${c.account_id}/media?fields=caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=15&access_token=${encodeURIComponent(token)}`, {}, 8000);
            return {
              platform: "instagram", name: c.account_name,
              posts: (d?.data || []).slice(0, 15).map((m: any) => ({
                text: (m.caption || "").slice(0, 400), image: m.thumbnail_url || m.media_url, link: m.permalink,
                created: m.timestamp, likes: m.like_count || 0, comments: m.comments_count || 0, type: m.media_type,
              })),
            };
          }
        } catch { return null; }
        return null;
      }));
      out.social = socialResults.filter(Boolean);
    }
  }
  return out;
}

function fallbackAnalysis(plan: any, scanned: any) {
  const products = scanned?.woo?.products || [];
  const socialPosts = (scanned?.social || []).flatMap((s: any) => s.posts || []);
  const platforms = plan.selected_platforms?.length ? plan.selected_platforms : ["facebook", "instagram"];
  const days = plan.duration_days || 30;
  const posts = Math.max(12, Math.round(days * 0.7));
  return {
    summary: `تحليل تلقائي مبسط — تم مسح ${products.length} منتج و${socialPosts.length} منشور سابق. AI غير متاح حالياً؛ يمكنك تعديل التحليل يدوياً.`,
    business_type: plan.business_description?.slice(0, 80) || "غير محدد",
    strengths: products.length ? ["يوجد كتالوج منتجات نشط", "بيانات متجر متاحة للربط"] : ["حضور رقمي أساسي"],
    weaknesses: socialPosts.length < 5 ? ["قلة نشاط الصفحات الاجتماعية"] : ["يحتاج تنويع في نوع المحتوى"],
    opportunities: ["إعادة تقديم المنتجات الأكثر مبيعاً", "بناء ثقة عبر محتوى تعليمي"],
    focus_areas: ["محتوى منتجات", "بناء ثقة", "عروض"],
    target_audience: "الجمهور الحالي الذي يتفاعل مع صفحاتك",
    communication_style: "ودّي، مباشر، عربي فصيح مبسط",
    best_platforms: platforms,
    best_content_types: ["image", "reel", "text", "carousel"],
    warnings: ["هذا تحليل تلقائي — راجعه قبل الاستخدام"],
    quantitative_recommendations: {
      reels: Math.round(posts * 0.25),
      videos: Math.round(posts * 0.10),
      images: Math.round(posts * 0.35),
      texts: Math.round(posts * 0.15),
      carousels: Math.round(posts * 0.10),
      branding: Math.round(posts * 0.05),
      total: posts,
    },
    recommendations: [
      "ركّز على أفضل 3 منتجات من ناحية المبيعات في أول أسبوعين",
      "أضف Reel واحد أسبوعياً على الأقل لزيادة الوصول",
      "استخدم Stories يومياً للتفاعل السريع",
    ],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { plan_id } = await req.json();
    if (!plan_id) return jsonResponse({ ok: false, error: "plan_id required" }, 400);

    const { data: plan, error } = await supabase
      .from("content_brain_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .single();
    if (error || !plan) return jsonResponse({ ok: false, error: "plan not found" }, 404);

    // Step 1: deep scan sources
    const deep = await deepScan(supabase, user.id, plan);

    let brandContext = "";
    if (plan.brand_kit_id) {
      const { data: bk } = await supabase.from("brand_kits").select("*").eq("id", plan.brand_kit_id).maybeSingle();
      if (bk) brandContext = `\nBrand Kit:\n- اسم: ${bk.brand_name || ""}\n- نبرة: ${bk.tone || ""}\n- جمهور: ${bk.target_audience || ""}\n- قيم: ${bk.brand_values || ""}\n- USP: ${bk.unique_selling_points || ""}`;
    }

    const totalPosts = Math.max(12, Math.round((plan.duration_days || 30) * 0.7));
    const sys = `أنت خبير استراتيجي تسويق رقمي عربي. تحلل البراند والمنتج والجمهور وتعطي توصيات عملية بأرقام واضحة. لا تخترع أسعارًا. أعد JSON فقط.`;
    const usr = `حلل النشاط التالي بناءً على المصادر المُلتقطة فعلياً (لا تخترع):

اسم الخطة: ${plan.name}
وصف النشاط: ${plan.business_description || "غير محدد"}
الهدف التسويقي: ${plan.goal || "mixed"}
المدة: ${plan.duration_days} يوم
المنصات المختارة: ${JSON.stringify(plan.selected_platforms || [])}
تفضيلات المحتوى: ${JSON.stringify(plan.content_preferences || [])}
ملاحظات: ${plan.notes || "—"}
${brandContext}

نص الصفحة الرئيسية:
${(deep.website_text || "—").slice(0, 2000)}

محتوى WordPress (${deep.wp?.posts?.length || 0} منشور، ${deep.wp?.pages?.length || 0} صفحة):
${JSON.stringify({ posts: deep.wp?.posts?.slice(0, 5), pages: deep.wp?.pages?.slice(0, 5) }).slice(0, 3000)}

منتجات WooCommerce (${deep.woo?.count || 0}):
${JSON.stringify(deep.woo?.products?.slice(0, 15) || []).slice(0, 3500)}

منشورات سوشيال سابقة (${(deep.social || []).flatMap((s: any) => s.posts || []).length}):
${JSON.stringify((deep.social || []).map((s: any) => ({ platform: s.platform, name: s.name, sample: s.posts?.slice(0, 8) }))).slice(0, 4000)}

أعد JSON بالشكل الحرفي التالي (كل الحقول عربي ما عدا الأرقام):
{
  "summary": "ملخص التحليل من قراءة المصادر الحقيقية في فقرة قصيرة",
  "business_type": "نوع النشاط",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "..."],
  "weaknesses": ["نقطة ضعف 1", "..."],
  "opportunities": ["فرصة 1", "..."],
  "focus_areas": ["على أي شيء يجب التركيز في الفترة القادمة"],
  "target_audience": "وصف الجمهور المستهدف",
  "communication_style": "وصف الأسلوب المناسب",
  "best_platforms": ["facebook","instagram",...],
  "best_content_types": ["reel","carousel","story","image","text","video"],
  "warnings": ["تحذيرات قبل التنفيذ"],
  "quantitative_recommendations": {
    "reels": 0, "videos": 0, "images": 0, "texts": 0, "carousels": 0, "branding": 0, "total": ${totalPosts}
  },
  "recommendations": ["توصية 1", "توصية 2", "..."]
}`;

    let analysis: any;
    let providerUsed = "fallback";
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      analysis = r.data;
      providerUsed = r.provider;
    } catch (e: any) {
      console.error("analyze AI failed, using fallback:", e.message);
      analysis = fallbackAnalysis(plan, deep);
    }

    // Ensure quantitative_recommendations exists and sums to reasonable total
    if (!analysis.quantitative_recommendations || typeof analysis.quantitative_recommendations !== "object") {
      analysis.quantitative_recommendations = fallbackAnalysis(plan, deep).quantitative_recommendations;
    }
    const qr = analysis.quantitative_recommendations;
    ["reels", "videos", "images", "texts", "carousels", "branding"].forEach((k) => { qr[k] = Math.max(0, Number(qr[k]) || 0); });
    qr.total = qr.reels + qr.videos + qr.images + qr.texts + qr.carousels + qr.branding;

    await supabase.from("content_brain_plans").update({
      analysis, deep_scan: deep, scanned_context: deep,
      quantitative_recommendations: qr,
      status: "analyzed",
    }).eq("id", plan_id);
    return jsonResponse({ ok: true, analysis, provider: providerUsed, deep_scan_summary: {
      wp_posts: deep.wp?.posts?.length || 0, wp_pages: deep.wp?.pages?.length || 0,
      woo_products: deep.woo?.count || 0, social_accounts: deep.social?.length || 0,
    } });
  } catch (e: any) {
    console.error("content-brain-analyze error:", e);
    return jsonResponse({ ok: false, error: e.message }, 200);
  }
});
