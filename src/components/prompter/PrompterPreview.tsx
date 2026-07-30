import { SystemData } from "./PrompterWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function PrompterPreview({ data }: { data: SystemData }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 pb-4 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">معاينة السيستم</CardTitle>
          <Badge variant={data.status === "مسودة" ? "outline" : "default"}>
            {data.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-6">
            <PreviewSection title="اسم السيستم" content={data.name || "لم يحدد بعد"} />
            <PreviewSection title="المجال" content={data.domain || "لم يحدد بعد"} />
            <PreviewSection title="الدور" content={data.targetUser || "لم يحدد بعد"} />
            <PreviewSection title="المهمة" content={data.task || "لم يحدد بعد"} />
            
            <PreviewList title="الأوامر" items={data.commands} placeholder="لم يتم إضافة أوامر" />
            <PreviewList title="قواعد التنفيذ" items={data.rules} placeholder="لم يتم إضافة قواعد" />
            <PreviewList title="المدخلات" items={data.inputs} placeholder="لم يتم تحديد المدخلات" />
            <PreviewList title="المخرجات" items={data.outputs} placeholder="لم يتم تحديد المخرجات" />
            <PreviewList title="الهوية" items={data.identity} placeholder="لم يتم تحديد الهوية" />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PreviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-1">{title}</h3>
      <p className="text-sm bg-muted/50 p-2 rounded-md border border-border/50">{content}</p>
    </div>
  );
}

function PreviewList({ title, items, placeholder }: { title: string; items: string[]; placeholder: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-1">{title}</h3>
      {items.length > 0 ? (
        <ul className="list-disc list-inside text-sm bg-muted/50 p-2 rounded-md border border-border/50 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm bg-muted/50 p-2 rounded-md border border-border/50 text-muted-foreground italic">
          {placeholder}
        </p>
      )}
    </div>
  );
}
