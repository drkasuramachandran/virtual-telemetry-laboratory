import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BatteryCharging, Zap } from "lucide-react";
import { WhyPanel } from "@/components/WhyPanel";
import { computeBattery, PowerStage } from "@/lib/power";

export default function PowerSimulator() {
  const [batteryMah, setBatteryMah] = React.useState(200);
  const [sensorMa, setSensorMa] = React.useState(0.5);
  const [mcuMa, setMcuMa] = React.useState(8);
  const [txMa, setTxMa] = React.useState(15);
  const [rxMa, setRxMa] = React.useState(10);
  const [sleepMa, setSleepMa] = React.useState(0.01);
  const [activeMs, setActiveMs] = React.useState(20);
  const [interval, setIntervalMs] = React.useState(1000);
  const [dutyOn, setDutyOn] = React.useState(true);

  const stagesFor = React.useCallback(
    (intervalMs: number): PowerStage[] => {
      const duty = dutyOn ? Math.max(0, Math.min(1, activeMs / intervalMs)) : 1;
      return [
        { label: "Sensor + AFE", currentMa: sensorMa, duty: 1 },
        { label: "MCU active", currentMa: mcuMa, duty },
        { label: "Radio TX", currentMa: txMa, duty: duty * 0.5 },
        { label: "Radio RX", currentMa: rxMa, duty: duty * 0.3 },
        { label: "Sleep", currentMa: sleepMa, duty: Math.max(0, 1 - duty) },
      ];
    },
    [dutyOn, activeMs, sensorMa, mcuMa, txMa, rxMa, sleepMa],
  );

  const stages = stagesFor(interval);
  const result = computeBattery(stages, batteryMah);
  const duty = dutyOn ? Math.max(0, Math.min(1, activeMs / interval)) : 1;
  const txFreq = 1000 / interval;

  // lifetime vs tx interval curve
  const curve = React.useMemo(() => {
    const pts: { interval: number; days: number }[] = [];
    for (let iv = 200; iv <= 5000; iv += 100) pts.push({ interval: iv, days: computeBattery(stagesFor(iv), batteryMah).days });
    return pts;
  }, [stagesFor, batteryMah]);

  const Ctrl: React.FC<{ label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit: string; testid: string }> = ({ label, value, set, min, max, step, unit, testid }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-primary">{value} {unit}</span>
      </div>
      <input type="range" className="w-full accent-[hsl(var(--primary))]" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} data-testid={testid} />
    </div>
  );

  // chart geometry
  const W = 720, H = 240, pad = 40;
  const maxDays = Math.max(...curve.map((p) => p.days), 1);
  const xOf = (iv: number) => pad + ((iv - 200) / (5000 - 200)) * (W - 2 * pad);
  const yOf = (d: number) => H - pad - (d / maxDays) * (H - 2 * pad);
  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.interval).toFixed(1)},${yOf(p.days).toFixed(1)}`).join(" ");

  return (
    <div className="space-y-5" data-testid="power-simulator">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><BatteryCharging size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Power / Battery Simulator</h1>
          <span className="font-mono text-xs text-muted-foreground">virtual battery model · live lifetime</span>
        </div>
      </div>

      <WhyPanel title="average current sets battery life" body="Battery life depends on average current, not peak. Transmitting more often (shorter interval) raises average current and shortens life; duty-cycling — sleeping the MCU and radio between transmissions — is the single biggest lever, often extending life 10–100×." />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Duty-cycling</span>
              <button onClick={() => setDutyOn((d) => !d)} data-testid="duty-toggle" className={`rounded-full px-3 py-1 text-xs font-semibold ${dutyOn ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {dutyOn ? "ON" : "OFF"}
              </button>
            </div>
            <Ctrl label="Battery capacity" value={batteryMah} set={setBatteryMah} min={20} max={2000} step={10} unit="mAh" testid="ps-batt" />
            <div className="mt-3 space-y-3">
              <Ctrl label="Tx interval" value={interval} set={setIntervalMs} min={200} max={5000} step={100} unit="ms" testid="ps-interval" />
              <Ctrl label="Active window / tx" value={activeMs} set={setActiveMs} min={1} max={200} step={1} unit="ms" testid="ps-active" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Stage currents</p>
            <div className="space-y-3">
              <Ctrl label="Sensor sampling" value={sensorMa} set={setSensorMa} min={0} max={10} step={0.1} unit="mA" testid="ps-sensor" />
              <Ctrl label="MCU processing" value={mcuMa} set={setMcuMa} min={0.1} max={100} step={0.5} unit="mA" testid="ps-mcu" />
              <Ctrl label="Radio TX" value={txMa} set={setTxMa} min={0.1} max={200} step={1} unit="mA" testid="ps-tx" />
              <Ctrl label="Radio RX" value={rxMa} set={setRxMa} min={0.1} max={100} step={1} unit="mA" testid="ps-rx" />
              <Ctrl label="Sleep" value={sleepMa} set={setSleepMa} min={0} max={2} step={0.01} unit="mA" testid="ps-sleep" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="power-stats">
            <Stat label="Duty cycle" value={`${(duty * 100).toFixed(1)}%`} />
            <Stat label="Tx frequency" value={`${txFreq.toFixed(2)} Hz`} />
            <Stat label="Avg current" value={`${result.avgCurrentMa} mA`} />
            <Stat label="Power" value={`${result.powerMw} mW`} />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <Zap size={22} className="text-primary" />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Estimated battery life</div>
              <div className="font-display text-3xl font-bold text-primary" data-testid="battery-life">
                {result.days >= 1 ? `${result.days} days` : `${result.hours} h`}
              </div>
            </div>
            <span className="ml-auto max-w-[180px] text-right text-xs text-muted-foreground">
              {dutyOn ? "Duty-cycling ON — device sleeps between transmissions." : "Duty-cycling OFF — device always active (worst case)."}
            </span>
          </div>

          {/* stage breakdown */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Average current by stage</p>
            {stages.map((s) => {
              const contrib = s.currentMa * s.duty;
              const pct = result.avgCurrentMa > 0 ? (contrib / result.avgCurrentMa) * 100 : 0;
              return (
                <div key={s.label} className="mb-1.5 flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 text-muted-foreground">{s.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono">{contrib.toFixed(3)} mA</span>
                </div>
              );
            })}
          </div>

          {/* lifetime vs interval chart */}
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Battery life vs transmission interval</p>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" data-testid="lifetime-chart">
              <g style={{ pointerEvents: "none" }}>
                <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="hsl(var(--border))" />
                <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="hsl(var(--border))" />
                <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
                <line x1={xOf(interval)} y1={pad} x2={xOf(interval)} y2={H - pad} stroke="hsl(var(--accent))" strokeWidth={1.5} strokeDasharray="5 4" />
                <circle cx={xOf(interval)} cy={yOf(result.days)} r={4} fill="hsl(var(--accent))" />
                <text x={pad} y={pad - 8} fontSize={10} fill="hsl(var(--muted-foreground))">days</text>
                <text x={W - pad} y={H - pad + 16} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">longer interval →</text>
                <text x={pad} y={H - pad + 16} fontSize={10} fill="hsl(var(--muted-foreground))">200 ms</text>
              </g>
            </svg>
            <p className="mt-1 text-xs text-muted-foreground">Shorter intervals (left) = more frequent transmission = higher power = shorter life. The amber marker is your current setting.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
    <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
  </div>
);
