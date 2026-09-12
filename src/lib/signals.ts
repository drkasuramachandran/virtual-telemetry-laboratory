// Generic biomedical signal generator — ECG, PPG, body temperature.
// Reuses the ECG beat model; PPG and temperature are modelled here.
import { beatValue } from "@/lib/ecg/ecgSignal";

export type SignalType = "ecg" | "ppg" | "temp";

export interface SignalNoise {
  powerlineHz: 50 | 60;
  powerlineAmp: number;
  motionAmp: number;
  driftAmp: number;
}

export interface SignalMeta {
  id: SignalType;
  label: string;
  bandwidth: number; // Hz — highest frequency of interest (for Nyquist)
  hasRate: boolean;
  rateLabel: string;
  rateUnit: string;
  defaultRate: number;
  metric: "hr" | "mean";
  desc: string;
}

export const SIGNAL_META: Record<SignalType, SignalMeta> = {
  ecg: { id: "ecg", label: "ECG (cardiac)", bandwidth: 40, hasRate: true, rateLabel: "Heart rate", rateUnit: "bpm", defaultRate: 75, metric: "hr", desc: "Sharp QRS complexes need wide bandwidth." },
  ppg: { id: "ppg", label: "PPG (pulse / SpO₂)", bandwidth: 10, hasRate: true, rateLabel: "Pulse rate", rateUnit: "bpm", defaultRate: 75, metric: "hr", desc: "Smooth pulsatile waveform with a dicrotic notch." },
  temp: { id: "temp", label: "Body temperature", bandwidth: 1, hasRate: false, rateLabel: "", rateUnit: "", defaultRate: 0, metric: "mean", desc: "Very slowly varying — tiny bandwidth." },
};

function ppgValue(tRel: number, period: number): number {
  const systolic = Math.exp(-Math.pow(tRel - 0.18 * period, 2) / (2 * Math.pow(0.07 * period, 2)));
  const dicrotic = 0.4 * Math.exp(-Math.pow(tRel - 0.5 * period, 2) / (2 * Math.pow(0.06 * period, 2)));
  return systolic + dicrotic - 0.35;
}

function noiseAt(t: number, fs: number, noise: SignalNoise): number {
  let v = 0;
  if (noise.powerlineAmp > 0) v += noise.powerlineAmp * Math.sin(2 * Math.PI * noise.powerlineHz * t);
  if (noise.driftAmp > 0) v += noise.driftAmp * Math.sin(2 * Math.PI * 0.25 * t + 0.7);
  if (noise.motionAmp > 0) v += noise.motionAmp * (0.7 * Math.sin(2 * Math.PI * 0.9 * t + 1.3) + 0.5 * Math.sin(2 * Math.PI * 2.2 * t));
  return v;
}

export interface GenSignals {
  t: number[];
  clean: number[];
  noisy: number[];
  fs: number;
}

export function generateSignal(
  type: SignalType,
  opts: { rateBpm: number; seconds: number; fs: number; noise: SignalNoise },
): GenSignals {
  const { rateBpm, seconds, fs, noise } = opts;
  const n = Math.floor(seconds * fs);
  const period = rateBpm > 0 ? 60 / rateBpm : 1;
  const t: number[] = [];
  const clean: number[] = [];
  const noisy: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = i / fs;
    let c = 0;
    if (type === "ecg") {
      const k = Math.round(ti / period);
      for (let kk = k - 1; kk <= k + 1; kk++) {
        const rel = ti - kk * period;
        if (Math.abs(rel) < period * 0.6) c += beatValue(rel);
      }
    } else if (type === "ppg") {
      const rel = ((ti % period) + period) % period;
      c = ppgValue(rel, period);
    } else {
      // body temperature: slow variation, normalised amplitude
      c = 0.3 * Math.sin(2 * Math.PI * 0.03 * ti) + 0.1 * Math.sin(2 * Math.PI * 0.09 * ti + 1);
    }
    t.push(ti);
    clean.push(c);
    noisy.push(c + noiseAt(ti, fs, noise));
  }
  return { t, clean, noisy, fs };
}
