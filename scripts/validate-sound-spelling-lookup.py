#!/usr/bin/env python3
"""Validate the generated CMUdict lookup and its teacher-word regression sample."""

import ast
import json
import re
import sys
from pathlib import Path


PATTERN = re.compile(
    r"\{ id: '([^']+)', sound: '([^']+)', grapheme: '([^']+)', "
    r"label: '([^']+)', words: (\[[^\n]+\]) \},"
)
PREFIX = "window.SpellingSoundLookup=Object.freeze({patternIds:Object.freeze("
MIDDLE = "),words:Object.freeze("
SUFFIX = ")});\n"
SILENT_PREFIX = "window.SpellingSilentLetterLookup=Object.freeze({ruleIds:Object.freeze("


def indexes_for(word, grapheme, requested_start):
    indexes = []
    cursor = requested_start
    for piece_index, piece in enumerate(grapheme.casefold().split("_")):
        start = word.find(piece, cursor)
        if start < 0 or (piece_index == 0 and start != requested_start):
            return []
        indexes.extend(range(start, start + len(piece)))
        cursor = start + len(piece)
    return indexes


def load_lookup(path):
    text = Path(path).read_text(encoding="utf-8")
    body = text.split(PREFIX, 1)[1]
    ids_text, words_text = body.split(MIDDLE, 1)
    if SUFFIX not in words_text:
        raise ValueError("Unexpected generated lookup wrapper")
    words_payload, _ = words_text.split(SUFFIX, 1)
    return json.loads(ids_text), json.loads(words_payload)


def load_silent_lookup(path):
    text = Path(path).read_text(encoding="utf-8")
    body = text.split(SILENT_PREFIX, 1)[1]
    rule_ids_text, words_text = body.split(MIDDLE, 1)
    words_payload, _ = words_text.split(SUFFIX, 1)
    return json.loads(rule_ids_text), json.loads(words_payload)


