import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SocialPublishLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("social_publish_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" /> سجل النشر
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-sm text-muted-foreground py-6 text-center">جاري التحميل...</div> :
          !logs.length ? <div className="text-sm text-muted-foreground py-6 text-center">لا توجد سجلات</div> :
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="border rounded p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge>
                  <span className="font-medium">{l.platform}</span>
                  <span className="text-muted-foreground text-xs">{l.action}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{new Date(l.created_at).toLocaleString("ar-EG")}</span>
                </div>
                {l.published_url && <a href={l.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{l.published_url}</a>}
                {l.error_message && <div className="text-xs text-destructive mt-1">{l.error_message}</div>}
              </div>
            ))}
          </div>
        }
      </CardContent>
    </Card>
  );
}
