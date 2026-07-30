import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Save, Send, CalendarClock, Eye, ShieldCheck, Upload, X, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { anyToJpegBase64, fileToJpegBlob } from "@/lib/webp";

const PLATFORMS = [
  { id: "facebook_page", label: "Facebook Page" },
  { id: "facebook_group", label: "Facebook Group" },
  { id: "instagram", label: "Instagram Business" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "pinterest", label: "Pinterest" },
  { id: "google_business", label: "Google Business Profile" },
  { id: "threads", label: "Threads" },
  { id: "youtube_community", label: "YouTube Community" },
  { id: "whatsapp", label: "WhatsApp Broadcast" },
];

const TONES = ["جذاب تسويقي","رسمي","فاخر Premium","مصري عامي","عربي فصحى","ودود","بسيط ومباشر","Storytelling","Direct Response","عرض محدود","شبابي","B2B","B2C"];
const STYLES = ["بإيموجيز","بدون إيموجيز","نقاط منظمة","فقرة واحدة","منشور طويل","منشور قصير","CTA قوي","Hashtags","بدون Hashtags","إظهار السعر","إخفاء السعر"];
const AUDIENCES = ["عميل يبحث عن السعر","عميل يبحث عن الفخامة","عميل يبحث عن الراحة","عميل عائلي","عميل تجهيز شقة","عريس/عروسة","شركات","جمهور عام","Luxury","Budget"];
const RECURRENCE = [
  { v: "none", l: "بدون تكرار" },
  { v: "daily", l: "يومياً" },
  { v: "weekly", l: "أسبوعياً" },
  { v: "monthly", l: "شهرياً" },
  { v: "every_n_days", l: "كل N أيام" },
];

interface Props {
  seed?: any;
  onDone?: () => void;
}

