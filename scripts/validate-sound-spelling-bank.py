#!/usr/bin/env python3
"""Validate the hand-reviewed word sets in sound-spelling-bank.js."""

import ast
import re
import sys
from pathlib import Path


PATTERN = re.compile(
    r"\{ id: '([^']+)', sound: '([^']+)', grapheme: '([^']+)', "
    r"label: '([^']+)', words: (\[[^\n]+\]) \},"
)


def contains_grapheme(word, grapheme):
    cursor = 0
    for piece in grapheme.casefold().split("_"):
        index = word.casefold().find(piece, cursor)
        if index < 0:
            return False
        cursor = index + len(piece)
    return True


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "static/sound-spelling-bank.js")
    text = source.read_text(encoding="utf-8")
    records = []
    errors = []
    for match in PATTERN.finditer(text):
        pattern_id, sound, grapheme, label, words_text = match.groups()
        words = ast.literal_eval(words_text)
        records.append((pattern_id, words))
        normalized = [str(word).strip().casefold() for word in words]
        if len(words) < 20:
            errors.append(f"{pattern_id}: only {len(words)} examples")
        if len(set(normalized)) != len(normalized):
            errors.append(f"{pattern_id}: duplicate examples")
        missing = [word for word in normalized if not contains_grapheme(word, grapheme)]
        if missing:
            errors.append(f"{pattern_id}: examples missing {grapheme!r}: {', '.join(missing)}")
        if not sound or not label:
            errors.append(f"{pattern_id}: missing sound or label")
    ids = [pattern_id for pattern_id, _ in records]
    if len(set(ids)) != len(ids):
        errors.append("duplicate pattern IDs")
    if not records:
        errors.append("no patterns parsed")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(records)} patterns and {sum(len(words) for _, words in records):,} pattern-word associations.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
