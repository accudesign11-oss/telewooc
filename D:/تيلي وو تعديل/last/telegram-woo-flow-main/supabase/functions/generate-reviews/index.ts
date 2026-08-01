import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

interface GenerateInput {
  product_name: string;
  product_description?: string;
  count: number;
  rating: number; // 1..5 (e.g. 5 or 4.5)
  dialect: string; // e.g. مصرية، سعودية، خليجية، مغربية، فصحى، أو نص حر
  language?: string; // ar | en
}

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGemini(apiKey: string, prompt: string): Promise<any> {
  let lastErr: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.95,
            maxOutputTokens: 4096,
          },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504) {
        lastErr = `model ${model} overloaded (${res.status})`;
        continue;
      }
      if (!res.ok) {
        lastErr = `model ${model} -> ${res.status}: ${(await res.text()).slice(0, 200)}`;
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastErr = `empty response from ${model}`;
        continue;
      }
      return { text, model };
    } catch (e) {
      lastErr = String(e);
      continue;
    }
  }
  throw new Error(`All Gemini models failed: ${lastErr}`);
}

function buildPrompt(input: GenerateInput): string {
  const stars = input.rating;
  const ratingText = stars >= 5 ? "ممتاز جدًا ومبهر" : stars >= 4.5 ? "ممتاز" : stars >= 4 ? "جيد جدًا" : stars >= 3 ? "جيد" : "مقبول";

  return `أنت كاتب ريفيوهات منتجات لمتجر إلكتروني عربي. اكتب ${input.count} مراجعة عملاء مختلفة وواقعية للمنتج التالي.

اسم المنتج: ${input.product_name}
${input.product_description ? `وصف المنتج: ${input.product_description}` : ""}
التقييم المطلوب لكل مراجعة: ${stars} من 5 (${ratingText})
اللهجة/اللغة: ${input.dialect}

شروط مهمة:
- اكتب اللهجة بشكل طبيعي تمامًا (لو مصرية يبقى مصري دارج، لو سعودية سعودي دارج، لو فصحى لغة عربية فصيحة سليمة، لو إنجليزي اكتب بالإنجليزي).
- نوّع طول المراجعة: بعضها قصير سطر، بعضها متوسط 2-3 أسطر، بعضها أطول.
- نوّع نقاط المدح: الجودة، السعر، التغليف، سرعة الشحن، خدمة العملاء، الاستخدام اليومي.
- نوّع أسماء العملاء (أسماء عربية متنوعة وواقعية مناسبة للهجة، رجال وسيدات).
- لا تستخدم رموز ماركداون. لا تكرر نفس الجملة بين مراجعتين.
- ارجع JSON فقط بدون أي شرح، بهذا الشكل بالضبط:

{
  "reviews": [
    {
      "reviewer_name": "اسم العميل",
      "rating": ${stars},
      "review_text": "نص المراجعة"
    }
  ]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ ok: false, error: "Missing authorization" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return jsonResp({ ok: false, error: "Invalid token" });

    const body = (await req.json()) as GenerateInput;
    if (!body?.product_name || !body?.count || !body?.rating || !body?.dialect) {
      return jsonResp({ ok: false, error: "Missing required fields" });
    }
    if (body.count < 1 || body.count > 30) {
      return jsonResp({ ok: false, error: "count must be 1..30" });
    }

    // Get user's Gemini key
    const { data: aiSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "ai")
      .maybeSingle();

    const apiKey = (aiSettings?.value as any)?.gemini_api_key;
    if (!apiKey) {
      return jsonResp({ ok: false, error: "لم يتم ضبط مفتاح Gemini في الإعدادات" });
    }

    const prompt = buildPrompt(body);
    const { text, model } = await callGemini(apiKey, prompt);

    // Parse JSON (handle Arabic commas just in case)
    const cleaned = text.replace(/```json|```/g, "").replace(/،/g, ",").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return jsonResp({ ok: false, error: "JSON parse failed", raw: cleaned.slice(0, 500) });
      parsed = JSON.parse(match[0]);
    }

    const reviews = (parsed?.reviews || []).slice(0, body.count).map((r: any) => ({
      reviewer_name: String(r.reviewer_name || "عميل").slice(0, 100),
      rating: Number(r.rating) || body.rating,
      review_text: String(r.review_text || "").slice(0, 1500),
    }));

    return jsonResp({ ok: true, reviews, model });
  } catch (e) {
    console.error("generate-reviews error:", e);
    return jsonResp({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
