import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, Activity } from "lucide-react";
import { Waveform, WaveformLegend } from "@/components/Waveform";
import { WhyPanel } from "@/components/WhyPanel";
import { NyquistView } from "@/components/NyquistView";
import { generateSignal, SIGNAL_META, SignalType } from "@/lib/signals";
import { condition } from "@/lib/ecg/ecgSignal";
import { detectRPeaks, detectPeaks, heartRateFromPeaks } from "@/lib/dsp";

const C_CLEAN = "hsl(199 89% 60%)";
const C_NOISY = "hsl(0 72% 60%)";
const C_COND = "hsl(168 76% 50%)";

const TYPES: SignalType[] = ["ecg", "ppg", "temp"];

export default function SignalConditioningLab() {
  const [type, setType] = React.useState<SignalType>("ecg");
  const [rate, setRate] = React.useState(75);
  const [powerline, setPowerline] = React.useState(0.15);
  const [motion, setMotion] = React.useState(0.1);
  const [drift, setDrift] = React.useState(0.2);
  const [gain, setGain] = React.useState(1000);
  const [hp, setHp] = React.useState(0.5);
  const [lp, setLp] = React.useState(150);
  const [notchHz, setNotchHz] = React.useState<0 | 50 | 60>(50);
  const [fs, setFs] = React.useState(500);

  const meta = SIGNAL_META[type];

  const { clean, noisy, conditioned, metricText, abnormal } = React.useMemo(() => {
    const sig = generateSignal(type, { rateBpm: meta.hasRate ? rate : 0, seconds: 4, fs, noise: { powerlineHz: 50, powerlineAmp: powerline, motionAmp: motion, driftAmp: drift } });
    const { conditioned } = condition(sig.noisy, fs, { gain, hpOn: true, hpCut: hp, lpOn: true, lpCut: lp, notchHz });
    let metricText = "";
    let abnormal = false;
    if (meta.metric === "hr") {
      const peaks = type === "ppg" ? detectPeaks(conditioned, fs) : detectRPeaks(conditioned, fs);
      const r = heartRateFromPeaks(peaks, fs);
      metricText = `${r.bpm} bpm · ${r.flag}`;
      abnormal = r.abnormal;
    } else {
      const mean = sig.clean.reduce((a, b) => a + b, 0) / sig.clean.length;
      metricText = `baseline stable (Δ≈${mean.toFixed(2)})`;
    }
    return { clean: sig.clean, noisy: sig.noisy, conditioned, metricText, abnormal };
  }, [type, rate, powerline, motion, drift, gain, hp, lp, notchHz, fs, meta]);

  const Ctrl: React.FC<{ label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit?: string }> = ({ label, value, set, min, max, step, unit }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-primary">{value}{unit ? ` ${unit}` : ""}</span>
      </div>
      <input type="range" className="w-full accent-[hsl(var(--primary))]" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} data-testid={`sc-${label.replace(/\s+/g, "-").toLowerCase()}`} />
    </div>
  );

  return (
    <div className="space-y-5" data-testid="signal-conditioning-lab">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><SlidersHorizontal size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Signal Conditioning Lab</h1>
          <span className="font-mono text-xs text-muted-foreground">multiple signals · design gain, filtering & sampling</span>
        </div>
      </div>

      <WhyPanel title="conditioning generalises across signals" body="Every sensor signal is amplified, filtered and sampled — but the right settings depend on the signal's bandwidth. A sharp ECG needs wide bandwidth and a high sampling rate; a slow temperature trend needs almost none. Switch signals and watch how the same controls behave differently." />

      {/* Signal selector */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t} onClick={() => { setType(t); setRate(SIGNAL_META[t].defaultRate || 75); }} data-testid={`signal-${t}`}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${type === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            {SIGNAL_META[t].label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Signal & noise</p>
            <div className="space-y-3">
              {meta.hasRate && <Ctrl label={meta.rateLabel} value={rate} set={setRate} min={40} max={180} step={1} unit={meta.rateUnit} />}
              <Ctrl label="Mains noise" value={powerline} set={setPowerline} min={0} max={0.6} step={0.01} unit="mV" />
              <Ctrl label="Motion artifact" value={motion} set={setMotion} min={0} max={0.6} step={0.01} unit="mV" />
              <Ctrl label="Baseline drift" value={drift} set={setDrift} min={0} max={0.6} step={0.01} unit="mV" />
              <Ctrl label="Sampling freq" value={fs} set={setFs} min={30} max={1000} step={10} unit="Hz" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Conditioning</p>
            <div className="space-y-3">
              <Ctrl label="Gain" value={gain} set={setGain} min={100} max={2000} step={50} unit="×" />
              <Ctrl label="High-pass" value={hp} set={setHp} min={0.05} max={5} step={0.05} unit="Hz" />
              <Ctrl label="Low-pass" value={lp} set={setLp} min={5} max={250} step={5} unit="Hz" />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Notch</span>
                <div className="flex gap-2">
                  {([50, 60, 0] as const).map((v) => (
                    <button key={v} onClick={() => setNotchHz(v)} data-testid={`sc-notch-${v}`} className={`flex-1 rounded-md border px-2 py-1 text-xs ${notchHz === v ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                      {v === 0 ? "Off" : `${v} Hz`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waveforms */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Before — raw (clean) vs noisy</p>
            <Waveform series={[{ data: clean, color: C_CLEAN, width: 1.2 }, { data: noisy, color: C_NOISY, width: 1 }]} height={140} />
            <WaveformLegend items={[{ color: C_CLEAN, label: "Clean" }, { color: C_NOISY, label: "Noisy input" }]} />
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">After — conditioned</p>
              <span className={`flex items-center gap-1.5 font-mono text-xs ${abnormal ? "text-amber-300" : "text-emerald-400"}`} data-testid="sc-metric">
                <Activity size={13} /> {metricText}
              </span>
            </div>
            <Waveform series={[{ data: conditioned, color: C_COND, width: 1.4 }]} height={140} />
            <WaveformLegend items={[{ color: C_COND, label: "Conditioned output" }]} />
          </div>
          <NyquistView bandwidth={meta.bandwidth} fs={fs} />
        </div>
      </div>
    </div>
  );
}
