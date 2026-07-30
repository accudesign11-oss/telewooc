import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Free OpenRouter models with good availability
const FREE_OPENROUTER_MODELS = [
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "qwen/qwen-2.5-vl-7b-instruct:free",
];

// Hugging Face models for text generation
const HUGGINGFACE_TEXT_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.3",
  "google/gemma-2-2b-it",
  "HuggingFaceH4/zephyr-7b-beta",
];

// Input validation constants
const MAX_TEXT_LENGTH = 50000;
const MAX_DRAFT_ID_LENGTH = 100;
const VALID_FIELDS = ["name", "short_description", "long_description"];
const VALID_MODES = ["full", "field"];

function validateInputs(body: any): { valid: boolean; error?: string } {
  const { draft_product_id, original_text, field, mode } = body;
  
  if (!original_text || typeof original_text !== "string") {
    return { valid: false, error: "original_text is required and must be a string" };
  }
  if (original_text.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `Text too long (max ${MAX_TEXT_LENGTH / 1000}KB)` };
  }
  
  if (draft_product_id !== undefined && draft_product_id !== null) {
    if (typeof draft_product_id !== "string") {
      return { valid: false, error: "draft_product_id must be a string" };
    }
    if (draft_product_id.length > MAX_DRAFT_ID_LENGTH) {
      return { valid: false, error: "draft_product_id is too long" };
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(draft_product_id)) {
      return { valid: false, error: "draft_product_id must be a valid UUID" };
    }
  }
  
  if (field !== undefined && field !== null) {
    if (typeof field !== "string" || !VALID_FIELDS.includes(field)) {
      return { valid: false, error: `field must be one of: ${VALID_FIELDS.join(", ")}` };
    }
  }
  
  if (mode !== undefined && mode !== null) {
    if (typeof mode !== "string") {
      return { valid: false, error: "mode must be a string" };
    }
  }
  
  return { valid: true };
}

