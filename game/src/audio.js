// Synthesized sound effects (WebAudio, no audio files). Everything here is
// optional: the game plays silently until the first user gesture.

let audioCtx = null;
let muted = false;

export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain, when = 0) {
  if (!audioCtx || muted) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click() { tone(660, 0.06, 'sine', 0.08); },
  pickup() { tone(880, 0.09, 'sine', 0.12); tone(1318, 0.12, 'sine', 0.1, 0.07); },
  coin() { tone(520, 0.07, 'triangle', 0.1); },
  laser() { tone(220, 0.15, 'sawtooth', 0.12); },
  spotted() { tone(392, 0.12, 'square', 0.08); tone(392, 0.12, 'square', 0.08, 0.15); },
  vault() { tone(523, 0.1, 'sine', 0.12); tone(659, 0.1, 'sine', 0.12, 0.1); tone(784, 0.18, 'sine', 0.12, 0.2); },
  caught() { tone(196, 0.3, 'sawtooth', 0.14); tone(147, 0.45, 'sawtooth', 0.14, 0.2); },
  win() { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.12); tone(784, 0.12, 'sine', 0.12, 0.24); tone(1046, 0.3, 'sine', 0.12, 0.36); },
};
