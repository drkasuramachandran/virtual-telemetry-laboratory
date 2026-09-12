// ECG design rubric — uses the shared scoring engine (runRubric).
// Grades reasonableness + justification, not a fixed answer key.
import { Rubric } from "@/lib/scoring";
import { Answers } from "@/components/wizard/types";
import { adcMetrics, bandwidth, linkRequirements, battery, num } from "@/lib/ecg/ecgDerive";
import { scoreWireless } from "@/lib/wireless";
import { FAULTS } from "@/lib/ecg/faults";

export const ECG_RUBRIC: Rubric<Answers> = [
  {
    id: "problem",
    label: "Problem definition",
    weight: 10,
    evaluate: (a) => {
      const filled = ["q_user", "q_accuracy", "q_bandwidth", "q_mode", "q_latency", "q_env", "q_battery"].filter((k) => a[k]).length;
      const ratio = filled / 7;
      return { ratio, note: ratio === 1 ? "Requirements fully specified." : "Some requirements are undefined — tighten the spec before designing." };
    },
  },
  {
    id: "sensor",
    label: "Sensor selection",
    weight: 10,
    evaluate: (a) => {
      const map: Record<string, number> = { agagcl: 1, dry: 0.8, capacitive: 0.7, optical: 0.1 };
      const r = map[a.q_sensor] ?? 0;
      const justify = (a.q_sensor_justify ?? "").trim().length > 30 ? 0 : -0.1;
      const note =
        a.q_sensor === "optical"
          ? "Optical (PPG) measures blood volume, not cardiac electrical activity — inappropriate for ECG."
          : a.q_sensor === "agagcl"
          ? "Ag/AgCl wet electrodes are the clinical standard — good choice."
          : "Acceptable electrode choice; watch the added motion noise.";
      return { ratio: Math.max(0, r + justify), note };
    },
  },
  {
    id: "conditioning",
    label: "Signal conditioning",
    weight: 10,
    evaluate: (a) => {
      const gain = num(a, "q_gain", 1000);
      const hp = num(a, "q_hp", 0.5);
      const lp = num(a, "q_lp", 150);
      const bw = bandwidth(a);
      let r = 1;
      const issues: string[] = [];
      if (gain < 300 || gain > 2000) { r -= 0.3; issues.push("gain outside the typical 300–2000× range"); }
      if (hp > 1) { r -= 0.25; issues.push("high-pass cutoff too high — will distort ST/T morphology"); }
      if (lp < bw) { r -= 0.3; issues.push("low-pass cutoff below the signal bandwidth — QRS will be attenuated"); }
      return { ratio: Math.max(0, r), note: issues.length ? `Conditioning issues: ${issues.join("; ")}.` : "Conditioning chain is well matched to the ECG band." };
    },
  },
  {
    id: "adc",
    label: "Sampling / ADC",
    weight: 10,
    evaluate: (a) => {
      const m = adcMetrics(a);
      const bits = num(a, "q_bits", 12);
      let r = 1;
      let note = "Sampling satisfies Nyquist with adequate resolution.";
      if (m.nyquistViolated) { r -= 0.6; note = "Nyquist violated — sampling frequency is below twice the signal bandwidth; aliasing will corrupt the waveform."; }
      else if (m.samplesPerSec > 4 * 2 * bandwidth(a)) { r -= 0.15; note = "Acceptable but inefficient — sampling far above Nyquist wastes bandwidth and power."; }
      if (bits < 10) { r -= 0.2; note += " Resolution is low for diagnostic ECG."; }
      return { ratio: Math.max(0, r), note };
    },
  },
  {
    id: "processing",
    label: "Edge processing",
    weight: 10,
    evaluate: (a) => {
      const mode = a.q_edge;
      const battery = a.q_battery === "battery";
      let r = 0.7;
      let note = "Reasonable processing strategy.";
      if (!mode) return { ratio: 0, note: "No edge-processing strategy chosen." };
      if (battery && mode === "raw") { r = 0.4; note = "Raw streaming on a battery device is inefficient — consider feature or hybrid transmission."; }
      if (mode === "hybrid" || mode === "feature") { r = 1; note = "Good balance of information retained vs data reduced."; }
      if (mode === "event") { r = 0.8; note = "Very low data, but event-only transmission can miss diagnostic context."; }
      return { ratio: r, note };
    },
  },
  {
    id: "wireless",
    label: "Wireless selection",
    weight: 15,
    evaluate: (a) => {
      const { ratio } = scoreWireless(a.q_wireless, linkRequirements(a));
      const note = ratio >= 0.85 ? "Wireless technology is well matched to the requirements." : ratio >= 0.5 ? "Workable wireless choice with some trade-off penalties." : "Wireless technology is inappropriate for this requirement.";
      return { ratio, note };
    },
  },
  {
    id: "telemetry",
    label: "Telemetry architecture",
    weight: 10,
    evaluate: (a) => {
      const loss = num(a, "q_loss", 2);
      const interval = num(a, "q_txinterval", 1000);
      let r = 1;
      const issues: string[] = [];
      if (loss > 10) { r -= 0.4; issues.push("high packet loss without mitigation"); }
      if (a.q_latency === "realtime" && interval > 2000) { r -= 0.3; issues.push("transmission interval too long for real-time latency"); }
      return { ratio: Math.max(0, r), note: issues.length ? `Architecture concerns: ${issues.join("; ")}.` : "Telemetry architecture is consistent with the latency and reliability needs." };
    },
  },
  {
    id: "power",
    label: "Power management",
    weight: 10,
    evaluate: (a) => {
      const b = battery(a);
      const duty = num(a, "q_duty", 10);
      let r = 0.5;
      let note = `Estimated battery life ≈ ${b.days} days.`;
      if (b.days >= 7) r = 1;
      else if (b.days >= 2) r = 0.75;
      else { r = 0.4; note += " Short life — reduce duty cycle or radio activity."; }
      if (duty > 50) { r -= 0.15; note += " High duty cycle dominates the energy budget."; }
      return { ratio: Math.max(0, r), note };
    },
  },
  {
    id: "reliability",
    label: "Reliability",
    weight: 10,
    evaluate: (a) => {
      const fault = FAULTS.find((f) => f.id === a.q_fault);
      const correct = fault && a.q_diagnosis === fault.id;
      const loss = num(a, "q_loss", 2);
      let r = correct ? 0.8 : 0.3;
      if (loss <= 5) r += 0.2;
      const note = correct ? "Fault correctly diagnosed and a mitigation proposed." : fault ? `Diagnosis did not match the injected fault (${fault.name}).` : "No fault scenario completed.";
      return { ratio: Math.min(1, r), note };
    },
  },
  {
    id: "justification",
    label: "Engineering justification",
    weight: 5,
    evaluate: (a) => {
      const total = ((a.q_sensor_justify ?? "") + (a.q_tradeoff ?? "") + (a.q_justify ?? "")).trim().length;
      const r = Math.min(1, total / 150);
      return { ratio: r, note: r >= 0.8 ? "Design decisions are well justified." : "Add more reasoning to justify your trade-offs." };
    },
  },
];
