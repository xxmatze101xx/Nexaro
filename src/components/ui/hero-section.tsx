"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, TrendingUp, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Animated gradient mesh background ─────────────────────────────────── */
function MeshBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Base dark */}
      <div className="absolute inset-0 bg-zinc-950" />
      {/* Primary glow */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.18]"
        style={{
          background: "radial-gradient(ellipse at center, #7B68EE 0%, #4F46E5 50%, transparent 75%)",
          filter: "blur(80px)",
        }}
      />
      {/* Secondary accent */}
      <div
        className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
        style={{
          background: "radial-gradient(ellipse at center, #a78bfa 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(123,104,238,0.5) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 30%, transparent 100%)",
        }}
      />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-zinc-950 to-transparent" />
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
      className="inline-flex items-center gap-2 rounded-full border border-[#7B68EE]/25 bg-[#7B68EE]/8 px-4 py-1.5 text-sm text-zinc-300 mb-8"
    >
      <span className="flex h-2 w-2 rounded-full bg-[#7B68EE] shadow-[0_0_6px_#7B68EE] animate-pulse" />
      <span className="text-[#9B8AFE] font-semibold">New</span>
      <span className="text-zinc-400">AI Decision Tracking & Daily Executive Briefings</span>
      <ArrowRight className="w-3 h-3 text-zinc-600" />
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
      className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] leading-[1.06] font-bold tracking-[-0.02em] text-white max-w-4xl"
    >
      Command every conversation.{" "}
      <span
        style={{
          background: "linear-gradient(135deg, #C4B5FD 0%, #9B8AFE 35%, #7B68EE 65%, #6559d4 100%)",
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
      className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed"
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
        className="group inline-flex items-center gap-2.5 rounded-[10px] bg-[#7B68EE] hover:bg-[#6A59D4] text-white font-semibold px-7 py-3.5 text-base transition-all duration-200 shadow-lg shadow-[#7B68EE]/30 hover:shadow-[#7B68EE]/50 hover:-translate-y-0.5"
      >
        Start free — no card required
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        href="#how-it-works"
        className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/4 hover:bg-white/8 text-white font-medium px-7 py-3.5 text-base transition-all duration-200 hover:-translate-y-0.5"
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
        <div key={text} className="flex items-center gap-1.5 text-sm text-zinc-500">
          <Icon className="w-3.5 h-3.5 text-zinc-600" />
          {text}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Social proof avatars ───────────────────────────────────────────────── */
const AVATARS = [
  { initials: "MK", color: "bg-violet-600" },
  { initials: "SR", color: "bg-indigo-600" },
  { initials: "AP", color: "bg-purple-700" },
  { initials: "TW", color: "bg-violet-500" },
  { initials: "CJ", color: "bg-indigo-500" },
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
              "w-9 h-9 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10",
              a.color
            )}
          >
            {a.initials}
          </div>
        ))}
      </div>
      <div className="text-sm text-zinc-400">
        <span className="text-white font-semibold">500+</span> executive teams trust Nexaro
        <span className="ml-2 text-yellow-400 tracking-tight">★★★★★</span>
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
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600 font-medium">
        Connects with your entire stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-5">
        {INTEGRATIONS.map((int) => (
          <div
            key={int.name}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
          >
            <Image
              src={int.src}
              alt={int.name}
              width={18}
              height={18}
              className="w-4.5 h-4.5 object-contain opacity-45 hover:opacity-70 transition-opacity"
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
      {/* Glow beneath */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(123,104,238,0.18) 0%, transparent 80%)",
        }}
      />

      {/* Browser chrome */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/90 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/70">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-zinc-950/70">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/40" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
            <div className="w-3 h-3 rounded-full bg-green-500/40" />
          </div>
          <div className="ml-4 flex-1 max-w-[260px] mx-auto">
            <div className="bg-zinc-800/70 rounded-md px-3 py-1 text-xs text-zinc-500 text-center font-mono">
              app.nexaro.io/dashboard
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Sparkles className="w-3 h-3 text-[#7B68EE]" />
            <span className="text-[10px] text-[#9B8AFE] font-medium">AI Active</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 sm:p-6 space-y-4 bg-[#09090B]">
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
                    ? "border-[#7B68EE]/35 bg-[#7B68EE]/10"
                    : "border-white/[0.06] bg-white/[0.025]"
                )}
              >
                <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-white leading-none">{card.value}</p>
                <p className={cn("text-[10px] mt-1", card.accent ? "text-[#9B8AFE]" : "text-zinc-600")}>
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Priority inbox */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Priority Inbox
                </span>
                <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">
                  3 critical
                </span>
              </div>
              <span className="text-[11px] text-[#7B68EE] font-medium cursor-pointer hover:text-[#9B8AFE]">
                View all
              </span>
            </div>
            {[
              {
                from: "Sarah Chen",
                role: "Board Chair",
                subject: "Q3 Board deck — final sign-off needed",
                time: "9:14 AM",
                tag: "Critical",
                tagColor: "bg-red-500/15 text-red-400",
                channel: "Gmail",
              },
              {
                from: "James Miller",
                role: "CTO",
                subject: "Infrastructure go / no-go before 2 PM",
                time: "8:51 AM",
                tag: "Decision",
                tagColor: "bg-[#7B68EE]/20 text-[#9B8AFE]",
                channel: "Slack",
              },
              {
                from: "Ava Reyes",
                role: "VP Sales",
                subject: "Enterprise deal $2.4M — contract ready",
                time: "Yesterday",
                tag: "Opportunity",
                tagColor: "bg-emerald-500/15 text-emerald-400",
                channel: "Outlook",
              },
            ].map((msg) => (
              <div
                key={msg.subject}
                className="px-4 py-3 flex items-center gap-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0">
                  {msg.from.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{msg.from}</span>
                    <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {msg.role}
                    </span>
                    <span className="text-[10px] text-zinc-700">· {msg.channel}</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{msg.subject}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", msg.tagColor)}>
                    {msg.tag}
                  </span>
                  <span className="text-[11px] text-zinc-600">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Briefing bar */}
          <div className="rounded-xl border border-[#7B68EE]/20 bg-[#7B68EE]/[0.07] px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#9B8AFE] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#9B8AFE] mb-0.5">
                AI Executive Briefing — 9:20 AM
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                3 messages need your decision today. Board deck deadline in 4h.
                James awaits infrastructure approval before the 2 PM stand-up.
                Ava's $2.4M contract expires Friday — respond today to close.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom mask */}
      <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-20 bg-gradient-to-t from-zinc-950 to-transparent" />
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
