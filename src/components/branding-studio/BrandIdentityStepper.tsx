import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, Sparkles, Save, Loader2 } from "lucide-react";

const STEPS = ["العميل", "البراند", "النشاط", "الشخصية", "البصري", "الألوان والخطوط", "Brand DNA", "حفظ"];

const INDUSTRIES = ["أثاث", "ملابس", "مطاعم", "عقارات", "عيادات", "تجميل", "متجر إلكتروني", "خدمات", "تقنية", "تعليم", "رياضة", "غذاء", "مقاولات", "تصميم داخلي", "براند شخصي", "أخرى"];
const PERSONALITY = ["فاخر", "عصري", "بسيط", "شبابي", "رسمي", "ودي", "جريء", "هادئ", "عائلي", "اقتصادي", "Premium", "Minimal", "Classic", "Futuristic", "Handmade", "Corporate"];
const AUDIENCE = ["شباب", "عائلات", "سيدات", "رجال", "عرائس", "شركات", "Luxury", "Budget", "B2B", "B2C", "عام"];
const TONES = ["مصري عامي", "عربي فصحى", "رسمي", "ودود", "فاخر", "بسيط", "مباشر", "خليجي", "English", "عربي + English"];
const LOGO_STYLES = ["Wordmark", "Lettermark", "Icon Logo", "Emblem", "Abstract", "Mascot", "Monogram", "Minimal", "Luxury", "Geometric", "Arabic Calligraphy", "Arabic + English", "3D Soft", "Flat", "Vintage"];
const MOODS = ["Clean", "Luxury", "Warm", "Elegant", "Bold", "Modern", "Soft", "Friendly", "Premium", "Tech", "Organic", "Classic"];
const AR_FONTS = ["Cairo", "Tajawal", "Noto Kufi Arabic", "IBM Plex Sans Arabic", "Almarai", "Changa"];
const EN_FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Manrope"];

