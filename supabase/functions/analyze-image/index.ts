import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_IMAGE_URL_LENGTH = 2000;
const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ADDITIONAL_URLS = 10;
const ALLOWED_URL_SCHEMES = ["http:", "https:", "data:"];

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString && ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

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
    // Arabic comma → JSON comma
    .replace(/،/g, ",")
    // Smart quotes → normal quotes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // Trailing commas
    .replace(/,\s*([}\]])/g, "$1")
    // Zero-width chars
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function fallbackExtractResult(aiResponse: string): any {
  const pick = (key: string) => {
    const m = aiResponse.match(new RegExp(`"${key}"\\s*:\\s*"([^\"]+)"`));
    return m?.[1] ?? "";
  };

  const name = pick("name");
  const short_description = pick("short_description");
  const long_description = pick("long_description");
  const category = pick("category") || undefined;

  const tags: string[] = [];
  const tagsBlock = aiResponse.match(/"tags"\s*:\s*\[([\s\S]*?)\]/);
  if (tagsBlock?.[1]) {
    const re = /"([^"]+)"/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(tagsBlock[1])) !== null) tags.push(mm[1]);
  }

  return {
    name,
    short_description,
    long_description,
    category,
    suggested_price: null,
    tags,
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

// Free OpenRouter Vision models
const FREE_OPENROUTER_MODELS = [
  "qwen/qwen-2.5-vl-7b-instruct:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

// Hugging Face Vision models
const HUGGINGFACE_VISION_MODELS = [
  "Salesforce/blip-image-captioning-large",
  "nlpconnect/vit-gpt2-image-captioning",
];

function validateImageUrl(url: string | undefined | null): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: true };
  }
  
  if (url.length > MAX_IMAGE_URL_LENGTH) {
    return { valid: false, error: `URL too long (max ${MAX_IMAGE_URL_LENGTH} characters)` };
  }
  
  if (url.startsWith("data:")) {
    return { valid: true };
  }
  
  try {
    const parsed = new URL(url);
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, error: `Invalid URL scheme. Allowed: ${ALLOWED_URL_SCHEMES.join(", ")}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

function validateImageInputs(body: any): { valid: boolean; error?: string } {
  const { image_url, image_base64, additional_image_urls, additional_image_base64 } = body;
  
  if (!image_url && !image_base64) {
    return { valid: false, error: "Missing image_url or image_base64" };
  }
  
  const urlValidation = validateImageUrl(image_url);
  if (!urlValidation.valid) {
    return urlValidation;
  }
  
  if (image_base64) {
    if (typeof image_base64 !== "string") {
      return { valid: false, error: "image_base64 must be a string" };
    }
    if (image_base64.length > MAX_BASE64_SIZE) {
      return { valid: false, error: `Image too large (max ${MAX_BASE64_SIZE / 1024 / 1024}MB)` };
    }
  }
  
  if (additional_image_urls !== undefined && additional_image_urls !== null) {
    if (!Array.isArray(additional_image_urls)) {
      return { valid: false, error: "additional_image_urls must be an array" };
    }
    if (additional_image_urls.length > MAX_ADDITIONAL_URLS) {
      return { valid: false, error: `Too many additional images (max ${MAX_ADDITIONAL_URLS})` };
    }
    for (const url of additional_image_urls) {
      const additionalValidation = validateImageUrl(url);
      if (!additionalValidation.valid) {
        return additionalValidation;
      }
    }
  }

  if (additional_image_base64 !== undefined && additional_image_base64 !== null) {
    if (!Array.isArray(additional_image_base64)) {
      return { valid: false, error: "additional_image_base64 must be an array" };
    }
    if (additional_image_base64.length > MAX_ADDITIONAL_URLS) {
      return { valid: false, error: `Too many additional base64 images (max ${MAX_ADDITIONAL_URLS})` };
    }
    for (const b64 of additional_image_base64) {
      if (typeof b64 !== "string") {
        return { valid: false, error: "Each additional_image_base64 must be a string" };
      }
      if (b64.length > MAX_BASE64_SIZE) {
        return { valid: false, error: `Additional image too large (max ${MAX_BASE64_SIZE / 1024 / 1024}MB)` };
      }
    }
  }
  
  return { valid: true };
}

// Gemini Vision models – use "latest" aliases first so we auto-upgrade to the
// newest free Gemini vision model whenever Google rolls out a new version.
const GEMINI_VISION_MODELS = [
  "gemini-flash-latest",       // Auto-updates to newest free flash model
  "gemini-flash-lite-latest",  // Auto-updates to newest free lite flash model
  "gemini-2.5-flash",          // Stable fallback
  "gemini-2.0-flash",          // Fallback
  "gemini-1.5-flash",          // Fallback
  "gemini-1.5-pro",            // Last resort
];

// Gemini API call with model fallback
async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageContents: any[],
  modelIndex: number = 0
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
                data: matches[2]
              }
            });
          }
        } else {
          try {
            const imgResponse = await fetch(url);
            const arrayBuffer = await imgResponse.arrayBuffer();
            const base64 = arrayBufferToBase64(arrayBuffer);
            const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
            parts.push({
              inline_data: {
                mime_type: contentType,
                data: base64
              }
            });
          } catch (e) {
            console.error("Failed to fetch image for Gemini:", e);
          }
        }
      }
    }

    console.log(`Trying Gemini model: ${model}`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        }),
      }
    );

    // Fallback on overload/rate-limit/model-not-found errors
    if (
      (response.status === 429 || response.status === 404 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) &&
      modelIndex < GEMINI_VISION_MODELS.length - 1
    ) {
      console.log(`Gemini model ${model} returned ${response.status}, trying next model...`);
      return callGeminiAPI(apiKey, systemPrompt, userPrompt, imageContents, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      // Mark 500 errors specially for auto-fallback to OpenRouter
      return { 
        success: false, 
        error: errorText || `Gemini API error: ${response.status}`, 
        status: response.status, 
        model,
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { success: true, content, model };
  } catch (error) {
    console.error("Gemini call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", model };
  }
}

// OpenRouter API call
async function callOpenRouterAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageContents: any[],
  model?: string,
  modelIndex: number = 0
): Promise<{ success: boolean; content?: string; error?: string; status?: number; model?: string }> {
  try {
    let selectedModel = model;
    
    if (!selectedModel || selectedModel.includes(":free")) {
      selectedModel = FREE_OPENROUTER_MODELS[modelIndex % FREE_OPENROUTER_MODELS.length];
    }

    console.log(`OpenRouter trying model: ${selectedModel}`);

    const formattedImageContents = [];
    let failedToFetchCount = 0;
    
    for (const img of imageContents) {
      if (img.image_url?.url) {
        const url = img.image_url.url;
        if (url.startsWith("data:")) {
          formattedImageContents.push({
            type: "image_url",
            image_url: { url }
          });
        } else {
          try {
            const imgResponse = await fetch(url);
            if (imgResponse.ok) {
              const arrayBuffer = await imgResponse.arrayBuffer();
              const base64 = arrayBufferToBase64(arrayBuffer);
              const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
              formattedImageContents.push({
                type: "image_url",
                image_url: { url: `data:${contentType};base64,${base64}` }
              });
            } else {
              failedToFetchCount++;
            }
          } catch (fetchError) {
            console.error("OpenRouter: Failed to fetch image:", fetchError);
            failedToFetchCount++;
          }
        }
      }
    }

    if (formattedImageContents.length === 0) {
      return { 
        success: false, 
        error: "لم نتمكن من جلب الصورة. قد تكون منتهية الصلاحية.",
        status: 400 
      };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.app",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...formattedImageContents
            ]
          }
        ],
      }),
    });

    if (response.status === 429 && modelIndex < FREE_OPENROUTER_MODELS.length - 1) {
      console.log(`Model ${selectedModel} rate limited, trying next...`);
      return callOpenRouterAPI(apiKey, systemPrompt, userPrompt, imageContents, undefined, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return { success: false, error: errorText, status: response.status };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return { success: true, content, model: selectedModel };
  } catch (error) {
    console.error("OpenRouter call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Hugging Face Vision API call
async function callHuggingFaceVisionAPI(
  apiKey: string,
  imageBase64: string,
  modelIndex: number = 0
): Promise<{ success: boolean; content?: string; error?: string; status?: number; model?: string }> {
  try {
    const model = HUGGINGFACE_VISION_MODELS[modelIndex % HUGGINGFACE_VISION_MODELS.length];
    console.log(`Hugging Face trying vision model: ${model}`);

    // Extract pure base64 data
    let pureBase64 = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(/^data:[^;]+;base64,(.+)$/);
      if (matches) {
        pureBase64 = matches[1];
      }
    }

    // Convert base64 to binary
    const binaryString = atob(pureBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: bytes,
    });

    if ((response.status === 429 || response.status === 503) && modelIndex < HUGGINGFACE_VISION_MODELS.length - 1) {
      console.log(`HF Model ${model} returned ${response.status}, trying next...`);
      return callHuggingFaceVisionAPI(apiKey, imageBase64, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HuggingFace Vision API error:", response.status, errorText);
      return { success: false, error: errorText, status: response.status };
    }

    const data = await response.json();
    
    // BLIP/VIT models return array of caption objects
    let caption = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      caption = data[0].generated_text;
    } else if (data?.generated_text) {
      caption = data.generated_text;
    }

    // HF vision models only provide captions, we need to format as product info
    // This is basic - full product extraction requires text+vision model
    const productJson = {
      name: caption || "منتج",
      short_description: caption || "",
      long_description: caption || "",
      category: "",
      suggested_price: null,
      tags: [],
      detected_features: {
        description: caption
      }
    };

    return { success: true, content: JSON.stringify(productJson), model };
  } catch (error) {
    console.error("HuggingFace Vision call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Lovable API removed - only Gemini and OpenRouter are supported

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
    
    // Validate all inputs
    const validation = validateImageInputs(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_url, image_base64, additional_image_urls, additional_image_base64 } = body;

    // Fetch user's AI settings
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "ai")
      .single();

    const aiSettings = settingsData?.value as { 
      provider?: string; 
      gemini_api_key?: string; 
      openrouter_api_key?: string;
      openrouter_model?: string;
      huggingface_api_key?: string;
    } | null;

    // Default to gemini if lovable was set (lovable removed)
    let userProvider = aiSettings?.provider || "gemini";
    if (userProvider === "lovable") userProvider = "gemini";
    
    const geminiApiKey = aiSettings?.gemini_api_key;
    const openrouterApiKey = aiSettings?.openrouter_api_key;
    const openrouterModel = aiSettings?.openrouter_model;
    const huggingfaceApiKey = aiSettings?.huggingface_api_key;

    // Log key info (first 10 chars only for security)
    console.log(`User ${user.id} AI provider: ${userProvider}`);
    console.log(`Gemini key: ${geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`OpenRouter key: ${openrouterApiKey ? openrouterApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`HuggingFace key: ${huggingfaceApiKey ? huggingfaceApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    
    const startTime = Date.now();

    // Prepare image content for vision models
    const imageContents: any[] = [];
    
    // Primary image
    if (image_base64) {
      imageContents.push({
        type: "image_url",
        image_url: {
          url: image_base64.startsWith("data:") ? image_base64 : `data:image/jpeg;base64,${image_base64}`
        }
      });
    } else if (image_url) {
      imageContents.push({
        type: "image_url",
        image_url: { url: image_url }
      });
    }

    // Additional images from URLs
    if (additional_image_urls && Array.isArray(additional_image_urls)) {
      for (const url of additional_image_urls) {
        if (url) {
          imageContents.push({
            type: "image_url",
            image_url: { url }
          });
        }
      }
    }

    // Additional images from base64
    if (additional_image_base64 && Array.isArray(additional_image_base64)) {
      for (const b64 of additional_image_base64) {
        if (b64) {
          imageContents.push({
            type: "image_url",
            image_url: {
              url: b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`
            }
          });
        }
      }
    }

    const isMultipleImages = imageContents.length > 1;

    const systemPrompt = isMultipleImages 
      ? `أنت خبير في تحليل صور المنتجات للتجارة الإلكترونية.

**مهم جداً: يجب أن تكون جميع الردود والنصوص باللغة العربية فقط.**

مهمتك تحليل ${imageContents.length} صور وتحديد:
1. هل هذه صور لنفس التصميم بألوان مختلفة؟ (منتج متنوع - variable product)
2. أم صور لتصميمات مختلفة تماماً؟ (منتج مجمع - grouped product)
3. استخراج كل التفاصيل واقتراح المتغيرات المناسبة

القواعد:
- إذا كانت نفس التصميم بألوان مختلفة: اجعل is_same_design_different_colors = true
- إذا كانت تصميمات مختلفة: اجعل is_different_designs = true
- استخرج كل الألوان من الصور المتعددة
- اقترح اسم واحد يشمل كل المنتجات
- **جميع الأسماء والأوصاف والتفاصيل يجب أن تكون بالعربية**`
      : `أنت خبير في هندسة البرومبتات لتوليد صور الملابس والمنتجات باستخدام الذكاء الاصطناعي.

**مهم جداً: يجب أن تكون جميع الردود والنصوص باللغة العربية فقط (ما عدا design_prompt الذي يكون بالإنجليزية).**

مهمتك الأساسية: تحليل الصورة وإنشاء وصف تفصيلي دقيق يمكن استخدامه كـ "برومبت" لإعادة إنشاء نفس التصميم بالضبط بدون الحاجة للصورة الأصلية.

يجب أن يتضمن التحليل:
1. نوع الملابس بدقة (هودي، تيشيرت، بنطلون، إلخ)
2. اللون الرئيسي والألوان الثانوية بالتفصيل (مثال: أزرق كحلي داكن مع خطوط بيضاء رفيعة)
3. نوع القماش والملمس (قطن، بوليستر، صوف، ناعم، محبوك، إلخ)
4. تفاصيل التصميم الجرافيكي إن وجد:
   - نوع الطباعة (سكرين، تطريز، حرارية)
   - محتوى الرسمة بالتفصيل الدقيق
   - موقع الرسمة على الملابس
   - حجم الرسمة تقريبياً
   - الألوان المستخدمة في الرسمة
5. تفاصيل اللوجو إن وجد:
   - شكل اللوجو ومحتواه
   - موقعه على الملابس
   - حجمه وألوانه
6. تفاصيل القصة والتفصيل:
   - نوع القصة (فضفاض، ضيق، عادي)
   - تفاصيل الياقة والأكمام
   - الجيوب والسحابات
   - الأزرار والإكسسوارات
7. طريقة العرض في الصورة:
   - هل على موديل أم هانجر أم مفرود
   - زاوية التصوير
   - نوع الخلفية
8. الفئة العمرية المستهدفة
9. أي تفاصيل إضافية مميزة

**تذكر: جميع النصوص بالعربية إلزامياً (الاسم، الوصف القصير، الوصف الطويل، التاجات، الخصائص) ما عدا design_prompt فقط بالإنجليزية.**`;

    const userPrompt = isMultipleImages
      ? `حلل هذه الـ ${imageContents.length} صور واستخرج منها منتجاً واحداً.

**مهم جداً: جميع النصوص والقيم يجب أن تكون باللغة العربية فقط.**

مهم جداً لصحة JSON:
- اكتب JSON صالح 100% فقط (بدون أي شرح قبل/بعد)
- استخدم الفاصلة الإنجليزية "," داخل JSON ولا تستخدم الفاصلة العربية "،"
- استخدم علامات الاقتباس المزدوجة "" فقط
- أغلق جميع الأقواس بشكل صحيح

حدد:
- هل هذه نفس التصميم بألوان مختلفة؟
- أم تصميمات مختلفة؟

أرجع النتيجة بصيغة JSON فقط (كل القيم النصية بالعربية):
{
  "name": "اسم المنتج الجذاب بالعربية",
  "short_description": "وصف قصير مقنع بالعربية",
  "long_description": "وصف تفصيلي شامل بالعربية",
  "category": "فئة المنتج بالعربية",
  "suggested_price": null أو رقم تقديري,
  "tags": ["تاغ بالعربية", "تاغ آخر"],
  "is_same_design_different_colors": true أو false,
  "is_different_designs": true أو false,
  "detected_features": {
    "color": "الألوان بالعربية",
    "material": "المادة بالعربية",
    "style": "النمط بالعربية",
    "target_audience": "الفئة المستهدفة بالعربية"
  },
  "attributes": [
    {"name": "اللون", "values": ["أحمر", "أزرق", "أخضر"], "is_variation": true},
    {"name": "المقاس", "values": ["صغير", "متوسط", "كبير"], "is_variation": true}
  ]
}`
      : `حلل هذه الصورة بدقة شديدة واستخرج منها كل التفاصيل اللازمة لإعادة إنشاء نفس التصميم.

**مهم جداً: جميع النصوص يجب أن تكون باللغة العربية (ما عدا design_prompt فقط يكون بالإنجليزية).**

مهم جداً لصحة JSON:
- اكتب JSON صالح 100% فقط (بدون أي شرح قبل/بعد)
- استخدم الفاصلة الإنجليزية "," داخل JSON ولا تستخدم الفاصلة العربية "،"
- استخدم علامات الاقتباس المزدوجة "" فقط
- أغلق جميع الأقواس بشكل صحيح

أرجع النتيجة بصيغة JSON فقط:
{
  "name": "اسم المنتج الجذاب بالعربية",
  "short_description": "وصف قصير مقنع بالعربية",
  "long_description": "وصف تفصيلي شامل بالعربية",
  "category": "فئة المنتج بالعربية",
  "suggested_price": null,
  "tags": ["تاغ بالعربية", "تاغ آخر"],
  
  "design_prompt": "A detailed English prompt for AI image generation describing: garment type, exact colors, fabric type and texture, any graphics/prints with detailed description of content/position/size/colors, logo details if present, fit style, neckline, sleeves, accessories, display style, background, lighting. Write it ready-to-use.",
  
  "detected_features": {
    "garment_type": "نوع الملابس بالعربية",
    "main_color": "اللون الرئيسي بالعربية",
    "secondary_colors": ["لون ثانوي بالعربية"],
    "fabric_type": "نوع القماش بالعربية",
    "fabric_texture": "ملمس القماش بالعربية",
    "fit_style": "نوع القصة بالعربية",
    "neckline": "نوع الياقة بالعربية",
    "sleeves": "نوع الأكمام بالعربية",
    "graphic_details": {
      "has_graphic": true/false,
      "graphic_type": "نوع الطباعة بالعربية",
      "graphic_content": "وصف محتوى الرسمة بالعربية",
      "graphic_position": "موقع الرسمة بالعربية",
      "graphic_size": "حجم الرسمة بالعربية",
      "graphic_colors": ["لون بالعربية"]
    },
    "logo_details": {
      "has_logo": true/false,
      "logo_description": "وصف اللوجو بالعربية",
      "logo_position": "موقع اللوجو بالعربية",
      "logo_size": "حجم اللوجو بالعربية"
    },
    "additional_details": ["تفاصيل إضافية بالعربية"],
    "display_style": "طريقة العرض بالعربية",
    "background": "وصف الخلفية بالعربية",
    "target_age": "الفئة العمرية بالعربية"
  }
}`;

    let aiResult: { success: boolean; content?: string; error?: string; status?: number; model?: string } | undefined;
    let usedProvider: "gemini" | "openrouter" | "huggingface" = userProvider || "gemini";
    const geminiApiKey = aiSettings?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
    const openrouterApiKey = aiSettings?.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY");
    const openrouterModel = aiSettings?.openrouter_model;
    const huggingfaceApiKey = aiSettings?.huggingface_api_key || Deno.env.get("HUGGINGFACE_API_KEY");
    let usedModel = "gemini-1.5-flash";

    let primaryBase64 = "";
    if (image_base64) {
      primaryBase64 = image_base64.startsWith("data:") ? image_base64 : `data:image/jpeg;base64,${image_base64}`;
    } else if (image_url) {
      try {
        const imgResponse = await fetch(image_url);
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
          primaryBase64 = `data:${contentType};base64,${base64}`;
        }
      } catch (e) {
        console.error("Failed to fetch image for HuggingFace:", e);
      }
    }

    const tryGemini = async () => {
      if (!geminiApiKey) return false;
      usedProvider = "gemini";
      console.log("Trying Gemini API...");
      aiResult = await callGeminiAPI(geminiApiKey, systemPrompt, userPrompt, imageContents);
      if (aiResult?.model) usedModel = aiResult.model;
      return aiResult?.success || false;
    };

    const tryOpenRouter = async () => {
      if (!openrouterApiKey) return false;
      usedProvider = "openrouter";
      usedModel = openrouterModel || "qwen/qwen-2.5-vl-7b-instruct:free";
      console.log("Trying OpenRouter API...");
      aiResult = await callOpenRouterAPI(openrouterApiKey, systemPrompt, userPrompt, imageContents, openrouterModel);
      if (aiResult?.model) usedModel = aiResult.model;
      return aiResult?.success || false;
    };

    const tryHuggingFace = async () => {
      if (!huggingfaceApiKey || !primaryBase64) return false;
      usedProvider = "huggingface";
      console.log("Trying Hugging Face API...");
      aiResult = await callHuggingFaceVisionAPI(huggingfaceApiKey, primaryBase64);
      if (aiResult?.model) usedModel = aiResult.model;
      return aiResult?.success || false;
    };

    let success = false;
    if (userProvider === "gemini") success = await tryGemini();
    else if (userProvider === "openrouter") success = await tryOpenRouter();
    else if (userProvider === "huggingface") success = await tryHuggingFace();

    if (!success && userProvider !== "gemini") success = await tryGemini();
    if (!success && userProvider !== "openrouter") success = await tryOpenRouter();
    if (!success && userProvider !== "huggingface") success = await tryHuggingFace();

    // If all providers failed
    if (!aiResult || !aiResult.success) {
      const status = aiResult?.status || 500;

      let errorMessage = "فشل تحليل الصورة";
      let hint = "تحقق من الإعدادات → AI";

       if (usedProvider === "gemini" && status === 404) {
         errorMessage = "Gemini: الموديل غير متاح لهذا المفتاح";
         hint = "جرّب حفظ الإعدادات مرة أخرى أو غيّر المزود إلى OpenRouter من الإعدادات.";
       } else if (usedProvider === "gemini" && status === 429) {
        errorMessage = "Gemini: تم تجاوز حد الاستخدام / الكوتا";
        hint = "انتظر قليلاً أو استخدم مفتاح/خطة مدفوعة أو غيّر المزود إلى OpenRouter.";
      } else if (usedProvider === "openrouter" && status === 429) {
        errorMessage = "OpenRouter: تم تجاوز حد الطلبات (Rate limit)";
        hint = "جرّب بعد دقائق أو اختر نموذجاً آخر في الإعدادات.";
      } else if (status === 402) {
        errorMessage = "لا يوجد رصيد كافي لدى المزود";
        hint = "تحقق من رصيد/خطة المزود أو غيّر المزود من الإعدادات.";
      } else if (status === 401 || status === 403) {
        errorMessage = "مفتاح API غير صالح أو غير مصرح";
        hint = "تأكد من المفتاح ثم احفظه من الإعدادات.";
      } else if (status === 404 && usedProvider === "openrouter") {
        errorMessage = "OpenRouter: النموذج غير متاح حالياً أو لا يدعم الصور";
        hint = "اختر نموذج Vision (مثل Qwen VL) من الإعدادات.";
      } else if (usedProvider === "gemini" && (status === 500 || status === 502 || status === 503 || status === 504)) {
        errorMessage = "Gemini غير متاح مؤقتاً أو عليه ضغط عالي";
        hint = "تمت تجربة كل موديلات Gemini المجانية المتاحة. جرّب بعد قليل أو أضف OpenRouter كاحتياطي من الإعدادات.";
      } else if (status === 429) {
        errorMessage = "تم تجاوز حد الطلبات، حاول لاحقاً";
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: aiResult!.error,
        hint,
        provider: usedProvider,
        model: usedModel,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = aiResult!.content || "";
    const latencyMs = Date.now() - startTime;

    // Parse JSON result
    let result: any;
    try {
      const jsonCandidateRaw = extractFirstJsonObject(aiResponse);
      if (!jsonCandidateRaw) {
        result = { error: "Could not find JSON object", raw: aiResponse };
      } else {
        const jsonCandidate = normalizeJsonCandidate(jsonCandidateRaw);
        try {
          result = JSON.parse(jsonCandidate);
        } catch (e) {
          // Fallback: best-effort extraction for common cases
          const fallback = fallbackExtractResult(aiResponse);
          if (fallback?.name) {
            result = fallback;
          } else {
            result = { error: "JSON parse error", raw: jsonCandidate };
          }
        }
      }
    } catch (e) {
      result = { error: "JSON parse error", raw: aiResponse };
    }

    const isValidResult =
      result &&
      typeof result === "object" &&
      !result.error &&
      typeof result.name === "string" &&
      result.name.trim().length > 0;

    // Log request (mark parse failures clearly)
    await supabase.from("ai_requests").insert({
      user_id: user.id,
      provider: usedProvider,
      model: usedModel,
      prompt: isMultipleImages ? `Multi-image analysis (${imageContents.length} images)` : "Image analysis",
      response: aiResponse.substring(0, 5000),
      status: isValidResult ? "success" : "parse_error",
      error_message: isValidResult ? null : (result?.error || "Invalid result"),
      latency_ms: latencyMs,
    });

    if (!isValidResult) {
      console.error(
        `Image analysis parse/empty result. provider=${usedProvider} model=${usedModel} images=${imageContents.length} latency=${latencyMs}ms`
      );
      return new Response(
        JSON.stringify({
          error: "فشل تحليل الصورة: رد غير صالح من المزود",
          hint:
            usedProvider === "openrouter"
              ? "اختر نموذج Vision (مثل Qwen VL) أو جرّب صورة أصغر/أوضح."
              : "جرّب لاحقاً أو غيّر المزود.",
          provider: usedProvider,
          model: usedModel,
          details: result?.raw ? String(result.raw).substring(0, 500) : result?.error,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Image analysis for user ${user.id}, provider: ${usedProvider}, model: ${usedModel}, images: ${imageContents.length}, latency: ${latencyMs}ms`);

    return new Response(
      JSON.stringify({ success: true, result, provider: usedProvider, model: usedModel, latency_ms: latencyMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-image error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
