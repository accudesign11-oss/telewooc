import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plug, ExternalLink, Trash2, RefreshCw, Loader2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "facebook_page", label: "Facebook Page", fields: ["page_id", "access_token"], docs: [
    { l: "Developers", u: "https://developers.facebook.com/" },
    { l: "Graph Explorer", u: "https://developers.facebook.com/tools/explorer/" },
    { l: "Token Debugger", u: "https://developers.facebook.com/tools/debug/accesstoken/" },
    { l: "Pages API", u: "https://developers.facebook.com/docs/pages-api/" },
  ]},
  { id: "instagram", label: "Instagram Business", fields: ["account_id", "access_token"], docs: [
    { l: "Instagram API", u: "https://developers.facebook.com/docs/instagram-api/" },
    { l: "Content Publishing", u: "https://developers.facebook.com/docs/instagram-api/guides/content-publishing/" },
  ]},
  { id: "tiktok", label: "TikTok", fields: ["account_id", "access_token"], docs: [
    { l: "Developers", u: "https://developers.tiktok.com/" },
    { l: "Content Posting API", u: "https://developers.tiktok.com/doc/content-posting-api-get-started/" },
  ]},
  { id: "x", label: "X / Twitter", fields: ["access_token"], docs: [
    { l: "X Developer Portal", u: "https://developer.x.com/en/portal/dashboard" },
    { l: "Docs", u: "https://docs.x.com/" },
  ]},
  { id: "linkedin", label: "LinkedIn", fields: ["account_id", "access_token"], docs: [
    { l: "LinkedIn Developers", u: "https://www.linkedin.com/developers/" },
    { l: "Docs", u: "https://learn.microsoft.com/en-us/linkedin/" },
  ]},
  { id: "pinterest", label: "Pinterest", fields: ["account_id", "access_token"], docs: [
    { l: "Developers", u: "https://developers.pinterest.com/" },
    { l: "API v5", u: "https://developers.pinterest.com/docs/api/v5/" },
  ]},
  { id: "google_business", label: "Google Business Profile", fields: ["account_id", "access_token"], docs: [
    { l: "Google Cloud Console", u: "https://console.cloud.google.com/" },
    { l: "GMB API", u: "https://developers.google.com/my-business" },
    { l: "OAuth Playground", u: "https://developers.google.com/oauthplayground/" },
  ]},
  { id: "youtube_community", label: "YouTube Community", fields: ["account_id", "access_token"], docs: [
    { l: "YouTube API", u: "https://developers.google.com/youtube/v3" },
  ]},
  { id: "threads", label: "Threads", fields: ["account_id", "access_token"], docs: [
    { l: "Threads API", u: "https://developers.facebook.com/docs/threads/" },
  ]},
];

interface Props { compact?: boolean }

