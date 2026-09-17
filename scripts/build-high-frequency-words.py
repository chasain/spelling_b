#!/usr/bin/env python3
"""Build the bundled 100-level high-frequency word course."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
GENERAL = ROOT / "scripts" / "data" / "moby-freq.txt"
INTERNET = ROOT / "scripts" / "data" / "moby-freq-int.txt"
OUTPUT = ROOT / "static" / "high-frequency-words.json"

# Moby's Internet list includes early-network abbreviations, malformed
# contractions, and a handful of terms that are not suitable for this app's
# elementary-school audience. Skip those while preserving source rank order.
SKIP = {
    "adult", "alcohol", "apr", "arpa", "ass", "att", "aug", "beer", "berkeley", "bitnet", "bitch",
    "ca", "cant", "christian", "com", "comp", "couldnt", "cs", "damn",
    "dave", "david", "dec", "didnt", "doesnt", "dont", "drug", "edu", "etc", "feb", "fuck", "gay", "god",
    "gun", "hadnt", "hasnt", "havent", "hell", "hes", "hp", "im", "inc", "isnt",
    "jan", "jesus", "kill", "lets", "ll", "mar", "mike", "misc", "mr", "murder", "non", "nude", "oct", "pc", "pm", "porn",
    "rape", "rec", "religion", "religious", "rutgers", "sep", "sex", "shes", "shit", "smoke", "steve",
    "suicide", "thats", "theyre", "uk", "unix", "uunet", "ve", "war",
    "wasnt", "weapon", "werent", "weve", "whats", "wont", "wouldnt",
    "youre", "uucp",
}


def normalize(raw: str) -> str | None:
    word = raw.strip()
    if not re.fullmatch(r"[A-Za-z]+", word):
        return None
    word = word.lower()
    if len(word) == 1 and word not in {"a", "i"}:
        return None
    if word in SKIP:
        return None
    return word


def read_general() -> list[str]:
    lines = GENERAL.read_text(encoding="ascii").splitlines()[1:]
    return [word for line in lines if (word := normalize(line))]


def read_internet() -> list[str]:
    words: list[str] = []
    for line in INTERNET.read_text(encoding="ascii").splitlines()[1:]:
        fields = line.split()
        if len(fields) != 2:
            continue
        word = normalize(fields[1])
        if word:
            words.append(word)
    return words


def unique_ranked_words() -> list[str]:
    words: list[str] = []
    seen: set[str] = set()
    for word in read_general() + read_internet():
        if word not in seen:
            seen.add(word)
            words.append(word)
        if len(words) == 1000:
            return words
    raise RuntimeError(f"only found {len(words)} usable unique words")


def main() -> None:
    words = unique_ranked_words()
    levels = [
        {
            "number": index // 10 + 1,
            "startRank": index + 1,
            "endRank": index + 10,
            "words": words[index : index + 10],
        }
        for index in range(0, len(words), 10)
    ]
    course = {
        "source": "Moby Words II",
        "sourceURL": "https://www.gutenberg.org/files/3201/3201-h/3201-h.htm",
        "license": "Public Domain",
        "description": (
            "A classroom-friendly, de-duplicated selection from the Moby Words II "
            "general-text and Internet frequency lists, preserving source rank order."
        ),
        "levels": levels,
    }
    OUTPUT.write_text(
        json.dumps(course, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(levels)} levels with {len(words)} unique words.")


if __name__ == "__main__":
    main()