def main():
    bank_path = Path(sys.argv[1] if len(sys.argv) > 1 else "static/sound-spelling-bank.js")
    lookup_path = Path(sys.argv[2] if len(sys.argv) > 2 else "static/sound-spelling-lookup.js")
    coverage_path = Path(sys.argv[3] if len(sys.argv) > 3 else "scripts/data/teacher-word-coverage.txt")
    patterns = []
    for match in PATTERN.finditer(bank_path.read_text(encoding="utf-8")):
        pattern_id, sound, grapheme, label, words_text = match.groups()
        ast.literal_eval(words_text)
        patterns.append({"id": pattern_id, "grapheme": grapheme})
    pattern_ids, words = load_lookup(lookup_path)
    silent_rule_ids, silent_words = load_silent_lookup(lookup_path)
    errors = []
    expected_silent_rule_ids = [
        "terminal-mb", "terminal-mn", "terminal-gn", "terminal-lk", "terminal-bt",
        "split-a-e", "split-i-e", "split-o-e",
    ]
    if silent_rule_ids != expected_silent_rule_ids:
        errors.append("silent-letter rule IDs do not match the reviewed runtime rules")
    if pattern_ids != [pattern["id"] for pattern in patterns]:
        errors.append("lookup pattern IDs do not match the reviewed bank order")
    if len(words) < 100_000:
        errors.append(f"lookup contains only {len(words):,} mapped headwords")
    for word, encoded in words.items():
        if not re.fullmatch(r"[a-z]+", word):
            errors.append(f"invalid lookup headword: {word!r}")
            continue
        if not isinstance(encoded, list) or len(encoded) % 2:
            errors.append(f"invalid encoded mappings for {word!r}")
            continue
        claimed = set()
        for offset in range(0, len(encoded), 2):
            pattern_index, start = encoded[offset:offset + 2]
            if not isinstance(pattern_index, int) or not 0 <= pattern_index < len(patterns):
                errors.append(f"invalid pattern index for {word!r}: {pattern_index!r}")
                break
            if not isinstance(start, int) or start < 0:
                errors.append(f"invalid character start for {word!r}: {start!r}")
                break
            indexes = indexes_for(word, patterns[pattern_index]["grapheme"], start)
            if not indexes:
                errors.append(f"{word!r} does not contain {patterns[pattern_index]['grapheme']!r} at {start}")
                break
            if claimed.intersection(indexes):
                errors.append(f"overlapping lookup mappings for {word!r}")
                break
            claimed.update(indexes)
        if len(errors) >= 25:
            break
    for word, encoded in silent_words.items():
        if word not in words:
            errors.append(f"silent-letter annotation has no mapped headword: {word!r}")
            continue
        if not isinstance(encoded, list) or len(encoded) % 2:
            errors.append(f"invalid silent-letter annotations for {word!r}")
            continue
        annotated_indexes = set()
        for offset in range(0, len(encoded), 2):
            index, rule_index = encoded[offset:offset + 2]
            if not isinstance(index, int) or not 0 <= index < len(word):
                errors.append(f"invalid silent-letter index for {word!r}: {index!r}")
                break
            if not isinstance(rule_index, int) or not 0 <= rule_index < len(silent_rule_ids):
                errors.append(f"invalid silent-letter rule for {word!r}: {rule_index!r}")
                break
            if index in annotated_indexes:
                errors.append(f"duplicate silent-letter index for {word!r}: {index}")
                break
            annotated_indexes.add(index)
    coverage_words = [line.strip().casefold() for line in coverage_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    missing = [word for word in coverage_words if word not in words]
    if missing:
        errors.append("teacher regression words missing from lookup: " + ", ".join(missing))
    expected_patterns = {
        "gold": "long-o-open", "hold": "long-o-open", "bolt": "long-o-open", "jolt": "long-o-open",
        "world": "or-as-er", "work": "or-as-er", "worm": "or-as-er", "worst": "or-as-er",
        "glove": "short-u-o", "dove": "short-u-o", "cover": "short-u-o", "shovel": "short-u-o",
        "month": "short-u-o", "money": "short-u-o", "honey": "short-u-o", "won": "short-u-o",
        "mother": "short-u-o", "brother": "short-u-o", "other": "short-u-o", "nothing": "short-u-o",
        "break": "consonant-k", "steak": "consonant-k", "outbreak": "consonant-k",
        "rowed": "ow-snow",
        "walk": "consonant-k", "talk": "consonant-k", "stalk": "consonant-k",
        "balm": "consonant-m", "palm": "consonant-m", "calm": "consonant-m",
        "head": "consonant-d", "dead": "consonant-d", "bread": "consonant-d",
        "group": "consonant-p", "soup": "consonant-p",
        "eight": "consonant-t", "thought": "consonant-t", "bought": "consonant-t",
    }
    for word, expected_id in expected_patterns.items():
        encoded = words.get(word, [])
        actual_ids = {pattern_ids[encoded[offset]] for offset in range(0, len(encoded), 2)}
        if expected_id not in actual_ids:
            errors.append(f"{word!r} is missing expected pattern {expected_id!r}")
    silent_letter_expectations = {
        "lamb": {"short-a", "consonant-m"},
        "sign": {"long-i-open"},
        "signed": {"long-i-open"},
        "doubt": {"ou-cloud"},
        "debt": {"short-e"},
        "hymn": {"y-short-i", "consonant-m"},
        "folk": {"long-o-open"},
        "makes": {"long-a-split", "consonant-k"},
        "safely": {"long-a-split", "consonant-f"},
    }
    for word, expected_ids in silent_letter_expectations.items():
        encoded = words.get(word, [])
        actual_ids = {pattern_ids[encoded[offset]] for offset in range(0, len(encoded), 2)}
        missing_ids = expected_ids - actual_ids
        if missing_ids:
            errors.append(f"{word!r} is missing expected silent-letter patterns: {', '.join(sorted(missing_ids))}")
    expected_silent_letters = {
        "lamb": (3, "terminal-mb"), "lambs": (3, "terminal-mb"),
        "hymn": (3, "terminal-mn"), "autumn": (5, "terminal-mn"),
        "sign": (2, "terminal-gn"), "signed": (2, "terminal-gn"),
        "folk": (2, "terminal-lk"), "folks": (2, "terminal-lk"),
        "doubt": (3, "terminal-bt"), "doubts": (3, "terminal-bt"),
        "home": (3, "split-o-e"), "hoped": (3, "split-o-e"),
    }
    for word, expected in expected_silent_letters.items():
        encoded = silent_words.get(word, [])
        actual = {
            (encoded[offset], silent_rule_ids[encoded[offset + 1]])
            for offset in range(0, len(encoded), 2)
        }
        if expected not in actual:
            errors.append(f"{word!r} is missing silent-letter annotation {expected!r}")
    for word in ("milk", "silk", "bulk"):
        encoded = silent_words.get(word, [])
        actual_rules = {silent_rule_ids[encoded[offset + 1]] for offset in range(0, len(encoded), 2)}
        if "terminal-lk" in actual_rules:
            errors.append(f"{word!r} incorrectly treats its pronounced l as silent")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(
        f"Validated {len(words):,} CMUdict headwords and {len(silent_words):,} annotated silent-letter headwords; "
        f"all {len(coverage_words)} teacher regression words have reviewed mappings."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
