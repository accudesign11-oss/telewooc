import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, 
  X, 
  Mic, 
  MicOff,
  Search, 
  Send, 
  Plus,
  Loader2,
  Package,
  Sparkles,
  ExternalLink,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDraftProduct } from "@/hooks/useDraftProduct";

interface SearchResult {
  id: string;
  name: string | null;
  short_description: string | null;
  price: number | null;
  status: string | null;
  product_images: { url: string }[];
}

const COPILOT_URL = "https://outlook.cloud.microsoft/host/b5abf2ae-c16b-4310-8f8a-d3bcdb52f162/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429";

export function FAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"add" | "search" | "copilot">("add");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchInterpretation, setSearchInterpretation] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createDraftFromPost } = useDraftProduct();

  const handleOpenCopilotDesktop = () => {
    toast({ title: "جاري فتح Microsoft Copilot...", description: "في وضع الديسكتوب (Desktop Mode)" });
    window.open(
      COPILOT_URL,
      "_blank",
      "width=1280,height=850,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes"
    );
  };

  // Voice recording state
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = async (target: "add" | "search") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (chunks.length === 0) return;

        setIsProcessing(true);
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const base64 = await blobToBase64(audioBlob);

          const { data, error } = await supabase.functions.invoke("voice-to-text", {
            body: { audio: base64 },
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          if (data.text) {
            if (target === "add") {
              setInputText(prev => prev ? `${prev}\n${data.text}` : data.text);
            } else {
              setSearchQuery(data.text);
              handleSearch(data.text);
            }
          }
        } catch (error: any) {
          toast({
            title: "خطأ في تحويل الصوت",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast({ title: "جاري التسجيل...", description: "تحدث الآن" });
    } catch (error: any) {
      toast({
        title: "خطأ في الميكروفون",
        description: "تأكد من إعطاء صلاحية الميكروفون",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleSearch = async (query?: string) => {
    const q = query || searchQuery;
    if (!q.trim()) return;

    setIsProcessing(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("smart-search", {
        body: { query: q },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSearchResults(data.results || []);
      setSearchInterpretation(data.interpretation || "");

      if (data.results?.length === 0) {
        toast({ title: "لم يتم العثور على نتائج" });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في البحث",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = async () => {
    if (!inputText.trim()) {
      toast({ title: "الرجاء إدخال بيانات المنتج", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const productId = await createDraftFromPost(null, inputText, []);
      
      if (productId) {
        toast({ title: "تم إنشاء المسودة بنجاح" });
        setInputText("");
        setIsOpen(false);
        navigate("/pipeline");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setIsOpen(false);
    navigate(`/products`);
  };

  return (
    <div className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-16 left-0 bg-card rounded-2xl shadow-xl border border-border p-4 w-[calc(100vw-2rem)] max-w-[340px] max-h-[70vh]"
            >
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "add" | "search")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="add">
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة منتج
                  </TabsTrigger>
                  <TabsTrigger value="search">
                    <Search className="h-4 w-4 ml-1" />
                    بحث ذكي
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="add" className="space-y-3">
                  <div className="space-y-2">
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="اكتب أو تحدث عن المنتج...
مثال: قميص قطني أبيض مقاس L بسعر 150 ريال"
                      rows={4}
                      dir="auto"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon"
                        onClick={() => isRecording ? stopRecording() : startRecording("add")}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={handleAddProduct}
                        disabled={isProcessing || !inputText.trim()}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <Send className="h-4 w-4 ml-2" />
                        )}
                        إنشاء مسودة
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن منتج..."
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      dir="auto"
                    />
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      onClick={() => isRecording ? stopRecording() : startRecording("search")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleSearch()}
                      disabled={isProcessing || !searchQuery.trim()}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {searchInterpretation && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {searchInterpretation}
                    </p>
                  )}

                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {searchResults.map((product) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectProduct(product.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              {product.product_images?.[0]?.url ? (
                                <img
                                  src={product.product_images[0].url}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-1">
                                  {product.name || "منتج بدون اسم"}
                                </p>
                                <p className="text-xs text-primary">
                                  {product.price || "—"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Magic Wand FAB */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-standard",
            isOpen
              ? "bg-destructive hover:bg-destructive/90"
              : "bg-primary hover:bg-primary/90"
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Wand2 className="h-6 w-6" />
            )}
          </motion.div>
        </Button>
      </motion.div>
    </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
