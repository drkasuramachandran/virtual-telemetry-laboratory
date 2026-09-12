import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Thermometer,
  SlidersHorizontal,
  Binary,
  Cpu,
  Wifi,
  Router,
  Cloud,
  LayoutDashboard,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  StageId,
  StageStateMap,
  StageStatus,
} from "@/lib/pipeline";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  activity: Activity,
  thermometer: Thermometer,
  sliders: SlidersHorizontal,
  binary: Binary,
  cpu: Cpu,
  wifi: Wifi,
  router: Router,
  cloud: Cloud,
  "layout-dashboard": LayoutDashboard,
};

const NODE_W = 96;
const NODE_H = 72;
const GAP = 56;
const PAD = 24;
const STEP = NODE_W + GAP;
const N = PIPELINE_STAGES.length;
const WIDTH = PAD * 2 + N * NODE_W + (N - 1) * GAP;
const HEIGHT = 150;
const CY = HEIGHT / 2;

function nodeX(i: number): number {
  return PAD + i * STEP;
}

const STATUS_STYLES: Record<
  StageStatus,
  { fill: string; stroke: string; text: string; glow: string }
> = {
  idle: {
    fill: "hsl(var(--secondary))",
    stroke: "hsl(var(--border))",
    text: "hsl(var(--muted-foreground))",
    glow: "transparent",
  },
  active: {
    fill: "hsl(168 60% 14%)",
    stroke: "hsl(168 76% 46%)",
    text: "hsl(168 72% 74%)",
    glow: "hsl(168 76% 46%)",
  },
  done: {
    fill: "hsl(168 40% 12%)",
    stroke: "hsl(168 55% 40%)",
    text: "hsl(168 50% 70%)",
    glow: "transparent",
  },
  error: {
    fill: "hsl(0 55% 16%)",
    stroke: "hsl(0 72% 56%)",
    text: "hsl(0 82% 80%)",
    glow: "hsl(0 72% 56%)",
  },
};

export interface PipelineDiagramProps {
  /** Per-stage status map. */
  states?: StageStateMap;
  /** Single active stage (merged over states as "active"). */
  activeStage?: StageId | null;
  /** Continuous packet flow along every connector (overview mode). */
  animate?: boolean;
  /** A single labeled packet travelling end-to-end (device-sim mode). */
  packetInTransit?: boolean;
  /** Value label riding on the in-transit packet (e.g. "72 bpm"). */
  flowValue?: string | number | null;
  onStageClick?: (id: StageId) => void;
  height?: number;
}

export const PipelineDiagram: React.FC<PipelineDiagramProps> = ({
  states = {},
  activeStage = null,
  animate = false,
  packetInTransit = false,
  flowValue = null,
  onStageClick,
  height = HEIGHT,
}) => {
  const scale = height / HEIGHT;
  const merged: StageStateMap = activeStage
    ? { ...states, [activeStage]: "active" }
    : states;

  const startX = nodeX(0) + NODE_W / 2;
  const endX = nodeX(N - 1) + NODE_W / 2;

  return (
    <div className="pipeline-scroll w-full overflow-x-auto" data-testid="pipeline-diagram">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH * scale}
        height={height}
        role="img"
        aria-label="Telemetry signal pipeline"
        style={{ maxWidth: "none" }}
      >
        <defs>
          <marker id="pl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--muted-foreground))" opacity="0.6" />
          </marker>
        </defs>

        {/* Connectors */}
        {PIPELINE_STAGES.slice(0, -1).map((_, i) => (
          <line
            key={`c-${i}`}
            x1={nodeX(i) + NODE_W}
            y1={CY}
            x2={nodeX(i + 1) - 3}
            y2={CY}
            stroke="hsl(var(--border))"
            strokeWidth={2}
            markerEnd="url(#pl-arrow)"
          />
        ))}

        {/* Continuous flow packets */}
        {animate &&
          PIPELINE_STAGES.slice(0, -1).map((_, i) => {
            const x1 = nodeX(i) + NODE_W;
            const x2 = nodeX(i + 1);
            return (
              <motion.circle
                key={`p-${i}`}
                r={4}
                cy={CY}
                fill="hsl(168 90% 62%)"
                initial={{ cx: x1, opacity: 0 }}
                animate={{ cx: [x1, x2], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: i * 0.18 }}
              />
            );
          })}

        {/* Nodes */}
        {PIPELINE_STAGES.map((stage, i) => {
          const status = merged[stage.id] ?? "idle";
          const s = STATUS_STYLES[status];
          const x = nodeX(i);
          const Icon = ICONS[stage.iconKey];
          return (
            <g
              key={stage.id}
              transform={`translate(${x}, ${CY - NODE_H / 2})`}
              onClick={onStageClick ? () => onStageClick(stage.id) : undefined}
              style={{ cursor: onStageClick ? "pointer" : "default" }}
              data-testid={`pipeline-node-${stage.id}`}
            >
              {s.glow !== "transparent" && (
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill="none"
                  stroke={s.glow}
                  strokeWidth={2}
                  opacity={0.5}
                  style={{ filter: `drop-shadow(0 0 8px ${s.glow})` }}
                />
              )}
              <rect width={NODE_W} height={NODE_H} rx={12} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
              <foreignObject x={0} y={0} width={NODE_W} height={NODE_H}>
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "4px 6px",
                    color: s.text,
                    textAlign: "center",
                  }}
                >
                  {Icon && <Icon size={20} />}
                  <span style={{ fontSize: 10, lineHeight: 1.15, fontWeight: 600, letterSpacing: 0.2 }}>
                    {stage.short}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Single labeled packet travelling end-to-end */}
        {packetInTransit && (
          <motion.g
            initial={{ x: startX, opacity: 0 }}
            animate={{ x: [startX, endX], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle r={6} cy={CY} fill="hsl(168 90% 62%)" style={{ filter: "drop-shadow(0 0 6px hsl(168 90% 55%))" }} />
            {flowValue != null && (
              <g transform={`translate(0, ${CY - 22})`}>
                <rect x={-26} y={-11} width={52} height={18} rx={9} fill="hsl(168 76% 42%)" />
                <text x={0} y={2} textAnchor="middle" fontSize={9} fontWeight={700} fill="#04201a">
                  {String(flowValue)}
                </text>
              </g>
            )}
          </motion.g>
        )}
      </svg>
    </div>
  );
};
