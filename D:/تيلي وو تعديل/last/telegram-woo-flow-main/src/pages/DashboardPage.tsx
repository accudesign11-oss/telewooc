import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Package, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  TrendingUp,
  ArrowUpRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  inboxPosts: number;
  aiRequestsToday: number;
  recentProducts: {
    id: string;
    name: string | null;
    status: string | null;
    created_at: string;
  }[];
  recentNotifications: {
    id: string;
    title: string;
    body: string | null;
    level: string | null;
    created_at: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all stats in parallel
      const [
        { count: totalProducts },
        { count: publishedProducts },
        { count: draftProducts },
        { count: inboxPosts },
        { count: aiRequestsToday },
        { data: recentProducts },
        { data: recentNotifications },
      ] = await Promise.all([
        supabase.from("draft_products").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("draft_products").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
        supabase.from("draft_products").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_processed", false),
        supabase.from("ai_requests").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("draft_products").select("id, name, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id, title, body, level, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        totalProducts: totalProducts || 0,
        publishedProducts: publishedProducts || 0,
        draftProducts: draftProducts || 0,
        inboxPosts: inboxPosts || 0,
        aiRequestsToday: aiRequestsToday || 0,
        recentProducts: recentProducts || [],
        recentNotifications: recentNotifications || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("ar", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      inbox: "صندوق الوارد",
      draft: "مسودة",
      ai_processing: "معالجة AI",
      ai_processed: "تمت المعالجة",
      review_ready: "جاهز للمراجعة",
      publishing: "جاري النشر",
      published: "منشور",
      failed: "فشل",
    };
    return labels[status || "draft"] || status;
  };

  const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "published") return "default";
    if (status === "failed") return "destructive";
    if (status === "draft" || status === "inbox") return "secondary";
    return "outline";
  };

  const getLevelColor = (level: string | null) => {
    if (level === "success") return "text-success";
    if (level === "warning") return "text-warning";
    if (level === "error") return "text-destructive";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <AppLayout title="لوحة التحكم">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="لوحة التحكم">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مرحباً بك 👋</h1>
            <p className="text-muted-foreground">نظرة عامة على نشاطك</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Package className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">إجمالي المنتجات</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-8 w-8 text-success" />
                <span className="text-2xl font-bold text-foreground">{stats?.publishedProducts || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">منشور</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Clock className="h-8 w-8 text-warning" />
                <span className="text-2xl font-bold text-foreground">{stats?.inboxPosts || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">منشورات جديدة</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats?.aiRequestsToday || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">طلبات AI اليوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = "/pipeline"}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Pipeline</h3>
                <p className="text-sm text-muted-foreground">معالجة المنشورات</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = "/products"}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Package className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">المنتجات</h3>
                <p className="text-sm text-muted-foreground">إدارة المنتجات</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="card-hover cursor-pointer" onClick={() => window.location.href = "/settings"}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent">
                <TrendingUp className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">الإعدادات</h3>
                <p className="text-sm text-muted-foreground">تكوين الربط</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">آخر المنتجات</CardTitle>
              <CardDescription>أحدث المنتجات المضافة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.recentProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد منتجات بعد</p>
              ) : (
                stats?.recentProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => window.location.href = "/products"}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{product.name || "منتج بدون اسم"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(product.created_at)}</p>
                    </div>
                    <Badge variant={getStatusVariant(product.status)} className="text-xs">
                      {getStatusLabel(product.status)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">آخر الإشعارات</CardTitle>
              <CardDescription>أحدث التنبيهات والأحداث</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.recentNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد إشعارات بعد</p>
              ) : (
                stats?.recentNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", 
                        notification.level === "success" ? "bg-success" :
                        notification.level === "warning" ? "bg-warning" :
                        notification.level === "error" ? "bg-destructive" : "bg-muted-foreground"
                      )} />
                      <p className="font-medium text-sm">{notification.title}</p>
                    </div>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-1">{notification.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.created_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
