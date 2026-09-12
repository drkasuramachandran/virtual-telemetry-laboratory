import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Network, Play, Pause, RotateCcw } from "lucide-react";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { WhyPanel } from "@/components/WhyPanel";

interface Packet {
  id: number;
  dropped: boolean;
  dropLeft: number;
  lat: number;
}

const WAYPOINTS = [
  { label: "Sensor", left: 4 },
  { label: "Gateway", left: 37 },
  { label: "Cloud", left: 70 },
  { label: "User", left: 96 },
];

export default function NetworkSimulator() {
  const [distance, setDistance] = React.useState(5);
  const [txPower, setTxPower] = React.useState(4);
  const [loss, setLoss] = React.useState(3);
  const [latency, setLatency] = React.useState(40);
  const [sampling, setSampling] = React.useState(500);
  const [interval, setIntervalMs] = React.useState(600);
  const [running, setRunning] = React.useState(true);
  const [packets, setPackets] = React.useState<Packet[]>([]);
  const [stats, setStats] = React.useState({ total: 0, recv: 0, lost: 0, latSum: 0, bits: 0 });

  const idRef = React.useRef(0);
  const startRef = React.useRef(Date.now());

  const effectiveLoss = React.useCallback(() => {
    const distPenalty = Math.max(0, distance - 10) * 0.4;
    const powerBonus = txPower * 0.3;
    return Math.max(0, Math.min(100, loss + distPenalty - powerBonus));
  }, [distance, txPower, loss]);

  const payloadBits = sampling * 12 * (interval / 1000);

  const spawn = React.useCallback(() => {
    const eff = effectiveLoss();
    const dropped = Math.random() * 100 < eff;
    const dropLeft = Math.random() < 0.6 ? WAYPOINTS[1].left : WAYPOINTS[2].left;
    const lat = latency + distance * 0.6 + Math.random() * 30;
    const id = ++idRef.current;
    setPackets((p) => [...p.slice(-24), { id, dropped, dropLeft, lat }]);
    setStats((s) => ({
      total: s.total + 1,
      recv: s.recv + (dropped ? 0 : 1),
      lost: s.lost + (dropped ? 1 : 0),
      latSum: s.latSum + (dropped ? 0 : lat),
      bits: s.bits + (dropped ? 0 : payloadBits),
    }));
    window.setTimeout(() => setPackets((p) => p.filter((x) => x.id !== id)), 2400);
  }, [effectiveLoss, latency, distance, payloadBits]);

  React.useEffect(() => {
    if (!running) return;
    const tick = Math.max(250, Math.min(2000, interval));
    const h = window.setInterval(spawn, tick);
    return () => window.clearInterval(h);
  }, [running, interval, spawn]);

  const reset = () => {
    setStats({ total: 0, recv: 0, lost: 0, latSum: 0, bits: 0 });
    setPackets([]);
    startRef.current = Date.now();
  };

  const lossPct = stats.total ? (stats.lost / stats.total) * 100 : 0;
  const avgLat = stats.recv ? stats.latSum / stats.recv : 0;
  const elapsed = Math.max(1, (Date.now() - startRef.current) / 1000);
  const throughputKbps = stats.bits / 1000 / elapsed;
  const quality = lossPct < 2 ? { label: "Excellent", tone: "text-emerald-400" } : lossPct < 5 ? { label: "Good", tone: "text-emerald-400" } : lossPct < 15 ? { label: "Fair", tone: "text-amber-300" } : { label: "Poor", tone: "text-red-400" };

  const Ctrl: React.FC<{ label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit: string; testid: string }> = ({ label, value, set, min, max, step, unit, testid }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-primary">{value} {unit}</span>
      </div>
      <input type="range" className="w-full accent-[hsl(var(--primary))]" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} data-testid={testid} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="network-simulator">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Network size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Network Simulator</h1>
          <span className="font-mono text-xs text-muted-foreground">sensor → gateway → cloud → user · live packet flow</span>
        </div>
      </div>

      <WhyPanel title="the link is never perfect" body="Distance, transmit power, interference and congestion all cause packets to drop and latency to rise. Watch how each control changes delivered vs lost packets, throughput and link quality — the same trade-offs a real telemetry deployment faces." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <button onClick={() => setRunning((r) => !r)} data-testid="sim-toggle" className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {running ? <Pause size={13} /> : <Play size={13} />} {running ? "Pause" : "Run"}
              </button>
              <button onClick={reset} data-testid="sim-reset" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                <RotateCcw size={13} /> Reset
              </button>
            </div>
            <div className="space-y-3">
              <Ctrl label="Distance" value={distance} set={setDistance} min={1} max={100} step={1} unit="m" testid="ns-distance" />
              <Ctrl label="Tx power" value={txPower} set={setTxPower} min={0} max={20} step={1} unit="dBm" testid="ns-txpower" />
              <Ctrl label="Base packet loss" value={loss} set={setLoss} min={0} max={40} step={1} unit="%" testid="ns-loss" />
              <Ctrl label="Base latency" value={latency} set={setLatency} min={0} max={500} step={5} unit="ms" testid="ns-latency" />
              <Ctrl label="Sampling rate" value={sampling} set={setSampling} min={50} max={2000} step={50} unit="Hz" testid="ns-sampling" />
              <Ctrl label="Tx interval" value={interval} set={setIntervalMs} min={200} max={2000} step={100} unit="ms" testid="ns-interval" />
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground" data-testid="ns-effloss">effective loss ≈ {effectiveLoss().toFixed(1)}%</p>
          </div>
        </div>

        {/* Visualization + stats */}
        <div className="space-y-4">
          {/* stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="sim-stats">
            <Stat label="Received" value={`${stats.recv}`} tone="text-emerald-400" />
            <Stat label="Lost" value={`${stats.lost}`} tone="text-red-400" />
            <Stat label="Loss %" value={`${lossPct.toFixed(1)}%`} />
            <Stat label="Avg latency" value={`${avgLat.toFixed(0)} ms`} />
            <Stat label="Throughput" value={`${throughputKbps.toFixed(1)} kbps`} />
            <Stat label="Link" value={quality.label} tone={quality.tone} />
          </div>

          {/* architecture pipeline (reused) */}
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Telemetry pipeline</p>
            <PipelineDiagram animate states={{ gateway: "active", cloud: "active", dashboard: lossPct >= 15 ? "error" : "active" }} height={120} />
          </div>

          {/* live packet lane */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Live packet flow</p>
            <div className="relative h-24 w-full overflow-hidden rounded-lg bg-background/60">
              {/* wire */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
              {WAYPOINTS.map((w) => (
                <div key={w.label} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${w.left}%` }}>
                  <div className="h-3 w-3 -translate-x-1/2 rounded-full border border-primary bg-card" />
                  <span className="absolute left-0 top-4 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-muted-foreground">{w.label}</span>
                </div>
              ))}
              <AnimatePresence>
                {packets.map((p) =>
                  p.dropped ? (
                    <motion.div
                      key={p.id}
                      className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-red-500"
                      style={{ marginTop: -5 }}
                      initial={{ left: "4%", y: 0, opacity: 1 }}
                      animate={{ left: [`4%`, `${p.dropLeft}%`], y: [0, 0, 30], opacity: [1, 1, 0] }}
                      transition={{ duration: 1.2, times: [0, 0.55, 1] }}
                      data-testid="packet-dropped"
                    />
                  ) : (
                    <motion.div
                      key={p.id}
                      className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400"
                      style={{ marginTop: -5, filter: "drop-shadow(0 0 4px hsl(168 80% 55%))" }}
                      initial={{ left: "4%", opacity: 0 }}
                      animate={{ left: ["4%", "96%"], opacity: [0, 1, 1, 1] }}
                      transition={{ duration: 2 }}
                      data-testid="packet-delivered"
                    />
                  ),
                )}
              </AnimatePresence>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Green packets are delivered end-to-end; red packets are dropped at the gateway or cloud.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
    <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-lg font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
  </div>
);
