import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Check,
  Wand2,
  Loader2,
  Image,
  FileText,
  Smartphone,
  Wrench,
  Video,
  MoreHorizontal,
  Zap,
  Target,
  Lightbulb,
  Settings2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// AI Platforms for copy and open
const AI_PLATFORMS = [
  { value: "gemini", label: "Google Gemini", url: "https://gemini.google.com/app", icon: "✨" },
  { value: "chatgpt", label: "ChatGPT", url: "https://chat.openai.com", icon: "🤖" },
  { value: "claude", label: "Claude", url: "https://claude.ai", icon: "🎭" },
  { value: "midjourney", label: "Midjourney", url: "https://www.midjourney.com", icon: "🎨" },
  { value: "poe", label: "Poe", url: "https://poe.com", icon: "💬" },
  { value: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai", icon: "🔍" },
];

const OUTPUT_TYPES = [
  { value: "image", label: "صورة", icon: Image, desc: "برومبت لتوليد صور AI", emoji: "🖼️" },
  { value: "text", label: "نص/محتوى", icon: FileText, desc: "مقالات، منشورات، رسائل", emoji: "📝" },
  { value: "app", label: "تطبيق/موقع", icon: Smartphone, desc: "مواصفات تطبيق أو موقع", emoji: "📱" },
  { value: "tool", label: "أداة/سكريبت", icon: Wrench, desc: "سكريبت أو أتمتة", emoji: "🔧" },
  { value: "video", label: "فيديو", icon: Video, desc: "سيناريو أو فيديو AI", emoji: "🎬" },
  { value: "other", label: "أخرى", icon: MoreHorizontal, desc: "أي نوع آخر", emoji: "✨" },
];

const PROMPT_STYLES = [
  { value: "detailed", label: "تفصيلي جداً", icon: "📋", desc: "يغطي كل التفاصيل" },
  { value: "concise", label: "موجز ودقيق", icon: "🎯", desc: "مختصر وفعال" },
  { value: "creative", label: "إبداعي", icon: "💡", desc: "أفكار مبتكرة" },
  { value: "technical", label: "تقني", icon: "⚙️", desc: "مواصفات دقيقة" },
];

const TARGET_PLATFORMS: Record<string, { value: string; label: string }[]> = {
  image: [
    { value: "midjourney", label: "Midjourney" },
    { value: "dalle", label: "DALL-E" },
    { value: "stable_diffusion", label: "Stable Diffusion" },
    { value: "ideogram", label: "Ideogram" },
    { value: "flux", label: "Flux" },
    { value: "general", label: "عام" },
  ],
  text: [
    { value: "gpt", label: "ChatGPT" },
    { value: "claude", label: "Claude" },
    { value: "gemini", label: "Gemini" },
    { value: "general", label: "عام" },
  ],
  app: [
    { value: "web", label: "موقع ويب" },
    { value: "mobile", label: "تطبيق موبايل" },
    { value: "desktop", label: "تطبيق سطح مكتب" },
    { value: "api", label: "API" },
  ],
  tool: [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "automation", label: "أتمتة" },
    { value: "general", label: "عام" },
  ],
  video: [
    { value: "sora", label: "Sora" },
    { value: "runway", label: "Runway" },
    { value: "pika", label: "Pika" },
    { value: "general", label: "عام" },
  ],
  other: [
    { value: "general", label: "عام" },
  ],
};

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", desc: "مربع" },
  { value: "16:9", label: "16:9", desc: "عريض" },
  { value: "9:16", label: "9:16", desc: "عمودي" },
  { value: "4:3", label: "4:3", desc: "كلاسيكي" },
  { value: "3:4", label: "3:4", desc: "بورتريه" },
];

const EXAMPLE_IDEAS = [
  { type: "image", idea: "قطة تجلس على كتب في مكتبة قديمة" },
  { type: "text", idea: "مقال عن فوائد التأمل للصحة النفسية" },
  { type: "app", idea: "تطبيق لتتبع عادات القراءة اليومية" },
  { type: "tool", idea: "سكريبت لتحويل صور PNG إلى WebP" },
  { type: "video", idea: "فيديو عن شروق الشمس فوق الجبال" },
];

