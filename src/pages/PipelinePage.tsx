import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, 
  FileEdit, 
  Eye,
  List,
  Layers,
  Wand2,
  ImageIcon,
  Star,
  ChevronLeft
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InboxTab } from "@/components/pipeline/InboxTab";
import { DraftBuilderTab } from "@/components/pipeline/DraftBuilderTab";
import { VariationsTab } from "@/components/pipeline/VariationsTab";
import { ReviewTab } from "@/components/pipeline/ReviewTab";
import { ReviewsTab } from "@/components/pipeline/ReviewsTab";
import { DraftsListTab } from "@/components/pipeline/DraftsListTab";
import { PromptGeneratorTab } from "@/components/pipeline/PromptGeneratorTab";
import { WebPConverterTool } from "@/components/pipeline/WebPConverterTool";
import { AutoPipelineBar, AutoPipelineRunnerModal, AutoPipelineSettings } from "@/components/pipeline/AutoPipelineBar";

const pipelineSteps = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "drafts", label: "المسودات", icon: List },
  { id: "prompt", label: "Prompt", icon: Wand2 },
  { id: "webp", label: "WebP", icon: ImageIcon },
  { id: "draft", label: "تحرير", icon: FileEdit },
  { id: "variations", label: "المتغيرات", icon: Layers },
  { id: "reviews", label: "ريفيوهات", icon: Star },
  { id: "review", label: "مراجعة", icon: Eye },
];

export default function PipelinePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState("inbox");
  const [prevStepIndex, setPrevStepIndex] = useState(0);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // Auto Pipeline Settings state
  const [autoSettings, setAutoSettings] = useState<AutoPipelineSettings>({
    enabled: true,
    enableProfessionalCss: true,
    enableAutoReviews: true,
  });
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [initialBulkProducts, setInitialBulkProducts] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    const bulkImportProducts = (location.state as any)?.bulkImportProducts;
    if (bulkImportProducts && bulkImportProducts.length > 0) {
      setInitialBulkProducts(bulkImportProducts);
      setAutoModalOpen(true);
      window.history.replaceState({}, document.title);
    } else {
      const queryDraftId = searchParams.get("draftId");
      const stateDraftId = (location.state as any)?.productId;
      const targetDraftId = queryDraftId || stateDraftId;
      if (targetDraftId) {
        setCurrentProductId(targetDraftId);
        setActiveStep("draft");
      }
    }
  }, [searchParams, location]);

  const currentStepIndex = pipelineSteps.findIndex(s => s.id === activeStep);
  const direction = currentStepIndex >= prevStepIndex ? 1 : -1;

  const changeStep = (newStep: string) => {
    const newIdx = pipelineSteps.findIndex(s => s.id === newStep);
    setPrevStepIndex(currentStepIndex);
    setActiveStep(newStep);
  };

  const handleInboxNext = (productId: string) => {
    setCurrentProductId(productId);
    changeStep("draft");
  };

  const handleEditDraft = (productId: string) => {
    setCurrentProductId(productId);
    changeStep("draft");
  };

  const handleReset = () => {
    setCurrentProductId(null);
    changeStep("inbox");
  };

  const handleDeleteAndReset = () => {
    setCurrentProductId(null);
    changeStep("drafts");
  };

  return (
    <AppLayout title="Pipeline">
      <div className="p-3 sm:p-4 space-y-4 max-w-full overflow-x-hidden">
        {/* Auto Pipeline Bar */}
        <AutoPipelineBar 
          settings={autoSettings}
          onSettingsChange={setAutoSettings}
          onStartAutoPipeline={() => setAutoModalOpen(true)}
        />

        {/* Pipeline Stepper */}
        <Card className="border-primary/20 bg-gradient-to-r from-background via-muted/20 to-background shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
              {pipelineSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isPast = currentStepIndex > index;
                const Icon = step.icon;
                
                // Hide draft/variations/reviews/review if no product selected
                if ((step.id === "draft" || step.id === "variations" || step.id === "reviews" || step.id === "review") && !currentProductId && !isActive) {
                  return null;
                }

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (step.id === "inbox" || step.id === "drafts" || step.id === "prompt" || step.id === "webp") {
                        if (step.id === "inbox") handleReset();
                        else if (step.id === "prompt") changeStep("prompt");
                        else if (step.id === "webp") changeStep("webp");
                        else changeStep("drafts");
                      } else if ((isPast || isActive || currentProductId) && currentProductId) {
                        changeStep(step.id);
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-2xl transition-all duration-300 min-w-[75px] sm:min-w-[90px] shrink-0",
                      isActive 
                        ? "text-primary-foreground font-semibold shadow-lg scale-105" 
                        : isPast
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activePipelinePill"
                        className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent rounded-2xl"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-center">
                      <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300", isActive && "scale-110")} />
                    </div>
                    <span className="relative z-10 text-[11px] sm:text-xs font-medium whitespace-nowrap">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Directional Animated Step Content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 25, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -direction * 25, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="w-full max-w-full overflow-x-hidden"
          >
            {activeStep === "inbox" && (
              <InboxTab onNext={handleInboxNext} />
            )}
            {activeStep === "drafts" && (
              <DraftsListTab 
                onEditDraft={handleEditDraft}
              />
            )}
            {activeStep === "prompt" && (
              <PromptGeneratorTab />
            )}
            {activeStep === "webp" && (
              <WebPConverterTool />
            )}
            {activeStep === "draft" && currentProductId && (
              <DraftBuilderTab 
                productId={currentProductId}
                onNext={() => changeStep("variations")} 
                onBack={() => changeStep("drafts")}
                onDelete={handleDeleteAndReset}
              />
            )}
            {activeStep === "variations" && currentProductId && (
              <VariationsTab 
                productId={currentProductId}
                onNext={() => changeStep("reviews")} 
                onBack={() => changeStep("draft")} 
              />
            )}
            {activeStep === "reviews" && currentProductId && (
              <ReviewsTab
                productId={currentProductId}
                onNext={() => changeStep("review")}
                onBack={() => changeStep("variations")}
              />
            )}
            {activeStep === "review" && currentProductId && (
              <ReviewTab 
                productId={currentProductId}
                onBack={() => changeStep("reviews")}
                onReset={handleReset}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Auto Pipeline Runner Modal */}
        <AutoPipelineRunnerModal
          settings={autoSettings}
          isOpen={autoModalOpen}
          initialProducts={initialBulkProducts}
          onClose={() => {
            setAutoModalOpen(false);
            setInitialBulkProducts(undefined);
          }}
          onPublished={() => {
            setAutoModalOpen(false);
            setInitialBulkProducts(undefined);
            changeStep("drafts");
          }}
        />
      </div>
    </AppLayout>
  );
}
