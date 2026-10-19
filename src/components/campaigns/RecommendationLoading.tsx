"use client";

import { useEffect, useState } from "react";

const WORKFLOW = [
  {
    title: "Explore local campaigns",
    detail: "Country coverage and active projects",
    icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10Z",
  },
  {
    title: "Connect hunger interests",
    detail: "Your interests, campaign issues and NGO focus",
    icon: "m12 21-8-8a5 5 0 0 1 8-6 5 5 0 0 1 8 6l-8 8Z",
  },
  {
    title: "Find meaningful matches",
    detail: "Relevant campaigns with reasons to support",
    icon: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L2.2 9.4l6.1-.9L12 3Z",
  },
];

export function RecommendationLoading({ countryName }: { countryName: string }) {
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHighlight((current) => (current + 1) % WORKFLOW.length);
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Finding campaign recommendations for ${countryName}`}
      className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-sky-500/10 p-4 shadow-lg shadow-emerald-950/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl bg-emerald-300/10 motion-safe:animate-ping"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative h-6 w-6 text-emerald-200"
          >
            <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Recommendation assistant
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Finding ways to help in {countryName}</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Illustrative matching workflow, not live AI reasoning. AI is used when available.
      </p>

      <ol aria-label="Matching workflow overview" className="mt-4 space-y-2">
        {WORKFLOW.map((step, index) => (
          <li
            key={step.title}
            className={`flex items-center gap-3 rounded-xl border p-2.5 motion-safe:transition-colors motion-safe:duration-700 ${
              index === highlight
                ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                : "border-white/5 bg-white/[0.02] text-slate-400"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0"
            >
              <path d={step.icon} />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{step.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{step.detail}</p>
            </div>
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                index === highlight ? "bg-emerald-300 motion-safe:animate-pulse" : "bg-slate-600"
              }`}
            />
          </li>
        ))}
      </ol>

      <div aria-hidden="true" className="mt-4 space-y-2 motion-safe:animate-pulse">
        {[0, 1].map((index) => (
          <div key={index} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="h-2 w-2/3 rounded bg-slate-700/60" />
            <div className="mt-2 h-2 w-full rounded bg-slate-800" />
            <div className="mt-2 h-2 w-1/2 rounded bg-slate-800" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        Waiting for recommendations. Results appear as soon as they are ready.
      </p>
    </div>
  );
}
