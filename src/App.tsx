import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import DashboardPage from "./pages/DashboardPage";
import PipelinePage from "./pages/PipelinePage";
import PromptGeneratorPage from "./pages/PromptGeneratorPage";
import ProductsPage from "./pages/ProductsPage";
import ImportPage from "./pages/ImportPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import CategoriesPage from "./pages/CategoriesPage";

import ActivityLogPage from "./pages/ActivityLogPage";
import ImageConverterPage from "./pages/ImageConverterPage";
import ProductImageGeneratorPage from "./pages/ProductImageGeneratorPage";
import GalleryUploadPage from "./pages/GalleryUploadPage";
import ClearDataPage from "./pages/ClearDataPage";
import SocialEnginePage from "./pages/SocialEnginePage";
import BrandingStudioPage from "./pages/BrandingStudioPage";
import ContentBrainPage from "./pages/ContentBrainPage";
import WordPressStudioPage from "./pages/WordPressStudioPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
          <Route path="/prompt-generator" element={<ProtectedRoute><PromptGeneratorPage /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />

          <Route path="/activity" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
          <Route path="/image-converter" element={<ProtectedRoute><ImageConverterPage /></ProtectedRoute>} />
          <Route path="/product-image-generator" element={<ProtectedRoute><ProductImageGeneratorPage /></ProtectedRoute>} />
          <Route path="/gallery-upload" element={<ProtectedRoute><GalleryUploadPage /></ProtectedRoute>} />
          <Route path="/clear-data" element={<ProtectedRoute><ClearDataPage /></ProtectedRoute>} />
          <Route path="/social-engine" element={<ProtectedRoute><SocialEnginePage /></ProtectedRoute>} />
          <Route path="/branding-studio" element={<ProtectedRoute><BrandingStudioPage /></ProtectedRoute>} />
          <Route path="/content-brain" element={<ProtectedRoute><ContentBrainPage /></ProtectedRoute>} />
          <Route path="/wordpress-studio" element={<ProtectedRoute><WordPressStudioPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
