import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartPulse, Fingerprint, Droplet, ArrowRight, Lock } from "lucide-react";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { PedagogicalLoop } from "@/components/PedagogicalLoop";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";

interface DeviceCard {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  physical: string;
  sensor: string;
  wireless: string;
  to: string;
  enabled: boolean;
}

const DEVICES: DeviceCard[] = [
  {
    id: "ecg",
    name: "ECG Monitor",
    icon: HeartPulse,
    physical: "Cardiac electrical activity",
    sensor: "Ag/AgCl electrodes",
    wireless: "BLE",
    to: "/lab/ecg",
    enabled: true,
  },
  {
    id: "pulse-ox",
    name: "Pulse Oximeter",
    icon: Fingerprint,
    physical: "Blood oxygen saturation",
    sensor: "Red/IR photodiode (PPG)",
    wireless: "BLE",
    to: "/lab/pulse-ox",
    enabled: true,
  },
  {
    id: "cgm",
    name: "Continuous Glucose Monitor",
    icon: Droplet,
    physical: "Interstitial glucose",
    sensor: "Electrochemical enzyme",
    wireless: "BLE / NFC",
    to: "/lab/cgm",
    enabled: true,
  },
];

export default function Home() {
  return (
    <div className="space-y-10" data-testid="home-page">
      {/* Hero */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] text-primary">
            6-hour course · Wireless Telemetry-Enabled Devices
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Build & operate <span className="text-primary">medical telemetry</span>
            <br className="hidden sm:block" /> devices — no hardware.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Pick a device, design its sensing pipeline, run realistic client-side simulations,
            diagnose what breaks, and justify your engineering choices.
          </p>
        </motion.div>
      </section>

      {/* Device selection */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold">Choose a device</h2>
          <span className="font-mono text-xs text-muted-foreground">step 1 · choose</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {DEVICES.map((d, i) => {
            const Icon = d.icon;
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`group relative flex h-full flex-col rounded-2xl border p-5 transition-colors ${
                  d.enabled
                    ? "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
                    : "border-border bg-card/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      d.enabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon size={22} />
                  </span>
                  {d.enabled ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                      Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      <Lock size={10} /> Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{d.name}</h3>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <Row k="Measures" v={d.physical} />
                  <Row k="Sensor" v={d.sensor} />
                  <Row k="Link" v={d.wireless} />
                </dl>
                {d.enabled && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open lab
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </motion.div>
            );
            return d.enabled ? (
              <Link key={d.id} to={d.to} data-testid={`device-card-${d.id}`}>
                {inner}
              </Link>
            ) : (
              <div key={d.id} data-testid={`device-card-${d.id}`} aria-disabled>
                {inner}
              </div>
            );
          })}
        </div>
        <MedicalDisclaimer />
      </section>

      {/* Pipeline showcase */}
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-semibold">The telemetry pipeline</h2>
          <span className="font-mono text-xs text-muted-foreground">
            one animated diagram, reused in every lab
          </span>
        </div>
        <PipelineDiagram animate height={140} />
      </section>

      {/* Loop */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">The core loop</h2>
        <PedagogicalLoop />
      </section>
    </div>
  );
}

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex gap-2">
    <dt className="w-16 shrink-0 font-mono text-muted-foreground">{k}</dt>
    <dd className="text-foreground/90">{v}</dd>
  </div>
);
