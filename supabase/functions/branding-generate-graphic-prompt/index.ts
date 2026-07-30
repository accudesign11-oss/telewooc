const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = await req.json();
    // b: { asset_type, platform, width, height, brand, dna, instructions, text_overlay, language }
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'missing LOVABLE_API_KEY' }), { headers: corsHeaders });

    const sys = `You are a graphic prompt engineer producing prompts for tools like Midjourney, Leonardo, Ideogram, Firefly, ChatGPT Images, Gemini Images.
Output ONLY JSON: {prompt, negative_prompt, variations:[3 alts], aspect, notes}.
Rules:
- Respect requested width/height as aspect ratio
- Include brand colors (hex), typography hints, and visual mood
- If text overlay provided, instruct readable text placement inside safe area, away from edges
- For Arabic text: emphasize clean Arabic typography, RTL flow, no distorted letters
- Mention platform and asset_type in stylistic terms
- Forbid: watermark, broken text, low-res, distorted faces, copyrighted logos
- Negative_prompt: concrete avoid list`;

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
