// Movement sound cues (U-004): every parkour action has one fixed, recognisable sound.
import type { Audio } from './audio';

type Play = (a: Audio, t: number) => void;

/** A short breathy exhale ("hup"). */
const breath = (a: Audio, t: number, gain: number, dur = 0.16, f = 900) => a.noise(t, dur, gain, 'bandpass', f, 1.4, f * 0.7);

export const MOVE_SOUNDS: Record<string, Play> = {
  'step-crawl': (a, t) => a.noise(t, 0.18, 0.05, 'bandpass', 2400, 0.8, 1600),
  'step-crouch': (a, t) => a.noise(t, 0.07, 0.08, 'lowpass', 900),
  'step-jog': (a, t) => { a.noise(t, 0.08, 0.16, 'lowpass', 1100); a.tone(t, 0.06, 0.06, 90, 60); },
  'step-sprint': (a, t) => { a.noise(t, 0.09, 0.26, 'lowpass', 1600); a.tone(t, 0.07, 0.1, 110, 60); },
  jump: (a, t) => { a.noise(t, 0.07, 0.22, 'lowpass', 1500); breath(a, t + 0.02, 0.07); },
  land: (a, t) => { a.tone(t, 0.12, 0.25, 85, 45); a.noise(t, 0.1, 0.18, 'lowpass', 700); },
  'land-hard': (a, t) => { a.tone(t, 0.2, 0.45, 70, 35); a.noise(t, 0.16, 0.35, 'lowpass', 500); breath(a, t + 0.05, 0.12, 0.22, 600); },
  roll: (a, t) => { a.tone(t, 0.1, 0.2, 80, 45); a.noise(t + 0.03, 0.4, 0.16, 'bandpass', 1300, 0.7, 500); },
  vault: (a, t) => { a.noise(t, 0.04, 0.3, 'highpass', 2500); a.noise(t + 0.05, 0.25, 0.08, 'bandpass', 600, 0.6, 1800); },
  hop: (a, t) => { a.noise(t, 0.04, 0.25, 'highpass', 2200); a.noise(t + 0.06, 0.12, 0.12, 'lowpass', 900); },
  slide: (a, t) => a.noise(t, 0.85, 0.22, 'bandpass', 1800, 0.5, 400),
  // The wall kick: a hard rubber thud with a bright snap, always the same.
  wallkick: (a, t) => { a.tone(t, 0.09, 0.5, 160, 70, 'triangle'); a.noise(t, 0.035, 0.35, 'highpass', 3000); breath(a, t + 0.03, 0.09, 0.14, 1100); },
  wallrun: (a, t) => { a.tone(t, 0.08, 0.35, 150, 80, 'triangle'); a.noise(t, 0.05, 0.2, 'bandpass', 1800); },
  wallstep: (a, t) => { a.tone(t, 0.06, 0.25, 140, 90, 'triangle'); a.noise(t, 0.04, 0.14, 'bandpass', 2000); },
  // Hands: a dry slap on the hold; two hands slap twice.
  // Braced across a gap (M3-78): shoulders and soles scuffing the walls.
  brace: (a, t) => { a.noise(t, 0.12, 0.12, 'bandpass', 900, 0.8, 600); a.noise(t + 0.1, 0.08, 0.08, 'bandpass', 1400, 1, 900); },
  grab: (a, t) => { a.noise(t, 0.05, 0.35, 'bandpass', 2600, 1.2); a.tone(t, 0.04, 0.08, 400, 250); },
  grab2: (a, t) => { a.noise(t, 0.05, 0.35, 'bandpass', 2600, 1.2); a.noise(t + 0.06, 0.05, 0.3, 'bandpass', 2300, 1.2); },
  slip: (a, t) => { a.noise(t, 0.3, 0.25, 'bandpass', 3500, 1.5, 900); breath(a, t + 0.05, 0.14, 0.2, 1300); },
  release: (a, t) => a.noise(t, 0.12, 0.06, 'bandpass', 1200, 0.8, 600),
  pullover: (a, t) => { breath(a, t, 0.12, 0.3, 500); a.noise(t + 0.15, 0.3, 0.12, 'bandpass', 900, 0.6, 400); },
  // Palm flat on the wall: a soft pat and a breath in.
  cling: (a, t) => { a.noise(t, 0.06, 0.18, 'lowpass', 1400); a.noise(t + 0.02, 0.18, 0.05, 'bandpass', 700, 1, 1100); },
  pump: (a, t) => { a.noise(t, 0.2, 0.06, 'bandpass', 500, 0.7, 900); a.tone(t, 0.12, 0.05, 220, 180, 'triangle'); },
  // The headlamp's switch: a small plastic click.
  click: (a, t) => { a.noise(t, 0.015, 0.25, 'highpass', 4000); a.tone(t, 0.02, 0.06, 2400, 1800, 'square'); },
  // Doors and windows (M3-36): a hinge's creak, a slam, a lock wrenched out, glass going.
  'door-open': (a, t) => { a.noise(t, 0.3, 0.08, 'bandpass', 700, 3, 350); a.tone(t + 0.04, 0.28, 0.04, 240, 190, 'sawtooth'); },
  'door-close': (a, t) => { a.tone(t, 0.14, 0.3, 95, 55); a.noise(t, 0.1, 0.2, 'lowpass', 500); },
  force: (a, t) => { a.tone(t, 0.18, 0.5, 130, 45); a.noise(t, 0.25, 0.4, 'bandpass', 1100, 1, 300); a.noise(t + 0.2, 0.15, 0.3, 'highpass', 2500); },
  // The start hideout's grate (M3-72): iron bolts shot or drawn and the grate grinding over its frame; a lighter
  // clang lifting or lowering it; bin bags dragged; something let fall.
  'grate-bolt': (a, t) => { for (let i = 0; i < 2; i++) { a.tone(t + i * 0.35, 0.12, 0.35, 420, 260, 'square'); a.noise(t + i * 0.35, 0.08, 0.3, 'highpass', 2500); } a.noise(t + 0.8, 0.7, 0.3, 'bandpass', 500, 2, 250); a.tone(t + 1.5, 0.3, 0.45, 110, 60); },
  'grate-open': (a, t) => { a.noise(t, 0.5, 0.22, 'bandpass', 600, 2, 300); a.tone(t + 0.45, 0.25, 0.3, 140, 80); },
  'grate-shut': (a, t) => { a.noise(t, 0.3, 0.18, 'bandpass', 700, 2, 350); a.tone(t + 0.25, 0.3, 0.4, 120, 60); },
  bags: (a, t) => { a.noise(t, 0.6, 0.12, 'bandpass', 1400, 0.6, 600); a.noise(t + 0.5, 0.5, 0.1, 'bandpass', 1100, 0.6, 500); },
  drop: (a, t) => { a.noise(t, 0.08, 0.12, 'lowpass', 900); a.tone(t, 0.05, 0.05, 160, 90); },
  glass: (a, t) => { a.noise(t, 0.5, 0.45, 'highpass', 3500, 0.7, 7000); for (let i = 0; i < 5; i++) a.tone(t + 0.05 + i * 0.04, 0.06, 0.08, 3800 + i * 600, 3000, 'sine'); },
  dyno: (a, t) => { a.tone(t, 0.1, 0.35, 130, 60, 'triangle'); breath(a, t, 0.14, 0.22, 800); },
};

export function playMove(a: Audio, id: string) {
  const f = MOVE_SOUNDS[id];
  if (!f || !a.ready) return;
  f(a, a.ctx!.currentTime + 0.005);
}