export function UniversalPromptTab() {
  // State
  const [userIdea, setUserIdea] = useState("");
  const [outputType, setOutputType] = useState("image");
  const [promptStyle, setPromptStyle] = useState("detailed");
  const [targetPlatform, setTargetPlatform] = useState("general");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get available platforms for current output type
  const availablePlatforms = TARGET_PLATFORMS[outputType] || TARGET_PLATFORMS.other;

  // Reset platform when output type changes
  const handleOutputTypeChange = (type: string) => {
    setOutputType(type);
    const platforms = TARGET_PLATFORMS[type] || TARGET_PLATFORMS.other;
    if (!platforms.find(p => p.value === targetPlatform)) {
      setTargetPlatform(platforms[0]?.value || "general");
    }
  };

  // Generate prompt locally (quick)
  const generatePromptLocally = useCallback(() => {
    if (!userIdea.trim()) {
      toast.error("يرجى كتابة فكرتك أولاً");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const typeInfo = OUTPUT_TYPES.find(t => t.value === outputType);
      const styleInfo = PROMPT_STYLES.find(s => s.value === promptStyle);
      const platformInfo = availablePlatforms.find(p => p.value === targetPlatform);

      let prompt = "";

      switch (outputType) {
        case "image":
          prompt = `=== IMAGE GENERATION PROMPT ===

[CONCEPT]: ${userIdea}

[STYLE]: ${styleInfo?.label} - ${styleInfo?.desc}
[PLATFORM]: Optimized for ${platformInfo?.label}
[ASPECT RATIO]: ${aspectRatio}

[VISUAL DETAILS]:
• Lighting: Professional studio lighting with soft shadows
• Composition: Balanced, rule of thirds
• Color palette: Harmonious and vibrant
• Mood: Engaging and visually striking
• Quality: 8K ultra-realistic, sharp details

[TECHNICAL SPECS]:
• High resolution render
• Photorealistic textures
• Depth of field where appropriate
• Professional color grading

[ADDITIONAL INSTRUCTIONS]:
Generate a visually stunning image that captures the essence of the concept.
Focus on clarity, detail, and artistic composition.`;
          break;

        case "text":
          prompt = `=== CONTENT WRITING PROMPT ===

[TOPIC]: ${userIdea}

[STYLE]: ${styleInfo?.label}
[TARGET PLATFORM]: ${platformInfo?.label}

[CONTENT REQUIREMENTS]:
• Tone: Professional yet engaging
• Structure: Clear introduction, body, and conclusion
• Length: Appropriate for the topic and platform
• Language: Clear, concise, and compelling

[KEY ELEMENTS]:
• Hook the reader from the start
• Provide valuable insights
• Use examples and data where relevant
• Include actionable takeaways
• End with a strong call-to-action

[ADDITIONAL NOTES]:
Write content that is informative, engaging, and optimized for the target audience.`;
          break;

        case "app":
          prompt = `=== APPLICATION SPECIFICATION ===

[CONCEPT]: ${userIdea}

[STYLE]: ${styleInfo?.label}
[PLATFORM]: ${platformInfo?.label}

[CORE FEATURES]:
• Primary functionality based on the concept
• User authentication and profiles
• Data persistence and sync
• Clean, intuitive interface

[USER EXPERIENCE]:
• Seamless onboarding flow
• Intuitive navigation
• Responsive design
• Accessibility considerations

[TECHNICAL STACK SUGGESTIONS]:
• Frontend: Modern framework (React/Vue/Flutter)
• Backend: Scalable API architecture
• Database: Appropriate for data needs
• Security: Best practices implementation

[ADDITIONAL REQUIREMENTS]:
Build a polished application that solves the user's problem effectively.`;
          break;

        case "tool":
          prompt = `=== TOOL/SCRIPT SPECIFICATION ===

[PURPOSE]: ${userIdea}

[STYLE]: ${styleInfo?.label}
[TECHNOLOGY]: ${platformInfo?.label}

[FUNCTIONALITY]:
• Clear input parameters
• Well-defined output format
• Error handling
• Progress feedback

[IMPLEMENTATION]:
• Modular, maintainable code
• Clear documentation
• Example usage
• Edge case handling

[REQUIREMENTS]:
• Efficient execution
• Cross-platform compatibility (if applicable)
• Easy to install and run
• Clear CLI or API interface`;
          break;

        case "video":
          prompt = `=== VIDEO GENERATION PROMPT ===

[SCENE]: ${userIdea}

[STYLE]: ${styleInfo?.label}
[PLATFORM]: ${platformInfo?.label}
[ASPECT RATIO]: ${aspectRatio}

[VISUAL ELEMENTS]:
• Camera movement: Smooth, cinematic
• Lighting: Dynamic, mood-appropriate
• Color grading: Professional finish
• Transitions: Seamless

[MOTION DETAILS]:
• Movement: Natural and fluid
• Pacing: Appropriate to content
• Focus: Clear subject emphasis

[AUDIO SUGGESTIONS]:
• Background music style
• Sound effects if applicable
• Voiceover considerations

[QUALITY]:
• High resolution output
• Smooth frame rate
• Professional production value`;
          break;

        default:
          prompt = `=== UNIVERSAL PROMPT ===

[IDEA]: ${userIdea}

[APPROACH]: ${styleInfo?.label} - ${styleInfo?.desc}
[TARGET]: ${platformInfo?.label}

[REQUIREMENTS]:
• Clear understanding of the goal
• Detailed execution plan
• Quality standards
• Success metrics

[ADDITIONAL CONTEXT]:
Transform this idea into a well-structured, actionable plan with clear deliverables.`;
      }

      setGeneratedPrompt(prompt);
      setIsGenerating(false);
      toast.success("تم توليد البرومبت! ✨");
    }, 500);
  }, [userIdea, outputType, promptStyle, targetPlatform, aspectRatio, availablePlatforms]);

  // Enhance with AI
  const enhanceWithAI = async () => {
    if (!userIdea.trim()) {
      toast.error("يرجى كتابة فكرتك أولاً");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { 
          idea: userIdea,
          output_type: outputType,
          style: promptStyle,
          platform: targetPlatform,
          aspect_ratio: aspectRatio
        }
      });

      if (error) throw error;

      // Our backend returns 200 with { ok:false, status, error, hint } for rate-limits and provider errors.
      if (data?.ok === false) {
        toast.error(data.error || "فشل في تعزيز البرومبت");
        if (data.hint) toast.message(data.hint);
        // Fallback to local generation
        generatePromptLocally();
        return;
      }
      
      if (data.enhanced_prompt) {
        setGeneratedPrompt(data.enhanced_prompt);
        
        // عرض الموديل المستخدم
        const provider = data.provider || "unknown";
        const model = data.model || "unknown";
        const displayModel = formatModelName(provider, model);
        
        toast.success(`تم تعزيز البرومبت بـ ${displayModel}! 🚀`);
      } else {
        throw new Error("No enhanced prompt received");
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error("فشل في تعزيز البرومبت، جاري استخدام التوليد المحلي...");
      // Fallback to local generation
      generatePromptLocally();
    } finally {
      setIsEnhancing(false);
    }
  };

  // دالة لتنسيق اسم الموديل للعرض
  const formatModelName = (provider: string, model: string): string => {
    const providerNames: Record<string, string> = {
      lovable: "Lovable AI",
      gemini: "Google Gemini",
      openrouter: "OpenRouter",
    };
    
    let cleanModel = model;
    if (model.includes("/")) {
      cleanModel = model.split("/").pop() || model;
    }
    if (cleanModel.includes(":")) {
      cleanModel = cleanModel.split(":")[0];
    }
    cleanModel = cleanModel.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    const providerName = providerNames[provider] || provider;
    return `${providerName} (${cleanModel})`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast.success("تم نسخ البرومبت!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل في النسخ");
    }
  };

  const copyAndOpenPlatform = async (platform: typeof AI_PLATFORMS[0]) => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      toast.success(`تم النسخ! جاري فتح ${platform.label}... اضغط Ctrl+V للصق`, {
        duration: 4000,
      });
      window.open(platform.url, '_blank');
    } catch {
      toast.error("فشل في النسخ");
    }
  };

  const loadExample = (example: typeof EXAMPLE_IDEAS[0]) => {
    setUserIdea(example.idea);
    handleOutputTypeChange(example.type);
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          {/* Idea Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                فكرتك
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="اكتب فكرتك هنا... مثال: قطة تجلس على كتب في مكتبة قديمة"
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                className="min-h-[120px] resize-none"
                dir="auto"
              />
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">أمثلة:</span>
                {EXAMPLE_IDEAS.map((example, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => loadExample(example)}
                  >
                    {OUTPUT_TYPES.find(t => t.value === example.type)?.emoji} {example.idea.slice(0, 20)}...
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Output Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                نوع المخرج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {OUTPUT_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <motion.button
                      key={type.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOutputTypeChange(type.value)}
                      className={`flex flex-col items-center justify-center text-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                        outputType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <span className="text-xs font-medium truncate w-full">{type.label}</span>
                      <span className="text-[10px] text-muted-foreground text-center truncate w-full">{type.desc}</span>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                أسلوب البرومبت
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5">
                {PROMPT_STYLES.map((style) => (
                  <motion.button
                    key={style.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPromptStyle(style.value)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                      promptStyle === style.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base sm:text-lg shrink-0">{style.icon}</span>
                    <div className="text-right min-w-0">
                      <span className="text-xs font-medium block truncate">{style.label}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{style.desc}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Target Platform */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                المنصة المستهدفة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => (
                  <Badge
                    key={platform.value}
                    variant={targetPlatform === platform.value ? "default" : "outline"}
                    className="cursor-pointer transition-all"
                    onClick={() => setTargetPlatform(platform.value)}
                  >
                    {platform.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aspect Ratio (for image/video) */}
          <AnimatePresence>
            {(outputType === "image" || outputType === "video") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" />
                      الأبعاد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((ratio) => (
                        <Badge
                          key={ratio.value}
                          variant={aspectRatio === ratio.value ? "default" : "outline"}
                          className="cursor-pointer transition-all"
                          onClick={() => setAspectRatio(ratio.value)}
                        >
                          {ratio.label} - {ratio.desc}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Output */}
        <div className="space-y-4">
          {/* Generated Prompt */}
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                البرومبت الناتج
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <Textarea
                placeholder="البرومبت سيظهر هنا بعد التوليد..."
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="flex-1 min-h-[300px] resize-none font-mono text-sm"
                dir="auto"
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={generatePromptLocally}
                  disabled={isGenerating || isEnhancing || !userIdea.trim()}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري التوليد...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 ml-2" />
                      توليد سريع
                    </>
                  )}
                </Button>

                <Button
                  onClick={enhanceWithAI}
                  disabled={isGenerating || isEnhancing || !userIdea.trim()}
                  variant="secondary"
                  className="flex-1"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري التعزيز...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 ml-2" />
                      تعزيز بـ AI
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedPrompt("");
                    setUserIdea("");
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  مسح الكل
                </Button>

                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={!generatedPrompt}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 ml-2 text-green-500" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 ml-2" />
                      نسخ
                    </>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      disabled={!generatedPrompt}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 ml-2" />
                      نسخ وفتح
                      <ChevronDown className="h-4 w-4 mr-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {AI_PLATFORMS.map((platform) => (
                      <DropdownMenuItem
                        key={platform.value}
                        onClick={() => copyAndOpenPlatform(platform)}
                        className="cursor-pointer"
                      >
                        <span className="ml-2">{platform.icon}</span>
                        {platform.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tips */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-medium mb-2">💡 نصائح:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• اكتب فكرتك بوضوح وإيجاز</li>
                  <li>• اختر نوع المخرج المناسب لفكرتك</li>
                  <li>• جرب "تعزيز بـ AI" للحصول على نتائج أفضل</li>
                  <li>• يمكنك تعديل البرومبت الناتج يدوياً</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
