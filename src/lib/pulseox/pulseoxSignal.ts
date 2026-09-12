// Pulse oximeter simulation — dual-wavelength (red/IR) PPG + SpO2 via ratio-of-ratios.
import { detectPeaks, heartRateFromPeaks } from "@/lib/dsp";

export function ppgPulse(rel: number, period: number): number {
  const systolic = Math.exp(-Math.pow(rel - 0.18 * period, 2) / (2 * Math.pow(0.07 * period, 2)));
  const dicrotic = 0.4 * Math.exp(-Math.pow(rel - 0.5 * period, 2) / (2 * Math.pow(0.06 * period, 2)));
  return systolic + dicrotic;
}

export interface PpgParams {
  hr: number;
  spo2: number; // target SpO2 to encode
  motion: number; // 0..0.6
  ambientReject: boolean;
  fs: number;
  seconds: number;
}

export interface PpgSignals {
  t: number[];
  red: number[];
  ir: number[];
}

export function generatePpg(p: PpgParams): PpgSignals {
  const { hr, spo2, motion, ambientReject, fs, seconds } = p;
  const period = 60 / hr;
  const n = Math.floor(seconds * fs);
  const DCir = 1.0;
  const ACir = 0.02; // ~2% perfusion
  const R = (110 - spo2) / 25;
  const ACred = R * ACir;
  const DCred = 1.0;
  const ambient = ambientReject ? 0.2 : 1.0;
  const t: number[] = [];
  const red: number[] = [];
  const ir: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = i / fs;
    const rel = ((ti % period) + period) % period;
    const pulse = ppgPulse(rel, period);
    const motionW = motion * (0.6 * Math.sin(2 * Math.PI * 0.8 * ti + 0.5) + 0.4 * (Math.random() - 0.5)) * ambient;
    t.push(ti);
    ir.push(DCir + ACir * pulse + motionW * 0.02 + (Math.random() - 0.5) * 0.001 * ambient);
    red.push(DCred + ACred * pulse + motionW * 0.024 + (Math.random() - 0.5) * 0.001 * ambient);
  }
  return { t, red, ir };
}

export interface PpgResult {
  spo2: number;
  r: number;
  pi: number; // perfusion index %
  hr: number;
  quality: "Good" | "Fair" | "Poor";
}

export function analyzePpg(sig: PpgSignals, fs: number): PpgResult {
  const acdc = (a: number[]) => {
    const mn = Math.min(...a);
    const mx = Math.max(...a);
    const dc = a.reduce((x, y) => x + y, 0) / a.length;
    return { ac: mx - mn, dc };
  };
  const ri = acdc(sig.ir);
  const rr = acdc(sig.red);
  const R = ri.ac > 0 ? (rr.ac / rr.dc) / (ri.ac / ri.dc) : 0;
  const spo2 = Math.max(70, Math.min(100, 110 - 25 * R));
  const pi = (ri.ac / ri.dc) * 100;
  const hr = heartRateFromPeaks(detectPeaks(sig.ir, fs), fs).bpm;
  const quality: PpgResult["quality"] = pi > 1.6 ? "Good" : pi > 0.9 ? "Fair" : "Poor";
  return { spo2: Math.round(spo2), r: +R.toFixed(3), pi: +pi.toFixed(2), hr, quality };
}
