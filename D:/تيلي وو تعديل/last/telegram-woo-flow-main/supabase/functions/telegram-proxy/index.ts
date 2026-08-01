import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate it's a Telegram URL
    if (!url.includes('api.telegram.org') && !url.includes('t.me')) {
      return new Response(
        JSON.stringify({ error: 'رابط غير صالح - فقط روابط Telegram مسموحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching image from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TeleWoo/1.0)',
      },
    });

    if (!response.ok) {
      console.error('Telegram fetch failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'فشل في جلب الصورة من Telegram',
          status: response.status,
          statusText: response.statusText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Detect MIME type from magic bytes (more reliable than Content-Type header)
    let mimeType = 'image/jpeg'; // default
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      mimeType = 'image/png';
    } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
      mimeType = 'image/jpeg';
    } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
      mimeType = 'image/gif';
    } else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
      mimeType = 'image/webp';
    }
    
    // Convert to base64
    const base64 = btoa(
      uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Successfully fetched image, size:', arrayBuffer.byteLength, 'bytes, mimeType:', mimeType);

    return new Response(
      JSON.stringify({ 
        success: true, 
        base64: dataUrl,
        mimeType,
        size: arrayBuffer.byteLength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'خطأ في proxy الصور',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
