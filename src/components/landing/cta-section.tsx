"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const GUARANTEES = [
  "14-day free trial, no credit card",
  "Cancel anytime",
  "SOC 2 compliant, GDPR ready",
  "Setup in under 10 minutes",
];

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative bg-zinc-950 py-20 sm:py-28 lg:py-36 px-4 sm:px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(123,104,238,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.2, 0.85, 0.45, 1] }}
        >
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B68EE] mb-5">
            Get Started Today
          </p>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-[60px] font-bold text-white leading-[1.08] tracking-tight mb-6">
            Stop triaging.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #C4B5FD 0%, #9B8AFE 40%, #7B68EE 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start leading.
            </span>
          </h2>

          {/* Sub copy */}
          <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Join 500+ executive teams who reclaimed their mornings, closed decisions faster,
            and never missed a critical message again. Start your free trial in 60 seconds.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2.5 rounded-[12px] bg-[#7B68EE] hover:bg-[#6A59D4] text-white font-bold px-8 py-4 text-lg transition-all duration-200 shadow-xl shadow-[#7B68EE]/30 hover:shadow-[#7B68EE]/50 hover:-translate-y-0.5"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold px-8 py-4 text-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              View pricing
            </Link>
          </div>

          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {GUARANTEES.map((g) => (
              <div key={g} className="flex items-center gap-1.5 text-sm text-zinc-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
                {g}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Decorative ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.2, 0.85, 0.45, 1] }}
          className="absolute inset-0 pointer-events-none -z-10"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(123,104,238,0.06) 0%, transparent 70%)",
          }}
        />
      </div>
    </section>
  );
}
