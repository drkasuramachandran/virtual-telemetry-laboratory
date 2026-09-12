import React from "react";

export interface Series {
  data: number[];
  color: string;
  label?: string;
  dashed?: boolean;
  dots?: boolean;
  width?: number;
}

export interface WaveformProps {
  series: Series[];
  height?: number;
  yMin?: number;
  yMax?: number;
  grid?: boolean;
  maxPoints?: number;
}

function downsample(data: number[], maxPoints: number): number[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(data[Math.floor(i * step)]);
  return out;
}

export const Waveform: React.FC<WaveformProps> = ({
  series,
  height = 150,
  yMin,
  yMax,
  grid = true,
  maxPoints = 600,
}) => {
  const W = 1000;
  const H = height;
  const pad = 6;

  const reduced = series.map((s) => ({ ...s, data: downsample(s.data, maxPoints) }));
  const all = reduced.flatMap((s) => s.data);
  let lo = yMin ?? (all.length ? Math.min(...all) : -1);
  let hi = yMax ?? (all.length ? Math.max(...all) : 1);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const range = hi - lo;

  const toPath = (data: number[]) => {
    const n = data.length;
    if (n === 0) return "";
    return data
      .map((v, i) => {
        const x = pad + (i / (n - 1)) * (W - 2 * pad);
        const y = pad + (1 - (v - lo) / range) * (H - 2 * pad);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const zeroY = pad + (1 - (0 - lo) / range) * (H - 2 * pad);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" data-testid="waveform">
      <rect x={0} y={0} width={W} height={H} rx={8} fill="hsl(var(--background))" opacity={0.5} />
      {grid && (
        <>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={f * H} y2={f * H} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />
          ))}
          {lo < 0 && hi > 0 && (
            <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.6} />
          )}
        </>
      )}
      {reduced.map((s, i) => (
        <path
          key={i}
          d={toPath(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width ?? 1.5}
          strokeDasharray={s.dashed ? "5 4" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {reduced.map((s, si) =>
        s.dots
          ? s.data.map((v, i) => {
              const x = pad + (i / (s.data.length - 1)) * (W - 2 * pad);
              const y = pad + (1 - (v - lo) / range) * (H - 2 * pad);
              return <circle key={`${si}-${i}`} cx={x} cy={y} r={2.5} fill={s.color} />;
            })
          : null,
      )}
    </svg>
  );
};

export const WaveformLegend: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
  <div className="mt-2 flex flex-wrap gap-3">
    {items.map((it) => (
      <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-4 rounded" style={{ background: it.color }} />
        {it.label}
      </span>
    ))}
  </div>
);
