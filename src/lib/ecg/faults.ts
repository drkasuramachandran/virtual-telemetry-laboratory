// Fault library for the fault-injection stage.
export interface FaultDef {
  id: string;
  name: string;
  symptom: string;
}

export const FAULTS: FaultDef[] = [
  { id: "noise_spike", name: "Noise spike", symptom: "Sudden high-amplitude spikes overwhelm the trace." },
  { id: "interference", name: "50/60 Hz interference", symptom: "A steady sinusoidal ripple rides on the baseline." },
  { id: "motion", name: "Motion artifact", symptom: "Large low-frequency swings distort the baseline during movement." },
  { id: "drift", name: "Sensor drift", symptom: "The baseline slowly wanders away from zero." },
  { id: "brownout", name: "Power brownout", symptom: "The signal clips/flattens as supply voltage sags." },
  { id: "packet_loss", name: "Packet-loss spike", symptom: "Gaps appear in the received stream; segments are missing." },
];

export const DIAGNOSIS_OPTIONS = FAULTS.map((f) => ({ value: f.id, label: f.name }));

export interface FixDef {
  value: string;
  label: string;
  tradeoff: string;
}

export const FIX_OPTIONS: FixDef[] = [
  { value: "notch", label: "Add / retune notch filter", tradeoff: "Removes powerline noise but a too-narrow notch can distort nearby ECG content." },
  { value: "shield", label: "Shield / re-reference electrodes", tradeoff: "Cuts interference and drift but adds cost, weight and setup complexity." },
  { value: "hp", label: "Raise high-pass cutoff", tradeoff: "Suppresses drift/motion wander but attenuates low-frequency ST/T information." },
  { value: "retransmit", label: "Add ACK / retransmission", tradeoff: "Improves delivery reliability but increases latency and radio energy." },
  { value: "regulator", label: "Add supply regulation / bigger cap", tradeoff: "Stops brownouts but increases size, cost and quiescent current." },
  { value: "buffer", label: "Buffer & re-order at gateway", tradeoff: "Hides loss/jitter but adds end-to-end latency." },
];

export function randomFault(): FaultDef {
  return FAULTS[Math.floor(Math.random() * FAULTS.length)];
}
