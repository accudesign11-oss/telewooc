import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Workflow, 
  Package, 
  Link as LinkIcon, 
  Settings,
  LayoutDashboard,
  FolderTree,
  Clock,
  User,
  LogOut,
  Wand2,
  Image as ImageIcon,
  Upload,
  History,
  Megaphone,
  Palette,
  Brain,
  Code2,
  Trash2,
  Menu,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard, description: "نظرة عامة" },
  { path: "/pipeline", label: "Pipeline", icon: Workflow, description: "مزامنة ومعالجة" },
  { path: "/prompt-generator", label: "Prompt Generator", icon: Wand2, description: "توليد برومبت" },
  { path: "/products", label: "المنتجات", icon: Package, description: "إدارة المنتجات" },
  { path: "/import", label: "استيراد", icon: LinkIcon, description: "استيراد بالرابط" },
  { path: "/categories", label: "التصنيفات", icon: FolderTree, description: "تصنيفات WooCommerce" },
  { path: "/image-converter", label: "تحويل الصور", icon: ImageIcon, description: "تحويل صيغ الصور" },
  { path: "/product-image-generator", label: "مولد الصور", icon: Wand2, description: "توليد صور AI" },
  { path: "/gallery-upload", label: "أبلود الجاليري", icon: Upload, description: "WebP إلى ميديا الموقع" },
  { path: "/content-brain", label: "مخ خطة المحتوى", icon: Brain, description: "تخطيط ذكي للمحتوى" },
  { path: "/social-engine", label: "النشر والجدولة", icon: Megaphone, description: "سوشيال ميديا ونشر فعلي" },
  { path: "/branding-studio", label: "البراندنج", icon: Palette, description: "هوية بصرية وBrand Kit" },
  { path: "/wordpress-studio", label: "WordPress Studio", icon: Code2, description: "CSS/JS ذكي للموقع" },
  { path: "/activity", label: "سجل النشاط", icon: History, description: "تتبع العمليات" },
  { path: "/profile", label: "الملف الشخصي", icon: User, description: "بياناتك" },
  { path: "/clear-data", label: "مسح البيانات", icon: Trash2, description: "تفريغ Cloud / Cache" },
  { path: "/settings", label: "الإعدادات", icon: Settings, description: "إعدادات التطبيق" },
];

export function MobileSideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Close drawer on page navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "تم تسجيل الخروج", description: "تم تسجيل خروجك بنجاح" });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل تسجيل الخروج", variant: "destructive" });
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Mobile Only) */}
      <motion.div 
        className="fixed bottom-4 right-4 z-50 md:hidden"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full shadow-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground border-2 border-background"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Menu className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Side Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className={cn(
              "fixed top-0 right-0 bottom-0 z-50 flex flex-col h-full shadow-2xl border-l md:hidden transition-all duration-300",
              isExpanded ? "w-[280px]" : "w-[80px]",
              isDark 
                ? "bg-slate-950/95 border-slate-800 text-slate-100" 
                : "bg-white/95 border-slate-200 text-slate-900"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                {isExpanded && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0 }} 
                    animate={{ opacity: 1, width: "auto" }} 
                    className="font-bold text-base truncate"
                  >
                    TeleWoo
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title={isExpanded ? "تضييق القائمة" : "توسيع القائمة"}
                >
                  {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Links Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "text-white font-medium"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMobileNav"
                        className="absolute inset-0 bg-gradient-to-l from-primary to-accent rounded-xl shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <Icon className={cn(
                      "h-5 w-5 shrink-0 relative z-10",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                    )} />

                    {isExpanded && (
                      <div className="relative z-10 flex flex-col min-w-0 flex-1 overflow-hidden">
                        <span className="text-sm truncate">{item.label}</span>
                        <span className={cn(
                          "text-[10px] truncate",
                          isActive ? "text-white/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t shrink-0 space-y-2 bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={cn(
                  "w-full justify-start gap-3 h-9",
                  !isExpanded && "justify-center px-0"
                )}
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
                {isExpanded && <span className="text-xs">{isDark ? "الوضع النهاري" : "الوضع الليلي"}</span>}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={cn(
                  "w-full justify-start gap-3 h-9 text-destructive hover:bg-destructive/10",
                  !isExpanded && "justify-center px-0"
                )}
              >
                <LogOut className="h-4 w-4" />
                {isExpanded && <span className="text-xs font-semibold">تسجيل الخروج</span>}
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
