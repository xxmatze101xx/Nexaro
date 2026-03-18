"use client";

import Link from "next/link";
import Image from "next/image";
import { Hero } from "@/components/ui/hero";
import { FeaturesSectionWithBentoGrid } from "@/components/blocks/feature-section-with-bento-grid";
import { Radar, IconContainer } from "@/components/ui/radar-effect";
import { Pricing } from "@/components/blocks/pricing";


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
    description: "The go-to plan for busy CEOs and executives",
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nexaro" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg text-foreground">Nexaro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              Try for free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <Hero
        className="min-h-screen pt-16"
        eyebrow="INTRODUCING NEXARO"
        title={
          <>
            <span>Your entire </span>
            <span className="text-primary">communication</span>
            <br />
            <span>at a glance.</span>
          </>
        }
        subtitle="Nexaro unifies Gmail, Slack, Teams and Outlook into one AI-prioritized surface — built for CEOs who want to spend less time in their inbox."
        ctaText="Get started"
        ctaLink="/login"
      />

      {/* ── Radar Section ── */}
      <section className="relative z-0 pt-24 pb-0 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3">
            Real-time Intelligence
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Always watching. Always connected.
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Nexaro monitors every channel simultaneously — so nothing critical ever slips through.
          </p>
        </div>
        {/* Icon rows */}
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center space-y-6 px-4 pb-48">
          {/* Row 1 */}
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex w-full items-center justify-center gap-6 md:justify-between">
              <IconContainer text="Gmail" delay={0.1} icon={<img src="/ServiceLogos/Gmail.svg" alt="Gmail" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Slack" delay={0.2} icon={<img src="/ServiceLogos/Slack.svg" alt="Slack" className="h-7 w-7 object-contain" />} />
              <IconContainer text="MS Teams" delay={0.3} icon={<img src="/ServiceLogos/Microsoft Teams.svg" alt="Microsoft Teams" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Zoom" delay={0.4} icon={<img src="/ServiceLogos/Zoom.svg" alt="Zoom" className="h-7 w-7 object-contain" />} />
            </div>
          </div>
          {/* Row 2 */}
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex w-full items-center justify-center gap-6 md:justify-between">
              <IconContainer text="Google Calendar" delay={0.5} icon={<img src="/ServiceLogos/Google Calendar.svg" alt="Google Calendar" className="h-7 w-7 object-contain" />} />
              <IconContainer text="HubSpot" delay={0.6} icon={<img src="/ServiceLogos/HubSpot.svg" alt="HubSpot" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Salesforce" delay={0.7} icon={<img src="/ServiceLogos/Salesforce.svg" alt="Salesforce" className="h-7 w-7 object-contain" />} />
            </div>
          </div>
          {/* Row 3 */}
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex w-full items-center justify-center gap-6 md:justify-between">
              <IconContainer text="Jira" delay={0.8} icon={<img src="/ServiceLogos/Jira.svg" alt="Jira" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Linear" delay={0.9} icon={<img src="/ServiceLogos/Linear.svg" alt="Linear" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Outlook" delay={1.0} icon={<img src="/ServiceLogos/Outlook.svg" alt="Outlook" className="h-7 w-7 object-contain" />} />
              <IconContainer text="Telegram" delay={1.1} icon={<img src="/ServiceLogos/Telegram.svg" alt="Telegram" className="h-7 w-7 object-contain" />} />
            </div>
          </div>
        </div>
        {/* Radar anchored at section bottom — shows as a dome */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-[2]">
          <Radar />
        </div>
        <div className="absolute bottom-0 z-[4] h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </section>

      {/* ── Bento Feature Grid ── */}
      <section className="bg-white border-y border-border overflow-hidden">
        <FeaturesSectionWithBentoGrid />
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <Pricing
          plans={PRICING_PLANS}
          title="Simple, transparent pricing"
          description="All plans include a 14-day free trial. No credit card required."
        />
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nexaro" width={24} height={24} className="object-contain" />
            <span className="font-semibold text-sm text-foreground">Nexaro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Nexaro. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Imprint</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
