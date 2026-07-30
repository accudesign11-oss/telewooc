import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export function VoiceInputButton({ onTranscript, className, size = "icon" }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) return;

        setIsProcessing(true);
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const base64Audio = await blobToBase64(audioBlob);

          const { data, error } = await supabase.functions.invoke("voice-to-text", {
            body: { audio: base64Audio },
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          if (data.text) {
            onTranscript(data.text);
          }
        } catch (error: any) {
          console.error("Transcription error:", error);
          toast({
            title: "خطأ في تحويل الصوت",
            description: error.message || "فشل في تحويل الصوت إلى نص",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "جاري التسجيل...", description: "تحدث الآن" });
    } catch (error: any) {
      console.error("Microphone error:", error);
      toast({
        title: "خطأ في الميكروفون",
        description: "تأكد من إعطاء صلاحية الميكروفون",
        variant: "destructive",
      });
    }
  }, [onTranscript, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size={size}
      onClick={toggleRecording}
      disabled={isProcessing}
      className={cn("transition-all", className)}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
