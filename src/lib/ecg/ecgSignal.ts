// ECG signal model + full analog→conditioned pipeline. Client-side simulation only.
import { lowPass, highPass, notch } from "@/lib/dsp";

export interface EcgNoise {
  powerlineHz: 0 | 50 | 60;
  powerlineAmp: number; // mV
  motionAmp: number; // mV
  driftAmp: number; // mV
}

export interface EcgGenParams {
  hrBpm: number;
  seconds: number;
  fsAnalog: number; // "continuous" sampling for simulation
  noise: EcgNoise;
}

// PQRST components: time offset (s), amplitude (mV), gaussian width (s)
const COMPONENTS = [
  { t: -0.2, a: 0.08, w: 0.025 }, // P
  { t: -0.028, a: -0.13, w: 0.007 }, // Q
  { t: 0.0, a: 1.05, w: 0.0095 }, // R
  { t: 0.03, a: -0.28, w: 0.008 }, // S
  { t: 0.22, a: 0.3, w: 0.045 }, // T
];

export function beatValue(tRel: number): number {
  let v = 0;
  for (const c of COMPONENTS) v += c.a * Math.exp(-Math.pow(tRel - c.t, 2) / (2 * c.w * c.w));
  return v;
}

export interface EcgSignals {
  t: number[];
  clean: number[];
  noisy: number[];
  fs: number;
}

/** Generate the clean ECG plus a noisy version (clean + selected artifacts). */
export function generateEcg(p: EcgGenParams): EcgSignals {
  const { hrBpm, seconds, fsAnalog, noise } = p;
  const period = 60 / hrBpm;
  const n = Math.floor(seconds * fsAnalog);
  const t: number[] = [];
  const clean: number[] = [];
  const noisy: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = i / fsAnalog;
    // nearest beat centers
    const k = Math.round(ti / period);
    let c = 0;
    for (let kk = k - 1; kk <= k + 1; kk++) {
      const center = kk * period;
      const rel = ti - center;
      if (Math.abs(rel) < period * 0.6) c += beatValue(rel);
    }
    let noiseV = 0;
    if (noise.powerlineHz > 0)
      noiseV += noise.powerlineAmp * Math.sin(2 * Math.PI * noise.powerlineHz * ti);
    if (noise.driftAmp > 0) noiseV += noise.driftAmp * Math.sin(2 * Math.PI * 0.25 * ti + 0.7);
    if (noise.motionAmp > 0)
      noiseV +=
        noise.motionAmp *
        (0.7 * Math.sin(2 * Math.PI * 0.9 * ti + 1.3) + 0.5 * Math.sin(2 * Math.PI * 2.2 * ti));
    t.push(ti);
    clean.push(c);
    noisy.push(c + noiseV);
  }
  return { t, clean, noisy, fs: fsAnalog };
}

export interface ConditioningParams {
  gain: number;
  hpOn: boolean;
  hpCut: number;
  lpOn: boolean;
  lpCut: number;
  notchHz: 0 | 50 | 60;
}

/**
 * Apply amplifier + filters to a noisy signal.
 * Returns amplified (pre-filter) and conditioned (post-filter), both normalised
 * back to mV-equivalent for display by dividing by gain.
 */
export function condition(
  noisy: number[],
  fs: number,
  p: ConditioningParams,
): { amplified: number[]; conditioned: number[] } {
  const amplified = noisy.map((v) => v * p.gain);
  let y = amplified;
  if (p.hpOn) y = highPass(y, fs, p.hpCut);
  if (p.notchHz > 0) y = notch(y, fs, p.notchHz);
  if (p.lpOn) y = lowPass(y, fs, p.lpCut);
  const conditioned = y.map((v) => v / p.gain);
  return { amplified: amplified.map((v) => v / p.gain), conditioned };
}
