"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsSection } from "@/components/landing/stats-section";
import { ProblemSolutionSection } from "@/components/landing/problem-solution-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSectionWithBentoGrid } from "@/components/blocks/feature-section-with-bento-grid";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { Radar, IconContainer } from "@/components/ui/radar-effect";
import { Pricing } from "@/components/blocks/pricing";
import { CTASection } from "@/components/landing/cta-section";
import { Footer7 } from "@/components/ui/footer-7";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PRICING_PLANS = [
  {
    name: "STARTER",
    price: "29",
    yearlyPrice: "23",
    period: "per month",
    features: [
      "2 integrations (Gmail + Slack)",
      "AI prioritization",
      "AI draft generator",
      "Daily briefing",
      "Community support",
    ],
    description: "Perfect for individuals getting started",
    buttonText: "Start for free",
    href: "/login",
    isPopular: false,
  },
  {
    name: "EXECUTIVE",
    price: "79",
    yearlyPrice: "63",
    period: "per month",
    features: [
      "All integrations",
      "Unlimited AI drafts",
      "Decision tracking",
      "Calendar sync",
      "Priority support",
      "Privacy by Design",
      "Advanced AI insights",
    ],
    description: "The go-to plan for founders, managers, and busy professionals",
    buttonText: "Get started",
    href: "/login",
    isPopular: true,
  },
  {
    name: "TEAM",
    price: "199",
    yearlyPrice: "159",
    period: "per month",
    features: [
      "Everything in Executive",
      "Up to 10 users",
      "Team inbox",
      "Admin dashboard",
      "Dedicated onboarding",
      "SSO Authentication",
      "SLA agreement",
    ],
    description: "For leadership teams that move fast together",
    buttonText: "Contact sales",
    href: "/login",
    isPopular: false,
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 dark:border-white/[0.06] bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Nexaro" width={30} height={30} className="object-contain" />
            <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">Nexaro</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7 text-sm text-zinc-500 dark:text-zinc-500">
            <a href="#why" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-150">Why Nexaro</a>
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-150">How It Works</a>
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-150">Features</a>
            <a href="#integrations" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-150">Integrations</a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-150">Pricing</a>
          </div>

          {/* Right side: theme toggle + CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {!isLoading && user ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/25"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-150"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-semibold bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/25"
                >
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── 2. Stats / ROI Metrics ──────────────────────────────────────────── */}
      <StatsSection />

      {/* ── 3. Problem → Solution ───────────────────────────────────────────── */}
      <ProblemSolutionSection />

      {/* ── 4. How It Works ─────────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ── 5. Feature Bento Grid ───────────────────────────────────────────── */}
      <section id="features" className="bg-white dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
        <FeaturesSectionWithBentoGrid />
      </section>

      {/* ── 6. Integrations Radar ───────────────────────────────────────────── */}
      <section
        id="integrations"
        className="relative z-0 pt-16 sm:pt-24 pb-0 px-4 sm:px-6 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300"
      >
        <div className="max-w-6xl mx-auto text-center mb-10 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-500 mb-3">
            Real-time Intelligence
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Always watching. Always connected.
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
            Nexaro monitors every channel simultaneously — so nothing critical ever slips through,
            no matter where it was sent.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-5xl" style={{ height: "500px" }}>
          <div className="absolute -translate-x-1/2" style={{ left: "20%", bottom: "220px" }}>
            <IconContainer text="Gmail" delay={0.1} icon={<img src="/ServiceLogos/Gmail.svg" alt="Gmail" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "33%", bottom: "290px" }}>
            <IconContainer text="Slack" delay={0.2} icon={<img src="/ServiceLogos/Slack.svg" alt="Slack" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "67%", bottom: "290px" }}>
            <IconContainer text="MS Teams" delay={0.3} icon={<img src="/ServiceLogos/Microsoft Teams.svg" alt="Microsoft Teams" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "80%", bottom: "220px" }}>
            <IconContainer text="Zoom" delay={0.4} icon={<img src="/ServiceLogos/Zoom.svg" alt="Zoom" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "27%", bottom: "150px" }}>
            <IconContainer text="Google Calendar" delay={0.5} icon={<img src="/ServiceLogos/Google Calendar.svg" alt="Google Calendar" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "50%", bottom: "250px" }}>
            <IconContainer text="HubSpot" delay={0.6} icon={<img src="/ServiceLogos/HubSpot.svg" alt="HubSpot" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "73%", bottom: "150px" }}>
            <IconContainer text="Salesforce" delay={0.7} icon={<img src="/ServiceLogos/Salesforce.svg" alt="Salesforce" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "18%", bottom: "65px" }}>
            <IconContainer text="Jira" delay={0.8} icon={<img src="/ServiceLogos/Jira.svg" alt="Jira" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "38%", bottom: "90px" }}>
            <IconContainer text="Linear" delay={0.9} icon={<img src="/ServiceLogos/Linear.svg" alt="Linear" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "62%", bottom: "90px" }}>
            <IconContainer text="Outlook" delay={1.0} icon={<img src="/ServiceLogos/Outlook.svg" alt="Outlook" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute -translate-x-1/2" style={{ left: "82%", bottom: "65px" }}>
            <IconContainer text="Telegram" delay={1.1} icon={<img src="/ServiceLogos/Telegram.svg" alt="Telegram" className="h-7 w-7 object-contain" />} />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-[2]">
            <Radar />
          </div>
        </div>
        <div className="absolute bottom-0 z-[4] h-px w-full bg-gradient-to-r from-transparent via-slate-300 dark:via-zinc-700 to-transparent" />
      </section>

      {/* ── 7. Testimonials ─────────────────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── 8. Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-background py-12 sm:py-24 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-800/50 transition-colors duration-300">
        <Pricing
          plans={PRICING_PLANS}
          title="Simple, transparent pricing"
          description="All plans include a 14-day free trial. No credit card required."
        />
      </section>

      {/* ── 9. Final CTA ────────────────────────────────────────────────────── */}
      <CTASection />

      {/* ── 10. Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/60 bg-background transition-colors duration-300">
        <Footer7 />
      </footer>
    </div>
  );
}
