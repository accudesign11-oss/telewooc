import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Camera, Save, Lock, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile({
        full_name: profileData?.full_name || "",
        email: user.email || "",
        avatar_url: profileData?.avatar_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name, avatar_url: profile.avatar_url })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("تم حفظ الملف الشخصي بنجاح");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="الملف الشخصي">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="الملف الشخصي">
      <div className="container max-w-2xl py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* بطاقة المعلومات الشخصية */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                المعلومات الشخصية
              </CardTitle>
              <CardDescription>تعديل بياناتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* الصورة الشخصية */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">رابط الصورة</Label>
                  <div className="flex gap-2">
                    <Input
                      id="avatar_url"
                      placeholder="https://..."
                      value={profile.avatar_url}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      className="w-64"
                      dir="ltr"
                    />
                    <Button variant="outline" size="icon">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* الاسم */}
              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="أدخل اسمك"
                />
              </div>

              {/* البريد */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="pr-10 bg-muted"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>

          {/* بطاقة تغيير كلمة المرور */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                تغيير كلمة المرور
              </CardTitle>
              <CardDescription>تحديث كلمة المرور الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">كلمة المرور الجديدة</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">تأكيد كلمة المرور</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwords.new || !passwords.confirm}
                variant="outline"
              >
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Lock className="h-4 w-4 ml-2" />
                )}
                تغيير كلمة المرور
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
