import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from "https://esm.sh/@google/genai@1.35.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only Gemini is supported for image generation
// OpenRouter doesn't support image generation

/**
 * Generate image using Gemini SDK directly (user's API key)
 * Using the EXACT same approach that works in Google AI Studio
 */
async function generateWithGemini(prompt: string, images: any[], apiKey: string): Promise<{ image: string | null; text: string }> {
  console.log('[generateWithGemini] Starting with', images.length, 'images');
  
  // 1. تهيئة المحرك - exactly like Google AI Studio
  const ai = new GoogleGenAI({ apiKey });

  // 2. تحضير الـ parts بنفس طريقة Google AI Studio
  const parts: any[] = [];
  
  for (const img of images) {
    const rawUrl: string = img?.image_url?.url || '';
    let mimeType = 'image/jpeg';
    let base64Data = rawUrl;

    // استخراج base64 نظيف (بدون data:image prefix)
    const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else if (rawUrl.includes(',')) {
      base64Data = rawUrl.split(',')[1];
    }

    console.log('[generateWithGemini] Image mimeType:', mimeType, 'base64 length:', base64Data?.length);

    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }

  // إضافة النص (prompt) كآخر part - بالضبط مثل Google AI Studio
  parts.push({ text: prompt });

  console.log('[generateWithGemini] Total parts:', parts.length);
  console.log('[generateWithGemini] Calling gemini-2.5-flash-image...');

  // 3. استدعاء النموذج بنفس طريقة Google AI Studio
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  console.log('[generateWithGemini] Response received');

  // 4. استخراج النتيجة
  let image: string | null = null;
  let text = '';

  const candidate = response.candidates?.[0];
  console.log('[generateWithGemini] Candidate parts:', candidate?.content?.parts?.length);
  
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const mt = part.inlineData?.mimeType || 'image/png';
        image = `data:${mt};base64,${part.inlineData.data}`;
        console.log('[generateWithGemini] Found image, mimeType:', mt);
      } else if (part.text) {
        text = part.text;
        console.log('[generateWithGemini] Found text:', text.substring(0, 50));
      }
    }
  }

  if (!image) {
    console.log('[generateWithGemini] No image in response. Full response:', JSON.stringify(response).substring(0, 500));
  }

  return { image, text };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const { prompt, images, mode } = await req.json();

    if (!prompt || !images || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt and at least one image are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get user's AI settings
    let aiSettings: any = null;
    if (userId) {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'ai')
        .single();
      aiSettings = data?.value;
    }

    const geminiApiKey = aiSettings?.gemini_api_key || '';

    console.log(`[generate-product-image] mode=${mode}`);

    const providerUsed = 'gemini';
    const modelUsed = 'gemini-2.5-flash-image';
    let generatedImage: string | null = null;
    let textResponse = '';

    // Only Gemini supports image generation
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'توليد الصور يتطلب مفتاح Gemini API. اذهب للإعدادات → AI وأضف مفتاح Gemini.',
          canFallback: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-product-image] Using Gemini SDK (gemini-2.5-flash-image)');

    try {
      const result = await generateWithGemini(prompt, images, geminiApiKey);
      generatedImage = result.image;
      textResponse = result.text;
    } catch (error: any) {
      console.error(`[generate-product-image] Gemini SDK error:`, error.message);

      // Log Gemini failure
      if (userId) {
        await supabase.from('ai_requests').insert({
          user_id: userId,
          provider: 'gemini',
          model: modelUsed,
          prompt: prompt.substring(0, 500),
          status: 'failed',
          error_message: error.message?.substring(0, 200),
          latency_ms: Date.now() - startTime,
        });
      }

      let errorMessage = 'فشل في توليد الصورة';
      if (error.message?.includes('429')) {
        errorMessage = 'تم تجاوز حد الاستخدام لـ Gemini. انتظر قليلاً.';
      } else if (error.message?.includes('400')) {
        errorMessage = 'خطأ في الطلب. تأكد من صلاحية الصورة.';
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          gemini_error: error.message,
          canFallback: false,
          latency_ms: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const latencyMs = Date.now() - startTime;

    if (!generatedImage) {
      console.error('[generate-product-image] No image in response');
      
      if (userId) {
        await supabase.from('ai_requests').insert({
          user_id: userId,
          provider: providerUsed,
          model: modelUsed,
          prompt: prompt.substring(0, 500),
          status: 'failed',
          error_message: 'No image generated',
          latency_ms: latencyMs,
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: 'لم يتم توليد صورة. حاول بصورة مختلفة.', canFallback: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log success
    if (userId) {
      await supabase.from('ai_requests').insert({
        user_id: userId,
        provider: providerUsed,
        model: modelUsed,
        prompt: prompt.substring(0, 500),
        status: 'success',
        latency_ms: latencyMs,
        response: `Image generated for mode: ${mode}`,
      });
    }

    console.log(`[generate-product-image] Success in ${latencyMs}ms using ${providerUsed}`);

    return new Response(
      JSON.stringify({
        success: true,
        generatedImage,
        message: textResponse,
        latency_ms: latencyMs,
        model: modelUsed,
        provider: providerUsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-product-image] Error:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
