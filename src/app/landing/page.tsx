"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  MessageSquare,
  Calendar,
  Zap,
  Shield,
  Brain,
  ChevronRight,
  Star,
  CheckCircle,
  ArrowRight,
  Inbox,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Hero } from "@/components/ui/hero";

const INTEGRATIONS = [
  {
    name: "Gmail",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.148C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    name: "Slack",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" fill="#E01E5A" />
      </svg>
    ),
  },
  {
    name: "MS Teams",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M20.625 5.813a2.625 2.625 0 1 0 0-5.25 2.625 2.625 0 0 0 0 5.25z" fill="#5059C9" />
        <path d="M14.25 6.75a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75z" fill="#7B83EB" />
        <path d="M22.5 7.5H17.1a.6.6 0 0 0-.6.6v6.525a5.812 5.812 0 0 1-4.5 5.675v.075A4.125 4.125 0 0 0 16.125 24H22.5a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5z" fill="#5059C9" />
        <path d="M14.25 7.5H2.25A1.5 1.5 0 0 0 .75 9v8.625A6.375 6.375 0 0 0 7.125 24h3.75a6.375 6.375 0 0 0 6.375-6.375V9a1.5 1.5 0 0 0-1.5-1.5z" fill="#7B83EB" />
      </svg>
    ),
  },
  {
    name: "Outlook",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M14.25 0v6.75L16.5 9l3.75-2.25V0h-6z" fill="#0364B8" />
        <path d="M20.25 0h-6v6.75l3 1.5 3-1.5V0z" fill="#0078D4" />
        <path d="M20.25 6.75L16.5 9l-2.25-2.25V12h6V6.75z" fill="#28A8E8" />
        <path d="M14.25 12H8.25v8.25l6 1.5V12z" fill="#0078D4" />
        <path d="M20.25 12h-6v8.25l6-1.5V12z" fill="#0364B8" />
        <path d="M8.25 12H2.25v6.75l6 3V12z" fill="#14447D" />
        <path d="M6.375 5.25a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5z" fill="#0078D4" />
        <path d="M4.125 10.5a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 0 0-4.5 0z" fill="white" />
      </svg>
    ),
  },
  {
    name: "Calendar",
    icon: <Calendar className="w-6 h-6 text-[#1A73E8]" />,
  },
];

const FEATURES = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "KI-Priorisierung",
    description:
      "Nexaro bewertet jede Nachricht automatisch nach Wichtigkeit. Du siehst zuerst, was wirklich zählt — nicht was zuletzt ankam.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: <Inbox className="w-6 h-6" />,
    title: "Unified Inbox",
    description:
      "Gmail, Slack, Teams, Outlook — alle Kanäle in einer Ansicht. Kein Tab-Wechseln mehr, kein Kontext-Verlust.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "AI-Drafts in Sekunden",
    description:
      "Ein Klick genügt: Nexaro generiert kontextbewusste Antworten, die du nur noch absenden musst.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Daily Briefing",
    description:
      "Jeden Morgen ein KI-kuratiertes Summary: Was ist passiert, was braucht deine Aufmerksamkeit heute.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Datenschutz by Design",
    description:
      "Alle persönlichen Daten werden vor dem KI-API-Call anonymisiert. Keine Rohdaten verlassen dein System.",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Entscheidungs-Insights",
    description:
      "Nexaro trackt Entscheidungen und offene Tasks aus deiner Kommunikation — automatisch, ohne extra Aufwand.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

const TESTIMONIALS = [
  {
    name: "Stefan B.",
    role: "CEO, Technologieunternehmen",
    text: "Ich spare täglich 45 Minuten, die ich früher mit dem Sortieren von E-Mails und dem Wechseln zwischen Tools verbracht habe. Nexaro ist das erste Tool, das meinen Arbeitstag wirklich vereinfacht.",
    stars: 5,
  },
  {
    name: "Anna K.",
    role: "Geschäftsführerin, Consulting",
    text: "Die KI-Priorisierung ist überraschend präzise. Ich verpasse keine kritischen Nachrichten mehr, auch wenn ich im Meeting bin.",
    stars: 5,
  },
  {
    name: "Michael R.",
    role: "Founder & CEO, SaaS-Startup",
    text: "Endlich ein Tool, das für Executives gebaut wurde, nicht für IT-Abteilungen. Setup war in 10 Minuten erledigt.",
    stars: 5,
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "29",
    description: "Perfekt für Einzelpersonen",
    features: [
      "2 Integrationen (z.B. Gmail + Slack)",
      "KI-Priorisierung",
      "AI-Draft Generator",
      "Daily Briefing",
    ],
    cta: "Kostenlos testen",
    highlight: false,
  },
  {
    name: "Executive",
    price: "79",
    description: "Für vielbeschäftigte CEOs",
    features: [
      "Alle Integrationen",
      "Unbegrenzte AI-Drafts",
      "Entscheidungs-Tracking",
      "Kalender-Sync",
      "Prioritäts-Support",
    ],
    cta: "Jetzt starten",
    highlight: true,
  },
  {
    name: "Team",
    price: "199",
    description: "Für Führungsteams",
    features: [
      "Alles aus Executive",
      "Bis zu 10 Nutzer",
      "Team-Inbox",
      "Admin-Dashboard",
      "Dediziertes Onboarding",
    ],
    cta: "Kontakt aufnehmen",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-[Inter]">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nexaro" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg text-foreground">Nexaro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#integrations" className="hover:text-foreground transition-colors">Integrationen</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preise</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              Kostenlos testen
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <Hero
        eyebrow="INTRODUCING NEXARO"
        title={
          <>
            <span>Deine gesamte </span>
            <span className="text-primary">Kommunikation</span>
            <br />
            <span>auf einen Blick.</span>
          </>
        }
        subtitle="Nexaro bündelt Gmail, Slack, Teams und Outlook in einer KI-priorisierten Oberfläche — entwickelt für CEOs, die weniger Zeit im Postfach verbringen wollen."
        ctaText="Jetzt starten"
        ctaLink="/login"
      />

      {/* ── Integrations ── */}
      <section id="integrations" className="py-16 px-4 sm:px-6 border-y border-border bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-8">
            Verbindet sich mit deinen Tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.name} className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {integration.icon}
                <span>{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-[Plus_Jakarta_Sans] mb-4">
              Alles was ein CEO braucht
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Nexaro wurde von Grund auf für Entscheider entwickelt — nicht für Teams, nicht für IT, sondern für dich.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-all group">
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

      {/* ── Social Proof ── */}
      <section className="py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-[Plus_Jakarta_Sans] mb-4">
              Was Executives sagen
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
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-[Plus_Jakarta_Sans] mb-4">
              Einfache, transparente Preise
            </h2>
            <p className="text-muted-foreground text-lg">
              Alle Pläne inkl. 14 Tage kostenloser Testphase. Keine Kreditkarte erforderlich.
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
                    Empfohlen
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-foreground text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-foreground">€{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">/Monat</span>
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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-[Plus_Jakarta_Sans] mb-4">
            Bereit, deine Inbox zu transformieren?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Starte noch heute kostenlos. Setup in unter 5 Minuten.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
          >
            Jetzt kostenlos starten
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Keine Kreditkarte. Keine Einrichtungsgebühr. 14 Tage kostenlos.
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
            © {new Date().getFullYear()} Nexaro. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-foreground transition-colors">Impressum</a>
            <a href="#" className="hover:text-foreground transition-colors">AGB</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
