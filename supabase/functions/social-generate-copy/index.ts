import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, extractJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

const PLATFORM_HINTS: Record<string, string> = {
  facebook_page: "منشور فيسبوك متوسط الطول، Hook قوي في أول سطر، CTA واضح، 3-5 هاشتاجات اختيارية في النهاية.",
  facebook_group: "منشور فيسبوك مناسب لمجموعات، نبرة ودودة وأقل تسويقًا مباشرًا.",
  instagram: "Caption انستجرام جذاب، فواصل أسطر واضحة، 8-15 هاشتاج في النهاية.",
  tiktok: "Hook خاطف في أول سطر + Caption قصير + 3-5 هاشتاجات ترند.",
  x: "تغريدة ≤ 270 حرف، Hook قوي + رابط/CTA.",
  linkedin: "نبرة مهنية رسمية، تركيز على القيمة والاحترافية والبراند، 3 هاشتاجات.",
  pinterest: "Title قصير ≤ 100 حرف + Description غني بالكلمات المفتاحية.",
  google_business: "نص مختصر مباشر + CTA + رابط.",
  threads: "منشور قصير محادثاتي.",
  youtube_community: "منشور مجتمع يوتيوب قصير وودود.",
  whatsapp: "رسالة واتساب مختصرة جدًا، مباشرة للبيع، إيموجي بسيط.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai, supabase } = await getAuthedUserAndAI(req);
    const { product, analysis, manual_text, tone, style, audience, platforms, brand_kit_id } = await req.json();
    if (!Array.isArray(platforms) || !platforms.length) return jsonResponse({ error: "platforms required" });

    const platformInstructions = platforms.map(p => `- ${p}: ${PLATFORM_HINTS[p] || ""}`).join("\n");

    // Inject Brand DNA when a kit is referenced
    let brandBlock = "";
    if (brand_kit_id) {
      try {
        const { data: kit } = await supabase.from("brand_kits").select("*").eq("id", brand_kit_id).maybeSingle();
        if (kit) {
          brandBlock = `\nهوية البراند الواجب الالتزام بها:\n${JSON.stringify({
            name: kit.brand_name_ar || kit.brand_name_en,
            slogan: kit.slogan,
            industry: kit.industry,
            tone: kit.brand_dna_json?.tone,
            voice: kit.brand_dna_json?.voice,
            values: kit.brand_dna_json?.values,
            keywords: kit.brand_dna_json?.keywords,
          }, null, 2)}\n`;
        }
      } catch (_) {}
    }

    const sys = `أنت كاتب محتوى سوشيال ميديا محترف بالعربية. اكتب لكل منصة بأسلوبها الأنسب. لا تخترع مواصفات غير موجودة. التزم بالنبرة والأسلوب والجمهور المحدد، وبهوية البراند المعطاة إن وُجدت.`;
    const usr = `أنشئ نسخة لكل منصة من المنصات التالية. أعد JSON فقط بهذا الشكل:
{ "${platforms.join('": "...", "')}": "..." }

النبرة: ${tone}
الأسلوب: ${style}
الجمهور: ${audience}
${brandBlock}
تعليمات لكل منصة:
${platformInstructions}

${product ? `بيانات المنتج:\n${JSON.stringify(product, null, 2)}` : ""}
${analysis ? `\nالتحليل التسويقي:\n${JSON.stringify(analysis, null, 2)}` : ""}
${manual_text ? `\nنص المستخدم:\n${manual_text}` : ""}`;

    const { text, provider } = await callAI(ai, sys, usr);
    let content: Record<string, string> = {};
    try { content = extractJson(text); } catch { for (const p of platforms) content[p] = text; }
    return jsonResponse({ success: true, content, provider });
  } catch (e: any) {
    console.error("generate-copy error:", e);
    return jsonResponse({ error: e.message || "فشل التوليد" });
  }
});
