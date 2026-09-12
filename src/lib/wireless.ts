// Wireless technology models + requirement-aware scoring (trade-off reasoning).
import { CoachNote, note } from "@/lib/coach";

export interface WirelessTech {
  id: string;
  name: string;
  rangeM: number; // typical max range (m)
  dataRateKbps: number; // typical usable throughput
  power: 1 | 2 | 3 | 4 | 5; // 1 = very low draw, 5 = high
  latencyMs: number;
  reliability: 1 | 2 | 3 | 4 | 5;
  cost: 1 | 2 | 3 | 4 | 5;
  band: string;
  apps: string;
  note: string;
}

export const WIRELESS: WirelessTech[] = [
  { id: "ble", name: "BLE", rangeM: 30, dataRateKbps: 250, power: 1, latencyMs: 30, reliability: 4, cost: 1, band: "2.4 GHz ISM", apps: "Wearables, medical peripherals, fitness", note: "Low-power, short-range, ideal for wearables." },
  { id: "wifi", name: "Wi-Fi", rangeM: 50, dataRateKbps: 20000, power: 5, latencyMs: 15, reliability: 4, cost: 2, band: "2.4 / 5 GHz", apps: "Hospital/home infrastructure, video, bulk data", note: "High data rate but power-hungry." },
  { id: "zigbee", name: "Zigbee", rangeM: 70, dataRateKbps: 250, power: 2, latencyMs: 40, reliability: 4, cost: 2, band: "2.4 GHz (868/915 MHz)", apps: "Sensor mesh, building & home automation", note: "Mesh, low power, modest data rate." },
  { id: "nfc", name: "NFC", rangeM: 0.1, dataRateKbps: 400, power: 1, latencyMs: 20, reliability: 5, cost: 1, band: "13.56 MHz", apps: "Tap pairing, access cards, implant readout", note: "Touch-range only — not continuous telemetry." },
  { id: "lora", name: "LoRa / LoRaWAN", rangeM: 5000, dataRateKbps: 5, power: 2, latencyMs: 1000, reliability: 3, cost: 2, band: "Sub-GHz (868/915 MHz)", apps: "Long-range IoT, asset & cold-chain tracking", note: "Very long range, tiny data rate, high latency." },
  { id: "cellular", name: "Cellular", rangeM: 100000, dataRateKbps: 10000, power: 5, latencyMs: 100, reliability: 4, cost: 4, band: "Licensed LTE/5G / NB-IoT", apps: "Wide-area, ambulatory, connected vehicles", note: "Wide-area, high power and recurring cost." },
  { id: "rfid", name: "RFID", rangeM: 5, dataRateKbps: 100, power: 1, latencyMs: 50, reliability: 3, cost: 1, band: "125 kHz – 900 MHz", apps: "Identification, inventory, tagging", note: "Identification, not streaming telemetry." },
];

export interface LinkRequirements {
  rangeM: number;
  dataRateKbps: number;
  battery: boolean;
  latencyMs: number; // acceptable
}

export function scoreWireless(
  techId: string,
  req: LinkRequirements,
): { ratio: number; notes: CoachNote[] } {
  const tech = WIRELESS.find((t) => t.id === techId);
  const notes: CoachNote[] = [];
  if (!tech) return { ratio: 0, notes: [note("wl-none", "info", "No wireless technology selected.")] };

  let score = 1;

  // Range
  if (tech.rangeM < req.rangeM) {
    score -= 0.35;
    notes.push(note("wl-range", "error", `${tech.name} range is insufficient`, `Typical ${tech.rangeM} m vs required ${req.rangeM} m.`, "Pick a longer-range technology or add a relay/gateway closer to the node."));
  } else if (tech.rangeM > req.rangeM * 50) {
    score -= 0.2;
    notes.push(note("wl-range-ok", "warning", `${tech.name} range far exceeds the requirement`, "Over-provisioned range usually costs power, latency or money.", "Consider a shorter-range, lower-power option if the node is near a gateway."));
  } else {
    notes.push(note("wl-range-good", "good", `${tech.name} range fits the requirement`));
  }

  // Data rate
  if (tech.dataRateKbps < req.dataRateKbps) {
    score -= 0.3;
    notes.push(note("wl-dr", "error", `${tech.name} data rate is too low`, `~${tech.dataRateKbps} kbps available vs ${req.dataRateKbps.toFixed(1)} kbps needed.`, "Reduce the payload with edge processing, or choose a higher-throughput link."));
  } else if (tech.dataRateKbps > req.dataRateKbps * 40) {
    score -= 0.1;
    notes.push(note("wl-dr-excess", "warning", `Good throughput, but excessive data rate for this payload`, `${tech.name} offers far more bandwidth than needed, often at a power/cost penalty.`));
  } else {
    notes.push(note("wl-dr-good", "good", `${tech.name} throughput is appropriate`));
  }

  // Power vs battery
  if (req.battery && tech.power >= 4) {
    score -= 0.3;
    notes.push(note("wl-pwr", "error", `${tech.name} is power-hungry for a battery device`, "High radio current will drain the battery quickly.", "Prefer BLE/Zigbee/LoRa for battery-powered nodes, or duty-cycle aggressively."));
  } else if (req.battery && tech.power <= 2) {
    notes.push(note("wl-pwr-good", "good", `${tech.name} suits a battery-powered node`));
  }

  // Latency
  if (tech.latencyMs > req.latencyMs) {
    score -= 0.15;
    notes.push(note("wl-lat", "warning", `${tech.name} latency may exceed the requirement`, `~${tech.latencyMs} ms typical vs ${req.latencyMs} ms acceptable.`));
  }

  // Continuous-telemetry sanity for NFC/RFID
  if (tech.id === "nfc" || tech.id === "rfid") {
    score -= 0.3;
    notes.push(note("wl-inappropriate", "error", `Wireless technology is inappropriate for this requirement`, `${tech.name} is designed for identification/touch-range, not continuous streaming telemetry.`, "Choose a streaming-capable link such as BLE."));
  }

  return { ratio: Math.max(0, Math.min(1, score)), notes };
}

