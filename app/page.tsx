"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  type Entry,
  type ScoredEntry,
  scoreEntryLocal,
  scoreDayFromValues,
  toLocalDateKey,
} from "@/lib/scoring";
import Link from "next/link";

const STORAGE_KEY = "vibelog_entries_v1";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: Entry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function Page() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const todayKey = useMemo(() => toLocalDateKey(new Date().toISOString()), []);
  const todayEntries = useMemo(
    () => entries.filter((e) => toLocalDateKey(e.createdAt) === todayKey),
    [entries, todayKey]
  );

  const scoredToday: ScoredEntry[] = useMemo(() => {
    return todayEntries.map((e) => {
      const scored = scoreEntryLocal(e.text);
      return {
        ...e,
        category: e.category ?? scored.category,
        value: typeof e.value === "number" ? e.value : scored.value,
      };
    });
  }, [todayEntries]);

  const todayScore = useMemo(() => {
    const values = scoredToday.map((e) => e.value);
    return scoreDayFromValues(values, DEFAULT_CONFIG);
  }, [scoredToday]);

  function addEntry() {
    const t = text.trim();
    if (t.length < 2) return;

    const now = new Date().toISOString();
    const base: Entry = {
      id: uid(),
      text: t,
      createdAt: now,
    };

    // local scoring now (replace with AI later)
    const { category, value } = scoreEntryLocal(t);
    const withScore: Entry = { ...base, category, value };

    const next = [withScore, ...entries];
    setEntries(next);
    saveEntries(next);
    setText("");
  }

  function removeEntry(id: string) {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(next);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <header className="mb-8 flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vibe Log</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Log small things you did. The app scores your day (V0 local rules).
            </p>
          </div>
          <div className="ml-auto">
            <Link
              href="/report"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800/40"
            >
              View report →
            </Link>
          </div>
        </header>

        {/* Input */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <label className="text-sm text-zinc-300">Add a note</label>
          <textarea
            className="mt-2 h-28 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm outline-none focus:border-zinc-600"
            placeholder='Example: "Went for a 20 min walk" / "Stayed up until 3am scrolling"'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={addEntry}
              disabled={text.trim().length < 2}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
            >
              Add
            </button>
            <div className="ml-auto text-xs text-zinc-500">{text.trim().length} chars</div>
          </div>
        </section>

        {/* Today summary */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Today</div>
            <div className="text-xs text-zinc-500">{todayKey}</div>
          </div>

          <div className="mt-3 text-sm text-zinc-300">
            <span className="text-zinc-100 font-semibold">{todayScore.rawScore.toFixed(0)}</span>/100 raw score ·{" "}
            +{todayScore.positiveSum.toFixed(1)} / -{todayScore.negativeSum.toFixed(1)} (loss aversion λ={DEFAULT_CONFIG.lambda})
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            Formula: score = 100 · sigmoid((p - λ·n)/scale), p=sum(positives), n=sum(abs(negatives))
          </p>
        </section>

        {/* Entries */}
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Today’s notes</div>
            <div className="text-xs text-zinc-500">{scoredToday.length} items</div>
          </div>

          <div className="space-y-3">
            {scoredToday.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-400">
                No notes yet. Add one above.
              </div>
            )}

            {scoredToday.map((e) => (
              <div key={e.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100">{e.text}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {e.category} · {e.value >= 0 ? `+${e.value}` : e.value} ·{" "}
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-xs hover:bg-zinc-800/40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 text-xs text-zinc-500">
          Next step: replace <code>scoreEntryLocal()</code> with an AI API route that returns{" "}
          <code>{`{category, value}`}</code> per note.
        </footer>
      </div>
    </main>
  );
}