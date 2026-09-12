import React from "react";
import { WizardStageConfig, Answers } from "@/components/wizard/types";
import { Rubric } from "@/lib/scoring";
import { Waveform, WaveformLegend } from "@/components/Waveform";
import { DeviceReport, ReportSection } from "@/components/DeviceReport";
import { note } from "@/lib/coach";
import { WIRELESS, scoreWireless, LinkRequirements } from "@/lib/wireless";
import { generatePpg, analyzePpg } from "@/lib/pulseox/pulseoxSignal";

const C_RED = "hsl(0 72% 60%)";
const C_IR = "hsl(199 89% 60%)";
const C_SPO2 = "hsl(168 76% 50%)";

const motionOf = (env: string) => (env === "motion" ? 0.4 : env === "home" ? 0.15 : 0.05);

function poReq(a: Answers): LinkRequirements {
  return { rangeM: 10, dataRateKbps: 2, battery: a.q_po_battery === "battery", latencyMs: 1000 };
}

export const PULSEOX_RUBRIC: Rubric<Answers> = [
  { id: "problem", label: "Problem definition", weight: 15, evaluate: (a) => {
    const filled = ["q_po_user", "q_po_accuracy", "q_po_env", "q_po_battery"].filter((k) => a[k]).length;
    return { ratio: filled / 4, note: filled === 4 ? "Requirements specified." : "Complete the requirements." };
  } },
  { id: "optics", label: "Optics / sensor", weight: 20, evaluate: (a) => {
    const ok = a.q_po_wavelengths === "redir";
    return { ratio: ok ? 1 : 0.1, note: ok ? "Red (660 nm) + IR (940 nm) is the correct dual-wavelength choice." : "SpO₂ needs two wavelengths (red + IR) — a single wavelength cannot separate oxy/deoxy-haemoglobin." };
  } },
  { id: "quality", label: "Signal quality", weight: 20, evaluate: (a) => {
    let r = 0.5; const n = [];
    if (a.q_po_ambient === "on") { r += 0.25; } else n.push("ambient light not rejected");
    if (a.q_po_motionfilter === "on") { r += 0.25; } else n.push("no motion handling");
    return { ratio: Math.min(1, r), note: n.length ? `Signal-quality gaps: ${n.join(", ")}.` : "Good ambient + motion handling." };
  } },
  { id: "spo2", label: "SpO₂ estimation", weight: 25, evaluate: (a) => {
    let r = 0; const notes: string[] = [];
    if (a.q_po_calib === "ratio") r += 0.6; else notes.push("ratio-of-ratios is the standard SpO₂ method");
    if (a.q_po_motion_effect === "corrupt") r += 0.4; else notes.push("motion corrupts the AC component and makes R unreliable");
    return { ratio: r, note: notes.length ? `Review: ${notes.join("; ")}.` : "Correct SpO₂ method and understanding of motion effects." };
  } },
  { id: "wireless", label: "Wireless selection", weight: 20, evaluate: (a) => {
    const { ratio } = scoreWireless(a.q_po_wireless, poReq(a));
    return { ratio, note: ratio >= 0.85 ? "Appropriate link for a wearable oximeter." : ratio >= 0.5 ? "Workable link with trade-offs." : "Wireless technology is inappropriate for this requirement." };
  } },
];

function ppgViz(a: Answers) {
  const motion = motionOf(a.q_po_env || "still");
  const sig = generatePpg({ hr: 75, spo2: 97, motion, ambientReject: a.q_po_ambient === "on", fs: 200, seconds: 4 });
  const res = analyzePpg(sig, 200);
  return { sig, res, motion };
}

