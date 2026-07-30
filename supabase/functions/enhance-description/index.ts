import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UPSTREAM_TIMEOUT_MS = 25_000;
const MAX_DESC_LENGTH = 8000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort("timeout"), ms);
  try { return await fetch(input, { ...init, signal: c.signal }); }
  finally { clearTimeout(t); }
}

const SERVICE_CARDS_HTML = `<div class="tlv-service-cards">
  <div class="tlv-service-card"><span class="tlv-service-emoji">🚚</span><h3>شحن مجاني</h3><p>توصيل سريع لباب المنزل</p></div>
  <div class="tlv-service-card"><span class="tlv-service-emoji">🛡️</span><h3>ضمان 5 أعوام</h3><p>ضمان الخامات والجودة</p></div>
  <div class="tlv-service-card"><span class="tlv-service-emoji">💳</span><h3>دفع آمن</h3><p>طرق دفع مرنة ومريحة</p></div>
</div>`;

const EMBEDDED_CSS = `<style>
.tlv-description { direction: rtl; text-align: right; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; }
.tlv-service-cards, .tlv-feature-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; margin: 16px 0 !important; padding: 0 !important; }
@media (max-width: 640px) {
  .tlv-service-cards, .tlv-feature-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 4px !important; }
}
@media (max-width: 440px) {
  .tlv-service-cards, .tlv-feature-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 2px !important; }
  .tlv-service-card, .tlv-feature-card { padding: 4px 2px !important; border-radius: 6px !important; }
  .tlv-service-emoji, .tlv-feature-icon { font-size: 16px !important; margin-bottom: 2px !important; }
  .tlv-service-card h3, .tlv-feature-card h3 { font-size: 9px !important; margin-bottom: 1px !important; white-space: normal !important; }
  .tlv-service-card p, .tlv-feature-card p { font-size: 8px !important; }
}
.tlv-service-card, .tlv-feature-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 10px !important; padding: 8px 6px !important; text-align: center !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important; }
.tlv-service-emoji, .tlv-feature-icon { font-size: 22px !important; line-height: 1 !important; margin-bottom: 4px !important; display: block !important; }
.tlv-service-card h3, .tlv-feature-card h3 { font-size: 12px !important; font-weight: 700 !important; margin: 0 0 2px 0 !important; color: #0f172a !important; line-height: 1.2 !important; text-align: center !important; }
.tlv-service-card p, .tlv-feature-card p { font-size: 10px !important; color: #64748b !important; margin: 0 !important; line-height: 1.25 !important; text-align: center !important; }
.tlv-main-title { font-size: 15px !important; font-weight: 800 !important; color: #0f172a !important; margin: 16px 0 8px 0 !important; border-right: 4px solid #3b82f6 !important; padding-right: 8px !important; }
.tlv-desc-img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 12px auto !important; display: block !important; }
.tlv-marquee { background: #eff6ff !important; color: #1d4ed8 !important; padding: 6px 12px !important; border-radius: 6px !important; font-size: 11px !important; font-weight: 700 !important; text-align: center !important; margin-bottom: 12px !important; }
.tlv-live-help { background: #f0fdf4 !important; border: 1px solid #bbf7d0 !important; border-radius: 10px !important; padding: 10px !important; text-align: center !important; margin-top: 16px !important; }
.tlv-live-help h2 { font-size: 13px !important; font-weight: 700 !important; color: #166534 !important; margin: 0 0 3px 0 !important; }
.tlv-live-help p { font-size: 10px !important; color: #15803d !important; margin: 0 !important; }
.tlv-description table { width: 100% !important; border-collapse: collapse !important; margin: 12px 0 !important; font-size: 12px !important; }
.tlv-description th, .tlv-description td { border: 1px solid #e2e8f0 !important; padding: 6px 10px !important; text-align: right !important; }
.tlv-description th { background-color: #f1f5f9 !important; font-weight: 700 !important; color: #334155 !important; }
</style>`;

function getLiveHelpHtml(companyName?: string): string {
  const cName = companyName && companyName.trim() ? companyName.trim() : "المتجر";
  return `<div class="tlv-live-help"><h2>هل تحتاج إلى مساعدة؟</h2><p>فريق خدمة العملاء في ${cName} جاهز لمساعدتك في اختيار المنتج المناسب لمساحتك.</p></div>`;
}

type Style = "simple" | "medium" | "fancy" | "ultra";

