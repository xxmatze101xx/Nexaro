"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Background: responds to .dark class via CSS in globals.css ─────────── */
function MeshBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Base: white in light, near-black in dark */}
      <div className="absolute inset-0 bg-white dark:bg-zinc-950 transition-colors duration-300" />
      {/* Primary glow — CSS class handles light/dark opacity */}
      <div className="landing-hero-glow-primary absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full" />
      {/* Secondary accent */}
      <div className="landing-hero-glow-secondary absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full" />
      {/* Dot grid */}
      <div className="landing-hero-dots absolute inset-0" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
    </div>
  );
}

/* ─── Eyebrow badge ──────────────────────────────────────────────────────── */
function EyebrowBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.85, 0.45, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/8 dark:bg-sky-500/10 px-4 py-1.5 text-sm mb-8"
    >
      <span className="flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_#0EA5E9] animate-pulse" />
      <span className="text-sky-600 dark:text-sky-400 font-semibold">New</span>
      <span className="text-zinc-600 dark:text-zinc-400">AI Decision Tracking & Daily Executive Briefings</span>
      <ArrowRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
    </motion.div>
  );
}

/* ─── Headline ───────────────────────────────────────────────────────────── */
function Headline() {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.85, 0.45, 1] }}
      className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] leading-[1.06] font-bold tracking-[-0.02em] text-zinc-900 dark:text-white max-w-4xl"
    >
      Command every conversation.{" "}
      <span
        style={{
          background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 50%, #38BDF8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Lead every outcome.
      </span>
    </motion.h1>
  );
}

/* ─── Subheadline ────────────────────────────────────────────────────────── */
function Subheadline() {
  return (
    <motion.p
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.22, ease: [0.2, 0.85, 0.45, 1] }}
      className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
    >
      Nexaro unifies Gmail, Slack, Teams, Outlook and your calendar into one
      AI-powered command center — so you always act on what matters most,
      not just what arrived last.
    </motion.p>
  );
}

/* ─── CTA buttons ────────────────────────────────────────────────────────── */
function CTAButtons() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.34, ease: [0.2, 0.85, 0.45, 1] }}
      className="flex flex-col sm:flex-row items-center gap-3 mt-10"
    >
      <Link
        href="/login"
        className="group inline-flex items-center gap-2.5 rounded-[10px] bg-sky-500 hover:bg-sky-600 text-white font-semibold px-7 py-3.5 text-base transition-all duration-200 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5"
      >
        Start free — no card required
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        href="#how-it-works"
        className="inline-flex items-center gap-2 rounded-[10px] border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-white/4 hover:bg-zinc-100 dark:hover:bg-white/8 text-zinc-800 dark:text-white font-medium px-7 py-3.5 text-base transition-all duration-200 hover:-translate-y-0.5"
      >
        See how it works
      </Link>
    </motion.div>
  );
}

/* ─── Trust proof micro-copy ─────────────────────────────────────────────── */
const TRUST_ITEMS = [
  { icon: CheckCircle2, text: "14-day free trial" },
  { icon: Shield, text: "SOC 2 compliant" },
  { icon: TrendingUp, text: "3.2h saved per executive per day" },
];

function TrustMicro() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.48 }}
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6"
    >
      {TRUST_ITEMS.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-500">
          <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
          {text}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Social proof avatars ───────────────────────────────────────────────── */
const AVATARS = [
  { initials: "MK", color: "bg-sky-600" },
  { initials: "SR", color: "bg-sky-700" },
  { initials: "AP", color: "bg-slate-600" },
  { initials: "TW", color: "bg-sky-500" },
  { initials: "CJ", color: "bg-slate-500" },
];

function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.58 }}
      className="flex items-center gap-3 mt-10"
    >
      <div className="flex -space-x-2.5">
        {AVATARS.map((a) => (
          <div
            key={a.initials}
            className={cn(
              "w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-black/5 dark:ring-white/10",
              a.color
            )}
          >
            {a.initials}
          </div>
        ))}
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-white font-semibold">500+</span> executive teams trust Nexaro
        <span className="ml-2 text-yellow-500 dark:text-yellow-400 tracking-tight">★★★★★</span>
      </div>
    </motion.div>
  );
}

/* ─── Integration logo strip ─────────────────────────────────────────────── */
const INTEGRATIONS = [
  { name: "Gmail", src: "/ServiceLogos/Gmail.svg" },
  { name: "Slack", src: "/ServiceLogos/Slack.svg" },
  { name: "Teams", src: "/ServiceLogos/Microsoft Teams.svg" },
  { name: "Outlook", src: "/ServiceLogos/Outlook.svg" },
  { name: "HubSpot", src: "/ServiceLogos/HubSpot.svg" },
  { name: "Salesforce", src: "/ServiceLogos/Salesforce.svg" },
  { name: "Google Calendar", src: "/ServiceLogos/Google Calendar.svg" },
  { name: "Zoom", src: "/ServiceLogos/Zoom.svg" },
];

function IntegrationStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="flex flex-col items-center gap-4 mt-14 w-full"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-600 font-medium">
        Connects with your entire stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-5">
        {INTEGRATIONS.map((int) => (
          <div
            key={int.name}
            className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors duration-200"
          >
            <Image
              src={int.src}
              alt={int.name}
              width={18}
              height={18}
              className="w-4 h-4 object-contain opacity-50 hover:opacity-80 transition-opacity"
            />
            <span className="text-sm font-medium">{int.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Dashboard mockup ───────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, delay: 0.85, ease: [0.2, 0.85, 0.45, 1] }}
      className="relative w-full max-w-5xl mx-auto mt-20 px-4 sm:px-0"
    >
      {/* Glow beneath (CSS class handles light/dark) */}
      <div className="landing-dash-glow absolute inset-x-0 bottom-0 h-48 pointer-events-none z-10" />

      {/* Browser chrome */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-900/90 backdrop-blur-sm overflow-hidden shadow-2xl shadow-zinc-300/60 dark:shadow-black/70">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-100 dark:bg-zinc-950/70">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/60 dark:bg-red-500/40" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/60 dark:bg-yellow-500/40" />
            <div className="w-3 h-3 rounded-full bg-green-400/60 dark:bg-green-500/40" />
          </div>
          <div className="ml-4 flex-1 max-w-[260px] mx-auto">
            <div className="bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-transparent rounded-md px-3 py-1 text-xs text-zinc-500 dark:text-zinc-500 text-center font-mono">
              app.nexaro.io/dashboard
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">AI Active</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 sm:p-6 space-y-4 bg-zinc-50 dark:bg-[#09090B]">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Critical Messages", value: "3", sub: "of 47 unread", accent: true },
              { label: "Meetings Today", value: "4", sub: "Next in 38 min", accent: false },
              { label: "Pending Decisions", value: "7", sub: "2 overdue", accent: false },
              { label: "Time Saved Today", value: "2.8h", sub: "vs. baseline", accent: false },
            ].map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-xl border p-3.5",
                  card.accent
                    ? "border-sky-500/30 bg-sky-500/8"
                    : "border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.025]"
                )}
              >
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mb-1 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">{card.value}</p>
                <p className={cn("text-[10px] mt-1", card.accent ? "text-sky-600 dark:text-sky-400" : "text-zinc-400 dark:text-zinc-600")}>
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Priority inbox */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.018] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Priority Inbox
                </span>
                <span className="text-[10px] bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  3 critical
                </span>
              </div>
              <span className="text-[11px] text-sky-600 font-medium cursor-pointer hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                View all
              </span>
            </div>
            {[
              { from: "Sarah Chen", role: "Board Chair", subject: "Q3 Board deck — final sign-off needed", time: "9:14 AM", tag: "Critical", tagColor: "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400", channel: "Gmail" },
              { from: "James Miller", role: "CTO", subject: "Infrastructure go / no-go before 2 PM", time: "8:51 AM", tag: "Decision", tagColor: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400", channel: "Slack" },
              { from: "Ava Reyes", role: "VP Sales", subject: "Enterprise deal $2.4M — contract ready", time: "Yesterday", tag: "Opportunity", tagColor: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", channel: "Outlook" },
            ].map((msg) => (
              <div
                key={msg.subject}
                className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100 dark:border-white/[0.04] last:border-0 hover:bg-zinc-50 dark:hover:bg-white/[0.025] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                  {msg.from.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{msg.from}</span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-600 px-1.5 py-0.5 rounded">
                      {msg.role}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-700">· {msg.channel}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{msg.subject}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", msg.tagColor)}>
                    {msg.tag}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Briefing bar */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-50 dark:bg-sky-500/[0.07] px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 mb-0.5">
                AI Executive Briefing — 9:20 AM
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                3 messages need your decision today. Board deck deadline in 4h.
                James awaits infrastructure approval before the 2 PM stand-up.
                Ava&apos;s $2.4M contract expires Friday — respond today to close.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom mask */}
      <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-20 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
    </motion.div>
  );
}

/* ─── Main HeroSection export ────────────────────────────────────────────── */
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-28 pb-0">
      <MeshBackground />
      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto">
        <EyebrowBadge />
        <Headline />
        <Subheadline />
        <CTAButtons />
        <TrustMicro />
        <SocialProof />
        <IntegrationStrip />
      </div>
      <DashboardMockup />
    </section>
  );
}
