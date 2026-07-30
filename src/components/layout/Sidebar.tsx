import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Workflow, 
  Package, 
  Link as LinkIcon, 
  Bell, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Zap,
  LayoutDashboard,
  BarChart3,
  FileText,
  FolderTree,
  Clock,
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
  Code2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from "react";
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

const navItems = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard, description: "نظرة عامة" },
  { path: "/pipeline", label: "Pipeline", icon: Workflow, description: "مزامنة ومعالجة" },
  { path: "/prompt-generator", label: "Prompt Generator", icon: Wand2, description: "توليد برومبت" },
  { path: "/products", label: "المنتجات", icon: Package, description: "إدارة المنتجات" },
  { path: "/import", label: "استيراد", icon: LinkIcon, description: "استيراد بالرابط" },
  { path: "/categories", label: "التصنيفات", icon: FolderTree, description: "تصنيفات WooCommerce" },
  { path: "/image-converter", label: "تحويل الصور", icon: ImageIcon, description: "تحويل صيغ الصور" },
  { path: "/product-image-generator", label: "مولد الصور", icon: Wand2, description: "توليد صور AI" },
  { path: "/gallery-upload", label: "أبلود الجاليري", icon: ImageIcon, description: "WebP إلى ميديا الموقع" },
  { path: "/content-brain", label: "مخ خطة المحتوى", icon: Brain, description: "تخطيط ذكي للمحتوى" },
  { path: "/social-engine", label: "النشر والجدولة", icon: Megaphone, description: "سوشيال ميديا ونشر فعلي" },
  { path: "/branding-studio", label: "البراندنج", icon: Palette, description: "هوية بصرية وBrand Kit" },
  { path: "/wordpress-studio", label: "WordPress Studio", icon: Code2, description: "CSS/JS ذكي للموقع" },
  { path: "/activity", label: "سجل النشاط", icon: History, description: "تتبع العمليات" },
  { path: "/profile", label: "الملف الشخصي", icon: User, description: "بياناتك" },
  { path: "/clear-data", label: "مسح البيانات", icon: Trash2, description: "تفريغ Cloud / Cache" },
  { path: "/settings", label: "الإعدادات", icon: Settings, description: "إعدادات التطبيق" },
];

export function Sidebar() {
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebarState();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<'top' | 'middle' | 'bottom'>('top');

  // Handle scroll detection for glow effect
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
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-l shadow-xl z-40 transition-colors duration-300 flex-shrink-0",
        isDark 
          ? "bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 border-slate-700/40" 
          : "bg-gradient-to-b from-white via-slate-50 to-white border-slate-200"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex items-center h-14 px-3 border-b flex-shrink-0",
        isDark ? "border-slate-700/40 bg-slate-900/60" : "border-slate-200 bg-white/80"
      )}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className={cn(
                "font-semibold text-base",
                isDark ? "text-white" : "text-slate-800"
              )}>TeleWoo</span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md mx-auto"
            >
              <Zap className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className={cn(
              "h-7 w-7",
              isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-700/50" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Expand button when collapsed */}
      {collapsed && (
        <div className={cn(
          "px-2 py-2 border-b flex-shrink-0",
          isDark ? "border-slate-700/30" : "border-slate-200"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className={cn(
              "w-full h-8",
              isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-700/50" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Theme Toggle */}
      <div className={cn(
        "px-2 py-2 border-b flex-shrink-0",
        isDark ? "border-slate-700/30" : "border-slate-200"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "w-full gap-2 transition-all",
            isDark 
              ? "text-slate-400 hover:text-white hover:bg-slate-700/50" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <motion.div
            animate={{ rotate: isDark ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm overflow-hidden"
              >
                {isDark ? "الوضع الليلي" : "الوضع النهاري"}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Navigation - Scrollable with Glow Effects */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scroll Up Button */}
        <motion.button
          onClick={() => navRef.current?.scrollBy({ top: -100, behavior: 'smooth' })}
          className={cn(
            "absolute top-0 left-0 right-0 h-7 z-20 flex items-center justify-center cursor-pointer transition-all",
            scrollState !== 'top' ? "opacity-100" : "opacity-0 pointer-events-none",
            isDark 
              ? "bg-gradient-to-b from-slate-800 via-slate-800/90 to-transparent hover:from-primary/30"
              : "bg-gradient-to-b from-white via-white/90 to-transparent hover:from-primary/20"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollState !== 'top' ? 1 : 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronUp className={cn(
            "h-4 w-4 animate-bounce",
            isDark ? "text-primary" : "text-primary"
          )} />
        </motion.button>
        
        {/* Scroll Down Button */}
        <motion.button
          onClick={() => navRef.current?.scrollBy({ top: 100, behavior: 'smooth' })}
          className={cn(
            "absolute bottom-0 left-0 right-0 h-7 z-20 flex items-center justify-center cursor-pointer transition-all",
            scrollState !== 'bottom' ? "opacity-100" : "opacity-0 pointer-events-none",
            isDark 
              ? "bg-gradient-to-t from-slate-800 via-slate-800/90 to-transparent hover:from-primary/30"
              : "bg-gradient-to-t from-white via-white/90 to-transparent hover:from-primary/20"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollState !== 'bottom' ? 1 : 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronDown className={cn(
            "h-4 w-4 animate-bounce",
            isDark ? "text-primary" : "text-primary"
          )} />
        </motion.button>

        <nav 
          ref={navRef}
          className="h-full py-8 px-2 space-y-0.5 overflow-y-auto scrollbar-hide"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "text-white shadow-md"
                    : isDark 
                      ? "text-slate-400 hover:text-white hover:bg-slate-700/40"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 bg-gradient-to-l from-primary to-accent rounded-lg shadow-lg"
                    style={{ boxShadow: "0 4px 15px hsl(var(--primary) / 0.4)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <Icon className={cn(
                  "h-4.5 w-4.5 flex-shrink-0 relative z-10 transition-colors",
                  isActive 
                    ? "text-white" 
                    : isDark 
                      ? "text-slate-500 group-hover:text-primary"
                      : "text-slate-400 group-hover:text-primary"
                )} />
                
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 flex flex-col min-w-0 overflow-hidden"
                    >
                      <span className="font-medium text-sm truncate">{item.label}</span>
                      <span className={cn(
                        "text-[10px] truncate",
                        isActive 
                          ? "text-white/70" 
                          : isDark ? "text-slate-500" : "text-slate-400"
                      )}>
                        {item.description}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className={cn(
          "p-3 border-t flex-shrink-0 flex justify-center",
          isDark 
            ? "border-slate-700/30 bg-slate-900/40" 
            : "border-slate-200 bg-slate-50/50"
        )}>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>TeleWoo v1.0</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 group cursor-pointer">
              <motion.div
                 animate={{ rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Code2 className="h-3.5 w-3.5 text-primary drop-shadow-[0_0_3px_rgba(var(--primary),0.5)] group-hover:text-accent transition-colors" />
              </motion.div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-bold">م/ أحمد عبدالعظيم</span>
            </span>
          </div>
        </div>
      )}
    </motion.aside>
  );
}