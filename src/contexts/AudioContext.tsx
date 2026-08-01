import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export interface KennyTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  fallbackUrl?: string;
}

// Expanded playlist of Kenny G tracks requested by user with direct high-speed mp3 links
export const KENNY_G_TRACKS: KennyTrack[] = [
  {
    id: "kenny_g_custom",
    title: "Kenny G (Style Sax Romantic)",
    artist: "Kenny G",
    url: "https://cdn.pixabay.com/download/audio/2021/04/16/audio_f58cf5ce5a.mp3?filename=kenny-g-style-sax-romantic-music-by-edibaz-8608.mp3",
    fallbackUrl: "https://cdn.pixabay.com/download/audio/2021/04/16/audio_f58cf5ce5a.mp3?filename=kenny-g-style-sax-romantic-music-by-edibaz-8608.mp3"
  }
];

// Soft, pleasant UI click sound URI (Short clean high-res pop)
const CLICK_SOUND_URI = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

interface AudioContextType {
  clickSoundEnabled: boolean;
  setClickSoundEnabled: (enabled: boolean) => void;
  bgMusicMode: "disabled" | "kenny_g";
  setBgMusicMode: (mode: "disabled" | "kenny_g") => void;
  volume: number;
  setVolume: (vol: number) => void;
  isPlayingMusic: boolean;
  togglePlayMusic: () => void;
  currentTrackIndex: number;
  selectTrack: (idx: number) => void;
  currentTrackTitle: string;
  tracks: KennyTrack[];
  nextTrack: () => void;
  playClickSound: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const STORAGE_KEY = "telewoo_audio_settings";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clickSoundEnabled, setClickSoundEnabled] = useState<boolean>(true);
  const [bgMusicMode, setBgMusicMode] = useState<"disabled" | "kenny_g">("disabled");
  const [volume, setVolume] = useState<number>(30);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number>(0);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load audio settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.clickSoundEnabled === "boolean") setClickSoundEnabled(parsed.clickSoundEnabled);
        if (parsed.bgMusicMode === "disabled" || parsed.bgMusicMode === "kenny_g") setBgMusicMode(parsed.bgMusicMode);
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
        if (typeof parsed.currentTrackIdx === "number" && parsed.currentTrackIdx < KENNY_G_TRACKS.length) {
          setCurrentTrackIdx(parsed.currentTrackIdx);
        }
      }
    } catch (e) {
      console.warn("Failed to load audio settings:", e);
    }
  }, []);

  // Save audio settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ clickSoundEnabled, bgMusicMode, volume, currentTrackIdx })
      );
    } catch (e) {}
  }, [clickSoundEnabled, bgMusicMode, volume, currentTrackIdx]);

  // Click Sound Listener (Only plays when clickSoundEnabled is TRUE)
  useEffect(() => {
    clickAudioRef.current = new Audio(CLICK_SOUND_URI);
    clickAudioRef.current.volume = 0.15;

    const handleGlobalClick = (e: MouseEvent) => {
      if (!clickSoundEnabled) return;
      const target = e.target as HTMLElement;
      if (
        target && (
          target.closest("button") ||
          target.closest("a") ||
          target.closest("input[type='button']") ||
          target.closest("input[type='submit']") ||
          target.closest("[role='button']")
        )
      ) {
        try {
          if (clickAudioRef.current) {
            clickAudioRef.current.currentTime = 0;
            clickAudioRef.current.play().catch(() => {});
          }
        } catch (_) {}
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [clickSoundEnabled]);

  // Background Music Controller
  useEffect(() => {
    if (bgMusicMode === "disabled") {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        setIsPlayingMusic(false);
      }
      return;
    }

    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio();
      bgAudioRef.current.addEventListener("ended", () => {
        const nextIdx = (currentTrackIdx + 1) % KENNY_G_TRACKS.length;
        setCurrentTrackIdx(nextIdx);
      });
      bgAudioRef.current.addEventListener("error", () => {
        console.warn("Track load retry with fallback...");
        const track = KENNY_G_TRACKS[currentTrackIdx];
        if (track?.fallbackUrl && bgAudioRef.current) {
          bgAudioRef.current.src = track.fallbackUrl;
          if (isPlayingMusic) bgAudioRef.current.play().catch(() => {});
        }
      });
    }

    const track = KENNY_G_TRACKS[currentTrackIdx];
    if (bgAudioRef.current.src !== track.url && bgAudioRef.current.src !== track.fallbackUrl) {
      bgAudioRef.current.src = track.url;
    }
    bgAudioRef.current.volume = volume / 100;

    if (isPlayingMusic) {
      bgAudioRef.current.play().then(() => {
        setIsPlayingMusic(true);
      }).catch((err) => {
        console.warn("Autoplay note:", err);
        setIsPlayingMusic(false);
      });
    } else {
      bgAudioRef.current.pause();
    }
  }, [bgMusicMode, currentTrackIdx, isPlayingMusic]);

  // Sync volume with active audio element
  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlayMusic = () => {
    if (bgMusicMode === "disabled") {
      setBgMusicMode("kenny_g");
      setIsPlayingMusic(true);
    } else {
      setIsPlayingMusic(prev => !prev);
    }
  };

  const nextTrack = () => {
    const nextIdx = (currentTrackIdx + 1) % KENNY_G_TRACKS.length;
    setCurrentTrackIdx(nextIdx);
    setIsPlayingMusic(true);
  };

  const selectTrack = (idx: number) => {
    if (idx >= 0 && idx < KENNY_G_TRACKS.length) {
      setCurrentTrackIdx(idx);
      setBgMusicMode("kenny_g");
      setIsPlayingMusic(true);
    }
  };

  const playClickSound = () => {
    if (clickSoundEnabled && clickAudioRef.current) {
      try {
        clickAudioRef.current.currentTime = 0;
        clickAudioRef.current.play().catch(() => {});
      } catch (_) {}
    }
  };

  const currentTrack = KENNY_G_TRACKS[currentTrackIdx];

  return (
    <AudioContext.Provider
      value={{
        clickSoundEnabled,
        setClickSoundEnabled,
        bgMusicMode,
        setBgMusicMode,
        volume,
        setVolume,
        isPlayingMusic,
        togglePlayMusic,
        currentTrackIndex: currentTrackIdx,
        selectTrack,
        currentTrackTitle: `${currentTrack?.title} (${currentTrack?.artist})`,
        tracks: KENNY_G_TRACKS,
        nextTrack,
        playClickSound,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
