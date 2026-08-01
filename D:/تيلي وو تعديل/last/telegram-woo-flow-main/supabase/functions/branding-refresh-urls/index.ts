// Refreshes signed URLs for branding assets stored in private storage.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await client.auth.getUser();
    if (!u?.user) return json({ ok: false, error: 'unauthorized' }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const { asset_ids = [] } = await req.json();
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) return json({ ok: false, error: 'asset_ids required' }, 400);

    const { data: rows } = await admin.from('branding_assets')
      .select('id, storage_path, user_id').in('id', asset_ids).eq('user_id', u.user.id);

    const out: Record<string, string> = {};
    for (const r of rows || []) {
      if (!r.storage_path) continue;
      const { data: signed } = await admin.storage.from('branding-assets')
        .createSignedUrl(r.storage_path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        out[r.id] = signed.signedUrl;
        await admin.from('branding_assets').update({ image_url: signed.signedUrl }).eq('id', r.id);
      }
    }
    return json({ ok: true, urls: out });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) });
  }
});