function styleDirective(style: Style, hasImages: boolean, companyName?: string): string {
  const liveHelpHtml = getLiveHelpHtml(companyName);
  if (style === "simple") {
    return `النمط المطلوب: عادي/مختصر.
الترتيب:
1) عنوان <h2 class="tlv-main-title">…</h2>
2) فقرتان قصيرتان <p dir="rtl">…</p>
3) جدول مواصفات <table>…</table>
ممنوع كروت الخدمات/المميزات/قسم المساعدة. ${hasImages ? "أدرج صورة واحدة كحد أقصى." : "ممنوع <img>."}`;
  }
  if (style === "medium") {
    return `النمط المطلوب: وسط.
الترتيب:
1) كروت الخدمات الثلاث (كما هي حرفياً): ${SERVICE_CARDS_HTML}
2) عنوان رئيسي خاص بالمنتج <h2 class="tlv-main-title">…</h2>
3) 3 أقسام: كل واحد <h2 class="tlv-main-title">…</h2> + <p dir="rtl">…</p>
4) جدول المواصفات <table>.
${hasImages ? "وزّع 1-2 صورة <img class=\"tlv-desc-img\"> بين الأقسام من الروابط المعطاة فقط." : "ممنوع <img>."}
بدون كروت مميزات وبدون قسم مساعدة.`;
  }
  if (style === "fancy") {
    return `النمط المطلوب: مبهرج (القالب الكامل).
الترتيب:
1) كروت الخدمات: ${SERVICE_CARDS_HTML}
2) عنوان رئيسي
3) 3-4 أقسام (h2 + p)
4) قسم المميزات <div class="tlv-feature-grid"> يحتوي 4-6 كروت صغيرة مصممة للشبكة .tlv-feature-card بها (<span class="tlv-feature-icon">إيموجي</span> + <h3>عنوان قصير</h3> + <p>وصف مختصر جداً في سطر</p>)
5) جدول مواصفات
6) قسم المساعدة: ${liveHelpHtml}
${hasImages ? "وزّع 2-3 صور <img class=\"tlv-desc-img\"> بين الفقرات من الروابط المعطاة فقط." : "ممنوع <img>."}`;
  }
  // ultra
  return `النمط المطلوب: مبهرج جداً (الأكثر تفصيلًا).
الترتيب:
1) شريط متحرك أعلى الوصف: <div class="tlv-marquee"><span>عروض حصرية • جودة عالية • شحن سريع • ضمان 5 أعوام</span></div>
2) كروت الخدمات: ${SERVICE_CARDS_HTML}
3) عنوان رئيسي
4) 4-5 أقسام كل واحد بداخل <div class="tlv-fade-in"> ويحتوي h2.tlv-main-title + p dir="rtl"
5) قسم المميزات بـ 6 كروت صغيرة .tlv-feature-card داخل <div class="tlv-feature-grid"> بها (<span class="tlv-feature-icon">إيموجي</span> + <h3>عنوان قصير</h3> + <p>وصف مختصر جداً</p>)
6) جدول مواصفات تفصيلي (6+ صفوف)
7) قسم المساعدة: ${liveHelpHtml}
${hasImages ? "وزّع 3-5 صور <img class=\"tlv-desc-img\"> بين الفقرات من الروابط المعطاة فقط بدون تكرار." : "ممنوع <img>."}
الكلاسات المسموحة فقط: tlv-* (بما فيها tlv-marquee و tlv-fade-in). لا styles ولا scripts غير كلاسات tlv.`;
}

function buildSystemPrompt(productName: string, productType: string, images: string[], style: Style, companyName?: string) {
  const imagesBlock = images.length
    ? `صور المنتج المتاحة (استخدم فقط منها ووزّعها بين الفقرات بدون تكرار):\n${images.map((u, i) => `${i + 1}. ${u}`).join("\n")}`
    : `لا توجد صور للمنتج. ممنوع أي وسم <img>.`;

  return `أنت كاتب محتوى احترافي لمتجر إلكتروني مميز على WooCommerce.
أخرج HTML نظيف فقط — بدون أي style="..." مخصص، فقط استخدم كلاسات tlv-*.

اسم المتجر/الشركة: ${companyName || "المتجر"}
اسم المنتج: ${productName}
نوع المنتج: ${productType || "غير محدد"}

${imagesBlock}

قواعد صارمة:
- HTML فقط. لا markdown، لا \`\`\`html.
- ممنوع: <script>, style="…", on*="…".
- استخدم فقط كلاسات tlv-* المسموحة.
- اجعل كروت .tlv-feature-card قصيرة جداً (عنوان كلمة أو كلمتين + وصف من 3-5 كلمات فقط) لأنها تعرض في شبكة من عمودين أو 3 أعمدة على الموبايل!
- نصوص عربية فصحى، dir="rtl" على الفقرات.

${styleDirective(style, images.length > 0, companyName)}

أعد المخرج كاملاً HTML خام فقط الآن.`;
}

