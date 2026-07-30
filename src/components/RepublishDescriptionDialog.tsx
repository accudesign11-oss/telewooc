import { useState, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ProfessionalDescriptionPanel,
  DEFAULT_PRO_SETTINGS,
  ProfessionalDescriptionSettings,
} from "@/components/ProfessionalDescriptionPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  baseDescription: string;
  images?: string[];
  productType?: string;
  wcProductId?: number;
  draftProductId?: string;
  onPublished?: () => void;
}

export function RepublishDescriptionDialog({
  open, onOpenChange, productName, baseDescription, images = [], productType, wcProductId, draftProductId, onPublished,
}: Props) {
  const [settings, setSettings] = useState<ProfessionalDescriptionSettings>({ ...DEFAULT_PRO_SETTINGS, enabled: true });
  const [html, setHtml] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setHtml("");
      setSettings({ ...DEFAULT_PRO_SETTINGS, enabled: true });
    }
  }, [open]);

  const handlePublish = async () => {
    if (!html) {
      toast({ title: "ولّد الوصف الاحترافي أولاً", variant: "destructive" });
      return;
    }
    setIsPublishing(true);
    try {
      if (wcProductId) {
        const { data, error } = await supabase.functions.invoke("woocommerce-products", {
          body: {
            action: "update",
            product_id: wcProductId,
            product_data: { description: html },
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "تم تحديث وصف المنتج في المتجر" });
      } else if (draftProductId) {
        const { error } = await supabase
          .from("draft_products")
          .update({ long_description: html })
          .eq("id", draftProductId);
        if (error) throw error;
        toast({ title: "تم تحديث الوصف في المسودة" });
      }
      onPublished?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "خطأ في النشر", description: e.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            تحسين وإعادة نشر الوصف — {productName}
          </DialogTitle>
          <DialogDescription>
            وصف HTML بقالب هوني مون الموحّد، يستخدم صور المنتج تلقائياً. لا CSS ولا JS داخل الوصف.
          </DialogDescription>
        </DialogHeader>

        <ProfessionalDescriptionPanel
          value={settings}
          onChange={setSettings}
          productName={productName}
          productType={productType}
          baseDescription={baseDescription}
          images={images}
          generatedHtml={html}
          onGenerated={setHtml}
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handlePublish} disabled={!html || isPublishing}>
            {isPublishing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
            {wcProductId ? "إعادة نشر إلى المتجر" : "حفظ في المسودة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
