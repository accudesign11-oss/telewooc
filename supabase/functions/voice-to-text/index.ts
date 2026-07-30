import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);
    // ===== END AUTHENTICATION =====

    const { audio } = await req.json();

    if (!audio) {
      throw new Error("No audio data provided");
    }

    // Get user's AI settings for Hugging Face or OpenRouter
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await adminSupabase
      .from("settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "ai")
      .single();

    const aiSettings = settings?.value as { 
      provider?: string; 
      gemini_api_key?: string; 
      openrouter_api_key?: string;
      huggingface_api_key?: string;
    } | null;

    const huggingfaceApiKey = aiSettings?.huggingface_api_key;
    const openrouterApiKey = aiSettings?.openrouter_api_key;

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);

    // Try Hugging Face Whisper first if API key is available
    if (huggingfaceApiKey) {
      try {
        console.log("Attempting Hugging Face Whisper transcription...");
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${huggingfaceApiKey}`,
              "Content-Type": "audio/webm",
            },
            body: binaryAudio,
          }
        );

        if (hfResponse.ok) {
          const result = await hfResponse.json();
          const text = result.text || "";
          console.log("Hugging Face transcription successful");
          return new Response(
            JSON.stringify({ text }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("Hugging Face error:", hfResponse.status, await hfResponse.text());
        }
      } catch (hfError) {
        console.error("Hugging Face transcription failed:", hfError);
      }
    }

    // Fallback to OpenRouter if available (using a model that supports audio)
    if (openrouterApiKey) {
      try {
        console.log("Attempting OpenRouter audio transcription...");
        const base64Audio = audio;
        
        const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": supabaseUrl,
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "قم بتحويل هذا الصوت إلى نص. أعد النص فقط بدون أي شرح أو تعليق إضافي."
                  },
                  {
                    type: "input_audio",
                    input_audio: {
                      data: base64Audio,
                      format: "webm"
                    }
                  }
                ]
              }
            ],
          }),
        });

        if (orResponse.ok) {
          const orResult = await orResponse.json();
          const text = orResult.choices?.[0]?.message?.content || "";
          console.log("OpenRouter transcription successful");
          return new Response(
            JSON.stringify({ text }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("OpenRouter error:", orResponse.status, await orResponse.text());
        }
      } catch (orError) {
        console.error("OpenRouter transcription failed:", orError);
      }
    }

    // No valid provider available
    return new Response(
      JSON.stringify({ 
        error: "لا يوجد مزود AI متاح لتحويل الصوت. أضف مفتاح Hugging Face أو OpenRouter من الإعدادات.",
        text: "" 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("voice-to-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
