import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, Play, Pause, RotateCcw, Maximize, Zap, Radio, BatteryLow } from "lucide-react";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { Waveform } from "@/components/Waveform";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { generateEcg } from "@/lib/ecg/ecgSignal";
import { StageStateMap } from "@/lib/pipeline";

type Fault = "none" | "interference" | "loss" | "battery";

export default function InstructorMode() {
  const [running, setRunning] = React.useState(true);
  const [hr, setHr] = React.useState(75);
  const [loss, setLoss] = React.useState(2);
  const [battery, setBattery] = React.useState(100);
  const [fault, setFault] = React.useState<Fault>("none");
  const [tick, setTick] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!running) return;
    const h = window.setInterval(() => {
      setTick((t) => t + 1);
      setBattery((b) => Math.max(0, b - (fault === "battery" ? 4 : 0.3)));
    }, 700);
    return () => window.clearInterval(h);
  }, [running, fault]);

  const wave = React.useMemo(() => {
    const sig = generateEcg({ hrBpm: hr, seconds: 3, fsAnalog: 400, noise: { powerlineHz: 50, powerlineAmp: fault === "interference" ? 0.5 : 0.05, motionAmp: 0.03, driftAmp: 0.08 } });
    return sig.noisy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hr, fault, tick]);

  const states: StageStateMap = {
    conditioning: fault === "interference" ? "error" : "active",
    mcu: fault === "battery" ? "error" : "active",
    gateway: "active",
    cloud: "active",
    dashboard: fault === "loss" ? "error" : "active",
  };
  const effLoss = fault === "loss" ? 40 : loss;

  const present = () => ref.current?.requestFullscreen?.();
  const reset = () => { setFault("none"); setBattery(100); setLoss(2); setHr(75); };

  const FaultBtn: React.FC<{ id: Fault; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => (
    <button onClick={() => setFault(fault === id ? "none" : id)} data-testid={`fault-${id}`}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${fault === id ? "border-red-500 bg-red-500/15 text-red-400" : "border-border text-muted-foreground hover:bg-secondary"}`}>
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-5" data-testid="instructor-mode">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><GraduationCap size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Instructor Mode</h1>
          <span className="font-mono text-xs text-muted-foreground">live demo · trigger faults · present to class</span>
        </div>
        <button onClick={present} data-testid="present-btn" className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Maximize size={15} /> Present (full-screen)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setRunning((r) => !r)} data-testid="instr-run" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">{running ? <Pause size={13} /> : <Play size={13} />} {running ? "Pause" : "Run"}</button>
        <button onClick={reset} data-testid="instr-reset" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"><RotateCcw size={13} /> Reset</button>
        <span className="mx-2 text-xs text-muted-foreground">Faults:</span>
        <FaultBtn id="interference" icon={<Radio size={13} />} label="Interference" />
        <FaultBtn id="loss" icon={<Zap size={13} />} label="Packet-loss spike" />
        <FaultBtn id="battery" icon={<BatteryLow size={13} />} label="Battery depletion" />
      </div>

      <MedicalDisclaimer />

      {/* Presentation surface */}
      <div ref={ref} className="space-y-4 rounded-2xl border border-border bg-background p-5" data-testid="present-surface">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Heart rate" value={`${hr} bpm`} />
          <Stat label="Packet loss" value={`${effLoss}%`} tone={effLoss >= 15 ? "text-red-400" : undefined} />
          <Stat label="Battery" value={`${battery.toFixed(0)}%`} tone={battery < 20 ? "text-red-400" : undefined} />
          <Stat label="Fault" value={fault === "none" ? "none" : fault} tone={fault !== "none" ? "text-red-400" : "text-emerald-400"} />
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Live architecture</p>
          <PipelineDiagram animate states={states} height={130} />
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Live ECG {fault === "interference" ? "(interference injected)" : ""}</p>
          <Waveform series={[{ data: wave, color: fault === "interference" ? "hsl(0 72% 60%)" : "hsl(168 76% 50%)", width: 1.3 }]} height={150} />
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Live parameters</p>
          <Ctrl label="Heart rate" value={hr} set={setHr} min={40} max={160} step={1} unit="bpm" />
          <Ctrl label="Packet loss" value={loss} set={setLoss} min={0} max={40} step={1} unit="%" />
        </div>
      </div>
    </div>
  );
}

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
    <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-xl font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
  </div>
);

const Ctrl: React.FC<{ label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit: string }> = ({ label, value, set, min, max, step, unit }) => (
  <div className="mb-2 flex items-center gap-3 text-xs">
    <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
    <input type="range" className="flex-1 accent-[hsl(var(--primary))]" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} data-testid={`instr-${label.replace(/\s+/g, "-").toLowerCase()}`} />
    <span className="w-16 text-right font-mono text-primary">{value} {unit}</span>
  </div>
);
