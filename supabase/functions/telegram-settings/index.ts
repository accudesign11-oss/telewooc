import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use dedicated encryption key from secrets
const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("TELEGRAM_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 32);

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text: string): Promise<string> {
  const key = await getKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string): Promise<string | null> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

function looksLikeTelegramToken(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(value.trim());
}

async function decryptPossibleTelegramToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (looksLikeTelegramToken(value)) return value.trim();
  const decrypted = await decrypt(value);
  if (looksLikeTelegramToken(decrypted)) return decrypted.trim();
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...data } = await req.json();

    if (action === "save") {
      const { bot_token, chat_id, auto_sync, name, source_id } = data;

      if (!chat_id || typeof chat_id !== "string" || chat_id.trim().length < 2) {
        return new Response(JSON.stringify({ error: "Chat/Channel ID مطلوب" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanChatId = chat_id.trim();
      const cleanToken = typeof bot_token === "string" ? bot_token.trim() : "";

      const { data: existingSource } = source_id
        ? await supabase
            .from("telegram_sources")
            .select("id, bot_token_encrypted")
            .eq("id", source_id)
            .eq("user_id", user.id)
            .maybeSingle()
        : await supabase
            .from("telegram_sources")
            .select("id, bot_token_encrypted")
            .eq("user_id", user.id)
            .eq("chat_id", cleanChatId)
            .maybeSingle();

      if ((!cleanToken || cleanToken === "[encrypted]") && !existingSource?.bot_token_encrypted) {
        return new Response(JSON.stringify({ error: "Invalid bot_token" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (cleanToken && cleanToken !== "[encrypted]" && cleanToken.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid bot_token" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedToken = cleanToken && cleanToken !== "[encrypted]"
        ? await encrypt(cleanToken)
        : existingSource?.bot_token_encrypted;

      await supabase
        .from("telegram_sources")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Encrypt in the Edge Function with ENCRYPTION_KEY, then store only a placeholder
      // in bot_token so the DB trigger never sees the raw token and cannot clear it.
      const { data: source, error } = await supabase
        .from("telegram_sources")
        .upsert(
          {
            user_id: user.id,
            name: name || "Telegram Bot",
            bot_token: "[encrypted]",
            bot_token_encrypted: encryptedToken,
            is_token_encrypted: Boolean(encryptedToken),
            chat_id: cleanChatId,
            auto_sync: auto_sync ?? true,
            is_active: true,
          },
          { onConflict: "user_id,chat_id" }
        )
        .select("id, chat_id, auto_sync, name, is_active, created_at, updated_at, bot_token_encrypted")
        .single();

      if (error) {
        console.error("Error saving telegram settings:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { bot_token_encrypted, ...safeSource } = source as any;
      return new Response(JSON.stringify({ success: true, source: { ...safeSource, has_token: Boolean(bot_token_encrypted) } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      // Get telegram sources WITHOUT the bot_token
      const { data: sources, error } = await supabase
        .from("telegram_sources")
        .select("id, chat_id, auto_sync, name, is_active, last_synced_at, created_at, updated_at, bot_token_encrypted")
        .eq("user_id", user.id)
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return sources with masked token indicator
      const maskedSources = sources?.map(s => ({
        id: s.id,
        chat_id: s.chat_id,
        auto_sync: s.auto_sync,
        name: s.name,
        is_active: s.is_active,
        last_synced_at: s.last_synced_at,
        created_at: s.created_at,
        updated_at: s.updated_at,
        has_token: Boolean(s.bot_token_encrypted),
      }));

      return new Response(JSON.stringify({ sources: maskedSources }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate") {
      const { source_id } = data;
      
      // Get the source with encrypted token
      const { data: source, error } = await supabase
        .from("telegram_sources")
        .select("bot_token_encrypted, bot_token")
        .eq("id", source_id)
        .eq("user_id", user.id)
        .single();

      if (error || !source) {
        return new Response(JSON.stringify({ error: "Source not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let decryptedToken = await decryptPossibleTelegramToken(source.bot_token_encrypted);

      // Legacy fallback for old rows encrypted by the database trigger.
      if (!decryptedToken) {
        const { data: rpcToken, error: rpcError } = await supabase.rpc(
          "get_telegram_bot_token",
          { p_source_id: source_id }
        );

        if (rpcError) console.error("Decrypt RPC error:", rpcError);
        decryptedToken = await decryptPossibleTelegramToken(rpcToken);
      }

      if (!decryptedToken) {
        return new Response(JSON.stringify({ valid: false, error: "Could not decrypt token. Please re-save it." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const telegramResponse = await fetch(`https://api.telegram.org/bot${decryptedToken}/getMe`);
      const telegramData = await telegramResponse.json();

      if (!telegramData.ok) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid bot token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        valid: true, 
        bot_username: telegramData.result?.username 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("telegram-settings error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
