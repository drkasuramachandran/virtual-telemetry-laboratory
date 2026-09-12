import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RadioTower, Sparkles } from "lucide-react";
import { EngineeringCoach } from "@/components/EngineeringCoach";
import { WhyPanel } from "@/components/WhyPanel";
import { WIRELESS, SCENARIOS, rankWireless, factorScores } from "@/lib/wireless";

const rel = (n: number) => "▮".repeat(n) + "▯".repeat(5 - n);

function RangePowerChart({ selected, onSelect, reqRange }: { selected: string | null; onSelect: (id: string) => void; reqRange?: number }) {
  const W = 720, H = 300, pad = 44;
  const xOf = (m: number) => {
    const lo = Math.log10(0.05), hi = Math.log10(200000);
    return pad + ((Math.log10(Math.max(0.05, m)) - lo) / (hi - lo)) * (W - 2 * pad);
  };
  const yOf = (power: number) => pad + ((power - 1) / 4) * (H - 2 * pad); // power 1 top, 5 bottom
  const ticks = [0.1, 1, 10, 100, 1000, 10000, 100000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="rounded-xl border border-border bg-card/40" data-testid="range-power-chart">
      <g style={{ pointerEvents: "none" }}>
        {/* axes */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="hsl(var(--border))" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="hsl(var(--border))" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={xOf(t)} y1={pad} x2={xOf(t)} y2={H - pad} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.4} />
            <text x={xOf(t)} y={H - pad + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
              {t >= 1000 ? `${t / 1000}k` : t}m
            </text>
          </g>
        ))}
        {[1, 2, 3, 4, 5].map((p) => (
          <text key={p} x={pad - 8} y={yOf(p) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">
            {["min", "low", "med", "high", "max"][p - 1]}
          </text>
        ))}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">Range (log) →</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" transform={`rotate(-90 12 ${H / 2})`}>← Power draw</text>
        {reqRange && (
          <line x1={xOf(reqRange)} y1={pad} x2={xOf(reqRange)} y2={H - pad} stroke="hsl(var(--accent))" strokeWidth={1.5} strokeDasharray="5 4" />
        )}
      </g>

      {WIRELESS.map((t) => {
        const on = selected === t.id;
        return (
          <g key={t.id} onClick={() => onSelect(t.id)} style={{ cursor: "pointer" }} data-testid={`chart-dot-${t.id}`}>
            <circle cx={xOf(t.rangeM)} cy={yOf(t.power)} r={14} fill="transparent" />
            <circle cx={xOf(t.rangeM)} cy={yOf(t.power)} r={on ? 8 : 5} fill={on ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} stroke={on ? "hsl(var(--primary))" : "none"} opacity={on ? 1 : 0.7} style={on ? { filter: "drop-shadow(0 0 6px hsl(var(--primary)))" } : undefined} />
            <text x={xOf(t.rangeM)} y={yOf(t.power) - 11} textAnchor="middle" fontSize={9} fontWeight={600} fill={on ? "hsl(var(--primary))" : "hsl(var(--foreground))"} style={{ pointerEvents: "none" }}>{t.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function WirelessLab() {
  const [selected, setSelected] = React.useState<string | null>("ble");
  const [scenarioId, setScenarioId] = React.useState<string | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? null;
  const ranked = React.useMemo(() => (scenario ? rankWireless(scenario.req) : []), [scenario]);
  const top = ranked[0];
  const tech = WIRELESS.find((t) => t.id === selected) ?? null;

  return (
    <div className="space-y-6" data-testid="wireless-lab">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><RadioTower size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Wireless Technology Lab</h1>
          <span className="font-mono text-xs text-muted-foreground">compare radios · pick for a scenario</span>
        </div>
      </div>

      <WhyPanel title="no radio is 'best'" body="Every wireless technology trades range against power, data rate, latency, reliability and cost. The right choice depends entirely on the deployment scenario — a wearable, a ward, or a cold-chain shipment need very different radios." />

      {/* Tech cards */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Technologies</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WIRELESS.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} data-testid={`tech-card-${t.id}`}
              className={`rounded-xl border p-4 text-left transition-colors ${selected === t.id ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{t.name}</h3>
                <span className="font-mono text-[10px] text-muted-foreground">{t.band}</span>
              </div>
              <dl className="mt-2 space-y-1 text-xs">
                <Spec k="Range" v={t.rangeM >= 1000 ? `${t.rangeM / 1000} km` : `${t.rangeM} m`} />
                <Spec k="Data rate" v={t.dataRateKbps >= 1000 ? `${t.dataRateKbps / 1000} Mbps` : `${t.dataRateKbps} kbps`} />
                <Spec k="Power" v={rel(t.power)} />
                <Spec k="Cost" v={"$".repeat(t.cost)} />
              </dl>
              <p className="mt-2 text-[11px] text-muted-foreground">{t.apps}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Range vs Power chart */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Range vs. Power</h2>
        <RangePowerChart selected={selected} onSelect={setSelected} reqRange={scenario?.req.rangeM} />
        {tech && (
          <p className="text-sm text-muted-foreground" data-testid="tech-detail">
            <span className="font-semibold text-foreground">{tech.name}:</span> {tech.note} Latency ~{tech.latencyMs} ms, reliability {rel(tech.reliability)}.
          </p>
        )}
      </section>

      {/* Scenario picker */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Scenario recommendation</h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => setScenarioId(s.id)} data-testid={`scenario-${s.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${scenarioId === s.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              {s.name}
            </button>
          ))}
        </div>

        {scenario && top && (
          <div className="grid gap-4 lg:grid-cols-2" data-testid="recommendation">
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{scenario.name} · {scenario.environment}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Recommended:</span>
                  <span className="font-display text-2xl font-bold text-primary" data-testid="rec-top">{top.tech.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">{Math.round(top.ratio * 100)}% match</span>
                </div>
              </div>
              {/* factor bars for top pick */}
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Why {top.tech.name} fits</p>
                {factorScores(top.tech, scenario.req).map((f) => (
                  <div key={f.label} className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 text-muted-foreground">{f.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${f.score * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono">{Math.round(f.score * 100)}</span>
                  </div>
                ))}
              </div>
              {/* ranked list */}
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Full ranking</p>
                {ranked.map((r, i) => (
                  <div key={r.tech.id} className="flex items-center gap-2 py-1 text-sm" data-testid={`rank-${r.tech.id}`}>
                    <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="w-28 shrink-0">{r.tech.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/50"}`} style={{ width: `${r.ratio * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-xs">{Math.round(r.ratio * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <EngineeringCoach title={`Reasoning for ${scenario.name}`} notes={top.notes} />
          </div>
        )}
        {!scenario && <p className="text-sm text-muted-foreground">Pick a scenario to get a reasoned recommendation across range, power, data rate, latency, reliability and cost.</p>}
      </section>
    </div>
  );
}

const Spec: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className="font-mono text-foreground/90">{v}</dd>
  </div>
);