// Hugging Face API call
async function callHuggingFaceAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  modelIndex: number = 0
): Promise<{ response: Response; usedModel: string }> {
  const model = HUGGINGFACE_TEXT_MODELS[modelIndex % HUGGINGFACE_TEXT_MODELS.length];
  console.log(`Trying Hugging Face model: ${model}`);
  
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: `<|system|>\n${systemPrompt}\n<|user|>\n${userPrompt}\n<|assistant|>`,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  // If rate limited or model loading, try next model
  if ((response.status === 429 || response.status === 503) && modelIndex < HUGGINGFACE_TEXT_MODELS.length - 1) {
    console.log(`Model ${model} returned ${response.status}, trying next...`);
    return callHuggingFaceAPI(apiKey, systemPrompt, userPrompt, modelIndex + 1);
  }

  return { response, usedModel: model };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    
    const validation = validateInputs(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { draft_product_id, original_text, field, mode } = body;

    // Get user's AI settings
    const { data: aiSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "ai")
      .single();

    let provider = (aiSettings?.value as any)?.provider || "gemini";
    if (provider === "lovable") provider = "gemini"; // Lovable removed
    
    const geminiApiKey = (aiSettings?.value as any)?.gemini_api_key;
    const openrouterApiKey = (aiSettings?.value as any)?.openrouter_api_key;
    const huggingfaceApiKey = (aiSettings?.value as any)?.huggingface_api_key;
    const preferredModel = (aiSettings?.value as any)?.openrouter_model;

    console.log(`User ${user.id} AI provider: ${provider}`);
    console.log(`Gemini key: ${geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`OpenRouter key: ${openrouterApiKey ? openrouterApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`HuggingFace key: ${huggingfaceApiKey ? huggingfaceApiKey.substring(0, 10) + '...' : 'NOT SET'}`);

    const startTime = Date.now();

    // Full product analysis mode
    if (mode === "full" || !field) {
      const systemPrompt = `أنت خبير في التجارة الإلكترونية ومتخصص في تحويل منشورات التواصل الاجتماعي إلى منتجات احترافية.

مهمتك:
1. تحليل النص المُعطى واستخراج معلومات المنتج
2. كتابة اسم منتج جذاب ومختصر (3-7 كلمات)
3. كتابة وصف قصير مقنع (جملة أو جملتين)
4. كتابة وصف تفصيلي احترافي (3-5 فقرات) يشمل المميزات والفوائد
5. استخراج السعر إن وُجد
6. استخراج المتغيرات (الألوان، المقاسات، الأحجام، إلخ) إن ذُكرت

القواعد:
- اكتب بالعربية الفصحى السهلة
- كن مقنعاً وجذاباً
- لا تختلق معلومات غير موجودة في النص
- استخدم كلمات SEO مناسبة
- إذا ذُكرت ألوان أو مقاسات، استخرجها كمتغيرات`;

      const userPrompt = `حلل هذا المنشور واستخرج منه منتجاً كاملاً:

${original_text}

أرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "name": "اسم المنتج الجذاب",
  "short_description": "وصف قصير مقنع",
  "long_description": "وصف تفصيلي شامل مع المميزات والفوائد",
  "price": null أو الرقم,
  "tags": ["تاغ1", "تاغ2"],
  "attributes": [
    {"name": "اللون", "values": ["أحمر", "أزرق"], "is_variation": true},
    {"name": "المقاس", "values": ["S", "M", "L"], "is_variation": true}
  ]
}

ملاحظة: attributes تكون فارغة [] إذا لم يُذكر ألوان أو مقاسات`;

      const { response, usedModel } = await callAIWithFallback(
        provider, geminiApiKey, openrouterApiKey, huggingfaceApiKey, 
        systemPrompt, userPrompt, supabaseUrl, preferredModel
      );
      
      if (!response.ok) {
        return handleAIError(response, corsHeaders, provider, usedModel);
      }

      const aiData = await response.json();
      let aiResponse = parseAIResponse(provider, aiData);
      const latencyMs = Date.now() - startTime;

      await logAIRequest(supabase, user.id, draft_product_id, provider, usedModel, userPrompt, aiResponse, latencyMs);

      let result;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { error: "Could not parse JSON", raw: aiResponse };
        }
      } catch (e) {
        result = { error: "JSON parse error", raw: aiResponse };
      }

      console.log(`AI full analysis [${provider}/${usedModel}] for user ${user.id}, latency: ${latencyMs}ms`);

      return new Response(
        JSON.stringify({ success: true, result, latency_ms: latencyMs, provider, model: usedModel }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single field regeneration mode
    const systemPrompt = `أنت مساعد متخصص في كتابة محتوى منتجات التجارة الإلكترونية بالعربية.
اكتب محتوى احترافي وجذاب ومقنع.
استخدم كلمات SEO مناسبة.
كن موجزاً ودقيقاً.`;

    let userPrompt = "";
    
    if (field === "name") {
      userPrompt = `اكتب اسم منتج جذاب ومختصر (3-7 كلمات) بناءً على هذا النص:

${original_text}

أرجع الاسم فقط بدون أي نص إضافي.`;
    } else if (field === "short_description") {
      userPrompt = `اكتب وصفاً قصيراً ومقنعاً للمنتج (جملة أو جملتين) بناءً على:

${original_text}

أرجع الوصف فقط بدون أي نص إضافي.`;
    } else if (field === "long_description") {
      userPrompt = `اكتب وصفاً تفصيلياً احترافياً للمنتج (3-5 فقرات) يشمل المميزات والفوائد بناءً على:

${original_text}

أرجع الوصف فقط بدون أي نص إضافي.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown field" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { response, usedModel } = await callAIWithFallback(
      provider, geminiApiKey, openrouterApiKey, huggingfaceApiKey, 
      systemPrompt, userPrompt, supabaseUrl, preferredModel
    );
    
    if (!response.ok) {
      return handleAIError(response, corsHeaders, provider, usedModel);
    }

    const aiData = await response.json();
    let aiResponse = parseAIResponse(provider, aiData);
    const latencyMs = Date.now() - startTime;

    await logAIRequest(supabase, user.id, draft_product_id, provider, usedModel, userPrompt, aiResponse, latencyMs);

    console.log(`AI field [${field}] [${provider}/${usedModel}] for user ${user.id}, latency: ${latencyMs}ms`);

    return new Response(
      JSON.stringify({ success: true, result: aiResponse.trim(), latency_ms: latencyMs, provider, model: usedModel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ai-process error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Gemini models (v1beta)
// NOTE: Keep in sync with analyze-image for best availability.
// Always prefer the "latest" aliases so we automatically pick up the newest
// free Gemini model whenever Google releases an update – without code changes.
const GEMINI_MODELS = [
  "gemini-flash-latest",       // Auto-updates to newest free flash model
  "gemini-flash-lite-latest",  // Auto-updates to newest free lite flash model
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

async function callAIWithFallback(
  provider: string, 
  geminiApiKey: string | undefined, 
  openrouterApiKey: string | undefined,
  huggingfaceApiKey: string | undefined,
  systemPrompt: string, 
  userPrompt: string, 
  supabaseUrl: string,
  preferredModel?: string
): Promise<{ response: Response; usedModel: string }> {
  
  // Gemini with model fallback
  if (provider === "gemini" && geminiApiKey) {
    for (const model of GEMINI_MODELS) {
      console.log(`Trying Gemini model: ${model}`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        }),
      });
      
      // Retry on quota / model-not-found / transient internal
      const shouldRetry = response.status === 429 || response.status === 404 || response.status === 500;
      if (shouldRetry && GEMINI_MODELS.indexOf(model) < GEMINI_MODELS.length - 1) {
        console.log(`Gemini model ${model} returned ${response.status}, trying next...`);
        continue;
      }
      
      return { response, usedModel: model };
    }

    // Should never reach here (loop returns), but keep a safe fallback.
    return {
      response: new Response(JSON.stringify({ error: "فشل استدعاء Gemini" }), { status: 500 }),
      usedModel: GEMINI_MODELS[GEMINI_MODELS.length - 1],
    };
  }
  
  // OpenRouter
  if (provider === "openrouter" && openrouterApiKey) {
    const modelsToTry = preferredModel 
      ? [preferredModel, ...FREE_OPENROUTER_MODELS.filter(m => m !== preferredModel)]
      : FREE_OPENROUTER_MODELS;

    for (const model of modelsToTry) {
      console.log(`Trying OpenRouter model: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (response.ok || (response.status !== 429 && response.status !== 503)) {
        return { response, usedModel: model };
      }

      console.log(`Model ${model} returned ${response.status}, trying next...`);
    }

    const lastModel = modelsToTry[modelsToTry.length - 1];
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
      },
      body: JSON.stringify({
        model: lastModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    return { response, usedModel: lastModel };
  }
  
  // Hugging Face
  if (provider === "huggingface" && huggingfaceApiKey) {
    return callHuggingFaceAPI(huggingfaceApiKey, systemPrompt, userPrompt);
  }
  
  // No valid provider/key
  const errorResponse = new Response(JSON.stringify({ 
    error: "لا يوجد مزود AI مُعد. اذهب للإعدادات → AI وأضف مفتاح Gemini أو OpenRouter أو Hugging Face." 
  }), { status: 400 });
  return { response: errorResponse, usedModel: "none" };
}

function parseAIResponse(provider: string, aiData: any): string {
  if (provider === "gemini") {
    return aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (provider === "huggingface") {
    // Hugging Face returns array with generated_text
    if (Array.isArray(aiData) && aiData[0]?.generated_text) {
      return aiData[0].generated_text;
    }
    return aiData?.generated_text || "";
  }
  // OpenRouter format
  return aiData.choices?.[0]?.message?.content || "";
}

async function handleAIError(
  response: Response,
  corsHeaders: Record<string, string>,
  provider: string,
  model: string
) {
  const errorText = await response.text();
  const status = response.status || 500;
  console.error("AI error:", status, errorText, "provider:", provider, "model:", model);

  let message = "فشل في المعالجة";
  let hint = "تحقق من إعدادات AI ومفاتيح API";

  if (status === 429) {
    message = "تم تجاوز حد الطلبات للمزود";
    hint = `انتظر دقيقة أو غيّر المزود من الإعدادات (حالياً: ${provider})`;
  } else if (status === 402) {
    message = "يرجى إضافة رصيد للمزود";
    hint = `تحقق من رصيدك في ${provider}`;
  } else if (status === 503) {
    message = "النموذج قيد التحميل";
    hint = "حاول مرة أخرى بعد ثوانٍ";
  } else if (status === 404) {
    message = "النموذج غير متاح";
    hint = `جرّب تغيير المزود من الإعدادات (حالياً: ${provider}/${model})`;
  } else if (status === 400) {
    message = "طلب غير صالح";
    hint = "تحقق من المفتاح أو النص المُدخل";
  } else if (status === 401 || status === 403) {
    message = "مفتاح API غير صالح";
    hint = `تحقق من مفتاح ${provider} في الإعدادات`;
  } else {
    message = `خطأ من ${provider}`;
    hint = errorText?.substring?.(0, 100) || "حاول مرة أخرى";
  }

  // Return 200 so the client can show the real error
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      hint,
      status,
      provider,
      model,
      details: errorText?.substring?.(0, 800) || errorText,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function logAIRequest(supabase: any, userId: string, draftProductId: string | null, provider: string, model: string, prompt: string, response: string, latencyMs: number) {
  await supabase.from("ai_requests").insert({
    user_id: userId,
    draft_product_id: draftProductId || null,
    provider: provider,
    model: model,
    prompt: prompt.substring(0, 1000),
    response: response.substring(0, 5000),
    status: "success",
    latency_ms: latencyMs,
    tokens_estimate: Math.ceil((prompt.length + response.length) / 4),
  });
}
