"""
pii_scrubber.py

Python PII scrubber for the Nexaro AI pipeline.
Uses Microsoft Presidio when available, with a regex-only fallback.

Anonymizes text before sending to external LLM APIs (Gemini, OpenAI).
The mapping MUST NEVER be logged, stored, or returned in API responses.
It lives only in the scope of the request handler.

Usage:
    from pii_scrubber import scrub_text, restore_text

    anonymized, mapping = scrub_text("Hallo Max Mustermann, ...")
    # ... call LLM with anonymized text ...
    result = restore_text(llm_output, mapping)

Round-trip test:
    original = "Hallo Max Mustermann, dein Vertrag #V-2024-991 ueber EUR 45.000 wurde geprueft."
    anon, mapping = scrub_text(original)
    assert restore_text(anon, mapping) == original
"""

import re
from typing import Optional

try:
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_analyzer.nlp_engine import NlpEngineProvider

    PRESIDIO_AVAILABLE = True
except ImportError:  # pragma: no cover
    PRESIDIO_AVAILABLE = False


# ---------------------------------------------------------------------------
# Regex-only fallback (used when Presidio is not installed)
# ---------------------------------------------------------------------------

_FALLBACK_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    # IBAN
    ("SECRET", re.compile(r"\b[A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){2,6}\d{1,4}\b")),
    # Contract / project numbers (#V-2024-991)
    ("SECRET", re.compile(r"#[A-Z]-\d{4}-\d+")),
    # Tax numbers (12/345/67890)
    ("SECRET", re.compile(r"\b\d{2}/\d{3}/\d{5}\b")),
    # Email addresses
    ("EMAIL", re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b")),
    # Phone numbers (AT/DE/CH)
    (
        "PHONE",
        re.compile(
            r"(?:\+43|\+49|\+41|0043|0049|0041)\s?[\d\s\-/]{7,20}"
            r"|\b0\d{2,4}[\s\-/]?\d{3,10}(?:[\s\-/]\d{2,5})?(?=\D|$)"
        ),
    ),
    # Money amounts
    (
        "AMOUNT",
        re.compile(
            r"(?:EUR|USD|CHF|GBP|€|\$|£)\s*[\d.,]+(?: ?[kKmMbB](?:io\.?|rd\.?)?)?(,-)?"
            r"|[\d.,]+(?: ?[kKmMbB](?:io\.?|rd\.?)?)?\s*(?:EUR|USD|CHF|GBP|€|\$|£|Mio\.?|Mrd\.?)"
        ),
    ),
    # Full names (First + Last, both capitalised)
    (
        "PERSON",
        re.compile(
            r"(?:(?:Dr|Prof|Mag|Ing|DI|Dkfm)\.?\s+)?"
            r"[A-ZÄÖÜ][a-zäöüß]{1,20}\s+(?:[A-ZÄÖÜ][a-zäöüß]+-)?[A-ZÄÖÜ][a-zäöüß]{1,20}"
        ),
    ),
]


def _fallback_scrub(text: str) -> tuple[str, dict[str, str]]:
    """Regex-only PII scrubbing — used when Presidio is not installed."""
    mapping: dict[str, str] = {}
    value_to_placeholder: dict[str, str] = {}
    counters: dict[str, int] = {}

    for category, pattern in _FALLBACK_PATTERNS:

        def make_replacer(cat: str) -> re.Pattern[str]:
            def replacer(m: re.Match[str]) -> str:
                val = m.group(0).strip()
                if not val:
                    return m.group(0)
                if val in value_to_placeholder:
                    return value_to_placeholder[val]
                counters[cat] = counters.get(cat, 0) + 1
                placeholder = f"[{cat}_{counters[cat]}]"
                value_to_placeholder[val] = placeholder
                mapping[placeholder] = val
                return placeholder

            return replacer  # type: ignore[return-value]

        text = pattern.sub(make_replacer(category), text)

    return text, mapping


# ---------------------------------------------------------------------------
# Presidio-based scrubbing
# ---------------------------------------------------------------------------

# Map Presidio entity types → our placeholder categories (matching TS convention)
_ENTITY_CATEGORY_MAP: dict[str, str] = {
    "PERSON": "PERSON",
    "EMAIL_ADDRESS": "EMAIL",
    "PHONE_NUMBER": "PHONE",
    "ORGANIZATION": "ORG",
    "LOCATION": "LOCATION",
    "IBAN_CODE": "SECRET",
    "CREDIT_CARD": "SECRET",
    "NRP": "SECRET",
    "AMOUNT": "AMOUNT",
    "CONTRACT_ID": "SECRET",
}

_analyzer_instance: Optional["AnalyzerEngine"] = None


