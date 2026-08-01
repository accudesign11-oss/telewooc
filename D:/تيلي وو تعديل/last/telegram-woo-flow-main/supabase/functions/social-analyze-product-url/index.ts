import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TeleWooBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Failed to fetch URL: ${r.status}`);
  return await r.text();
}

function extractMeta(html: string, ...names: string[]): string | null {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function extractAllImages(html: string, baseUrl: string): string[] {
  const imgs = new Set<string>();
  const ogImg = extractMeta(html, "og:image", "twitter:image");
  if (ogImg) imgs.add(ogImg);
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html))) {
    let src = m[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(src, baseUrl).toString(); } catch {}
    }
    if (/^https?:\/\//.test(src) && !/sprite|icon|logo|placeholder/i.test(src)) imgs.add(src);
  }
  return Array.from(imgs).slice(0, 20);
}

function extractStructured(html: string): any {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1].trim());
      const arr = Array.isArray(obj) ? obj : (obj["@graph"] || [obj]);
      for (const item of arr) {
        if (item["@type"] === "Product" || (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) {
          return item;
        }
      }
    } catch {}
  }
  return null;
}

async function scrapeGeneric(url: string) {
  const html = await fetchHtml(url);
  const structured = extractStructured(html);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const name = structured?.name || extractMeta(html, "og:title", "twitter:title") || titleMatch?.[1]?.trim() || "";
  const description = structured?.description || extractMeta(html, "og:description", "description") || "";
  const offer = structured?.offers || (Array.isArray(structured?.offers) ? structured.offers[0] : null);
  const price = offer?.price || null;
  const images = extractAllImages(html, url);
  return {
    name,
    short_description: description?.slice(0, 280) || "",
    long_description: description || "",
    price,
    regular_price: null,
    discount_pct: null,
    sku: structured?.sku || null,
    stock_status: offer?.availability || null,
    images,
    tags: [],
    url,
  };
}

async function scrapeWooCommerce(url: string) {
  // Try WC store API (public)
  const u = new URL(url);
  const slug = u.pathname.split("/").filter(Boolean).pop();
  try {
    const r = await fetch(`${u.origin}/wp-json/wc/store/v1/products?slug=${slug}`, { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const arr = await r.json();
      const p = Array.isArray(arr) ? arr[0] : null;
      if (p) {
        return {
          name: p.name,
          short_description: (p.short_description || "").replace(/<[^>]+>/g, ""),
          long_description: (p.description || "").replace(/<[^>]+>/g, ""),
          price: p.prices?.price ? Number(p.prices.price) / Math.pow(10, p.prices?.currency_minor_unit || 2) : null,
          regular_price: p.prices?.regular_price ? Number(p.prices.regular_price) / Math.pow(10, p.prices?.currency_minor_unit || 2) : null,
          discount_pct: null,
          sku: p.sku,
          stock_status: p.is_in_stock ? "InStock" : "OutOfStock",
          images: (p.images || []).map((i: any) => i.src),
          tags: (p.tags || []).map((t: any) => t.name),
          url,
        };
      }
    }
  } catch {}
  return scrapeGeneric(url);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { url, source_type = "auto" } = await req.json();
    if (!url) return jsonResponse({ error: "url is required" });

    let product: any;
    if (source_type === "woocommerce" || source_type === "auto") {
      product = await scrapeWooCommerce(url);
      if (!product.name && source_type === "auto") product = await scrapeGeneric(url);
    } else {
      product = await scrapeGeneric(url);
    }

    if (product.regular_price && product.price && product.regular_price > product.price) {
      product.discount_pct = Math.round((1 - product.price / product.regular_price) * 100);
    }

    let analysis: any = {};
    const hasAI = ai.gemini_api_key || ai.openrouter_api_key || ai.huggingface_api_key;
    if (hasAI) {
      try {
        const sys = `أنت خبير تسويق رقمي. اعتمد فقط على البيانات المُعطاة ولا تخترع مواصفات. لو ميزة غير مؤكدة صفها كمظهر بصري.`;
        const usr = `حلل المنتج التالي تسويقيًا وأرجع JSON فقط:
{
  "usp": "أهم نقاط البيع",
  "audience": "الجمهور المستهدف",
  "angle": "أفضل زاوية تسويقية",
  "problems": "المشاكل التي يحلها",
  "hook": "أفضل Hook قصير",
  "cta": "أفضل CTA",
  "hashtags": ["#tag1","#tag2"],
  "keywords": ["k1","k2"],
  "formats": ["post","carousel","reel","story"],
  "needs_video": true,
  "needs_text_overlay": true
}

بيانات المنتج:
${JSON.stringify(product, null, 2)}`;
        const { text } = await callAI(ai, sys, usr);
        analysis = extractJson(text);
      } catch (e: any) {
        analysis = { error: e.message };
      }
    }

    // Save
    await supabase.from("social_product_analyses").insert({
      user_id: user.id,
      url,
      source_type,
      extracted_data: product,
      images: product.images || [],
      analysis,
    });

    return jsonResponse({ success: true, product, analysis });
  } catch (e: any) {
    console.error("analyze-product error:", e);
    return jsonResponse({ error: e.message || "فشل التحليل" });
  }
});
