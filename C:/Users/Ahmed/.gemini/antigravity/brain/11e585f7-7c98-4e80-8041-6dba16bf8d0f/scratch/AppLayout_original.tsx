import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarProvider, useSidebarState } from "./Sidebar";
import { MobileSideNav } from "./MobileSideNav";
import { TopBar } from "./TopBar";
import { AIFloatingMenu } from "./AIFloatingMenu";
import { motion, AnimatePresence } from "framer-motion";
import { Code2 } from "lucide-react";
import { initGlobalClickSound } from "@/lib/sound";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

function LayoutContent({ children, title }: AppLayoutProps) {
  const { collapsed } = useSidebarState();
  const location = useLocation();

  useEffect(() => {
    initGlobalClickSound();
  }, []);
  
  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-hidden" dir="rtl">
      {/* Sidebar (Desktop) - Sticky */}
      <Sidebar />

      {/* Main Content - Scrollable */}
      <motion.div 
        className="flex-1 flex flex-col min-h-screen overflow-y-auto overflow-x-hidden"
        initial={false}
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Top Bar */}
        <TopBar title={title} />

        {/* Page Content with Smooth Fade/Slide Transition */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-1 pb-20 md:pb-10 w-full max-w-full overflow-x-hidden"
        >
          {children}
        </motion.main>

        {/* Designer credit */}
        <div className="fixed bottom-4 left-4 md:relative flex justify-center py-2 pointer-events-none z-30 md:border-t md:border-border md:bg-background">
          <motion.a
            href="#"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => e.preventDefault()}
            className="designer-credit pointer-events-auto shadow-lg md:shadow-none"
          >
            <motion.div
               animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
               transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Code2 className="h-4 w-4 designer-credit-icon" />
            </motion.div>
            <span className="designer-credit-text">تصميم وبرمجة م/ أحمد عبدالعظيم</span>
          </motion.a>
        </div>
      </motion.div>

      {/* Mobile Side Drawer Navigation */}
      <MobileSideNav />
      
      {/* AI Floating Menu */}
      <AIFloatingMenu />
    </div>
  );
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent title={title}>{children}</LayoutContent>
    </SidebarProvider>
  );
}
