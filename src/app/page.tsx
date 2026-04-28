"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { FeaturesSectionWithBentoGrid } from "@/components/blocks/feature-section-with-bento-grid";
import { Radar, IconContainer } from "@/components/ui/radar-effect";
import { Pricing } from "@/components/blocks/pricing";
import { Footer7 } from "@/components/ui/footer-7";
import { useAuth } from "@/contexts/AuthContext";


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
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nexaro" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg text-foreground">Nexaro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#why" className="hover:text-foreground transition-colors">Why</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoading && user ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Try for free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-16">
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full">
          <p className="uppercase tracking-[0.51em] leading-[133%] text-center text-sm sm:text-base lg:text-[19px] mb-8 text-muted-foreground animate-appear opacity-0">
            INTRODUCING NEXARO
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight lg:leading-[83px] text-center px-4 lg:px-[314px] text-foreground font-semibold animate-appear opacity-0 delay-100">
            <span>Your entire </span>
            <span className="text-primary">communication</span>
            <br />
            <span>at a glance.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-[28px] text-center font-light px-4 sm:px-8 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-muted-foreground animate-appear opacity-0 delay-300">
            Nexaro unifies Gmail, Slack, Teams and Outlook into one AI-prioritized surface — built for anyone who can't afford to miss what matters.
          </p>
          <Link href="/login" className="mb-20 animate-appear opacity-0 delay-500">
            <div className="inline-flex items-center bg-primary text-primary-foreground rounded-[10px] hover:bg-primary-hover transition-colors w-[227px] h-[49px]">
              <div className="flex items-center justify-between w-full pl-[22px] pr-[17px]">
                <span className="text-[19px] whitespace-nowrap">Get started</span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Why Section ── */}
      <section id="why" className="bg-zinc-950 text-white py-16 sm:py-24 lg:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-10">
            Why we built this
          </p>

          {/* Opening statement */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-16">
            Most professionals spend{" "}
            <span className="text-white">28 hours a week</span>{" "}
            <span className="text-zinc-500">on communication.</span>
          </h2>

          {/* Body copy */}
          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div>
              <p className="text-zinc-300 text-lg leading-relaxed">
                That's not work. That's noise management. Somewhere between
                the 200 unread emails and the Slack notifications is the one
                message that actually matters — the one that changes everything.
              </p>
            </div>
            <div>
              <p className="text-zinc-300 text-lg leading-relaxed">
                We built Nexaro because we believe your attention is the scarcest
                resource you have. Whether you're a founder, a manager, or
                anyone who owns their inbox — every minute triaging is a minute
                not spent on what only you can do.
              </p>
            </div>
          </div>

          {/* Belief statements */}
          <div className="border-t border-zinc-800 pt-16 grid sm:grid-cols-3 gap-10">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3">
                We believe
              </p>
              <p className="text-white text-xl font-semibold leading-snug">
                Leaders should lead — not manage their inbox.
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3">
                We believe
              </p>
              <p className="text-white text-xl font-semibold leading-snug">
                Every tool you use should earn its place in your day.
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3">
                We believe
              </p>
              <p className="text-white text-xl font-semibold leading-snug">
                The right message, at the right moment, changes outcomes.
              </p>
            </div>
          </div>

          {/* Closing line */}
          <div className="border-t border-zinc-800 mt-16 pt-16">
            <p className="text-zinc-400 text-2xl sm:text-3xl font-medium leading-snug max-w-2xl">
              That's why we built Nexaro. Not to replace how you communicate —
              but to give you back the time to do it{" "}
              <span className="text-white font-semibold">better.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Radar Section ── */}
      <section className="relative z-0 pt-12 sm:pt-24 pb-0 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center mb-8 sm:mb-16">
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
        {/* Scattered icons + radar */}
        <div className="relative mx-auto w-full max-w-5xl" style={{ height: '500px' }}>
          {/* Gmail — far left, middle arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '20%', bottom: '220px' }}>
            <IconContainer text="Gmail" delay={0.1} icon={<img src="/ServiceLogos/Gmail.svg" alt="Gmail" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Slack — center-left, top arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '33%', bottom: '290px' }}>
            <IconContainer text="Slack" delay={0.2} icon={<img src="/ServiceLogos/Slack.svg" alt="Slack" className="h-7 w-7 object-contain" />} />
          </div>
          {/* MS Teams — center-right, top arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '67%', bottom: '290px' }}>
            <IconContainer text="MS Teams" delay={0.3} icon={<img src="/ServiceLogos/Microsoft Teams.svg" alt="Microsoft Teams" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Zoom — far right, middle arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '80%', bottom: '220px' }}>
            <IconContainer text="Zoom" delay={0.4} icon={<img src="/ServiceLogos/Zoom.svg" alt="Zoom" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Google Calendar — left, lower-middle arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '27%', bottom: '150px' }}>
            <IconContainer text="Google Calendar" delay={0.5} icon={<img src="/ServiceLogos/Google Calendar.svg" alt="Google Calendar" className="h-7 w-7 object-contain" />} />
          </div>
          {/* HubSpot — center, top arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '50%', bottom: '250px' }}>
            <IconContainer text="HubSpot" delay={0.6} icon={<img src="/ServiceLogos/HubSpot.svg" alt="HubSpot" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Salesforce — right, lower-middle arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '73%', bottom: '150px' }}>
            <IconContainer text="Salesforce" delay={0.7} icon={<img src="/ServiceLogos/Salesforce.svg" alt="Salesforce" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Jira — far left, bottom arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '18%', bottom: '65px' }}>
            <IconContainer text="Jira" delay={0.8} icon={<img src="/ServiceLogos/Jira.svg" alt="Jira" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Linear — center-left, bottom arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '38%', bottom: '90px' }}>
            <IconContainer text="Linear" delay={0.9} icon={<img src="/ServiceLogos/Linear.svg" alt="Linear" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Outlook — center-right, bottom arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '62%', bottom: '90px' }}>
            <IconContainer text="Outlook" delay={1.0} icon={<img src="/ServiceLogos/Outlook.svg" alt="Outlook" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Telegram — far right, bottom arc */}
          <div className="absolute -translate-x-1/2" style={{ left: '82%', bottom: '65px' }}>
            <IconContainer text="Telegram" delay={1.1} icon={<img src="/ServiceLogos/Telegram.svg" alt="Telegram" className="h-7 w-7 object-contain" />} />
          </div>
          {/* Radar — center exactly at container bottom edge → shows only the upper half */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-[2]">
            <Radar />
          </div>
        </div>
        <div className="absolute bottom-0 z-[4] h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </section>

      {/* ── Bento Feature Grid ── */}
      <section id="features" className="bg-white border-y border-border overflow-hidden">
        <FeaturesSectionWithBentoGrid />
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-12 sm:py-24 px-4 sm:px-6">
        <Pricing
          plans={PRICING_PLANS}
          title="Simple, transparent pricing"
          description="All plans include a 14-day free trial. No credit card required."
        />
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <Footer7 />
      </footer>
    </div>
  );
}
