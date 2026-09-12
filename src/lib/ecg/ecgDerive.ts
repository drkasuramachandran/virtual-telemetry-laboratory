// Derived engineering quantities from the ECG wizard answers.
// Centralised so the config, scoring engine and design report agree.
import { computeAdc, edgeMode, computeBattery, PowerStage, AdcMetrics } from "@/lib/power";
import { LinkRequirements } from "@/lib/wireless";
import { Answers } from "@/components/wizard/types";

export function num(a: Answers, id: string, fallback: number): number {
  const v = Number(a[id]);
  return Number.isFinite(v) && a[id] !== "" ? v : fallback;
}

export function bandwidth(a: Answers): number {
  return num(a, "q_bandwidth", 40);
}

export function adcMetrics(a: Answers): AdcMetrics {
  return computeAdc(num(a, "q_fs", 500), num(a, "q_bits", 12), bandwidth(a));
}

export function effectiveDataRateKbps(a: Answers): number {
  const m = adcMetrics(a);
  const em = edgeMode(a.q_edge || "raw");
  return m.rawDataRateBps / 1000 / em.reductionFactor;
}

const LATENCY_MS: Record<string, number> = { realtime: 1000, seconds: 5000, minutes: 60000 };

export function linkRequirements(a: Answers): LinkRequirements {
  return {
    rangeM: 10,
    dataRateKbps: Math.max(0.1, effectiveDataRateKbps(a)),
    battery: a.q_battery === "battery",
    latencyMs: LATENCY_MS[a.q_latency] ?? 5000,
  };
}

export function powerStages(a: Answers): PowerStage[] {
  const duty = num(a, "q_duty", 10) / 100;
  return [
    { label: "Sensor + AFE", currentMa: num(a, "q_sensor_ma", 0.5), duty: 1 },
    { label: "MCU active", currentMa: num(a, "q_mcu_active_ma", 8), duty },
    { label: "MCU sleep", currentMa: num(a, "q_mcu_sleep_ma", 0.01), duty: Math.max(0, 1 - duty) },
    { label: "Radio TX", currentMa: num(a, "q_radio_tx_ma", 12), duty: duty * 0.5 },
  ];
}

export function battery(a: Answers) {
  return computeBattery(powerStages(a), num(a, "q_batt_mah", 200));
}
