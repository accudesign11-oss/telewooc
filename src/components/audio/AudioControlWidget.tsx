import { useState } from "react";
import { useAudio } from "@/contexts/AudioContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Volume2, VolumeX, Music, SkipForward, Play, Pause, Disc, MousePointerClick, Sparkles, ListMusic
} from "lucide-react";

export function AudioControlWidget() {
  const {
    clickSoundEnabled,
    setClickSoundEnabled,
    bgMusicMode,
    setBgMusicMode,
    volume,
    setVolume,
    isPlayingMusic,
    togglePlayMusic,
    currentTrackIndex,
    selectTrack,
    currentTrackTitle,
    tracks,
    nextTrack
  } = useAudio();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-5 z-50 font-sans" dir="rtl">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className={`rounded-full shadow-2xl font-bold text-xs gap-2 border-2 transition-all duration-300 ${
              isPlayingMusic
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-purple-400/50 scale-105 shadow-purple-500/30"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 shadow-slate-900/50"
            }`}
          >
            {isPlayingMusic ? (
              <>
                <Disc className="h-4 w-4 text-purple-300 animate-spin" />
                <span className="max-w-[120px] truncate text-[11px]">🎷 كيني جي: {tracks[currentTrackIndex]?.title || "شغال"}</span>
              </>
            ) : (
              <>
                <Music className="h-4 w-4 text-amber-400" />
                <span className="text-[11px]">موسيقى كيني جي والتكة</span>
              </>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-84 p-4 shadow-2xl bg-slate-950/95 border-purple-500/30 text-white dir-rtl text-right rounded-2xl backdrop-blur-xl">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                  <Disc className={`h-4 w-4 ${isPlayingMusic ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h4 className="font-bold text-xs">صوت التكة & مكتبة كيني جي 🎷</h4>
                  <p className="text-[10px] text-slate-400">اختر المقطوعة أو شغّلها عشوائياً</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-300 bg-purple-500/10">
                8 مقطوعات 🎷
              </Badge>
            </div>

            {/* Click Sound Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="click-sound-toggle" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <MousePointerClick className="h-3.5 w-3.5 text-amber-400" />
                  صوت التكة والضغطات
                </Label>
                <p className="text-[10px] text-slate-400">تفعيل/إلغاء صوت النقر في الأزرار والواجهة</p>
              </div>
              <Switch
                id="click-sound-toggle"
                checked={clickSoundEnabled}
                onCheckedChange={setClickSoundEnabled}
              />
            </div>

            {/* Kenny G Background Music Mode & Track Selector */}
            <div className="space-y-3 p-3 bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-purple-300">
                  <Music className="h-3.5 w-3.5" />
                  موسيقى كيني جي (Kenny G Playlist):
                </Label>
                <Badge variant={bgMusicMode === "kenny_g" ? "default" : "outline"} className={bgMusicMode === "kenny_g" ? "bg-purple-600 text-white text-[9px]" : "text-[9px] text-slate-400"}>
                  {bgMusicMode === "kenny_g" ? "مفعّلة" : "تعطيل"}
                </Badge>
              </div>

              {/* Direct Track Selector Dropdown */}
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-300 flex items-center gap-1 font-bold">
                  <ListMusic className="h-3 w-3 text-purple-400" /> اختر المقطوعة المطلوبة مباشرة:
                </Label>
                <Select
                  value={String(currentTrackIndex)}
                  onValueChange={(val) => selectTrack(Number(val))}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-900 border-purple-500/30 text-purple-200">
                    <SelectValue placeholder="اختر مقطوعة كيني جي..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-purple-500/30 text-white max-h-56">
                    {tracks.map((t, idx) => (
                      <SelectItem key={t.id} value={String(idx)} className="text-xs focus:bg-purple-950/60 focus:text-purple-200">
                        {idx + 1}. {t.title} - {t.artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant={bgMusicMode === "kenny_g" ? "default" : "outline"}
                  onClick={() => setBgMusicMode("kenny_g")}
                  className={`flex-1 text-xs font-bold gap-1 ${
                    bgMusicMode === "kenny_g" ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-700 text-slate-300"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" /> تشغيل كيني جي
                </Button>

                <Button
                  size="sm"
                  variant={bgMusicMode === "disabled" ? "destructive" : "outline"}
                  onClick={() => setBgMusicMode("disabled")}
                  className="text-xs font-bold border-slate-700 text-slate-300"
                >
                  تعطيل الموسيقى
                </Button>
              </div>

              {/* Music Controls */}
              {bgMusicMode === "kenny_g" && (
                <div className="space-y-3 pt-2 border-t border-purple-500/20">
                  <div className="text-[11px] text-purple-200 font-medium truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="truncate">{currentTrackTitle}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={togglePlayMusic}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1.5"
                    >
                      {isPlayingMusic ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {isPlayingMusic ? "إيقاف مؤقت" : "تشغيل الآن"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={nextTrack}
                      className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-bold gap-1"
                    >
                      <SkipForward className="h-3.5 w-3.5" /> المقطوعة التالية
                    </Button>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold">
                      <span className="flex items-center gap-1">
                        {volume === 0 ? <VolumeX className="h-3 w-3 text-rose-400" /> : <Volume2 className="h-3 w-3 text-purple-400" />}
                        مستوى الصوت:
                      </span>
                      <span>{volume}%</span>
                    </div>
                    <Slider
                      value={[volume]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(val) => setVolume(val[0])}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
