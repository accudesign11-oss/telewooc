import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Workflow, 
  Package, 
  Link as LinkIcon, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Zap,
  LayoutDashboard,
  FolderTree,
  History,
  User,
  Wand2,
  ImageIcon,
  Moon,
  Sun,
  ChevronUp,
  ChevronDown,
  Trash2,
  Megaphone,
  Palette,
  Brain,
  Code2,
  Sparkles,
  HardDrive,
  Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

// Sidebar Context for sharing state
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarState() {
  const context = useContext(SidebarContext);
  if (!context) {
    return { collapsed: false, setCollapsed: () => {} };
  }
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

const navGroups = [
  {
    title: "الأساسية والأوتوماشن",
    items: [
      { path: "/", label: "لوحة التحكم", icon: LayoutDashboard, description: "نظرة عامة ومؤشرات" },
      { path: "/pipeline", label: "Pipeline", icon: Workflow, description: "مزامنة ومعالجة آلية" },
      { path: "/prompt-generator", label: "Prompt Generator", icon: Wand2, description: "توليد برومبت ذكي" },
      { path: "/products", label: "المنتجات", icon: Package, description: "إدارة متجر WooCommerce" },
      { path: "/import", label: "استيراد", icon: LinkIcon, description: "جلب وتفريغ بالرابط" },
      { path: "/categories", label: "التصنيفات", icon: FolderTree, description: "تصنيفات الأقسام" },
    ]
  },
  {
    title: "استوديو الصور والمحتوى",
    items: [
      { path: "/image-converter", label: "تحويل الصور", icon: ImageIcon, description: "تحويل صيغ لـ WebP" },
      { path: "/product-image-generator", label: "مولد الصور", icon: Wand2, description: "توليد صور AI احترافية" },
      { path: "/gallery-upload", label: "أبلود الجاليري", icon: ImageIcon, description: "ميديا ومكتبة الصور" },
      { path: "/content-brain", label: "مخ خطة المحتوى", icon: Brain, description: "تخطيط استراتيجي للمحتوى" },
      { path: "/social-engine", label: "النشر والجدولة", icon: Megaphone, description: "سوشيال ميديا وتواصل" },
      { path: "/branding-studio", label: "البراندنج", icon: Palette, description: "هوية بصرية وBrand Kit" },
    ]
  },
  {
    title: "ووردبريس والسحابة",
    items: [
      { path: "/wordpress-studio", label: "WordPress Studio", icon: Code2, description: "CSS/JS وتخصيص الموقع" },
      { path: "/google-drive", label: "جوجل درايف", icon: HardDrive, description: "تضمين وتصفح Drive" },
    ]
  },
  {
    title: "النظام والضبط",
    items: [
      { path: "/about-tool", label: "عن الأداة والمهندس", icon: Sparkles, description: "دليل وتطوير م/ أحمد" },
      { path: "/activity", label: "سجل النشاط", icon: History, description: "تتبع وحساب العمليات" },
      { path: "/profile", label: "الملف الشخصي", icon: User, description: "بيانات الحساب" },
      { path: "/clear-data", label: "مسح البيانات", icon: Trash2, description: "تنظيف الذاكرة والكاش" },
      { path: "/settings", label: "الإعدادات", icon: Settings, description: "إعدادات التطبيق" },
    ]
  }
];

export function Sidebar() {
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebarState();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<'top' | 'middle' | 'bottom'>('top');

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = nav;
      if (scrollTop === 0) {
        setScrollState('top');
      } else if (scrollTop + clientHeight >= scrollHeight - 5) {
        setScrollState('bottom');
      } else {
        setScrollState('middle');
      }
    };

    nav.addEventListener('scroll', handleScroll);
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 74 : 265 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-l shadow-2xl z-40 transition-colors duration-300 flex-shrink-0 backdrop-blur-xl",
        isDark 
          ? "bg-slate-950/95 border-slate-800/60 text-slate-100" 
          : "bg-white/95 border-slate-200/80 text-slate-900"
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        "flex items-center h-16 px-3 border-b flex-shrink-0 relative overflow-hidden transition-all",
        isDark ? "border-slate-800/60 bg-slate-900/40" : "border-slate-100 bg-slate-50/50"
      )}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/10 bg-slate-950 p-1 group shrink-0">
                <img src="/telewoo-logo.png" alt="TeleWoo Logo" className="w-full h-full object-cover rounded-xl transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 truncate">
                  TeleWoo Flow
                </span>
                <span className="text-[10px] font-bold text-amber-500/80 tracking-wider uppercase truncate">
                  WooCommerce Engine
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-header"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-10 h-10 rounded-2xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/20 bg-slate-950 p-1 mx-auto"
            >
              <img src="/telewoo-logo.png" alt="TeleWoo Logo" className="w-full h-full object-cover rounded-xl" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className={cn(
              "h-8 w-8 rounded-xl shrink-0 transition-colors",
              isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-800/80" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
            title="انكماش القائمة"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Collapse/Expand Toggle Bar for Collapsed State */}
      {collapsed && (
        <div className={cn(
          "px-2 py-2 border-b flex-shrink-0 flex justify-center",
          isDark ? "border-slate-800/40" : "border-slate-100"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className={cn(
              "w-10 h-8 rounded-xl",
              isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-800/80" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
            title="توسيع القائمة"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Quick Actions & Theme Controls */}
      <div className={cn(
        "px-2.5 py-2.5 border-b flex-shrink-0 flex items-center justify-between gap-1.5",
        isDark ? "border-slate-800/40" : "border-slate-100"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "h-9 transition-all rounded-xl font-bold text-xs gap-2",
            isDark 
              ? "text-slate-300 hover:text-white hover:bg-slate-800/80" 
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
            collapsed ? "w-full justify-center px-0" : "flex-1 justify-start px-2.5"
          )}
        >
          <motion.div
            animate={{ rotate: isDark ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 220 }}
          >
            {isDark ? <Moon className="h-4 w-4 text-amber-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {isDark ? "الوضع الليلي" : "الوضع النهاري"}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Navigation Groups Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scroll Up Control */}
        <motion.button
          onClick={() => navRef.current?.scrollBy({ top: -120, behavior: 'smooth' })}
          className={cn(
            "absolute top-0 left-0 right-0 h-8 z-20 flex items-center justify-center cursor-pointer transition-all",
            scrollState !== 'top' ? "opacity-100" : "opacity-0 pointer-events-none",
            isDark 
              ? "bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent text-amber-400"
              : "bg-gradient-to-b from-white via-white/90 to-transparent text-amber-600"
          )}
        >
          <ChevronUp className="h-4 w-4 animate-bounce" />
        </motion.button>

        {/* Scroll Down Control */}
        <motion.button
          onClick={() => navRef.current?.scrollBy({ top: 120, behavior: 'smooth' })}
          className={cn(
            "absolute bottom-0 left-0 right-0 h-8 z-20 flex items-center justify-center cursor-pointer transition-all",
            scrollState !== 'bottom' ? "opacity-100" : "opacity-0 pointer-events-none",
            isDark 
              ? "bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent text-amber-400"
              : "bg-gradient-to-t from-white via-white/90 to-transparent text-amber-600"
          )}
        >
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.button>

        <nav 
          ref={navRef}
          className="h-full py-4 px-2.5 space-y-5 overflow-y-auto scrollbar-hide"
        >
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed ? (
                <div className="px-2 pb-1.5 pt-1 flex items-center gap-1.5">
                  <Compass className="h-3 w-3 text-amber-500 opacity-70" />
                  <span className={cn(
                    "text-[10.5px] font-extrabold uppercase tracking-wider",
                    isDark ? "text-slate-500" : "text-slate-400"
                  )}>
                    {group.title}
                  </span>
                </div>
              ) : (
                <div className="h-px bg-slate-800/40 my-2 mx-1" />
              )}

              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? `${item.label} - ${item.description}` : undefined}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "text-slate-950 font-bold shadow-md shadow-amber-500/10"
                        : isDark 
                          ? "text-slate-400 hover:text-white hover:bg-slate-900/80"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveIndicator"
                        className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-xl shadow-md"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    
                    <Icon className={cn(
                      "h-4.5 w-4.5 flex-shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110",
                      isActive 
                        ? "text-slate-950" 
                        : isDark 
                          ? "text-slate-400 group-hover:text-amber-400"
                          : "text-slate-500 group-hover:text-amber-600"
                    )} />
                    
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          className="relative z-10 flex flex-col min-w-0 overflow-hidden flex-1"
                        >
                          <span className={cn("text-xs font-bold truncate leading-snug", isActive ? "text-slate-950" : "")}>
                            {item.label}
                          </span>
                          <span className={cn(
                            "text-[10px] truncate leading-none mt-0.5 opacity-80",
                            isActive ? "text-slate-900/80" : isDark ? "text-slate-500" : "text-slate-400"
                          )}>
                            {item.description}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Branding */}
      {!collapsed && (
        <div className={cn(
          "p-3 border-t flex-shrink-0 flex justify-center backdrop-blur-md",
          isDark 
            ? "border-slate-800/60 bg-slate-950/80" 
            : "border-slate-100 bg-slate-50/80"
        )}>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="text-amber-500/90 font-extrabold">v1.0</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 group cursor-pointer">
              <motion.div
                 animate={{ rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.15, 1] }}
                 transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
              </motion.div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600 font-extrabold">
                برمجة م/ أحمد عبدالعظيم
              </span>
            </span>
          </div>
        </div>
      )}
    </motion.aside>
  );
}