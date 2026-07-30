import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Shuffle,
  Copy,
  RefreshCw,
  Check,
  Upload,
  X,
  Shirt,
  Baby,
  Palette,
  Camera,
  Image,
  Wand2,
  ScanSearch,
  Loader2,
  User,
  Globe,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { UniversalPromptTab } from "./UniversalPromptTab";
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

const CLOTHING_TYPES = [
  { value: "hoodie", label: "Hoodie", icon: "🧥" },
  { value: "sweatpants", label: "Sweatpants", icon: "👖" },
  { value: "tracksuit", label: "Full Tracksuit", icon: "🏃" },
  { value: "tshirt", label: "T-Shirt", icon: "👕" },
  { value: "jacket", label: "Jacket", icon: "🧥" },
  { value: "shorts", label: "Shorts", icon: "🩳" },
  { value: "dress", label: "Dress", icon: "👗" },
  { value: "patched", label: "Patched Logo Outfit", icon: "🏷️" },
  { value: "random", label: "Random", icon: "🎲" },
];

const DESIGN_STYLES = [
  { value: "minimalist", label: "Minimalist", icon: "✨", desc: "تصميم بسيط وأنيق" },
  { value: "playful", label: "Playful Kids", icon: "🎈", desc: "مرح وطفولي" },
  { value: "sporty", label: "Sporty", icon: "⚽", desc: "رياضي وديناميكي" },
  { value: "cartoon", label: "Cartoon Graphics", icon: "🎨", desc: "رسومات كرتونية" },
  { value: "abstract", label: "Abstract Art", icon: "🌀", desc: "فن تجريدي" },
  { value: "nature", label: "Nature Theme", icon: "🌿", desc: "طبيعة وحيوانات" },
  { value: "space", label: "Space & Galaxy", icon: "🚀", desc: "فضاء ومجرات" },
  { value: "trendy", label: "Trendy Youth", icon: "🔥", desc: "شبابي وعصري" },
  { value: "vintage", label: "Vintage Retro", icon: "📻", desc: "كلاسيكي عتيق" },
  { value: "random", label: "Random", icon: "🎲", desc: "عشوائي" },
];

const GRAPHIC_OPTIONS = [
  { value: "logo_only", label: "Logo Only", icon: "🏷️", desc: "شعار فقط بدون رسومات" },
  { value: "small_graphic", label: "Small Graphic", icon: "🖼️", desc: "رسمة صغيرة مع اللوجو" },
  { value: "full_print", label: "Full Print", icon: "🎨", desc: "طباعة كاملة" },
  { value: "embroidery", label: "Embroidery", icon: "🧵", desc: "تطريز" },
  { value: "patches", label: "Patches", icon: "🔲", desc: "باتشات وشارات" },
  { value: "typography", label: "Typography", icon: "🔤", desc: "كتابات وخطوط" },
  { value: "animals", label: "Animal Graphics", icon: "🦁", desc: "رسومات حيوانات" },
  { value: "geometric", label: "Geometric", icon: "🔷", desc: "أشكال هندسية" },
  { value: "none", label: "Plain/Solid", icon: "⬜", desc: "سادة بدون رسومات" },
  { value: "random", label: "Random", icon: "🎲", desc: "عشوائي" },
];

const LOGO_POSITIONS = [
  { value: "chest_left", label: "Left Chest", icon: "↖️" },
  { value: "chest_center", label: "Center Chest", icon: "⬆️" },
  { value: "back_large", label: "Large Back", icon: "🔙" },
  { value: "sleeve", label: "Sleeve", icon: "💪" },
  { value: "multiple", label: "Multiple Positions", icon: "📍" },
  { value: "random", label: "Random", icon: "🎲" },
];

const AGE_GROUPS = [
  { value: "0-12m", label: "0-12 months" },
  { value: "1-3y", label: "1-3 years" },
  { value: "4-7y", label: "4-7 years" },
  { value: "8-12y", label: "8-12 years" },
  { value: "random", label: "Random" },
];

const DISPLAY_MODES = [
  { value: "model", label: "On Child Model", icon: "👶" },
  { value: "flatlay", label: "Flat Lay", icon: "📐" },
  { value: "hanger", label: "Hanger", icon: "🪝" },
  { value: "random", label: "Random", icon: "🎲" },
];

