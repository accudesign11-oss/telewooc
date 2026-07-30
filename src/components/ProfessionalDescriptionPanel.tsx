import { useState } from "react";
import { Loader2, Sparkles, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { useStoreProfiles } from "@/hooks/useStoreProfiles";

export type DescriptionStyle = "simple" | "medium" | "fancy" | "ultra";

export interface ProfessionalDescriptionSettings {
  enabled: boolean;
  style: DescriptionStyle;
}

export const DEFAULT_PRO_SETTINGS: ProfessionalDescriptionSettings = {
  enabled: false,
  style: "medium",
};

const STYLE_LABELS: Record<DescriptionStyle, { title: string; hint: string }> = {
  simple: { title: "عادي", hint: "نص قصير، عنوان + فقرة + جدول مواصفات. بدون كروت زائدة." },
  medium: { title: "وسط", hint: "كروت خدمات + 3 أقسام + جدول. متوازن وأنيق." },
  fancy: { title: "مبهرج", hint: "القالب الكامل: 4-5 أقسام + كروت مميزات + جدول + كارت مساعدة." },
  ultra: { title: "مبهرج جدًا", hint: "أكثر تفصيلًا + شريط مميزات إضافي + أنيميشن دخول للعناصر داخل الصفحة." },
};

const PREVIEW_CSS = `
:root { --tlv-primary:#0F172A; --tlv-accent:#C89B3C; }
body { font-family: "Cairo", system-ui, sans-serif; color:#111; background:#fafafa; margin:0; padding:16px; }
.tlv-description { max-width: 920px; margin: 0 auto; }
.tlv-description h2.tlv-main-title { color: var(--tlv-primary); font-size: 22px; margin: 28px 0 12px; border-bottom: 2px solid var(--tlv-accent); padding-bottom: 6px; }
.tlv-description p { line-height: 1.9; color:#333; font-size: 15px; }
.tlv-service-cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:12px; margin: 12px 0 20px; }
.tlv-service-card { display:flex; gap:10px; align-items:center; background:#fff; border:1px solid #eee; border-radius:12px; padding:12px 14px; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
.tlv-service-emoji { font-size: 28px; }
.tlv-service-card h3 { margin:0 0 4px; font-size:15px; color:var(--tlv-primary); }
.tlv-service-card p { margin:0; font-size:12.5px; color:#555; }
.tlv-desc-img { width:100%; max-width:100%; height:auto; display:block; border-radius:12px; margin:14px 0; }
.tlv-feature-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin: 12px 0 20px; }
.tlv-feature-card { background:#fff; border:1px solid #eee; border-radius:12px; padding:14px; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
.tlv-feature-icon { font-size: 30px; margin-bottom: 6px; }
.tlv-feature-title { font-weight:700; color:var(--tlv-primary); margin-bottom: 4px; font-size:14.5px; }
.tlv-feature-text { font-size:13px; color:#555; margin:0; }
.tlv-description table { width:100%; border-collapse: collapse; margin: 8px 0 20px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
.tlv-description table th, .tlv-description table td { padding: 10px 12px; border-bottom:1px solid #f1f1f1; font-size:14px; text-align:right; }
.tlv-description table th { background:#fafafa; color:var(--tlv-primary); width: 35%; }
.tlv-live-help { background: linear-gradient(135deg,#fff8ec,#fff); border:1px solid #f1e2bd; border-radius:14px; padding:18px; margin-top:20px; text-align:center; }
.tlv-live-help h2 { margin:0 0 8px; color:var(--tlv-primary); font-size:18px; }
.tlv-live-help p { margin:0; color:#444; }
.tlv-marquee { background: var(--tlv-primary); color:#fff; padding:10px 14px; border-radius:10px; overflow:hidden; margin: 12px 0; }
.tlv-marquee span { display:inline-block; padding-right:100%; animation: tlv-scroll 18s linear infinite; }
@keyframes tlv-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
.tlv-fade-in { animation: tlv-fade .8s ease both; }
@keyframes tlv-fade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
`;

interface Props {
  value: ProfessionalDescriptionSettings;
  onChange: (v: ProfessionalDescriptionSettings) => void;
  productName: string;
  productType?: string;
  baseDescription: string;
  images?: string[];
  generatedHtml?: string;
  onGenerated?: (html: string) => void;
}

export function ProfessionalDescriptionPanel({
  value, onChange, productName, productType, baseDescription, images = [], generatedHtml, onGenerated,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [localHtml, setLocalHtml] = useState(generatedHtml || "");
  const [customInstructions, setCustomInstructions] = useState("");
  const { activeProfile } = useStoreProfiles();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!baseDescription?.trim()) {
      toast({ title: "أضف وصفاً أساسياً أولاً", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-description", {
        body: {
          description: baseDescription,
          productName,
          productType,
          images,
          style: value.style,
          customInstructions,
          company_name: activeProfile?.name || "المتجر",
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "فشل التوليد");
      setLocalHtml(data.html);
      setShowPreview(true);
      onGenerated?.(data.html);
      toast({ title: "تم توليد الوصف الاحترافي", description: `${data.provider} / ${data.model}` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="pro-desc-enable"
            checked={value.enabled}
            onCheckedChange={(c) => onChange({ ...value, enabled: !!c })}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="pro-desc-enable" className="font-semibold cursor-pointer flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              إنشاء وصف احترافي (قالب هوني مون)
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              يولّد HTML نظيف فقط بكلاسات <code>tlv-*</code> (بدون CSS/JS داخل الوصف).
            </p>
          </div>
        </div>

        {value.enabled && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <Label className="mb-2 block text-sm font-medium">طريقة التوليد</Label>
              <RadioGroup
                value={value.style}
                onValueChange={(v) => onChange({ ...value, style: v as DescriptionStyle })}
                className="grid grid-cols-2 gap-2"
              >
                {(Object.keys(STYLE_LABELS) as DescriptionStyle[]).map((k) => (
                  <label
                    key={k}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/40 ${
                      value.style === k ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={k} id={`st-${k}`} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{STYLE_LABELS[k].title}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug">{STYLE_LABELS[k].hint}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تعليمات مخصصة للتوليد (Custom Prompt Instructions):</Label>
              <textarea
                placeholder="أدخل أي تعليمات إضافية ترغب في اتباعها للذكاء الاصطناعي أثناء توليد هذا الوصف..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full p-2.5 text-xs rounded-md border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
                {isGenerating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Sparkles className="h-4 w-4 ml-2" />}
                توليد / إعادة توليد
              </Button>
              {localHtml && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview((s) => !s)}>
                  <Eye className="h-4 w-4 ml-2" />
                  {showPreview ? "إخفاء المعاينة" : "معاينة"}
                </Button>
              )}
            </div>

            {showPreview && localHtml && (
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  title="معاينة الوصف"
                  srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${PREVIEW_CSS}</style></head><body>${localHtml}</body></html>`}
                  className="w-full h-[600px] border-0"
                  sandbox=""
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