export function SocialConnectionsManager({ compact }: Props) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, any>>({});

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const activeProfileId = localStorage.getItem("telewoo_active_profile_id") || "prof_default";

    let query = supabase.from("social_platform_connections").select("*").eq("user_id", user.id);
    if (activeProfileId !== "prof_default") {
      query = query.eq("account_id", activeProfileId);
    } else {
      query = query.or(`account_id.eq.prof_default,account_id.is.null`);
    }

    const { data } = await query.order("created_at", { ascending: false });
    const sorted = [...(data || [])].sort((a, b) => {
      if (a.platform !== b.platform) return 0;
      if (a.status === "connected" && b.status !== "connected") return -1;
      if (b.status === "connected" && a.status !== "connected") return 1;
      return new Date(b.last_tested_at || b.updated_at || b.created_at).getTime() - new Date(a.last_tested_at || a.updated_at || a.created_at).getTime();
    });
    setConnections(sorted);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getStatus = (platformId: string) => {
    const matches = connections.filter(c => c.platform === platformId);
    return matches.find(c => c.status === "connected") || matches[0];
  };

  const runTest = async (conn: any) => {
    setTesting(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("social-test-connection", { body: { connection_id: conn.id } });
      if (error) throw error;
      setReports((r) => ({ ...r, [conn.id]: data?.report }));
      if (data?.ok) toast.success("✓ التوكن صالح والصلاحيات كاملة");
      else toast.error(data?.report?.error || data?.error || "فشل الاختبار");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            ربط منصات السوشيال ميديا
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          التوكنات تُخزَّن مشفّرة. زر <span className="text-green-600 font-semibold">اختبار حقيقي</span> يتحقق من صلاحية التوكن، يفحص الأذونات (Scopes)، ويستبدل تلقائياً User Token بـ Page Access Token لـ Facebook/Instagram.
        </CardContent>
      </Card>

      <div className={`grid gap-3 ${compact ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {PLATFORMS.map(p => {
          const conn = getStatus(p.id);
          const report = conn ? reports[conn.id] : null;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{p.label}</div>
                  {conn ? (
                    <Badge variant={conn.status === "connected" ? "default" : "destructive"} className={conn.status === "connected" ? "bg-green-600" : ""}>
                      {conn.status === "connected" ? <><CheckCircle2 className="h-3 w-3 ml-1" /> مربوط</> : <><XCircle className="h-3 w-3 ml-1" /> {conn.status}</>}
                    </Badge>
                  ) : (
                    <Badge variant="outline">غير مربوط</Badge>
                  )}
                </div>
                {conn?.account_name && <div className="text-xs text-muted-foreground">{conn.account_name} {conn.page_id ? `· Page ${conn.page_id}` : ""}</div>}
                {conn?.token_expires_at && (
                  <div className="text-[10px] text-muted-foreground">ينتهي: {new Date(conn.token_expires_at).toLocaleDateString("ar-EG")}</div>
                )}
                {conn?.last_error && <div className="text-xs text-destructive break-words">{conn.last_error}</div>}

                {report && (
                  <div className="rounded border bg-muted/30 p-2 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      {report.ok ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      <span className="font-semibold">{report.ok ? "جاهز للنشر" : "يحتاج مراجعة"}</span>
                    </div>
                    {report.account_name && <div>الحساب: <span className="font-mono">{report.account_name}</span></div>}
                    {typeof report.can_publish === "boolean" && (
                      <div>صلاحية النشر: {report.can_publish ? <span className="text-green-600">✓</span> : <span className="text-destructive">✗</span>}</div>
                    )}
                    {report.scopes?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {report.required_scopes?.map((s: string) => (
                          <Badge key={s} variant={report.scopes.includes(s) ? "default" : "destructive"} className="text-[9px] px-1 py-0">
                            {report.scopes.includes(s) ? "✓" : "✗"} {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {report.details?.available_pages?.length > 0 && (
                      <div className="text-muted-foreground">صفحات متاحة: {report.details.available_pages.map((x: any) => x.name).join("، ")}</div>
                    )}
                    {report.error && <div className="text-destructive">{report.error}</div>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <ConnectDialog platform={p} existing={conn} onSaved={load} />
                  {conn && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => runTest(conn)}
                        disabled={testing === conn.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {testing === conn.id ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <ShieldCheck className="h-3 w-3 ml-1" />}
                        اختبار حقيقي
                      </Button>
                      {(p.id === "facebook_page" || p.id === "instagram") && (
                        <RefreshTokenDialog conn={conn} onDone={load} />
                      )}
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm("فصل هذه المنصة؟")) return;
                        await supabase.from("social_platform_connections").delete().eq("id", conn.id);
                        load();
                      }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.docs.map((d, i) => (
                    <a key={i} href={d.u} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                      <ExternalLink className="h-2.5 w-2.5" /> {d.l}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ConnectDialog({ platform, existing, onSaved }: any) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");
      const accessToken = values.access_token || "";
      if (!accessToken) throw new Error("Access Token مطلوب");
      // Encryption happens server-side
      const { data, error } = await supabase.functions.invoke("social-test-connection", {
        body: {
          save: true,
          platform: platform.id,
          access_token: accessToken,
          page_id: values.page_id || null,
          account_id: values.account_id || null,
        },
      });
      if (error) throw error;
      const reportErr = data?.report?.error;
      if (!data?.ok) throw new Error(reportErr || data?.error || "فشل التحقق");
      toast.success(`تم الربط: ${data.report?.account_name || ""}`.trim());
      setOpen(false);
      setValues({});
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "outline" : "default"}>
          <Plug className="h-3 w-3 ml-1" /> {existing ? "تحديث" : "ربط"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{platform.label} — ربط يدوي بـ Access Token</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {platform.fields.map((f: string) => (
            <div key={f}>
              <Label>{f}</Label>
              <Input
                type={f === "access_token" ? "password" : "text"}
                value={values[f] || ""}
                onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                placeholder={f === "access_token" ? "Long-lived token" : f}
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
            حفظ واختبار
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RefreshTokenDialog({ conn, onDone }: any) {
  const [open, setOpen] = useState(false);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-refresh-token", {
        body: { connection_id: conn.id, app_id: appId, app_secret: appSecret },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`تم تحديث التوكن (~${data.expires_in_days} يوم)`);
      setOpen(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 ml-1" /> تحديث طويل الأمد</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>تحويل التوكن إلى Long-Lived (60 يوم)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">احتاج App ID و App Secret من <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" className="text-primary underline">Facebook Developers</a>.</p>
          <Input placeholder="App ID" value={appId} onChange={(e) => setAppId(e.target.value)} />
          <Input type="password" placeholder="App Secret" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} />
          <Button onClick={refresh} disabled={saving || !appId || !appSecret} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
            تحديث الآن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
