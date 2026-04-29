"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Mail, MessageSquare, Zap, Star, Shield, Clock } from "lucide-react";
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
            <a href="#why" className="hover:text-foreground transition-colors">Why Nexaro</a>
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
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white pt-16">
        {/* Background: dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.55,
          }}
        />
        {/* Background: soft purple blob top-left */}
        <div
          className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 40% 40%, #ede9fe 0%, transparent 70%)",
            opacity: 0.9,
          }}
        />
        {/* Background: soft indigo blob bottom-right */}
        <div
          className="absolute -bottom-60 -right-60 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 60% 60%, #e0e7ff 0%, transparent 70%)",
            opacity: 0.8,
          }}
        />
        {/* Background: subtle blue blob top-right */}
        <div
          className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 60% 30%, #f0f9ff 0%, transparent 70%)",
            opacity: 0.7,
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-6xl mx-auto">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-8 animate-appear opacity-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-sm font-medium text-violet-700 tracking-tight">
              AI-powered inbox management — now in beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[80px] font-bold tracking-tight leading-[1.1] text-slate-900 mb-6 animate-appear opacity-0 delay-100 max-w-4xl">
            Your inbox,{" "}
            <span
              className="inline-block"
              style={{
                background: "linear-gradient(135deg, #7B68EE 0%, #818cf8 50%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              finally intelligent.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-500 max-w-2xl mb-10 leading-relaxed animate-appear opacity-0 delay-300 font-light">
            Nexaro turns scattered messages across Gmail, Slack, Teams, and Outlook into a single AI-ranked surface. Know what needs you now — and ignore everything that doesn't.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-16 animate-appear opacity-0 delay-500">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #7B68EE 0%, #6366f1 100%)" }}
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              See how it works
            </a>
          </div>

          {/* Social proof bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-16 animate-appear opacity-0 delay-700">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-medium text-slate-700">4.9</span>
              <span>from 200+ reviews</span>
            </div>
            <div className="w-px h-4 bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>SOC 2 Type II certified</span>
            </div>
            <div className="w-px h-4 bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="w-4 h-4 text-violet-500" />
              <span>Setup in under 2 minutes</span>
            </div>
          </div>

          {/* Hero visual: dashboard card + floating elements */}
          <div className="relative w-full max-w-4xl animate-appear opacity-0 delay-[900ms]">
            {/* Floating card: AI summary — left */}
            <div className="absolute -left-4 sm:-left-10 top-8 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 p-3.5 w-52 text-left hidden sm:block">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7B68EE, #6366f1)" }}>
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-slate-800">AI Summary</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                3 urgent emails from clients need your reply today.
              </p>
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-medium text-red-500">High priority</span>
              </div>
            </div>

            {/* Floating card: new message — right */}
            <div className="absolute -right-4 sm:-right-10 bottom-16 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 p-3.5 w-56 text-left hidden sm:block">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  SL
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Slack — #general</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    "Can someone review the Q3 report before EOD?"
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[10px] bg-violet-100 text-violet-700 font-medium px-1.5 py-0.5 rounded-md">Needs action</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main dashboard card */}
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 overflow-hidden">
              {/* Card header */}
              <div className="border-b border-slate-100 px-5 py-3.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg h-6 flex items-center px-3">
                  <span className="text-xs text-slate-400 font-mono">app.nexaro.io/inbox</span>
                </div>
              </div>

              {/* Card body: mock inbox */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-48 border-r border-slate-100 p-3 hidden md:block">
                  <div className="space-y-0.5">
                    {[
                      { label: "All messages", count: 24, active: true },
                      { label: "Gmail", count: 12, active: false },
                      { label: "Slack", count: 7, active: false },
                      { label: "Teams", count: 3, active: false },
                      { label: "Outlook", count: 2, active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                          item.active
                            ? "bg-violet-50 text-violet-700 font-semibold"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          item.active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"
                        }`}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message list */}
                <div className="flex-1 divide-y divide-slate-50">
                  {[
                    {
                      from: "Sarah Chen",
                      initials: "SC",
                      color: "from-violet-400 to-purple-500",
                      source: "Gmail",
                      sourceColor: "text-red-500 bg-red-50",
                      subject: "Q3 investor update — need your sign-off",
                      preview: "Hi, the deck is ready. Just needs your final approval before...",
                      time: "9:41 AM",
                      tag: "Urgent",
                      tagColor: "bg-red-50 text-red-600",
                    },
                    {
                      from: "Marcus Webb",
                      initials: "MW",
                      color: "from-sky-400 to-blue-500",
                      source: "Slack",
                      sourceColor: "text-emerald-600 bg-emerald-50",
                      subject: "Product launch meeting — tomorrow 10am",
                      preview: "Hey, just confirming the agenda for tomorrow's sync...",
                      time: "8:15 AM",
                      tag: "Meeting",
                      tagColor: "bg-blue-50 text-blue-600",
                    },
                    {
                      from: "Lena Müller",
                      initials: "LM",
                      color: "from-pink-400 to-rose-500",
                      source: "Teams",
                      sourceColor: "text-purple-600 bg-purple-50",
                      subject: "Budget proposal feedback",
                      preview: "I've reviewed the numbers — a few things to flag on slide 4...",
                      time: "Yesterday",
                      tag: "Review",
                      tagColor: "bg-amber-50 text-amber-600",
                    },
                  ].map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors ${i === 0 ? "bg-violet-50/30" : ""}`}>
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${msg.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {msg.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate">{msg.from}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${msg.sourceColor}`}>{msg.source}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{msg.time}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 truncate mb-0.5">{msg.subject}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400 truncate flex-1">{msg.preview}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${msg.tagColor}`}>{msg.tag}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* AI draft suggestion row */}
                  <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 to-transparent flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #7B68EE, #6366f1)" }}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-violet-700">Nexaro AI</p>
                      <p className="text-xs text-slate-500">Draft ready for Sarah's email — click to review &amp; send</p>
                    </div>
                    <button className="text-[11px] font-semibold text-violet-600 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl" />
          </div>
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

      {/* ── Supported Platforms ── */}
      <section id="integrations" className="bg-slate-50 py-16 sm:py-24 px-4 sm:px-6 border-b border-border overflow-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-3">
              Integrations
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Connects to the tools your team already uses.
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Plug Nexaro into your existing stack in minutes — no migrations, no rip-and-replace.
            </p>
          </div>

          {/* Marquee — two rows scrolling in opposite directions */}
          <div className="relative">
            {/* Left/right fade masks */}
            <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-slate-50 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />

            {/* Row 1 — scrolls left */}
            <div className="flex overflow-hidden mb-4">
              <div className="flex gap-4 animate-marquee whitespace-nowrap">
                {[
                  { name: "Gmail", logo: "/ServiceLogos/Gmail.svg" },
                  { name: "Slack", logo: "/ServiceLogos/Slack.svg" },
                  { name: "Microsoft Teams", logo: "/ServiceLogos/Microsoft Teams.svg" },
                  { name: "Outlook", logo: "/ServiceLogos/Outlook.svg" },
                  { name: "Google Calendar", logo: "/ServiceLogos/Google Calendar.svg" },
                  { name: "HubSpot", logo: "/ServiceLogos/HubSpot.svg" },
                  { name: "Salesforce", logo: "/ServiceLogos/Salesforce.svg" },
                  { name: "Zoom", logo: "/ServiceLogos/Zoom.svg" },
                  { name: "Jira", logo: "/ServiceLogos/Jira.svg" },
                  /* duplicate for seamless loop */
                  { name: "Gmail", logo: "/ServiceLogos/Gmail.svg" },
                  { name: "Slack", logo: "/ServiceLogos/Slack.svg" },
                  { name: "Microsoft Teams", logo: "/ServiceLogos/Microsoft Teams.svg" },
                  { name: "Outlook", logo: "/ServiceLogos/Outlook.svg" },
                  { name: "Google Calendar", logo: "/ServiceLogos/Google Calendar.svg" },
                  { name: "HubSpot", logo: "/ServiceLogos/HubSpot.svg" },
                  { name: "Salesforce", logo: "/ServiceLogos/Salesforce.svg" },
                  { name: "Zoom", logo: "/ServiceLogos/Zoom.svg" },
                  { name: "Jira", logo: "/ServiceLogos/Jira.svg" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center gap-2.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-2xl px-6 py-4 transition-colors cursor-default w-32"
                  >
                    <img src={item.logo} alt={item.name} className="h-9 w-9 object-contain" />
                    <span className="text-xs font-medium text-slate-600 text-center leading-tight">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2 — scrolls right (reversed direction) */}
            <div className="flex overflow-hidden">
              <div className="flex gap-4 animate-marquee whitespace-nowrap" style={{ animationDirection: "reverse", animationDuration: "26s" }}>
                {[
                  { name: "Linear", logo: "/ServiceLogos/Linear.svg" },
                  { name: "Telegram", logo: "/ServiceLogos/Telegram.svg" },
                  { name: "WhatsApp Business", logo: "/ServiceLogos/WhatsApp Business.svg" },
                  { name: "Proton Mail", logo: "/ServiceLogos/Proton Mail.svg" },
                  { name: "Apple Calendar", logo: "/ServiceLogos/Apple Calendar.svg" },
                  { name: "Cisco Webex", logo: "/ServiceLogos/Cisco Webex.svg" },
                  { name: "Outlook Calendar", logo: "/ServiceLogos/Outlook Calendar.svg" },
                  { name: "Google Drive", logo: "/ServiceLogos/Google Drive.svg" },
                  /* duplicate for seamless loop */
                  { name: "Linear", logo: "/ServiceLogos/Linear.svg" },
                  { name: "Telegram", logo: "/ServiceLogos/Telegram.svg" },
                  { name: "WhatsApp Business", logo: "/ServiceLogos/WhatsApp Business.svg" },
                  { name: "Proton Mail", logo: "/ServiceLogos/Proton Mail.svg" },
                  { name: "Apple Calendar", logo: "/ServiceLogos/Apple Calendar.svg" },
                  { name: "Cisco Webex", logo: "/ServiceLogos/Cisco Webex.svg" },
                  { name: "Outlook Calendar", logo: "/ServiceLogos/Outlook Calendar.svg" },
                  { name: "Google Drive", logo: "/ServiceLogos/Google Drive.svg" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center gap-2.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-2xl px-6 py-4 transition-colors cursor-default w-32"
                  >
                    <img src={item.logo} alt={item.name} className="h-9 w-9 object-contain" />
                    <span className="text-xs font-medium text-slate-600 text-center leading-tight">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom stat */}
          <p className="text-center text-sm text-slate-400 mt-10">
            17 integrations and counting — with more launching every month.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-12 sm:py-24 px-4 sm:px-6">
        <Pricing
          plans={PRICING_PLANS}
          title="Simple, transparent pricing"
          description="All plans include a 14-day free trial. No credit card required."
        />
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-zinc-950 py-20 sm:py-32 px-4 sm:px-6">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(123,104,238,0.18) 0%, transparent 70%)",
          }}
        />
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-6">
            Ready to reclaim your day?
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Stop triaging.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #7B68EE 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start leading.
            </span>
          </h2>
          <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            Join founders, managers, and operators who've taken back the hours they used to spend on noise — and put them toward work that matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-xl text-white transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-800/60 hover:scale-[1.02] text-base"
              style={{ background: "linear-gradient(135deg, #7B68EE 0%, #6366f1 100%)" }}
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@nexaro.io"
              className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-all text-base"
            >
              Talk to sales
            </a>
          </div>

          <p className="text-zinc-600 text-sm mt-8">
            No credit card required &nbsp;·&nbsp; 14-day free trial &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <Footer7 />
      </footer>
    </div>
  );
}
