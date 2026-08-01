// Exports a Brand Kit as JSON + CSS variables + Tailwind theme config.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function hexToHsl(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '0 0% 0%';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await client.auth.getUser();
    if (!u?.user) return json({ ok: false, error: 'unauthorized' }, 401);

    const { kit_id } = await req.json();
    if (!kit_id) return json({ ok: false, error: 'kit_id required' }, 400);

    const { data: kit, error } = await client.from('brand_kits').select('*').eq('id', kit_id).maybeSingle();
    if (error || !kit) return json({ ok: false, error: error?.message || 'kit not found' }, 404);

    const colors = (kit.colors_json || {}) as Record<string, string>;
    const typography = (kit.typography_json || {}) as Record<string, string>;

    // CSS variables
    let css = `:root {\n`;
    for (const [k, v] of Object.entries(colors)) {
      if (typeof v === 'string' && v.startsWith('#')) css += `  --brand-${k}: ${hexToHsl(v)};\n`;
    }
    css += `}\n\n/* Usage: hsl(var(--brand-primary)) */\n`;

    // Tailwind config snippet
    const twColors: Record<string, string> = {};
    for (const [k, v] of Object.entries(colors)) {
      if (typeof v === 'string' && v.startsWith('#')) twColors[k] = `hsl(var(--brand-${k}))`;
    }
    const tailwind = {
      theme: {
        extend: {
          colors: { brand: twColors },
          fontFamily: {
            'brand-heading': [typography.heading || 'sans-serif'],
            'brand-body': [typography.body || 'sans-serif'],
          },
        },
      },
    };

    // Assets list (with refreshed signed URLs)
    const { data: assets } = await client.from('branding_assets').select('*').eq('brand_kit_id', kit_id);

    const payload = {
      kit,
      assets: assets || [],
      exports: {
        json: kit,
        css_variables: css,
        tailwind_config: tailwind,
        markdown_guidelines: buildGuidelines(kit),
      },
      generated_at: new Date().toISOString(),
    };

    return json({ ok: true, ...payload });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) });
  }
});

function buildGuidelines(kit: any): string {
  const c = kit.colors_json || {};
  const t = kit.typography_json || {};
  const p = kit.personality_json || {};
  const lines: string[] = [];
  lines.push(`# Brand Guidelines — ${kit.brand_name_ar || kit.brand_name_en || ''}`);
  if (kit.slogan) lines.push(`> ${kit.slogan}`);
  lines.push(`\n## الهوية`);
  if (kit.industry) lines.push(`- المجال: ${kit.industry}`);
  if (kit.brand_dna_json?.mission) lines.push(`- الرسالة: ${kit.brand_dna_json.mission}`);
  if (kit.brand_dna_json?.vision) lines.push(`- الرؤية: ${kit.brand_dna_json.vision}`);
  lines.push(`\n## الألوان`);
  for (const [k, v] of Object.entries(c)) lines.push(`- ${k}: \`${v}\``);
  lines.push(`\n## الطباعة`);
  for (const [k, v] of Object.entries(t)) lines.push(`- ${k}: ${v}`);
  if (Object.keys(p).length) {
    lines.push(`\n## الشخصية`);
    for (const [k, v] of Object.entries(p)) lines.push(`- ${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}
