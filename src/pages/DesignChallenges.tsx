import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { EngineeringCoach } from "@/components/EngineeringCoach";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { CHALLENGES, evaluateChallenge } from "@/lib/challenges";
import { SENSOR_SPECS, POWER_STRATEGIES, EDGE_OPTIONS } from "@/lib/deviceBuilder";
import { WIRELESS } from "@/lib/wireless";
import { recordScore, makeId } from "@/lib/storage";

const sel = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default function DesignChallenges() {
  const [active, setActive] = React.useState<string | null>(null);
  const [sensor, setSensor] = React.useState("accel");
  const [wireless, setWireless] = React.useState("ble");
  const [edge, setEdge] = React.useState("feature");
  const [power, setPower] = React.useState("balanced");
  const [result, setResult] = React.useState<ReturnType<typeof evaluateChallenge> | null>(null);

  const ch = CHALLENGES.find((c) => c.id === active) ?? null;

  const evaluate = () => {
    if (!ch) return;
    const r = evaluateChallenge(ch, { sensor, wireless, edge, power });
    setResult(r);
    recordScore({ id: makeId(), labId: `challenge-${ch.id}`, percent: r.result.percent, grade: r.result.grade, createdAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6" data-testid="design-challenges">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Trophy size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Design Challenges</h1>
          <span className="font-mono text-xs text-muted-foreground">constrained briefs · scored with reasoning, not pass/fail</span>
        </div>
      </div>
      <MedicalDisclaimer />

      <div className="grid gap-3 sm:grid-cols-2">
        {CHALLENGES.map((c) => (
          <button key={c.id} onClick={() => { setActive(c.id); setResult(null); }} data-testid={`challenge-${c.id}`}
            className={`rounded-xl border p-4 text-left transition-colors ${active === c.id ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/40"}`}>
            <h3 className="font-display text-base font-semibold">{c.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{c.brief}</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">≥{c.minBatteryDays}d battery · ≤{c.maxLatencyMs}ms · rel ≥{c.minReliability}/5 · {c.rangeM}m</p>
          </button>
        ))}
      </div>

      {ch && (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="challenge-runner">
          <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Your design for: {ch.name}</p>
            <div><label className="mb-1 block text-sm text-muted-foreground">Sensor</label>
              <select className={sel} value={sensor} onChange={(e) => setSensor(e.target.value)} data-testid="ch-sensor">{SENSOR_SPECS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Wireless</label>
              <select className={sel} value={wireless} onChange={(e) => setWireless(e.target.value)} data-testid="ch-wireless">{WIRELESS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Processing</label>
              <select className={sel} value={edge} onChange={(e) => setEdge(e.target.value)} data-testid="ch-edge">{EDGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Power</label>
              <select className={sel} value={power} onChange={(e) => setPower(e.target.value)} data-testid="ch-power">{POWER_STRATEGIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
            <button onClick={evaluate} data-testid="ch-evaluate" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Evaluate design</button>
          </div>
          <div>
            {result ? (
              <EngineeringCoach title={`Assessment — ${ch.name}`} notes={result.notes} score={result.result} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">Choose your components and evaluate to get a scored, reasoned assessment.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
