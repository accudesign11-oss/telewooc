import { AppLayout } from "@/components/layout/AppLayout";
import { PromptGeneratorTab } from "@/components/pipeline/PromptGeneratorTab";

export default function PromptGeneratorPage() {
  return (
    <AppLayout title="Prompt Generator">
      <div className="p-4">
        <PromptGeneratorTab />
      </div>
    </AppLayout>
  );
}
