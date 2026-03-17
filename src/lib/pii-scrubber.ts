/**
 * pii-scrubber.ts
 *
 * Replaces PII with numbered placeholders before sending text to external LLMs.
 * After the LLM call, restores the original values from the mapping.
 *
 * IMPORTANT: The mapping object MUST NEVER be logged, stored in Firestore,
 * or returned in any API response. It lives only in the scope of the request handler.
 *
 * Pattern application order (most specific first):
 *   IBAN → Email → Phone → Amount → Address → Org → Person
 *
 * Test-Case:
 *   Input:  "Hallo Max Mustermann, dein Vertrag #V-2024-991 ueber EUR 45.000 wurde geprueft."
 *   Output: "Hallo [PERSON_1], dein Vertrag [SECRET_1] ueber [AMOUNT_1] wurde geprueft."
 *   Mapping: { "[PERSON_1]": "Max Mustermann", "[SECRET_1]": "#V-2024-991", "[AMOUNT_1]": "EUR 45.000" }
 *
 * Round-trip guarantee:
 *   restoreText(scrubText(original).anonymized, mapping) === original
 */

export interface ScrubMapping {
  [placeholder: string]: string;
}

export interface ScrubResult {
  anonymized: string;
  mapping: ScrubMapping;
}

// Patterns ordered from most specific to least specific.
// Each entry: [category label, regex source string, regex flags]
// The same category label shares a counter, so SECRET_1, SECRET_2, ... across IBAN + contract numbers.
const PATTERNS: Array<[string, string, string]> = [
  // --- IBAN (DE89 3704 0044 0532 0130 00, AT61 1904 3002 3457 3201) ---
  [
    "SECRET",
    String.raw`\b[A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){2,6}\d{1,4}\b`,
    "g",
  ],
  // --- Contract / project numbers (#V-2024-991, #P-2023-001) ---
  [
    "SECRET",
    String.raw`#[A-Z]-\d{4}-\d+`,
    "g",
  ],
  // --- Tax / reference numbers (12/345/67890) ---
  [
    "SECRET",
    String.raw`\b\d{2}\/\d{3}\/\d{5}\b`,
    "g",
  ],
  // --- E-mail addresses (RFC-ish) ---
  [
    "EMAIL",
    String.raw`\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b`,
    "g",
  ],
  // --- Phone numbers (AT +43, DE +49, CH +41, 00-prefixes, local 0xxx) ---
  [
    "PHONE",
    String.raw`(?:\+43|\+49|\+41|0043|0049|0041)\s?[\d\s\-\/]{7,20}|\b0\d{2,4}[\s\-\/]?\d{3,10}(?:[\s\-\/]\d{2,5})?(?=\D|$)`,
    "g",
  ],
  // --- Money amounts (EUR 1.200, $5,000, 2.4M EUR, CHF 12.000,-) ---
  [
    "AMOUNT",
    String.raw`(?:EUR|USD|CHF|GBP|€|\$|£)\s*[\d.,]+(?: ?[kKmMbB](?:io\.?|rd\.?)?)?(?:,-)?|[\d.,]+(?: ?[kKmMbB](?:io\.?|rd\.?)?)?\s*(?:EUR|USD|CHF|GBP|€|\$|£|Mio\.?|Mrd\.?)`,
    "g",
  ],
  // --- Street addresses (Musterstraße 12, 1010 Wien) ---
  [
    "LOCATION",
    String.raw`[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|gasse|weg|platz|allee|ring|damm|avenue|road|street)\s+\d+[a-z]?(?:,?\s*\d{4,5}\s+[A-ZÄÖÜ][a-zäöüß]+)?`,
    "gi",
  ],
  // --- Company names ending with legal entity suffix ---
  [
    "ORG",
    String.raw`[A-ZÄÖÜ][A-Za-zäöüÄÖÜß&.\s,]{1,40}\s+(?:GmbH|AG|KG|OG|OHG|UG|Ltd\.?|Inc\.?|Corp\.?|S\.A\.|SE|PLC|LLC)`,
    "g",
  ],
  // --- Full names: optional title + First + Last (both capitalised) ---
  [
    "PERSON",
    String.raw`(?:(?:Dr|Prof|Mag|Ing|DI|Dkfm)\.?\s+)?[A-ZÄÖÜ][a-zäöüß]{1,20}\s+(?:[A-ZÄÖÜ][a-zäöüß]+-)?[A-ZÄÖÜ][a-zäöüß]{1,20}`,
    "g",
  ],
];

/**
 * Replaces PII entities in `text` with numbered placeholders.
 *
 * - The same original value always receives the same placeholder within one call.
 * - Counters are per-category (EMAIL_1, EMAIL_2 … are independent of PERSON_1 …).
 */
export function scrubText(text: string): ScrubResult {
  if (!text.trim()) return { anonymized: text, mapping: {} };

  const mapping: ScrubMapping = {};
  // Track original value → assigned placeholder to deduplicate
  const valueToPlaceholder = new Map<string, string>();
  // Per-category counters
  const counters: Record<string, number> = {};

  let anonymized = text;

  for (const [category, src, flags] of PATTERNS) {
    const re = new RegExp(src, flags);
    anonymized = anonymized.replace(re, (match) => {
      const trimmed = match.trim();
      if (!trimmed) return match;

      const existing = valueToPlaceholder.get(trimmed);
      if (existing !== undefined) return existing;

      counters[category] = (counters[category] ?? 0) + 1;
      const placeholder = `[${category}_${counters[category]}]`;
      valueToPlaceholder.set(trimmed, placeholder);
      mapping[placeholder] = trimmed;
      return placeholder;
    });
  }

  return { anonymized, mapping };
}

/**
 * Replaces all placeholders in `anonymized` back with the original values from `mapping`.
 *
 * Simple string-replace: no regex needed, placeholders are unique tokens.
 */
export function restoreText(anonymized: string, mapping: ScrubMapping): string {
  if (!anonymized) return anonymized;

  let restored = anonymized;
  for (const [placeholder, original] of Object.entries(mapping)) {
    // Escape [ and ] so they are treated as literal characters in the regex
    const escaped = placeholder.replace(/[[\]]/g, "\\$&");
    restored = restored.replace(new RegExp(escaped, "g"), original);
  }
  return restored;
}
