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

const SERVICE_CARDS_HTML = `<div style="display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; direction:rtl; text-align:right;">
  <div style="flex:1; min-width:110px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
    <span style="font-size:22px; display:block; margin-bottom:4px;">🚚</span>
    <h3 style="font-size:12px; font-weight:700; color:#0f172a; margin:0 0 2px 0;">شحن مجاني</h3>
    <p style="font-size:10px; color:#64748b; margin:0;">توصيل سريع لباب المنزل</p>
  </div>
  <div style="flex:1; min-width:110px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
    <span style="font-size:22px; display:block; margin-bottom:4px;">🛡️</span>
    <h3 style="font-size:12px; font-weight:700; color:#0f172a; margin:0 0 2px 0;">ضمان الجودة</h3>
    <p style="font-size:10px; color:#64748b; margin:0;">ضمان الخامات والجودة</p>
  </div>
  <div style="flex:1; min-width:110px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
    <span style="font-size:22px; display:block; margin-bottom:4px;">💳</span>
    <h3 style="font-size:12px; font-weight:700; color:#0f172a; margin:0 0 2px 0;">دفع آمن</h3>
    <p style="font-size:10px; color:#64748b; margin:0;">طرق دفع مرنة ومريحة</p>
  </div>
</div>`;

function getLiveHelpHtml(companyName?: string): string {
  const cName = companyName && companyName.trim() ? companyName.trim() : "المتجر";
  return `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px; text-align:center; margin-top:16px; direction:rtl;">
    <h2 style="font-size:13px; font-weight:700; color:#166534; margin:0 0 4px 0;">هل تحتاج إلى مساعدة؟ 💬</h2>
    <p style="font-size:11px; color:#15803d; margin:0;">فريق خدمة العملاء في ${cName} جاهز لمساعدتك في اختيار المنتج المناسب لمساحتك.</p>
  </div>`;
}

type Style = "simple" | "medium" | "fancy" | "ultra";

function styleDirective(style: Style, hasImages: boolean, companyName?: string, customInstructions?: string): string {
  const liveHelpHtml = getLiveHelpHtml(companyName);
  let baseDirective = "";

  if (style === "simple") {
    baseDirective = `النمط المطلوب: عادي/مختصر.
الترتيب:
1) عنوان <h2>…</h2>
2) فقرتان قصيرتان <p dir="rtl">…</p>
3) جدول مواصفات <table>…</table>
ممنوع كروت الخدمات/المميزات/قسم المساعدة. ${hasImages ? "أدرج صورة واحدة كحد أقصى." : "ممنوع <img>."}`;
  } else if (style === "medium") {
    baseDirective = `النمط المطلوب: وسط.
الترتيب:
1) كروت الخدمات الثلاث (كما هي حرفياً): ${SERVICE_CARDS_HTML}
2) عنوان رئيسي خاص بالمنتج <h2>…</h2>
3) 3 أقسام: كل واحد <h2>…</h2> + <p dir="rtl">…</p>
4) جدول المواصفات <table>.
${hasImages ? "وزّع 1-2 صورة <img style=\"max-width:100%; border-radius:8px; margin:12px auto; display:block;\"> بين الأقسام من الروابط المعطاة فقط." : "ممنوع <img>."}
بدون كروت مميزات وبدون قسم مساعدة.`;
  } else if (style === "fancy") {
    baseDirective = `النمط المطلوب: مبهرج (القالب الكامل).
الترتيب:
1) كروت الخدمات: ${SERVICE_CARDS_HTML}
2) عنوان رئيسي
3) 3-4 أقسام (h2 + p)
4) قسم المميزات بأربعة كروت بأسلوب inline style
5) جدول مواصفات
6) قسم المساعدة: ${liveHelpHtml}
${hasImages ? "وزّع 2-3 صور <img style=\"max-width:100%; border-radius:8px; margin:12px auto; display:block;\"> بين الفقرات من الروابط المعطاة فقط." : "ممنوع <img>."}`;
  } else {
    // ultra
    baseDirective = `النمط المطلوب: مبهرج جداً (الأكثر تفصيلًا).
الترتيب:
1) شريط متحرك أعلى الوصف: <div style="background:#eff6ff; color:#1d4ed8; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; text-align:center; margin-bottom:12px;"><span>عروض حصرية • جودة عالية • شحن سريع • ضمان 5 أعوام</span></div>
2) كروت الخدمات: ${SERVICE_CARDS_HTML}
3) عنوان رئيسي
4) 4-5 أقسام كل واحد بداخل <div> ويحتوي h2 + p dir="rtl"
5) قسم المميزات بـ 6 كروت صغيرة بأسلوب inline style
6) جدول مواصفات تفصيلي (6+ صفوف)
7) قسم المساعدة: ${liveHelpHtml}
${hasImages ? "وزّع 3-5 صور <img style=\"max-width:100%; border-radius:8px; margin:12px auto; display:block;\"> بين الفقرات من الروابط المعطاة فقط بدون تكرار." : "ممنوع <img>."}`;
  }

  if (customInstructions && customInstructions.trim()) {
    baseDirective += `\n\n📌 تعليمات مخصصة صارمة مدخلة من المستخدم (يجب تطبيقها حرفياً في إخراج الوصف والتنسيق):
${customInstructions.trim()}`;
  }

  return baseDirective;
}

