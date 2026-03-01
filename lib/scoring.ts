// lib/scoring.ts
export type EntryCategory =
  | "Physical"
  | "Social"
  | "Focus"
  | "EmotionRegulation"
  | "Avoidance"
  | "Impulse"
  | "Sleep"
  | "Other";

export type Entry = {
  id: string;
  text: string;
  createdAt: string; // ISO string
  // optional: you can later have AI fill these
  category?: EntryCategory;
  value?: number; // [-5..+10]
};

export type ScoredEntry = Entry & {
  category: EntryCategory;
  value: number; // [-5..+10]
};

export type DayScore = {
  date: string; // YYYY-MM-DD (local)
  entries: ScoredEntry[];
  positiveSum: number; // p
  negativeSum: number; // n (absolute)
  rawScore: number; // 0..100 (sigmoid)
  smoothedScore: number; // 0..100 (EMA)
};

export type ScoreConfig = {
  lambda: number; // loss aversion > 1
  scale: number; // scaling factor c
  emaAlpha: number; // 0..1, e.g. 0.3
};

export const DEFAULT_CONFIG: ScoreConfig = {
  lambda: 1.8,
  scale: 6,
  emaAlpha: 0.3,
};

// ---------- Math core ----------
export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Core function you can ship:
 * - values per entry in [-5..+10]
 * - p = sum of positives
 * - n = sum of absolute negatives
 * - z = (p - lambda*n) / scale
 * - score = 100 * sigmoid(z)
 */
export function scoreDayFromValues(
  values: number[],
  config: ScoreConfig = DEFAULT_CONFIG
) {
  const p = values.reduce((acc, v) => acc + Math.max(0, v), 0);
  const n = values.reduce((acc, v) => acc + Math.max(0, -v), 0);

  const z = (p - config.lambda * n) / config.scale;
  const raw = 100 * sigmoid(z);

  return {
    positiveSum: p,
    negativeSum: n,
    rawScore: clamp(raw),
  };
}

/**
 * EMA smoothing: S_t = a*s_t + (1-a)*S_{t-1}
 */
export function emaScore(
  todayRaw: number,
  yesterdaySmoothed: number | null,
  config: ScoreConfig = DEFAULT_CONFIG
) {
  if (yesterdaySmoothed == null) return clamp(todayRaw);
  const a = config.emaAlpha;
  return clamp(a * todayRaw + (1 - a) * yesterdaySmoothed);
}

// ---------- Minimal local scoring (placeholder for AI) ----------
/**
 * V0: simple heuristic to assign (category, value) from text.
 * Replace this later with AI extraction.
 */
export function scoreEntryLocal(text: string): { category: EntryCategory; value: number } {
  const t = text.trim().toLowerCase();

  const hit = (words: string[]) => words.some((w) => t.includes(w));

  // POSITIVE
  if (hit(["walk", "run", "gym", "workout", "yoga", "stretch", "exercise"])) return { category: "Physical", value: 4 };
  if (hit(["cook", "healthy", "salad", "water", "hydrated"])) return { category: "Physical", value: 2 };
  if (hit(["called", "meet", "met", "friend", "family", "talked"])) return { category: "Social", value: 3 };
  if (hit(["focused", "deep work", "finish", "completed", "shipped"])) return { category: "Focus", value: 4 };
  if (hit(["journal", "meditate", "meditation", "breath", "therapy"])) return { category: "EmotionRegulation", value: 3 };
  if (hit(["slept early", "sleep early", "8 hours", "good sleep"])) return { category: "Sleep", value: 4 };

  // NEGATIVE
  if (hit(["doomscroll", "scrolling", "tiktok", "instagram for hours"])) return { category: "Avoidance", value: -3 };
  if (hit(["stayed up", "3am", "4am", "no sleep", "insomnia"])) return { category: "Sleep", value: -4 };
  if (hit(["drank", "alcohol", "hangover"])) return { category: "Impulse", value: -3 };
  if (hit(["argued", "fight", "shouted", "rage"])) return { category: "Impulse", value: -4 };
  if (hit(["avoided", "procrastinated", "skipped"])) return { category: "Avoidance", value: -2 };

  return { category: "Other", value: 0 };
}

// ---------- Date helpers ----------
export function toLocalDateKey(iso: string) {
  // YYYY-MM-DD in local time
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
