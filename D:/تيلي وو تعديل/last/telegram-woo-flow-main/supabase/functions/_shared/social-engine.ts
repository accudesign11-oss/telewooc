// Shared utilities for social-engine edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ENCRYPTION_KEY =
  Deno.env.get("ENCRYPTION_KEY") ||
  Deno.env.get("TELEGRAM_ENCRYPTION_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 32);

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").slice(0, 32));
  return await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(text: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedData: string): Promise<string | null> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// ---------- Multi-provider AI ----------

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
];

export interface AISettings {
  provider?: "gemini" | "openrouter" | "huggingface";
  gemini_api_key?: string | null;
  openrouter_api_key?: string | null;
  openrouter_model?: string | null;
  huggingface_api_key?: string | null;
  huggingface_model?: string | null;
}

async function callGeminiOnce(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        lastErr = `${model} (HTTP ${r.status}): ${txt.slice(0, 150)}`;
        if ([404, 429, 500, 502, 503, 504].includes(r.status)) continue;
        throw new Error(`Gemini ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
      lastErr = `${model}: empty response`;
    } catch (e: any) {
      lastErr = `${model}: ${e.message}`;
      continue;
    }
  }
  throw new Error(`Gemini failed: ${lastErr}`);
}

async function callOpenRouterOnce(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
    },
    body: JSON.stringify({
      model: model || "google/gemma-3-27b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenRouter ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OpenRouter: empty response");
  return text;
}

async function callHFOnce(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const m = model || "mistralai/Mistral-7B-Instruct-v0.3";
  const r = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`,
      parameters: { max_new_tokens: 2048, temperature: 0.7, return_full_text: false },
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HF ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = Array.isArray(data) ? (data[0]?.generated_text || "") : (data.generated_text || "");
  if (!text) throw new Error("HF: empty response");
  return text;
}

async function callLovableGatewayOnce(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`LovableAI ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("LovableAI: empty response");
  return text;
}

export async function callAI(ai: AISettings, systemPrompt: string, userPrompt: string): Promise<{ text: string; provider: string }> {
  const order: Array<"gemini" | "openrouter" | "huggingface"> = [];
  const preferred = (ai.provider || "gemini") as any;
  order.push(preferred);
  for (const p of ["gemini", "openrouter", "huggingface"] as const) if (!order.includes(p)) order.push(p);

  const errors: string[] = [];
  for (const p of order) {
    try {
      if (p === "gemini" && ai.gemini_api_key) {
        const text = await callGeminiOnce(ai.gemini_api_key, systemPrompt, userPrompt);
        return { text, provider: "gemini" };
      }
      if (p === "openrouter" && ai.openrouter_api_key) {
        const text = await callOpenRouterOnce(ai.openrouter_api_key, ai.openrouter_model || "", systemPrompt, userPrompt);
        return { text, provider: "openrouter" };
      }
      if (p === "huggingface" && ai.huggingface_api_key) {
        const text = await callHFOnce(ai.huggingface_api_key, ai.huggingface_model || "", systemPrompt, userPrompt);
        return { text, provider: "huggingface" };
      }
    } catch (e: any) {
      errors.push(`${p}: ${e.message}`);
    }
  }

  // Fallback to Lovable Gateway if environment key is present
  if (Deno.env.get("LOVABLE_API_KEY")) {
    try {
      const text = await callLovableGatewayOnce(systemPrompt, userPrompt);
      return { text, provider: "lovable" };
    } catch (e: any) {
      errors.push(`lovable: ${e.message}`);
    }
  }

  throw new Error(`لم يتوفر مزود AI صالح من إعداداتك. فعّل Gemini أو OpenRouter أو Hugging Face ثم أعد المحاولة. ${errors.join(" | ")}`);
}

// Legacy compatibility
export async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  return await callGeminiOnce(apiKey, systemPrompt, userPrompt);
}

export function extractJson(text: string): any {
  let cleaned = String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  // Try full parse first
  try { return JSON.parse(cleaned); } catch {}
  // Grab the largest {...} block
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("No JSON in response");
  let candidate = cleaned.slice(first, last + 1);
  // Normalize common AI JSON glitches
  candidate = candidate
    .replace(/،/g, ",")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/(\r?\n)+/g, " ");
  try { return JSON.parse(candidate); } catch (e: any) {
    throw new Error(`JSON parse failed: ${e.message}`);
  }
}

export async function callAIJson(ai: AISettings, systemPrompt: string, userPrompt: string, retries = 3): Promise<{ data: any; provider: string; raw: string }> {
  const strictSys = systemPrompt + "\n\nCRITICAL: Reply with a single valid JSON object ONLY. No markdown, no code fences, no commentary before or after. Use standard ASCII commas (,) not Arabic commas.";
  let lastErr = "";
  let lastRaw = "";
  let lastProvider = "";
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const suffix = attempt === 0 ? "" : `\n\nPrevious attempt failed to parse. Return ONLY valid JSON now.`;
      const { text, provider } = await callAI(ai, strictSys, userPrompt + suffix);
      lastRaw = text; lastProvider = provider;
      const data = extractJson(text);
      return { data, provider, raw: text };
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  const err: any = new Error(`AI JSON failed after ${retries} attempts: ${lastErr}`);
  err.raw = lastRaw; err.provider = lastProvider;
  throw err;
}

export async function getAuthedUserAndAI(req: Request): Promise<{
  user: any;
  supabase: any;
  ai: AISettings;
  geminiKey: string | null;
}> {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  
  let user: any = null;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const { data } = await supabase.auth.getUser(token);
      user = data?.user || null;
    } catch (_) {
      user = null;
    }
  }

  if (!user) {
    user = { id: "00000000-0000-0000-0000-000000000000", email: "guest@telewoo.app" };
  }

  let row: any = null;
  if (user.id !== "00000000-0000-0000-0000-000000000000") {
    const { data } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "ai").maybeSingle();
    row = data;
  }
  if (!row) {
    const { data } = await supabase.from("settings").select("value").eq("key", "ai").order("created_at", { ascending: false }).limit(1).maybeSingle();
    row = data;
  }

  const v = (row?.value as any) || {};
  const ai: AISettings = {
    provider: v.provider || "gemini",
    gemini_api_key: v.gemini_api_key || null,
    openrouter_api_key: v.openrouter_api_key || null,
    openrouter_model: v.openrouter_model || null,
    huggingface_api_key: v.huggingface_api_key || null,
    huggingface_model: v.huggingface_model || null,
  };

  if (!ai.gemini_api_key && !ai.openrouter_api_key && !ai.huggingface_api_key) {
    const { data: providers } = await supabase
      .from("generation_providers")
      .select("provider_name, api_key_encrypted, model_name, base_url, is_default, status")
      .eq("user_id", user.id)
      .in("provider_name", ["gemini", "google_gemini", "openrouter", "huggingface"])
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    for (const provider of providers || []) {
      let key = "";
      try { key = provider.api_key_encrypted ? atob(provider.api_key_encrypted) : ""; } catch { key = ""; }
      if (!key) continue;
      if (["gemini", "google_gemini"].includes(provider.provider_name) && !ai.gemini_api_key) {
        ai.gemini_api_key = key;
        ai.provider = "gemini";
      } else if (provider.provider_name === "openrouter" && !ai.openrouter_api_key) {
        ai.openrouter_api_key = key;
        ai.openrouter_model = provider.model_name || ai.openrouter_model;
        ai.provider = ai.provider || "openrouter";
      } else if (provider.provider_name === "huggingface" && !ai.huggingface_api_key) {
        ai.huggingface_api_key = key;
        ai.huggingface_model = provider.model_name || ai.huggingface_model;
        ai.provider = ai.provider || "huggingface";
      }
    }
  }

  // Fallback to system environment keys if user hasn't provided any
  if (!ai.gemini_api_key) {
    ai.gemini_api_key = Deno.env.get("GEMINI_API_KEY") ||
                        Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") ||
                        Deno.env.get("SUPABASE_GEMINI_KEY") || null;
  }
  if (!ai.openrouter_api_key) {
    ai.openrouter_api_key = Deno.env.get("OPENROUTER_API_KEY") || null;
  }

  return { user, supabase, ai, geminiKey: ai.gemini_api_key };
}

// Legacy export
export const getAuthedUserAndKey = getAuthedUserAndAI;
