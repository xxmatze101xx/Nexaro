"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface Testimonial {
  quote: string;
  name: string;
  title: string;
  company: string;
  initials: string;
  color: string;
  highlight?: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Before Nexaro, my first two hours were pure inbox triage. Now I open a briefing, make three decisions, and I'm leading by 9 AM. It's not a productivity tool — it's a leadership multiplier.",
    name: "Marcus T.",
    title: "CEO",
    company: "Series B SaaS, 160 employees",
    initials: "MT",
    color: "bg-violet-600",
    highlight: "leadership multiplier",
  },
  {
    quote:
      "We were missing critical client escalations because they were buried in Slack. Nexaro surfaces them before they become crises. Our response time on high-priority items dropped from 4 hours to 22 minutes.",
    name: "Priya S.",
    title: "VP Operations",
    company: "Enterprise Fintech",
    initials: "PS",
    color: "bg-indigo-600",
    highlight: "4 hours to 22 minutes",
  },
  {
    quote:
      "I manage a team of 40 across 3 time zones. Nexaro is the only tool that lets me stay on top of what actually matters without drowning in everything that doesn't. Worth every penny of the Executive plan.",
    name: "Daniel R.",
    title: "Director of Engineering",
    company: "Global SaaS Platform",
    initials: "DR",
    color: "bg-purple-700",
    highlight: "what actually matters",
  },
  {
    quote:
      "The AI draft feature alone saves me 45 minutes a day. But the real value is the decision tracking — I no longer wonder if something critical fell through the cracks. Nexaro has it.",
    name: "Sophie K.",
    title: "COO",
    company: "Growth-stage HealthTech",
    initials: "SK",
    color: "bg-violet-500",
    highlight: "fell through the cracks",
  },
  {
    quote:
      "We evaluated six AI productivity tools. Nexaro was the only one that understood the executive use case — not just task management, but genuine signal filtering at scale.",
    name: "James L.",
    title: "Founder & CEO",
    company: "B2B Enterprise Software",
    initials: "JL",
    color: "bg-indigo-500",
    highlight: "signal filtering at scale",
  },
  {
    quote:
      "The daily briefing is the first thing I read. It's like having a chief of staff who has already read everything and tells me exactly what I need to know. Exceptionally well done.",
    name: "Amara O.",
    title: "Managing Director",
    company: "Investment Group",
    initials: "AO",
    color: "bg-purple-600",
    highlight: "chief of staff",
  },
];

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return <>{text}</>;
    const parts = text.split(highlight);
    return (
      <>
        {parts[0]}
        <span className="text-white font-semibold">{highlight}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.2, 0.85, 0.45, 1] }}
      className="relative flex flex-col gap-5 p-6 sm:p-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] transition-colors duration-300"
    >
      {/* Quote icon */}
      <Quote className="w-5 h-5 text-[#7B68EE]/50 flex-shrink-0" />

      {/* Quote text */}
      <p className="text-zinc-300 text-sm sm:text-base leading-relaxed flex-1">
        &ldquo;{highlightText(testimonial.quote, testimonial.highlight)}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
            testimonial.color
          )}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.name}</p>
          <p className="text-zinc-500 text-xs">
            {testimonial.title} · {testimonial.company}
          </p>
        </div>
        <div className="ml-auto text-yellow-400 text-sm tracking-tighter">★★★★★</div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative bg-zinc-950 py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.2, 0.85, 0.45, 1] }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B68EE] mb-3">
            Social Proof
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Trusted by leaders who can&apos;t afford to miss a thing
          </h2>
          <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
            From early-stage founders to enterprise directors — here&apos;s what happens when
            signal cuts through noise.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} testimonial={t} index={i} />
          ))}
        </div>

        {/* Bottom rating bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500"
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-base">★★★★★</span>
            <span><strong className="text-white">4.9/5</strong> on G2</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-base">★★★★★</span>
            <span><strong className="text-white">4.8/5</strong> on Product Hunt</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <span><strong className="text-white">500+</strong> executive teams worldwide</span>
        </motion.div>
      </div>
    </section>
  );
}
