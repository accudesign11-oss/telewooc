import { useState } from "react";
import { Image as ImageIcon, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/useSettings";
import { useNavigate } from "react-router-dom";

export function ImageConversionBanner() {
  const { imgbb, saveImgbb } = useSettings();
  const [showDialog, setShowDialog] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    require_conversion: imgbb.require_conversion,
    convert_to_webp: imgbb.convert_to_webp,
  });
  const navigate = useNavigate();

  // Show banner only if no API key configured or require_conversion is true but no key
  const needsConfiguration = imgbb.require_conversion && !imgbb.api_key;
  const showBanner = needsConfiguration || !imgbb.api_key;

  const handleSaveSettings = async () => {
    await saveImgbb({
      ...imgbb,
      require_conversion: localSettings.require_conversion,
      convert_to_webp: localSettings.convert_to_webp,
    });
    setShowDialog(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <Alert className="border-warning/30 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-warning">
            {needsConfiguration 
              ? "تحويل الصور مُفعّل لكن imgbb API Key غير مُهيأ"
              : "imgbb API Key غير مُهيأ - سيتم تحليل الصور بدون رفعها"
            }
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDialog(true)}
            >
              <Settings className="h-4 w-4 ml-1" />
              خيارات التحويل
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate("/settings")}
            >
              إعداد imgbb
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              خيارات تحويل الصور
            </DialogTitle>
            <DialogDescription>
              اختر كيفية التعامل مع الصور في هذه الجلسة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">تحويل الصور إلزامي</Label>
                <p className="text-xs text-muted-foreground">
                  {localSettings.require_conversion 
                    ? "سيتم رفع الصور إلى imgbb للحصول على روابط دائمة"
                    : "سيتم استخدام روابط الصور الأصلية مباشرة"
                  }
                </p>
              </div>
              <Switch 
                checked={localSettings.require_conversion}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ 
                  ...prev, 
                  require_conversion: checked 
                }))}
              />
            </div>

            {localSettings.require_conversion && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">تحويل إلى WebP</Label>
                  <p className="text-xs text-muted-foreground">
                    {localSettings.convert_to_webp 
                      ? "سيتم تحويل الصور إلى WebP (حجم أصغر)"
                      : "سيتم رفع الصور بصيغتها الأصلية"
                    }
                  </p>
                </div>
                <Switch 
                  checked={localSettings.convert_to_webp}
                  onCheckedChange={(checked) => setLocalSettings(prev => ({ 
                    ...prev, 
                    convert_to_webp: checked 
                  }))}
                />
              </div>
            )}

            {localSettings.require_conversion && !imgbb.api_key && (
              <Alert className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs text-destructive">
                  لا يمكن تفعيل التحويل بدون imgbb API Key.
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-destructive underline mr-1"
                    onClick={() => {
                      setShowDialog(false);
                      navigate("/settings");
                    }}
                  >
                    إعداد API Key
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!localSettings.require_conversion && (
              <Alert className="bg-muted">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  سيتم تحليل الصور واستخدام الروابط الأصلية. تأكد أن الروابط متاحة للعامة.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={localSettings.require_conversion && !imgbb.api_key}
            >
              حفظ الإعدادات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
