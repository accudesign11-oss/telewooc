// Generate Brand DNA + strategy via Lovable AI Gateway (Gemini)
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'missing LOVABLE_API_KEY' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sys = `أنت مدير هوية بصرية محترف. أنشئ Brand DNA متكامل بصيغة JSON فقط بدون أي شرح.
المفاتيح المطلوبة:
visual_personality (string), tone_of_voice (string), color_psychology (string),
logo_rules (string[]), image_style (string), icon_style (string), layout_rules (string[]),
preferred_cta (string[]), preferred_hooks (string[]), do_guidelines (string[]),
dont_guidelines (string[]), prompt_dna (string), social_media_style (string),
design_consistency_rules (string[]), recommended_palette (string[] hex), recommended_fonts {heading,body}.
اكتب المحتوى بالعربية الفصحى. أعد JSON فقط.`;

    const user = `بيانات البراند:\n${JSON.stringify(body, null, 2)}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        response_format: { type: 'json_object' }
      })
    });

    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || '{}';
    let dna: any;
    try { dna = JSON.parse(text); } catch { dna = { raw: text }; }

    return new Response(JSON.stringify({ ok: true, brand_dna: dna, model: 'gemini-2.5-flash' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
