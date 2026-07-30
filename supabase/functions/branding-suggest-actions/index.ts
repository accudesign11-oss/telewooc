// AI-driven action suggestions for the Branding Dashboard.
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
    const { stats, last_kit } = await req.json();

    const sys = `أنت مستشار هوية بصرية. بناءً على إحصائيات حساب البراندنج الحالي و آخر Brand Kit، اقترح 3-5 إجراءات ذكية ومحددة جداً يقوم بها المستخدم الآن. أعد JSON فقط:
{ "suggestions": [{ "title": "...", "reason": "...", "action": "go_logo|go_covers|go_templates|go_general|go_create|go_prompts|go_library", "priority": "high|medium|low" }] }`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify({ stats, last_kit }) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ ok: false, error: j?.error?.message || `gateway ${r.status}` });
    const text = j?.choices?.[0]?.message?.content || '{}';
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { suggestions: [] }; }
    return json({ ok: true, ...parsed });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) });
  }
});
