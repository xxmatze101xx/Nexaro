CLAUDE.md — Nexaro Agent Briefing (Stand: Maerz 2026)

Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
Dein Ziel ist es, die Unified Inbox SaaS-App fuer CEOs zu perfektionieren.
Du liest diese Datei und arbeitest den Backlog ab.


Was ist Nexaro?
Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer
KI-priorisierten Oberflaeche fuer Executives.

Tech Stack
LayerTechnologieFrontendNext.js (App Router), TypeScript, Tailwind CSSBackend/DBFirebase (Firestore, Auth, Storage)AI PipelinePython (tools/), score_importance.pyIntegrationsGmail API, Google Calendar API, Slack API, MS Graph

Invarianten — Absolute Regeln

TypeScript strict — Keine any, keine ignorierten Fehler.
Tailwind CSS — Kein inline CSS, nur Tailwind-Klassen.
Responsive — Layout muss auf verschiedenen Bildschirmgroessen funktionieren.
Nach jedem Task: taskstodo.md und progress.md aktualisieren.


PHASE 1 — Email-Detailansicht: Mehr Platz fuer den Email-Body
UI-P1: Email-Body bekommt zu wenig vertikalen Platz

Problem: Wenn man im Dashboard eine Nachricht anklickt, oeffnet sich rechts das Detail-Panel. Der eigentliche Email-Inhalt (Body) wird in einem viel zu kleinen Bereich angezeigt — oft nur 200-300px Hoehe. Das ist fuer laengere Mails komplett unbrauchbar. Der CEO muss staendig scrollen um eine normale Mail zu lesen. Das Layout teilt den verfuegbaren Platz schlecht auf: Der Header (Absender, Betreff, Datum) und der untere Bereich (AI Draft Panel, Reply-Bereich) nehmen unverhältnismäßig viel Raum ein, waehrend der eigentliche Mail-Content — also das was der User lesen will — eingequetscht wird.
Task:

Oeffne die relevanten Dateien fuer das Message-Detail-Panel. Wahrscheinlich:

src/components/message-card.tsx (oder eine aehnliche Detail-Komponente)
src/components/ai-draft-panel.tsx
src/components/compose-panel.tsx
src/app/page.tsx (Dashboard-Layout mit dem rechten Panel)


Analysiere das aktuelle Layout des rechten Panels. Identifiziere welche Bereiche wie viel Platz bekommen:

Header-Bereich (Absender, Betreff, Datum, Source-Badge)
Email-Body (der eigentliche Inhalt)
AI Draft Panel ("Generate Draft" Button + Draft-Anzeige)
Reply-Bereich


Aendere das Layout so, dass der Email-Body den groessten Anteil des verfuegbaren Platzes bekommt:

Der Email-Body-Container soll flex-1 oder flex-grow bekommen und den gesamten verbleibenden vertikalen Raum ausfuellen
Der Body soll overflow-y: auto haben damit man bei langen Mails innerhalb des Bodies scrollen kann
Setze eine min-height von mindestens 400px oder 50vh fuer den Body-Bereich
Der Header oben soll kompakt bleiben (nicht mehr als noetig)
Der AI-Draft/Reply-Bereich unten soll eine feste oder maximale Hoehe haben und nicht den Body-Bereich verdraengen


Das gesamte rechte Panel soll als Flex-Column aufgebaut sein:



     [Header — flex-shrink-0, kompakt]
     [Email-Body — flex-1, overflow-y-auto, nimmt allen Restplatz]
     [AI Draft / Reply — flex-shrink-0, max-h begrenzt, eigener Scroll]

Stelle sicher, dass der AI-Draft-Bereich und Reply-Bereich bei Bedarf einen eigenen Scrollbereich haben (overflow-y-auto mit max-h-[200px] oder aehnlich), damit sie nicht den Body-Bereich auffressen wenn ein langer Draft generiert wird.
Teste mit verschiedenen Mail-Laengen: kurze Mails (1-2 Saetze), mittlere Mails (1 Absatz), lange Mails (Newsletter mit Bildern und viel Text).


Done wenn:

Der Email-Body nimmt mindestens 50% des verfuegbaren vertikalen Platzes im Detail-Panel ein
Lange Mails sind innerhalb des Body-Bereichs scrollbar ohne dass das gesamte Panel scrollt
Der AI-Draft/Reply-Bereich ist sichtbar aber begrenzt (max 200-250px Hoehe)
Der Header bleibt kompakt oben
Das Layout funktioniert auf 1080p und 1440p Bildschirmen
npm run build laeuft ohne Fehler




Naechste Schritte nach Phase 1

Ueberpruefen ob das Layout auch im Compose-Modus (Neue Nachricht) gut aussieht
Mobile Responsive Version des Detail-Panels anpassen
Dark Mode Kompatibilitaet pruefen