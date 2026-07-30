import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

const DAY_NAMES = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

const PLATFORM_HINTS: Record<string, string> = {
  facebook: "نبرة اجتماعية دافئة، فقرات قصيرة، إيموجي معتدل، Hook قوي في السطر الأول، طول 3-6 أسطر، CTA واضح، 3-6 هاشتاجات عربية.",
  instagram: "لغة بصرية جذابة، إيموجي كثير، Hook مثير، طول 4-8 أسطر، CTA للـ DM/الرابط في البايو، 8-15 هاشتاج.",
  tiktok: "لغة شبابية حماسية، Hook قوي جدًا في أول جملة، جمل قصيرة، CTA للمتابعة/التعليق، 3-5 هاشتاجات ترند.",
  youtube: "عنوان تشويقي، وصف قصير جذاب، CTA للمشاهدة/الاشتراك.",
  linkedin: "لغة مهنية راقية، فقرات منظمة، قيمة/رؤية عملية، Hook تحليلي، CTA احترافي، 3-5 هاشتاجات إنجليزية.",
  google_business: "معلومات مباشرة عن الخدمة/العرض، CTA لطلب حجز/اتصال.",
  whatsapp: "لغة شخصية مباشرة، عرض واضح، CTA للرد على الرسالة.",
  pinterest: "وصف قصير Keyword-rich بالإنجليزية، هاشتاجات وصفية.",
  threads: "جمل قصيرة سريعة، لهجة نقاشية، سؤال يدعو للرد.",
  telegram: "إعلان واضح مباشر مع رابط/زر توجيه.",
};

function buildBucketList(qr: any) {
  const buckets: string[] = [];
  const push = (kind: string, n: number) => { for (let i = 0; i < n; i++) buckets.push(kind); };
  push("reel", Number(qr?.reels) || 0);
  push("video", Number(qr?.videos) || 0);
  push("image", Number(qr?.images) || 0);
  push("carousel", Number(qr?.carousels) || 0);
  push("branding", Number(qr?.branding) || 0);
  push("text", Number(qr?.texts) || 0);
  return buckets;
}

