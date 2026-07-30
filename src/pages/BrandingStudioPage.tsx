import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard, Sparkles, Palette as PaletteIcon, ImageIcon,
  LayoutTemplate, Image as ImgIcon, Wand2, Package, FolderOpen, Plug, History, CalendarDays
} from "lucide-react";
import { BrandingDashboard } from "@/components/branding-studio/BrandingDashboard";
import { BrandIdentityStepper } from "@/components/branding-studio/BrandIdentityStepper";
import { LogoGeneratorPanel } from "@/components/branding-studio/LogoGeneratorPanel";
import { ProfileCoverGenerator } from "@/components/branding-studio/ProfileCoverGenerator";
import { PostTemplateBuilder } from "@/components/branding-studio/PostTemplateBuilder";
import { GeneralBrandImagesPanel } from "@/components/branding-studio/GeneralBrandImagesPanel";
import { GraphicPromptGenerator } from "@/components/branding-studio/GraphicPromptGenerator";
import { BrandKitViewer } from "@/components/branding-studio/BrandKitViewer";
import { BrandAssetLibrary } from "@/components/branding-studio/BrandAssetLibrary";
import { GenerationProviderSettings } from "@/components/branding-studio/GenerationProviderSettings";
import { GenerationLogs } from "@/components/branding-studio/GenerationLogs";
import { SeasonalPromptsPanel } from "@/components/branding-studio/SeasonalPromptsPanel";

export default function BrandingStudioPage() {
  const [tab, setTab] = useState("dashboard");

  const tabs = [
    { v: "dashboard", l: "لوحة البراندنج", I: LayoutDashboard },
    { v: "create", l: "إنشاء هوية", I: Sparkles },
    { v: "logo", l: "مولد اللوجو", I: PaletteIcon },
    { v: "covers", l: "البروفايل والكفرات", I: ImageIcon },
    { v: "templates", l: "قوالب المنشورات", I: LayoutTemplate },
    { v: "general", l: "صور عامة", I: ImgIcon },
    { v: "prompts", l: "برومبتات جرافيك", I: Wand2 },
    { v: "seasonal", l: "موسمي ومناسبات", I: CalendarDays },
    { v: "kits", l: "Brand Kits", I: Package },
    { v: "library", l: "مكتبة التصميمات", I: FolderOpen },
    { v: "providers", l: "مزودي التوليد", I: Plug },
    { v: "logs", l: "سجل التوليد", I: History },
  ];

  return (
    <AppLayout title="البراندنج">
      <div className="p-4 max-w-7xl mx-auto space-y-4" dir="rtl">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max gap-1 h-auto p-1">
              {tabs.map(({ v, l, I }) => (
                <TabsTrigger key={v} value={v} className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
                  <I className="h-3.5 w-3.5" />
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-4"><BrandingDashboard onNavigate={setTab} /></TabsContent>
          <TabsContent value="create" className="mt-4"><BrandIdentityStepper onDone={() => setTab("kits")} /></TabsContent>
          <TabsContent value="logo" className="mt-4"><LogoGeneratorPanel /></TabsContent>
          <TabsContent value="covers" className="mt-4"><ProfileCoverGenerator /></TabsContent>
          <TabsContent value="templates" className="mt-4"><PostTemplateBuilder /></TabsContent>
          <TabsContent value="general" className="mt-4"><GeneralBrandImagesPanel /></TabsContent>
          <TabsContent value="prompts" className="mt-4"><GraphicPromptGenerator /></TabsContent>
          <TabsContent value="seasonal" className="mt-4"><SeasonalPromptsPanel /></TabsContent>
          <TabsContent value="kits" className="mt-4"><BrandKitViewer /></TabsContent>
          <TabsContent value="library" className="mt-4"><BrandAssetLibrary /></TabsContent>
          <TabsContent value="providers" className="mt-4"><GenerationProviderSettings /></TabsContent>
          <TabsContent value="logs" className="mt-4"><GenerationLogs /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
