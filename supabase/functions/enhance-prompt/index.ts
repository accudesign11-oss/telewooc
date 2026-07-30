import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_IDEA_LENGTH = 5000;
const VALID_OUTPUT_TYPES = ['image', 'text', 'app', 'tool', 'video', 'other'];
const VALID_STYLES = ['detailed', 'concise', 'creative', 'technical'];

// Keep the UX snappy even if the upstream AI provider is slow/overloaded.
const UPSTREAM_TIMEOUT_MS = 18_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateInput(body: any): { valid: boolean; error?: string } {
  const { idea, output_type, style } = body;

  if (!idea || typeof idea !== 'string') {
    return { valid: false, error: 'idea is required and must be a string' };
  }

  if (idea.length > MAX_IDEA_LENGTH) {
    return { valid: false, error: `idea must be less than ${MAX_IDEA_LENGTH} characters` };
  }

  if (output_type && !VALID_OUTPUT_TYPES.includes(output_type)) {
    return { valid: false, error: `Invalid output_type. Valid types: ${VALID_OUTPUT_TYPES.join(', ')}` };
  }

  if (style && !VALID_STYLES.includes(style)) {
    return { valid: false, error: `Invalid style. Valid styles: ${VALID_STYLES.join(', ')}` };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);
    // ===== END AUTHENTICATION =====

    const body = await req.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { idea, output_type = 'image', style = 'detailed', platform = 'general', aspect_ratio = '1:1' } = body;

    // ===== Get user AI settings =====
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await adminSupabase
      .from("settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "ai")
      .single();

    const aiSettings = settings?.value as { provider?: string; gemini_api_key?: string; openrouter_api_key?: string; openrouter_model?: string } | null;
    let userProvider = aiSettings?.provider || "gemini";
    if (userProvider === "lovable") userProvider = "gemini"; // legacy safety
    const geminiApiKey = aiSettings?.gemini_api_key;
    const openrouterApiKey = aiSettings?.openrouter_api_key;
    const openrouterModel = aiSettings?.openrouter_model || "google/gemma-3-27b-it:free";

    console.log(`AI provider: ${userProvider}`);
    // Don't log secrets (even partially). Just log whether they're configured.
    console.log(`Gemini key configured: ${Boolean(geminiApiKey)}`);
    console.log(`OpenRouter key configured: ${Boolean(openrouterApiKey)}`);

    // Build system prompt based on output type
    const systemPrompts: Record<string, string> = {
      image: `أنت خبير في هندسة البرومبتات لتوليد الصور بالذكاء الاصطناعي.
مهمتك: تحويل الفكرة البسيطة إلى برومبت تفصيلي احترافي لتوليد صور عالية الجودة.

المتطلبات:
- صِف المشهد بتفاصيل دقيقة (الإضاءة، الزوايا، الألوان، التكوين)
- أضف مواصفات تقنية (جودة 8K، تفاصيل حادة، واقعية)
- حدد الأسلوب الفني (فوتوغرافي، رسم، 3D، إلخ)
- أضف عناصر جمالية تعزز الصورة
- اكتب البرومبت بالإنجليزية للتوافق مع منصات توليد الصور
- الأبعاد المطلوبة: ${aspect_ratio}
- المنصة المستهدفة: ${platform}`,

      text: `أنت خبير في صياغة المحتوى النصي.
مهمتك: تحويل الفكرة البسيطة إلى تعليمات تفصيلية لكتابة محتوى احترافي.

المتطلبات:
- حدد نوع المحتوى (مقال، منشور، رسالة، إلخ)
- صِف الأسلوب والنبرة المطلوبة
- حدد الجمهور المستهدف
- أضف هيكل المحتوى المقترح
- حدد الطول المناسب
- أضف نقاط رئيسية يجب تغطيتها`,

      app: `أنت خبير في تحليل وتصميم التطبيقات والمواقع.
مهمتك: تحويل الفكرة البسيطة إلى مواصفات تفصيلية لتطوير تطبيق أو موقع.

المتطلبات:
- صِف الميزات الرئيسية بالتفصيل
- حدد تجربة المستخدم (UX) المطلوبة
- اقترح التقنيات المناسبة
- صِف واجهة المستخدم (UI) المتوقعة
- حدد قاعدة البيانات والبنية المطلوبة
- أضف اعتبارات الأمان والأداء
- المنصة المستهدفة: ${platform}`,

      tool: `أنت خبير في تطوير الأدوات والأتمتة.
مهمتك: تحويل الفكرة البسيطة إلى مواصفات تفصيلية لبناء أداة أو سكريبت.

المتطلبات:
- صِف الوظيفة الرئيسية بدقة
- حدد المدخلات والمخرجات المتوقعة
- اقترح اللغة أو التقنية المناسبة
- أضف خطوات التنفيذ
- حدد حالات الخطأ والتعامل معها
- أضف أمثلة على الاستخدام`,

      video: `أنت خبير في صناعة محتوى الفيديو.
مهمتك: تحويل الفكرة البسيطة إلى سيناريو أو برومبت لتوليد فيديو.

المتطلبات:
- صِف المشهد بالتفصيل (الحركة، الإضاءة، الزوايا)
- حدد مدة الفيديو المقترحة
- صِف الأسلوب البصري
- أضف تعليمات الصوت/الموسيقى إن وجدت
- حدد الانتقالات بين المشاهد
- الأبعاد: ${aspect_ratio}`,

      other: `أنت خبير في تحويل الأفكار إلى تعليمات تفصيلية.
مهمتك: تحويل أي فكرة إلى برومبت شامل ومفصل.

المتطلبات:
- افهم طبيعة الفكرة وهدفها
- أضف تفاصيل تقنية وإبداعية
- حدد المخرجات المتوقعة
- أضف معايير الجودة
- اقترح تحسينات إضافية`
    };

    const styleInstructions: Record<string, string> = {
      detailed: 'اكتب برومبت تفصيلي جداً يغطي كل جانب ممكن. لا تترك أي تفصيلة.',
      concise: 'اكتب برومبت موجز ودقيق يركز على العناصر الأساسية فقط.',
      creative: 'اكتب برومبت إبداعي ومبتكر مع أفكار غير تقليدية.',
      technical: 'اكتب برومبت تقني ودقيق مع مواصفات محددة وقابلة للقياس.'
    };

    const systemPrompt = `${systemPrompts[output_type] || systemPrompts.other}

أسلوب البرومبت: ${styleInstructions[style] || styleInstructions.detailed}

التعليمات النهائية:
- اكتب البرومبت الناتج بشكل منظم ومقسم
- لا تضف مقدمات أو تعليقات - فقط البرومبت المحسّن
- تأكد أن البرومبت قابل للاستخدام مباشرة`;

    const userMessage = `حوّل هذه الفكرة إلى برومبت تفصيلي احترافي:\n\n${idea}`;

    let response: Response | null = null;
    let usedModel = "";
    let usedProvider: "gemini" | "openrouter" = userProvider === "openrouter" ? "openrouter" : "gemini";
    let lastUpstreamError: unknown = null;

    // Gemini models (v1beta) - "latest" aliases auto-upgrade to newest free model
    const GEMINI_MODELS = [
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ];

    if (userProvider === "gemini") {
      if (!geminiApiKey) {
        return new Response(JSON.stringify({ error: "مفتاح Gemini API غير مُهيأ. اذهب للإعدادات." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try Gemini models with fallback
      for (const model of GEMINI_MODELS) {
        console.log(`Trying Gemini model: ${model}`);
        usedModel = model;
        usedProvider = "gemini";
        try {
          response = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userMessage }] }],
              }),
            },
            UPSTREAM_TIMEOUT_MS
          );
        } catch (e) {
          lastUpstreamError = e;
          response = null;
          console.error("Gemini request failed:", e);

          // Try next model if available; otherwise we'll fallback/return an error below.
          if (GEMINI_MODELS.indexOf(model) < GEMINI_MODELS.length - 1) continue;
          break;
        }
        
        // Retry on quota / model-not-found / transient internal
        const shouldRetry =
          response.status === 429 ||
          response.status === 404 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;
        if (shouldRetry && GEMINI_MODELS.indexOf(model) < GEMINI_MODELS.length - 1) {
          console.log(`Gemini model ${model} returned ${response.status}, trying next...`);
          continue;
        }
        
        break; // Use this response (success or final failure)
      }

      // Auto-fallback to OpenRouter if Gemini fails and OpenRouter is configured
      const geminiStatus = response?.status;
      const shouldFallbackToOpenRouter =
        !response ||
        (!response.ok && (geminiStatus === 404 || geminiStatus === 429 || geminiStatus === 500 || geminiStatus === 502 || geminiStatus === 503 || geminiStatus === 504));

      if (shouldFallbackToOpenRouter && openrouterApiKey) {
        console.log(`Gemini failed (${geminiStatus ?? "no-response"}); falling back to OpenRouter...`);
        usedProvider = "openrouter";
        usedModel = openrouterModel;
        try {
          response = await fetchWithTimeout(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openrouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": supabaseUrl,
              },
              body: JSON.stringify({
                model: usedModel,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userMessage },
                ],
              }),
            },
            UPSTREAM_TIMEOUT_MS
          );
        } catch (e) {
          lastUpstreamError = e;
          response = null;
          console.error("OpenRouter request failed:", e);
        }
      }
    } else if (userProvider === "openrouter") {
      if (!openrouterApiKey) {
        return new Response(JSON.stringify({ error: "مفتاح OpenRouter API غير مُهيأ. اذهب للإعدادات." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      usedProvider = "openrouter";
      usedModel = openrouterModel;
      try {
        response = await fetchWithTimeout(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": supabaseUrl,
            },
            body: JSON.stringify({
              model: usedModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
              ],
            }),
          },
          UPSTREAM_TIMEOUT_MS
        );
      } catch (e) {
        lastUpstreamError = e;
        response = null;
        console.error("OpenRouter request failed:", e);
      }
    } else {
      return new Response(JSON.stringify({ error: "مزود AI غير معروف" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response) {
      // Timeout / network error.
      console.error("AI error: no response", lastUpstreamError);

      return new Response(
        JSON.stringify({
          ok: false,
          status: 504,
          error: "انتهت مهلة الاتصال بالمزود",
          hint: "المزود مشغول أو الاتصال بطيء. جرّب مرة أخرى أو استخدم التوليد المحلي.",
          provider: usedProvider,
          model: usedModel,
          details: lastUpstreamError instanceof Error ? lastUpstreamError.message : String(lastUpstreamError),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);

      // IMPORTANT: return 200 with structured error so the client doesn't get a FunctionsHttpError
      // and can show a proper toast message.
      const status = response.status;
      const hint =
        status === 429
          ? (userProvider === "gemini"
              ? "جرّب بعد قليل أو غيّر المزود إلى OpenRouter من الإعدادات."
              : "جرّب بعد قليل أو غيّر النموذج/المزود من الإعدادات.")
          : status === 401 || status === 403
            ? "المفتاح غير صالح أو غير مصرح. تأكد من المفتاح ثم احفظه من الإعدادات."
            : "تحقق من إعدادات المزود ثم حاول مرة أخرى.";

      const friendlyError =
        status === 429
          ? "تم تجاوز حد الطلبات، حاول لاحقاً"
          : status === 402
            ? "لا يوجد رصيد كافي لدى المزود"
            : status === 503
              ? "الموديل مشغول حالياً، حاول بعد قليل"
              : "فشل تحسين البرومبت";

      return new Response(
         JSON.stringify({
          ok: false,
          status,
          error: friendlyError,
          hint,
           provider: usedProvider,
          model: usedModel,
          details: errorText?.substring?.(0, 800) || errorText,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    let enhancedPrompt = "";
    if (usedProvider === "gemini") {
      enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      enhancedPrompt = data.choices?.[0]?.message?.content || "";
    }

    return new Response(JSON.stringify({ 
      enhanced_prompt: enhancedPrompt,
      original_idea: idea,
      output_type,
      style,
      provider: usedProvider,
      model: usedModel
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhance prompt error:', error);
    // Return 200 to avoid client-side FunctionsHttpError; surface error in payload.
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        hint: "حاول مرة أخرى بعد قليل أو غيّر المزود من الإعدادات.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