function fallbackItems(plan: any, buckets: string[]) {
  const platforms = plan.selected_platforms?.length ? plan.selected_platforms : ["facebook"];
  return buckets.map((kind, i) => ({
    day_offset: Math.floor(i * (plan.duration_days || 30) / Math.max(1, buckets.length)),
    time: ["10:00", "13:00", "18:00", "21:00"][i % 4],
    platform: platforms[i % platforms.length],
    content_type: kind,
    objective: "engagement",
    idea: `منشور رقم ${i + 1} من نوع ${kind}`,
    hook: "",
    draft_content: `مسودة أولية لمنشور ${kind} — عدّلها من الواجهة أو اطلب إعادة صياغة.`,
    cta: "تفاعل معنا في التعليقات 👇",
    hashtags: "",
    media_type: kind === "text" ? "text" : (kind === "video" || kind === "reel" ? "video" : (kind === "carousel" ? "carousel" : "image")),
    needs_image: ["image", "branding", "carousel"].includes(kind),
    needs_video: ["video", "reel"].includes(kind),
    needs_carousel: kind === "carousel",
    image_prompt: ["image", "branding", "carousel"].includes(kind) ? `Professional ${kind} for social media, high quality, brand aesthetic` : "",
    video_prompt: ["video", "reel"].includes(kind) ? `Short vertical ${kind} for social, engaging opening, brand style` : "",
    priority: "medium",
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const { plan_id, replace = true } = await req.json();
    if (!plan_id) return jsonResponse({ ok: false, error: "plan_id required" }, 400);

    const { data: plan } = await supabase.from("content_brain_plans").select("*").eq("id", plan_id).eq("user_id", user.id).single();
    if (!plan) return jsonResponse({ ok: false, error: "plan not found" }, 404);
    if (!plan.analysis) return jsonResponse({ ok: false, error: "شغّل التحليل أولاً" });

    const qr = plan.quantitative_recommendations || plan.analysis?.quantitative_recommendations || { reels: 3, videos: 2, images: 6, texts: 2, carousels: 2, branding: 1 };
    const buckets = buildBucketList(qr);
    if (!buckets.length) return jsonResponse({ ok: false, error: "لا توجد توصيات كمية للتوليد" });
    const platforms = (plan.selected_platforms as string[]) || ["facebook"];
    const deep = plan.deep_scan || plan.scanned_context || {};
    const productsAll: any[] = (deep.woo?.products || []).slice(0, 20);

    const sys = `أنت كاتب محتوى عربي محترف ومدير حملات سوشيال. مهمتك: إنتاج خطة منشورات ملموسة مربوطة بالمنتجات الحقيقية للنشاط، بحيث كل منشور جاهز للنشر فعلياً على المنصة المحددة (Facebook/Instagram/TikTok/LinkedIn…) بأسلوب المنصة الصحيح.
قواعد صارمة:
- draft_content: نص عربي كامل جاهز للنشر (لا يقل عن 40 كلمة للمنشورات النصية/الصور، ولا يقل عن 25 كلمة للريلز/الفيديو). ممنوع أن يكون فارغًا أو مجرد عنوان.
- hook: جملة افتتاحية قوية مكتوبة داخل draft_content أيضًا في السطر الأول، وأيضًا في حقل hook مستقلاً.
- cta: دائمًا موجود، عربي، ملموس (اطلب/اتصل/سجّل/اشترِ/شارك…).
- hashtags: 3-15 حسب المنصة، عربية/إنجليزية حسب الأنسب، مفصولة بمسافة، مبدوءة بـ#.
- image_prompt / video_prompt: بالإنجليزية فقط، احترافي، جاهز للصق مباشر في Midjourney/Gemini/Sora/Runway، يحافظ على شكل المنتج الأصلي.
- product_or_service: اسم منتج حقيقي من قائمة المنتجات المرفقة (لا تخترع).
- أعد JSON فقط بدون أي شرح.`;
    const productsHint = productsAll.map((p: any) => ({ name: p.name, categories: p.categories, price: p.price, link: p.link })).slice(0, 15);
    const platformNotes = platforms.map((p) => `- ${p}: ${PLATFORM_HINTS[p] || "نبرة مناسبة للمنصة"}`).join("\n");
    const usr = `أنشئ خطة محتوى بالضبط ${buckets.length} عنصر بالتوزيع التالي:
${buckets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

وزّعها على ${plan.duration_days} يوم بحيث تكون كل منشورات اليوم الواحد أقل من 3.
الهدف العام: ${plan.goal}
المنصات: ${platforms.join(", ")}
قواعد نبرة كل منصة (التزم بها في draft_content):
${platformNotes}
وصف النشاط: ${plan.business_description || ""}
ملخص التحليل: ${(plan.analysis?.summary || "").slice(0, 500)}
محاور التركيز: ${JSON.stringify(plan.analysis?.focus_areas || [])}
نقاط القوة للاستفادة منها: ${JSON.stringify(plan.analysis?.strengths || [])}

منتجات النشاط لتربطها بالمنشورات (لا تخترع منتجات):
${JSON.stringify(productsHint)}

أعد JSON صارم بهذا الشكل:
{ "items": [ {
  "day_offset": 0, "time": "10:00", "platform": "facebook",
  "content_type": "reel|video|image|carousel|branding|text",
  "objective": "هدف المنشور",
  "idea": "الفكرة سطر واحد",
  "product_or_service": "اسم المنتج المرتبط أو فارغ",
  "hook": "السطر الافتتاحي القوي",
  "draft_content": "النص العربي الكامل جاهز للنشر (لا يقل عن 40 كلمة، يبدأ بالـ hook)",
  "cta": "Call to action",
  "hashtags": "#a #b #c",
  "image_prompt": "English prompt for image tool if applicable",
  "video_prompt": "English prompt for video tool if applicable",
  "priority": "high|medium|low"
} ] }

المؤكد: أنتج ${buckets.length} عنصر بالضبط، وترتيبها في الـ items يتبع التوزيع أعلاه. لا تترك أي حقل draft_content فارغًا.`;

    let items: any[] = [];
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      items = Array.isArray(r.data?.items) ? r.data.items : [];
    } catch (e: any) {
      console.error("generate-plan AI failed, using fallback:", e.message);
    }
    if (!items.length) items = fallbackItems(plan, buckets);

    // Enforce content_type to match bucket order & ensure count
    items = items.slice(0, buckets.length);
    while (items.length < buckets.length) items.push({});
    items = items.map((it, i) => ({ ...it, content_type: it.content_type || buckets[i] }));

    // Helper: find matching product from scan
    const findProduct = (name?: string) => {
      if (!name || !productsAll.length) return null;
      const n = name.toLowerCase();
      return productsAll.find((p: any) => p.name && (n.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(n))) || null;
    };

    // Helper: enrich empty text
    const ensureText = (it: any, kind: string, platform: string, prod: any) => {
      const base = (it.draft_content || "").trim();
      if (base.split(/\s+/).length >= 25) return base;
      const productName = prod?.name || it.product_or_service || plan.business_description?.slice(0, 40) || "خدمتنا";
      const priceLine = prod?.price ? `\n💰 السعر: ${prod.price}` : "";
      const linkLine = prod?.link ? `\n🛒 ${prod.link}` : "";
      const hook = it.hook || `✨ اكتشف ${productName} الآن`;
      const cta = it.cta || "اطلب الآن أو راسلنا للتفاصيل 👇";
      const hashtags = it.hashtags || `#${(productName || "منتج").replace(/\s+/g, "_")} #عروض_اليوم`;
      return `${hook}

${it.idea || `نقدم لك ${productName} بجودة عالية ومواصفات مميزة تلبي احتياجاتك.`}

${cta}${priceLine}${linkLine}

${hashtags}`;
    };

    if (replace) {
      await supabase.from("content_brain_items").delete().eq("plan_id", plan_id).eq("user_id", user.id);
    }

    const startDate = plan.start_date ? new Date(plan.start_date) : new Date();
    const rows = items.map((it: any, idx: number) => {
      const offset = Math.max(0, Math.min(plan.duration_days - 1, +it.day_offset || Math.floor(idx * plan.duration_days / items.length)));
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + offset);
      const kind = it.content_type || buckets[idx];
      const needsImage = ["image", "carousel", "branding"].includes(kind);
      const needsVideo = ["video", "reel"].includes(kind);
      const assetReady = !needsImage && !needsVideo; // pure text is ready immediately
      const platform = it.platform || platforms[idx % platforms.length];
      const prod = findProduct(it.product_or_service) || (needsImage || needsVideo ? productsAll[idx % Math.max(1, productsAll.length)] : null);
      const draftText = ensureText(it, kind, platform, prod);
      const referenceMedia: any[] = [];
      if (prod?.image) referenceMedia.push({ type: "product_image", url: prod.image, name: prod.name, link: prod.link });
      return {
        user_id: user.id,
        plan_id,
        item_index: idx + 1,
        scheduled_date: dt.toISOString().slice(0, 10),
        day_name: DAY_NAMES[dt.getDay()],
        scheduled_time: it.time || "10:00",
        platform,
        content_type: kind,
        objective: it.objective || null,
        idea: it.idea || null,
        product_or_service: it.product_or_service || prod?.name || null,
        hook: it.hook || null,
        draft_content: draftText,
        cta: it.cta || null,
        hashtags: it.hashtags || null,
        media_type: needsVideo ? "video" : (kind === "carousel" ? "carousel" : (needsImage ? "image" : "text")),
        needs_image: needsImage,
        needs_video: needsVideo,
        needs_carousel: kind === "carousel",
        needs_story: false,
        image_prompt: it.image_prompt || null,
        video_prompt: it.video_prompt || null,
        design_notes: it.design_notes || null,
        priority: it.priority || "medium",
        approval_status: "suggested",
        asset_urls: [],
        asset_ready: assetReady,
        reference_media: referenceMedia,
      };
    });

    const { error: ie } = await supabase.from("content_brain_items").insert(rows);
    if (ie) throw ie;

    await supabase.from("content_brain_plans").update({ status: "plan_ready" }).eq("id", plan_id);
    return jsonResponse({ ok: true, count: rows.length });
  } catch (e: any) {
    console.error("generate-plan error:", e);
    return jsonResponse({ ok: false, error: e.message }, 200);
  }
});
