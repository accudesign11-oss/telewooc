import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { anyToWebpBase64, COMPRESSION_QUALITY, type CompressionLevel } from "@/lib/webp";

const isImgbbUrl = (url: string): boolean =>
  url.includes("imgbb.com") || url.includes("ibb.co") || url.includes("i.ibb.co");

const isDataUrl = (url: string): boolean => url.startsWith("data:");

// Read default compression preference; fallback to medium.
function getCompressionLevel(): CompressionLevel {
  try {
    const v = localStorage.getItem("teleevo_webp_compression") as CompressionLevel | null;
    if (v === "high" || v === "medium" || v === "low") return v;
  } catch (_) {}
  return "medium";
}

export function useImageConverter() {
  const { imgbb } = useSettings();
  const { toast } = useToast();

  // Convert URL/data-url to WebP first, then upload to imgbb.
  const convertToImgbb = async (imageUrl: string): Promise<string | null> => {
    if (isImgbbUrl(imageUrl)) return imageUrl;

    const effectiveKey = imgbb.api_key || "6d0534552048f3c469b61596700c0a96";

    try {
      const quality = COMPRESSION_QUALITY[getCompressionLevel()];
      let imageData: string;

      try {
        // Always convert to WebP before upload
        const { base64 } = await anyToWebpBase64(imageUrl, quality);
        imageData = base64;
      } catch (webpErr) {
        // Fallback: send original bytes
        console.warn("WebP conversion failed, sending original:", webpErr);
        if (isDataUrl(imageUrl)) {
          imageData = imageUrl.split(",")[1] || imageUrl;
        } else {
          const response = await fetch(imageUrl);
          if (!response.ok) return imageUrl;
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
          }
          imageData = btoa(binary);
        }
      }

      const { data, error } = await supabase.functions.invoke("imgbb-upload", {
        body: { image: imageData, apiKey: effectiveKey },
      });

      if (error || !data?.success) {
        console.error("imgbb upload failed:", error || data?.error);
        return imageUrl;
      }
      return data.url;
    } catch (error) {
      console.error("Image conversion error:", error);
      return imageUrl;
    }
  };

  const convertMultipleToImgbb = async (
    imageUrls: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> => {
    const results: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      onProgress?.(i + 1, imageUrls.length);
      const converted = await convertToImgbb(imageUrls[i]);
      results.push(converted || imageUrls[i]);
    }
    return results;
  };

  const convertProductImages = async (
    productId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<boolean> => {
    try {
      const { data: images, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("draft_product_id", productId);
      if (error || !images) return false;

      // Dedup by URL — remove duplicates from DB, keep one
      const seen = new Map<string, string>(); // url -> id (keep)
      const toDelete: string[] = [];
      for (const img of images) {
        if (seen.has(img.url)) toDelete.push(img.id);
        else seen.set(img.url, img.id);
      }
      if (toDelete.length > 0) {
        await supabase.from("product_images").delete().in("id", toDelete);
      }

      const unique = images.filter((img) => !toDelete.includes(img.id));
      const nonImgbb = unique.filter((img) => !isImgbbUrl(img.url));
      if (nonImgbb.length === 0) return true;

      for (let i = 0; i < nonImgbb.length; i++) {
        const img = nonImgbb[i];
        onProgress?.(i + 1, nonImgbb.length);
        const newUrl = await convertToImgbb(img.url);
        if (newUrl && newUrl !== img.url) {
          await supabase
            .from("product_images")
            .update({ url: newUrl, source: "imgbb" })
            .eq("id", img.id);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to convert product images:", error);
      return false;
    }
  };

  const convertVariationImages = async (
    productId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<boolean> => {
    try {
      const { data: variations, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("draft_product_id", productId);
      if (error || !variations) return false;

      const nonImgbb = variations.filter((v) => v.image_url && !isImgbbUrl(v.image_url));
      if (nonImgbb.length === 0) return true;

      for (let i = 0; i < nonImgbb.length; i++) {
        const v = nonImgbb[i];
        onProgress?.(i + 1, nonImgbb.length);
        const newUrl = await convertToImgbb(v.image_url!);
        if (newUrl && newUrl !== v.image_url) {
          await supabase.from("product_variations").update({ image_url: newUrl }).eq("id", v.id);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to convert variation images:", error);
      return false;
    }
  };

  return {
    convertToImgbb,
    convertMultipleToImgbb,
    convertProductImages,
    convertVariationImages,
    isImgbbUrl,
  };
}
