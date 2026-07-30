import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function GenerationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("branding_generation_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setLogs(data || []));
  }, []);

  if (logs.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد سجل توليد بعد.</CardContent></Card>;

  return (
    <div className="space-y-2" dir="rtl">
      {logs.map(l => (
        <Card key={l.id}>
          <CardContent className="p-3 text-sm flex justify-between items-start">
            <div>
              <div className="font-medium">{l.provider || "—"}</div>
              <div className="text-xs text-muted-foreground">{l.request_summary}</div>
              {l.error_message && <div className="text-xs text-destructive mt-1">{l.error_message}</div>}
            </div>
            <div className="text-left">
              <Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge>
              <div className="text-xs text-muted-foreground mt-1">{new Date(l.created_at).toLocaleString("ar-EG")}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
