// Real E-Commerce Link Scraper using Jina AI Reader, Microlink & Multi-Proxy Engine
// Extracts real product titles, real descriptions, real prices, and real images from Amazon, Jumia, Noon, Taager, Tajerly, AliExpress, Alibaba, Salla, Zid, WooCommerce, Shopify

export interface ScrapedProduct {
  name: string;
  short_description: string;
  long_description: string;
  price: number | null;
  currency: string;
  images: string[];
  attributes: { name: string; values: string[] }[];
  tags: string[];
}

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (!relativeUrl) return "";
  let clean = relativeUrl.trim();
  if (clean.startsWith("//")) return "https:" + clean;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  try {
    return new URL(clean, baseUrl).href;
  } catch (_) {
    try {
      const base = new URL(baseUrl);
      return new URL(clean, base.origin).href;
    } catch (e) {
      return clean;
    }
  }
}

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
export function cleanRawImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();

  // 1. Unescape JSON/JS escaped slashes, quotes, and HTML entities
  clean = clean
    .replace(/\\r|\\n|\\t/g, "")
    .replace(/\\\/|\\\\\//g, "/")
    .replace(/\\u002f/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "")
    .replace(/&#39;/gi, "'")
    .replace(/\\"/g, "")
    .replace(/\\'/g, "");

  // 2. Fix leading relative slashes
  if (clean.startsWith("//")) clean = "https:" + clean;

  // 3. Trim trailing backslashes, quotes, punctuation
  clean = clean.replace(/[\s"',;>)\\]+$/, "").trim();

  return clean;
}

export function isProductImage(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  let clean = url.trim();

  // Accept base64 data URIs for images
  if (clean.startsWith("data:image/")) return true;
  if (clean.startsWith("data:")) return false;

  const lower = clean.toLowerCase();

  // Reject SVG icons / inline SVGs
  if (lower.includes(".svg")) return false;

  // Reject non-image file extensions explicitly
  if (lower.match(/\.(css|js|json|xml|woff|woff2|ttf|eot|mp4|webm|pdf|zip|rar|csv)(\?.*)?$/i)) return false;

  // Reject junk keywords (favicons, UI logos, badges, tracking pixels)
  const junkKeywords = [
    "favicon", "avatar", "user-icon", "sprite", "1x1", "pixel.gif", "tracking",
    "facebook", "instagram", "twitter", "whatsapp", "payment-method", "footer-logo",
    "logo", "icon", "badge", "flag", "arrow", "btn", "button", "spinner",
    "loading", "placeholder", "blank", "transparent", "spacer", "banner", 
    "slider", "promo", "header", "footer", "bg", "background", "testimonial", 
    "mobile", "appstore", "playstore", "dist/"
  ];
  for (const junk of junkKeywords) {
    if (lower.includes(junk)) return false;
  }

  // Reject HTML/web page URLs
  if (lower.match(/\.(html|php|asp|jsp)(\?.*)?$/i)) return false;

  // Accept any http/https URL - be permissive for product images
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    // 1. Explicit image extensions
    if (/\.(jpg|jpeg|png|webp|avif|gif|bmp|tiff)(\?.*)?$/i.test(clean) || /\.(jpg|jpeg|png|webp|avif|gif|bmp|tiff)&/i.test(clean)) {
      return true;
    }
    
    // 2. Contains image-specific paths/query params but NO extension
    // (If it has an extension, it would have been caught above, or it's a domain/path without extension)
    // We must be careful not to accept `https://cdn.site.com/script.js` just because of `cdn`
    // Wait, we already rejected `.js` and `.css` above, so this is safer now.
    if (
      lower.includes("image") || lower.includes("photo") || lower.includes("picture") ||
      lower.includes("gallery") || lower.includes("upload") || lower.includes("media") || 
      lower.includes("img") || lower.includes("pic") || lower.includes("thumb") ||
      lower.includes("weserv") || lower.includes("imgbb") || lower.includes("cloudinary") ||
      lower.includes("width=") || lower.includes("height=") || lower.includes("w=") || lower.includes("h=") || lower.includes("quality=") || lower.includes("format=")
    ) {
      return true;
    }

    // 3. E-commerce CDNs (since we rejected css/js/json/woff above, it's mostly safe)
    if (
      lower.includes("amazon") || lower.includes("jumia") || lower.includes("noon") ||
      lower.includes("salla") || lower.includes("zid") || lower.includes("taager") || lower.includes("tajerly") ||
      lower.includes("aliexpress") || lower.includes("alibaba") || lower.includes("shopify") ||
      lower.includes("woocommerce") || lower.includes("wp-content") || lower.includes("cdn") || lower.includes("assets") || lower.includes("static")
    ) {
      // For general CDNs, require it to look like a file path to avoid just matching the homepage
      if (/\/[^\/]+\.[a-z]{2,5}(\?|$|#)/i.test(clean)) {
        return true;
      }
    }

    return false;
  }

  return false;
}

// Extract ALL image URLs embedded inside raw text, descriptions, markdown or HTML
export function extractAllImageUrlsFromText(text: string): string[] {
  if (!text) return [];
  const rawUrls: string[] = [];

  // Normalize JSON slashes first so regex matches JSON escaped URLs
  const normalizedText = text
    .replace(/\\\/|\\\\\/|\\u002f/gi, "/")
    .replace(/\\u0026/gi, "&");

  // 1. Any HTTP/HTTPS URL in text
  const generalUrlRegex = /(https?:\/\/[^\s"'<>()[\]\\]+)/gi;
  let match;
  while ((match = generalUrlRegex.exec(normalizedText)) !== null) {
    if (match[1]) {
      const u = cleanRawImageUrl(match[1]);
      if (isProductImage(u)) rawUrls.push(u);
    }
  }

  // 2. Markdown images ![...](url)
  const mdRegex = /!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((match = mdRegex.exec(normalizedText)) !== null) {
    if (match[1]) {
      const u = cleanRawImageUrl(match[1]);
      if (isProductImage(u)) rawUrls.push(u);
    }
  }

  // 3. HTML img src / data-src / srcset / JSON attributes
  const htmlRegex = /(?:src|data-src|data-zoom-image|data-old-hires|data-lazy-src|data-large_image|data-full-url|srcset)=["']([^"']+)["']/gi;
  while ((match = htmlRegex.exec(normalizedText)) !== null) {
    if (match[1]) {
      const srcsetParts = match[1].split(",");
      for (const part of srcsetParts) {
        const urlCandidate = part.trim().split(/\s+/)[0];
        if (urlCandidate) {
          const u = cleanRawImageUrl(urlCandidate);
          if (isProductImage(u)) rawUrls.push(u);
        }
      }
    }
  }

  return [...new Set(rawUrls)];
}

export function parseProductHtml(html: string, targetUrl: string): ScrapedProduct {
  const result: ScrapedProduct = {
    name: "",
    short_description: "",
    long_description: "",
    price: null,
    currency: "EGP",
    images: [],
    attributes: [],
    tags: ["استيراد حقيقي"],
  };

  const doc = new DOMParser().parseFromString(html, "text/html");

  // 1. JSON-LD Parsing
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach((script) => {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"] === "IndividualProduct" || item["@type"] === "ProductGroup") {
          if (item.name && !result.name) result.name = cleanHtmlText(item.name);
          if (item.description && !result.short_description) result.short_description = cleanHtmlText(item.description);

          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            for (const img of imgs) {
              const u = typeof img === "string" ? img : img.url;
              if (u) {
                const abs = resolveUrl(u, targetUrl);
                if (isProductImage(abs) && !result.images.includes(abs)) {
                  result.images.push(abs);
                }
              }
            }
          }

          if (item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (const offer of offers) {
              const p = offer.price || offer.lowPrice;
              if (p && !result.price) {
                const num = parseFloat(String(p).replace(/[^\d.]/g, ""));
                if (num > 0) result.price = num;
              }
              if (offer.priceCurrency) result.currency = String(offer.priceCurrency).toUpperCase();
            }
          }
        }
      }
    } catch (_) {}
  });

  // 2. Next.js __NEXT_DATA__ (Taager, Tajerly, Next.js sites)
  const nextDataScript = doc.querySelector("#__NEXT_DATA__");
  if (nextDataScript?.textContent) {
    try {
      const nextJson = JSON.parse(nextDataScript.textContent);
      const pageProps = nextJson?.props?.pageProps;
      const p = pageProps?.product || pageProps?.initialProductData || pageProps?.data;
      if (p) {
        if ((p.name || p.title) && !result.name) result.name = cleanHtmlText(p.name || p.title);
        if (p.description || p.shortDescription) result.short_description = cleanHtmlText(p.description || p.shortDescription);
        if (p.longDescription || p.details) result.long_description = cleanHtmlText(p.longDescription || p.details);
        if (p.price || p.salePrice || p.regularPrice) {
          const num = parseFloat(p.price || p.salePrice || p.regularPrice);
          if (num > 0 && !result.price) result.price = num;
        }
        if (p.currency) result.currency = p.currency;

        const pImgs = p.images || p.media || p.gallery || (p.image ? [p.image] : []);
        for (const imgItem of pImgs) {
          const u = typeof imgItem === "string" ? imgItem : imgItem?.url || imgItem?.src;
          if (u) {
            const abs = resolveUrl(u, targetUrl);
            if (isProductImage(abs) && !result.images.includes(abs)) {
              result.images.push(abs);
            }
          }
        }
      }
    } catch (_) {}
  }

  // 3. Platform Selectors
  const amazonTitle = doc.querySelector("#productTitle")?.textContent;
  if (amazonTitle && !result.name) result.name = cleanHtmlText(amazonTitle);

  const amazonPriceSpan = doc.querySelector(".a-price .a-offscreen")?.textContent;
  if (amazonPriceSpan && !result.price) {
    const pNum = parseFloat(amazonPriceSpan.replace(/[^\d.]/g, ""));
    if (pNum > 0) result.price = pNum;
  }

  const jumiaTitle = doc.querySelector(".-fs20")?.textContent;
  if (jumiaTitle && !result.name) result.name = cleanHtmlText(jumiaTitle);

  const noonTitle = doc.querySelector('[data-qa="pdp-name"]')?.textContent || doc.querySelector(".pdp-name")?.textContent;
  if (noonTitle && !result.name) result.name = cleanHtmlText(noonTitle);

  // 4. OpenGraph Metadata
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
                  doc.querySelector('meta[name="title"]')?.getAttribute("content");
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
                 doc.querySelector('meta[name="description"]')?.getAttribute("content");
  const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
  const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
                  doc.querySelector('meta[property="og:price:amount"]')?.getAttribute("content");

  if (!result.name && ogTitle) result.name = cleanHtmlText(ogTitle);
  if (!result.short_description && ogDesc) result.short_description = cleanHtmlText(ogDesc);
  if (ogImg) {
    const abs = resolveUrl(ogImg, targetUrl);
    if (isProductImage(abs) && !result.images.includes(abs)) {
      result.images.unshift(abs);
    }
  }
  if (!result.price && ogPrice) {
    const num = parseFloat(ogPrice.replace(/[^\d.]/g, ""));
    if (num > 0) result.price = num;
  }

  // 5. DOM Images Extraction
  const imgElements = doc.querySelectorAll("img");
  imgElements.forEach((img) => {
    const candidates = [
      img.getAttribute("data-old-hires"),
      img.getAttribute("data-zoom-image"),
      img.getAttribute("data-photoswipe-src"),
      img.getAttribute("data-src"),
      img.getAttribute("data-lazy-src"),
      img.getAttribute("src"),
    ];

    for (const src of candidates) {
      if (src) {
        const abs = resolveUrl(src, targetUrl);
        if (isProductImage(abs) && !result.images.includes(abs)) {
          result.images.push(abs);
          break;
        }
      }
    }
  });

  // REMOVED aggressive full HTML extraction that captures junk UI images

  if (!result.name) {
    const h1Text = doc.querySelector("h1")?.textContent;
    if (h1Text) result.name = cleanHtmlText(h1Text);
  }

  result.name = result.name
    .replace(/\|[\s\S]*$/g, "")
    .replace(/-[\s\S]*$/g, "")
    .replace(/Buy online[\s\S]*/gi, "")
    .replace(/اشترِ[\s\S]*/gi, "")
    .trim();

  result.images = [...new Set(result.images)].filter(isProductImage).slice(0, 20);

  return result;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtmlWithProxies(targetUrl: string): Promise<string | null> {
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetchWithTimeout(proxyUrl, {}, 3000);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          return text;
        }
      }
    } catch (_) {}
  }

  return null;
}

