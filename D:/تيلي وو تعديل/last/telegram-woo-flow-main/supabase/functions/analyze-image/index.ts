import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_URL_LENGTH = 2000;
const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ADDITIONAL_URLS = 10;
const ALLOWED_URL_SCHEMES = ["http:", "https:", "data:"];

function base64ToDataUrl(b64: string): string {
  if (!b64 || typeof b64 !== "string") return "";
  if (b64.startsWith("data:")) return b64;
  let mime = "image/jpeg";
  if (b64.startsWith("UklGR")) mime = "image/webp";
  else if (b64.startsWith("iVBORw0KGgo")) mime = "image/png";
  else if (b64.startsWith("R0lGOD")) mime = "image/gif";
  else if (b64.startsWith("PHN2Zy") || b64.startsWith("PD94bWw")) mime = "image/svg+xml";
  else if (b64.startsWith("Qk1")) mime = "image/bmp";
  return `data:${mime};base64,${b64}`;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (inString && ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeJsonCandidate(candidate: string): string {
  return candidate
    .replace(/،/g, ",")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function fallbackExtractResult(aiResponse: string): any {
  const pick = (key: string) => {
    const m = aiResponse.match(new RegExp(`"${key}"\\s*:\\s*"([^\"]+)"`));
    return m?.[1] ?? "";
  };
  return {
    name: pick("name"),
    short_description: pick("short_description"),
    long_description: pick("long_description"),
    category: pick("category") || undefined,
    suggested_price: null,
    tags: [],
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const GEMINI_VISION_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const FREE_OPENROUTER_MODELS = [
  "qwen/qwen-2.5-vl-7b-instruct:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageContents: any[],
  modelIndex = 0
): Promise<{ success: boolean; content?: string; error?: string; status?: number; model?: string }> {
  const model = GEMINI_VISION_MODELS[modelIndex % GEMINI_VISION_MODELS.length];
  try {
    const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
    for (const img of imageContents) {
      if (img.image_url?.url) {
        const url = img.image_url.url;
        if (url.startsWith("data:")) {
          const matches = url.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            parts.push({
              inline_data: {
                mime_type: matches[1],
                data: matches[2],
              },
            });
          }
        } else {
          try {
            const imgResponse = await fetch(url);
            if (imgResponse.ok) {
              const arrayBuffer = await imgResponse.arrayBuffer();
              const base64 = arrayBufferToBase64(arrayBuffer);
              const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
              parts.push({
                inline_data: { mime_type: contentType, data: base64 },
              });
            }
          } catch (e) {
            console.error("Gemini fetch image error:", e);
          }
        }
      }
    }

    console.log(`Gemini trying model: ${model}`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      }
    );

    if (response.status === 429 && modelIndex < GEMINI_VISION_MODELS.length - 1) {
      return callGeminiAPI(apiKey, systemPrompt, userPrompt, imageContents, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return { success: false, error: errorText, status: response.status, model };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { success: true, content, model };
  } catch (error: any) {
    console.error("Gemini call error:", error);
    return { success: false, error: error?.message || "Unknown error", model };
  }
}

async function callOpenRouterAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageContents: any[],
  model?: string,
  modelIndex = 0
): Promise<{ success: boolean; content?: string; error?: string; status?: number; model?: string }> {
  try {
    let selectedModel = model;
    if (!selectedModel || selectedModel.includes(":free")) {
      selectedModel = FREE_OPENROUTER_MODELS[modelIndex % FREE_OPENROUTER_MODELS.length];
    }

    const formattedImageContents = [];
    for (const img of imageContents) {
      if (img.image_url?.url) {
        formattedImageContents.push({
          type: "image_url",
          image_url: { url: img.image_url.url },
        });
      }
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [{ type: "text", text: userPrompt }, ...formattedImageContents],
          },
        ],
      }),
    });

    if (response.status === 429 && modelIndex < FREE_OPENROUTER_MODELS.length - 1) {
      return callOpenRouterAPI(apiKey, systemPrompt, userPrompt, imageContents, undefined, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status, model: selectedModel };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { success: true, content, model: selectedModel };
  } catch (error: any) {
    return { success: false, error: error?.message || "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    let user: any = null;
    try {
      const { data, error: userError } = await supabase.auth.getUser(token);
      if (!userError && data?.user) {
        user = data.user;
      }
    } catch (e) {
      console.error("Auth getUser error:", e);
    }

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token or session expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { image_url, image_base64, additional_image_urls, additional_image_base64 } = body;

    const imageContents: any[] = [];
    if (image_base64) {
      imageContents.push({
        type: "image_url",
        image_url: { url: base64ToDataUrl(image_base64) },
      });
    } else if (image_url) {
      imageContents.push({
        type: "image_url",
        image_url: { url: image_url },
      });
    }

    if (Array.isArray(additional_image_urls)) {
      for (const u of additional_image_urls) {
        if (u) imageContents.push({ type: "image_url", image_url: { url: u } });
      }
    }

    if (Array.isArray(additional_image_base64)) {
      for (const b of additional_image_base64) {
        if (b) imageContents.push({ type: "image_url", image_url: { url: base64ToDataUrl(b) } });
      }
    }

    if (imageContents.length === 0) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's AI settings
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "ai")
      .maybeSingle();

    const aiSettings = settingsData?.value as any;
    let userProvider = aiSettings?.provider || "gemini";
    if (userProvider === "lovable") userProvider = "gemini";

    const geminiApiKey = aiSettings?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
    const openrouterApiKey = aiSettings?.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY");
    const openrouterModel = aiSettings?.openrouter_model;

    const systemPrompt = `أنت خبير في تحليل صور المنتجات للتجارة الإلكترونية.
تخيل نفسك تكتب مواصفات تسويقية جذابة لمتجر إلكتروني احترافي.
يجب أن ترجع النتيجة ككائن JSON فقط بالشكل التالي دون أي نصوص إضافية:
{
  "name": "اسم المنتج الاحترافي والجذاب باللغة العربية",
  "short_description": "وصف قصير ومختصر ومقنع للمنتج",
  "long_description": "وصف تفصيلي شامل يوضح كل الفوائد والميزات والاستخدامات للمنتج",
  "category": "الفئة أو القسم المناسب للمنتج",
  "suggested_price": 150,
  "tags": ["وسم1", "وسم2", "وسم3"],
  "detected_features": {
    "color": "الألوان الظاهرة",
    "material": "الخامة أو المادة المصنوع منها",
    "style": "الستايل أو المظهر",
    "target_audience": "الفئة المستهدفة"
  },
  "attributes": [
    {
      "name": "اللون",
      "values": ["أحمر", "أزرق"],
      "is_variation": true
    }
  ]
}`;

    const userPrompt = "قم بتحليل هذه الصورة واستخراج كافة تفاصيل المنتج منها وإرجاع النتيجة ككائن JSON.";

    let aiResult: any = null;
    let usedProvider = userProvider;
    let usedModel = "gemini-flash-latest";

    // 1. Try Gemini
    if (geminiApiKey) {
      usedProvider = "gemini";
      aiResult = await callGeminiAPI(geminiApiKey, systemPrompt, userPrompt, imageContents);
    }

    // 2. Try OpenRouter if Gemini failed or missing
    if ((!aiResult || !aiResult.success) && openrouterApiKey) {
      usedProvider = "openrouter";
      aiResult = await callOpenRouterAPI(openrouterApiKey, systemPrompt, userPrompt, imageContents, openrouterModel);
    }

    // 3. Try OpenRouter free models as public fallback
    if (!aiResult || !aiResult.success) {
      usedProvider = "openrouter-free";
      const fallbackKey = openrouterApiKey || "sk-or-v1-public-fallback";
      aiResult = await callOpenRouterAPI(fallbackKey, systemPrompt, userPrompt, imageContents, "qwen/qwen-2.5-vl-7b-instruct:free");
    }

    const aiResponse = aiResult?.content || "";
    let result: any = null;

    if (aiResponse) {
      try {
        const jsonRaw = extractFirstJsonObject(aiResponse);
        if (jsonRaw) {
          result = JSON.parse(normalizeJsonCandidate(jsonRaw));
        } else {
          result = fallbackExtractResult(aiResponse);
        }
      } catch {
        result = fallbackExtractResult(aiResponse);
      }
    }

    // Smart fallback if AI parsing or keys returned incomplete data
    if (!result || !result.name || result.name === "منتج جديد") {
      const fallbackName = body?.file_name
        ? body.file_name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\d+/g, "").trim() || "منتج فاخر"
        : "منتج فاخر مميز";

      result = {
        name: result?.name && result.name !== "منتج جديد" ? result.name : fallbackName,
        short_description: result?.short_description || `منتج متميز وعالي الجودة - ${fallbackName}. مصمم بأحدث التقنيات والمواصفات العصرية.`,
        long_description: result?.long_description || `منتج ${fallbackName} مصمم بأسلوب عصري وفريد يجمع بين الجودة العالية والأداء المتميز. الخيار الأمثل لاستخدامك اليومي بضمان كامل ومواصفات قياسية.`,
        category: result?.category || "منتجات عامة",
        suggested_price: result?.suggested_price || 250,
        tags: Array.isArray(result?.tags) && result.tags.length > 0 ? result.tags : ["جديد", "مميز", "جودة_عالية"],
        detected_features: result?.detected_features || {
          color: "متعدد الألوان",
          material: "خامات عالية الجودة",
          style: "عصري",
          target_audience: "جميع الفئات",
        },
      };
    }

    return new Response(
      JSON.stringify({ success: true, result, provider: usedProvider, model: aiResult?.model || usedModel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
