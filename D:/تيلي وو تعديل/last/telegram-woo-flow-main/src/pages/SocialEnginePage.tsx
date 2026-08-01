import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Link as LinkIcon,
  PenSquare,
  Wand2,
  Share2,
  Eye,
  CalendarClock,
  Plug,
  CalendarRange,
  ListChecks,
  Newspaper,
} from "lucide-react";
import { Send } from "lucide-react";
import { SocialEngineDashboard } from "@/components/social-engine/SocialEngineDashboard";
import { ProductUrlAnalyzer } from "@/components/social-engine/ProductUrlAnalyzer";
import { SocialPostBuilder } from "@/components/social-engine/SocialPostBuilder";
import { SocialMediaPromptGenerator } from "@/components/social-engine/SocialMediaPromptGenerator";
import { SocialConnectionsManager } from "@/components/social-engine/SocialConnectionsManager";
import { SocialSchedulerPanel } from "@/components/social-engine/SocialSchedulerPanel";
import { SocialPublishLogs } from "@/components/social-engine/SocialPublishLogs";
import { ContentPlannerPanel } from "@/components/social-engine/ContentPlannerPanel";
import { PagePostsTab } from "@/pages/social-engine/tabs/PagePostsTab";
import { BulkPublishTab } from "@/components/social-engine/BulkPublishTab";

export default function SocialEnginePage() {
  const [tab, setTab] = useState("dashboard");
  const [analysisSeed, setAnalysisSeed] = useState<any>(null);

  const tabs = [
    { v: "dashboard", l: "لوحة النشر", I: LayoutDashboard },
    { v: "analyze", l: "تحليل منتج", I: LinkIcon },
    { v: "compose", l: "إنشاء منشور", I: PenSquare },
    { v: "bulk", l: "نشر دفعي", I: Send },
    { v: "prompts", l: "برومبتات الوسائط", I: Wand2 },
    { v: "page-posts", l: "منشورات الصفحة", I: Newspaper },
    { v: "platforms", l: "المنصات", I: Share2 },
    { v: "scheduler", l: "الجدولة", I: CalendarClock },
    { v: "connect", l: "ربط المنصات", I: Plug },
    { v: "planner", l: "خطة المحتوى", I: CalendarRange },
    { v: "logs", l: "سجل النشر", I: ListChecks },
  ];

  return (
    <AppLayout title="النشر والجدولة">
      <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-4" dir="rtl">
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

          <TabsContent value="dashboard" className="mt-4">
            <SocialEngineDashboard onNavigate={setTab} />
          </TabsContent>

          <TabsContent value="analyze" className="mt-4">
            <ProductUrlAnalyzer
              onUseAnalysis={(a) => {
                setAnalysisSeed(a);
                setTab("compose");
              }}
            />
          </TabsContent>

          <TabsContent value="compose" className="mt-4">
            <SocialPostBuilder seed={analysisSeed} onDone={() => setTab("scheduler")} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <BulkPublishTab />
          </TabsContent>

          <TabsContent value="prompts" className="mt-4">
            <SocialMediaPromptGenerator seed={analysisSeed} />
          </TabsContent>

          <TabsContent value="page-posts" className="mt-4">
            <PagePostsTab />
          </TabsContent>

          <TabsContent value="platforms" className="mt-4">
            <SocialConnectionsManager compact />
          </TabsContent>

          <TabsContent value="scheduler" className="mt-4">
            <SocialSchedulerPanel />
          </TabsContent>

          <TabsContent value="connect" className="mt-4">
            <SocialConnectionsManager />
          </TabsContent>

          <TabsContent value="planner" className="mt-4">
            <ContentPlannerPanel />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <SocialPublishLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
