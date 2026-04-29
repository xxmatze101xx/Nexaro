"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PlugZap, Brain, Zap, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: PlugZap,
    title: "Connect your stack in 90 seconds",
    description:
      "Link Gmail, Slack, Teams, Outlook, your calendar, HubSpot, Salesforce and more — no IT ticket required. OAuth-based, read-only where possible, enterprise-grade encryption throughout.",
    tags: ["15+ integrations", "90-sec setup", "Zero IT"],
    color: "#0EA5E9",
    glow: "rgba(14,165,233,0.15)",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI learns what matters to you",
    description:
      "Nexaro's AI models your communication patterns, your VIP contacts, your active decisions and deadlines. Within 24 hours, it knows your signal from your noise.",
    tags: ["Personalized scoring", "Decision tracking", "Context-aware"],
    color: "#38BDF8",
    glow: "rgba(56,189,248,0.15)",
  },
  {
    number: "03",
    icon: Zap,
    title: "Lead, decide, act — in minutes",
    description:
      "Open your executive dashboard, read your AI briefing, action the 3–5 messages that matter, and close the tab. Nexaro handles the rest.",
    tags: ["Daily briefings", "AI drafts", "Decision logs"],
    color: "#7DD3FC",
    glow: "rgba(125,211,252,0.15)",
  },
];

const STATS = [
  {
    value: "<10 min",
    label: "Time to first insight",
    sub: "From signup to your first AI briefing",
  },
  {
    value: "Zero",
    label: "Engineering required",
    sub: "Self-serve, OAuth-based, no IT ticket",
  },
  {
    value: "24 hrs",
    label: "To full personalization",
    sub: "AI learns your signal from noise",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative py-24 sm:py-32 px-4 sm:px-6 bg-white dark:bg-zinc-950 overflow-hidden transition-colors duration-300"
    >
      {/* Edge lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-sky-500/[0.04] blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* ── Header ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.2, 0.85, 0.45, 1] }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/[0.07] px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              How It Works
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.08]">
            Up and running{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
              }}
            >
              in under 10 minutes
            </span>
          </h2>

          <p className="mt-5 text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            No onboarding call. No configuration spreadsheet. Just connect, let the AI learn, and
            take back your time.
          </p>
        </motion.div>

        {/* ── Steps ──────────────────────────────── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
          {/* Animated connector (desktop) */}
          <div className="hidden lg:block absolute top-[2.6rem] left-[calc(33.33%_-_0px)] right-[calc(33.33%_-_0px)] h-px z-0 pointer-events-none">
            <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800" />
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, #0EA5E9, #38BDF8)",
                transformOrigin: "left center",
              }}
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.1, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 36 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: 0.1 + i * 0.15,
                ease: [0.2, 0.85, 0.45, 1],
              }}
              className="relative z-10 flex flex-col group"
            >
              {/* Step circle */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(145deg, ${step.color}22, ${step.color}40)`,
                    border: `1.5px solid ${step.color}40`,
                    boxShadow: `0 4px 20px ${step.color}25`,
                  }}
                >
                  <step.icon className="w-[18px] h-[18px]" style={{ color: step.color }} />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-[0.15em]"
                  style={{ color: step.color }}
                >
                  Step {step.number}
                </span>
              </div>

              {/* Card */}
              <div
                className="relative flex-1 flex flex-col p-7 rounded-2xl border overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
                style={{
                  borderColor: `${step.color}18`,
                  background: "transparent",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {/* Card background */}
                <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl" />

                {/* Hover glow overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${step.glow}, transparent 65%)`,
                  }}
                />

                {/* Watermark */}
                <div
                  className="absolute -bottom-2 -right-1 text-[7rem] font-black leading-none select-none pointer-events-none"
                  style={{ color: `${step.color}07` }}
                >
                  {step.number}
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                    {step.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{
                          background: `${step.color}0f`,
                          color: step.color,
                          border: `1px solid ${step.color}20`,
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Stats bar ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="relative rounded-2xl border border-zinc-100 dark:border-white/[0.06] overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-900/70 dark:via-zinc-900/50 dark:to-zinc-900/70" />
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,165,233,0.05) 0%, transparent 50%, rgba(56,189,248,0.05) 100%)",
            }}
          />

          <div className="relative grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-white/[0.05]">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center px-8 py-7"
              >
                <span
                  className="text-3xl sm:text-4xl font-black mb-1.5 bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
                  }}
                >
                  {stat.value}
                </span>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  {stat.label}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{stat.sub}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
