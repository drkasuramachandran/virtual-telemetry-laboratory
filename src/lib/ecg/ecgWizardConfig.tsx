import React from "react";
import { WizardStageConfig, Answers } from "@/components/wizard/types";
import { Waveform, WaveformLegend } from "@/components/Waveform";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { DesignReport } from "@/components/DesignReport";
import { generateEcg, condition } from "@/lib/ecg/ecgSignal";
import { aliasFrequency } from "@/lib/dsp";
import { note } from "@/lib/coach";
import { WIRELESS, scoreWireless } from "@/lib/wireless";
import { EDGE_MODES, edgeMode, formatBytes } from "@/lib/power";
import {
  adcMetrics,
  bandwidth,
  effectiveDataRateKbps,
  linkRequirements,
  powerStages,
  battery,
  num,
} from "@/lib/ecg/ecgDerive";
import { FAULTS, DIAGNOSIS_OPTIONS, FIX_OPTIONS, randomFault } from "@/lib/ecg/faults";

const C_CLEAN = "hsl(199 89% 60%)";
const C_NOISY = "hsl(0 72% 60%)";
const C_COND = "hsl(168 76% 50%)";
const C_SAMP = "hsl(38 92% 58%)";

function applyFault(clean: number[], fs: number, id: string): number[] {
  const y = [...clean];
  const n = y.length;
  switch (id) {
    case "noise_spike":
      for (let k = 0; k < 8; k++) {
        const i = Math.floor(Math.random() * n);
        y[i] += (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random());
      }
      return y;
    case "interference":
      return y.map((v, i) => v + 0.4 * Math.sin((2 * Math.PI * 50 * i) / fs));
    case "motion":
      return y.map((v, i) => v + 0.8 * Math.sin((2 * Math.PI * 0.7 * i) / fs + 1));
    case "drift":
      return y.map((v, i) => v + (i / n) * 1.2);
    case "brownout":
      return y.map((v) => Math.max(-0.5, Math.min(0.5, v)));
    case "packet_loss":
      for (let seg = 0; seg < 3; seg++) {
        const start = Math.floor(Math.random() * (n - 30));
        for (let i = start; i < start + 25 && i < n; i++) y[i] = 0;
      }
      return y;
    default:
      return y;
  }
}

