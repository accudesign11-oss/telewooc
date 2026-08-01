// Test script to verify stripCssFromHtml works against real CSS leak text

const RAW_CSS_LEAK = `.tlv-description { direction: rtl; text-align: right; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; }.tlv-service-cards, .tlv-feature-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; margin: 16px 0 !important; padding: 0 !important; }@media (max-width: 640px) {.tlv-service-cards, .tlv-feature-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 4px !important; }}@media (max-width: 440px) {.tlv-service-cards, .tlv-feature-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 2px !important; }.tlv-service-card, .tlv-feature-card { padding: 4px 2px !important; border-radius: 6px !important; }.tlv-service-emoji, .tlv-feature-icon { font-size: 16px !important; margin-bottom: 2px !important; }.tlv-service-card h3, .tlv-feature-card h3 { font-size: 9px !important; margin-bottom: 1px !important; white-space: normal !important; }.tlv-service-card p, .tlv-feature-card p { font-size: 8px !important; }}.tlv-service-card, .tlv-feature-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 10px !important; padding: 8px 6px !important; text-align: center !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important; }.tlv-service-emoji, .tlv-feature-icon { font-size: 22px !important; line-height: 1 !important; margin-bottom: 4px !important; display: block !important; }.tlv-service-card h3, .tlv-feature-card h3 { font-size: 12px !important; font-weight: 700 !important; margin: 0 0 2px 0 !important; color: #0f172a !important; line-height: 1.2 !important; text-align: center !important; }.tlv-service-card p, .tlv-feature-card p { font-size: 10px !important; color: #64748b !important; margin: 0 !important; line-height: 1.25 !important; text-align: center !important; }.tlv-main-title { font-size: 15px !important; font-weight: 800 !important; color: #0f172a !important; margin: 16px 0 8px 0 !important; border-right: 4px solid #3b82f6 !important; padding-right: 8px !important; }.tlv-desc-img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 12px auto !important; display: block !important; }.tlv-marquee { background: #eff6ff !important; color: #1d4ed8 !important; padding: 6px 12px !important; border-radius: 6px !important; font-size: 11px !important; font-weight: 700 !important; text-align: center !important; margin-bottom: 12px !important; }.tlv-live-help { background: #f0fdf4 !important; border: 1px solid #bbf7d0 !important; border-radius: 10px !important; padding: 10px !important; text-align: center !important; margin-top: 16px !important; }.tlv-live-help h2 { font-size: 13px !important; font-weight: 700 !important; color: #166534 !important; margin: 0 0 3px 0 !important; }.tlv-live-help p { font-size: 10px !important; color: #15803d !important; margin: 0 !important; }.tlv-description table { width: 100% !important; border-collapse: collapse !important; margin: 12px 0 !important; font-size: 12px !important; }.tlv-description th, .tlv-description td { border: 1px solid #e2e8f0 !important; padding: 6px 10px !important; text-align: right !important; }.tlv-description th { background-color: #f1f5f9 !important; font-weight: 700 !important; color: #334155 !important; }`;

const SAMPLE_DESC_WITH_CSS = RAW_CSS_LEAK + `
<div class="tlv-service-cards">
  <div class="tlv-service-card"><span class="tlv-service-emoji">🚚</span><h3>شحن مجاني</h3><p>توصيل سريع لباب المنزل</p></div>
  <div class="tlv-service-card"><span class="tlv-service-emoji">🛡️</span><h3>ضمان الأصالة</h3><p>منتج أصلـي 100%</p></div>
  <div class="tlv-service-card"><span class="tlv-service-emoji">💳</span><h3>دفع آمن</h3><p>طرق دفع مرنة ومريحة</p></div>
</div>
<h2 class="tlv-main-title">عطر فيلور أمبر بريسيو</h2>
<p dir="rtl">عطر فاخر يجمع بين دفء العنبر والتوابل</p>
<table><tr><th>الحجم</th><td>100 مل</td></tr></table>`;

const SAMPLE_WITH_STYLE_TAG = `<div class="tlv-description" dir="rtl">
<style>
.tlv-description { direction: rtl; }
.tlv-service-cards { display: grid; }
</style>
<div class="tlv-service-cards">
  <div class="tlv-service-card"><span>🚚</span><h3>شحن</h3></div>
</div>
<h2>عنوان المنتج</h2>
<p>وصف المنتج</p>
</div>`;

