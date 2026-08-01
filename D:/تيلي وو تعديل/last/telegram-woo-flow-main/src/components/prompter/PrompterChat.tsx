import { useState, useRef, useEffect } from "react";
import { SystemData } from "./PrompterWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MASTER_PROMPTER_SYSTEM_PROMPT } from "./systemPrompt";

interface Message {
  id: string;
  role: "user" | "system" | "model";
  content: string;
}

export function PrompterChat({ 
  systemData, 
  setSystemData 
}: { 
  systemData: SystemData; 
  setSystemData: React.Dispatch<React.SetStateAction<SystemData>> 
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      content: "أهلًا بك. ما المجال الذي تريد إنشاء السيستم له؟",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // AI Settings
  const [aiProvider, setAiProvider] = useState<string>("gemini");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [openrouterKey, setOpenrouterKey] = useState<string>("");
  const [openrouterModel, setOpenrouterModel] = useState<string>("google/gemma-3-27b-it:free");

  useEffect(() => {
    const fetchAiSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "ai")
        .maybeSingle();

      if (settings?.value) {
        const aiSettings = settings.value as any;
        if (aiSettings.provider) setAiProvider(aiSettings.provider === "lovable" ? "gemini" : aiSettings.provider);
        if (aiSettings.gemini_api_key) setGeminiKey(aiSettings.gemini_api_key);
        if (aiSettings.openrouter_api_key) setOpenrouterKey(aiSettings.openrouter_api_key);
        if (aiSettings.openrouter_model) setOpenrouterModel(aiSettings.openrouter_model);
      }
    };
    fetchAiSettings();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const callGemini = async (chatHistory: Message[]) => {
    if (!geminiKey) throw new Error("مفتاح Gemini API غير مضاف في الإعدادات.");
    
    // Format history for Gemini
    const contents = chatHistory.map(m => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: MASTER_PROMPTER_SYSTEM_PROMPT }] },
        contents: contents
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "فشل الاتصال بـ Gemini");
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  };

  const callOpenRouter = async (chatHistory: Message[]) => {
    if (!openrouterKey) throw new Error("مفتاح OpenRouter API غير مضاف في الإعدادات.");

    const messagesFormatted = [
      { role: "system", content: MASTER_PROMPTER_SYSTEM_PROMPT },
      ...chatHistory.map(m => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.content
      }))
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: messagesFormatted
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "فشل الاتصال بـ OpenRouter");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      let aiResponseText = "";
      if (aiProvider === "gemini") {
        aiResponseText = await callGemini(newHistory);
      } else {
        aiResponseText = await callOpenRouter(newHistory);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: aiResponseText
      }]);
      
      // Update basic system data as a mockup since full JSON parsing from chat is complex
      // but this shows the preview updating somewhat.
      if (!systemData.domain && newHistory.length === 2) {
        setSystemData(prev => ({ ...prev, domain: userMessage.content }));
      }

    } catch (error: any) {
      toast.error(error.message);
      // Remove the user message if it failed or just leave it
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 pb-20">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tl-none" 
                  : "bg-muted text-foreground rounded-tr-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] ml-auto">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-muted text-foreground rounded-tr-none flex items-center">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t mt-auto">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            id="prompter-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب ردك هنا أو استخدم أوامر نفذ..."
            className="flex-1"
            dir="rtl"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