def _build_analyzer() -> "AnalyzerEngine":
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_analyzer.nlp_engine import NlpEngineProvider

    # Try German spaCy model first, fall back to English-only
    try:
        configuration = {
            "nlp_engine_name": "spacy",
            "models": [
                {"lang_code": "de", "model_name": "de_core_news_sm"},
                {"lang_code": "en", "model_name": "en_core_web_sm"},
            ],
        }
        provider = NlpEngineProvider(nlp_configuration=configuration)
        nlp_engine = provider.create_engine()
        languages = ["de", "en"]
    except Exception:
        nlp_engine = None
        languages = ["en"]

    analyzer = AnalyzerEngine(
        nlp_engine=nlp_engine,
        supported_languages=languages,
    )

    # Custom AMOUNT recognizer (regex-based, works for both languages)
    amount_recognizer = PatternRecognizer(
        supported_entity="AMOUNT",
        patterns=[
            Pattern(
                name="amount_with_currency",
                regex=(
                    r"(?:EUR|USD|CHF|GBP|€|\$|£)\s*[\d,.]+(?:\s*[kKmMbB](?:io|rd)?\.?)?(,-)?"
                    r"|[\d,.]+(?:\s*[kKmMbB](?:io|rd)?\.?)?\s*(?:EUR|USD|CHF|GBP|€|\$|£|Mio\.?|Mrd\.?)"
                ),
                score=0.85,
            )
        ],
        supported_language="de",
    )
    analyzer.registry.add_recognizer(amount_recognizer)

    # Custom CONTRACT_ID recognizer (#V-2024-991, #P-2023-001)
    contract_recognizer = PatternRecognizer(
        supported_entity="CONTRACT_ID",
        patterns=[
            Pattern(
                name="contract_id",
                regex=r"#[A-Z]-\d{4}-\d+",
                score=0.95,
            )
        ],
        supported_language="de",
    )
    analyzer.registry.add_recognizer(contract_recognizer)

    return analyzer


def _get_analyzer() -> "AnalyzerEngine":
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = _build_analyzer()
    return _analyzer_instance


def _presidio_scrub(text: str) -> tuple[str, dict[str, str]]:
    analyzer = _get_analyzer()
    entities = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "ORGANIZATION", "LOCATION",
        "IBAN_CODE", "CREDIT_CARD", "NRP", "AMOUNT", "CONTRACT_ID",
    ]

    try:
        results = analyzer.analyze(text=text, language="de", entities=entities)
    except Exception:
        results = analyzer.analyze(text=text, language="en", entities=entities)

    if not results:
        return text, {}

    # Sort by start position; resolve overlaps by keeping the longer match
    results.sort(key=lambda r: r.start)
    non_overlapping = []
    last_end = 0
    for result in results:
        if result.start >= last_end:
            non_overlapping.append(result)
            last_end = result.end

    mapping: dict[str, str] = {}
    value_to_placeholder: dict[str, str] = {}
    counters: dict[str, int] = {}

    anonymized = ""
    last_end = 0

    for result in non_overlapping:
        anonymized += text[last_end : result.start]
        original = text[result.start : result.end]
        trimmed = original.strip()

        if trimmed in value_to_placeholder:
            anonymized += value_to_placeholder[trimmed]
        else:
            category = _ENTITY_CATEGORY_MAP.get(result.entity_type, result.entity_type)
            counters[category] = counters.get(category, 0) + 1
            placeholder = f"[{category}_{counters[category]}]"
            value_to_placeholder[trimmed] = placeholder
            mapping[placeholder] = trimmed
            anonymized += placeholder

        last_end = result.end

    anonymized += text[last_end:]
    return anonymized, mapping


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


def scrub_text(text: str) -> tuple[str, dict[str, str]]:
    """
    Replaces PII in text with numbered placeholders.

    Returns:
        (anonymized_text, mapping) where mapping is {placeholder: original_value}

    The mapping MUST NEVER be logged, stored, or returned in API responses.
    It lives only in the scope of the request handler.
    """
    if not text or not text.strip():
        return text, {}

    if not PRESIDIO_AVAILABLE:
        return _fallback_scrub(text)

    try:
        return _presidio_scrub(text)
    except Exception:
        # Graceful fallback to regex-only scrubbing
        return _fallback_scrub(text)


def restore_text(anonymized: str, mapping: dict[str, str]) -> str:
    """
    Replaces numbered placeholders back with the original values.

    Round-trip: restore_text(*scrub_text(original)) == original
    """
    if not anonymized or not mapping:
        return anonymized

    restored = anonymized
    for placeholder, original in mapping.items():
        restored = restored.replace(placeholder, original)
    return restored


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_input = (
        "Hallo Max Mustermann, dein Vertrag #V-2024-991 ueber EUR 45.000 wurde geprueft."
    )

    anonymized, mapping = scrub_text(test_input)
    print(f"Original:   {test_input}")
    print(f"Anonymized: {anonymized}")
    print(f"Mapping:    {mapping}")

    restored = restore_text(anonymized, mapping)
    print(f"Restored:   {restored}")

    assert restored == test_input, f"Round-trip FAILED:\n  got: {restored!r}\n  exp: {test_input!r}"
    print("\nRound-trip test PASSED.")

    # Test duplicate values get the same placeholder
    test_dup = "max@firma.at hat eine Nachricht von max@firma.at bekommen."
    anon2, map2 = scrub_text(test_dup)
    assert anon2.count("[EMAIL_1]") == 2, "Duplicate values must get the same placeholder"
    print("Duplicate value test PASSED.")
