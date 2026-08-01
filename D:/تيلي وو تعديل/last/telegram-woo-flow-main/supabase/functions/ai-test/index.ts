import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, gemini_api_key, openrouter_api_key, openrouter_model, huggingface_api_key } = await req.json();

    const testPrompt = "قل 'مرحبا' فقط";
    const startTime = Date.now();

    // Gemini provider
    if (provider === "gemini") {
      if (!gemini_api_key) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "مفتاح Gemini API غير مُدخل" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gemini models (v1beta) – avoid preview/latest aliases that frequently 404.
      const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
      let lastResponse: Response | null = null;
      let usedModel = GEMINI_MODELS[0];

      for (const model of GEMINI_MODELS) {
        console.log(`Testing Gemini model: ${model}`);
        usedModel = model;
        
        lastResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini_api_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
          }),
        });

        // Retry on quota / model-not-found / transient internal
        const shouldRetry = lastResponse.status === 429 || lastResponse.status === 404 || lastResponse.status === 500;
        if (shouldRetry && GEMINI_MODELS.indexOf(model) < GEMINI_MODELS.length - 1) {
          console.log(`Model ${model} returned ${lastResponse.status}, trying next...`);
          continue;
        }

        break; // Use this response
      }

      const response = lastResponse!;
      const latency = Date.now() - startTime;

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || "مفتاح API غير صالح";
        return new Response(JSON.stringify({ 
          success: false, 
          error: errorMessage.includes("API key") ? "مفتاح API غير صالح" : errorMessage,
          status: "invalid_key"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 429) {
        // Check if it's a billing/quota issue (limit: 0)
        try {
          const errorData = await response.clone().json();
          const errorMessage = errorData.error?.message || "";
          if (errorMessage.includes("limit: 0") || errorMessage.includes("billing")) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "يجب ربط Billing Account في Google Cloud لتفعيل Free Tier",
              hint: "اذهب إلى console.cloud.google.com/billing وأضف بطاقة (لن يتم خصم مبلغ)",
              status: "billing_required"
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) { /* ignore parse error */ }

        return new Response(JSON.stringify({ 
          success: false, 
          error: "تم تجاوز حد الطلبات لجميع النماذج",
          hint: "انتظر دقيقة أو غيّر المزود إلى OpenRouter",
          status: "rate_limited"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `خطأ في الاتصال: ${response.status}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return new Response(JSON.stringify({ 
        success: true, 
        message: "الاتصال ناجح!",
        model: usedModel,
        latency_ms: latency,
        response: responseText.substring(0, 50),
        status: "active"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OpenRouter provider
    if (provider === "openrouter") {
      if (!openrouter_api_key) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "مفتاح OpenRouter API غير مُدخل" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const modelToTest = openrouter_model || "google/gemma-3-27b-it:free";

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouter_api_key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
        },
        body: JSON.stringify({
          model: modelToTest,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        }),
      });

      const latency = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "مفتاح API غير صالح",
          status: "invalid_key"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "تم تجاوز حد الطلبات لهذا النموذج، جرب نموذج آخر",
          status: "rate_limited"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `خطأ في الاتصال: ${response.status}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";

      // Get credit balance from OpenRouter
      let credits = null;
      try {
        const creditsResponse = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${openrouter_api_key}` },
        });
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          credits = creditsData.data?.limit_remaining ?? creditsData.data?.usage ?? null;
        }
      } catch (e) {
        console.error("Failed to fetch credits:", e);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "الاتصال ناجح!",
        model: modelToTest,
        latency_ms: latency,
        response: responseText.substring(0, 50),
        credits,
        status: "active"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hugging Face provider
    if (provider === "huggingface") {
      if (!huggingface_api_key) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "مفتاح Hugging Face API غير مُدخل" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Test with a simple text generation model
      const response = await fetch(
        "https://api-inference.huggingface.co/models/google/gemma-2-2b-it",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${huggingface_api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: testPrompt,
            parameters: { max_new_tokens: 10 },
          }),
        }
      );

      const latency = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "مفتاح API غير صالح",
          status: "invalid_key"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "تم تجاوز حد الطلبات، حاول لاحقاً",
          status: "rate_limited"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 503) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "المفتاح صحيح! النموذج قيد التحميل...",
          model: "google/gemma-2-2b-it",
          latency_ms: latency,
          status: "loading"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face error:", response.status, errorText);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `خطأ في الاتصال: ${response.status}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const responseText = Array.isArray(data) ? (data[0]?.generated_text || "") : (data.generated_text || "");

      return new Response(JSON.stringify({ 
        success: true, 
        message: "الاتصال ناجح!",
        model: "google/gemma-2-2b-it",
        latency_ms: latency,
        response: responseText.substring(0, 50),
        status: "active"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: "مزود غير معروف" 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ai-test error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "خطأ غير متوقع" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
