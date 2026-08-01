// Universal image generator for Branding Studio.
// Uses user's default generation_provider if API-based, otherwise falls back to Lovable AI Gateway (gpt-image-2).
// Uploads result to private storage bucket "branding-assets" and returns a signed URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function b64ToBytes(b64: string): Promise<Uint8Array> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchAsBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  const ab = await r.arrayBuffer();
  return new Uint8Array(ab);
}

// ---- Provider generators ----

async function genOpenAI(apiKey: string, prompt: string, size: string, n: number) {
  // size like "1024x1024" or "1024x1536"
  const allowed = ['1024x1024', '1024x1536', '1536x1024', '512x512', '256x256'];
  const sz = allowed.includes(size) ? size : '1024x1024';
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: sz, n: Math.min(n, 4) }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `OpenAI ${r.status}`);
  return (j.data || []).map((d: any) =>
    d.b64_json ? { bytes: null as Uint8Array | null, b64: d.b64_json } : { url: d.url }
  );
}

async function genStability(apiKey: string, prompt: string, size: string) {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10));
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('output_format', 'png');
  form.append('aspect_ratio', `${w}:${h}`);
  const r = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'image/*' },
    body: form,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Stability ${r.status}: ${t.slice(0, 200)}`);
  }
  const ab = await r.arrayBuffer();
  return [{ bytes: new Uint8Array(ab), b64: null }];
}

async function genIdeogram(apiKey: string, prompt: string, size: string) {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10));
  const aspect =
    w === h ? 'ASPECT_1_1' : w > h ? 'ASPECT_16_9' : 'ASPECT_9_16';
  const r = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_request: { prompt, aspect_ratio: aspect, model: 'V_2', magic_prompt_option: 'AUTO' },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.detail || `Ideogram ${r.status}`);
  const urls = (j?.data || []).map((d: any) => d.url).filter(Boolean);
  return urls.map((u: string) => ({ url: u }));
}

async function genLovableAI(prompt: string, size: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');
  const allowed = ['1024x1024', '1024x1536', '1536x1024'];
  const sz = allowed.includes(size) ? size : '1024x1024';
  const r = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt,
      size: sz,
      quality: 'low',
      n: 1,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Lovable AI ${r.status}`);
  return (j.data || []).map((d: any) => ({ b64: d.b64_json, bytes: null as Uint8Array | null }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: 'unauthorized' }, 401);
    const userId = u.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      prompt,
      negative_prompt = '',
      size = '1024x1024',
      n = 1,
      asset_type = 'general',
      brand_kit_id = null,
      client_id = null,
      platform = null,
      title = null,
      provider_id = null, // optional: force specific provider
      fallback_to_lovable = true,
    } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return json({ ok: false, error: 'prompt required' }, 400);
    }

    // Pick provider
    let providerRow: any = null;
    if (provider_id) {
      const { data } = await admin.from('generation_providers').select('*').eq('id', provider_id).eq('user_id', userId).maybeSingle();
      providerRow = data;
    } else {
      const { data } = await admin.from('generation_providers').select('*').eq('user_id', userId).eq('is_default', true).maybeSingle();
      providerRow = data;
    }

    const startedAt = Date.now();
    const usedProviders: string[] = [];
    let images: Array<{ bytes?: Uint8Array | null; b64?: string | null; url?: string }> = [];
    let lastError = '';

    async function tryProvider(name: string, apiKey: string) {
      usedProviders.push(name);
      if (name === 'openai') images = await genOpenAI(apiKey, prompt, size, n);
      else if (name === 'stability') images = await genStability(apiKey, prompt, size);
      else if (name === 'ideogram') images = await genIdeogram(apiKey, prompt, size);
      else throw new Error(`Provider ${name} not supported for direct generation`);
    }

    if (providerRow && providerRow.api_key_encrypted && !providerRow.provider_name.endsWith('_manual')) {
      try {
        const apiKey = atob(providerRow.api_key_encrypted);
        await tryProvider(providerRow.provider_name, apiKey);
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    if (images.length === 0 && fallback_to_lovable) {
      try {
        usedProviders.push('lovable-ai');
        images = await genLovableAI(prompt, size);
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    if (images.length === 0) {
      await admin.from('branding_generation_logs').insert({
        user_id: userId, brand_kit_id, client_id, asset_type,
        provider: usedProviders.join('>'), prompt, status: 'failed',
        error_message: lastError, duration_ms: Date.now() - startedAt,
      });
      return json({ ok: false, error: lastError || 'no image produced', providers: usedProviders });
    }

    // Persist each image to storage
    const saved: any[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      let bytes: Uint8Array;
      if (img.bytes) bytes = img.bytes;
      else if (img.b64) bytes = await b64ToBytes(img.b64);
      else if (img.url) bytes = await fetchAsBytes(img.url);
      else continue;

      const fileName = `${userId}/${asset_type}/${crypto.randomUUID()}.png`;
      const up = await admin.storage.from('branding-assets').upload(fileName, bytes, {
        contentType: 'image/png', upsert: false,
      });
      if (up.error) {
        lastError = up.error.message;
        continue;
      }
      const { data: signed } = await admin.storage.from('branding-assets')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      const { data: asset } = await admin.from('branding_assets').insert({
        user_id: userId, brand_kit_id, client_id, asset_type, platform,
        title: title || `${asset_type} ${i + 1}`,
        prompt, negative_prompt,
        provider: usedProviders[usedProviders.length - 1],
        image_url: signed?.signedUrl || null,
        storage_path: fileName,
        size_width: parseInt(size.split('x')[0], 10) || null,
        size_height: parseInt(size.split('x')[1], 10) || null,
        status: 'generated',
        metadata_json: { providers_tried: usedProviders },
      }).select().single();

      saved.push(asset);
    }

    await admin.from('branding_generation_logs').insert({
      user_id: userId, brand_kit_id, client_id, asset_type,
      provider: usedProviders.join('>'), prompt,
      status: saved.length ? 'success' : 'failed',
      error_message: saved.length ? null : lastError,
      duration_ms: Date.now() - startedAt,
      metadata_json: { count: saved.length },
    });

    return json({ ok: saved.length > 0, assets: saved, providers: usedProviders, error: saved.length ? null : lastError });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) });
  }
});
