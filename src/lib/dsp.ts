// Generic DSP utilities — reused by the ECG engine and the Signal Conditioning Lab.

/** First-order (one-pole) low-pass filter. */
export function lowPass(x: number[], fs: number, fc: number): number[] {
  if (fc <= 0 || fc >= fs / 2) return [...x];
  const dt = 1 / fs;
  const rc = 1 / (2 * Math.PI * fc);
  const a = dt / (rc + dt);
  const y = new Array(x.length);
  y[0] = x[0];
  for (let i = 1; i < x.length; i++) y[i] = y[i - 1] + a * (x[i] - y[i - 1]);
  return y;
}

/** First-order high-pass filter (removes baseline drift). */
export function highPass(x: number[], fs: number, fc: number): number[] {
  if (fc <= 0) return [...x];
  const dt = 1 / fs;
  const rc = 1 / (2 * Math.PI * fc);
  const a = rc / (rc + dt);
  const y = new Array(x.length);
  y[0] = x[0];
  for (let i = 1; i < x.length; i++) y[i] = a * (y[i - 1] + x[i] - x[i - 1]);
  return y;
}

/** Biquad notch filter (removes powerline interference at f0). */
export function notch(x: number[], fs: number, f0: number, Q = 30): number[] {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw = Math.cos(w0);
  const b0 = 1,
    b1 = -2 * cosw,
    b2 = 1,
    a0 = 1 + alpha,
    a1 = -2 * cosw,
    a2 = 1 - alpha;
  const y = new Array(x.length).fill(0);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const xi1 = i >= 1 ? x[i - 1] : 0;
    const xi2 = i >= 2 ? x[i - 2] : 0;
    const yi1 = i >= 1 ? y[i - 1] : 0;
    const yi2 = i >= 2 ? y[i - 2] : 0;
    y[i] = (b0 / a0) * xi + (b1 / a0) * xi1 + (b2 / a0) * xi2 - (a1 / a0) * yi1 - (a2 / a0) * yi2;
  }
  return y;
}

/** Quantize to `bits` resolution over [vmin, vmax] — models the ADC. */
export function quantize(x: number[], bits: number, vmin: number, vmax: number): number[] {
  const levels = Math.pow(2, bits);
  const step = (vmax - vmin) / (levels - 1);
  return x.map((v) => {
    const c = Math.max(vmin, Math.min(vmax, v));
    return Math.round((c - vmin) / step) * step + vmin;
  });
}

/** Downsample by nearest-sample at fsOut from a signal sampled at fsIn. */
export function resample(x: number[], fsIn: number, fsOut: number): { t: number[]; y: number[] } {
  const dur = x.length / fsIn;
  const n = Math.max(1, Math.floor(dur * fsOut));
  const t: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = i / fsOut;
    const idx = Math.min(x.length - 1, Math.round(ti * fsIn));
    t.push(ti);
    y.push(x[idx]);
  }
  return { t, y };
}

/** Apparent (aliased) frequency of a tone f sampled at fs. */
export function aliasFrequency(f: number, fs: number): number {
  const k = Math.round(f / fs);
  return Math.abs(f - k * fs);
}

/** Simple R-peak detector on a conditioned ECG (mV). Returns sample indices. */
export function detectRPeaks(x: number[], fs: number): number[] {
  const n = x.length;
  if (n < 3) return [];
  // squared first-difference emphasises QRS slopes
  const d = new Array(n).fill(0);
  for (let i = 1; i < n; i++) d[i] = Math.pow(x[i] - x[i - 1], 2);
  const max = Math.max(...d);
  const thr = 0.35 * max;
  const refractory = Math.floor(0.25 * fs);
  const peaks: number[] = [];
  let last = -refractory;
  for (let i = 1; i < n - 1; i++) {
    if (d[i] > thr && d[i] >= d[i - 1] && d[i] > d[i + 1] && i - last > refractory) {
      // snap to local max of x nearby
      let p = i;
      const w = Math.floor(0.05 * fs);
      for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++)
        if (x[j] > x[p]) p = j;
      peaks.push(p);
      last = i;
    }
  }
  return peaks;
}

/** Amplitude-based peak detector for smooth signals (e.g. PPG). */
export function detectPeaks(x: number[], fs: number): number[] {
  const n = x.length;
  if (n < 3) return [];
  const max = Math.max(...x);
  const min = Math.min(...x);
  const thr = min + 0.55 * (max - min);
  const refractory = Math.floor(0.33 * fs);
  const peaks: number[] = [];
  let last = -refractory;
  for (let i = 1; i < n - 1; i++) {
    if (x[i] > thr && x[i] >= x[i - 1] && x[i] > x[i + 1] && i - last > refractory) {
      peaks.push(i);
      last = i;
    }
  }
  return peaks;
}

export interface HeartRateResult {
  bpm: number;
  irregular: boolean;
  abnormal: boolean;
  rrMs: number[];
  flag: string;
}

export function heartRateFromPeaks(peaks: number[], fs: number): HeartRateResult {
  if (peaks.length < 2)
    return { bpm: 0, irregular: false, abnormal: true, rrMs: [], flag: "Insufficient beats detected" };
  const rr: number[] = [];
  for (let i = 1; i < peaks.length; i++) rr.push(((peaks[i] - peaks[i - 1]) / fs) * 1000);
  const meanRR = rr.reduce((a, b) => a + b, 0) / rr.length;
  const bpm = Math.round(60000 / meanRR);
  const std = Math.sqrt(rr.reduce((a, b) => a + Math.pow(b - meanRR, 2), 0) / rr.length);
  const irregular = std / meanRR > 0.18;
  let flag = "Normal sinus rhythm";
  let abnormal = false;
  if (bpm < 50) {
    flag = "Bradycardia (slow rate)";
    abnormal = true;
  } else if (bpm > 120) {
    flag = "Tachycardia (fast rate)";
    abnormal = true;
  } else if (irregular) {
    flag = "Irregular rhythm detected";
    abnormal = true;
  }
  return { bpm, irregular, abnormal, rrMs: rr, flag };
}
