import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAI, getAuthedUserAndAI } from "../_shared/social-engine.ts";

const TOOL_NOTES: Record<string, string> = {
  chatgpt: "صياغة طبيعية بالإنجليزية، تفاصيل بصرية واضحة، تجنب الأوامر السلبية الكثيرة.",
  gemini: "صياغة وصفية متوازنة بالإنجليزية أو العربية، اذكر الأسلوب البصري والكاميرا.",
  claude: "صياغة طويلة منظمة بالإنجليزية بأقسام واضحة.",
  copilot: "صياغة بالإنجليزية متوافقة مع DALL·E.",
  midjourney: "صياغة كثيفة بالكلمات بالإنجليزية + --ar نسبة الأبعاد + --style raw + --v 6.",
  leonardo: "صياغة إنجليزية مع Subject, Style, Lighting, Camera.",
  ideogram: "صياغة إنجليزية مع تحديد دقيق للنص داخل الصورة بين علامتي تنصيص.",
  firefly: "صياغة إنجليزية، Content Type: Photo or Art.",
  canva: "صياغة إنجليزية بسيطة قابلة للاستخدام في Magic Media.",
  flow: "صياغة فيديو Google Flow بالإنجليزية: scene, camera motion, subject, environment, lighting, duration.",
  runway: "صياغة فيديو Runway Gen-3 بالإنجليزية: subject + motion + camera + style.",
  kling: "صياغة فيديو Kling بالإنجليزية: subject motion, scene, duration ~10s.",
  zai: "صياغة عامة إنجليزية.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai } = await getAuthedUserAndAI(req);
    const body = await req.json();
    const { tool, type, product_desc, details, size, text_on_image, brand_colors, logo_position } = body;

    const isVideo = /فيديو|video|flow|runway|kling/i.test(`${type} ${tool}`);
    const sys = `أنت Prompt Engineer محترف لإنشاء برومبتات ${isVideo ? "فيديو" : "صور"} للأدوات التوليدية الخارجية. أنتج برومبتًا واحدًا جاهزًا للنسخ، مفصّلًا، يحافظ تمامًا على شكل المنتج الأصلي بدون تغيير في الشكل أو اللون أو الشعار. اطلب جودة عالية وواقعية تصويرية. لو فيه نص داخل الصورة فاجعله واضحًا ومحاذيًا. أضف Negative Prompt في النهاية.`;

    const usr = `الأداة المستهدفة: ${tool} — ${TOOL_NOTES[tool] || ""}
نوع البرومبت: ${type}
المقاس/نسبة الأبعاد: ${size}
وصف المنتج: ${product_desc}
تفاصيل إضافية: ${details || "—"}
ألوان البراند: ${brand_colors || "—"}
مكان اللوجو: ${logo_position || "—"}
${text_on_image ? `النص داخل الصورة (يجب أن يظهر حرفيًا وبخط واضح): "${text_on_image}"` : "بدون نص داخل الصورة."}

أنتج البرومبت الآن. ابدأ مباشرة بالبرومبت بدون أي مقدمات وبدون شرح.`;

    const { text, provider } = await callAI(ai, sys, usr);
    return jsonResponse({ success: true, prompt: text.trim(), provider });
  } catch (e: any) {
    console.error("generate-media-prompt error:", e);
    return jsonResponse({ error: e.message || "فشل التوليد" });
  }
});
