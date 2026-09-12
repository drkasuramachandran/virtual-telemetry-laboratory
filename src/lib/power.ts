// Edge-processing modes + power budget computation.

export interface EdgeMode {
  id: string;
  label: string;
  reductionFactor: number; // divides raw data rate
  powerRel: number; // relative MCU processing power multiplier
  desc: string;
}

export const EDGE_MODES: EdgeMode[] = [
  { id: "raw", label: "Raw streaming", reductionFactor: 1, powerRel: 1.0, desc: "Send every sample. Simplest, highest bandwidth & radio energy." },
  { id: "feature", label: "Feature extraction", reductionFactor: 10, powerRel: 1.4, desc: "Send derived features (e.g. HR, intervals). More MCU work, far less data." },
  { id: "event", label: "Event-based", reductionFactor: 50, powerRel: 1.2, desc: "Transmit only on abnormal events. Lowest data, but can miss context." },
  { id: "hybrid", label: "Hybrid", reductionFactor: 20, powerRel: 1.5, desc: "Features continuously + raw snapshots on events. Balanced." },
];

export function edgeMode(id: string): EdgeMode {
  return EDGE_MODES.find((m) => m.id === id) ?? EDGE_MODES[0];
}

export interface PowerStage {
  label: string;
  currentMa: number;
  duty: number; // 0..1 fraction of time active
}

export interface BatteryResult {
  avgCurrentMa: number;
  powerMw: number;
  hours: number;
  days: number;
}

export function computeBattery(
  stages: PowerStage[],
  batteryMah: number,
  voltage = 3.0,
): BatteryResult {
  const avgCurrentMa = stages.reduce((a, s) => a + s.currentMa * s.duty, 0);
  const powerMw = avgCurrentMa * voltage;
  const hours = avgCurrentMa > 0 ? batteryMah / avgCurrentMa : 0;
  return {
    avgCurrentMa: +avgCurrentMa.toFixed(3),
    powerMw: +powerMw.toFixed(2),
    hours: +hours.toFixed(1),
    days: +(hours / 24).toFixed(2),
  };
}

// ---- ADC / sampling metrics ----------------------------------------------

export interface AdcMetrics {
  nyquist: number;
  samplesPerSec: number;
  bitsPerSample: number;
  rawDataRateBps: number;
  dailyBytes: number;
  nyquistViolated: boolean;
}

export function computeAdc(fs: number, bits: number, bandwidthHz: number): AdcMetrics {
  return {
    nyquist: fs / 2,
    samplesPerSec: fs,
    bitsPerSample: bits,
    rawDataRateBps: fs * bits,
    dailyBytes: (fs * bits * 86400) / 8,
    nyquistViolated: fs < 2 * bandwidthHz,
  };
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b.toFixed(0)} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}
