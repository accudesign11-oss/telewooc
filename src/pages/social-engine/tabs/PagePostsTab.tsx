import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PagePostCard, type PagePost } from "@/components/social-engine/PagePostCard";
import { RepostComposer } from "@/components/social-engine/RepostComposer";
import { VideoPromptDialog } from "@/components/social-engine/VideoPromptDialog";
import { PostRewriteDialog } from "@/components/social-engine/PostRewriteDialog";

export function PagePostsTab() {
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [composer, setComposer] = useState<{ open: boolean; post: PagePost | null; mode: "publish" | "schedule"; initialText?: string; extraMedia?: any[] }>({ open: false, post: null, mode: "publish" });
  const [videoPost, setVideoPost] = useState<PagePost | null>(null);
  const [rewriteFor, setRewriteFor] = useState<PagePost | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("social_platform_connections").select("*").eq("user_id", user.id).in("platform", ["facebook_page", "instagram"]).order("updated_at", { ascending: false });
      setConnections(data || []);
      if (!connectionId && data?.[0]?.id) setConnectionId(data[0].id);
    });
  }, []);

  const selected = connections.find((c) => c.id === connectionId);
  const postsQuery = useQuery({
    queryKey: ["page-posts", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-page-posts", { body: { connection_id: connectionId, limit: 50 } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "فشل الجلب");
      return data.posts as PagePost[];
    },
  });

  const posts = useMemo(() => {
    let list = [...(postsQuery.data || [])];
    if (typeFilter !== "all") list = list.filter((p) => typeFilter === "text" ? !p.media?.length : p.media?.some((m) => m.type?.includes(typeFilter)));
    if (sort === "top") list.sort((a, b) => ((b.stats?.engaged || b.stats?.likes || 0) - (a.stats?.engaged || a.stats?.likes || 0)));
    else list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return list;
  }, [postsQuery.data, typeFilter, sort]);

  function openRewrite(post: PagePost) {
    setRewriteFor(post);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" />منشورات الصفحة الفعلية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-2">
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger><SelectValue placeholder="اختر صفحة" /></SelectTrigger>
              <SelectContent>{connections.map((c) => <SelectItem key={c.id} value={c.id}>{c.platform} · {c.account_name || c.page_name || c.account_id}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="image">صور</SelectItem>
                <SelectItem value="video">فيديو</SelectItem>
                <SelectItem value="text">نص فقط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="recent">الأحدث</SelectItem><SelectItem value="top">أعلى تفاعل</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" onClick={() => postsQuery.refetch()} disabled={!connectionId || postsQuery.isFetching}>{postsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <RefreshCw className="h-4 w-4 ml-1" />}جلب المنشورات</Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{posts.length} منشور</Badge><span>يتم حفظ metadata فقط بدون تخزين ملفات المنصة.</span></div>
        </CardContent>
      </Card>

      {postsQuery.isLoading ? <div className="text-center py-10 text-muted-foreground">جاري الجلب...</div> : postsQuery.isError ? <Card><CardContent className="p-6 text-sm text-destructive">{(postsQuery.error as Error).message}</CardContent></Card> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posts.map((post) => <PagePostCard key={post.id} post={post} onRepost={(p) => setComposer({ open: true, post: p, mode: "publish" })} onSchedule={(p) => setComposer({ open: true, post: p, mode: "schedule" })} onRewrite={openRewrite} onVideoPrompt={setVideoPost} />)}
        </div>
      )}

      <RepostComposer open={composer.open} post={composer.post} mode={composer.mode} initialText={composer.initialText} extraMedia={composer.extraMedia} onOpenChange={(open) => setComposer((c) => ({ ...c, open }))} onDone={() => postsQuery.refetch()} />
      <VideoPromptDialog open={!!videoPost} post={videoPost} onOpenChange={(open) => !open && setVideoPost(null)} onUseVideo={(post, media) => { setVideoPost(null); setComposer({ open: true, post, mode: "schedule", extraMedia: media }); }} />
      <PostRewriteDialog
        open={!!rewriteFor}
        originalText={rewriteFor?.text || ""}
        originalMedia={rewriteFor?.media || []}
        sourcePostId={rewriteFor?.id}
        defaultPlatform={selected?.platform === "instagram" ? "instagram" : "facebook_page"}
        onOpenChange={(open) => !open && setRewriteFor(null)}
        onDone={() => postsQuery.refetch()}
      />
    </div>
  );
}