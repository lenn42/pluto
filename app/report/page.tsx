"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  type Entry,
  type ScoredEntry,
  scoreDayFromValues,
  scoreEntryLocal,
  emaScore,
  toLocalDateKey,
} from "@/lib/scoring";

const STORAGE_KEY = "vibelog_entries_v1";

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

function lastNDaysKeys(n: number) {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(dd.toISOString()));
  }
  return keys;
}

export default function ReportPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const days = useMemo(() => {
    const keys = lastNDaysKeys(7).reverse(); // oldest -> newest

    let prevSmoothed: number | null = null;

    return keys.map((dateKey) => {
      const dayEntries = entries
        .filter((e) => toLocalDateKey(e.createdAt) === dateKey)
        .map((e) => {
          const scored = scoreEntryLocal(e.text);
          const se: ScoredEntry = {
            ...e,
            category: e.category ?? scored.category,
            value: typeof e.value === "number" ? e.value : scored.value,
          };
          return se;
        });

      const values = dayEntries.map((e) => e.value);
      const base = scoreDayFromValues(values, DEFAULT_CONFIG);
      const smoothed = emaScore(base.rawScore, prevSmoothed, DEFAULT_CONFIG);
      prevSmoothed = smoothed;

      return {
        dateKey,
        entries: dayEntries,
        ...base,
        smoothedScore: smoothed,
      };
    });
  }, [entries]);

  const totals = useMemo(() => {
    const avgRaw =
      days.reduce((acc, d) => acc + d.rawScore, 0) / (days.length || 1);
    const avgSmooth =
      days.reduce((acc, d) => acc + d.smoothedScore, 0) / (days.length || 1);
    return { avgRaw, avgSmooth };
  }, [days]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <header className="mb-8 flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
            <p className="mt-2 text-sm text-zinc-400">
              7-day trend with EMA smoothing (α={DEFAULT_CONFIG.emaAlpha}).
            </p>
          </div>
          <div className="ml-auto">
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800/40"
            >
              ← Back
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="text-sm text-zinc-300">
            Average raw: <span className="font-semibold text-zinc-100">{totals.avgRaw.toFixed(0)}</span>/100 ·
            Average smoothed:{" "}
            <span className="font-semibold text-zinc-100">{totals.avgSmooth.toFixed(0)}</span>/100
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Smoothing: Sₜ = α·scoreₜ + (1-α)·Sₜ₋₁
          </p>
        </section>

        <section className="mt-6 space-y-3">
          {days.map((d) => (
            <div key={d.dateKey} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{d.dateKey}</div>
                <div className="text-sm text-zinc-300">
                  Raw <span className="font-semibold text-zinc-100">{d.rawScore.toFixed(0)}</span> · Smoothed{" "}
                  <span className="font-semibold text-zinc-100">{d.smoothedScore.toFixed(0)}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                +{d.positiveSum.toFixed(1)} / -{d.negativeSum.toFixed(1)} (λ={DEFAULT_CONFIG.lambda}, scale={DEFAULT_CONFIG.scale})
                · {d.entries.length} notes
              </div>

              {d.entries.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300">
                  {d.entries.slice(0, 6).map((e) => (
                    <li key={e.id}>
                      {e.text}{" "}
                      <span className="text-zinc-500">
                        ({e.category}, {e.value >= 0 ? `+${e.value}` : e.value})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {d.entries.length === 0 && <div className="mt-3 text-sm text-zinc-400">No notes.</div>}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}