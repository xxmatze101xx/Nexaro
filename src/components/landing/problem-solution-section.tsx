"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { X, Check, Mail, MessageSquare, Bell, Calendar, Inbox, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Before column ──────────────────────────────────────────────────────── */
const BEFORE_ITEMS = [
  { icon: Mail, text: "200+ unread emails across 3 inboxes" },
  { icon: MessageSquare, text: "Slack threads you haven't caught up on" },
  { icon: Bell, text: "Meeting alerts drowning real decisions" },
  { icon: Calendar, text: "Context-switching every 8 minutes on average" },
  { icon: Inbox, text: "Critical messages buried under newsletters" },
];

const AFTER_ITEMS = [
  { icon: Zap, text: "One surface — every channel, prioritized by AI" },
  { icon: Check, text: "Only what needs your attention surfaces to the top" },
  { icon: Check, text: "Decisions flagged, tracked and followed up automatically" },
  { icon: Check, text: "Context preserved across every thread and channel" },
  { icon: Check, text: "Your day started with an AI briefing, not inbox dread" },
];

function BeforeCard() {
  return (
    <div className="rounded-2xl border border-red-500/15 bg-red-950/10 p-6 sm:p-8 h-full">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
          <X className="w-4 h-4 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-red-300">Before Nexaro</h3>
      </div>
      <div className="space-y-4">
        {BEFORE_ITEMS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-red-400/70" />
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-red-500/10">
        <p className="text-red-400/70 text-sm italic">
          "I spend my first 2 hours just triaging — before I can do any real work."
        </p>
        <p className="text-zinc-600 text-xs mt-2">— Common feedback from executives before Nexaro</p>
      </div>
    </div>
  );
}

function AfterCard() {
  return (
    <div className="rounded-2xl border border-[#7B68EE]/20 bg-[#7B68EE]/[0.05] p-6 sm:p-8 h-full relative overflow-hidden">
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top right, rgba(123,104,238,0.15) 0%, transparent 65%)",
        }}
      />
      <div className="flex items-center gap-2.5 mb-6 relative">
        <div className="w-8 h-8 rounded-full bg-[#7B68EE]/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-[#9B8AFE]" />
        </div>
        <h3 className="text-lg font-semibold text-[#C4B5FD]">With Nexaro</h3>
      </div>
      <div className="space-y-4 relative">
        {AFTER_ITEMS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-[#7B68EE]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-[#9B8AFE]" />
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-[#7B68EE]/15 relative">
        <p className="text-[#C4B5FD]/80 text-sm italic">
          "I open Nexaro, scan 3 things, make decisions, and I'm done in 15 minutes."
        </p>
        <p className="text-zinc-600 text-xs mt-2">— CEO, SaaS company, 120 employees</p>
      </div>
    </div>
  );
}

export function ProblemSolutionSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="why"
      className="relative bg-zinc-950 py-20 sm:py-28 lg:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Divider line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.2, 0.85, 0.45, 1] }}
          className="max-w-3xl mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B68EE] mb-4">
            The Executive Attention Crisis
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Your inbox wasn&apos;t built for{" "}
            <span className="text-zinc-500">how you actually lead.</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
            The average executive processes 200+ messages per day across 4+ platforms.
            <strong className="text-white"> 28 hours a week</strong> — just on communication.
            That&apos;s 70% of your working week consumed before strategy, decisions, or leadership even begin.
          </p>
        </motion.div>

        {/* Two columns */}
        <div className="grid md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.2, 0.85, 0.45, 1] }}
          >
            <BeforeCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.2, 0.85, 0.45, 1] }}
          >
            <AfterCard />
          </motion.div>
        </div>

        {/* Bottom proof line */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-12 border-t border-zinc-800/60 pt-10 grid sm:grid-cols-3 gap-8"
        >
          {[
            { stat: "28h/week", copy: "spent by executives on communication (McKinsey, 2024)" },
            { stat: "67%", copy: "of critical decisions are delayed due to information overload" },
            { stat: "$4,200/yr", copy: "in productivity lost per manager from inbox mismanagement" },
          ].map(({ stat, copy }) => (
            <div key={stat}>
              <p className="text-2xl font-bold text-white mb-1">{stat}</p>
              <p className="text-zinc-500 text-sm leading-relaxed">{copy}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
