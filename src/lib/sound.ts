// Web Audio API zero-latency click sound generator for UI interactions
let audioCtx: AudioContext | null = null;

export function playClickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx || audioCtx.state === "suspended") {
      audioCtx = new AudioCtx();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(900, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (_) {}
}

export function initGlobalClickSound() {
  if (typeof window === "undefined") return;
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.closest("button, a, [role='button'], [role='tab'], .nav-item, .menu-item, input[type='submit']")) {
      playClickSound();
    }
  };
  window.addEventListener("click", handler, { capture: true, passive: true });
}
