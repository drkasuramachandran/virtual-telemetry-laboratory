// Canonical telemetry pipeline — the ONE model reused across the whole app.
// Physical Parameter -> Sensor/Transducer -> Signal Conditioning -> ADC/Sampling
// -> MCU/Edge Processing -> Wireless Communication -> Gateway/Receiver
// -> Cloud/Data Processing -> Dashboard/Alerts

export type StageStatus = "idle" | "active" | "done" | "error";

export type StageId =
  | "physical"
  | "sensor"
  | "conditioning"
  | "adc"
  | "mcu"
  | "wireless"
  | "gateway"
  | "cloud"
  | "dashboard";

export interface PipelineStage {
  id: StageId;
  label: string;
  short: string;
  iconKey: string;
  description: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "physical",
    label: "Physical Parameter",
    short: "Physical",
    iconKey: "activity",
    description:
      "The real-world quantity being measured (temperature, pressure, heart electrical activity, glucose, light, etc.).",
  },
  {
    id: "sensor",
    label: "Sensor / Transducer",
    short: "Sensor",
    iconKey: "thermometer",
    description:
      "Converts the physical parameter into an electrical signal (voltage/current/resistance change).",
  },
  {
    id: "conditioning",
    label: "Signal Conditioning",
    short: "Conditioning",
    iconKey: "sliders",
    description:
      "Amplification, filtering, and level-shifting to make the raw signal clean and usable.",
  },
  {
    id: "adc",
    label: "ADC / Sampling",
    short: "ADC",
    iconKey: "binary",
    description:
      "Analog-to-digital conversion — sampling rate and bit resolution turn the signal into numbers.",
  },
  {
    id: "mcu",
    label: "MCU / Edge Processing",
    short: "MCU",
    iconKey: "cpu",
    description:
      "On-device computation: framing, compression, thresholding, and duty-cycling to save power.",
  },
  {
    id: "wireless",
    label: "Wireless Communication",
    short: "Wireless",
    iconKey: "wifi",
    description:
      "The radio link (BLE, Wi-Fi, LoRa, Zigbee, cellular). Trades off range, power, and data rate.",
  },
  {
    id: "gateway",
    label: "Gateway / Receiver",
    short: "Gateway",
    iconKey: "router",
    description:
      "Bridges the wireless link to the internet and buffers/forwards packets to the cloud.",
  },
  {
    id: "cloud",
    label: "Cloud / Data Processing",
    short: "Cloud",
    iconKey: "cloud",
    description:
      "Server-side storage, decoding, calibration, and analytics on the incoming telemetry stream.",
  },
  {
    id: "dashboard",
    label: "Dashboard / Alerts",
    short: "Dashboard",
    iconKey: "layout-dashboard",
    description:
      "Where humans see the data: live charts, trends, and threshold-based alerts.",
  },
];

export const STAGE_INDEX: Record<StageId, number> = PIPELINE_STAGES.reduce(
  (acc, s, i) => {
    acc[s.id] = i;
    return acc;
  },
  {} as Record<StageId, number>,
);

export type StageStateMap = Partial<Record<StageId, StageStatus>>;