function stripCssFromHtml(html) {
  if (!html || typeof html !== "string") return "";
  let s = html.trim();

  // 1. Strip all <style> and <script> tags completely
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");

  // 2. Strip any raw CSS rule blocks like .tlv-description { ... }
  s = s.replace(/\.tlv-[^{]+\{[^}]*\}/gi, "");
  s = s.replace(/@media[^{]+\{(?:[^{}]*|\{[^}]*\})*\}/gi, "");

  // 3. Strip any preamble text before the first HTML tag if it contains CSS or code
  const firstTagIndex = s.search(/<[a-z1-6]/i);
  if (firstTagIndex > 0) {
    const preamble = s.substring(0, firstTagIndex);
    if (preamble.includes("{") || preamble.includes("tlv-") || preamble.includes("`") || /وصف|كود|html|المنتج|المثال|مخرج/i.test(preamble)) {
      s = s.substring(firstTagIndex);
    }
  }

  // 4. Strip markdown code fences and backticks
  s = s.replace(/```[a-z]*\n?/gi, "");
  s = s.replace(/```/g, "");

  return s.trim();
}

// ─── TEST 1: Raw CSS leak text before HTML (exactly what user sees) ───
console.log("═══════════════════════════════════════════════");
console.log("TEST 1: Raw CSS leak text + HTML description");
console.log("═══════════════════════════════════════════════");
const result1 = stripCssFromHtml(SAMPLE_DESC_WITH_CSS);
const hasCssLeak1 = result1.includes(".tlv-") || result1.includes("!important") || result1.includes("grid-template-columns");
console.log("CSS leak detected:", hasCssLeak1 ? "❌ STILL LEAKING" : "✅ CLEAN");
console.log("Starts with HTML tag:", result1.startsWith("<") ? "✅ YES" : "❌ NO");
console.log("Contains شحن مجاني:", result1.includes("شحن مجاني") ? "✅ YES" : "❌ MISSING");
console.log("Contains عطر فيلور:", result1.includes("عطر فيلور") ? "✅ YES" : "❌ MISSING");
console.log("Contains table:", result1.includes("<table") ? "✅ YES" : "❌ MISSING");
console.log("\nFirst 200 chars of result:");
console.log(result1.substring(0, 200));
console.log("");

// ─── TEST 2: <style> tag wrapping CSS ───
console.log("═══════════════════════════════════════════════");
console.log("TEST 2: <style> tag wrapping CSS");
console.log("═══════════════════════════════════════════════");
const result2 = stripCssFromHtml(SAMPLE_WITH_STYLE_TAG);
const hasCssLeak2 = result2.includes(".tlv-description {") || result2.includes("<style>") || result2.includes("display: grid");
console.log("CSS leak detected:", hasCssLeak2 ? "❌ STILL LEAKING" : "✅ CLEAN");
console.log("Contains شحن:", result2.includes("شحن") ? "✅ YES" : "❌ MISSING");
console.log("Contains عنوان:", result2.includes("عنوان المنتج") ? "✅ YES" : "❌ MISSING");
console.log("\nFirst 200 chars of result:");
console.log(result2.substring(0, 200));
console.log("");

// ─── TEST 3: Just pure CSS text with no HTML at all ───
console.log("═══════════════════════════════════════════════");
console.log("TEST 3: Just raw CSS text (no HTML)");
console.log("═══════════════════════════════════════════════");
const result3 = stripCssFromHtml(RAW_CSS_LEAK);
const hasCssLeak3 = result3.includes(".tlv-") || result3.includes("!important");
console.log("CSS leak detected:", hasCssLeak3 ? "❌ STILL LEAKING" : "✅ CLEAN");
console.log("Result length:", result3.length);
console.log("Result content:", JSON.stringify(result3.substring(0, 100)));
console.log("");

// ─── TEST 4: Clean HTML should pass through unchanged ───
console.log("═══════════════════════════════════════════════");
console.log("TEST 4: Clean HTML (no CSS) should pass through");
console.log("═══════════════════════════════════════════════");
const cleanHtml = `<div><h2>عطر فاخر</h2><p dir="rtl">وصف رائع للعطر</p><table><tr><th>الحجم</th><td>100مل</td></tr></table></div>`;
const result4 = stripCssFromHtml(cleanHtml);
console.log("Contains عطر فاخر:", result4.includes("عطر فاخر") ? "✅ YES" : "❌ MISSING");
console.log("Contains وصف:", result4.includes("وصف رائع") ? "✅ YES" : "❌ MISSING");
console.log("Contains table:", result4.includes("<table") ? "✅ YES" : "❌ MISSING");
console.log("");

// ─── FINAL SUMMARY ───
console.log("═══════════════════════════════════════════════");
console.log("FINAL SUMMARY");
console.log("═══════════════════════════════════════════════");
const allPassed = !hasCssLeak1 && !hasCssLeak2 && !hasCssLeak3;
console.log(allPassed ? "✅ ALL TESTS PASSED - Safe to deploy!" : "❌ SOME TESTS FAILED - Fix needed!");
