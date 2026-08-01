// Minimal provider connectivity test (does not generate images)
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { provider_name, api_key, base_url } = await req.json();
    if (!provider_name || !api_key) {
      return new Response(JSON.stringify({ ok: false, error: 'provider_name and api_key required' }), { headers: corsHeaders });
    }

    let url = '', headers: any = {};
    switch (provider_name) {
      case 'openai':
        url = (base_url || 'https://api.openai.com') + '/v1/models';
        headers = { Authorization: `Bearer ${api_key}` };
        break;
      case 'stability':
        url = 'https://api.stability.ai/v1/user/account';
        headers = { Authorization: `Bearer ${api_key}` };
        break;
      case 'replicate':
        url = 'https://api.replicate.com/v1/account';
        headers = { Authorization: `Token ${api_key}` };
        break;
      case 'ideogram':
        url = 'https://api.ideogram.ai/manage/api-keys';
        headers = { 'Api-Key': api_key };
        break;
      case 'leonardo':
        url = 'https://cloud.leonardo.ai/api/rest/v1/me';
        headers = { Authorization: `Bearer ${api_key}` };
        break;
      default:
        // Manual / custom — just acknowledge
        return new Response(JSON.stringify({ ok: true, manual: true, message: 'مزود يدوي — لا يحتاج فحص اتصال' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const r = await fetch(url, { headers });
    const success = r.ok;
    const text = await r.text().catch(() => '');
    return new Response(JSON.stringify({
      ok: success,
      status: r.status,
      message: success ? 'اتصال ناجح' : `فشل الاتصال (${r.status})`,
      detail: success ? null : text.slice(0, 300)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
