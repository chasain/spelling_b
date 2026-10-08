#!/usr/bin/env python3
"""Build a compact CMUdict word-to-reviewed-pattern lookup from m2m alignments."""

import argparse
import ast
import json
import re
from functools import lru_cache
from pathlib import Path


PATTERN = re.compile(
    r"\{ id: '([^']+)', sound: '([^']+)', grapheme: '([^']+)', "
    r"label: '([^']+)', words: (\[[^\n]+\]) \},"
)

SOUND_PHONES = {
    "/aɪ/": ("AY",), "/aʊ/": ("AW",), "/b/": ("B",),
    "/d/": ("D",), "/dʒ/": ("JH",), "/eɪ/": ("EY",),
    "/f/": ("F",), "/h/": ("HH",), "/iː/": ("IY",),
    "/j/": ("Y",), "/juː/": ("Y", "UW"), "/k/": ("K",),
    "/ks/": ("K", "S"), "/kw/": ("K", "W"), "/l/": ("L",),
    "/m/": ("M",), "/n/": ("N",), "/oʊ/": ("OW",),
    "/p/": ("P",), "/r/": ("R",), "/s/": ("S",),
    "/t/": ("T",), "/tʃ/": ("CH",), "/tʃɚ/": ("CH", "AXR"),
    "/uː/": ("UW",), "/v/": ("V",), "/w/": ("W",),
    "/z/": ("Z",), "/æ/": ("AE",), "/ð/": ("DH",),
    "/ŋ/": ("NG",), "/ŋk/": ("NG", "K"), "/ɑ/": ("AA",),
    "/ɑr/": ("AA", "R"), "/ɔ/": ("AO",), "/ɔr/": ("AO", "R"),
    "/ɔɪ/": ("OY",), "/ə/": ("AX",), "/ɚ/": ("AXR",),
    "/ɛ/": ("EH",), "/ɛr/": ("EH", "R"), "/ɝ/": ("ER",),
    "/ɡ/": ("G",), "/ɪ/": ("IH",), "/ɪr/": ("IH", "R"),
    "/ʃ/": ("SH",), "/ʃən/": ("SH", "AX", "N"),
    "/ʊ/": ("UH",), "/ʌ/": ("AH",),
    "/ʒən/": ("ZH", "AX", "N"), "/θ/": ("TH",),
}

KNOWN_PHONES = {phone for phones in SOUND_PHONES.values() for phone in phones} | {"_"}


def load_patterns(path):
    records = []
    for match in PATTERN.finditer(Path(path).read_text(encoding="utf-8")):
        pattern_id, sound, grapheme, label, words_text = match.groups()
        if sound not in SOUND_PHONES:
            raise ValueError(f"No CMUdict phone translation for {pattern_id}: {sound}")
        records.append({
            "id": pattern_id,
            "sound": sound,
            "phones": SOUND_PHONES[sound],
            "grapheme": grapheme,
            "pieces": tuple(grapheme.split("_")),
            "words": tuple(str(word).casefold() for word in ast.literal_eval(words_text)),
        })
    if not records:
        raise ValueError("No reviewed patterns found")
    return records


def parse_alignment(line):
    if "\t" not in line:
        return None
    left, right = line.split("\t", 1)
    grapheme_chunks = [chunk for chunk in left.strip().strip("|").split("|") if chunk]
    phone_chunks = [chunk for chunk in right.strip().strip("|").split("|") if chunk]
    if len(grapheme_chunks) != len(phone_chunks):
        return None
    letters = [chunk.replace(":", "") for chunk in grapheme_chunks]
    raw_phones = [tuple(chunk.split(":")) for chunk in phone_chunks]
    if any(phone not in KNOWN_PHONES for phones in raw_phones for phone in phones):
        return None
    phones_by_chunk = [tuple(phone for phone in phones if phone != "_") for phones in raw_phones]
    word = "".join(letters)
    if not re.fullmatch(r"[a-z]+", word):
        return None
    phones = tuple(phone for chunk in phones_by_chunk for phone in chunk)
    chunks = []
    letter_cursor = 0
    phone_cursor = 0
    for chunk_letters, chunk_phones in zip(letters, phones_by_chunk):
        chunks.append((letter_cursor, phone_cursor, letter_cursor + len(chunk_letters), phone_cursor + len(chunk_phones)))
        letter_cursor += len(chunk_letters)
        phone_cursor += len(chunk_phones)
    return word, phones, chunks


def split_indexes(word, pieces, start):
    indexes = []
    cursor = start
    for offset, piece in enumerate(pieces):
        location = word.find(piece, cursor)
        if location < 0 or (offset == 0 and location != start):
            return ()
        indexes.extend(range(location, location + len(piece)))
        cursor = location + len(piece)
    return tuple(indexes)