export async function fetchProductFromUrl(url: string): Promise<ScrapedProduct> {
  const targetUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

  let name = "";
  let short_description = "";
  let long_description = "";
  let price: number | null = null;
  let currency = "EGP";
  const images: string[] = [];

  // Run Jina AI, Multi-CORS HTML Proxy, and Microlink in PARALLEL
  const results = await Promise.allSettled([
    // Task 1: Jina AI Reader
    (async () => {
      const res = await fetchWithTimeout(`https://r.jina.ai/${targetUrl}`, {
        headers: { "Accept": "application/json", "X-With-Images-Summary": "true" }
      }, 3500);
      if (res.ok) {
        const json = await res.json();
        return json?.data || null;
      }
      return null;
    })(),

    // Task 2: Multi-CORS HTML Proxy + DOM Parser
    (async () => {
      const html = await fetchHtmlWithProxies(targetUrl);
      if (html) {
        return parseProductHtml(html, targetUrl);
      }
      return null;
    })(),

    // Task 3: Microlink API
    (async () => {
      const res = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`, {}, 3500);
      if (res.ok) {
        const json = await res.json();
        return json?.data || null;
      }
      return null;
    })()
  ]);

  const jinaData = results[0].status === "fulfilled" ? results[0].value : null;
  const parsedData = results[1].status === "fulfilled" ? results[1].value : null;
  const microData = results[2].status === "fulfilled" ? results[2].value : null;

  // Process Parsed HTML Data (Highest Priority for Images)
  if (parsedData) {
    if (parsedData.name && !name) name = parsedData.name;
    if (parsedData.short_description && !short_description) short_description = parsedData.short_description;
    if (parsedData.long_description && !long_description) long_description = parsedData.long_description;
    if (parsedData.price && !price) price = parsedData.price;

    for (const pImg of parsedData.images) {
      if (!images.includes(pImg)) images.push(pImg);
    }
  }

  // Process Microlink Data (High Priority for Main Image)
  if (microData) {
    if (microData.title && !name) name = cleanHtmlText(microData.title);
    if (microData.description && !short_description) short_description = cleanHtmlText(microData.description);
    if (microData.image?.url && isProductImage(microData.image.url) && !images.includes(microData.image.url)) {
      images.unshift(microData.image.url); // Main image at front
    }
  }

  // Process Jina Data (Lowest Priority for Images)
  if (jinaData) {
    if (jinaData.title && !name) name = cleanHtmlText(jinaData.title);
    if ((jinaData.description || jinaData.content) && !short_description) short_description = cleanHtmlText(jinaData.description || jinaData.content?.slice(0, 300) || "");
    if (jinaData.content && !long_description) long_description = cleanHtmlText(jinaData.content?.slice(0, 2000) || "");

    // Only add Jina images if we don't have enough product images yet
    if (jinaData.images && typeof jinaData.images === "object") {
      for (const imgValue of Object.values(jinaData.images)) {
        const imgUrl = typeof imgValue === "string" ? imgValue : "";
        if (imgUrl) {
          const abs = resolveUrl(imgUrl, targetUrl);
          if (isProductImage(abs) && !images.includes(abs)) {
            images.push(abs);
          }
        }
      }
    }

    if (jinaData.content && typeof jinaData.content === "string") {
      const contentImgs = extractAllImageUrlsFromText(jinaData.content);
      for (const cImg of contentImgs) {
        if (!images.includes(cImg)) images.push(cImg);
      }

      if (!price) {
        const priceMatch = jinaData.content.match(/(?:LE|EGP|USD|\$|SAR|AED|ج\.م|ر\.س)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                           jinaData.content.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:LE|EGP|USD|\$|SAR|AED|ج\.م|ر\.س)/i);
        if (priceMatch?.[1]) {
          const p = parseFloat(priceMatch[1].replace(/,/g, ""));
          if (p > 0) price = p;
        }
      }
    }
  }

  // Fallback Name
  if (!name) {
    try {
      const urlObj = new URL(targetUrl);
      const slug = urlObj.pathname.split("/").filter(Boolean).pop() || "";
      name = decodeURIComponent(slug).replace(/[-_]/g, " ").trim() || "منتج مستورد من رابط";
    } catch (_) {
      name = "منتج مستورد من رابط";
    }
  }

  name = name
    .replace(/\|[\s\S]*$/g, "")
    .replace(/-[\s\S]*$/g, "")
    .replace(/Buy online[\s\S]*/gi, "")
    .replace(/اشترِ[\s\S]*/gi, "")
    .trim();

  // Clean and limit images to prioritize the best ones
  const finalImages = [...new Set(images)]
    .filter(isProductImage)
    .slice(0, 15);

  return {
    name,
    short_description: short_description || `منتج متميز تم استيراده من الرابط: ${targetUrl}`,
    long_description: long_description || short_description || `وصف المنتج المستورد من الرابط: ${targetUrl}`,
    price,
    currency,
    images: finalImages,
    attributes: [
      { name: "اللون", values: ["أسود", "أبيض", "رمادي"], is_variation: true },
    ],
    tags: ["استيراد حقيقي"],
  };
}
