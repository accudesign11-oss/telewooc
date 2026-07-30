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

    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all user's products for searching
    const { data: products, error: productsError } = await supabase
      .from("draft_products")
      .select(`
        id,
        name,
        short_description,
        long_description,
        price,
        sale_price,
        currency,
        sku,
        status,
        categories,
        tags,
        product_images (url)
      `)
      .eq("user_id", user.id);

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "لا توجد منتجات للبحث فيها" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's AI settings
    const { data: aiSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "ai")
      .single();

    let provider = (aiSettings?.value as any)?.provider || "gemini";
    if (provider === "lovable") provider = "gemini"; // legacy safety
    const geminiApiKey = (aiSettings?.value as any)?.gemini_api_key;
    const openrouterApiKey = (aiSettings?.value as any)?.openrouter_api_key;
    const openrouterModel = (aiSettings?.value as any)?.openrouter_model || "google/gemma-3-27b-it:free";

    const productsSummary = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.short_description || p.long_description?.slice(0, 200),
      price: p.price,
      status: p.status,
    }));

    const systemPrompt = `أنت مساعد بحث ذكي. سيتم إعطاؤك استعلام بحث وقائمة منتجات.
مهمتك هي:
1. فهم ما يريده المستخدم من استعلام البحث
2. العثور على المنتجات المطابقة من القائمة
3. إرجاع معرفات المنتجات المطابقة بترتيب الأهمية

أعد الإجابة كـ JSON فقط بالشكل التالي:
{
  "matched_ids": ["id1", "id2"],
  "search_interpretation": "ما فهمته من البحث"
}`;

    const userPrompt = `استعلام البحث: "${query}"

المنتجات المتاحة:
${JSON.stringify(productsSummary, null, 2)}`;

    let aiResponse: Response;
    let usedModel = "";

    if (provider === "gemini" && geminiApiKey) {
      usedModel = "gemini-2.0-flash";
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        }),
      });
    } else if (provider === "openrouter" && openrouterApiKey) {
      usedModel = openrouterModel;
      aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
        },
        body: JSON.stringify({
          model: usedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
        }),
      });
    } else {
      return new Response(
        JSON.stringify({ error: "لا يوجد مزود AI مُعد. اذهب للإعدادات → AI وأضف مفتاح Gemini أو OpenRouter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error("Failed to process search with AI");
    }

    const aiResult = await aiResponse.json();
    let content = "";
    
    if (provider === "gemini") {
      content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    } else {
      content = aiResult.choices?.[0]?.message?.content || "{}";
    }
    
    let searchResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      searchResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { matched_ids: [], search_interpretation: "فشل في تحليل البحث" };
    } catch {
      searchResult = { matched_ids: [], search_interpretation: "فشل في تحليل البحث" };
    }

    // Get full product details for matched IDs
    const matchedProducts = products.filter(p => 
      searchResult.matched_ids?.includes(p.id)
    );

    return new Response(
      JSON.stringify({
        results: matchedProducts,
        interpretation: searchResult.search_interpretation,
        total: matchedProducts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("smart-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
