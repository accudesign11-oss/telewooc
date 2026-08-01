import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, getAuthedUserAndAI } from "../_shared/social-engine.ts";

const FRESH_HINTS = [
  "premium", "new", "pro", "plus", "hot", "top", "best", "smart", "elite",
  "classic", "special", "deluxe", "signature", "essential", "modern",
];

// Basic Arabic → Latin transliteration for a URL-friendly fallback
const AR_MAP: Record<string, string> = {
  "ا":"a","أ":"a","إ":"e","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh",
  "د":"d","ذ":"dh","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z",
  "ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w",
  "ي":"y","ى":"a","ة":"h","ء":"","ؤ":"o","ئ":"e","َ":"","ُ":"","ِ":"","ّ":"","ْ":"","ً":"","ٌ":"","ٍ":"",
};

function slugify(text: string): string {
  const t = (text || "").split("").map((c) => AR_MAP[c] ?? c).join("");
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/^-|-$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    let ai: any = null;
    try {
      const auth = await getAuthedUserAndAI(req);
      ai = auth.ai;
    } catch (authErr: any) {
      console.warn("Auth/AI fetch failed, will use fallback slug:", authErr?.message);
    }

    const body = await req.json().catch(() => ({}));
    const {
      name = "",
      description = "",
      categories = [],
      current_slug = "",
      mode = "enhance", // "enhance" | "fresh"
    } = body || {};

    if (!String(name).trim() && !String(description).trim()) {
      return jsonResponse({ ok: false, error: "name أو description مطلوب" });
    }

    const isFresh = mode === "fresh";
    const seed = FRESH_HINTS[Math.floor(Math.random() * FRESH_HINTS.length)];

    const sys = isFresh
      ? `You are an SEO expert. Generate ONE brand-new, unique, keyword-rich, URL-friendly slug (lowercase English, hyphen-separated, 3-6 words, max 60 chars). It MUST be different from any provided current slug. Transliterate Arabic to Latin. You may include the hint word "${seed}" naturally if it fits. Return the slug only.`
      : `You are an SEO expert. Generate ONE concise, keyword-rich, URL-friendly slug (lowercase English, hyphen-separated, 3-6 words, no stopwords, no numbers unless meaningful, max 60 chars). Transliterate Arabic to Latin. Return the slug only — no quotes, no explanation.`;

    const usr = `Product name: ${name}
Categories: ${Array.isArray(categories) ? categories.join(", ") : ""}
Short description: ${(String(description) || "").replace(/<[^>]+>/g, " ").slice(0, 400)}
Current slug (avoid): ${current_slug}

Output the slug only.`;

    let slug = "";
    let provider = "fallback";
    if (ai) {
      try {
        const r = await callAI(ai, sys, usr);
        provider = r.provider;
        slug = slugify(r.text.replace(/[`"'\n\r]/g, " ").trim());
      } catch (e: any) {
        console.error("AI slug failed, falling back:", e?.message);
      }
    }
    if (!slug) {
      const base = slugify(`${name} ${(categories || []).join(" ")}`);
      slug = base || `product-${Date.now()}`;
    }

    // Ensure fresh mode returns a different slug
    if (isFresh && current_slug && slug === current_slug) {
      const suffix = `${seed}-${Math.random().toString(36).slice(2, 5)}`;
      slug = slugify(`${slug} ${suffix}`);
    }

    return jsonResponse({ ok: true, slug, provider, mode });
  } catch (e: any) {
    console.error("enhance-product-slug error:", e);
    return jsonResponse({ ok: false, error: e?.message || String(e) });
  }
});