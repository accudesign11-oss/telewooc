import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, Server, Key, Sparkles, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function InjectionStepperGuide() {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [copiedKey, setCopiedKey] = useState(false);

  const STEPS = [
    {
      title: "1) تنزيل ورفع ملحق TeleWoo Injector",
      icon: <Download className="h-5 w-5 text-blue-500" />,
      badge: "الخطوة الأولى",
      summary: "حمّل ملف PHP الخفيف وشحنه في مجلد mu-plugins بالاستضافة",
      content: (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            الملحق عبارة عن ملف PHP خفيف جداً يطبع الأكواد مباشرة في الواجهة دون التعديل على قوالب ووردبريس.
          </p>
          <div className="p-3 bg-muted/40 rounded-lg border space-y-2 dir-rtl">
            <div className="font-bold text-xs">تعليمات الرفع:</div>
            <ol className="list-decimal pr-5 text-xs space-y-1.5 text-foreground/90">
              <li>قم بتنزيل الملف: <a href="/telewoo-injector.php" download className="text-primary font-bold underline">telewoo-injector.php</a></li>
              <li>افتح مدير الملفات (cPanel / FTP) وانتقل إلى <code>wp-content/mu-plugins/</code>.</li>
              <li>ارفعه داخل مجلد <code>mu-plugins</code> (أنشئ المجلد إن لم يكن موجوداً).</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "2) نسخ مفتاح TeleWoo السرّي (X-TeleWoo-Key)",
      icon: <Key className="h-5 w-5 text-amber-500" />,
      badge: "الخطوة الثانية",
      summary: "افتح لوحة تحكم ووردبريس وانسخ المفتاح من التنبيه الأزرق العلوي",
      content: (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            بعد رفع الملف، افتح لوحة ووردبريس الرئيسية <code>wp-admin</code>. ستجد تنبيهاً أزرق في أعلى الشاشة يحتوي على المفتاح.
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
            <div className="font-bold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              أين أجد المفتاح في ووردبريس؟
            </div>
            <p className="text-xs text-muted-foreground">
              ستظهر رسالة: <strong>"TeleWoo Secret Key: twk_xxxx..."</strong> مع زر <strong>"نسخ المفتاح" (Copy Key)</strong>.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "3) حفظ بيانات الموقع واختبار الاتصال أونلاين",
      icon: <Server className="h-5 w-5 text-emerald-500" />,
      badge: "الخطوة الثالثة",
      summary: "الصق المفتاح ورابط المتجر، واضغط على حفظ واختبار الاتصال",
      content: (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            ضع رابط متجرك والمفتاح في تبويب <strong>"الإعدادات"</strong>، ثم اضغط على زر <strong>"اختبار الاتصال"</strong> لتأكيد الربط التلقائي.
          </p>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            بمجرد ظهور شارة (متصل)، يمكنك حقن وتحديث أكواد CSS و JS مباشرة في أي وقت بضغطة زر!
          </div>
        </div>
      )
    },
    {
      title: "4) البديل المباشر بدون إضافات (Additional CSS)",
      icon: <Code2 className="h-5 w-5 text-purple-500" />,
      badge: "بديل بدون ملحق",
      summary: "نسخ أكواد CSS ولصقها يدويًا في مظهر ووردبريس",
      content: (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            إذا كنت لا ترغب في رفع أي ملفات PHP على استضافتك، يمكنك انسخ أكواد CSS المولدة ولصقها مباشرة في تخصيص القالب:
          </p>
          <div className="p-3 bg-muted/40 rounded-lg border font-mono text-xs text-foreground dir-ltr">
            WordPress Admin → Appearance → Customize → Additional CSS
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">الدليل التفاعلي المتسلسل لخطوات الحقن بالتفصيل (Step-by-Step Injection Guide)</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">خطوة {activeStep + 1} من {STEPS.length}</Badge>
        </div>
        <CardDescription>
          اتبع الخطوات المتسلسلة لربط وحقن الأكواد والتعديلات المباشرة في متجرك بكل سهولة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Stepper Navigation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-2.5 rounded-lg border text-right transition-all flex flex-col justify-between ${
                activeStep === idx
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border hover:border-primary/40 bg-background"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                {step.icon}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeStep === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </span>
              </div>
              <div className="font-bold text-xs truncate">{step.title}</div>
            </button>
          ))}
        </div>

        {/* Active Step Box */}
        <div className="p-4 bg-background rounded-xl border space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              {STEPS[activeStep].icon}
              <span>{STEPS[activeStep].title}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{STEPS[activeStep].badge}</Badge>
          </div>

          {STEPS[activeStep].content}

          {/* Prev / Next Controls */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="text-xs"
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              الخطوة السابقة
            </Button>

            <Button
              size="sm"
              onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className="text-xs font-bold"
            >
              الخطوة التالية
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
