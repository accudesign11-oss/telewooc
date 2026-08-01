import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  FileEdit,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plug,
  RefreshCw,
  Sparkles,
  PenSquare,
  LinkIcon,
  CalendarRange,
  ListChecks,
  Bot,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props {
  onNavigate: (t: string) => void;
}

export function SocialEngineDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState({
    scheduled: 0,
    drafts: 0,
    pending: 0,
    published: 0,
    failed: 0,
    connections: 0,
    expiring: 0,
  });
  const [loading, setLoading] = useState(true);

  const [aiSettings, setAiSettings] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [posts, conns, ai] = await Promise.all([
          supabase.from("social_posts").select("status, approval_status").eq("user_id", user.id),
          supabase.from("social_platform_connections").select("status, token_expires_at").eq("user_id", user.id),
          supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "ai").maybeSingle(),
        ]);
        const p = posts.data || [];
        const c = conns.data || [];
        const now = Date.now();
        setStats({
          scheduled: p.filter(x => x.status === "scheduled").length,
          drafts: p.filter(x => x.status === "draft").length,
          pending: p.filter(x => x.approval_status === "pending").length,
          published: p.filter(x => x.status === "published").length,
          failed: p.filter(x => x.status === "failed").length,
          connections: c.filter(x => x.status === "connected").length,
          expiring: c.filter(x => x.token_expires_at && new Date(x.token_expires_at).getTime() - now < 7 * 86400000).length,
        });
        setAiSettings((ai.data?.value as any) || {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const testAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-test", { body: aiSettings });
      if (error) throw error;
      setTestResult(data);
      if (data?.success) toast.success(`${data.model || aiSettings?.provider}: ${data.latency_ms}ms`);
      else toast.error(data?.error || "فشل");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const cards = [
    { label: "منشورات مجدولة", v: stats.scheduled, icon: CalendarClock, color: "text-primary" },
    { label: "مسودات", v: stats.drafts, icon: FileEdit, color: "text-muted-foreground" },
    { label: "بانتظار الموافقة", v: stats.pending, icon: ShieldCheck, color: "text-amber-500" },
    { label: "تم النشر", v: stats.published, icon: CheckCircle2, color: "text-green-500" },
    { label: "فشلت", v: stats.failed, icon: XCircle, color: "text-destructive" },
    { label: "منصات مربوطة", v: stats.connections, icon: Plug, color: "text-primary" },
    { label: "توكنات تحتاج تحديث", v: stats.expiring, icon: RefreshCw, color: "text-amber-500" },
  ];

  const actions = [
    { l: "إنشاء منشور من رابط", t: "analyze", I: LinkIcon },
    { l: "إنشاء منشور يدوي", t: "compose", I: PenSquare },
    { l: "توليد برومبت وسائط", t: "prompts", I: Sparkles },
    { l: "ربط منصة", t: "connect", I: Plug },
    { l: "جدولة منشور", t: "scheduler", I: CalendarClock },
    { l: "خطة محتوى", t: "planner", I: CalendarRange },
    { l: "سجل النشر", t: "logs", I: ListChecks },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map(({ label, v, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div className="min-w-0">
                <div className="text-xl font-bold text-foreground">{loading ? "…" : v}</div>
                <div className="text-[11px] text-muted-foreground truncate">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3 text-foreground">إجراءات سريعة</div>
          <div className="flex flex-wrap gap-2">
            {actions.map(({ l, t, I }) => (
              <Button key={t} variant="outline" size="sm" onClick={() => onNavigate(t)} className="gap-1.5">
                <I className="h-4 w-4" />
                {l}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-semibold flex items-center justify-between text-foreground">
            <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 text-primary" /> مزود الذكاء الاصطناعي للتاب</span>
            <Link to="/settings" className="text-xs text-primary hover:underline">تغيير في الإعدادات</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              المزود: {aiSettings?.provider === "openrouter" ? "OpenRouter" : aiSettings?.provider === "huggingface" ? "Hugging Face" : "Google Gemini"}
            </Badge>
            <Badge variant={aiSettings?.gemini_api_key ? "default" : "outline"}>Gemini {aiSettings?.gemini_api_key ? "✓" : "—"}</Badge>
            <Badge variant={aiSettings?.openrouter_api_key ? "default" : "outline"}>OpenRouter {aiSettings?.openrouter_api_key ? "✓" : "—"}</Badge>
            <Badge variant={aiSettings?.huggingface_api_key ? "default" : "outline"}>HF {aiSettings?.huggingface_api_key ? "✓" : "—"}</Badge>
            <Button size="sm" variant="outline" onClick={testAI} disabled={testing} className="gap-1">
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              اختبار
            </Button>
            {testResult && (
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? `${testResult.model} · ${testResult.latency_ms}ms` : testResult.error}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">يُستخدم المزود المختار تلقائياً مع fallback إلى المزودين الآخرين عند الفشل. كل دوال هذا التاب تمر عبره.</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          💡 ابدأ بتحليل منتج من رابط، ثم انشئ منشورًا ووفّر برومبت وسائط احترافي. النشر الفعلي يحتاج توكنات صالحة وموافقة صريحة، والمنشورات المجدولة تُنشر تلقائياً عبر مهمة دورية كل دقيقة.
        </CardContent>
      </Card>
    </div>
  );
}
