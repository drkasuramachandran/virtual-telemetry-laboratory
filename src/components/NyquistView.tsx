import React from "react";
import { Waveform, WaveformLegend } from "@/components/Waveform";
import { aliasFrequency } from "@/lib/dsp";

const C_TRUE = "hsl(199 89% 60%)";
const C_SAMP = "hsl(38 92% 58%)";

/** Reusable visual Nyquist / aliasing explainer (shared across labs). */
export const NyquistView: React.FC<{ bandwidth: number; fs: number }> = ({ bandwidth, fs }) => {
  const f = Math.min(bandwidth, 60);
  const dur = 0.15;
  const hi = 3000;
  const cont: number[] = [];
  for (let i = 0; i < dur * hi; i++) cont.push(Math.sin(2 * Math.PI * f * (i / hi)));
  const sampN = Math.max(2, Math.floor(dur * fs));
  const samp: number[] = [];
  for (let i = 0; i < sampN; i++) samp.push(Math.sin(2 * Math.PI * f * (i / fs)));
  const alias = aliasFrequency(f, fs);
  const violated = fs < 2 * bandwidth;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3" data-testid="nyquist-view">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Nyquist check</p>
        <span className={`font-mono text-xs ${violated ? "text-red-400" : "text-emerald-400"}`}>
          Nyquist = {fs / 2} Hz vs bandwidth {bandwidth} Hz — {violated ? "VIOLATED" : "OK"}
        </span>
      </div>
      <Waveform series={[{ data: cont, color: C_TRUE, width: 1.2 }, { data: samp, color: C_SAMP, width: 1.4, dots: true }]} height={130} yMin={-1.2} yMax={1.2} />
      <WaveformLegend items={[{ color: C_TRUE, label: `True ${f} Hz component` }, { color: C_SAMP, label: `Samples at ${fs} Hz` }]} />
      <p className="mt-2 text-xs text-muted-foreground">
        {violated
          ? `Sampling below 2× the bandwidth: the ${f} Hz component folds back and appears as a false ~${alias.toFixed(0)} Hz alias that cannot be removed later. Raise the sampling frequency above ${2 * bandwidth} Hz.`
          : `Sampling above 2× the bandwidth — the signal reconstructs faithfully with no aliasing.`}
      </p>
    </div>
  );
};
