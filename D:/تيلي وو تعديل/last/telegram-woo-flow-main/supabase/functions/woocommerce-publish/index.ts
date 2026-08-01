import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const VALID_PUBLISH_STATUSES = ["draft", "publish", "pending", "private"];
const MAX_ID_LENGTH = 100;

// Check if URL is already from imgbb
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

// Convert image to imgbb if needed
async function convertToImgbb(imageUrl: string, apiKey: string): Promise<string> {
  if (!imageUrl) return imageUrl;

  // If already a valid public HTTP/HTTPS URL (ImgBB, Weserv, Supabase Storage, WP Media, etc.),
  // WooCommerce REST API can fetch and download it directly for the product card!
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  try {
    console.log(`Converting data/local image to public ImgBB URL for WooCommerce...`);
    
    let imageData: string;
    
    if (imageUrl.startsWith("data:")) {
      imageData = imageUrl.split(",")[1] || imageUrl;
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error("Failed to fetch image:", imageUrl);
        return imageUrl;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageData = arrayBufferToBase64(arrayBuffer);
    }

    // Upload to imgbb
    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", imageData);

    const imgbbResponse = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const result = await imgbbResponse.json();

    if (result.success && result.data?.url) {
      console.log(`Converted to imgbb: ${result.data.url}`);
      return result.data.url;
    } else {
      console.error("imgbb upload failed:", result);
      return imageUrl;
    }
  } catch (error) {
    console.error("Image conversion error:", error);
    return imageUrl;
  }
}

// Input validation helper
function validatePublishInputs(body: any): { valid: boolean; error?: string } {
  const { draft_product_id, publish_status } = body;
  
  // Validate draft_product_id
  if (!draft_product_id || typeof draft_product_id !== "string") {
    return { valid: false, error: "draft_product_id is required and must be a string" };
  }
  if (draft_product_id.length > MAX_ID_LENGTH) {
    return { valid: false, error: "draft_product_id is too long" };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(draft_product_id)) {
    return { valid: false, error: "draft_product_id must be a valid UUID" };
  }
  
  // Validate publish_status if provided
  if (publish_status !== undefined && publish_status !== null) {
    if (typeof publish_status !== "string") {
      return { valid: false, error: "publish_status must be a string" };
    }
    if (!VALID_PUBLISH_STATUSES.includes(publish_status)) {
      return { valid: false, error: `publish_status must be one of: ${VALID_PUBLISH_STATUSES.join(", ")}` };
    }
  }
  
  return { valid: true };
}