export function SocialPostBuilder({ seed, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(seed?.product?.name || "");
  const [manualText, setManualText] = useState("");
  const [tone, setTone] = useState("جذاب تسويقي");
  const [style, setStyle] = useState("بإيموجيز");
  const [audience, setAudience] = useState("جمهور عام");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook_page"]);
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<string[]>(seed?.product?.images || []);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEnds, setRecurrenceEnds] = useState("");
  const [score, setScore] = useState<any>(null);
  const [scoring, setScoring] = useState(false);

  const togglePlatform = (id: string) =>
    setSelectedPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const generateContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-generate-copy", {
        body: {
          product: seed?.product || null,
          analysis: seed?.analysis || null,
          manual_text: manualText,
          tone, style, audience,
          platforms: selectedPlatforms,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.content || {});
      toast.success(`تم التوليد عبر ${data.provider || "AI"}`);
      setStep(5);
    } catch (e: any) {
      toast.error(e.message || "فشل التوليد");
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");
      const { data: row } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "imgbb").maybeSingle();
      const apiKey = (row?.value as any)?.api_key;
      if (!apiKey) throw new Error("أضف مفتاح imgbb في الإعدادات");

      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const blob = await fileToJpegBlob(f, 86);
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onloadend = () => res(String(r.result).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        const { data, error } = await supabase.functions.invoke("imgbb-upload", { body: { image: b64, apiKey } });
        if (error || !data?.url) throw new Error(data?.error || error?.message || "فشل رفع صورة");
        urls.push(data.url);
      }
      setMedia(m => Array.from(new Set([...m, ...urls])));
      toast.success(`تم رفع ${urls.length} صورة بصيغة مناسبة للسوشيال`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const prepareMediaForSocial = async () => {
    if (!media.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");
      const { data: row } = await supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "imgbb").maybeSingle();
      const apiKey = (row?.value as any)?.api_key;
      if (!apiKey) throw new Error("أضف مفتاح imgbb في الإعدادات");

      const converted: string[] = [];
      for (const url of media) {
        if (!/^https?:\/\//i.test(url)) continue;
        const { base64 } = await anyToJpegBase64(url, 86);
        const { data, error } = await supabase.functions.invoke("imgbb-upload", { body: { image: base64, apiKey } });
        if (error || !data?.url) throw new Error(data?.error || error?.message || "فشل تجهيز صورة للسوشيال");
        converted.push(data.url);
      }
      if (!converted.length) throw new Error("لا توجد صور قابلة للتجهيز");
      setMedia(Array.from(new Set(converted)));
      toast.success("تم تجهيز الصور للنشر بصيغة JPG");
    } catch (e: any) {
      toast.error(`${e.message || "فشل تجهيز الصور"}. لو الصورة من رابط لا يسمح بالتحويل، ارفعها من جهازك من نفس الزر.`);
    } finally {
      setUploading(false);
    }
  };

  const scorePost = async () => {
    const firstPlatform = selectedPlatforms[0];
    const content = generated[firstPlatform] || Object.values(generated)[0];
    if (!content) { toast.error("ولّد المحتوى أولاً"); return; }
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-score-post", {
        body: { content, platform: firstPlatform, product: seed?.product },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setScore(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setScoring(false);
    }
  };

  const saveDraft = async (status: "draft" | "approved" | "scheduled") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل دخول");
      const payload: any = {
        user_id: user.id,
        title: title || "منشور جديد",
        source_type: seed ? "product_analysis" : "manual",
        source_url: seed?.product?.url || null,
        product_data: seed?.product || {},
        generated_content: generated,
        media,
        selected_platforms: selectedPlatforms,
        status,
        approval_status: status === "approved" || status === "scheduled" ? "approved" : "pending",
        scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
        recurring_rule: recurrence !== "none" ? {
          type: recurrence, interval: recurrenceInterval,
          ends_at: recurrenceEnds ? new Date(recurrenceEnds).toISOString() : null,
        } : null,
        score_data: score,
      };
      let row;
      if (postId) {
        const { data, error } = await supabase.from("social_posts").update(payload).eq("id", postId).select().single();
        if (error) throw error;
        row = data;
      } else {
        const { data, error } = await supabase.from("social_posts").insert(payload).select().single();
        if (error) throw error;
        row = data;
        setPostId(row.id);
      }
      // Persist schedule row for recurring cron
      if (status === "scheduled" && scheduleAt) {
        await supabase.from("social_schedules").upsert({
          post_id: row.id, user_id: user.id,
          schedule_type: "once",
          publish_at: new Date(scheduleAt).toISOString(),
          timezone: "Africa/Cairo",
          recurrence_type: recurrence,
          recurrence_interval: recurrenceInterval,
          recurrence_ends_at: recurrenceEnds ? new Date(recurrenceEnds).toISOString() : null,
          status: "active",
        }, { onConflict: "post_id" });
      }
      toast.success(status === "scheduled" ? "تمت الجدولة" : status === "approved" ? "تمت الموافقة" : "تم حفظ المسودة");
      return row;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const publishNow = async () => {
    if (!approved) { toast.error("يجب الموافقة على المنشور أولًا"); return; }
    const row = await saveDraft("draft");
    if (!row) return;
    setLoading(true);
    try {
      // Clear any scheduled_at and force approved status for immediate publish
      await supabase.from("social_posts").update({
        approval_status: "approved",
        scheduled_at: null,
        status: "publishing",
      }).eq("id", row.id);

      const { data, error } = await supabase.functions.invoke("social-publish-post", {
        body: { post_id: row.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ok = (data.results || []).filter((r: any) => r.success).length;
      const fail = (data.results || []).filter((r: any) => !r.success).length;
      const failed = (data.results || []).filter((r: any) => !r.success);
      const details = failed.map((r: any) => `${r.platform}: ${r.error}`).join(" — ");
      if (fail === 0) toast.success(`تم النشر على ${ok} منصة`);
      else if (ok === 0) toast.error(details || `فشل النشر على كل المنصات`);
      else toast.warning(details || `نشر جزئي: ${ok} نجح، ${fail} فشل`);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "فشل النشر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>إنشاء منشور</span>
            <Badge variant="secondary">خطوة {step} / 8</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <Label>المصدر</Label>
              {seed ? (
                <div className="bg-muted/30 rounded p-3 text-sm">
                  ✓ استخدام تحليل المنتج: <b>{seed.product?.name}</b>
                </div>
              ) : (
                <Textarea rows={4} placeholder="اكتب فكرة المنشور أو النص اليدوي..." value={manualText} onChange={(e) => setManualText(e.target.value)} />
              )}
              <Input placeholder="عنوان المنشور (داخلي)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button onClick={() => setStep(2)}>التالي</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>اختر المنصات</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <label key={p.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer hover:bg-muted/30">
                    <Checkbox checked={selectedPlatforms.includes(p.id)} onCheckedChange={() => togglePlatform(p.id)} />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>السابق</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedPlatforms.length}>التالي</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STYLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIENCES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>السابق</Button>
                <Button onClick={() => setStep(4)}>التالي</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Button onClick={generateContent} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                توليد محتوى لكل منصة
              </Button>
              <p className="text-xs text-muted-foreground">سيستخدم المزود المحدد في الإعدادات → AI تلقائيًا (Gemini أو OpenRouter أو Hugging Face).</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>السابق</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <Label>الوسائط</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="border rounded px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 inline-flex items-center gap-1.5">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  رفع صور للسوشيال (JPG)
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                </label>
                {!!media.length && (
                  <Button type="button" variant="outline" size="sm" onClick={prepareMediaForSocial} disabled={uploading} className="gap-1.5">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    تهيئة الروابط للنشر JPG
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">أو ألصق روابطك أدناه</span>
              </div>
              <Textarea
                rows={3}
                value={media.join("\n")}
                onChange={(e) => setMedia(e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                placeholder="ضع رابطًا في كل سطر"
                dir="ltr"
              />
              <div className="flex flex-wrap gap-2">
                {media.map((m, i) => (
                  <div key={i} className="relative">
                    <img src={m} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]"
                      onClick={() => setMedia(media.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>السابق</Button>
                <Button onClick={() => setStep(6)}><Eye className="h-4 w-4 ml-1" />معاينة</Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <Label>المعاينة لكل منصة</Label>
              <div className="space-y-3">
                {selectedPlatforms.map(p => (
                  <div key={p} className="border rounded p-3 bg-card">
                    <div className="text-xs font-semibold mb-2 text-primary">{PLATFORMS.find(x => x.id === p)?.label}</div>
                    {!!media.length && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {media.slice(0, 4).map((m, i) => <img key={i} src={m} alt="" className="w-14 h-14 object-cover rounded" />)}
                      </div>
                    )}
                    <Textarea rows={5} value={generated[p] || ""} onChange={(e) => setGenerated({ ...generated, [p]: e.target.value })} />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Button size="sm" variant="outline" onClick={scorePost} disabled={scoring}>
                  {scoring ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Gauge className="h-3 w-3 ml-1" />}
                  تقييم قوة المنشور
                </Button>
                {score && (
                  <Badge variant={score.score >= 70 ? "default" : score.score >= 40 ? "secondary" : "destructive"}>
                    {score.score}/100 — {score.verdict?.slice(0, 60)}
                  </Badge>
                )}
              </div>
              {score?.improvements?.length > 0 && (
                <ul className="text-xs text-muted-foreground list-disc pr-4">
                  {score.improvements.slice(0, 4).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              )}

              <label className="flex items-center gap-2 text-sm border rounded p-2 bg-primary/5">
                <Checkbox checked={approved} onCheckedChange={(v) => setApproved(!!v)} />
                أوافق على المحتوى وأذن بنشره عند الطلب
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(5)}>السابق</Button>
                <Button onClick={() => setStep(7)}>التالي</Button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-3">
              <Label>الجدولة (اختياري)</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>التكرار</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RECURRENCE.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {recurrence !== "none" && (
                  <>
                    <div><Label>الفاصل (N)</Label>
                      <Input type="number" min={1} value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(+e.target.value)} />
                    </div>
                    <div><Label>ينتهي في</Label>
                      <Input type="date" value={recurrenceEnds} onChange={(e) => setRecurrenceEnds(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">المنطقة الزمنية: Africa/Cairo. النشر يتم عبر مهمة دورية (كل دقيقة).</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(6)}>السابق</Button>
                <Button onClick={() => setStep(8)}>التالي</Button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded p-3 text-sm space-y-1">
                <div>المنصات: {selectedPlatforms.length}</div>
                <div>الموافقة: {approved ? "✅" : "❌"}</div>
                <div>الجدولة: {scheduleAt || "بدون"}</div>
                <div>التكرار: {recurrence === "none" ? "—" : `${recurrence} كل ${recurrenceInterval}`}</div>
                {score && <div>التقييم: {score.score}/100</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => saveDraft("draft")}>
                  <Save className="h-4 w-4 ml-1" /> حفظ كمسودة
                </Button>
                <Button variant="outline" onClick={() => saveDraft("scheduled")} disabled={!scheduleAt || !approved}>
                  <CalendarClock className="h-4 w-4 ml-1" /> جدولة
                </Button>
                <Button onClick={publishNow} disabled={!approved || loading}>
                  {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Send className="h-4 w-4 ml-1" />}
                  نشر فعلي الآن
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <ShieldCheck className="inline h-3 w-3" /> النشر الفعلي يتطلب توكنات صالحة لكل منصة محددة. لا يتم أي نشر بدون موافقتك.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
