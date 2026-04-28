"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  description: string;
  color: string;
}

const STATS: Stat[] = [
  {
    value: 3.2,
    suffix: "h",
    label: "Saved per executive per day",
    description: "Reclaimed from inbox triage, follow-up chasing, and context-switching",
    color: "#7B68EE",
  },
  {
    value: 94,
    suffix: "%",
    label: "Fewer missed critical messages",
    description: "AI surfaces what demands action before it becomes a crisis",
    color: "#818CF8",
  },
  {
    value: 11,
    suffix: "x",
    label: "Faster response on high-stakes items",
    description: "Decision-makers act in minutes, not hours, on what truly matters",
    color: "#7B68EE",
  },
  {
    value: 500,
    suffix: "+",
    label: "Executive teams onboarded",
    description: "Trusted by CEOs, founders, and department heads across 40+ countries",
    color: "#818CF8",
  },
];

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const startTime = performance.now();
    const isDecimal = target % 1 !== 0;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return count;
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(stat.value, 1400 + index * 120, inView);
  const isDecimal = stat.value % 1 !== 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.2, 0.85, 0.45, 1] }}
      className="relative flex flex-col gap-4 p-8 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.025] hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors duration-300 overflow-hidden"
    >
      {/* Accent line top */}
      <div
        className="absolute top-0 left-8 right-8 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${stat.color}50, transparent)` }}
      />
      {/* Number */}
      <div className="flex items-end gap-1">
        <span className="text-5xl sm:text-6xl font-bold tabular-nums leading-none" style={{ color: stat.color }}>
          {isDecimal ? count.toFixed(1) : count}
        </span>
        <span className="text-3xl sm:text-4xl font-bold text-zinc-400 dark:text-zinc-500 pb-0.5">{stat.suffix}</span>
      </div>
      {/* Label */}
      <div>
        <p className="text-zinc-900 dark:text-white font-semibold text-lg leading-snug">{stat.label}</p>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1.5 leading-relaxed">{stat.description}</p>
      </div>
    </motion.div>
  );
}

export function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative bg-zinc-50 dark:bg-zinc-950 py-20 sm:py-28 px-4 sm:px-6 overflow-hidden transition-colors duration-300">
      <div className="landing-stats-glow absolute inset-0 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.2, 0.85, 0.45, 1] }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B68EE] mb-3">Measured Impact</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Real ROI for decision-makers
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
            Every metric is grounded in how leaders actually spend their time — and what changes
            when Nexaro removes the noise.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-8"
        >
          Based on aggregated usage data from Nexaro teams, Q1–Q4 2024
        </motion.p>
      </div>
    </section>
  );
}
