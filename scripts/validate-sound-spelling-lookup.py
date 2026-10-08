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
    if not words_text.endswith(SUFFIX):
        raise ValueError("Unexpected generated lookup wrapper")
    return json.loads(ids_text), json.loads(words_text[:-len(SUFFIX)])


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
    errors = []
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
    }
    for word, expected_id in expected_patterns.items():
        encoded = words.get(word, [])
        actual_ids = {pattern_ids[encoded[offset]] for offset in range(0, len(encoded), 2)}
        if expected_id not in actual_ids:
            errors.append(f"{word!r} is missing expected pattern {expected_id!r}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(words):,} CMUdict headwords; all {len(coverage_words)} teacher regression words have reviewed mappings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
