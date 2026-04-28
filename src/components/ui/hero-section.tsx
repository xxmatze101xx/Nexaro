"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Animated dot-grid background ──────────────────────────────────────── */
function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(123,104,238,0.18) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
      }}
    />
  );
}

/* ─── Glowing orb ───────────────────────────────────────────────────────── */
function GlowOrb() {
  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
      style={{
        background:
          "radial-gradient(circle at center, rgba(123,104,238,0.22) 0%, rgba(123,104,238,0.06) 45%, transparent 70%)",
        filter: "blur(1px)",
      }}
    />
  );
}

/* ─── Announcement badge ─────────────────────────────────────────────────── */
function AnnouncementBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.85, 0.45, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur-sm mb-8"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#7B68EE]" />
      <span className="text-[#9B8AFE] font-medium">New:</span>
      <span>AI Decision Tracking & Daily Briefings</span>
      <ArrowRight className="w-3 h-3 text-zinc-500" />
    </motion.div>
  );
}

/* ─── Social proof avatars + count ──────────────────────────────────────── */
const AVATARS = [
  { initials: "JK", color: "bg-violet-600" },
  { initials: "SM", color: "bg-indigo-600" },
  { initials: "AR", color: "bg-purple-700" },
  { initials: "TL", color: "bg-violet-500" },
  { initials: "CE", color: "bg-indigo-500" },
];

function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55, ease: [0.2, 0.85, 0.45, 1] }}
      className="flex items-center gap-3 mt-10"
    >
      <div className="flex -space-x-2">
        {AVATARS.map((a) => (
          <div
            key={a.initials}
            className={cn(
              "w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white",
              a.color
            )}
          >
            {a.initials}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
        <span className="text-white font-semibold">500+</span>
        <span>executive teams rely on Nexaro</span>
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.75, ease: [0.2, 0.85, 0.45, 1] }}
      className="flex flex-col items-center gap-4 mt-16 w-full"
    >
      <p className="text-xs uppercase tracking-widest text-zinc-600 font-medium">
        Connects with your entire stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {INTEGRATIONS.map((int) => (
          <div
            key={int.name}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Image
              src={int.src}
              alt={int.name}
              width={20}
              height={20}
              className="w-5 h-5 object-contain opacity-50 group-hover:opacity-80"
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
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.9, ease: [0.2, 0.85, 0.45, 1] }}
      className="relative w-full max-w-5xl mx-auto mt-20 px-4 sm:px-6"
    >
      {/* Glow below mockup */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(123,104,238,0.15) 0%, transparent 80%)",
        }}
      />

      {/* Browser chrome */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-zinc-950/60">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="ml-4 flex-1 max-w-xs mx-auto">
            <div className="bg-zinc-800/60 rounded-md px-3 py-1 text-xs text-zinc-500 text-center">
              app.nexaro.io/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6 space-y-4 bg-[#09090B]">
          {/* Top row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Unread messages", value: "24", sub: "3 critical", accent: true },
              { label: "Meetings today", value: "4", sub: "Next in 38 min", accent: false },
              { label: "Pending decisions", value: "7", sub: "2 overdue", accent: false },
            ].map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-lg border p-4",
                  card.accent
                    ? "border-[#7B68EE]/30 bg-[#7B68EE]/8"
                    : "border-white/6 bg-white/3"
                )}
              >
                <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    card.accent ? "text-[#9B8AFE]" : "text-zinc-600"
                  )}
                >
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Message list */}
          <div className="rounded-lg border border-white/6 bg-white/2 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/6 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Priority Inbox
              </span>
              <span className="text-xs text-[#7B68EE] font-medium">View all</span>
            </div>
            {[
              {
                from: "Sarah Chen",
                org: "Board",
                subject: "Q3 Board deck — final review needed",
                time: "9:14 AM",
                tag: "Critical",
                tagColor: "bg-red-500/15 text-red-400",
              },
              {
                from: "James Miller",
                org: "CTO",
                subject: "Infrastructure upgrade: go / no-go?",
                time: "8:51 AM",
                tag: "Decision",
                tagColor: "bg-[#7B68EE]/20 text-[#9B8AFE]",
              },
              {
                from: "Ava Reyes",
                org: "Sales",
                subject: "Enterprise deal $2.4M — contract ready",
                time: "Yesterday",
                tag: "Opportunity",
                tagColor: "bg-emerald-500/15 text-emerald-400",
              },
            ].map((msg) => (
              <div
                key={msg.subject}
                className="px-4 py-3 flex items-center gap-3 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0">
                  {msg.from.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white">{msg.from}</span>
                    <span className="text-xs text-zinc-600">{msg.org}</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{msg.subject}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      msg.tagColor
                    )}
                  >
                    {msg.tag}
                  </span>
                  <span className="text-xs text-zinc-600">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI insight bar */}
          <div className="rounded-lg border border-[#7B68EE]/20 bg-[#7B68EE]/6 px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#9B8AFE] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#9B8AFE] mb-0.5">AI Briefing</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                3 messages require your decision today. The board deck deadline is in 4 hours.
                James is awaiting infrastructure approval before the 2 PM stand-up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20 bg-gradient-to-t from-zinc-950 to-transparent" />
    </motion.div>
  );
}

/* ─── Main HeroSection export ────────────────────────────────────────────── */
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden bg-zinc-950 pt-32 pb-0">
      {/* Background layers */}
      <DotGrid />
      <GlowOrb />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto">
        <AnnouncementBadge />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.2, 0.85, 0.45, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] leading-[1.08] font-bold tracking-tight text-white"
        >
          Stop managing{" "}
          <span
            className="inline-block"
            style={{
              background: "linear-gradient(135deg, #9B8AFE 0%, #7B68EE 40%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            communications.
          </span>
          <br />
          Start leading.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.85, 0.45, 1] }}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed"
        >
          Nexaro unifies your inbox, Slack, Teams & calendar — then lets AI surface what
          actually needs your attention. Built for CEOs, founders & executives who
          can&apos;t afford to miss what matters.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4, ease: [0.2, 0.85, 0.45, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3 mt-10"
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#7B68EE] hover:bg-[#6559d4] text-white font-semibold px-6 py-3 text-base transition-all duration-200 shadow-lg shadow-[#7B68EE]/25 hover:shadow-[#7B68EE]/40 hover:-translate-y-0.5"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium px-6 py-3 text-base transition-all duration-200 hover:-translate-y-0.5"
          >
            See how it works
          </Link>
        </motion.div>

        <SocialProof />
        <IntegrationStrip />
      </div>

      <DashboardMockup />
    </section>
  );
}