export const PULSEOX_STAGES: WizardStageConfig[] = [
  {
    id: "define",
    title: "Define the problem",
    subtitle: "Where and how will the oximeter be used?",
    concept: { title: "requirements first", body: "A sports wearable and an ICU oximeter have very different accuracy, motion and power needs — decide these before choosing optics or a radio." },
    fields: [
      { id: "q_po_user", label: "Use case", type: "select", options: [{ value: "hospital", label: "Hospital / ICU" }, { value: "home", label: "Home monitoring" }, { value: "wearable", label: "Wearable / sport" }, { value: "trial", label: "Clinical trial" }] },
      { id: "q_po_accuracy", label: "SpO₂ accuracy", type: "select", options: [{ value: "medical", label: "±2% (medical grade)" }, { value: "wellness", label: "±4% (wellness)" }] },
      { id: "q_po_env", label: "Environment", type: "select", options: [{ value: "still", label: "Still / clinical" }, { value: "home", label: "Home" }, { value: "motion", label: "Motion / exercise" }] },
      { id: "q_po_battery", label: "Power source", type: "radio", options: [{ value: "battery", label: "Battery" }, { value: "mains", label: "Mains" }] },
    ],
    analyze: (a) => ({ notes: [a.q_po_env === "motion" && a.q_po_accuracy === "medical" ? note("po-hard", "warning", "Medical accuracy under motion is hard", "Motion artifact is the dominant error source for wearable SpO₂ — plan strong motion handling.") : note("po-ok", "good", "Requirements are coherent")] }),
  },
  {
    id: "optics",
    title: "Optical sensor",
    subtitle: "Choose LEDs and measurement site (device-specific).",
    concept: { title: "why two wavelengths?", body: "Oxygenated and deoxygenated haemoglobin absorb red (660 nm) and infrared (940 nm) light differently. SpO₂ is derived from the ratio of pulsatile absorption at the two wavelengths — a single wavelength cannot separate them." },
    fields: [
      { id: "q_po_wavelengths", label: "LED wavelengths", type: "select", options: [{ value: "redir", label: "Red 660 nm + IR 940 nm (standard)" }, { value: "redonly", label: "Red 660 nm only" }, { value: "green", label: "Green only" }] },
      { id: "q_po_site", label: "Measurement site", type: "select", options: [{ value: "finger", label: "Fingertip" }, { value: "wrist", label: "Wrist" }, { value: "ear", label: "Earlobe" }] },
    ],
    analyze: (a) => {
      const notes = [];
      notes.push(a.q_po_wavelengths === "redir" ? note("w", "good", "Correct dual-wavelength optics") : note("w2", "error", "SpO₂ requires red + IR", "A single wavelength cannot compute oxygen saturation.", "Select Red 660 nm + IR 940 nm."));
      if (a.q_po_site === "wrist") notes.push(note("s", "warning", "Wrist PPG has low perfusion", "Expect a weaker pulsatile signal and more motion sensitivity than the fingertip."));
      return { notes };
    },
  },
  {
    id: "quality",
    title: "Signal & quality",
    subtitle: "Condition the PPG and keep it clean.",
    concept: { title: "perfusion & artifact", body: "The pulsatile (AC) part of the PPG is only ~1–2% of the total (DC) signal. Ambient light and motion easily swamp it, so ambient rejection and motion handling are essential for a trustworthy reading." },
    fields: [
      { id: "q_po_ambient", label: "Ambient light rejection", type: "radio", default: "on", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }] },
      { id: "q_po_motionfilter", label: "Motion handling", type: "radio", default: "on", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }] },
    ],
    analyze: (a) => {
      const { res } = ppgViz(a);
      const notes = [note("q", res.quality === "Good" ? "good" : res.quality === "Fair" ? "warning" : "error", `Signal quality: ${res.quality}`, `Perfusion index ≈ ${res.pi}%.`)];
      if (a.q_po_ambient !== "on") notes.push(note("amb", "warning", "Ambient light not rejected", "Stray light adds a large DC offset and can saturate the photodiode."));
      return { notes, metrics: [{ label: "SpO₂", value: `${res.spo2}%`, tone: "good" }, { label: "Heart rate", value: `${res.hr} bpm` }, { label: "Perfusion index", value: `${res.pi}%` }, { label: "Signal quality", value: res.quality, tone: res.quality === "Good" ? "good" : res.quality === "Fair" ? "warning" : "error" }] };
    },
    visualize: (a) => {
      const { sig } = ppgViz(a);
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Red & IR PPG</p>
          <Waveform series={[{ data: sig.red, color: C_RED, width: 1.2 }, { data: sig.ir, color: C_IR, width: 1.2 }]} height={140} />
          <WaveformLegend items={[{ color: C_RED, label: "Red 660 nm" }, { color: C_IR, label: "IR 940 nm" }]} />
        </div>
      );
    },
  },
  {
    id: "spo2",
    title: "SpO₂ estimation",
    subtitle: "How the reading is computed (adaptive).",
    concept: { title: "ratio-of-ratios", body: "R = (AC_red/DC_red) / (AC_IR/DC_IR). An empirical calibration curve maps R to SpO₂ (≈ 110 − 25·R). Because R depends on the small AC amplitude, anything that corrupts AC — especially motion — directly corrupts the SpO₂ estimate." },
    prediction: "What do you expect to happen to the SpO₂ reading as motion increases?",
    fields: [
      { id: "q_po_calib", label: "Estimation method", type: "select", options: [{ value: "ratio", label: "Ratio-of-ratios + calibration curve" }, { value: "peak", label: "Red peak amplitude only" }] },
      { id: "q_po_motion_effect", label: "How does motion affect R?", type: "select", options: [{ value: "corrupt", label: "It corrupts the AC component, making R (and SpO₂) unreliable" }, { value: "increase", label: "It steadily increases R" }, { value: "none", label: "No effect" }] },
    ],
    analyze: (a) => {
      const notes = [];
      notes.push(a.q_po_calib === "ratio" ? note("c", "good", "Correct method", "Ratio-of-ratios is the clinical standard.") : note("c2", "error", "Red amplitude alone is not SpO₂", "You need both wavelengths in a ratio.", "Use ratio-of-ratios."));
      notes.push(a.q_po_motion_effect === "corrupt" ? note("m", "good", "Correct understanding of motion", "Motion perturbs AC → unreliable R.") : note("m2", "warning", "Reconsider motion's effect", "Motion adds random content to the AC amplitude, making R noisy and the SpO₂ estimate unreliable."));
      return { notes };
    },
    visualize: () => {
      const xs: number[] = [];
      for (let m = 0; m <= 0.6; m += 0.05) {
        const sig = generatePpg({ hr: 75, spo2: 97, motion: m, ambientReject: true, fs: 200, seconds: 4 });
        xs.push(analyzePpg(sig, 200).spo2);
      }
      return (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Estimated SpO₂ vs motion (true = 97%)</p>
          <Waveform series={[{ data: xs, color: C_SPO2, width: 1.6, dots: true }]} height={120} yMin={80} yMax={100} />
          <p className="mt-2 text-xs text-muted-foreground">As motion rises (left → right), the estimate drifts away from the true 97% — motion corrupts the ratio.</p>
        </div>
      );
    },
  },
  {
    id: "wireless",
    title: "Wireless link",
    subtitle: "Pick a radio for a wearable oximeter.",
    concept: { title: "wearable = low power, short range", body: "An oximeter streams a low data rate to a nearby phone/hub, on a battery. BLE is the natural fit; high-power or long-range radios are over-provisioned." },
    fields: [{ id: "q_po_wireless", label: "Wireless technology", type: "select", options: WIRELESS.map((w) => ({ value: w.id, label: w.name })) }],
    analyze: (a) => {
      const { ratio, notes } = scoreWireless(a.q_po_wireless, poReq(a));
      return { notes, metrics: [{ label: "Match to requirements", value: `${Math.round(ratio * 100)}%`, tone: ratio >= 0.85 ? "good" : ratio >= 0.5 ? "warning" : "error" }] };
    },
  },
  {
    id: "review",
    title: "Design review & report",
    subtitle: "Generate your scored oximeter report.",
    concept: { title: "defend the design", body: "A good oximeter design ties every choice — optics, conditioning, estimation method, radio — back to the accuracy and motion requirements." },
    fields: [{ id: "q_po_justify", label: "Justify your key trade-off", type: "textarea", placeholder: "e.g. accepted lower perfusion at the wrist for wearability, compensated with motion handling…" }],
    visualize: (a) => {
      const tech = WIRELESS.find((t) => t.id === a.q_po_wireless);
      const sections: ReportSection[] = [
        { title: "Problem", rows: [["Use case", a.q_po_user ?? "—"], ["Accuracy", a.q_po_accuracy ?? "—"], ["Environment", a.q_po_env ?? "—"], ["Power", a.q_po_battery ?? "—"]] },
        { title: "Optics & signal", rows: [["Wavelengths", a.q_po_wavelengths === "redir" ? "Red 660 + IR 940" : a.q_po_wavelengths ?? "—"], ["Site", a.q_po_site ?? "—"], ["Ambient rejection", a.q_po_ambient ?? "—"], ["Motion handling", a.q_po_motionfilter ?? "—"]] },
        { title: "Estimation & link", rows: [["Method", a.q_po_calib ?? "—"], ["Motion effect", a.q_po_motion_effect ?? "—"], ["Wireless", tech?.name ?? "—"]] },
      ];
      return <DeviceReport labId="pulse-ox" title="Pulse Oximeter" answers={a} rubric={PULSEOX_RUBRIC} sections={sections} />;
    },
  },
];