async function callGemini(apiKey: string, system: string, user: string) {
  const models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
  for (const m of models) {
    try {
      const r = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: user }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 8192 },
          }),
        },
        UPSTREAM_TIMEOUT_MS
      );
      if (r.ok) {
        const d = await r.json();
        const txt = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (txt) return { ok: true, text: txt, model: m };
      }
      if (![404, 429, 500, 502, 503, 504].includes(r.status)) {
        const errText = await r.text();
        return { ok: false, status: r.status, error: errText.substring(0, 500), model: m };
      }
    } catch (e) {
      console.error(`Gemini ${m} failed:`, e);
    }
  }
  return { ok: false, status: 503, error: "All Gemini models failed", model: "" };
}

async function callOpenRouter(apiKey: string, model: string, system: string, user: string) {
  try {
    const r = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      },
      UPSTREAM_TIMEOUT_MS
    );
    if (r.ok) {
      const d = await r.json();
      const txt = d.choices?.[0]?.message?.content || "";
      return { ok: true, text: txt, model };
    }
    return { ok: false, status: r.status, error: (await r.text()).substring(0, 500), model };
  } catch (e) {
    return { ok: false, status: 504, error: String(e), model };
  }
}

function sanitizeHtml(html: string, allowedImageUrls: string[], style: Style): string {
  let s = (html || "").trim();
  s = s.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/\s+style\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  s = s.replace(/\s+style\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");
  s = s.replace(/teleevo-product-description|teleevo-badge|teleevo-table/gi, "");
  s = s.replace(/(^|\n)\s*\.[a-zA-Z_-][^\n{]*\{[^}]*\}/g, "$1");

  if (allowedImageUrls.length === 0) {
    s = s.replace(/<img\b[^>]*>/gi, "");
  } else {
    const allowed = new Set(allowedImageUrls);
    s = s.replace(/<img\b[^>]*>/gi, (tag) => {
      const m = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (m && allowed.has(m[1])) return tag;
      return "";
    });
  }

  // Remove existing style tags generated by AI if any (we inject our official EMBEDDED_CSS)
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Wrap in tlv-description container with embedded responsive CSS
  s = `<div class="tlv-description" dir="rtl">\n${EMBEDDED_CSS}\n${s}\n</div>`;
  return s.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Missing authorization" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid token" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const {
      description = "",
      productName = "",
      productType = "",
      images = [],
      style: rawStyle = "medium",
    } = body;

    const style: Style = ["simple", "medium", "fancy", "ultra"].includes(rawStyle) ? rawStyle : "medium";

    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "description مطلوب" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description.length > MAX_DESC_LENGTH) {
      return new Response(JSON.stringify({ ok: false, error: `الوصف طويل جداً (الحد ${MAX_DESC_LENGTH})` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanImages: string[] = Array.isArray(images)
      ? Array.from(new Set(images.filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u)))).slice(0, 8) as string[]
      : [];

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await admin
      .from("settings").select("value").eq("user_id", userId).eq("key", "ai").single();
    const ai = settings?.value as any;
    let provider = ai?.provider || "gemini";
    if (provider === "lovable") provider = "gemini";
    const geminiKey = ai?.gemini_api_key;
    const openrouterKey = ai?.openrouter_api_key;
    const openrouterModel = ai?.openrouter_model || "google/gemma-3-27b-it:free";

    const system = buildSystemPrompt(productName, productType, cleanImages, style);
    const user = `الوصف الخام:\n${description}\n\nأنشئ الآن المخرج كاملاً HTML فقط حسب النمط "${style}".`;

    let result: any = null;
    if (provider === "gemini") {
      if (!geminiKey) {
        return new Response(JSON.stringify({ ok: false, error: "مفتاح Gemini API غير مُهيأ في الإعدادات" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      result = await callGemini(geminiKey, system, user);
      if (!result.ok && openrouterKey) {
        result = await callOpenRouter(openrouterKey, openrouterModel, system, user);
        if (result.ok) result.provider = "openrouter";
      } else if (result.ok) {
        result.provider = "gemini";
      }
    } else {
      if (!openrouterKey) {
        return new Response(JSON.stringify({ ok: false, error: "مفتاح OpenRouter غير مُهيأ" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      result = await callOpenRouter(openrouterKey, openrouterModel, system, user);
      if (result.ok) result.provider = "openrouter";
    }

    if (!result.ok) {
      return new Response(JSON.stringify({
        ok: false, error: "فشل توليد الوصف الاحترافي", details: result.error, status: result.status,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = sanitizeHtml(result.text, cleanImages, style);

    try {
      await admin.from("ai_requests").insert({
        user_id: userId,
        endpoint: "enhance-description",
        provider: result.provider,
        model: result.model,
        status: "success",
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      ok: true, html, provider: result.provider, model: result.model, style,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("enhance-description error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
