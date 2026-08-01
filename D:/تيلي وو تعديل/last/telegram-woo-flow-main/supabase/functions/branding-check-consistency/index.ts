// Evaluates an image against a Brand Kit's DNA. Returns 0–100 score + breakdown + suggestions.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ ok: false, error: 'missing LOVABLE_API_KEY' });
    const { image_url, brand_kit, asset_type = 'general' } = await req.json();
    if (!image_url) return json({ ok: false, error: 'image_url required' }, 400);

    const sys = `أنت خبير هوية بصرية. قيّم مدى توافق الصورة مع البراند DNA المعطى. أعد JSON فقط بالشكل التالي بدون أي شرح:
{
  "score": <عدد 0..100>,
  "color_match": <0..100>,
  "typography_match": <0..100>,
  "style_match": <0..100>,
  "composition": <0..100>,
  "issues": ["مشكلة 1","..."],
  "suggestions": ["اقتراح 1","..."],
  "verdict": "<ممتاز|جيد|يحتاج تعديل|مرفوض>"
}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sys },
          {
            role: 'user',
            content: [
              { type: 'text', text: `النوع: ${asset_type}\nBrand Kit:\n${JSON.stringify(brand_kit || {}, null, 2)}` },
              { type: 'image_url', image_url: { url: image_url } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ ok: false, error: j?.error?.message || `gateway ${r.status}` });
    const text = j?.choices?.[0]?.message?.content || '{}';
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { score: 0, issues: ['تعذر تحليل الرد'], suggestions: [] }; }
    return json({ ok: true, ...parsed });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) });
  }
});
