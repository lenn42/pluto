"use client";

import { useState } from "react";

type Emotion = "Joy" | "Sadness" | "Anger" | "Anxiety" | "Neutral";

type Result = {
  emotion: Emotion;
  score: number; // 0-100
  reason: string;
  rewrite: string;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// V0: simple local heuristic (placeholder for real AI)
function analyze(text: string): Result {
  const t = text.trim().toLowerCase();

  const lex: Record<Exclude<Emotion, "Neutral">, string[]> = {
    Joy: ["happy", "glad", "excited", "grateful", "love", "amazing", "great", "awesome"],
    Sadness: ["sad", "down", "hurt", "lonely", "cry", "miss", "regret", "disappointed"],
    Anger: ["angry", "mad", "furious", "annoyed", "hate", "unfair", "ridiculous"],
    Anxiety: ["anxious", "worried", "afraid", "scared", "panic", "stressed", "nervous"],
  };

  const counts: Record<Emotion, number> = {
    Joy: 0,
    Sadness: 0,
    Anger: 0,
    Anxiety: 0,
    Neutral: 0,
  };

  let reasonHits: string[] = [];

  for (const [emo, words] of Object.entries(lex) as [Exclude<Emotion, "Neutral">, string[]][]) {
    for (const w of words) {
      if (t.includes(w)) {
        counts[emo] += 1;
        reasonHits.push(`"${w}" → ${emo}`);
      }
    }
  }

  const exclam = (t.match(/!/g) || []).length;
  const qmark = (t.match(/\?/g) || []).length;

  // pick the top emotion
  let emotion: Emotion = "Neutral";
  let top = 0;
  (Object.keys(counts) as Emotion[]).forEach((e) => {
    if (e === "Neutral") return;
    if (counts[e] > top) {
      top = counts[e];
      emotion = e;
    }
  });

  if (top === 0) emotion = "Neutral";

  const score = clamp(top * 25 + exclam * 10 + qmark * 5, 0, 100);

  const reason =
    emotion === "Neutral"
      ? "No strong emotion keywords detected."
      : `Matched: ${reasonHits.slice(0, 4).join(", ")}${reasonHits.length > 4 ? "…" : ""}`;

  const rewriteByEmotion: Record<Emotion, string> = {
    Joy: "I feel really good about this. I wanted to share it with you and hear your thoughts.",
    Sadness: "I’m feeling down about this. I’d appreciate understanding and a chance to talk it through.",
    Anger: "I’m feeling frustrated. Can we focus on what happened and agree on a clear next step?",
    Anxiety: "I’m feeling anxious about this. Can we clarify the situation and decide on a small first step?",
    Neutral: "I want to express this clearly: what I care about is ___, and what I hope happens next is ___.",
  };

  return {
    emotion,
    score,
    reason,
    rewrite: rewriteByEmotion[emotion],
  };
}

function badgeClass(e: Emotion) {
  switch (e) {
    case "Joy":
      return "border-green-500/40 text-green-300 bg-green-500/10";
    case "Sadness":
      return "border-blue-500/40 text-blue-300 bg-blue-500/10";
    case "Anger":
      return "border-red-500/40 text-red-300 bg-red-500/10";
    case "Anxiety":
      return "border-yellow-500/40 text-yellow-300 bg-yellow-500/10";
    default:
      return "border-zinc-500/40 text-zinc-200 bg-zinc-500/10";
  }
}

export default function Page() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const canAnalyze = text.trim().length >= 3 && !busy;

  async function onAnalyze() {
    setBusy(true);
    try {
      // simulate model latency (replace with real API later)
      await new Promise((r) => setTimeout(r, 150));
      setResult(analyze(text));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Emotion Analyzer</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Simple V0 (local rules). Next step: replace with a real AI model via an API route.
        </p>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <label className="text-sm text-zinc-300">Paste text</label>
          <textarea
            className="mt-2 h-32 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm outline-none focus:border-zinc-600"
            placeholder='Example: "I’m really stressed about tomorrow. I can’t stop worrying."'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
            >
              {busy ? "Analyzing…" : "Analyze"}
            </button>

            <button
              onClick={() => {
                setText("");
                setResult(null);
              }}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800/40"
            >
              Reset
            </button>

            <div className="ml-auto text-xs text-zinc-500">{text.trim().length} chars</div>
          </div>
        </div>

        {result && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass(result.emotion)}`}>
                  {result.emotion}
                </span>
                <div className="text-sm text-zinc-300">
                  Score: <span className="font-semibold text-zinc-100">{result.score}</span>/100
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-300">{result.reason}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="text-sm font-medium">Healthier rewrite</div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{result.rewrite}</p>
              <button
                className="mt-3 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800/40"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.rewrite);
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}