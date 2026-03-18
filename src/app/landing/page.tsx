"use client";

import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Zap,
  Shield,
  Brain,
  Star,
  CheckCircle,
  ArrowRight,
  Inbox,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Hero } from "@/components/ui/hero";
import { FeaturesSectionWithBentoGrid } from "@/components/blocks/feature-section-with-bento-grid";
import { Radar, IconContainer } from "@/components/ui/radar-effect";


const FEATURES = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI Prioritization",
    description:
      "Nexaro scores every message automatically by importance. You see what truly matters first — not just what arrived last.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: <Inbox className="w-6 h-6" />,
    title: "Unified Inbox",
    description:
      "Gmail, Slack, Teams, Outlook — every channel in one view. No more tab-switching, no more lost context.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "AI Drafts in Seconds",
    description:
      "One click is all it takes: Nexaro generates context-aware replies that are ready to send.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Daily Briefing",
    description:
      "Every morning an AI-curated summary: what happened, what needs your attention today.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Privacy by Design",
    description:
      "All personal data is anonymized before any AI API call. No raw data ever leaves your system.",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Decision Insights",
    description:
      "Nexaro tracks decisions and open tasks from your communication — automatically, without extra effort.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

const TESTIMONIALS = [
  {
    name: "Stefan B.",
    role: "CEO, Technology Company",
    text: "I save 45 minutes every day that I used to spend sorting emails and switching between tools. Nexaro is the first tool that actually simplifies my workday.",
    stars: 5,
  },
  {
    name: "Anna K.",
    role: "Managing Director, Consulting",
    text: "The AI prioritization is surprisingly accurate. I no longer miss critical messages, even when I'm in meetings.",
    stars: 5,
  },
  {
    name: "Michael R.",
    role: "Founder & CEO, SaaS Startup",
    text: "Finally a tool built for executives, not IT departments. Setup was done in 10 minutes.",
    stars: 5,
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "29",
    description: "Perfect for individuals",
    features: [
      "2 integrations (e.g. Gmail + Slack)",
      "AI prioritization",
      "AI draft generator",
      "Daily briefing",
    ],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Executive",
    price: "79",
    description: "For busy CEOs",
    features: [
      "All integrations",
      "Unlimited AI drafts",
      "Decision tracking",
      "Calendar sync",
      "Priority support",
    ],
    cta: "Get started",
    highlight: true,
  },
  {
    name: "Team",
    price: "199",
    description: "For leadership teams",
    features: [
      "Everything in Executive",
      "Up to 10 users",
      "Team inbox",
      "Admin dashboard",
      "Dedicated onboarding",
    ],
    cta: "Contact us",
    highlight: false,
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
        className="min-h-screen"
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
      <section className="relative z-0 py-24 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-hidden">
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
        <div className="relative mx-auto flex h-[26rem] w-full max-w-4xl flex-col items-center justify-center space-y-6 overflow-hidden px-4">
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

          <Radar className="absolute -bottom-12" />
          <div className="absolute bottom-0 z-[4] h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything a CEO needs
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Nexaro was built from the ground up for decision-makers — not for teams, not for IT, but for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bento Feature Grid ── */}
      <section className="bg-white dark:bg-black border-y border-border overflow-hidden">
        <FeaturesSectionWithBentoGrid />
      </section>

      {/* ── Social Proof ── */}
      <section className="py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              What executives say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-2xl border flex flex-col transition-all ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 relative"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-foreground text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-foreground">€{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                      : "border border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 border-t border-border bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to transform your inbox?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start for free today. Setup in under 5 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. No setup fee. 14 days free.
          </p>
        </div>
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
