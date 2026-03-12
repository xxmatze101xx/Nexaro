# Nexaro Pricing-Strategie & Abo-Modelle

> AI-F2 Brainstorming — Stand: März 2026

---

## 1. Markt-Analyse: Wettbewerber-Preise

| Tool | Zielgruppe | Preis/Monat | Modell | Besonderheiten |
|------|-----------|-------------|--------|----------------|
| **Superhuman** | Power-User | $30/User | Flat-Fee | Kein Free-Tier, exklusiv |
| **Front** | Teams | $19-229/User | Per-Seat, tiered | Teamfokus, Shared Inbox |
| **Shortwave** | Professionals | $0-29/User | Freemium | AI-Features im Pro-Tier |
| **Spark** | Allgemein | $0-9.99/User | Freemium | Günstig, breite Basis |
| **Sanebox** | Busy Professionals | $7-36/User | Tiered | Nur Email-Filtering |
| **Missive** | Teams | $14-26/User | Per-Seat | Collaborative Inbox |
| **Notion** (Referenz) | Teams/Individuals | $0-15/User | Freemium | Workspace-Tool |

### Key Insights:
- **CEO/Executive-Tools** positionieren sich Premium ($25-30/Monat)
- **AI-Features** sind der häufigste Grund für Premium-Tiers
- **Keine Unified Inbox** kombiniert Email + Slack + Teams + AI wie Nexaro
- **Zahlungsbereitschaft** von CEOs: hoch — Zeit ist ihr wertvollstes Gut

---

## 2. Nexaro Kosten-Struktur pro User/Monat

| Kostenfaktor | Niedrig (1K User) | Mittel (10K User) | Hoch (100K User) |
|-------------|-------------------|-------------------|-------------------|
| Firebase (Firestore + Auth) | €0.50 | €0.30 | €0.15 |
| Vercel Hosting | €0.20 | €0.10 | €0.05 |
| AI API (Gemini Flash) | €0.80 | €0.60 | €0.40 |
| AI API (Premium Drafts) | €1.20 | €0.90 | €0.60 |
| Third-Party APIs (Gmail, Slack) | €0.10 | €0.08 | €0.05 |
| Support & Infrastruktur | €1.00 | €0.50 | €0.25 |
| **Gesamt pro User/Monat** | **€3.80** | **€2.48** | **€1.50** |

### Annahmen:
- AI-Nutzung: ~50 Scorings/Tag + ~10 Drafts/Tag pro User
- Gemini Flash für Scoring (~0.01ct/Call), Gemini Pro/GPT-4o-mini für Drafts (~0.1ct/Call)
- Firebase: ~1000 Reads + 200 Writes/Tag pro User

---

## 3. Empfohlene Tier-Struktur

### 🆓 Free Tier — "Starter"

**Preis:** €0/Monat
**Ziel:** Onboarding, Product-Led Growth

| Feature | Limit |
|---------|-------|
| Email-Integrationen | 1 (Gmail ODER Outlook) |
| AI-Priorisierung | ✅ Basic (Keyword-basiert) |
| AI-Drafts | 5/Tag |
| Todo-Feature | ✅ (manuell) |
| Kalender | ✅ |
| Slack/Teams | ❌ |
| KI-Todo-Extraktion | ❌ |
| Dashboard-Widgets | 3 max |

**Keine Kreditkarte erforderlich.** Reduziert Onboarding-Friction.

---

### 💼 Pro Tier — "Executive"

**Preis:** €24.99/Monat (€19.99/Monat bei Jahreszahlung = 20% Rabatt)
**Ziel:** Einzelne CEOs, Gründer, Freelance-Executives

| Feature | Limit |
|---------|-------|
| Email-Integrationen | Unbegrenzt (Gmail + Outlook) |
| Slack + Teams | ✅ Vollzugriff |
| AI-Priorisierung | ✅ Advanced (LLM-basiert) |
| AI-Drafts | Unbegrenzt |
| KI-Todo-Extraktion | ✅ |
| Dashboard-Widgets | Unbegrenzt |
| Schreibstil-Training | ✅ Basic |
| KI-Assistent Chat | 50 Fragen/Tag |
| Digest (Tägliche Zusammenfassung) | ✅ |
| Priority Support | Email (48h) |

---

### 🏢 Enterprise Tier — "C-Suite"

**Preis:** €49.99/Monat pro User (€39.99 bei Jahreszahlung)
**Ab 5+ User: individuelles Angebot**
**Ziel:** C-Level Teams, Boards, Executive Assistants

| Feature | Limit |
|---------|-------|
| Alles aus Pro | ✅ |
| SSO (SAML/OIDC) | ✅ |
| Admin-Dashboard | ✅ |
| CRM-Integration (HubSpot, Salesforce) | ✅ |
| Jira/Linear Integration | ✅ |
| Custom AI-Training (Unternehmenskontext) | ✅ |
| KI-Assistent Chat | Unbegrenzt |
| Schreibstil-Training | ✅ Advanced (mehrere Profile) |
| Dedicated Support | Telefon + Chat (4h Response) |
| Data Residency (EU) | ✅ |
| Audit Logs | ✅ |
| API-Zugang | ✅ |

---

