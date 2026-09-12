import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban, Trash2, PlayCircle, Save } from "lucide-react";
import { WhyPanel } from "@/components/WhyPanel";
import { BlockDiagramEditor } from "@/components/BlockDiagramEditor";
import { SENSOR_SPECS, POWER_STRATEGIES, EDGE_OPTIONS, computeTradeoffs, sensorSpec } from "@/lib/deviceBuilder";
import { WIRELESS } from "@/lib/wireless";
import { StageId } from "@/lib/pipeline";
import { listProjects, saveProject, deleteProject, bestScore, makeId, Project } from "@/lib/storage";

const sel = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

const BARS: { key: "power" | "range" | "dataRate" | "latency" | "reliability" | "cost" | "battery"; label: string; value: (t: any) => string }[] = [
  { key: "power", label: "Power", value: (t) => `${t.avgCurrentMa} mA` },
  { key: "range", label: "Range", value: (t) => (t.rangeM >= 1000 ? `${t.rangeM / 1000} km` : `${t.rangeM} m`) },
  { key: "dataRate", label: "Data rate", value: (t) => `${t.effKbps.toFixed(2)} kbps` },
  { key: "latency", label: "Latency", value: (t) => `${t.latencyMs} ms` },
  { key: "reliability", label: "Reliability", value: (t) => `${t.reliability}/5` },
  { key: "cost", label: "Cost", value: (t) => "$".repeat(t.cost) },
  { key: "battery", label: "Battery life", value: (t) => `~${t.batteryDays} d` },
];

export default function StudentProjectMode() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("My Telemetry Device");
  const [sensor, setSensor] = React.useState("ecg");
  const [wireless, setWireless] = React.useState("ble");
  const [edge, setEdge] = React.useState("feature");
  const [power, setPower] = React.useState("balanced");
  const [diagram, setDiagram] = React.useState<StageId[]>([]);
  const [projects, setProjects] = React.useState<Project[]>(() => listProjects().filter((p) => p.labId.startsWith("custom-")));

  const to = computeTradeoffs(sensor, wireless, edge, power);

  const buildData = (labId: string) => ({
    q_project_lab: labId,
    q_sensor_type: sensor,
    q_wireless: wireless,
    q_edge: edge,
    q_power_strategy: power,
    q_bandwidth: sensorSpec(sensor).bandwidth,
    q_fs: Math.max(2, Math.ceil(sensorSpec(sensor).bandwidth * 2.5)),
    diagram,
    projectName: name,
  });

  const persist = (): string => {
    const existing = projects.find((p) => (p.data as any).projectName === name);
    const labId = existing?.labId ?? `custom-${makeId()}`;
    const project: Project = { id: existing?.id ?? makeId(), labId, title: name, createdAt: existing?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), data: buildData(labId) };
    saveProject(project);
    setProjects(listProjects().filter((p) => p.labId.startsWith("custom-")));
    return labId;
  };

  const startDesign = () => {
    const labId = persist();
    navigate(`/projects/design/${labId}`);
  };

  const removeProject = (id: string) => {
    deleteProject(id);
    setProjects(listProjects().filter((p) => p.labId.startsWith("custom-")));
  };

  return (
    <div className="space-y-6" data-testid="student-project-mode">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><FolderKanban size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Build Your Own Telemetry Device</h1>
          <span className="font-mono text-xs text-muted-foreground">assemble · see trade-offs · run the guided design</span>
        </div>
      </div>

      <WhyPanel title="the same engineering loop, your device" body="Pick a sensor, radio, processing and power strategy. The app assembles the pipeline and routes you through the same guided Stage Wizard — Choose, Predict, Simulate, Diagnose, Redesign, Justify — used for the reference devices." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Builder */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">1 · Configure</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Project name</label>
                <input className={sel} value={name} onChange={(e) => setName(e.target.value)} data-testid="project-name" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Sensor</label>
                <select className={sel} value={sensor} onChange={(e) => setSensor(e.target.value)} data-testid="builder-sensor">
                  {SENSOR_SPECS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Wireless</label>
                <select className={sel} value={wireless} onChange={(e) => setWireless(e.target.value)} data-testid="builder-wireless">
                  {WIRELESS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Processing strategy</label>
                <select className={sel} value={edge} onChange={(e) => setEdge(e.target.value)} data-testid="builder-edge">
                  {EDGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Power strategy</label>
                <select className={sel} value={power} onChange={(e) => setPower(e.target.value)} data-testid="builder-power">
                  {POWER_STRATEGIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={persist} data-testid="save-project" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"><Save size={14} /> Save</button>
              <button onClick={startDesign} data-testid="start-design" className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><PlayCircle size={15} /> Start guided design</button>
            </div>
          </div>
        </div>

        {/* Trade-off dashboard */}
        <div className="rounded-xl border border-border bg-card/40 p-4" data-testid="tradeoff-dashboard">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">2 · Live engineering trade-offs</p>
          <div className="space-y-2.5">
            {BARS.map((b) => (
              <div key={b.key} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary/70 transition-all duration-300" style={{ width: `${to.bars[b.key] * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right font-mono text-foreground">{b.value(to)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Raw data rate {to.rawKbps.toFixed(2)} kbps → effective {to.effKbps.toFixed(2)} kbps after processing.</p>
        </div>
      </div>

      {/* Block diagram editor */}
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">3 · Block diagram — assemble the pipeline</p>
        <BlockDiagramEditor value={diagram} onChange={setDiagram} />
      </div>

      {/* Saved projects */}
      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">My projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved projects yet — configure a device and press Save or Start guided design.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((p) => {
              const best = bestScore(p.labId);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3" data-testid={`saved-project-${p.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{(p.data as any).q_sensor_type} · {(p.data as any).q_wireless} · {best ? `best ${best.percent}%` : "not scored"}</p>
                  </div>
                  <button onClick={() => navigate(`/projects/design/${p.labId}`)} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary" data-testid={`open-project-${p.id}`}>Open</button>
                  <button onClick={() => removeProject(p.id)} className="rounded-md border border-border px-2 py-1.5 text-xs text-red-400 hover:bg-secondary" data-testid={`delete-project-${p.id}`}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