def align_reviewed_patterns(word, phones, chunks, patterns):
    chunk_transitions = {(start_letter, start_phone): (end_letter, end_phone) for start_letter, start_phone, end_letter, end_phone in chunks}
    pattern_candidates = {}
    for pattern_index, pattern in enumerate(patterns):
        first_piece = pattern["pieces"][0]
        start = word.find(first_piece)
        while start >= 0:
            indexes = split_indexes(word, pattern["pieces"], start)
            if len(pattern["pieces"]) > 1 and not (
                len(pattern["pieces"]) == 2
                and all(len(piece) == 1 for piece in pattern["pieces"])
                and len(indexes) == 2
                and indexes[1] == indexes[0] + 2
                and indexes[1] == len(word) - 1
            ):
                indexes = ()
            if indexes:
                key = (start, pattern["phones"])
                pattern_candidates.setdefault(key, []).append((pattern_index, indexes))
            start = word.find(first_piece, start + 1)

    @lru_cache(maxsize=None)
    def best(letter_index, phone_index):
        if letter_index == len(word) and phone_index == len(phones):
            return (0, ())
        options = []

        for (start, candidate_phones), candidates in pattern_candidates.items():
            if start != letter_index or phones[phone_index:phone_index + len(candidate_phones)] != candidate_phones:
                continue
            for pattern_index, indexes in candidates:
                pieces = patterns[pattern_index]["pieces"]
                if len(pieces) == 1:
                    next_letter = letter_index + len(pieces[0])
                else:
                    # A split vowel pattern consumes its first written piece here. The
                    # later silent-e position is reserved in the returned indexes.
                    next_letter = letter_index + len(pieces[0])
                result = best(next_letter, phone_index + len(candidate_phones))
                if result is None:
                    continue
                score = len(indexes) * 100 + len(candidate_phones) * 10 + result[0]
                options.append((score, ((pattern_index, indexes),) + result[1]))

        chunk_end = chunk_transitions.get((letter_index, phone_index))
        if chunk_end:
            result = best(*chunk_end)
            if result is not None:
                options.append(result)

        if letter_index < len(word) and phone_index < len(phones):
            result = best(letter_index + 1, phone_index + 1)
            if result is not None:
                options.append((result[0] - 1, result[1]))

        if letter_index == len(word) - 1 and word[letter_index] == "e":
            result = best(letter_index + 1, phone_index)
            if result is not None:
                options.append((result[0] - 1, result[1]))

        if not options:
            return None
        return max(options, key=lambda item: (item[0], len(item[1])))

    result = best(0, 0)
    if result is None:
        return []
    claimed = set()
    selected = []
    for pattern_index, indexes in sorted(result[1], key=lambda item: (-len(item[1]), item[1][0], item[0])):
        if any(index in claimed for index in indexes):
            continue
        claimed.update(indexes)
        selected.append((pattern_index, indexes[0]))
    return sorted(selected, key=lambda item: (item[1], item[0]))


def build(args):
    patterns = load_patterns(args.bank)
    entries = {}
    aligned = 0
    mapped = 0
    for raw_line in Path(args.alignments).read_text(encoding="utf-8").splitlines():
        parsed = parse_alignment(raw_line)
        if not parsed:
            continue
        aligned += 1
        word, phones, chunks = parsed
        mappings = align_reviewed_patterns(word, phones, chunks, patterns)
        if not mappings:
            continue
        entries[word] = [value for mapping in mappings for value in mapping]
        mapped += 1

    payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    pattern_ids = json.dumps([pattern["id"] for pattern in patterns], ensure_ascii=False, separators=(",", ":"))
    output = (
        "// Generated by scripts/build-sound-spelling-lookup.py from the pinned CMUdict alignment.\n"
        "// Values are alternating reviewed-pattern indexes and starting character indexes.\n"
        "window.SpellingSoundLookup=Object.freeze({patternIds:Object.freeze("
        + pattern_ids + "),words:Object.freeze(" + payload + ")});\n"
    )
    Path(args.output).write_text(output, encoding="utf-8")
    print(json.dumps({
        "alignedHeadwords": aligned,
        "mappedHeadwords": mapped,
        "reviewedPatterns": len(patterns),
        "outputBytes": len(output.encode("utf-8")),
        "output": args.output,
    }))


def parser():
    result = argparse.ArgumentParser()
    result.add_argument("--alignments", required=True)
    result.add_argument("--bank", default="static/sound-spelling-bank.js")
    result.add_argument("--output", default="static/sound-spelling-lookup.js")
    result.set_defaults(function=build)
    return result


if __name__ == "__main__":
    arguments = parser().parse_args()
    arguments.function(arguments)