## 4. Profitabilitäts-Analyse

### Break-Even pro Tier:

| Tier | Preis/Monat | Kosten/Monat | Marge | Break-Even Users |
|------|------------|-------------|-------|-----------------|
| Free | €0 | €1.50 | -€1.50 | N/A (Conversion-Funnel) |
| Pro | €24.99 | €3.80 | **€21.19 (85%)** | 1 (sofort profitabel) |
| Enterprise | €49.99 | €5.00 | **€44.99 (90%)** | 1 (sofort profitabel) |

### Revenue-Projektionen:

| Szenario | Free | Pro | Enterprise | MRR | ARR |
|----------|------|-----|-----------|-----|-----|
| Launch (100 User) | 70 | 25 | 5 | €875 | €10.5K |
| 6 Monate (1K User) | 600 | 320 | 80 | €12K | €144K |
| 1 Jahr (5K User) | 3000 | 1600 | 400 | €60K | €720K |
| 2 Jahre (20K User) | 12000 | 6400 | 1600 | €240K | €2.88M |

### Conversion-Raten (Ziel):
- Free → Pro: **8-12%** (Branchendurchschnitt für B2B SaaS: 5-10%)
- Pro → Enterprise: **5-8%**
- Free Churn: ~15%/Monat (normal für Free-Tier)
- Pro Churn: <5%/Monat (Ziel)

---

## 5. Testphase-Strategie

### Empfehlung: 14-Tage Pro-Trial (Feature-limitiert, nicht zeit-limitiert)

- Neuer User startet im **Free Tier** (kein Zeitdruck)
- **"14 Tage Pro gratis testen"** Button prominent im Dashboard
- Trial aktiviert alle Pro-Features für 14 Tage
- **Keine Kreditkarte** für Trial erforderlich
- Nach 14 Tagen: sanfter Downgrade zu Free mit Hinweis auf verlorene Features
- **Upgrade-Nudges:** "Du hast heute 8 AI-Drafts genutzt — mit Pro sind es unbegrenzt"

### Warum Feature-limitiert statt zeit-limitiert:
- User behält Zugang zur App (kein Verlustgefühl)
- Erlebt den Unterschied zwischen Free und Pro
- Conversion durch Feature-Gap, nicht durch Zeitdruck

---

## 6. Bequemlichkeit für den Nutzer

### Onboarding-Flow:
1. **Sign Up** mit Google/Microsoft (1-Klick OAuth)
2. **Gmail/Outlook verbinden** (2. Klick)
3. **Inbox sofort sichtbar** (keine Wartezeit)
4. **Pro-Trial anbieten** nach 3 Tagen Nutzung (nicht sofort)

### Payment:
- **Stripe Integration** — Kreditkarte, SEPA, Apple Pay
- **Jahres-Upgrade** wird prominent beworben (20% Rabatt)
- **Kündigung** jederzeit möglich, wirksam zum Ende der Laufzeit
- **Downgrade** automatisch — kein Datenverlust, Features werden eingeschränkt

### Transparenz:
- Pricing-Page öffentlich zugänglich
- Keine versteckten Kosten
- Feature-Vergleichstabelle auf der Website
- "FAQ" mit klaren Antworten zu Limits

---

## 7. Usage-Based Komponenten (Optional, Phase 2)

### AI-Credit-System:
- **Pro Tier:** 500 AI-Credits/Monat inklusive
- **Enterprise:** Unbegrenzt
- **Extra Credits:** €0.05/Credit nachkaufbar
- 1 Credit = 1 AI-Draft ODER 10 Scorings ODER 1 Todo-Extraktion ODER 1 Chat-Frage

### Vorteil:
- Verhindert Missbrauch im Pro-Tier
- Zusätzliche Revenue-Quelle
- Fair-Use ohne harte Limits

### Nachteil:
- Komplexität für den User
- "Pay-as-you-go" Angst
- **Empfehlung:** Erst ab Phase 2 einführen, wenn Usage-Daten vorliegen

---

## 8. Zusammenfassung & Empfehlung

| Aspekt | Empfehlung |
|--------|-----------|
| **Pricing-Modell** | Freemium mit 3 Tiers |
| **Pro-Preis** | €24.99/Monat (€19.99 jährlich) |
| **Enterprise-Preis** | €49.99/Monat (€39.99 jährlich) |
| **Trial** | 14 Tage Pro, feature-limitiert, keine Kreditkarte |
| **Differentiator** | AI-Features + Multi-Integration + CEO-Fokus |
| **Monetization-Start** | Sofort mit Free + Pro, Enterprise ab 500 User |
| **Payment** | Stripe, monatlich + jährlich |
| **Break-Even** | Pro-Tier ab User #1 profitabel |

### Nexaro positioniert sich als Premium-Tool für CEOs:
- **Günstiger als Superhuman** ($30) bei **mehr Features** (Multi-Integration)
- **Teurer als Spark** ($9.99) aber **deutlich mehr Wert** (AI + Unified Inbox)
- **Einzigartig:** Keine andere App kombiniert Email + Slack + Teams + AI-Priorisierung + Todo-Extraktion

---

*Erstellt am 12. März 2026 — Nexaro AI-F2 Pricing-Strategie*