export const ECG_STAGES: WizardStageConfig[] = [
  // 1 -----------------------------------------------------------------------
  {
    id: "define",
    title: "Define the problem",
    subtitle: "Before choosing any hardware, pin down the requirements.",
    concept: {
      title: "requirements drive everything",
      body: "Every downstream decision — sensor, filters, sampling rate, radio, battery — is a consequence of the requirements. Vague requirements produce over- or under-engineered devices.",
    },
    fields: [
      { id: "q_user", label: "Who uses it?", type: "select", options: [{ value: "icu", label: "Hospital ICU" }, { value: "home", label: "Home monitoring" }, { value: "ambulatory", label: "Ambulatory / wearable" }, { value: "trial", label: "Clinical trial" }] },
      { id: "q_accuracy", label: "Required accuracy / band", type: "select", options: [{ value: "diagnostic", label: "Diagnostic (0.05–150 Hz)" }, { value: "monitoring", label: "Monitoring (0.5–40 Hz)" }] },
      { id: "q_bandwidth", label: "Signal bandwidth", type: "number", unit: "Hz", default: 150, min: 10, max: 500, help: "Highest frequency of interest in the ECG." },
      { id: "q_mode", label: "Acquisition", type: "radio", options: [{ value: "continuous", label: "Continuous" }, { value: "periodic", label: "Periodic" }] },
      { id: "q_latency", label: "Latency tolerance", type: "select", options: [{ value: "realtime", label: "Real-time (<1 s)" }, { value: "seconds", label: "Seconds" }, { value: "minutes", label: "Minutes" }] },
      { id: "q_env", label: "Environment", type: "select", options: [{ value: "clinical", label: "Clinical / low-noise" }, { value: "home", label: "Home" }, { value: "motion", label: "Motion / ambulatory" }] },
      { id: "q_battery", label: "Power source", type: "radio", options: [{ value: "battery", label: "Battery-powered" }, { value: "mains", label: "Mains-powered" }] },
    ],
    analyze: (a) => {
      const notes = [];
      if (a.q_accuracy === "diagnostic" && bandwidth(a) < 100) notes.push(note("bw", "warning", "Bandwidth may be too low for diagnostic ECG", "Diagnostic ECG typically needs up to ~150 Hz to preserve QRS detail."));
      if (a.q_accuracy === "monitoring" && bandwidth(a) > 60) notes.push(note("bw2", "info", "Monitoring rarely needs this much bandwidth", "40 Hz is usually sufficient for rhythm monitoring; extra bandwidth costs data & power."));
      if (a.q_env === "motion") notes.push(note("env", "info", "Motion environment noted", "Expect strong motion artifact — your conditioning and electrode choice must handle it."));
      if (notes.length === 0) notes.push(note("ok", "good", "Requirements are coherent", "Good — a clear spec makes the rest of the design defensible."));
      return { notes };
    },
  },
  // 2 -----------------------------------------------------------------------
  {
    id: "sensor",
    title: "Sensor selection",
    subtitle: "Pick a transducer and justify it.",
    concept: {
      title: "transducer defines the signal",
      body: "The sensor converts a physical quantity into an electrical signal. The wrong transducer measures the wrong physics — no amount of downstream processing can fix that.",
    },
    fields: [
      { id: "q_sensor", label: "Electrode / sensor", type: "select", options: [{ value: "agagcl", label: "Ag/AgCl wet electrodes" }, { value: "dry", label: "Dry electrodes" }, { value: "capacitive", label: "Capacitive electrodes" }, { value: "optical", label: "Optical (PPG) photodiode" }] },
      { id: "q_sensor_justify", label: "Justify your choice", type: "textarea", placeholder: "Signal type, analog/digital, conditioning needed, expected noise sources…" },
    ],
    analyze: (a) => {
      const notes = [];
      if (a.q_sensor === "optical") notes.push(note("opt", "error", "Optical (PPG) is inappropriate for ECG", "PPG measures blood-volume changes, not the heart's electrical activity.", "Choose an electrode-based sensor for ECG."));
      else if (a.q_sensor === "agagcl") notes.push(note("ag", "good", "Ag/AgCl is the clinical standard", "Low impedance, low drift — excellent signal quality."));
      else if (a.q_sensor === "dry") notes.push(note("dry", "warning", "Dry electrodes trade quality for convenience", "Good for wearables, but higher contact impedance and motion noise.", "Strengthen your conditioning stage to compensate."));
      else if (a.q_sensor === "capacitive") notes.push(note("cap", "warning", "Capacitive electrodes are contactless but noisy", "Sensitive to motion and require careful high-input-impedance front-ends."));
      if ((a.q_sensor_justify ?? "").trim().length < 30) notes.push(note("just", "info", "Add more justification", "Explain the signal type and expected noise sources to strengthen your design."));
      return { notes };
    },
  },
  // 3 -----------------------------------------------------------------------
  {
    id: "conditioning",
    title: "Signal conditioning",
    subtitle: "Amplify and filter the raw signal.",
    concept: {
      title: "conditioning before digitising",
      body: "The raw biopotential is tiny (~1 mV) and buried in drift, motion and 50/60 Hz mains noise. Amplification plus high-pass, notch and low-pass filtering clean it before the ADC.",
    },
    fields: [
      { id: "q_gain", label: "Amplifier gain", type: "slider", min: 100, max: 2000, step: 50, default: 1000, unit: "×" },
      { id: "q_hp", label: "High-pass cutoff", type: "number", unit: "Hz", default: 0.5, min: 0.05, max: 5, step: 0.05, help: "Removes baseline drift. Too high distorts ST/T." },
      { id: "q_lp", label: "Low-pass cutoff", type: "number", unit: "Hz", default: 150, min: 20, max: 300, step: 5, help: "Removes high-freq noise. Keep ≥ signal bandwidth." },
      { id: "q_notch", label: "Notch filter", type: "radio", default: "50", options: [{ value: "50", label: "50 Hz" }, { value: "60", label: "60 Hz" }, { value: "0", label: "Off" }] },
    ],
    analyze: (a) => {
      const notes = [];
      const gain = num(a, "q_gain", 1000);
      const hp = num(a, "q_hp", 0.5);
      const lp = num(a, "q_lp", 150);
      if (gain < 300) notes.push(note("g", "warning", "Gain is low", "The signal may not use the ADC's full range, wasting resolution."));
      if (gain > 2000) notes.push(note("g2", "warning", "Gain is high", "Risk of clipping on artifacts and drift."));
      if (hp > 1) notes.push(note("hp", "warning", "High-pass cutoff is aggressive", "Above ~1 Hz you begin distorting ST-segment and T-wave morphology.", "Use 0.5 Hz for monitoring, 0.05 Hz for diagnostic."));
      if (lp < bandwidth(a)) notes.push(note("lp", "error", "Low-pass cutoff is below the signal bandwidth", "You are attenuating real QRS content.", `Raise the cutoff to at least ${bandwidth(a)} Hz.`));
      if (a.q_notch === "0") notes.push(note("n", "warning", "Notch filter off", "50/60 Hz mains interference will remain in the trace.", "Enable the notch matching your local mains frequency."));
      if (notes.length === 0) notes.push(note("cond", "good", "Conditioning chain looks well matched", "Drift, mains and high-frequency noise are all addressed."));
      return { notes };
    },
    visualize: (a) => {
      const fs = 500;
      const sig = generateEcg({ hrBpm: 75, seconds: 3, fsAnalog: fs, noise: { powerlineHz: 50, powerlineAmp: 0.15, motionAmp: a.q_env === "motion" ? 0.18 : 0.05, driftAmp: 0.18 } });
      const { conditioned } = condition(sig.noisy, fs, { gain: num(a, "q_gain", 1000), hpOn: true, hpCut: num(a, "q_hp", 0.5), lpOn: true, lpCut: num(a, "q_lp", 150), notchHz: Number(a.q_notch || 0) as 0 | 50 | 60 });
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Raw (clean) vs Raw + noise</p>
            <Waveform series={[{ data: sig.clean, color: C_CLEAN, width: 1.2 }, { data: sig.noisy, color: C_NOISY, width: 1 }]} height={130} />
            <WaveformLegend items={[{ color: C_CLEAN, label: "Clean ECG" }, { color: C_NOISY, label: "With noise/drift/mains" }]} />
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Conditioned (after amplifier + filters)</p>
            <Waveform series={[{ data: conditioned, color: C_COND, width: 1.4 }]} height={130} />
            <WaveformLegend items={[{ color: C_COND, label: "Conditioned output" }]} />
          </div>
        </div>
      );
    },
  },
  // 4 -----------------------------------------------------------------------
  {
    id: "adc",
    title: "ADC & sampling",
    subtitle: "Digitise the conditioned signal.",
    concept: {
      title: "sampling → the Nyquist theorem",
      body: "To reconstruct a signal you must sample at more than twice its highest frequency (Nyquist). Sample too slowly and high frequencies fold back as false low-frequency 'aliases' that cannot be removed later.",
    },
    fields: [
      { id: "q_fs", label: "Sampling frequency", type: "number", unit: "Hz", default: 500, min: 20, max: 2000, step: 10 },
      { id: "q_bits", label: "ADC resolution", type: "select", default: "12", options: [{ value: "8", label: "8-bit" }, { value: "10", label: "10-bit" }, { value: "12", label: "12-bit" }, { value: "16", label: "16-bit" }] },
    ],
    analyze: (a) => {
      const m = adcMetrics(a);
      const notes = [];
      if (m.nyquistViolated) notes.push(note("nyq", "error", "Nyquist violated — aliasing will occur", `Sampling at ${m.samplesPerSec} Hz cannot represent content up to ${bandwidth(a)} Hz.`, `Raise the sampling frequency above ${2 * bandwidth(a)} Hz and re-run.`));
      else if (m.samplesPerSec > 8 * bandwidth(a)) notes.push(note("over", "warning", "Acceptable but inefficient", "Sampling far above Nyquist wastes data rate and power."));
      else notes.push(note("nyqok", "good", "Sampling satisfies Nyquist", "The chosen rate captures the signal bandwidth cleanly."));
      if (num(a, "q_bits", 12) < 10) notes.push(note("bits", "warning", "Resolution is low", "Fewer bits coarsen small features and add quantisation noise."));
      return {
        notes,
        metrics: [
          { label: "Nyquist freq", value: `${m.nyquist} Hz` },
          { label: "Samples / sec", value: `${m.samplesPerSec}` },
          { label: "Bits / sample", value: `${m.bitsPerSample}` },
          { label: "Raw data rate", value: `${m.rawDataRateBps} bps` },
          { label: "Per day", value: formatBytes(m.dailyBytes) },
          { label: "Aliasing", value: m.nyquistViolated ? "YES" : "no", tone: m.nyquistViolated ? "error" : "good" },
        ],
      };
    },
    visualize: (a) => {
      const fs = num(a, "q_fs", 500);
      const f = Math.min(bandwidth(a), 60);
      const dur = 0.15;
      const hi = 3000;
      const cont: number[] = [];
      for (let i = 0; i < dur * hi; i++) cont.push(Math.sin(2 * Math.PI * f * (i / hi)));
      const sampN = Math.max(2, Math.floor(dur * fs));
      const samp: number[] = [];
      for (let i = 0; i < sampN; i++) samp.push(Math.sin(2 * Math.PI * f * (i / fs)));
      const alias = aliasFrequency(f, fs);
      const violated = fs < 2 * f;
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {f} Hz tone sampled at {fs} Hz {violated ? `→ aliases to ~${alias.toFixed(0)} Hz` : "(reconstructs correctly)"}
          </p>
          <Waveform series={[{ data: cont, color: C_CLEAN, width: 1.2 }, { data: samp, color: C_SAMP, width: 1.4, dots: true }]} height={140} yMin={-1.2} yMax={1.2} />
          <WaveformLegend items={[{ color: C_CLEAN, label: `True ${f} Hz signal` }, { color: C_SAMP, label: `Samples at ${fs} Hz` }]} />
        </div>
      );
    },
  },
  // 5 -----------------------------------------------------------------------
  {
    id: "edge",
    title: "Edge processing",
    subtitle: "Decide what the MCU sends.",
    concept: {
      title: "compute at the edge to save the radio",
      body: "The radio is usually the biggest energy cost. Processing on the MCU (features or events instead of raw samples) slashes the data that must be transmitted — at the cost of more computation and less raw context.",
    },
    fields: [
      { id: "q_edge", label: "Transmission strategy", type: "select", default: "raw", options: EDGE_MODES.map((m) => ({ value: m.id, label: m.label })) },
    ],
    analyze: (a) => {
      const em = edgeMode(a.q_edge || "raw");
      const eff = effectiveDataRateKbps(a);
      const raw = adcMetrics(a).rawDataRateBps / 1000;
      const notes = [note("edge", a.q_battery === "battery" && em.id === "raw" ? "warning" : "info", em.label, em.desc)];
      if (a.q_battery === "battery" && em.id === "raw") notes.push(note("edge2", "warning", "Raw streaming is costly on battery", "The radio will dominate your energy budget.", "Try feature or hybrid transmission."));
      return {
        notes,
        metrics: [
          { label: "Raw rate", value: `${raw.toFixed(2)} kbps` },
          { label: "Effective rate", value: `${eff.toFixed(2)} kbps`, tone: "good" },
          { label: "Data reduction", value: `${em.reductionFactor}×` },
          { label: "MCU power", value: `${em.powerRel.toFixed(1)}×` },
        ],
      };
    },
  },
  // 6 -----------------------------------------------------------------------
  {
    id: "wireless",
    title: "Wireless technology",
    subtitle: "Choose a radio and defend the trade-off.",
    concept: {
      title: "wireless choice → link budget",
      body: "No radio is 'best' — each trades range against power, data rate, latency, reliability and cost. Match the technology to the requirements you defined in stage 1.",
    },
    fields: [
      { id: "q_wireless", label: "Wireless technology", type: "select", options: WIRELESS.map((w) => ({ value: w.id, label: w.name })) },
    ],
    analyze: (a) => {
      const { ratio, notes } = scoreWireless(a.q_wireless, linkRequirements(a));
      return { notes, metrics: [{ label: "Match to requirements", value: `${Math.round(ratio * 100)}%`, tone: ratio >= 0.85 ? "good" : ratio >= 0.5 ? "warning" : "error" }] };
    },
    visualize: (a) => (
      <div className="overflow-x-auto rounded-xl border border-border bg-card/40 p-3">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-2 py-1">Tech</th><th className="px-2 py-1">Range</th><th className="px-2 py-1">Data rate</th><th className="px-2 py-1">Power</th><th className="px-2 py-1">Latency</th><th className="px-2 py-1">Cost</th>
            </tr>
          </thead>
          <tbody>
            {WIRELESS.map((w) => (
              <tr key={w.id} className={a.q_wireless === w.id ? "bg-primary/10 text-primary" : "text-foreground/80"} data-testid={`wl-row-${w.id}`}>
                <td className="px-2 py-1 font-medium">{w.name}</td>
                <td className="px-2 py-1">{w.rangeM >= 1000 ? `${w.rangeM / 1000} km` : `${w.rangeM} m`}</td>
                <td className="px-2 py-1">{w.dataRateKbps >= 1000 ? `${w.dataRateKbps / 1000} Mbps` : `${w.dataRateKbps} kbps`}</td>
                <td className="px-2 py-1">{"▮".repeat(w.power)}</td>
                <td className="px-2 py-1">{w.latencyMs} ms</td>
                <td className="px-2 py-1">{"$".repeat(w.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  // 7 -----------------------------------------------------------------------
  {
    id: "network",
    title: "Network design",
    subtitle: "Tune the end-to-end telemetry link.",
    concept: {
      title: "telemetry architecture & reliability",
      body: "Packet size, interval, distance, transmit power and loss all interact. Longer intervals save power but add latency; higher loss needs retransmission, which costs energy and latency in turn.",
    },
    prediction: "If packet loss rises from 2% to 20% with no retransmission, what happens to the clinician dashboard?",
    fields: [
      { id: "q_txinterval", label: "Transmission interval", type: "slider", min: 100, max: 5000, step: 100, default: 1000, unit: "ms" },
      { id: "q_packetsize", label: "Packet size", type: "number", unit: "bytes", default: 128, min: 16, max: 1024, step: 16 },
      { id: "q_distance", label: "Node → gateway distance", type: "slider", min: 1, max: 50, step: 1, default: 5, unit: "m" },
      { id: "q_txpower", label: "Transmit power", type: "slider", min: 0, max: 20, step: 1, default: 4, unit: "dBm" },
      { id: "q_loss", label: "Packet loss", type: "slider", min: 0, max: 40, step: 1, default: 2, unit: "%" },
    ],
    analyze: (a) => {
      const loss = num(a, "q_loss", 2);
      const interval = num(a, "q_txinterval", 1000);
      const delivered = 100 - loss;
      const notes = [];
      if (loss > 15) notes.push(note("loss", "error", "High packet loss degrades the trace", "Missing packets create gaps a clinician could misread as arrhythmia.", "Add retransmission/ACK or reduce distance / raise Tx power."));
      else if (loss > 5) notes.push(note("loss2", "warning", "Moderate packet loss", "Consider buffering and gap-filling at the gateway."));
      else notes.push(note("loss3", "good", "Loss is within a healthy range"));
      if (a.q_latency === "realtime" && interval > 2000) notes.push(note("int", "warning", "Interval too long for real-time", `A ${interval} ms interval conflicts with a real-time latency requirement.`));
      return {
        notes,
        metrics: [
          { label: "Delivered", value: `${delivered}%`, tone: delivered >= 95 ? "good" : delivered >= 85 ? "warning" : "error" },
          { label: "Packets / min", value: `${Math.round(60000 / interval)}` },
          { label: "Payload", value: `${a.q_packetsize} B` },
        ],
      };
    },
    visualize: (a) => {
      const loss = num(a, "q_loss", 2);
      const states = { dashboard: (loss > 15 ? "error" : "active") as any };
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Live telemetry flow</p>
          <PipelineDiagram animate states={states} height={130} />
        </div>
      );
    },
  },
  // 8 -----------------------------------------------------------------------
  {
    id: "power",
    title: "Power budget",
    subtitle: "Estimate current draw and battery life.",
    concept: {
      title: "energy budget = duty cycle × current",
      body: "Average current, not peak, sets battery life. Sleeping the MCU and radio between transmissions (duty-cycling) is the single biggest lever — often 10–100× longer life for the same battery.",
    },
    fields: [
      { id: "q_batt_mah", label: "Battery capacity", type: "number", unit: "mAh", default: 200, min: 20, max: 2000, step: 10 },
      { id: "q_sensor_ma", label: "Sensor + AFE current", type: "number", unit: "mA", default: 0.5, min: 0, max: 20, step: 0.1 },
      { id: "q_mcu_active_ma", label: "MCU active current", type: "number", unit: "mA", default: 8, min: 0.1, max: 100, step: 0.5 },
      { id: "q_mcu_sleep_ma", label: "MCU sleep current", type: "number", unit: "mA", default: 0.01, min: 0, max: 5, step: 0.01 },
      { id: "q_radio_tx_ma", label: "Radio TX current", type: "number", unit: "mA", default: 12, min: 0.1, max: 200, step: 1 },
      { id: "q_duty", label: "Active duty cycle", type: "slider", min: 1, max: 100, step: 1, default: 10, unit: "%" },
    ],
    analyze: (a) => {
      const b = battery(a);
      const notes = [];
      if (b.days >= 7) notes.push(note("p", "good", `Battery life ≈ ${b.days} days`, "Strong energy budget."));
      else if (b.days >= 2) notes.push(note("p2", "warning", `Battery life ≈ ${b.days} days`, "Usable, but consider lowering the duty cycle."));
      else notes.push(note("p3", "error", `Battery life ≈ ${b.days} days is short`, "The device won't last a useful session.", "Reduce the active duty cycle or radio TX current, or use edge processing to transmit less."));
      if (num(a, "q_duty", 10) > 40) notes.push(note("duty", "warning", "High duty cycle", "Duty cycle dominates average current — sleep more between transmissions."));
      return {
        notes,
        metrics: [
          { label: "Avg current", value: `${b.avgCurrentMa} mA` },
          { label: "Power", value: `${b.powerMw} mW` },
          { label: "Battery life", value: `~${b.days} days`, tone: b.days >= 7 ? "good" : b.days >= 2 ? "warning" : "error" },
        ],
      };
    },
    visualize: (a, set) => {
      const b = battery(a);
      const baseline = a.q_power_baseline as { days: number; avgCurrentMa: number } | undefined;
      const stages = powerStages(a);
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Per-stage average current</p>
            {stages.map((s) => {
              const contrib = s.currentMa * s.duty;
              const pct = b.avgCurrentMa > 0 ? (contrib / b.avgCurrentMa) * 100 : 0;
              return (
                <div key={s.label} className="mb-1.5 flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">{s.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono">{contrib.toFixed(3)} mA</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => set("q_power_baseline", { days: b.days, avgCurrentMa: b.avgCurrentMa })} data-testid="save-baseline" className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
              Save this design as v1
            </button>
            {baseline && (
              <span className="font-mono text-xs text-muted-foreground" data-testid="power-compare">
                v1: ~{baseline.days} d ({baseline.avgCurrentMa} mA) → v2: ~{b.days} d ({b.avgCurrentMa} mA) ·{" "}
                <span className={b.days >= baseline.days ? "text-emerald-400" : "text-red-400"}>
                  {b.days >= baseline.days ? "+" : ""}
                  {(b.days - baseline.days).toFixed(2)} d
                </span>
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  // 9 -----------------------------------------------------------------------
  {
    id: "fault",
    title: "Fault injection",
    subtitle: "Diagnose an injected fault and propose a fix.",
    concept: {
      title: "diagnosis is an engineering skill",
      body: "Real telemetry systems fail. Reading a corrupted signal, inferring the root cause, and choosing a fix that doesn't create a worse problem elsewhere is the core diagnostic loop.",
    },
    onEnter: (a, set) => {
      if (!a.q_fault) set("q_fault", randomFault().id);
    },
    fields: [
      { id: "q_diagnosis", label: "What is the likely cause?", type: "select", options: DIAGNOSIS_OPTIONS },
      { id: "q_fix", label: "Proposed fix", type: "select", options: FIX_OPTIONS.map((f) => ({ value: f.value, label: f.label })) },
    ],
    analyze: (a) => {
      const fault = FAULTS.find((f) => f.id === a.q_fault);
      const notes = [];
      if (!fault) return { notes: [note("nf", "info", "No fault injected yet.")] };
      const correct = a.q_diagnosis === fault.id;
      if (a.q_diagnosis) notes.push(correct ? note("dx", "good", "Correct diagnosis", `You identified the ${fault.name}.`) : note("dx2", "error", "Diagnosis mismatch", `The injected fault was actually: ${fault.name}. Symptom: ${fault.symptom}`));
      const fix = FIX_OPTIONS.find((f) => f.value === a.q_fix);
      if (fix) notes.push(note("fix", "info", `Trade-off of "${fix.label}"`, fix.tradeoff));
      return { notes };
    },
    visualize: (a) => {
      const fault = FAULTS.find((f) => f.id === a.q_fault);
      const fs = 500;
      const sig = generateEcg({ hrBpm: 75, seconds: 3, fsAnalog: fs, noise: { powerlineHz: 0, powerlineAmp: 0, motionAmp: 0, driftAmp: 0 } });
      const faulty = applyFault(sig.clean, fs, fault?.id ?? "");
      return (
        <div className="rounded-xl border border-red-500/30 bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-red-400">Received signal (fault active)</p>
          <Waveform series={[{ data: faulty, color: C_NOISY, width: 1.2 }]} height={140} />
          <p className="mt-2 text-xs text-muted-foreground">Observe the symptom, then choose the most likely cause above.</p>
        </div>
      );
    },
  },
  // 10 ----------------------------------------------------------------------
  {
    id: "review",
    title: "Design review & report",
    subtitle: "Reflect, then generate your scored design report.",
    concept: {
      title: "justify the whole system",
      body: "A good engineer can defend every choice as a consequence of the requirements and the trade-offs. This review consolidates your design and scores its reasonableness — not a fixed answer key.",
    },
    fields: [
      { id: "q_tradeoff", label: "Biggest trade-off you made", type: "textarea", placeholder: "e.g. chose BLE over Wi-Fi to save power, accepting lower data rate…" },
      { id: "q_justify", label: "Why is this design fit for its user?", type: "textarea", placeholder: "Tie your choices back to the stage-1 requirements…" },
    ],
    visualize: (a) => <DesignReport answers={a} />,
  },
];
