import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, ExternalLink, Repeat2, Sparkles, Video } from "lucide-react";

export type PagePost = {
  id: string;
  text: string;
  media: { type: string; url: string }[];
  stats: { likes?: number; comments?: number; reach?: number; engaged?: number };
  permalink?: string;
  created_at?: string;
};

type Props = {
  post: PagePost;
  onRepost: (post: PagePost) => void;
  onSchedule: (post: PagePost) => void;
  onRewrite: (post: PagePost) => void;
  onVideoPrompt: (post: PagePost) => void;
};

export function PagePostCard({ post, onRepost, onSchedule, onRewrite, onVideoPrompt }: Props) {
  const first = post.media?.[0];
  const isVideo = first?.type?.includes("video");
  return (
    <Card className="overflow-hidden">
      {first?.url ? (
        <div className="relative aspect-video bg-muted">
          {isVideo ? (
            <video src={first.url} className="h-full w-full object-cover" muted playsInline controls />
          ) : (
            <img src={first.url} alt="وسائط منشور الصفحة" className="h-full w-full object-cover" loading="lazy" />
          )}
          <Badge className="absolute top-2 right-2" variant="secondary">{post.media.length} ملف</Badge>
        </div>
      ) : null}
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.created_at && <span>{new Date(post.created_at).toLocaleString("ar-EG")}</span>}
          <Badge variant="outline">تفاعل {post.stats?.engaged || post.stats?.likes || 0}</Badge>
          <Badge variant="outline">تعليقات {post.stats?.comments || 0}</Badge>
          <Badge variant="outline">Reach {post.stats?.reach || 0}</Badge>
        </div>
        <p className="text-sm whitespace-pre-wrap line-clamp-5">{post.text || "منشور بدون نص"}</p>
        <div className="flex flex-wrap gap-1">
          {post.permalink && (
            <Button size="sm" variant="outline" asChild>
              <a href={post.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 ml-1" />فتح</a>
            </Button>
          )}
          <Button size="sm" onClick={() => onRepost(post)}><Repeat2 className="h-3 w-3 ml-1" />إعادة النشر</Button>
          <Button size="sm" variant="outline" onClick={() => onSchedule(post)}><CalendarClock className="h-3 w-3 ml-1" />إعادة الجدولة</Button>
          <Button size="sm" variant="outline" onClick={() => onRewrite(post)}><Sparkles className="h-3 w-3 ml-1" />إعادة صياغة</Button>
          <Button size="sm" variant="ghost" onClick={() => onVideoPrompt(post)}><Video className="h-3 w-3 ml-1" />تحويل لفيديو</Button>
        </div>
      </CardContent>
    </Card>
  );
}