import { useState, useEffect } from "react";
import { Bell, Moon, Sun, User, LogOut, Store, ChevronDown, Check, UserPlus, Trash2, Plus, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStoreProfiles, StoreProfile } from "@/hooks/useStoreProfiles";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profiles, activeProfile, switchProfile, createProfile, deleteProfile } = useStoreProfiles();

  const [activityCount, setActivityCount] = useState<number>(0);
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [creating, setCreating] = useState(false);

  const [customSbUrl, setCustomSbUrl] = useState("");
  const [customSbAnonKey, setCustomSbAnonKey] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<StoreProfile | null>(null);

  useEffect(() => {
    async function loadCount() {
      try {
        const { count } = await supabase
          .from("activity_log")
          .select("id", { count: "exact", head: true });
        setActivityCount(count || 0);
      } catch (_) {}
    }
    loadCount();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل خروجك بنجاح",
      });
      
      navigate("/auth");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewProfile = async () => {
    if (!newProfileName.trim()) {
      toast({ title: "أدخل اسم البروفايل/الحساب الجديد", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createProfile({
        name: newProfileName.trim(),
        supabase_url: customSbUrl.trim() || undefined,
        supabase_anon_key: customSbAnonKey.trim() || undefined,
        activateNow: true
      });
      setIsAddProfileOpen(false);
      setNewProfileName("");
      setCustomSbUrl("");
      setCustomSbAnonKey("");
      toast({
        title: "⚡ تم إنشاء البروفايل ودخول الحساب الجديد بنجاح!",
        description: `أنت الآن داخل حساب "${newProfileName.trim()}" مع عزل 100% للتليجرام والمزود وجميع البيانات.`
      });
    } catch (e: any) {
      toast({ title: "خطأ في الإنشاء", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border safe-area-top" dir="rtl">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Title & Store Active Badge */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-primary/30 shadow-md shadow-primary/20 bg-slate-950 p-0.5 shrink-0">
            <img src="/telewoo-logo.png" alt="TeleWoo Logo" className="w-full h-full object-cover rounded-lg" />
          </div>
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-accent truncate">
            {title || "TeleWoo Flow"}
          </h1>

          {activeProfile && (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs bg-primary/10 border-primary/20 text-primary font-bold py-1">
              <Store className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">{activeProfile.name}</span>
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 relative"
            onClick={() => navigate("/notifications")}
            title="سجل الإشعارات والنشاط"
          >
            <Bell className="h-4 w-4" />
            {activityCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {activityCount > 99 ? "99+" : activityCount}
              </Badge>
            )}
          </Button>

          {/* User Profile Menu with Multi-Account Switching & Creation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-bold text-xs border-primary/30 bg-primary/5 hover:bg-primary/10">
                <User className="h-4 w-4 text-primary" />
                <span className="max-w-[110px] truncate">{activeProfile?.name || "حسابي"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 text-right" dir="rtl">
              <div className="p-2.5 bg-muted/40 border-b space-y-1">
                <p className="text-xs font-bold text-foreground">الحساب النشط حالياً:</p>
                <div className="flex items-center gap-1.5 text-xs text-primary font-extrabold truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{activeProfile?.name || "الحساب الرئيسي"}</span>
                </div>
              </div>

              <div className="p-1">
                <p className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground">
                  البروفايلات والحسابات الفرعية ({profiles.length}):
                </p>
                {profiles.map(p => {
                  const isActive = p.id === activeProfile?.id || p.is_active;
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => !isActive && switchProfile(p.id)}
                      className={`flex items-center justify-between text-xs cursor-pointer rounded-md my-0.5 ${
                        isActive ? "font-bold bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>

              <DropdownMenuSeparator />

              {/* Add New Profile Action */}
              <DropdownMenuItem
                onClick={() => setIsAddProfileOpen(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>➕ إضافة بروفايل / حساب فرعي جديد...</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-xs">
                إعدادات الحساب والموقع
              </DropdownMenuItem>

              {profiles.length > 1 && activeProfile && (
                <DropdownMenuItem
                  onClick={() => {
                    setProfileToDelete(activeProfile);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer gap-2 font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف البروفايل الحالي</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                className="text-destructive focus:text-destructive text-xs font-bold gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Add New Sub-Profile Dialog Modal */}
      <Dialog open={isAddProfileOpen} onOpenChange={setIsAddProfileOpen}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader className="text-right space-y-2">
            <DialogTitle className="text-lg font-bold text-right flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              إضافة بروفايل / حساب فرعي جديد داخل حسابك
            </DialogTitle>
            <DialogDescription className="text-right text-xs leading-relaxed">
              سيعمل هذا البروفايل كحساب جديد تماماً داخل نفس الحساب الرئيسي، ببيانات موقع جديدة ورابط ووردبريس وفيسبوك ونشر وجدولة مستقلة من الصفر.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-right">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-right">اسم البروفايل / الحساب الفرعي الجديد:</Label>
              <Input
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="مثال: متجر العطور، صفحة ملابس الرجال، حساب عميل 2..."
                className="text-xs text-right"
              />
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-xs font-bold text-muted-foreground block text-right">
                بيانات داتابيز Supabase مخصصة (اختياري - اتركها فارغة للعزل التلقائي):
              </Label>
              <Input
                value={customSbUrl}
                onChange={e => setCustomSbUrl(e.target.value)}
                placeholder="https://xxxxxxxx.supabase.co (اختياري)"
                className="text-xs text-left"
                dir="ltr"
              />
              <Input
                type="password"
                value={customSbAnonKey}
                onChange={e => setCustomSbAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (Anon Key اختياري)"
                className="text-xs text-left"
                dir="ltr"
              />
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs space-y-1 text-right">
              <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                ماذا سيحدث بعد الإنشاء؟
              </div>
              <p className="text-muted-foreground leading-snug">
                سيتم الدخول فوراً للحساب الجديد، ببيانات معزولة 100% (تليجرام مستقل، مزود AI مستقل، Imgbb مستقل، موقع ووردبريس وفيسبوك ونشر وجدولة خاصة به من الصفر).
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddProfileOpen(false)}>
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNewProfile}
                disabled={creating || !newProfileName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
              >
                {creating ? "جاري البناء والدخول..." : "إنشاء ودخول الحساب الجديد 🚀"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right space-y-2">
            <AlertDialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 text-right">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف البروفايل / الحساب الفرعي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-xs leading-relaxed">
              هل أنت تأكد من رغبتك في حذف البروفايل الحسابي <b>"{profileToDelete?.name}"</b>؟ 
              سيتم مسح بيانات هذا البروفايل المعزولة والتبديل فوراً للحساب الرئيسي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (profileToDelete) {
                  await deleteProfile(profileToDelete.id);
                  setIsDeleteConfirmOpen(false);
                  setProfileToDelete(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              نعم، حذف البروفايل الآن 🗑️
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
