import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use dedicated encryption key from secrets (same AES-GCM format used by telegram-settings)
const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("TELEGRAM_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 32);

async function getDecryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

async function decryptToken(encryptedData: string): Promise<string> {
  try {
    const key = await getDecryptionKey();
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
    // If decryption fails, assume it's not encrypted (legacy data)
    return encryptedData;
  }
}

function looksLikeTelegramToken(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(value.trim());
}

async function decryptPossibleTelegramToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (looksLikeTelegramToken(value)) return value.trim();

  const decrypted = await decryptToken(value);
  if (looksLikeTelegramToken(decrypted)) return decrypted.trim();
  return null;
}

function normalizeChatTarget(chatId: string): string {
  return chatId.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "@").replace(/^t\.me\//i, "@");
}

function getTelegramMessage(update: any) {
  return update.message || update.channel_post || update.edited_message || update.edited_channel_post;
}

async function telegramApi(botToken: string, method: string, params: Record<string, string | number> = {}) {
  const url = new URL(`https://api.telegram.org/bot${botToken}/${method}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function getFileUrl(botToken: string, fileId: string): Promise<string | null> {
  try {
    // Get file path from Telegram
    const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileResponse.json();
    
    if (fileData.ok && fileData.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    }
    return null;
  } catch (error) {
    console.error("Error getting file URL:", error);
    return null;
  }
}

// Input validation helper
function validateSourceId(source_id: unknown): { valid: boolean; error?: string } {
  if (!source_id || typeof source_id !== "string") {
    return { valid: false, error: "source_id is required and must be a string" };
  }
  if (source_id.length > 100) {
    return { valid: false, error: "source_id is too long (max 100 characters)" };
  }
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(source_id)) {
    return { valid: false, error: "source_id must be a valid UUID" };
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 200,
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { source_id } = body;

    // Validate source_id input
    const sourceValidation = validateSourceId(source_id);
    if (!sourceValidation.valid) {
      return new Response(JSON.stringify({ error: sourceValidation.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get telegram source settings
    const { data: source, error: sourceError } = await supabase
      .from("telegram_sources")
      .select("*")
      .eq("id", source_id)
      .eq("user_id", user.id)
      .single();

    if (sourceError || !source) {
      console.error("Source not found:", sourceError);
      return new Response(JSON.stringify({ error: "Telegram source not found. الرجاء إعداد Telegram من الإعدادات أولاً" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let botToken = await decryptPossibleTelegramToken(source.bot_token_encrypted);

    // Legacy fallback for old rows encrypted by the database trigger, including double-encrypted AES-in-PGP rows.
    if (!botToken) {
      const { data: rpcToken, error: rpcError } = await supabase.rpc(
        "get_telegram_bot_token",
        { p_source_id: source.id }
      );

      if (rpcError) console.error("Decrypt RPC error:", rpcError);
      botToken = await decryptPossibleTelegramToken(rpcToken);
    }

    if (!botToken) {
      return new Response(JSON.stringify({
        error: "تعذر فك تشفير Bot Token. الرجاء إعادة حفظ الإعدادات من صفحة الإعدادات.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = normalizeChatTarget(source.chat_id || "");

    if (!chatId) {
      return new Response(JSON.stringify({ error: "Chat/Channel ID غير مضبوط في إعدادات Telegram" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedChatId = chatId;
    if (chatId.startsWith("@")) {
      const chatInfo = await telegramApi(botToken, "getChat", { chat_id: chatId });
      if (chatInfo.data?.ok && chatInfo.data?.result?.id) {
        resolvedChatId = chatInfo.data.result.id.toString();
      } else {
        console.error("Telegram getChat error:", chatInfo.data);
      }
    }

    const webhookInfo = await telegramApi(botToken, "getWebhookInfo");
    if (webhookInfo.data?.ok && webhookInfo.data?.result?.url) {
      console.log("Deleting Telegram webhook before polling getUpdates");
      await telegramApi(botToken, "deleteWebhook", { drop_pending_updates: "false" });
    }

    // Fetch messages from Telegram
    console.log(`Fetching updates for chat ${chatId} (resolved ${resolvedChatId})...`);
    const telegramUrl = `https://api.telegram.org/bot${botToken}/getUpdates?timeout=1&limit=100&allowed_updates=${encodeURIComponent(JSON.stringify(["message","channel_post","edited_message","edited_channel_post"]))}`;
    const telegramResponse = await fetch(telegramUrl);
    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return new Response(JSON.stringify({ 
        error: "Telegram API error", 
        details: telegramData.description || "تأكد من صحة Bot Token"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = telegramData.result || [];
    let importedCount = 0;
    let newestUpdateId = 0;
    console.log(`Found ${messages.length} updates`);
    console.log(`Target chat_id: ${chatId}`);
    
    // Log raw updates for debugging
    if (messages.length > 0) {
      console.log(`First update raw:`, JSON.stringify(messages[0], null, 2));
    }

    for (const update of messages) {
      if (typeof update.update_id === "number") newestUpdateId = Math.max(newestUpdateId, update.update_id);
      console.log(`Processing update_id: ${update.update_id}`);
      
      const message = getTelegramMessage(update);
      if (!message) {
        console.log(`Update ${update.update_id} has no supported message. Keys: ${Object.keys(update).join(', ')}`);
        continue;
      }

      // Check if message is from the target chat
      const msgChatId = message.chat?.id?.toString();
      const msgChatType = message.chat?.type;
      const msgChatTitle = message.chat?.title;
      const msgChatUsername = message.chat?.username ? `@${message.chat.username}` : null;
      
      console.log(`Message details: chat_id=${msgChatId}, type=${msgChatType}, title=${msgChatTitle}, username=${msgChatUsername}`);
      console.log(`Target: ${chatId}`);
      
      // Match by chat ID, normalized chat ID, username, or title
      const normalizedTarget = chatId.startsWith("@") ? chatId.toLowerCase() : chatId;
      const normalizedMsgUsername = msgChatUsername?.toLowerCase();
      
      // Check various matching conditions
      const matchesChatId = msgChatId === chatId || 
                            msgChatId === resolvedChatId ||
                            msgChatId === chatId.replace("-100", "") || 
                            `-100${msgChatId}` === chatId ||
                            `-100${msgChatId}` === resolvedChatId;
      const matchesUsername = normalizedMsgUsername === normalizedTarget;
      
      // Also try matching without @ prefix
      const targetWithoutAt = chatId.startsWith("@") ? chatId.slice(1).toLowerCase() : null;
      const usernameWithoutAt = msgChatUsername ? msgChatUsername.slice(1).toLowerCase() : null;
      const matchesUsernameWithoutAt = targetWithoutAt && usernameWithoutAt && targetWithoutAt === usernameWithoutAt;
      
      console.log(`Match checks: chatId=${matchesChatId}, username=${matchesUsername}, usernameWithoutAt=${matchesUsernameWithoutAt}`);
      
      // Accept message if ANY condition matches
      const isMatch = matchesChatId || matchesUsername || matchesUsernameWithoutAt;
      
      // If target is a bot username, accept all private messages to the bot
      const isBotChat = chatId.toLowerCase().includes('bot') && msgChatType === 'private';
      
      if (!isMatch && !isBotChat) {
        console.log(`Skipping: no match found`);
        continue;
      }
      
      console.log(`Chat matched! Processing message ${message.message_id}`);

      // Get text/caption (allow empty for image-only posts)
      const text = message.text || message.caption || "";
      
      // Check if message has media (photos or documents)
      const hasMedia = message.photo?.length > 0 || message.document;
      
      // Skip if no text AND no media
      if (!text.trim() && !hasMedia) {
        console.log(`Skipping message ${message.message_id}: no text/caption and no media`);
        continue;
      }
      
      console.log(`Message has text: "${text.substring(0, 100)}..."`);

      // Check if already imported
      const { data: existing } = await supabase
        .from("telegram_posts")
        .select("id")
        .eq("message_id", message.message_id)
        .eq("chat_id", msgChatId)
        .maybeSingle();

      if (existing) continue;

      // Insert post
      const { data: post, error: postError } = await supabase
        .from("telegram_posts")
        .insert({
          user_id: user.id,
          source_id: source.id,
          chat_id: msgChatId,
          message_id: message.message_id,
          text: text,
          date: message.date ? new Date(message.date * 1000).toISOString() : null,
          raw_json: message,
        })
        .select()
        .single();

      if (postError) {
        console.error("Error inserting post:", postError);
        continue;
      }

      // Handle media
      const media = [];
      
      if (message.photo && message.photo.length > 0) {
        // Get largest photo
        const photo = message.photo[message.photo.length - 1];
        const remoteUrl = await getFileUrl(botToken, photo.file_id);
        media.push({
          post_id: post.id,
          file_id: photo.file_id,
          file_unique_id: photo.file_unique_id,
          media_type: "photo",
          remote_url: remoteUrl,
          sort_order: 0,
        });
      }

      // Handle media group (multiple photos)
      if (message.media_group_id) {
        // For media groups, we already got the photo above
        // Additional photos will come as separate updates
      }

      if (message.document) {
        const remoteUrl = await getFileUrl(botToken, message.document.file_id);
        media.push({
          post_id: post.id,
          file_id: message.document.file_id,
          file_unique_id: message.document.file_unique_id,
          media_type: message.document.mime_type?.startsWith("image/") ? "photo" : "document",
          remote_url: remoteUrl,
          sort_order: 0,
        });
      }

      if (media.length > 0) {
        const { error: mediaError } = await supabase
          .from("telegram_media")
          .insert(media);

        if (mediaError) {
          console.error("Error inserting media:", mediaError);
        }
      }

      importedCount++;
    }

    // Update last synced
    await supabase
      .from("telegram_sources")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", source.id);

    if (newestUpdateId > 0) {
      await telegramApi(botToken, "getUpdates", { offset: newestUpdateId + 1, limit: 1, timeout: 1 });
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "telegram_sync",
      title: "تم مزامنة Telegram",
      body: `تم استيراد ${importedCount} منشور جديد`,
      level: importedCount > 0 ? "success" : "info",
    });

    console.log(`Synced ${importedCount} posts for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, imported_count: importedCount, checked_updates: messages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("telegram-sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