function buildSystemPrompt(productName: string, productType: string, images: string[], style: Style, companyName?: string, customInstructions?: string) {
  const imagesBlock = images.length
    ? `صور المنتج المتاحة (استخدم فقط منها ووزّعها بين الفقرات بدون تكرار):\n${images.map((u, i) => `${i + 1}. ${u}`).join("\n")}`
    : `لا توجد صور للمنتج. ممنوع أي وسم <img>.`;

  return `أنت كاتب محتوى وتنسيقات واجهات احترافي لمتجر إلكتروني مميز على WooCommerce.
أخرج HTML نظيف فقط — بدون أي وسوم <style> وبدون أي وسوم \`\`\`html.

اسم المتجر/الشركة: ${companyName || "المتجر"}
اسم المنتج: ${productName}
نوع المنتج: ${productType || "غير محدد"}

${imagesBlock}

قواعد صارمة:
- HTML فقط. لا markdown، لا \`\`\`html.
- ممنوع: <script>, <style>.
- نصوص عربية فصحى، dir="rtl" على الفقرات.

${styleDirective(style, images.length > 0, companyName, customInstructions)}

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

  // 1. Remove all markdown code fences & backticks anywhere in string
  s = s.replace(/```[a-z]*\n?/gi, "");
  s = s.replace(/```/g, "");

  // 2. Remove LLM text preambles before the first HTML tag
  const firstTagIndex = s.search(/<[a-z1-6]/i);
  if (firstTagIndex > 0) {
    const preamble = s.substring(0, firstTagIndex);
    if (/وصف|كود|html|المنتج|المثال|مخرج|تفضل|هذا/i.test(preamble) || preamble.includes("`")) {
      s = s.substring(firstTagIndex);
    }
  }

  // 3. Remove script, style tags, and raw CSS rule blocks
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/\.tlv-[^{]+\{[^}]*\}/gi, "");
  s = s.replace(/@media[^{]+\{(?:[^{}]*|\{[^}]*\})*\}/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");

  // 4. Inject clean inline styles into tags if missing so WooCommerce renders them natively
  s = s.replace(/<h2(?![^>]*style=)/gi, '<h2 style="font-size:16px; font-weight:800; color:#0f172a; margin:18px 0 8px 0; border-right:4px solid #3b82f6; padding-right:8px; direction:rtl; text-align:right;"');
  s = s.replace(/<h3(?![^>]*style=)/gi, '<h3 style="font-size:14px; font-weight:700; color:#1e293b; margin:12px 0 6px 0; direction:rtl; text-align:right;"');
  s = s.replace(/<p(?![^>]*style=)/gi, '<p style="font-size:13px; line-height:1.7; color:#334155; margin-bottom:12px; direction:rtl; text-align:right;"');
  s = s.replace(/<table(?![^>]*style=)/gi, '<table style="width:100%; border-collapse:collapse; margin:14px 0; font-size:12px; direction:rtl; text-align:right;"');
  s = s.replace(/<th(?![^>]*style=)/gi, '<th style="background-color:#f1f5f9; border:1px solid #cbd5e1; padding:8px 10px; font-weight:700; color:#0f172a;"');
  s = s.replace(/<td(?![^>]*style=)/gi, '<td style="border:1px solid #e2e8f0; padding:8px 10px; color:#334155;"');

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

  // Wrap in main container with inline RTL and font style
  s = `<div style="direction:rtl; text-align:right; font-family:system-ui, -apple-system, sans-serif; color:#1e293b; line-height:1.6;">\n${s.trim()}\n</div>`;
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
      customInstructions = "",
      custom_instructions = "",
    } = body;

    const effectiveInstructions = String(customInstructions || custom_instructions || "").trim();
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

    const system = buildSystemPrompt(productName, productType, cleanImages, style, undefined, effectiveInstructions);
    let userPromptText = `الوصف الخام:\n${description}\n\nأنشئ الآن المخرج كاملاً HTML فقط حسب النمط "${style}".`;
    if (effectiveInstructions) {
      userPromptText += `\n\nتذكر تطبيق التوجيهات الخاصة التالية بدقة 100%:\n${effectiveInstructions}`;
    }

    let result: any = null;
    if (provider === "gemini") {
      if (!geminiKey) {
        return new Response(JSON.stringify({ ok: false, error: "مفتاح Gemini API غير مُهيأ في الإعدادات" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      result = await callGemini(geminiKey, system, userPromptText);
      if (!result.ok && openrouterKey) {
        result = await callOpenRouter(openrouterKey, openrouterModel, system, userPromptText);
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
      result = await callOpenRouter(openrouterKey, openrouterModel, system, userPromptText);
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
