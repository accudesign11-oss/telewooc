import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOOLS = [
  { id: "chatgpt", label: "ChatGPT Images", url: "https://chat.openai.com" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com" },
  { id: "claude", label: "Claude", url: "https://claude.ai" },
  { id: "copilot", label: "Microsoft Copilot", url: "https://copilot.microsoft.com" },
  { id: "midjourney", label: "Midjourney", url: "https://www.midjourney.com" },
  { id: "leonardo", label: "Leonardo AI", url: "https://leonardo.ai" },
  { id: "ideogram", label: "Ideogram", url: "https://ideogram.ai" },
  { id: "firefly", label: "Adobe Firefly", url: "https://firefly.adobe.com" },
  { id: "canva", label: "Canva", url: "https://www.canva.com" },
  { id: "flow", label: "Google Flow", url: "https://labs.google/flow" },
  { id: "runway", label: "Runway", url: "https://runwayml.com" },
  { id: "kling", label: "Kling", url: "https://kling.kuaishou.com" },
  { id: "zai", label: "Z.ai", url: "https://z.ai" },
];

const TYPES = [
  "صورة إعلان منتج", "صورة Hero", "صورة عرض خصم", "صورة Carousel", "صورة Story",
  "صورة Reel Cover", "فيديو 10 ثواني", "فيديو Google Flow", "فيديو شرح منتج",
  "صورة عليها كتابة", "صورة بدون كتابة", "صورة براندنج عامة",
];

interface Props { seed?: any }

export function SocialMediaPromptGenerator({ seed }: Props) {
  const [tool, setTool] = useState("chatgpt");
  const [type, setType] = useState(TYPES[0]);
  const [productDesc, setProductDesc] = useState(seed?.product?.name || "");
  const [details, setDetails] = useState(seed?.product?.short_description || "");
  const [size, setSize] = useState("1080x1080");
  const [textOnImage, setTextOnImage] = useState("");
  const [brandColors, setBrandColors] = useState("");
  const [logoPosition, setLogoPosition] = useState("أسفل اليمين");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-generate-media-prompt", {
        body: {
          tool, type, product_desc: productDesc, details, size,
          text_on_image: textOnImage, brand_colors: brandColors, logo_position: logoPosition,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data.prompt || "");
      toast.success("تم توليد البرومبت");
    } catch (e: any) {
      toast.error(e.message || "فشل");
    } finally {
      setLoading(false);
    }
  };

  const externalUrl = TOOLS.find(t => t.id === tool)?.url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">مولد برومبتات الوسائط الخارجية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>الأداة</Label>
            <Select value={tool} onValueChange={setTool}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TOOLS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>نوع البرومبت</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>المقاس</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="1080x1080" />
          </div>
        </div>
        <div><Label>وصف المنتج</Label>
          <Input value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
        </div>
        <div><Label>تفاصيل إضافية</Label>
          <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>النص داخل الصورة (اختياري)</Label>
            <Input value={textOnImage} onChange={(e) => setTextOnImage(e.target.value)} />
          </div>
          <div><Label>ألوان البراند</Label>
            <Input value={brandColors} onChange={(e) => setBrandColors(e.target.value)} placeholder="#000000, #C9A961" />
          </div>
          <div><Label>مكان اللوجو</Label>
            <Input value={logoPosition} onChange={(e) => setLogoPosition(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Sparkles className="h-4 w-4 ml-1" />}
            توليد البرومبت
          </Button>
          {externalUrl && (
            <Button variant="outline" asChild>
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 ml-1" /> فتح الأداة
              </a>
            </Button>
          )}
        </div>
        {output && (
          <div className="space-y-2">
            <Label>البرومبت الناتج</Label>
            <Textarea rows={12} value={output} onChange={(e) => setOutput(e.target.value)} dir="ltr" className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(output); toast.success("تم النسخ"); }}>
              <Copy className="h-4 w-4 ml-1" /> نسخ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
