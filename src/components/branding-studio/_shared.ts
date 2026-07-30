import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function copyText(text: string, label = "تم النسخ") {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  } catch {
    toast({ title: "فشل النسخ", variant: "destructive" });
  }
}

export async function saveAsset(payload: {
  client_id?: string | null;
  brand_kit_id?: string | null;
  asset_type: string;
  platform?: string | null;
  size_width?: number | null;
  size_height?: number | null;
  title?: string | null;
  prompt?: string | null;
  negative_prompt?: string | null;
  provider?: string | null;
  image_url?: string | null;
  editable_json?: any;
  metadata_json?: any;
  status?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
    return null;
  }
  const { data, error } = await supabase
    .from("branding_assets")
    .insert({
      user_id: u.user.id,
      status: "generated",
      ...payload,
    })
    .select()
    .single();
  if (error) {
    toast({ title: "فشل حفظ الأصل", description: error.message, variant: "destructive" });
    return null;
  }
  toast({ title: "تم حفظ الأصل في المكتبة" });
  return data;
}

export const EXTERNAL_TOOLS = [
  { name: "ChatGPT Images", url: "https://chatgpt.com/" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "Claude", url: "https://claude.ai/" },
  { name: "Copilot", url: "https://copilot.microsoft.com/" },
  { name: "Midjourney", url: "https://www.midjourney.com/" },
  { name: "Leonardo AI", url: "https://leonardo.ai/" },
  { name: "Ideogram", url: "https://ideogram.ai/" },
  { name: "Adobe Firefly", url: "https://firefly.adobe.com/" },
  { name: "Canva", url: "https://www.canva.com/" },
  { name: "Google Flow", url: "https://labs.google/flow" },
  { name: "Runway", url: "https://runwayml.com/" },
  { name: "Kling", url: "https://klingai.com/" },
];