// Sanitize product data for WooCommerce API
function sanitizeProductData(draft: any): any {
  const sanitizeString = (str: string | null | undefined, maxLength: number): string => {
    if (!str || typeof str !== "string") return "";
    return str.trim().substring(0, maxLength);
  };

  const cleanDescription = (str: string | null | undefined): string => {
    if (!str || typeof str !== "string") return "";
    let s = str.trim();

    // 1. Strip all <style> and <script> tags from old or new drafts
    s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
    s = s.replace(/<script[\s\S]*?<\/script>/gi, "");

    // 2. Strip any raw CSS rule blocks like .tlv-description { ... } or .tlv-* { ... }
    s = s.replace(/\.tlv-[^{]+\{[^}]*\}/gi, "");
    s = s.replace(/@media[^{]+\{(?:[^{}]*|\{[^}]*\})*\}/gi, "");

    // 3. Strip any preamble text before the first HTML tag if it contains CSS/code/text
    const firstTagIndex = s.search(/<[a-z1-6]/i);
    if (firstTagIndex > 0) {
      const preamble = s.substring(0, firstTagIndex);
      if (preamble.includes("{") || preamble.includes("tlv-") || preamble.includes("`") || /وصف|كود|html|المنتج|المثال|مخرج/i.test(preamble)) {
        s = s.substring(firstTagIndex);
      }
    }

    // 4. Strip markdown code fences and backticks anywhere in string
    s = s.replace(/```[a-z]*\n?/gi, "");
    s = s.replace(/```/g, "");

    // 5. Inject clean inline styles into tags if missing so WooCommerce renders them natively on store
    s = s.replace(/<h2(?![^>]*style=)/gi, '<h2 style="font-size:16px; font-weight:800; color:#0f172a; margin:18px 0 8px 0; border-right:4px solid #3b82f6; padding-right:8px; direction:rtl; text-align:right;"');
    s = s.replace(/<h3(?![^>]*style=)/gi, '<h3 style="font-size:14px; font-weight:700; color:#1e293b; margin:12px 0 6px 0; direction:rtl; text-align:right;"');
    s = s.replace(/<p(?![^>]*style=)/gi, '<p style="font-size:13px; line-height:1.7; color:#334155; margin-bottom:12px; direction:rtl; text-align:right;"');
    s = s.replace(/<table(?![^>]*style=)/gi, '<table style="width:100%; border-collapse:collapse; margin:14px 0; font-size:12px; direction:rtl; text-align:right;"');
    s = s.replace(/<th(?![^>]*style=)/gi, '<th style="background-color:#f1f5f9; border:1px solid #cbd5e1; padding:8px 10px; font-weight:700; color:#0f172a;"');
    s = s.replace(/<td(?![^>]*style=)/gi, '<td style="border:1px solid #e2e8f0; padding:8px 10px; color:#334155;"');

    return s.trim();
  };

  return {
    name: sanitizeString(draft.name, 200) || "منتج بدون اسم",
    long_description: cleanDescription(draft.long_description).substring(0, 15000),
    short_description: cleanDescription(draft.short_description).substring(0, 3000),
    sku: sanitizeString(draft.sku, 100),
    price: draft.price,
    sale_price: draft.sale_price,
  };
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

    const body = await req.json();
    
    // Validate inputs
    const validation = validatePublishInputs(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { draft_product_id, publish_status } = body;

    // Get draft product
    let { data: draft } = await supabase
      .from("draft_products")
      .select("*, product_images(*), product_attributes(*), product_variations(*)")
      .eq("id", draft_product_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!draft) {
      // Fallback lookup by ID to ensure product & images are retrieved
      const { data: fallbackDraft } = await supabase
        .from("draft_products")
        .select("*, product_images(*), product_attributes(*), product_variations(*)")
        .eq("id", draft_product_id)
        .maybeSingle();
      draft = fallbackDraft;
    }

    if (!draft) {
      return new Response(JSON.stringify({ error: "Draft product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Sanitize product data
    const sanitized = sanitizeProductData(draft);

    // Get WooCommerce settings
    const { data: wcSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "woocommerce")
      .single();

    if (!wcSettings?.value) {
      return new Response(JSON.stringify({ error: "WooCommerce settings not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wc = wcSettings.value as { store_url: string; consumer_key: string; consumer_secret: string };

    // Get imgbb API key and settings from settings (or use system fallback key)
    const { data: imgbbSettings } = await supabase
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "imgbb")
      .single();

    const userImgbbKey = (imgbbSettings?.value as any)?.api_key || null;
    const effectiveImgbbKey = userImgbbKey || Deno.env.get("IMGBB_API_KEY") || "6d0534552048f3c469b61596700c0a96";

    // Update draft status
    await supabase
      .from("draft_products")
      .update({ status: "publishing" })
      .eq("id", draft_product_id);

    // Convert product images to public ImgBB URLs (WooCommerce REQUIRES public http/https URLs)
    let productImages = draft.product_images || [];

    // Fallback 1: Direct table query if relation select returned empty
    if (!productImages || productImages.length === 0) {
      console.log(`Directly querying product_images table for draft_product_id: ${draft_product_id}...`);
      const { data: directImages } = await supabase
        .from("product_images")
        .select("*")
        .eq("draft_product_id", draft_product_id)
        .order("sort_order", { ascending: true });

      if (directImages && directImages.length > 0) {
        productImages = directImages;
      }
    }

    // Fallback 2: Extract img src URLs from long_description HTML if product_images table was empty
    if ((!productImages || productImages.length === 0) && draft.long_description) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      let match;
      const extractedUrls: string[] = [];
      while ((match = imgRegex.exec(draft.long_description)) !== null) {
        if (match[1] && !extractedUrls.includes(match[1])) {
          extractedUrls.push(match[1]);
        }
      }
      if (extractedUrls.length > 0) {
        console.log(`Extracted ${extractedUrls.length} image URLs from long_description HTML fallback`);
        productImages = extractedUrls.map((url, i) => ({
          url,
          is_featured: i === 0,
          sort_order: i,
        }));
      }
    }

    console.log(`Processing ${productImages.length} images for WooCommerce publishing...`);
    const convertedImages = [];
    for (const img of productImages) {
      if (img.url) {
        let finalUrl = img.url;
        // Convert to public ImgBB URL if it's a base64 data URI
        if (img.url.startsWith("data:")) {
          console.log("Converting base64 data URL to public ImgBB URL for WooCommerce...");
          finalUrl = await convertToImgbb(img.url, effectiveImgbbKey);
        }
        convertedImages.push({ ...img, url: finalUrl });
        
        // Update image URL in database if converted
        if (finalUrl !== img.url && img.id) {
          try {
            await supabase
              .from("product_images")
              .update({ url: finalUrl, source: "imgbb" })
              .eq("id", img.id);
          } catch (e) {
            console.warn("Could not update converted image URL in DB:", e);
          }
        }
      }
    }
    productImages = convertedImages;

    // Convert variation images if needed
    let productVariations = draft.product_variations || [];
    if (productVariations.length > 0) {
      const convertedVariations = [];
      for (const variation of productVariations) {
        if (variation.image_url && variation.image_url.startsWith("data:")) {
          const convertedUrl = await convertToImgbb(variation.image_url, effectiveImgbbKey);
          convertedVariations.push({ ...variation, image_url: convertedUrl });
          
          if (convertedUrl !== variation.image_url) {
            await supabase
              .from("product_variations")
              .update({ image_url: convertedUrl })
              .eq("id", variation.id);
          }
        } else {
          convertedVariations.push(variation);
        }
      }
      productVariations = convertedVariations;
    }

    // Build WooCommerce product payload with converted images
    const images = productImages
      .filter((img: any) => img.url)
      .map((img: any, index: number) => ({
        src: img.url,
        alt: img.alt_text || draft.name || "",
        position: index,
      }));

    const attributes = (draft.product_attributes || []).map((attr: any) => ({
      name: attr.name,
      options: Array.isArray(attr.values) ? attr.values : [],
      visible: true,
      variation: attr.is_variation || false,
    }));

    const isVariable = draft.product_type === "variable";
    
    // Check if we have actual variations or variation attributes
    const hasVariations = (productVariations && productVariations.length > 0);
    const hasVariationAttributes = attributes.some((attr: any) => attr.variation && attr.options?.length > 0);
    
    // If marked as variable but no variations or variation attributes, convert to simple
    const finalProductType = isVariable && !hasVariations && !hasVariationAttributes ? "simple" : (draft.product_type || "simple");
    
    console.log(`Product type: ${draft.product_type} -> ${finalProductType}, hasVariations: ${hasVariations}, hasVariationAttributes: ${hasVariationAttributes}`);

    const productData: any = {
      name: sanitized.name,
      type: finalProductType,
      status: publish_status || "publish",
      description: sanitized.long_description,
      short_description: sanitized.short_description,
      sku: sanitized.sku,
      images,
      attributes,
      // Stock settings - ALWAYS in stock and available
      stock_status: "instock",
      manage_stock: false,
      in_stock: true,
      backorders: "yes",
      backorders_allowed: true,
      purchasable: true,
      catalog_visibility: "visible",
    };

    if (draft.slug && typeof draft.slug === "string" && draft.slug.trim()) {
      productData.slug = draft.slug.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 100);
    }

    // Set price for simple products OR variable products converted to simple
    if (finalProductType === "simple") {
      productData.regular_price = draft.price?.toString() || "";
      productData.sale_price = draft.sale_price?.toString() || "";
    }

    if (draft.categories && Array.isArray(draft.categories)) {
      productData.categories = draft.categories.map((cat: any) => 
        typeof cat === "object" ? cat : { id: cat }
      );
    }

    if (draft.tags && Array.isArray(draft.tags)) {
      productData.tags = draft.tags.map((tag: any) => 
        typeof tag === "object" ? tag : { name: tag }
      );
    }

    // Create product in WooCommerce
    let rawUrl = (wc.store_url || "").trim().replace(/\/+$/, "");
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = "https://" + rawUrl;
    }
    const storeUrl = rawUrl;
    const auth = btoa(`${wc.consumer_key}:${wc.consumer_secret}`);
    const ck = encodeURIComponent(wc.consumer_key);
    const cs = encodeURIComponent(wc.consumer_secret);

    // Build candidate endpoints
    const candidates = [
      { url: `${storeUrl}/wp-json/wc/v3/products`, headers: { Authorization: `Basic ${auth}` } },
      { url: `${storeUrl}/index.php?rest_route=/wc/v3/products`, headers: { Authorization: `Basic ${auth}` } },
      { url: `${storeUrl}/wp-json/wc/v3/products?consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
      { url: `${storeUrl}/index.php?rest_route=/wc/v3/products&consumer_key=${ck}&consumer_secret=${cs}`, headers: {} },
    ];

    console.log(`Calling WooCommerce API: ${storeUrl}`);

    // Helper: fetch with candidate fallback + timeout + retry
    const fetchWithCandidates = async (bodyData: any): Promise<Response> => {
      let lastErr: unknown;
      let lastRes: Response | null = null;

      for (const cand of candidates) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60_000); // 60s per attempt
        try {
          console.log(`Trying WooCommerce candidate: ${cand.url}`);
          const res = await fetch(cand.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...cand.headers,
            },
            body: JSON.stringify(bodyData),
            signal: controller.signal,
          });
          clearTimeout(timer);

          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json") || res.ok) {
            return res;
          }
          lastRes = res;
        } catch (e) {
          clearTimeout(timer);
          lastErr = e;
        }
      }

      if (lastRes) return lastRes;
      throw lastErr ?? new Error("fetch failed");
    };

    let wcResponse: Response;
    try {
      wcResponse = await fetchWithCandidates(productData);
    } catch (fetchError) {
      console.error("Network error calling WooCommerce:", fetchError);
      
      const errorMsg = `فشل الاتصال بالمتجر: ${fetchError instanceof Error ? fetchError.message : "خطأ في الشبكة"}`;
      
      await supabase
        .from("draft_products")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", draft_product_id);

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if response is JSON
    const contentType = wcResponse.headers.get("content-type") || "";
    const responseText = await wcResponse.text();
    
    let wcResult: any;
    
    if (contentType.includes("application/json")) {
      try {
        wcResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse WooCommerce response:", responseText.substring(0, 500));
        
        const errorMsg = "رد غير صالح من المتجر - تحقق من رابط المتجر وبيانات API";
        
        await supabase
          .from("draft_products")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", draft_product_id);

        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Response is not JSON (likely HTML error page)
      console.error(`WooCommerce returned non-JSON (status ${wcResponse.status}):`, responseText.substring(0, 500));
      
      let errorMsg = "رد غير صالح من المتجر";
      const status = wcResponse.status;
      
      if (status === 504 || status === 522 || status === 524 || responseText.includes("Gateway Timeout") || responseText.includes("timeout")) {
        errorMsg = "انتهت مهلة الاستجابة من المتجر (Gateway Timeout). الخادم بطيء أو الصور كبيرة جدًا. حاول تقليل عدد/حجم الصور أو إعادة المحاولة بعد قليل.";
      } else if (status === 502 || status === 503) {
        errorMsg = "المتجر غير متاح مؤقتًا (Bad Gateway). أعد المحاولة بعد قليل.";
      } else if (status === 413) {
        errorMsg = "حجم البيانات أكبر من المسموح به على الخادم. قلّل عدد/حجم الصور.";
      } else if (responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
        if (responseText.includes("404") || responseText.includes("Not Found")) {
          errorMsg = "API غير متاحة - تأكد من تفعيل WooCommerce REST API وتفعيل الـ Permalinks (غير افتراضية)";
        } else if (responseText.includes("401") || responseText.includes("Unauthorized")) {
          errorMsg = "بيانات API غير صحيحة - تحقق من Consumer Key و Secret";
        } else if (responseText.includes("403") || responseText.includes("Forbidden")) {
          errorMsg = "صلاحيات API غير كافية - تأكد من أن مفاتيح API لديها صلاحية الكتابة";
        } else {
          errorMsg = `استجابة غير متوقعة من المتجر (HTTP ${status}). تحقق من رابط المتجر وحالة الخادم.`;
        }
      } else {
        errorMsg = `استجابة غير متوقعة من المتجر (HTTP ${status}).`;
      }
      
      await supabase
        .from("draft_products")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", draft_product_id);

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "wc_publish",
        title: "فشل النشر",
        body: errorMsg,
        level: "error",
        related_type: "draft_product",
        related_id: draft_product_id,
      });

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!wcResponse.ok) {
      console.error("WooCommerce error:", wcResult);
      
      const errorMsg = wcResult.message || wcResult.error || "خطأ من WooCommerce";
      
      await supabase
        .from("draft_products")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", draft_product_id);

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "wc_publish",
        title: "فشل النشر",
        body: errorMsg,
        level: "error",
        related_type: "draft_product",
        related_id: draft_product_id,
      });

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create variations if variable product with converted image URLs
    if (finalProductType === "variable") {
      let variationsToCreate = productVariations;
      
      // If no variations exist but we have attributes marked as variation, generate them
      if (variationsToCreate.length === 0) {
        const variationAttributes = attributes.filter((attr: any) => attr.variation);
        
        if (variationAttributes.length > 0) {
          // Generate all combinations
          const generateCombinations = (attrs: any[], index = 0, current: Record<string, string> = {}): Record<string, string>[] => {
            if (index >= attrs.length) {
              return [{ ...current }];
            }
            
            const attr = attrs[index];
            const results: Record<string, string>[] = [];
            
            for (const option of attr.options) {
              results.push(...generateCombinations(attrs, index + 1, { ...current, [attr.name]: option }));
            }
            
            return results;
          };
          
          const combinations = generateCombinations(variationAttributes);
          variationsToCreate = combinations.map((attrs) => ({
            attributes: attrs,
            price: draft.price,
            sale_price: draft.sale_price,
            stock_quantity: null,
            image_url: null,
          }));
          
          console.log(`Auto-generated ${variationsToCreate.length} variations from attributes`);
        }
      }
      
      // Create variations in WooCommerce with imgbb URLs
      for (const variation of variationsToCreate) {
        const varData: any = {
          regular_price: variation.price?.toString() || draft.price?.toString() || "",
          sale_price: variation.sale_price?.toString() || "",
          sku: variation.sku || "",
          stock_status: "instock",
          manage_stock: false,
          attributes: Object.entries(variation.attributes || {}).map(([name, option]) => ({
            name,
            option,
          })),
        };

        if (variation.stock_quantity !== null && variation.stock_quantity !== undefined) {
          varData.manage_stock = true;
          varData.stock_quantity = variation.stock_quantity;
        }

        // Use already-converted imgbb URL for variation image
        if (variation.image_url) {
          varData.image = { src: variation.image_url };
        }

        const varResponse = await fetch(`${wc.store_url}/wp-json/wc/v3/products/${wcResult.id}/variations`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(varData),
        });
        
        if (!varResponse.ok) {
          const varError = await varResponse.text();
          console.error("Variation creation error:", varError);
        }
      }
    }

    // Save WC mapping
    await supabase.from("wc_mappings").insert({
      draft_product_id: draft_product_id,
      wc_product_id: wcResult.id,
      wc_permalink: wcResult.permalink,
    });

    // Update draft status
    await supabase
      .from("draft_products")
      .update({ status: "published" })
      .eq("id", draft_product_id);

    // Create success notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "wc_publish",
      title: "تم النشر بنجاح",
      body: `تم نشر "${draft.name}" على المتجر`,
      level: "success",
      related_type: "draft_product",
      related_id: draft_product_id,
      link_url: wcResult.permalink,
    });

    console.log(`Published product ${wcResult.id} for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        wc_product_id: wcResult.id,
        permalink: wcResult.permalink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("woocommerce-publish error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
