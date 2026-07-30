import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Sparkles, X, GripVertical, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AIService {
  name: string;
  url: string;
  color: string;
  icon: string | React.ReactNode;
  isStore?: boolean;
}

const defaultAiServices: AIService[] = [
  { 
    name: "Claude", 
    url: "https://claude.ai", 
    color: "from-orange-500 to-amber-500",
    icon: "🧠"
  },
  { 
    name: "Gemini", 
    url: "https://gemini.google.com", 
    color: "from-blue-500 to-cyan-500",
    icon: "✨"
  },
  { 
    name: "ChatGPT", 
    url: "https://chat.openai.com", 
    color: "from-emerald-500 to-green-500",
    icon: "💬"
  },
  { 
    name: "DeepSeek", 
    url: "https://chat.deepseek.com", 
    color: "from-purple-500 to-violet-500",
    icon: "🔍"
  },
  { 
    name: "ZeroAI", 
    url: "https://zero.ai", 
    color: "from-indigo-500 to-blue-500",
    icon: "🚀"
  },
  { 
    name: "AI Studio", 
    url: "https://ai.studio/apps/drive/1GoR6XevnPOsy1HW4emVG7XpcFS1AK0I8?fullscreenApplet=true",
    color: "from-pink-500 to-rose-500",
    icon: "🎨"
  },
  {
    name: "Kimi",
    url: "https://kimi.moonshot.cn",
    color: "from-gray-700 to-slate-900",
    icon: "🌑"
  },
  {
    name: "Copilot",
    url: "https://outlook.cloud.microsoft/host/b5abf2ae-c16b-4310-8f8a-d3bcdb52f162/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429",
    color: "from-blue-600 via-indigo-600 to-purple-600",
    icon: "🤖"
  },
];

const STORAGE_KEY = 'ai-floating-menu-position';

export function AIFloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  
  // Load saved position
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { x: 0, y: 0 };
  });

  // Fetch WooCommerce store URL from settings
  useEffect(() => {
    const fetchStoreUrl = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settings } = await supabase
          .from("settings")
          .select("value")
          .eq("user_id", user.id)
          .eq("key", "woocommerce")
          .maybeSingle();

        if (settings?.value) {
          const wooSettings = settings.value as { store_url?: string };
          if (wooSettings.store_url) {
            // Ensure URL has protocol
            let url = wooSettings.store_url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }
            // Add /wp-admin for admin access
            setStoreUrl(url.replace(/\/$/, '') + '/wp-admin');
          }
        }
      } catch (error) {
        console.error("Error fetching store URL:", error);
      }
    };

    fetchStoreUrl();
  }, []);

  // Build services list with dynamic store
  const aiServices: AIService[] = [
    ...(storeUrl ? [{
      name: "متجري",
      url: storeUrl,
      color: "from-violet-600 to-purple-600",
      icon: <Store className="h-6 w-6 text-white" />,
      isStore: true,
    }] : []),
    ...defaultAiServices,
  ];

  const handleServiceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Save position when drag ends
  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    setIsDragging(false);
    const newPosition = { x: info.point.x, y: info.point.y };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {}
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Drag constraints - full screen */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

      {/* Floating Action Button - Draggable */}
      <motion.div
        drag
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-24 left-4 md:bottom-20 md:left-4 z-50 touch-none"
        style={{ x: position.x, y: position.y }}
      >
        <div className="relative flex items-center">
          {/* Drag Handle - Small pill on the side */}
          <motion.div
            onPointerDown={(e) => {
              e.stopPropagation();
              dragControls.start(e);
            }}
            className={cn(
              "absolute -left-3 top-1/2 -translate-y-1/2",
              "w-5 h-8 rounded-full cursor-grab active:cursor-grabbing",
              "bg-muted/80 backdrop-blur-sm border border-border/50",
              "flex items-center justify-center",
              "opacity-60 hover:opacity-100 transition-opacity",
              "touch-none"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </motion.div>

          {/* Main Button */}
          <motion.button
            whileHover={{ scale: isDragging ? 1 : 1.1 }}
            whileTap={{ scale: isDragging ? 1 : 0.9 }}
            onClick={() => !isDragging && setIsOpen(!isOpen)}
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-info",
              "shadow-2xl shadow-primary/40",
              "transition-colors duration-300"
            )}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-6 w-6 text-primary-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Subtle pulse ring */}
            {!isOpen && !isDragging && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-primary/50"
                animate={{ 
                  scale: [1, 1.4],
                  opacity: [0.6, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Full Screen Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/90 backdrop-blur-md flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            {/* Services Grid */}
            <motion.div 
              className="grid grid-cols-3 gap-4 p-6 max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {aiServices.map((service, index) => (
                <motion.button
                  key={service.name}
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20, 
                    scale: 0.8,
                    transition: { delay: (aiServices.length - index - 1) * 0.03 }
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleServiceClick(service.url)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg text-2xl",
                    service.color
                  )}>
                    {service.icon}
                  </div>
                  <span className="text-xs font-medium text-foreground/80">
                    {service.name}
                  </span>
                </motion.button>
              ))}
            </motion.div>


            {/* Close hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-8 text-sm text-muted-foreground"
            >
              اضغط في أي مكان للإغلاق
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
