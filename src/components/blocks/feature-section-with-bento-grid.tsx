"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import createGlobe from "cobe";
import { motion } from "framer-motion";
import { Zap, Brain, Inbox, Shield } from "lucide-react";

export function FeaturesSectionWithBentoGrid() {
  const features = [
    {
      title: "One inbox for everything",
      description:
        "Gmail, Slack, Teams, and Outlook — every channel unified in one AI-powered view. No tab-switching, no lost context.",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 md:col-span-4 lg:col-span-4 border-b md:border-r dark:border-neutral-800",
    },
    {
      title: "AI scores what matters",
      description:
        "Every message is automatically ranked by importance. You see critical decisions first — not just what arrived last.",
      skeleton: <SkeletonTwo />,
      className: "col-span-1 md:col-span-2 lg:col-span-2 border-b dark:border-neutral-800",
    },
    {
      title: "Reply in one click",
      description:
        "Nexaro generates context-aware AI drafts that are ready to send. Built for executives who value every minute.",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 md:col-span-3 lg:col-span-3 border-b md:border-r dark:border-neutral-800",
    },
    {
      title: "Works everywhere",
      description:
        "Available on all devices, all time zones. Your unified inbox travels with you — secure and always up to date.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 md:col-span-3 lg:col-span-3 border-b md:border-none",
    },
  ];

  return (
    <div className="relative z-20 py-10 lg:py-40 max-w-7xl mx-auto">
      <div className="px-8">
        <h4 className="text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
          Everything executives need
        </h4>
        <p className="text-sm lg:text-base max-w-2xl my-4 mx-auto text-neutral-500 text-center font-normal dark:text-neutral-300">
          Nexaro was built from the ground up for decision-makers — not for teams, not
          for IT, but for you. Less time in your inbox. More time leading.
        </p>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 mt-12 xl:border rounded-md dark:border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("p-4 sm:p-8 relative overflow-hidden", className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="max-w-5xl mx-auto text-left tracking-tight text-black dark:text-white text-xl md:text-2xl md:leading-snug">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "text-sm md:text-base max-w-4xl text-left mx-auto",
        "text-neutral-500 font-normal dark:text-neutral-300",
        "text-left max-w-sm mx-0 md:text-sm my-2"
      )}
    >
      {children}
    </p>
  );
};

// ── Skeleton: Unified Inbox dashboard mockup ──────────────────────────────────
export const SkeletonOne = () => {
  const messages = [
    { icon: <Inbox className="w-3 h-3" />, from: "Sarah M.", subject: "Q3 Board Deck — review needed", score: 98, channel: "Gmail" },
    { icon: <Brain className="w-3 h-3" />, from: "Finance Team", subject: "Budget approval by EOD", score: 95, channel: "Slack" },
    { icon: <Zap className="w-3 h-3" />, from: "Legal", subject: "Contract signature required", score: 91, channel: "Outlook" },
    { icon: <Shield className="w-3 h-3" />, from: "CTO", subject: "Incident: production down", score: 99, channel: "Teams" },
    { icon: <Inbox className="w-3 h-3" />, from: "Investor Relations", subject: "Series B term sheet", score: 97, channel: "Gmail" },
  ];

  return (
    <div className="relative flex py-8 px-2 gap-10 h-full">
      <div className="w-full p-5 mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full rounded-sm">
        <div className="flex flex-1 w-full h-full flex-col space-y-2">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Unified Inbox
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {messages.length} critical
            </span>
          </div>
          {/* Message rows */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {msg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {msg.from}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {msg.subject}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {msg.channel}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded-full",
                    msg.score >= 97
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      : msg.score >= 94
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                  )}
                >
                  {msg.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
      <div className="absolute top-0 z-40 inset-x-0 h-20 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
    </div>
  );
};

// ── Skeleton: Animated priority badges ───────────────────────────────────────
export const SkeletonTwo = () => {
  const cards = [
    { label: "Gmail", count: 12, color: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
    { label: "Slack", count: 7, color: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" },
    { label: "Teams", count: 4, color: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" },
    { label: "Outlook", count: 9, color: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" },
    { label: "Calendar", count: 3, color: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
  ];

  const cardVariants = {
    whileHover: { scale: 1.08, zIndex: 100 },
    whileTap: { scale: 1.08, zIndex: 100 },
  };

  return (
    <div className="relative flex flex-col items-start p-8 gap-10 h-full overflow-hidden">
      <div className="flex flex-row -ml-4 flex-wrap gap-2">
        {cards.map((card, idx) => (
          <motion.div
            variants={cardVariants}
            key={"card-first-" + idx}
            style={{ rotate: Math.random() * 10 - 5 }}
            whileHover="whileHover"
            whileTap="whileTap"
            className={cn(
              "rounded-xl mt-4 p-3 border flex flex-col items-center gap-1 flex-shrink-0",
              card.color
            )}
          >
            <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
              {card.count}
            </span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {card.label}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-row gap-2 flex-wrap">
        {cards.map((card, idx) => (
          <motion.div
            variants={cardVariants}
            key={"card-second-" + idx}
            style={{ rotate: Math.random() * 10 - 5 }}
            whileHover="whileHover"
            whileTap="whileTap"
            className={cn(
              "rounded-xl mt-4 p-3 border flex flex-col items-center gap-1 flex-shrink-0",
              card.color
            )}
          >
            <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
              {card.count}
            </span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {card.label}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="absolute left-0 z-[100] inset-y-0 w-10 bg-gradient-to-r from-white dark:from-black to-transparent h-full pointer-events-none" />
      <div className="absolute right-0 z-[100] inset-y-0 w-10 bg-gradient-to-l from-white dark:from-black to-transparent h-full pointer-events-none" />
    </div>
  );
};

// ── Skeleton: AI Draft panel mockup ─────────────────────────────────────────
export const SkeletonThree = () => {
  const draftLines = [
    "Hi Sarah,",
    "",
    "Thank you for the updated term sheet. I've reviewed the key",
    "provisions and see alignment on valuation. Let's schedule a",
    "call this week to finalize the structure.",
    "",
    "Best regards,",
    "Michael",
  ];

  return (
    <div className="relative flex gap-10 h-full group/draft">
      <div className="w-full mx-auto bg-white dark:bg-neutral-900 group h-full rounded-sm shadow-2xl p-4">
        <div className="flex flex-col h-full space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              AI Draft
            </span>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Ready
              </span>
            </div>
          </div>
          <div className="flex-1 pt-2">
            {draftLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed min-h-[1.2rem]"
              >
                {line}
              </motion.p>
            ))}
          </div>
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
            <div className="flex-1 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">Send</span>
            </div>
            <div className="h-7 px-3 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Edit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Skeleton: Globe ───────────────────────────────────────────────────────────
export const SkeletonFour = () => {
  return (
    <div className="h-60 md:h-60 flex flex-col items-center relative bg-transparent dark:bg-transparent mt-10">
      <Globe className="absolute -right-10 md:-right-10 -bottom-80 md:-bottom-72" />
    </div>
  );
};

export const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.2, 0.2, 0.25],
      markerColor: [0.4, 0.6, 1],
      glowColor: [0.5, 0.5, 1],
      markers: [
        { location: [48.2082, 16.3738], size: 0.05 }, // Vienna
        { location: [51.5074, -0.1278], size: 0.06 }, // London
        { location: [40.7128, -74.006], size: 0.08 }, // New York
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
        { location: [1.3521, 103.8198], size: 0.04 }, // Singapore
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // eslint-disable-next-line react/forbid-dom-props
      style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: "1" }}
      className={className}
    />
  );
};