export function BrandIdentityStepper({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dna, setDna] = useState<any>(null);
  const [form, setForm] = useState<any>({
    client_name: "", client_type: "", phone: "", email: "", notes: "", is_new_brand: true,
    brand_name_ar: "", brand_name_en: "", slogan: "", description: "", website_url: "",
    social_links: { facebook: "", instagram: "", tiktok: "", linkedin: "", youtube: "", whatsapp: "", email: "" },
    country: "", city: "",
    industry: "", industry_other: "",
    personality: [] as string[], audience: [] as string[], tone: "",
    logo_style: "", visual_mood: "",
    colors: { primary: "#1a1a1a", secondary: "#666666", accent: "#d4af37", background: "#ffffff", text: "#111111" },
    fonts: { heading_ar: "Cairo", body_ar: "Tajawal", heading_en: "Inter", body_en: "Inter" }
  });

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) => setForm((f: any) => ({
    ...f, [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v]
  }));

  async function generateDNA() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("branding-generate-strategy", { body: form });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "فشل التوليد");
      setDna(data.brand_dna);
      toast({ title: "تم توليد Brand DNA" });
      next();
    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function saveKit() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("غير مسجل دخول");

      // Create client
      let client_id: string | null = null;
      if (form.client_name) {
        const { data: c, error: ce } = await supabase.from("branding_clients").insert({
          user_id: u.user.id,
          client_name: form.client_name,
          client_type: form.client_type, phone: form.phone, email: form.email, notes: form.notes
        }).select("id").single();
        if (ce) throw ce;
        client_id = c.id;
      }

      const { error } = await supabase.from("brand_kits").insert({
        user_id: u.user.id,
        client_id,
        brand_name_ar: form.brand_name_ar,
        brand_name_en: form.brand_name_en,
        slogan: form.slogan,
        description: form.description,
        website_url: form.website_url,
        industry: form.industry === "أخرى" ? form.industry_other : form.industry,
        contact_json: { phone: form.phone, email: form.email, country: form.country, city: form.city },
        social_links_json: form.social_links,
        personality_json: { traits: form.personality, audience: form.audience, tone: form.tone },
        target_audience_json: { list: form.audience },
        colors_json: form.colors,
        typography_json: form.fonts,
        brand_dna_json: dna || {},
        status: "active"
      });
      if (error) throw error;
      toast({ title: "تم حفظ Brand Kit" });
      onDone();
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>إنشاء هوية — {STEPS[step]}</span>
          <span className="text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
        </CardTitle>
        <div className="flex gap-1 mt-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="اسم العميل"><Input value={form.client_name} onChange={e => upd("client_name", e.target.value)} /></Field>
            <Field label="نوع العميل"><Input value={form.client_type} onChange={e => upd("client_type", e.target.value)} placeholder="فرد / شركة / متجر" /></Field>
            <Field label="الهاتف"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
            <Field label="البريد"><Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="ملاحظات"><Textarea value={form.notes} onChange={e => upd("notes", e.target.value)} /></Field></div>
          </div>
        )}

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="اسم البراند (عربي)"><Input value={form.brand_name_ar} onChange={e => upd("brand_name_ar", e.target.value)} /></Field>
            <Field label="اسم البراند (English)"><Input value={form.brand_name_en} onChange={e => upd("brand_name_en", e.target.value)} /></Field>
            <Field label="Slogan"><Input value={form.slogan} onChange={e => upd("slogan", e.target.value)} /></Field>
            <Field label="الموقع"><Input value={form.website_url} onChange={e => upd("website_url", e.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="وصف النشاط"><Textarea value={form.description} onChange={e => upd("description", e.target.value)} /></Field></div>
            <Field label="فيسبوك"><Input value={form.social_links.facebook} onChange={e => upd("social_links", { ...form.social_links, facebook: e.target.value })} /></Field>
            <Field label="انستجرام"><Input value={form.social_links.instagram} onChange={e => upd("social_links", { ...form.social_links, instagram: e.target.value })} /></Field>
            <Field label="تيك توك"><Input value={form.social_links.tiktok} onChange={e => upd("social_links", { ...form.social_links, tiktok: e.target.value })} /></Field>
            <Field label="لينكدإن"><Input value={form.social_links.linkedin} onChange={e => upd("social_links", { ...form.social_links, linkedin: e.target.value })} /></Field>
            <Field label="يوتيوب"><Input value={form.social_links.youtube} onChange={e => upd("social_links", { ...form.social_links, youtube: e.target.value })} /></Field>
            <Field label="واتساب"><Input value={form.social_links.whatsapp} onChange={e => upd("social_links", { ...form.social_links, whatsapp: e.target.value })} /></Field>
            <Field label="الدولة"><Input value={form.country} onChange={e => upd("country", e.target.value)} /></Field>
            <Field label="المدينة"><Input value={form.city} onChange={e => upd("city", e.target.value)} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Field label="نوع النشاط">
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(x => (
                  <Badge key={x} variant={form.industry === x ? "default" : "outline"} className="cursor-pointer" onClick={() => upd("industry", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
            {form.industry === "أخرى" && (
              <Field label="حدد النشاط"><Input value={form.industry_other} onChange={e => upd("industry_other", e.target.value)} /></Field>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="شخصية البراند (اختر كل ما ينطبق)">
              <div className="flex flex-wrap gap-2">
                {PERSONALITY.map(x => (
                  <Badge key={x} variant={form.personality.includes(x) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle("personality", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
            <Field label="الجمهور المستهدف">
              <div className="flex flex-wrap gap-2">
                {AUDIENCE.map(x => (
                  <Badge key={x} variant={form.audience.includes(x) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle("audience", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
            <Field label="Tone of Voice">
              <div className="flex flex-wrap gap-2">
                {TONES.map(x => (
                  <Badge key={x} variant={form.tone === x ? "default" : "outline"} className="cursor-pointer" onClick={() => upd("tone", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label="Logo Style">
              <div className="flex flex-wrap gap-2">
                {LOGO_STYLES.map(x => (
                  <Badge key={x} variant={form.logo_style === x ? "default" : "outline"} className="cursor-pointer" onClick={() => upd("logo_style", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
            <Field label="Visual Mood">
              <div className="flex flex-wrap gap-2">
                {MOODS.map(x => (
                  <Badge key={x} variant={form.visual_mood === x ? "default" : "outline"} className="cursor-pointer" onClick={() => upd("visual_mood", x)}>{x}</Badge>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(form.colors).map(([k, v]: any) => (
                <Field key={k} label={k}>
                  <div className="flex gap-2">
                    <Input type="color" value={v} onChange={e => upd("colors", { ...form.colors, [k]: e.target.value })} className="w-12 p-1" />
                    <Input value={v} onChange={e => upd("colors", { ...form.colors, [k]: e.target.value })} />
                  </div>
                </Field>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="خط العناوين (عربي)">
                <select className="w-full h-10 rounded-md border bg-background px-3" value={form.fonts.heading_ar} onChange={e => upd("fonts", { ...form.fonts, heading_ar: e.target.value })}>
                  {AR_FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="خط النصوص (عربي)">
                <select className="w-full h-10 rounded-md border bg-background px-3" value={form.fonts.body_ar} onChange={e => upd("fonts", { ...form.fonts, body_ar: e.target.value })}>
                  {AR_FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Heading (English)">
                <select className="w-full h-10 rounded-md border bg-background px-3" value={form.fonts.heading_en} onChange={e => upd("fonts", { ...form.fonts, heading_en: e.target.value })}>
                  {EN_FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Body (English)">
                <select className="w-full h-10 rounded-md border bg-background px-3" value={form.fonts.body_en} onChange={e => upd("fonts", { ...form.fonts, body_en: e.target.value })}>
                  {EN_FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            {!dna ? (
              <div className="text-sm text-muted-foreground">اضغط على «توليد Brand DNA» لتحليل البراند بالذكاء الاصطناعي.</div>
            ) : (
              <pre className="text-xs bg-muted/30 p-3 rounded max-h-[400px] overflow-auto whitespace-pre-wrap">{JSON.stringify(dna, null, 2)}</pre>
            )}
            <Button onClick={generateDNA} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {dna ? "إعادة التوليد" : "توليد Brand DNA"}
            </Button>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3 text-sm">
            <div><b>البراند:</b> {form.brand_name_ar} / {form.brand_name_en}</div>
            <div><b>Slogan:</b> {form.slogan}</div>
            <div><b>النشاط:</b> {form.industry}</div>
            <div><b>الشخصية:</b> {form.personality.join("، ")}</div>
            <div><b>Tone:</b> {form.tone}</div>
            <div className="flex gap-1">
              {Object.entries(form.colors).map(([k, v]: any) => (
                <div key={k} className="h-8 w-8 rounded border" style={{ background: v as string }} title={`${k}: ${v}`} />
              ))}
            </div>
            <Button onClick={saveKit} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ Brand Kit
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={prev} disabled={step === 0}><ChevronRight className="h-4 w-4" />السابق</Button>
          {step < STEPS.length - 1 && (
            <Button onClick={next}>التالي<ChevronLeft className="h-4 w-4" /></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
