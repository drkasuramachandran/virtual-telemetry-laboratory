import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { EngineeringCoach } from "@/components/EngineeringCoach";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { QUIZ, gradeQuiz } from "@/lib/quiz";
import { evaluateFinal } from "@/lib/challenges";
import { SENSOR_SPECS, POWER_STRATEGIES, EDGE_OPTIONS } from "@/lib/deviceBuilder";
import { WIRELESS } from "@/lib/wireless";
import { recordScore, makeId } from "@/lib/storage";

const sel = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default function Assessment() {
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const graded = submitted ? gradeQuiz(answers) : null;

  const [sensor, setSensor] = React.useState("ecg");
  const [wireless, setWireless] = React.useState("ble");
  const [edge, setEdge] = React.useState("feature");
  const [power, setPower] = React.useState("balanced");
  const [fs, setFs] = React.useState(500);
  const [justify, setJustify] = React.useState("");
  const [finalResult, setFinalResult] = React.useState<ReturnType<typeof evaluateFinal> | null>(null);

  const submitQuiz = () => {
    setSubmitted(true);
    const g = gradeQuiz(answers);
    recordScore({ id: makeId(), labId: "assessment-quiz", percent: g.percent, grade: g.percent >= 60 ? "pass" : "review", createdAt: new Date().toISOString() });
  };

  const evaluateFinalDesign = () => {
    const r = evaluateFinal({ sensor, wireless, edge, power, fs, justify });
    setFinalResult(r);
    recordScore({ id: makeId(), labId: "assessment-final", percent: r.result.percent, grade: r.result.grade, createdAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6" data-testid="assessment-page">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to home
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><ClipboardCheck size={22} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Assessment</h1>
          <span className="font-mono text-xs text-muted-foreground">module quiz + final design challenge</span>
        </div>
      </div>

      {/* Quiz */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Module quiz</h2>
          {graded && <span className="font-mono text-sm text-primary" data-testid="quiz-score">{graded.correct}/{graded.total} · {graded.percent}%</span>}
        </div>
        <div className="space-y-3">
          {QUIZ.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-border bg-card/40 p-4" data-testid={`quiz-${q.id}`}>
              <div className="mb-2 flex items-start gap-2">
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{q.type}</span>
                <p className="text-sm font-medium">{qi + 1}. {q.prompt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o, oi) => {
                  const chosen = answers[q.id] === oi;
                  const correct = submitted && oi === q.answer;
                  const wrong = submitted && chosen && oi !== q.answer;
                  return (
                    <button key={oi} onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: oi }))} data-testid={`quiz-${q.id}-opt-${oi}`}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${correct ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : wrong ? "border-red-500 bg-red-500/15 text-red-400" : chosen ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  {answers[q.id] === q.answer ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={13} className="mt-0.5 shrink-0 text-red-400" />}
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
        {!submitted && <button onClick={submitQuiz} data-testid="quiz-submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Submit quiz</button>}
      </section>

      {/* Final design challenge */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Final: Virtual Telemetry Design Challenge</h2>
        <p className="text-sm text-muted-foreground">Design an end-to-end device. Scored on architecture, sensor, wireless, power, sampling, reliability, latency and justification using the shared scoring engine.</p>
        <MedicalDisclaimer />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
            <div><label className="mb-1 block text-sm text-muted-foreground">Sensor</label><select className={sel} value={sensor} onChange={(e) => setSensor(e.target.value)} data-testid="final-sensor">{SENSOR_SPECS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Wireless</label><select className={sel} value={wireless} onChange={(e) => setWireless(e.target.value)} data-testid="final-wireless">{WIRELESS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Processing</label><select className={sel} value={edge} onChange={(e) => setEdge(e.target.value)} data-testid="final-edge">{EDGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Power</label><select className={sel} value={power} onChange={(e) => setPower(e.target.value)} data-testid="final-power">{POWER_STRATEGIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Sampling frequency (Hz)</label><input type="number" className={sel} value={fs} onChange={(e) => setFs(Number(e.target.value))} data-testid="final-fs" /></div>
            <div><label className="mb-1 block text-sm text-muted-foreground">Justification</label><textarea className={`${sel} min-h-[70px]`} value={justify} onChange={(e) => setJustify(e.target.value)} data-testid="final-justify" placeholder="Explain your key trade-offs…" /></div>
            <button onClick={evaluateFinalDesign} data-testid="final-evaluate" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Submit design for scoring</button>
          </div>
          <div>
            {finalResult ? (
              <EngineeringCoach title="Final design assessment" notes={finalResult.notes} score={finalResult.result} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">Submit your design to receive a scored, reasoned assessment.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
