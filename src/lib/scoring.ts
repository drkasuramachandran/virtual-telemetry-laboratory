// Reusable scoring engine — ONE engine for every lab, not three.
// A device defines a Rubric (weighted criteria). Each criterion evaluates the
// student's design/measurement context and returns a 0..1 ratio + an optional note.

export interface RubricCriterion<Ctx> {
  id: string;
  label: string;
  weight: number;
  /** Return a ratio in [0,1]. Optionally a note shown in the breakdown. */
  evaluate: (ctx: Ctx) => { ratio: number; note?: string };
}

export type Rubric<Ctx> = RubricCriterion<Ctx>[];

export interface ScoreLine {
  id: string;
  label: string;
  weight: number;
  ratio: number;
  points: number;
  maxPoints: number;
  note?: string;
}

export interface ScoreResult {
  points: number;
  maxPoints: number;
  percent: number;
  grade: string;
  breakdown: ScoreLine[];
}

export function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

export function runRubric<Ctx>(rubric: Rubric<Ctx>, ctx: Ctx): ScoreResult {
  const breakdown: ScoreLine[] = rubric.map((c) => {
    const { ratio, note } = c.evaluate(ctx);
    const clamped = Math.max(0, Math.min(1, ratio));
    return {
      id: c.id,
      label: c.label,
      weight: c.weight,
      ratio: clamped,
      points: +(clamped * c.weight).toFixed(2),
      maxPoints: c.weight,
      note,
    };
  });

  const maxPoints = breakdown.reduce((a, b) => a + b.maxPoints, 0);
  const points = +breakdown.reduce((a, b) => a + b.points, 0).toFixed(2);
  const percent = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;

  return { points, maxPoints, percent, grade: letterGrade(percent), breakdown };
}
