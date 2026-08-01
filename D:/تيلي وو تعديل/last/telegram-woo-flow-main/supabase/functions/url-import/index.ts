import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolve relative URLs to absolute HTTP/HTTPS URLs
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (!relativeUrl) return "";
  let clean = relativeUrl.trim();
  if (clean.startsWith("//")) return "https:" + clean;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  try {
    const base = new URL(baseUrl);
    return new URL(clean, base.origin).href;
  } catch (_) {
    return clean;
  }
}

// Clean HTML tags and entities
function cleanHtmlText(htmlSnippet: string): string {
  if (!htmlSnippet) return "";
  return htmlSnippet
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Strict Image Filter: Exclude UI icons, logos, badges, payment methods, banners
function isProductImage(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  
  // Must be an image file or dynamic product image URL
  const isImageFile = lower.match(/\.(jpg|jpeg|png|webp|avif)/i) || 
                      lower.includes("nooncdn.com/p/") || 
                      lower.includes("jumia.is/unsafe") || 
                      lower.includes("m.media-amazon.com/images/i/") ||
                      lower.includes("ae01.alicdn.com/kf/") ||
                      lower.includes("taager.com");

  if (!isImageFile) return false;

  // Filter out junk site elements
  const junkKeywords = [
    "logo", "icon", "badge", "banner", "payment", "visa", "mastercard", "paypal",
    "fawry", "vodafone", "shipping", "delivery", "trust", "star", "rating", "avatar",
    "sprite", "placeholder", "1x1", "pixel", "cart", "header", "footer", "button",
    "social", "facebook", "instagram", "whatsapp", "twitter", "tiktok", "youtube"
  ];

  for (const junk of junkKeywords) {
    if (lower.includes(junk)) return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let targetUrl = "";

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    targetUrl = rawUrl.trim().startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`;

    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    let html = "";
    try {
      const pageResponse = await fetch(targetUrl, {
        headers: {
          "User-Agent": randomUA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      if (pageResponse.ok) {
        html = await pageResponse.text();
      }
    } catch (e) {
      console.warn("Fetch failed, using URL fallback extraction:", e);
    }

    const productData: {
      name: string;
      short_description: string;
      long_description: string;
      price: number | null;
      currency: string;
      images: string[];
      attributes: { name: string; values: string[] }[];
      tags: string[];
    } = {
      name: "",
      short_description: "",
      long_description: "",
      price: null,
      currency: "EGP",
      images: [],
      attributes: [],
      tags: ["استيراد حقيقي"],
    };

    if (html) {
      // -------------------------------------------------------------
      // A. TAAGER & TAJERLY & NEXT.JS PLATFORMS (__NEXT_DATA__)
      // -------------------------------------------------------------
      const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch?.[1]) {
        try {
          const nextJson = JSON.parse(nextDataMatch[1]);
          const pageProps = nextJson?.props?.pageProps;
          const p = pageProps?.product || pageProps?.initialProductData || pageProps?.data;
          if (p) {
            if (p.name || p.title) productData.name = cleanHtmlText(p.name || p.title);
            if (p.description || p.shortDescription) productData.short_description = cleanHtmlText(p.description || p.shortDescription);
            if (p.longDescription || p.details) productData.long_description = cleanHtmlText(p.longDescription || p.details);
            if (p.price || p.salePrice || p.regularPrice) {
              productData.price = parseFloat(p.price || p.salePrice || p.regularPrice);
            }
            if (p.currency) productData.currency = p.currency;

            // Taager / Tajerly images
            const pImgs = p.images || p.media || p.gallery || (p.image ? [p.image] : []);
            for (const imgItem of pImgs) {
              const imgUrl = typeof imgItem === "string" ? imgItem : imgItem?.url || imgItem?.src;
              if (imgUrl) {
                const abs = resolveUrl(imgUrl, targetUrl);
                if (isProductImage(abs) && !productData.images.includes(abs)) {
                  productData.images.push(abs);
                }
              }
            }
          }
        } catch (_) {}
      }

      // -------------------------------------------------------------
      // B. ALIEXPRESS (runParams / window._init_data_)
      // -------------------------------------------------------------
      if (targetUrl.includes("aliexpress.")) {
        const aliParamsMatch = html.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});/i) ||
                               html.match(/_init_data_\s*=\s*(\{[\s\S]*?\});/i);
        if (aliParamsMatch?.[1]) {
          try {
            const aliData = JSON.parse(aliParamsMatch[1]);
            const itemDetail = aliData?.data?.itemDetailComponent || aliData?.itemData || aliData;
            if (itemDetail) {
              if (itemDetail.title || itemDetail.subject) {
                productData.name = cleanHtmlText(itemDetail.title || itemDetail.subject);
              }
              if (itemDetail.imagePathList && Array.isArray(itemDetail.imagePathList)) {
                for (const imgUrl of itemDetail.imagePathList) {
                  const abs = resolveUrl(imgUrl, targetUrl);
                  if (isProductImage(abs) && !productData.images.includes(abs)) {
                    productData.images.push(abs);
                  }
                }
              }
              const priceVal = aliData?.data?.priceComponent?.discountPrice?.formattedAmount ||
                               aliData?.data?.priceComponent?.origPrice?.formattedAmount;
              if (priceVal) {
                const num = parseFloat(priceVal.replace(/[^\d.]/g, ""));
                if (num > 0) productData.price = num;
              }
              productData.currency = "USD";
            }
          } catch (_) {}
        }
      }

      // -------------------------------------------------------------
      // C. ALIBABA (window.detailData)
      // -------------------------------------------------------------
      if (targetUrl.includes("alibaba.com")) {
        const aliDataMatch = html.match(/window\.detailData\s*=\s*(\{[\s\S]*?\});/i);
        if (aliDataMatch?.[1]) {
          try {
            const aliJson = JSON.parse(aliDataMatch[1]);
            if (aliJson.title) productData.name = cleanHtmlText(aliJson.title);
            if (aliJson.images && Array.isArray(aliJson.images)) {
              for (const imgUrl of aliJson.images) {
                const abs = resolveUrl(imgUrl, targetUrl);
                if (isProductImage(abs) && !productData.images.includes(abs)) {
                  productData.images.push(abs);
                }
              }
            }
          } catch (_) {}
        }
      }

      // -------------------------------------------------------------
      // D. JSON-LD SCHEMA (Amazon, Jumia, Noon, WooCommerce, Shopify, Salla, Zid)
      // -------------------------------------------------------------
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const match of jsonLdMatches) {
        try {
          const parsed = JSON.parse(match[1].trim());
          const items = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of items) {
            if (item["@type"] === "Product" || item["@type"] === "IndividualProduct") {
              if (!productData.name && item.name) productData.name = cleanHtmlText(item.name);
              if (!productData.short_description && item.description) productData.short_description = cleanHtmlText(item.description);

              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image];
                for (const img of imgs) {
                  const imgUrl = typeof img === "string" ? img : img.url;
                  if (imgUrl) {
                    const abs = resolveUrl(imgUrl, targetUrl);
                    if (isProductImage(abs) && !productData.images.includes(abs)) {
                      productData.images.push(abs);
                    }
                  }
                }
              }

              if (item.offers) {
                const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const offer of offersList) {
                  const p = offer.price || offer.lowPrice;
                  if (p && !productData.price) {
                    const num = parseFloat(String(p).replace(/[^\d.]/g, ""));
                    if (num > 0) productData.price = num;
                  }
                  if (offer.priceCurrency) productData.currency = String(offer.priceCurrency).toUpperCase();
                }
              }
            }
          }
        } catch (_) {}
      }

      // -------------------------------------------------------------
      // E. OPENGRAPH & META TAGS
      // -------------------------------------------------------------
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
                      html.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
                     html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
      const ogPrice = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
                      html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i)?.[1];

      if (!productData.name && ogTitle) productData.name = cleanHtmlText(ogTitle);
      if (!productData.short_description && ogDesc) productData.short_description = cleanHtmlText(ogDesc);
      if (ogImage) {
        const absOg = resolveUrl(ogImage, targetUrl);
        if (isProductImage(absOg) && !productData.images.includes(absOg)) {
          productData.images.unshift(absOg);
        }
      }
      if (!productData.price && ogPrice) {
        const pNum = parseFloat(ogPrice.replace(/[^\d.]/g, ""));
        if (pNum > 0) productData.price = pNum;
      }

      // -------------------------------------------------------------
      // F. AMAZON & JUMIA & NOON SPECIFIC HTML SELECTORS
      // -------------------------------------------------------------
      if (targetUrl.includes("amazon.")) {
        const amzTitle = html.match(/<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
        if (amzTitle) productData.name = cleanHtmlText(amzTitle);

        const amzPriceMatch = html.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi);
        if (amzPriceMatch && !productData.price) {
          for (const pSpan of amzPriceMatch) {
            const text = cleanHtmlText(pSpan);
            const val = parseFloat(text.replace(/[^\d.]/g, ""));
            if (val > 0) {
              productData.price = val;
              break;
            }
          }
        }

        const featureBullets = html.match(/<div[^>]*id=["']feature-bullets["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
        if (featureBullets) productData.long_description = cleanHtmlText(featureBullets);
      }
    }

    // -------------------------------------------------------------
    // G. FALLBACK FROM URL PATH IF FETCH BLOCKED
    // -------------------------------------------------------------
    if (!productData.name) {
      try {
        const urlObj = new URL(targetUrl);
        const slug = urlObj.pathname.split("/").filter(Boolean).pop() || "";
        productData.name = decodeURIComponent(slug).replace(/[-_]/g, " ").trim() || "منتج مستورد من رابط";
      } catch (_) {
        productData.name = "منتج مستورد من رابط";
      }
    }

    // Clean brand suffixes
    productData.name = productData.name
      .replace(/\|[\s\S]*$/g, "")
      .replace(/-[\s\S]*$/g, "")
      .replace(/Buy online[\s\S]*/gi, "")
      .replace(/اشترِ[\s\S]*/gi, "")
      .trim();

    productData.images = [...new Set(productData.images)].filter(isProductImage).slice(0, 10);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
        source_url: targetUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("url-import error:", error);
    // Always return status 200 so Supabase JS client never throws non-2xx status code
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to extract product data",
        data: {
          name: "منتج مستورد من رابط",
          short_description: `منتج تم استيراده من الرابط: ${targetUrl}`,
          long_description: `وصف المنتج المستورد من الرابط: ${targetUrl}`,
          price: null,
          currency: "EGP",
          images: [],
          attributes: [],
          tags: ["استيراد"],
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