const BACKGROUNDS = [
  { value: "white", label: "White", color: "#ffffff" },
  { value: "colored", label: "Colored", color: "#f0f0f0" },
  { value: "studio", label: "Studio", color: "#e8e8e8" },
  { value: "outdoor", label: "Outdoor", color: "#a8d5ba" },
  { value: "random", label: "Random", color: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", icon: "⬜", desc: "مربع - مناسب للسوشيال ميديا", dimensions: "1024x1024" },
  { value: "4:3", label: "4:3", icon: "🖼️", desc: "أفقي كلاسيكي", dimensions: "1024x768" },
  { value: "3:4", label: "3:4", icon: "📱", desc: "عمودي - مناسب للموبايل", dimensions: "768x1024" },
  { value: "16:9", label: "16:9", icon: "🖥️", desc: "عريض - مناسب للبانر", dimensions: "1920x1080" },
  { value: "9:16", label: "9:16", icon: "📲", desc: "ستوري/ريلز", dimensions: "1080x1920" },
  { value: "2:3", label: "2:3", icon: "📷", desc: "بورتريه كلاسيكي", dimensions: "683x1024" },
  { value: "3:2", label: "3:2", icon: "🏞️", desc: "لاندسكيب كلاسيكي", dimensions: "1024x683" },
];

const SIMILARITY_LEVELS = [
  { value: "very_close", label: "قريب جداً", icon: "🎯", desc: "تصميم مطابق تقريباً مع تغييرات طفيفة" },
  { value: "moderate", label: "متوسط", icon: "🔄", desc: "نفس الأسلوب مع تعديلات ملحوظة" },
  { value: "inspired", label: "مستوحى", icon: "💡", desc: "إلهام من التصميم مع إبداع جديد" },
  { value: "random", label: "عشوائي", icon: "🎲", desc: "مستوى تشابه عشوائي" },
];

const REFERENCE_DISPLAY_OPTIONS = [
  { value: "same_style", label: "نفس طريقة العرض", icon: "📸", desc: "كما في الصورة المرجعية" },
  { value: "on_hanger", label: "على علاقة", icon: "🪝", desc: "عرض على هانجر" },
  { value: "live_fit", label: "على موديل", icon: "👤", desc: "على شخص حقيقي" },
  { value: "custom_model", label: "موديل مخصص", icon: "📤", desc: "ارفع صورة الشخص" },
  { value: "flatlay", label: "مفرود", icon: "📐", desc: "عرض مسطح" },
];

const RANDOM_COLORS = ["white", "black", "beige", "navy", "olive", "brown", "gray", "burgundy", "cream", "charcoal"];

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function PromptGeneratorTab() {
  // Mode state
  const [promptMode, setPromptMode] = useState<"manual" | "reference" | "universal">("manual");
  
  // Form state
  const [clothingType, setClothingType] = useState("hoodie");
  const [ageGroup, setAgeGroup] = useState("4-7y");
  const [mainColor, setMainColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [randomColors, setRandomColors] = useState(false);
  const [displayMode, setDisplayMode] = useState("model");
  const [background, setBackground] = useState("studio");
  const [modelImages, setModelImages] = useState<File[]>([]);

  const [designStyle, setDesignStyle] = useState("minimalist");
  const [graphicOption, setGraphicOption] = useState("logo_only");
  const [logoPosition, setLogoPosition] = useState("chest_left");
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Reference design state
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string>("");
  const [similarityLevel, setSimilarityLevel] = useState("moderate");
  const [referenceDisplayOption, setReferenceDisplayOption] = useState("same_style");
  const [customModelImage, setCustomModelImage] = useState<File | null>(null);
  const [customModelPreview, setCustomModelPreview] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  // Output state
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoImage(null);
    setLogoPreview("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setModelImages(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeImage = (index: number) => {
    setModelImages(prev => prev.filter((_, i) => i !== index));
  };

  const randomizeMainColor = () => {
    setMainColor(randomFrom(RANDOM_COLORS));
  };

  // Reference image handlers
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAnalysisResult("");
    }
  };

  const removeReference = () => {
    setReferenceImage(null);
    setReferencePreview("");
    setAnalysisResult("");
  };

  const handleCustomModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomModelImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomModelPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCustomModel = () => {
    setCustomModelImage(null);
    setCustomModelPreview("");
  };

  // Analyze reference design with AI
  const analyzeReferenceDesign = async () => {
    if (!referencePreview) {
      toast.error("يرجى رفع صورة التصميم أولاً");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { 
          image_base64: referencePreview
        }
      });

      if (error) throw error;

      // Extract the design prompt from the result
      const result = data.result;
      if (result?.design_prompt) {
        // Use the AI-generated design prompt directly
        setAnalysisResult(result.design_prompt);
        toast.success("تم تحليل التصميم بنجاح!");
      } else if (result) {
        // Fallback: build prompt from detected features
        const features = result.detected_features || {};
        const graphic = features.graphic_details || {};
        const logo = features.logo_details || {};
        
        const promptParts = [
          features.garment_type && `${features.garment_type}`,
          features.main_color && `in ${features.main_color} color`,
          features.secondary_colors?.length && `with ${features.secondary_colors.join(', ')} accents`,
          features.fabric_type && `made of ${features.fabric_type}`,
          features.fabric_texture && `(${features.fabric_texture} texture)`,
          features.fit_style && `${features.fit_style} fit`,
          features.neckline && `${features.neckline} neckline`,
          features.sleeves && `${features.sleeves}`,
          graphic.has_graphic && graphic.graphic_content && `featuring ${graphic.graphic_type || 'printed'} graphic: ${graphic.graphic_content} on ${graphic.graphic_position || 'front'}`,
          logo.has_logo && logo.logo_description && `with ${logo.logo_description} logo at ${logo.logo_position}`,
          features.display_style && `displayed ${features.display_style}`,
          features.background && `on ${features.background} background`,
          features.target_age && `for ${features.target_age}`,
        ].filter(Boolean);
        
        setAnalysisResult(promptParts.join(', ') + '. High quality, professional product photography, 8k resolution.');
        toast.success("تم تحليل التصميم بنجاح!");
      } else {
        setAnalysisResult("لم يتم العثور على تفاصيل التحليل");
        toast.error("فشل في استخراج تفاصيل التصميم");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("فشل في تحليل التصميم");
      // Fallback mock analysis for demo
      setAnalysisResult("تصميم هودي أطفال بلون أزرق داكن مع طباعة جرافيك على الصدر، قماش قطني، قصة مريحة");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Creative variations based on similarity level
  const CREATIVE_COLOR_ALTERNATIVES = {
    very_close: ["slightly darker shade", "slightly lighter tint", "same family warmer tone"],
    moderate: ["complementary color", "analogous color", "earth-toned version", "pastel version"],
    inspired: ["bold contrasting color", "seasonal palette", "trendy color combination", "monochromatic scheme"]
  };

  const CREATIVE_GRAPHIC_VARIATIONS = {
    very_close: ["same graphic with refined edges", "identical pattern with subtle texture", "same motif with cleaner lines"],
    moderate: ["similar style graphic in new theme", "reinterpreted motif with modern touch", "same concept different execution"],
    inspired: ["completely new graphic inspired by theme", "abstract interpretation", "minimalist reinterpretation", "maximalist expansion"]
  };

  const CREATIVE_DETAIL_CHANGES = {
    very_close: [
      "adjust stitching color slightly",
      "add subtle contrast piping",
      "refine hem finishing"
    ],
    moderate: [
      "add contrasting pocket trim",
      "include decorative zippers",
      "add ribbed cuffs in accent color",
      "change collar style slightly"
    ],
    inspired: [
      "transform to oversized fit",
      "add asymmetric design elements",
      "include color-block panels",
      "add unique button or hardware details",
      "incorporate mixed fabric textures"
    ]
  };

  // Generate prompt from reference with full creativity
  const generateFromReference = useCallback(() => {
    if (!analysisResult && !referencePreview) {
      toast.error("يرجى رفع صورة وتحليلها أولاً");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const finalSimilarity = similarityLevel === "random"
        ? randomFrom(SIMILARITY_LEVELS.filter(s => s.value !== "random"))
        : SIMILARITY_LEVELS.find(s => s.value === similarityLevel);

      const similarityKey = finalSimilarity?.value as keyof typeof CREATIVE_COLOR_ALTERNATIVES || "moderate";

      // Generate creative modifications based on similarity level
      const colorChange = randomFrom(CREATIVE_COLOR_ALTERNATIVES[similarityKey] || CREATIVE_COLOR_ALTERNATIVES.moderate);
      const graphicChange = randomFrom(CREATIVE_GRAPHIC_VARIATIONS[similarityKey] || CREATIVE_GRAPHIC_VARIATIONS.moderate);
      const detailChanges = [];
      const detailOptions = CREATIVE_DETAIL_CHANGES[similarityKey] || CREATIVE_DETAIL_CHANGES.moderate;
      const numDetails = similarityKey === "very_close" ? 1 : similarityKey === "moderate" ? 2 : 3;
      for (let i = 0; i < numDetails; i++) {
        const available = detailOptions.filter(d => !detailChanges.includes(d));
        if (available.length) detailChanges.push(randomFrom(available));
      }

      const displayOption = REFERENCE_DISPLAY_OPTIONS.find(d => d.value === referenceDisplayOption);
      
      let displayInstruction = "";
      switch (referenceDisplayOption) {
        case "same_style":
          displayInstruction = "maintain the same display style as the reference image";
          break;
        case "on_hanger":
          displayInstruction = "display the garment on a wooden or velvet hanger, clean white background, soft shadow beneath";
          break;
        case "live_fit":
          displayInstruction = "show on a happy child model (age-appropriate), natural pose, lifestyle photography with soft natural lighting";
          break;
        case "custom_model":
          displayInstruction = customModelPreview 
            ? "place the design on the provided model reference - CRITICAL: use the exact person, face, and pose from the attached model photo, only change the clothing"
            : "show on a child model with neutral expression";
          break;
        case "flatlay":
          displayInstruction = "flat lay presentation, top-down view, neatly arranged with styled props (small toy, fabric swatch)";
          break;
      }

      const hasLogo = logoImage !== null;
      const logoText = hasLogo 
        ? `Add the attached logo at ${LOGO_POSITIONS.find(l => l.value === logoPosition)?.label || "left chest"} position`
        : "";

      const selectedRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio);

      // Build comprehensive creative prompt
      const prompt = `=== REFERENCE DESIGN ANALYSIS ===
${analysisResult || "Analyze the attached reference image carefully"}

=== CREATIVE TRANSFORMATION (${finalSimilarity?.label}) ===

🎨 COLOR MODIFICATION:
Apply "${colorChange}" to the main color scheme while maintaining harmony.
${similarityKey === "very_close" ? "Keep the overall color feeling identical, only subtle shade adjustments." : ""}
${similarityKey === "moderate" ? "Noticeable color shift but same mood and style." : ""}
${similarityKey === "inspired" ? "Bold new color direction while keeping design DNA." : ""}

🖼️ GRAPHIC/PRINT CHANGES:
${graphicChange}
${similarityKey !== "very_close" ? "Create fresh artwork that captures the spirit but is legally distinct." : "Refine existing artwork with minor improvements."}

✂️ DESIGN DETAIL MODIFICATIONS:
${detailChanges.map((d, i) => `${i + 1}. ${d}`).join('\n')}

📐 DISPLAY PRESENTATION:
Style: ${displayOption?.label}
Instructions: ${displayInstruction}
${customModelPreview && referenceDisplayOption === "custom_model" ? "⚠️ CRITICAL: Use the exact provided model photo - same person, same pose, only replace clothing." : ""}

📏 OUTPUT FORMAT:
Aspect Ratio: ${selectedRatio?.value || "1:1"} (${selectedRatio?.dimensions || "1024x1024"})
Purpose: ${selectedRatio?.desc || "Product display"}

${hasLogo ? `🏷️ BRANDING:
${logoText}
⚠️ IMPORTANT: Reproduce the attached logo EXACTLY as provided - no modifications to logo design.` : ""}

=== QUALITY SPECIFICATIONS ===
• Premium Egyptian cotton kidswear quality
• Professional studio lighting with soft shadows
• Sharp fabric texture visible
• True-to-life color accuracy
• Commercial e-commerce photography standard
• 8K ultra-realistic rendering

=== FINAL INSTRUCTION ===
Generate a FRESH, ORIGINAL design that is ${finalSimilarity?.value === "very_close" ? "95% similar" : finalSimilarity?.value === "moderate" ? "70% similar" : "40% similar"} to the reference.
This is NOT a copy - it's a creative reinterpretation with the specific changes detailed above.
Every element mentioned must be implemented as described.`;

      setGeneratedPrompt(prompt);
      setIsGenerating(false);
      toast.success("تم توليد برومبت إبداعي تفصيلي! ✨");
    }, 600);
  }, [analysisResult, referencePreview, similarityLevel, referenceDisplayOption, customModelPreview, logoImage, logoPosition, aspectRatio]);

  const generatePrompt = useCallback((forceFullRandom: boolean = false) => {
    setIsGenerating(true);

    setTimeout(() => {
      // When forceFullRandom is true, randomize EVERYTHING for a completely new design
      const finalClothing = forceFullRandom || clothingType === "random" 
        ? randomFrom(CLOTHING_TYPES.filter(c => c.value !== "random")).label
        : CLOTHING_TYPES.find(c => c.value === clothingType)?.label || "Hoodie";

      const finalAge = forceFullRandom || ageGroup === "random"
        ? randomFrom(AGE_GROUPS.filter(a => a.value !== "random")).label
        : AGE_GROUPS.find(a => a.value === ageGroup)?.label || "4-7 years";

      const finalMainColor = forceFullRandom || randomColors || !mainColor
        ? randomFrom(RANDOM_COLORS)
        : mainColor;

      const finalSecondaryColor = forceFullRandom || randomColors
        ? randomFrom(RANDOM_COLORS.filter(c => c !== finalMainColor))
        : secondaryColor || "";

      const finalDisplay = forceFullRandom || displayMode === "random"
        ? randomFrom(DISPLAY_MODES.filter(d => d.value !== "random")).label
        : DISPLAY_MODES.find(d => d.value === displayMode)?.label || "On Child Model";

      const finalBackground = forceFullRandom || background === "random"
        ? randomFrom(BACKGROUNDS.filter(b => b.value !== "random")).label
        : BACKGROUNDS.find(b => b.value === background)?.label || "Studio";

      const finalDesignStyle = forceFullRandom || designStyle === "random"
        ? randomFrom(DESIGN_STYLES.filter(s => s.value !== "random")).label
        : DESIGN_STYLES.find(s => s.value === designStyle)?.label || "Minimalist";

      const finalGraphic = forceFullRandom || graphicOption === "random"
        ? randomFrom(GRAPHIC_OPTIONS.filter(g => g.value !== "random")).label
        : GRAPHIC_OPTIONS.find(g => g.value === graphicOption)?.label || "Logo Only";

      const finalLogoPos = forceFullRandom || logoPosition === "random"
        ? randomFrom(LOGO_POSITIONS.filter(l => l.value !== "random")).label
        : LOGO_POSITIONS.find(l => l.value === logoPosition)?.label || "Left Chest";

      const finalAspectRatio = forceFullRandom
        ? randomFrom(ASPECT_RATIOS)
        : ASPECT_RATIOS.find(r => r.value === aspectRatio) || ASPECT_RATIOS[0];

      const hasModelImages = modelImages.length > 0 && displayMode === "model";
      const displayText = hasModelImages 
        ? `${finalDisplay} (using provided model reference images)`
        : finalDisplay;

      const hasLogo = logoImage !== null;
      const logoText = hasLogo 
        ? `attached logo image at ${finalLogoPos} position`
        : `minimal brand logo at ${finalLogoPos} position`;

      const prompt = `[PRODUCT]: ${finalClothing}
[STYLE]: premium Egyptian kidswear, high-quality cotton, stitched finishing, modern fit
[DESIGN STYLE]: ${finalDesignStyle} - suitable for children's fashion
[AGE]: ${finalAge}
[COLORS]: main=${finalMainColor}, secondary=${finalSecondaryColor}
[GRAPHICS]: ${finalGraphic}
[LOGO/BRANDING]: ${logoText}${hasLogo ? " (IMPORTANT: use the exact attached logo design)" : ""}
[DISPLAY]: ${displayText}
[BACKGROUND]: ${finalBackground}
[ASPECT RATIO]: ${finalAspectRatio.value} (${finalAspectRatio.dimensions})
[CAMERA]: studio-grade lighting, sharp details, commercial fashion photography
[QUALITY]: 8k ultra-realistic, fabric texture visible, true-to-life colors`;

      setGeneratedPrompt(prompt);
      setIsGenerating(false);
      toast.success(forceFullRandom ? "تم توليد تصميم عشوائي جديد كلياً! 🎲" : "تم توليد البرومبت بنجاح!");
    }, 600);
  }, [clothingType, ageGroup, mainColor, secondaryColor, randomColors, displayMode, background, modelImages, designStyle, graphicOption, logoPosition, logoImage, aspectRatio]);

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

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
          <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">Prompt Generator</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">أنشئ برومبتات احترافية لتصوير المنتجات</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs value={promptMode} onValueChange={(v) => setPromptMode(v as "manual" | "reference" | "universal")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 p-1 h-auto gap-1">
          <TabsTrigger value="manual" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">ملابس أطفال</span>
            <span className="sm:hidden text-[11px]">ملابس</span>
          </TabsTrigger>
          <TabsTrigger value="reference" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <ScanSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">تصميم مرجعي</span>
            <span className="sm:hidden text-[11px]">مرجعي</span>
          </TabsTrigger>
          <TabsTrigger value="universal" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">برومبت عام</span>
            <span className="sm:hidden text-[11px]">عام</span>
          </TabsTrigger>
        </TabsList>

        {/* Reference Mode Tab */}
        <TabsContent value="reference" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Reference Options */}
            <div className="space-y-4">
              {/* Reference Image Upload */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ScanSearch className="h-4 w-4 text-primary" />
                    صورة التصميم المرجعي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {referencePreview ? (
                    <div className="relative">
                      <img 
                        src={referencePreview} 
                        alt="Reference design" 
                        className="w-full max-h-64 object-contain rounded-lg border-2 border-primary bg-muted p-2"
                      />
                      <button
                        onClick={removeReference}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <span className="text-sm font-medium">ارفع صورة التصميم</span>
                        <p className="text-xs text-muted-foreground mt-1">سيتم تحليلها لإنشاء تصميم مشابه</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  
                  {referencePreview && (
                    <Button
                      onClick={analyzeReferenceDesign}
                      disabled={isAnalyzing}
                      className="w-full"
                      variant="outline"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <ScanSearch className="h-4 w-4 ml-2" />
                          تحليل التصميم بالذكاء الاصطناعي
                        </>
                      )}
                    </Button>
                  )}

                  {analysisResult && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-1">نتيجة التحليل:</p>
                      <p className="text-xs text-muted-foreground">{analysisResult}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Similarity Level */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-primary" />
                    مستوى التشابه
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SIMILARITY_LEVELS.map((level) => (
                      <motion.button
                        key={level.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSimilarityLevel(level.value)}
                        className={`flex flex-col items-center justify-center text-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                          similarityLevel === level.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-base sm:text-lg shrink-0">{level.icon}</span>
                        <span className="text-xs font-medium truncate w-full">{level.label}</span>
                        <span className="text-[10px] text-muted-foreground text-center line-clamp-2">{level.desc}</span>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Display Option for Reference */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    طريقة عرض التصميم الجديد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {REFERENCE_DISPLAY_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setReferenceDisplayOption(opt.value)}
                        className={`flex flex-col items-center justify-center text-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                          referenceDisplayOption === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-base sm:text-lg shrink-0">{opt.icon}</span>
                        <span className="text-xs font-medium truncate w-full">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground truncate w-full">{opt.desc}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Custom Model Upload */}
                  <AnimatePresence>
                    {referenceDisplayOption === "custom_model" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          <User className="h-3 w-3" />
                          ارفع صورة الموديل/الشخص
                        </Label>
                        {customModelPreview ? (
                          <div className="relative inline-block">
                            <img 
                              src={customModelPreview} 
                              alt="Custom model" 
                              className="h-24 w-24 object-cover rounded-lg border-2 border-primary"
                            />
                            <button
                              onClick={removeCustomModel}
                              className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">اضغط لرفع صورة الشخص</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCustomModelUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Logo for Reference Mode */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    إضافة اللوجو (اختياري)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-16 w-16 object-contain rounded-lg border-2 border-primary bg-white p-1"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">رفع اللوجو</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Aspect Ratio for Reference Mode */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    أبعاد الصورة (Aspect Ratio)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {ASPECT_RATIOS.map((ratio) => (
                      <motion.button
                        key={ratio.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`flex flex-col items-center justify-center text-center gap-0.5 p-2 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                          aspectRatio === ratio.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-base sm:text-lg shrink-0">{ratio.icon}</span>
                        <span className="text-xs font-bold truncate w-full">{ratio.label}</span>
                        <span className="text-[9px] text-muted-foreground text-center truncate w-full">{ratio.desc}</span>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Output for Reference Mode */}
            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={generateFromReference}
                  disabled={isGenerating || !referencePreview}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-5 w-5 animate-spin ml-2" />
                  ) : (
                    <Sparkles className="h-5 w-5 ml-2" />
                  )}
                  {isGenerating ? "جاري التوليد..." : "Generate Similar Design Prompt"}
                </Button>
              </motion.div>

              {/* Output Area */}
              <Card className="overflow-hidden">
                <CardHeader className="p-3 border-b bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold">البرومبت الناتج</CardTitle>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateFromReference}
                        disabled={isGenerating || !referencePreview}
                        className="h-8 px-2 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 ml-1" />
                        <span className="hidden sm:inline">تجديد</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        disabled={!generatedPrompt}
                        className="h-8 px-2 text-xs"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-success ml-1" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 ml-1" />
                        )}
                        <span>{copied ? "تم" : "نسخ"}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!generatedPrompt}
                            className="h-8 px-2 text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5 ml-1" />
                            <span>فتح</span>
                            <ChevronDown className="h-3 w-3 mr-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {AI_PLATFORMS.map((platform) => (
                            <DropdownMenuItem
                              key={platform.value}
                              onClick={() => copyAndOpenPlatform(platform)}
                              className="cursor-pointer text-xs"
                            >
                              <span className="ml-2">{platform.icon}</span>
                              {platform.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <AnimatePresence mode="wait">
                    {generatedPrompt ? (
                      <motion.div
                        key="prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Textarea
                          value={generatedPrompt}
                          readOnly
                          className="min-h-[300px] border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm leading-relaxed bg-background"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-muted-foreground"
                      >
                        <div className="p-4 rounded-full bg-muted">
                          <ScanSearch className="h-8 w-8" />
                        </div>
                        <p className="text-sm text-center">
                          ارفع صورة تصميم مرجعي<br />ثم اضغط Generate لإنشاء برومبت مشابه
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Tips for Reference Mode */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    نصائح للتصميم المرجعي
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• ارفع صورة واضحة للتصميم الذي تريد شيء مشابه له</li>
                    <li>• اختر "قريب جداً" للحصول على تصميم مطابق تقريباً</li>
                    <li>• اختر "مستوحى" للحصول على إبداع جديد بنفس الروح</li>
                    <li>• يمكنك رفع صورة شخص لعرض التصميم عليه</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Manual Mode Tab */}
        <TabsContent value="manual">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Options Column */}
            <div className="space-y-4">
          {/* Clothing Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shirt className="h-4 w-4 text-primary" />
                فئة اللبس
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={clothingType}
                onValueChange={setClothingType}
                className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
              >
                {CLOTHING_TYPES.map((type) => (
                  <motion.div
                    key={type.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="min-w-0 w-full"
                  >
                    <Label
                      htmlFor={type.value}
                      className={`flex items-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all min-w-0 overflow-hidden ${
                        clothingType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                      <span className="text-base sm:text-lg shrink-0">{type.icon}</span>
                      <span className="text-xs font-medium truncate">{type.label}</span>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Age Group */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Baby className="h-4 w-4 text-primary" />
                عمر الطفل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الفئة العمرية" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((age) => (
                    <SelectItem key={age.value} value={age.value}>
                      {age.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                الألوان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="اللون الرئيسي (مثال: navy)"
                  value={mainColor}
                  onChange={(e) => setMainColor(e.target.value)}
                  disabled={randomColors}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={randomizeMainColor}
                  disabled={randomColors}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="اللون الثانوي (اختياري)"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={randomColors}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="randomColors"
                  checked={randomColors}
                  onCheckedChange={(checked) => setRandomColors(checked as boolean)}
                />
                <Label htmlFor="randomColors" className="text-sm cursor-pointer">
                  ألوان عشوائية
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Design Style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                أسلوب التصميم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DESIGN_STYLES.map((style) => (
                  <motion.button
                    key={style.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDesignStyle(style.value)}
                    className={`flex flex-col items-center justify-center text-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                      designStyle === style.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base sm:text-lg shrink-0">{style.icon}</span>
                    <span className="text-xs font-medium truncate w-full">{style.label}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">{style.desc}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Graphic Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                نوع الرسومات/الجرافيك
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {GRAPHIC_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGraphicOption(opt.value)}
                    className={`flex flex-col items-center justify-center text-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                      graphicOption === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base sm:text-lg shrink-0">{opt.icon}</span>
                    <span className="text-xs font-medium truncate w-full">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">{opt.desc}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload & Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                اللوجو/الشعار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">أرفق صورة اللوجو (اختياري)</Label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-20 w-20 object-contain rounded-lg border-2 border-primary bg-white p-1"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">اضغط لرفع اللوجو</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              {/* Logo Position */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">مكان اللوجو</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {LOGO_POSITIONS.map((pos) => (
                    <motion.button
                      key={pos.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLogoPosition(pos.value)}
                      className={`flex items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all min-w-0 overflow-hidden ${
                        logoPosition === pos.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-sm shrink-0">{pos.icon}</span>
                      <span className="text-xs font-medium truncate">{pos.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                طريقة العرض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5">
                {DISPLAY_MODES.map((mode) => (
                  <motion.button
                    key={mode.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDisplayMode(mode.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                      displayMode === mode.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base sm:text-lg shrink-0">{mode.icon}</span>
                    <span className="text-xs font-medium truncate">{mode.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Background */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                الخلفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((bg) => (
                  <motion.button
                    key={bg.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setBackground(bg.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all ${
                      background === bg.value
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border shrink-0"
                      style={{ background: bg.color }}
                    />
                    <span className="text-xs font-medium">{bg.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aspect Ratio for Manual Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                أبعاد الصورة (Aspect Ratio)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <motion.button
                    key={ratio.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`flex flex-col items-center justify-center text-center gap-0.5 p-2 rounded-xl border-2 transition-all min-w-0 overflow-hidden ${
                      aspectRatio === ratio.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base sm:text-lg shrink-0">{ratio.icon}</span>
                    <span className="text-xs font-bold truncate w-full">{ratio.label}</span>
                    <span className="text-[9px] text-muted-foreground text-center truncate w-full">{ratio.desc}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Images */}
          <AnimatePresence>
            {displayMode === "model" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      صور الموديل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">اضغط لرفع الصور</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {modelImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {modelImages.map((file, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="relative"
                            >
                              <Badge variant="secondary" className="pr-1">
                                {file.name.substring(0, 15)}...
                                <button
                                  onClick={() => removeImage(index)}
                                  className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Output Column */}
        <div className="space-y-4">
          {/* Generate Button */}
          <div className="flex gap-2">
            <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={() => generatePrompt(false)}
                disabled={isGenerating}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isGenerating ? (
                  <RefreshCw className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  <Sparkles className="h-5 w-5 ml-2" />
                )}
                {isGenerating ? "جاري التوليد..." : "Generate Prompt"}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => generatePrompt(true)}
                disabled={isGenerating}
                variant="outline"
                className="h-12 sm:h-14 px-3 sm:px-4 text-base sm:text-lg font-bold border-2 border-primary/50 hover:bg-primary/10"
                title="تصميم عشوائي كلياً"
              >
                <Shuffle className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>

          {/* Output Area */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 border-b bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold">البرومبت الناتج</CardTitle>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generatePrompt(true)}
                    disabled={isGenerating}
                    className="h-8 px-2 text-xs"
                    title="تصميم عشوائي كلياً"
                  >
                    <Shuffle className="h-3.5 w-3.5 ml-1" />
                    <span className="hidden sm:inline">عشوائي</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generatePrompt(false)}
                    disabled={isGenerating || !generatedPrompt}
                    className="h-8 px-2 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 ml-1" />
                    <span className="hidden sm:inline">تجديد</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    disabled={!generatedPrompt}
                    className="h-8 px-2 text-xs"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success ml-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 ml-1" />
                    )}
                    <span>{copied ? "تم" : "نسخ"}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!generatedPrompt}
                        className="h-8 px-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        <span>فتح</span>
                        <ChevronDown className="h-3 w-3 mr-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {AI_PLATFORMS.map((platform) => (
                        <DropdownMenuItem
                          key={platform.value}
                          onClick={() => copyAndOpenPlatform(platform)}
                          className="cursor-pointer text-xs"
                        >
                          <span className="ml-2">{platform.icon}</span>
                          {platform.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {generatedPrompt ? (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Textarea
                      value={generatedPrompt}
                      readOnly
                      className="min-h-[300px] border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm leading-relaxed bg-background"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-muted-foreground"
                  >
                    <div className="p-4 rounded-full bg-muted">
                      <Wand2 className="h-8 w-8" />
                    </div>
                    <p className="text-sm">اضغط على "Generate Prompt" لتوليد البرومبت</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                نصائح سريعة
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• استخدم "Random" للحصول على تنوع في المنتجات</li>
                <li>• أرفق صور موديل حقيقية للحصول على نتائج أفضل</li>
                <li>• يمكنك تعديل البرومبت الناتج يدوياً قبل الاستخدام</li>
                <li>• جرب خلفيات مختلفة لتناسب أسلوب متجرك</li>
              </ul>
            </CardContent>
          </Card>
        </div>
          </div>
        </TabsContent>

        {/* Universal Prompt Tab */}
        <TabsContent value="universal" className="space-y-4">
          <UniversalPromptTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
