// Conceptual CGM model — NOT a real glucose sensor. Educational only.

export interface CgmParams {
  intervalMin: number;
  hours: number;
  driftMgDl: number; // total drift over the window (calibration drift)
  noiseMgDl: number;
  lossPct: number; // comm packet loss
}

export interface CgmReading {
  tMin: number;
  value: number; // mg/dL
  delivered: boolean;
}

export function generateGlucose(p: CgmParams): CgmReading[] {
  const { intervalMin, hours, driftMgDl, noiseMgDl, lossPct } = p;
  const totalMin = hours * 60;
  const n = Math.floor(totalMin / intervalMin);
  const readings: CgmReading[] = [];
  for (let i = 0; i < n; i++) {
    const tMin = i * intervalMin;
    const meal = 45 * Math.sin((2 * Math.PI * tMin) / 240) + 20 * Math.sin((2 * Math.PI * tMin) / 90 + 1);
    const drift = (driftMgDl * tMin) / totalMin;
    const noise = (Math.random() - 0.5) * 2 * noiseMgDl;
    const value = Math.max(40, 110 + meal + drift + noise);
    readings.push({ tMin, value: Math.round(value), delivered: Math.random() * 100 >= lossPct });
  }
  return readings;
}

export type TrendArrow = "↑↑" | "↑" | "→" | "↓" | "↓↓";

export function computeTrend(readings: CgmReading[]): { arrow: TrendArrow; rate: number } {
  const delivered = readings.filter((r) => r.delivered);
  if (delivered.length < 3) return { arrow: "→", rate: 0 };
  const last = delivered.slice(-3);
  const rate = (last[2].value - last[0].value) / ((last[2].tMin - last[0].tMin) || 1); // mg/dL per min
  let arrow: TrendArrow = "→";
  if (rate > 2) arrow = "↑↑";
  else if (rate > 0.7) arrow = "↑";
  else if (rate < -2) arrow = "↓↓";
  else if (rate < -0.7) arrow = "↓";
  return { arrow, rate: +rate.toFixed(2) };
}

export function alertLevel(value: number, low: number, high: number): "low" | "high" | "ok" {
  if (value < low) return "low";
  if (value > high) return "high";
  return "ok";
}
