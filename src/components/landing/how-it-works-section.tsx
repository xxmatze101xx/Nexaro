"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PlugZap, Brain, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: PlugZap,
    title: "Connect your stack in 90 seconds",
    description:
      "Link Gmail, Slack, Teams, Outlook, your calendar, HubSpot, Salesforce and more — no IT ticket required. OAuth-based, read-only where possible, enterprise-grade encryption throughout.",
    detail: "15+ integrations · 90-second setup · Zero IT involvement",
    color: "#7B68EE",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI learns what matters to you",
    description:
      "Nexaro's AI models your communication patterns, your VIP contacts, your active decisions and deadlines. Within 24 hours, it knows your signal from your noise — and scores every message accordingly.",
    detail: "Personalized scoring · Decision tracking · Context-aware ranking",
    color: "#818CF8",
  },
  {
    number: "03",
    icon: Zap,
    title: "Lead, decide, act — in minutes",
    description:
      "Open your executive dashboard, read your AI briefing, action the 3–5 messages that matter, and close the tab. Nexaro handles the rest: follow-ups, summaries, draft replies, and decision logs.",
    detail: "Daily briefings · AI drafts · Decision audit trail",
    color: "#A78BFA",
  },
];

function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="hidden lg:flex items-center justify-center flex-1 px-4">
      <div className="relative w-full h-px">
        <div className="absolute inset-0 bg-zinc-800" />
        <motion.div
          className="absolute inset-y-0 left-0 h-full"
          style={{ background: "linear-gradient(90deg, #7B68EE, #A78BFA)" }}
          initial={{ width: "0%" }}
          animate={active ? { width: "100%" } : { width: "0%" }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeInOut" }}
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#A78BFA]" />
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative bg-zinc-900/40 py-20 sm:py-28 lg:py-36 px-4 sm:px-6 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.2, 0.85, 0.45, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B68EE] mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Up and running in under 10 minutes
          </h2>
          <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
            No onboarding call. No configuration spreadsheet. Just connect, let the AI learn, and
            take back your time.
          </p>
        </motion.div>

        {/* Steps — desktop: horizontal row, mobile: stacked */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-0">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex flex-col lg:flex-row flex-1 items-stretch">
              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: i * 0.15, ease: [0.2, 0.85, 0.45, 1] }}
                className="flex-1 relative flex flex-col gap-5 p-7 sm:p-8 rounded-2xl border border-white/[0.07] bg-zinc-950/80 overflow-hidden"
              >
                {/* Step number background */}
                <div
                  className="absolute top-4 right-5 text-7xl font-black leading-none select-none pointer-events-none"
                  style={{ color: `${step.color}08` }}
                >
                  {step.number}
                </div>

                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${step.color}18`, border: `1px solid ${step.color}25` }}
                >
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>

                {/* Step label */}
                <span
                  className="text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: step.color }}
                >
                  Step {step.number}
                </span>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">
                  {step.description}
                </p>

                {/* Detail pill */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <p className="text-xs text-zinc-600 font-medium">{step.detail}</p>
                </div>
              </motion.div>

              {/* Connector between steps (desktop only) */}
              {i < STEPS.length - 1 && <StepConnector active={inView} />}
            </div>
          ))}
        </div>

        {/* Time-to-value callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center"
        >
          <div className="inline-flex items-center gap-3 rounded-2xl border border-[#7B68EE]/20 bg-[#7B68EE]/[0.06] px-6 py-4">
            <span className="text-2xl font-bold text-[#9B8AFE]">&lt;10 min</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Time to first insight</p>
              <p className="text-zinc-500 text-xs">From signup to your first AI briefing</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-4">
            <span className="text-2xl font-bold text-zinc-300">Zero</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Engineering required</p>
              <p className="text-zinc-500 text-xs">Self-serve, OAuth-based, no IT ticket</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