// ---- Scenarios + recommender --------------------------------------------

export interface Scenario {
  id: string;
  name: string;
  description: string;
  environment: string;
  req: LinkRequirements;
}

export const SCENARIOS: Scenario[] = [
  { id: "wearable_ecg", name: "Wearable ECG", description: "Body-worn ECG patch streaming to a nearby phone.", environment: "On-body, mobile, RF-noisy", req: { rangeM: 10, dataRateKbps: 4, battery: true, latencyMs: 1000 } },
  { id: "ward_monitoring", name: "Hospital ward monitoring", description: "Many bedside monitors to ward gateways.", environment: "Indoor, dense RF, mains power available", req: { rangeM: 50, dataRateKbps: 50, battery: false, latencyMs: 1000 } },
  { id: "home_pulseox", name: "Home pulse-oximeter", description: "Home SpO₂ device reporting to a hub/cloud.", environment: "Home, low RF congestion", req: { rangeM: 15, dataRateKbps: 2, battery: true, latencyMs: 5000 } },
  { id: "coldchain", name: "Vaccine / insulin cold-chain", description: "Temperature tags tracked across wide-area logistics.", environment: "Wide-area, outdoor, mobile", req: { rangeM: 5000, dataRateKbps: 0.1, battery: true, latencyMs: 60000 } },
  { id: "implant", name: "Implant telemetry", description: "In-body device read intermittently, ultra-low power.", environment: "In-body, extreme power constraint", req: { rangeM: 2, dataRateKbps: 1, battery: true, latencyMs: 2000 } },
];

export interface RankedTech {
  tech: WirelessTech;
  ratio: number;
  notes: CoachNote[];
}

export function rankWireless(req: LinkRequirements): RankedTech[] {
  return WIRELESS.map((t) => {
    const { ratio, notes } = scoreWireless(t.id, req);
    return { tech: t, ratio, notes };
  }).sort((a, b) => b.ratio - a.ratio);
}

const FACTORS: { key: string; label: string }[] = [
  { key: "range", label: "Range" },
  { key: "power", label: "Power" },
  { key: "dataRate", label: "Data rate" },
  { key: "latency", label: "Latency" },
  { key: "reliability", label: "Reliability" },
  { key: "cost", label: "Cost" },
];

/** Per-factor 0..1 assessment for a tech against requirements (for radar/bars). */
export function factorScores(tech: WirelessTech, req: LinkRequirements): { label: string; score: number }[] {
  return FACTORS.map((f) => {
    let s = 0.5;
    switch (f.key) {
      case "range":
        s = tech.rangeM >= req.rangeM ? (tech.rangeM > req.rangeM * 50 ? 0.7 : 1) : 0.2;
        break;
      case "power":
        s = req.battery ? [1, 1, 0.8, 0.4, 0.2][tech.power - 1] : 0.8;
        break;
      case "dataRate":
        s = tech.dataRateKbps >= req.dataRateKbps ? (tech.dataRateKbps > req.dataRateKbps * 40 ? 0.7 : 1) : 0.2;
        break;
      case "latency":
        s = tech.latencyMs <= req.latencyMs ? 1 : 0.4;
        break;
      case "reliability":
        s = tech.reliability / 5;
        break;
      case "cost":
        s = 1 - (tech.cost - 1) / 4;
        break;
    }
    return { label: f.label, score: +s.toFixed(2) };
  });
}
