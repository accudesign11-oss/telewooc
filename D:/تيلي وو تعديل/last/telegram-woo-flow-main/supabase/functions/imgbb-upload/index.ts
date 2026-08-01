import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_IMAGE_SIZE = 32 * 1024 * 1024; // 32MB max (imgbb limit)
const MAX_API_KEY_LENGTH = 100;

// Input validation helper
function validateUploadInputs(body: any): { valid: boolean; error?: string } {
  const { image } = body;
  
  // Validate image
  if (!image || typeof image !== "string") {
    return { valid: false, error: "Missing image data" };
  }
  if (image.length > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);
    // ===== END AUTHENTICATION =====

    const body = await req.json();
    
    // Validate inputs
    const validation = validateUploadInputs(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, apiKey } = body;
    const finalApiKey = apiKey || Deno.env.get("IMGBB_API_KEY") || "6d0534552048f3c469b61596700c0a96";

    // Remove data URL prefix if present
    let imageData = image;
    if (image.startsWith("data:")) {
      imageData = image.split(",")[1];
    }

    // Upload to imgbb
    const formData = new FormData();
    formData.append("key", finalApiKey);
    formData.append("image", imageData);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      console.error("imgbb error:", data);
      return new Response(JSON.stringify({ 
        error: data.error?.message || "فشل في رفع الصورة" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image uploaded successfully:", data.data.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: data.data.url,
        display_url: data.data.display_url,
        thumb_url: data.data.thumb?.url,
        delete_url: data.data.delete_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("imgbb-upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});