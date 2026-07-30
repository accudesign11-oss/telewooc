import { Button } from "@/components/ui/button";
import { Save, Play, RefreshCw, Copy, Download, GitBranch, Upload } from "lucide-react";
import { toast } from "sonner";

export function PrompterToolbar() {
  return (
    <div className="flex items-center gap-2 bg-card p-2 rounded-xl border shadow-sm overflow-x-auto whitespace-nowrap">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("تم الحفظ")}>
        <Save className="h-4 w-4" />
        حفظ
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("جاري الاختبار...")}>
        <Play className="h-4 w-4" />
        اختبار
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("تم التحسين")}>
        <RefreshCw className="h-4 w-4" />
        تحسين تلقائي
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("تم النسخ")}>
        <Copy className="h-4 w-4" />
        نسخ
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("تم التصدير")}>
        <Download className="h-4 w-4" />
        تصدير
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("تم إنشاء إصدار جديد")}>
        <GitBranch className="h-4 w-4" />
        إنشاء إصدار جديد
      </Button>
      <Button variant="default" size="sm" className="gap-2 mr-auto" onClick={() => toast.success("تم النشر بنجاح")}>
        <Upload className="h-4 w-4" />
        نشر داخل TeleWoo
      </Button>
    </div>
  );
}
