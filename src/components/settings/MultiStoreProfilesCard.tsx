import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Store, Plus, CheckCircle2, RefreshCw, Trash2, Edit, ExternalLink, ShieldCheck } from "lucide-react";
import { useStoreProfiles, StoreProfile } from "@/hooks/useStoreProfiles";
import { useToast } from "@/hooks/use-toast";

export function MultiStoreProfilesCard() {
  const { profiles, activeProfile, switchProfile, createProfile, deleteProfile } = useStoreProfiles();
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [name, setName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [ck, setCk] = useState("");
  const [cs, setCs] = useState("");
  const [fbPageId, setFbPageId] = useState("");
  const [fbToken, setFbToken] = useState("");
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة اسم المتجر", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createProfile({
        name,
        store_url: storeUrl,
        woocommerce: {
          store_url: storeUrl,
          consumer_key: ck,
          consumer_secret: cs,
        },
        facebook: {
          page_id: fbPageId,
          access_token: fbToken,
        },
        activateNow: true,
      });
      setName("");
      setStoreUrl("");
      setCk("");
      setCs("");
      setFbPageId("");
      setFbToken("");
      setOpenDialog(false);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل إضافة البروفايل", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">إدارة البروفايلات والمتاجر المتعددة (Multi-Store Profiles)</CardTitle>
              <CardDescription>
                أضف عدة متاجر وصفحات فيس بوك بنفس الحساب، واتنقل بينها بضغطة زر واحدة دون الحاجة لتسجيل الخروج!
              </CardDescription>
            </div>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4" /> إضافة متجر / بروفايل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-500" />
                  إضافة بروفايل متجر جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="space-y-1">
                  <Label>اسم المتجر / البروفايل *</Label>
                  <Input placeholder="مثال: متجر الملابس الأنيقة" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>رابط المتجر الإلكتروني (WooCommerce URL)</Label>
                  <Input placeholder="https://fashionstore.com" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Consumer Key (ck_...)</Label>
                    <Input placeholder="ck_..." value={ck} onChange={e => setCk(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1">
                    <Label>Consumer Secret (cs_...)</Label>
                    <Input placeholder="cs_..." value={cs} onChange={e => setCs(e.target.value)} dir="ltr" type="password" />
                  </div>
                </div>
                <div className="border-t pt-2 space-y-2">
                  <Label className="font-bold text-xs text-muted-foreground">ربط صفحة فيس بوك المخصصة لهذا المتجر (اختياري):</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Facebook Page ID" value={fbPageId} onChange={e => setFbPageId(e.target.value)} dir="ltr" />
                    <Input placeholder="Page Access Token" value={fbToken} onChange={e => setFbToken(e.target.value)} dir="ltr" type="password" />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>إلغاء</Button>
                <Button onClick={handleAdd} disabled={creating || !name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  حفظ وتفعيل المتجر الجديد
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profiles.map((p) => {
            const isActive = p.id === activeProfile?.id || p.is_active;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col justify-between space-y-3 ${
                  isActive ? "border-blue-500 bg-blue-500/10 shadow-sm" : "border-muted bg-background hover:border-blue-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-blue-500" />
                      {p.name}
                    </h4>
                    {isActive ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> المتجر النشط حالياً
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">غير نشط</Badge>
                    )}
                  </div>
                  {p.store_url && (
                    <p className="text-xs text-muted-foreground dir-ltr text-right truncate">
                      {p.store_url}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {p.woocommerce?.consumer_key && <Badge variant="secondary" className="text-[10px]">WooCommerce 🟢</Badge>}
                    {p.facebook?.page_id && <Badge variant="secondary" className="text-[10px]">فيس بوك 🔵</Badge>}
                    {p.wp_studio?.api_key && <Badge variant="secondary" className="text-[10px]">WordPress Studio 🟣</Badge>}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                  {!isActive ? (
                    <Button size="sm" onClick={() => switchProfile(p.id)} className="font-bold gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                      <RefreshCw className="h-3.5 w-3.5" /> التبديل وإدارة هذا المتجر
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" /> يتم إدارة هذا المتجر حالياً
                    </span>
                  )}
                  {profiles.length > 1 && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteProfile(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
