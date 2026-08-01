import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Image,
  ImagePlus,
  Upload,
  History,
  Megaphone,
  Palette,
  Brain,
  Code2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { path: "/", label: "الرئيسية", icon: LayoutDashboard },
  { path: "/pipeline", label: "Pipeline", icon: Workflow },
  { path: "/prompt-generator", label: "Prompt", icon: Wand2 },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/import", label: "استيراد", icon: LinkIcon },
  { path: "/categories", label: "التصنيفات", icon: FolderTree },
  { path: "/image-converter", label: "تحويل صور", icon: Image },
  { path: "/product-image-generator", label: "توليد صور", icon: ImagePlus },
  { path: "/gallery-upload", label: "أبلود الجاليري", icon: Upload },
  { path: "/content-brain", label: "مخ الخطة", icon: Brain },
  { path: "/social-engine", label: "النشر", icon: Megaphone },
  { path: "/branding-studio", label: "البراندنج", icon: Palette },
  { path: "/wordpress-studio", label: "WP Studio", icon: Code2 },
  { path: "/activity", label: "السجل", icon: History },
  { path: "/profile", label: "حسابي", icon: User },
  { path: "/clear-data", label: "مسح البيانات", icon: Trash2 },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

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

  // Scroll to active item on mount and route change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeItem = activeRef.current;
      const containerWidth = container.offsetWidth;
      const itemLeft = activeItem.offsetLeft;
      const itemWidth = activeItem.offsetWidth;
      
      // Center the active item
      const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass border-t border-border/50 safe-area-bottom bg-gradient-to-t from-background/95 to-background/80 backdrop-blur-xl">
        <div 
          ref={scrollRef}
          className="flex items-center gap-1 h-16 px-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                ref={isActive ? activeRef : null}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-[64px] h-14 px-2 rounded-xl touch-manipulation transition-all duration-200",
                  isActive 
                    ? "bg-primary/10" 
                    : "hover:bg-muted/50 active:bg-muted"
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                <motion.div
                  className="flex flex-col items-center gap-0.5"
                  whileTap={{ scale: 0.92 }}
                >
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -2 : 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors duration-200",
                      isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors duration-200",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors duration-200 whitespace-nowrap",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="relative flex flex-col items-center justify-center min-w-[64px] h-14 px-2 rounded-xl touch-manipulation transition-all duration-200 hover:bg-muted/50 active:bg-muted"
            style={{ scrollSnapAlign: 'center' }}
          >
            <motion.div
              className="flex flex-col items-center gap-0.5"
              whileTap={{ scale: 0.92 }}
            >
              <div className="p-1.5 rounded-lg transition-colors duration-200">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-[10px] font-medium text-destructive whitespace-nowrap">
                خروج
              </span>
            </motion.div>
          </button>
        </div>
      </div>
    </nav>
  );
}
