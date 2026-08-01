import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { ai, user, supabase } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim();
    const currentCss = String(body?.current_css || "");
    const currentJs = String(body?.current_js || "");
    const contextHints = String(body?.context || "متجر WooCommerce عربي RTL");

    if (!prompt) return jsonResponse({ ok: false, error: "الرجاء إدخال طلبك" });

    const sys = `أنت مطور واجهات خبير في WordPress + WooCommerce + Elementor.
مهمتك: تحويل طلب المستخدم إلى كود CSS و/أو JavaScript آمن يعمل مباشرة في واجهة المتجر.

قواعد صارمة:
- CSS يجب أن يستخدم محددات (selectors) عامة تعمل مع معظم قوالب WooCommerce (header, .site-header, .woocommerce, .product, .cart, .elementor-*).
- ادعم RTL. لا تستخدم !important إلا للضرورة.
- JavaScript vanilla فقط (بدون jQuery إلا لو ضروري بشكل واضح). لفّ الكود في IIFE. لا تعتمد على مكتبات خارجية.
- لا تولّد أي كود ضار أو يستدعي روابط خارجية غير موثوقة.
- إذا كان الطلب لا يحتاج CSS، اترك css فارغًا. نفس الشيء لـ js.
- استخدم أنيميشن CSS خفيف عند الطلب.

أعِد JSON بالشكل التالي فقط (بدون أي نص إضافي):
{
  "css": "...",
  "js": "...",
  "explanation": "شرح موجز جدًا بالعربية لما تفعله (سطر أو سطران)",
  "preview_notes": "ملاحظات معاينة اختيارية"
}`;

    const usr = `السياق: ${contextHints}

الطلب: ${prompt}

CSS الحالي (لا تكسره، ابنِ عليه أو استبدله فقط عند الضرورة):
\`\`\`css
${currentCss.slice(0, 4000)}
\`\`\`

JS الحالي:
\`\`\`js
${currentJs.slice(0, 4000)}
\`\`\`

أعِد JSON فقط.`;

    let data: any = {};
    let provider = "unknown";
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      data = r.data || {};
      provider = r.provider;
    } catch (e: any) {
      console.error("wp-studio-generate AI failed:", e?.message);
      return jsonResponse({ ok: false, error: "تعذر الاتصال بالذكاء الاصطناعي: " + (e?.message || "خطأ") });
    }

    const css = String(data?.css || "").trim();
    const js = String(data?.js || "").trim();
    const explanation = String(data?.explanation || "").trim();
    const preview_notes = String(data?.preview_notes || "").trim();

    if (!css && !js) {
      return jsonResponse({ ok: false, error: "لم يتم توليد كود، جرّب صياغة الطلب بشكل أوضح." });
    }

    // Save to history
    const { data: row } = await supabase
      .from("wp_customizations")
      .insert({
        user_id: user.id,
        prompt,
        generated_css: css,
        generated_js: js,
        explanation,
        provider,
      })
      .select("id")
      .single();

    return jsonResponse({ ok: true, id: row?.id, css, js, explanation, preview_notes, provider });
  } catch (e: any) {
    console.error("wp-studio-generate error:", e);
    return jsonResponse({ ok: false, error: e?.message || String(e) });
  }
});