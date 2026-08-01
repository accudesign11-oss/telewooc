const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'missing LOVABLE_API_KEY' }), { headers: corsHeaders });

    const sys = `You are a senior brand designer. Output ONLY JSON: {prompt, negative_prompt, variations:[4 alt prompts]}.
Prompt rules:
- English, vector-style, transparent background unless background color given
- Mention readability at small sizes, centered composition, clean lines
- Include brand colors as hex
- Specify Arabic typography clean if Arabic name present
- Forbid: watermark, fake brand text, distorted letters, mockups
Negative_prompt: list visual issues to avoid.`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(b) }],
        response_format: { type: 'json_object' }
      })
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || '{}';
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { prompt: text, negative_prompt: '', variations: [] }; }
    return new Response(JSON.stringify({ ok: true, ...parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
