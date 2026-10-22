#!/usr/bin/env python3
"""Build a compact CMUdict word-to-reviewed-pattern lookup from m2m alignments."""

import argparse
import ast
import gzip
import json
import re
from collections import Counter
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
VOWEL_PHONES = {"AA", "AE", "AH", "AX", "AO", "AW", "AY", "EH", "ER", "AXR", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}

def read_text(path):
    source = Path(path)
    if source.suffix == ".gz":
        with gzip.open(source, "rt", encoding="utf-8") as handle:
            return handle.read()
    return source.read_text(encoding="utf-8")


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


def align_reviewed_patterns(
    word,
    phones,
    chunks,
    patterns,
    allow_silent_past_tense_e=False,
    additional_silent_indexes=(),
):
    additional_silent_indexes = frozenset(additional_silent_indexes)
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

        silent_past_tense_e = (
            allow_silent_past_tense_e
            and
            letter_index == len(word) - 2
            and word[letter_index:] == "ed"
            and phones[phone_index:] in {("D",), ("T",)}
        )
        if (
            (letter_index == len(word) - 1 and word[letter_index] == "e")
            or silent_past_tense_e
            or letter_index in additional_silent_indexes
        ):
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


def recover_silent_past_tense_patterns(word, phones, chunks, patterns, mappings):
    """Add mappings unlocked by a silent `e` in final `-ed` without replacing existing data."""
    if not word.endswith("ed") or phones[-1:] not in {("D",), ("T",)}:
        return list(mappings), []
    enhanced = align_reviewed_patterns(word, phones, chunks, patterns, allow_silent_past_tense_e=True)
    result = list(mappings)
    claimed = {
        index
        for pattern_index, start in result
        for index in split_indexes(word, patterns[pattern_index]["pieces"], start)
    }
    recovered = []
    for pattern_index, start in sorted(
        enhanced,
        key=lambda item: (-len(split_indexes(word, patterns[item[0]]["pieces"], item[1])), item[1], item[0]),
    ):
        mapping = (pattern_index, start)
        indexes = split_indexes(word, patterns[pattern_index]["pieces"], start)
        if mapping in result or not indexes or claimed.intersection(indexes):
            continue
        result.append(mapping)
        claimed.update(indexes)
        recovered.append((pattern_index, start, "silent-past-tense-e"))
    return sorted(result, key=lambda item: (item[1], item[0])), recovered


def known_silent_letter_indexes(word, phones):
    """Return conservative, spelling-defined silent-letter candidates.

    The aligner still has to consume the word's complete CMUdict pronunciation
    after skipping the candidate. These rules only let it look inside common
    terminal chunks that m2m otherwise treats as indivisible.
    """
    rules = []
    endings = {
        "mb": (-1, "terminal-mb", "M", ("M", "B")),
        "mn": (-1, "terminal-mn", "M", ("M", "N")),
        "gn": (-2, "terminal-gn", "N", ("G", "N")),
        "lk": (-2, "terminal-lk", "K", ("L", "K")),
        "bt": (-2, "terminal-bt", "T", ("B", "T")),
    }
    for ending, (offset, rule, final_phone, pronounced_ending) in endings.items():
        if (
            word.endswith(ending)
            and phones[-1:] == (final_phone,)
            and phones[-len(pronounced_ending):] != pronounced_ending
        ):
            rules.append((len(word) + offset, rule))
    return rules


def recover_known_silent_letter_patterns(word, phones, chunks, patterns, mappings):
    """Add reviewed mappings exposed by conservative silent-letter rules."""
    silent_rules = known_silent_letter_indexes(word, phones)
    if not silent_rules:
        return list(mappings), []
    enhanced = align_reviewed_patterns(
        word,
        phones,
        chunks,
        patterns,
        additional_silent_indexes=[index for index, _ in silent_rules],
    )
    rule_by_index = dict(silent_rules)
    result = list(mappings)
    claimed = {
        index
        for pattern_index, start in result
        for index in split_indexes(word, patterns[pattern_index]["pieces"], start)
    }
    recovered = []
    for pattern_index, start in sorted(
        enhanced,
        key=lambda item: (-len(split_indexes(word, patterns[item[0]]["pieces"], item[1])), item[1], item[0]),
    ):
        mapping = (pattern_index, start)
        indexes = split_indexes(word, patterns[pattern_index]["pieces"], start)
        if mapping in result or not indexes or claimed.intersection(indexes):
            continue
        result.append(mapping)
        claimed.update(indexes)
        relevant_rule = next(
            (rule for silent_index, rule in silent_rules if silent_index >= indexes[0]),
            next(iter(rule_by_index.values())),
        )
        recovered.append((pattern_index, start, f"known-silent-letter:{relevant_rule}"))
    return sorted(result, key=lambda item: (item[1], item[0])), recovered


DERIVATIONAL_SUFFIXES = ("d", "r", "s", "ed", "er", "es", "ly", "ful", "less", "ness", "ment", "ing")
SILENT_LETTER_RULE_IDS = (
    "terminal-mb",
    "terminal-mn",
    "terminal-gn",
    "terminal-lk",
    "terminal-bt",
    "split-a-e",
    "split-i-e",
    "split-o-e",
)


def silent_letter_annotations(word, phones, patterns, mappings):
    annotations = [
        (index, rule)
        for index, rule in known_silent_letter_indexes(word, phones)
    ]
    for pattern_index, start in mappings:
        pattern = patterns[pattern_index]
        if pattern["id"] not in {"long-a-split", "long-i-split", "long-o-split"}:
            continue
        indexes = split_indexes(word, pattern["pieces"], start)
        if indexes and indexes[-1] == len(word) - 1:
            annotations.append((indexes[-1], f"split-{pattern['pieces'][0]}-e"))
    return sorted(set(annotations))


def recover_base_word_patterns(word, phones, patterns, mappings, analyzed_words):
    """Inherit unchanged reviewed mappings from a pronunciation-matched base.

    The base must be the derived word's exact written prefix, its full phone
    sequence must also be an exact prefix, and inherited indexes must remain
    unclaimed. This intentionally declines spelling-changing derivations.
    """
    result = list(mappings)
    claimed = {
        index
        for pattern_index, start in result
        for index in split_indexes(word, patterns[pattern_index]["pieces"], start)
    }
    for suffix in DERIVATIONAL_SUFFIXES:
        if not word.endswith(suffix) or len(word) <= len(suffix) + 1:
            continue
        base_word = word[:-len(suffix)]
        base = analyzed_words.get(base_word)
        if (
            not base
            or not (base["supportsInheritance"] or base["silentLetters"])
            or phones[:len(base["phones"])] != base["phones"]
        ):
            continue
        recovered = []
        for pattern_index, start in base["mappings"] if base["supportsInheritance"] else ():
            indexes = split_indexes(word, patterns[pattern_index]["pieces"], start)
            if (
                not indexes
                or indexes[-1] >= len(base_word)
                or claimed.intersection(indexes)
            ):
                continue
            mapping = (pattern_index, start)
            if mapping in result:
                continue
            result.append(mapping)
            claimed.update(indexes)
            recovered.append((pattern_index, start, base_word, suffix))
        return sorted(result, key=lambda item: (item[1], item[0])), recovered, base_word, suffix
    return sorted(result, key=lambda item: (item[1], item[0])), [], None, None


def recover_chunk_edge_patterns(word, phones, chunks, patterns, mappings):
    """Add safe consonant mappings hidden at an m2m chunk edge.

    A recovery is accepted only when the grapheme and its exact phone sequence
    share an edge, and the uncredited side contains both letters and phones.
    Existing mappings are immutable. Vowel patterns and ambiguous standalone
    `r`/`rr` recoveries remain outside this mechanical rule.
    """
    result = list(mappings)
    claimed = {
        index
        for pattern_index, start in result
        for index in split_indexes(word, patterns[pattern_index]["pieces"], start)
    }
    candidates = []
    for start_letter, start_phone, end_letter, end_phone in chunks:
        chunk_phones = phones[start_phone:end_phone]
        for pattern_index, pattern in enumerate(patterns):
            if (
                len(pattern["pieces"]) != 1
                or any(phone in VOWEL_PHONES for phone in pattern["phones"])
                or pattern["id"] in {"consonant-r", "rr"}
            ):
                continue
            grapheme = pattern["pieces"][0]
            location = word.find(grapheme, start_letter, end_letter)
            while location >= 0 and location + len(grapheme) <= end_letter:
                candidate_phones = pattern["phones"]
                trailing_letters = word[location + len(grapheme):end_letter]
                leading_letters = word[start_letter:location]
                trailing_phones = len(chunk_phones) - len(candidate_phones)
                leading_phones = len(chunk_phones) - len(candidate_phones)
                prefix_match = (
                    location == start_letter
                    and chunk_phones[:len(candidate_phones)] == candidate_phones
                    and trailing_letters
                    and (trailing_phones > 0 or set(trailing_letters) != set(grapheme))
                )
                suffix_match = (
                    location + len(grapheme) == end_letter
                    and chunk_phones[-len(candidate_phones):] == candidate_phones
                    and leading_letters
                    and (leading_phones > 0 or set(leading_letters) != set(grapheme))
                )
                if prefix_match or suffix_match:
                    indexes = tuple(range(location, location + len(grapheme)))
                    anchor = "start" if prefix_match else "end"
                    candidates.append((
                        -len(indexes),
                        -len(candidate_phones),
                        location,
                        pattern_index,
                        indexes,
                        anchor,
                    ))
                location = word.find(grapheme, location + 1, end_letter)

    recovered = []
    for _, _, location, pattern_index, indexes, anchor in sorted(candidates):
        if claimed.intersection(indexes):
            continue
        claimed.update(indexes)
        result.append((pattern_index, location))
        recovered.append((pattern_index, location, anchor))
    return sorted(result, key=lambda item: (item[1], item[0])), recovered


def recovery_record(word, phones, chunks, patterns, recovery):
    pattern_index, start, recovery_anchor = recovery
    pattern = patterns[pattern_index]
    indexes = split_indexes(word, pattern["pieces"], start)
    for start_letter, start_phone, end_letter, end_phone in chunks:
        if indexes and start_letter <= indexes[0] and indexes[-1] < end_letter:
            at_start = indexes[0] == start_letter
            at_end = indexes[-1] + 1 == end_letter
            recovery_type = "chunk-edge"
            if recovery_anchor == "silent-past-tense-e":
                recovery_type = "silent-past-tense-e"
            elif recovery_anchor.startswith("known-silent-letter:"):
                recovery_type = "known-silent-letter"
            result = {
                "word": word,
                "patternId": pattern["id"],
                "grapheme": pattern["grapheme"],
                "sound": pattern["sound"],
                "start": start,
                "alignmentChunk": word[start_letter:end_letter],
                "alignmentPhones": list(phones[start_phone:end_phone]),
                "anchor": recovery_anchor,
                "recoveryType": recovery_type,
            }
            if recovery_type == "known-silent-letter":
                result["silentLetterRule"] = recovery_anchor.split(":", 1)[1]
            return result
    if indexes:
        covered_chunks = [
            chunk for chunk in chunks
            if chunk[0] <= indexes[-1] and chunk[2] > indexes[0]
        ]
        if covered_chunks:
            start_letter, start_phone = covered_chunks[0][:2]
            end_letter, end_phone = covered_chunks[-1][2:]
            recovery_type = "silent-past-tense-e"
            if recovery_anchor.startswith("known-silent-letter:"):
                recovery_type = "known-silent-letter"
            result = {
                "word": word,
                "patternId": pattern["id"],
                "grapheme": pattern["grapheme"],
                "sound": pattern["sound"],
                "start": start,
                "alignmentChunk": word[start_letter:end_letter],
                "alignmentPhones": list(phones[start_phone:end_phone]),
                "anchor": recovery_anchor,
                "recoveryType": recovery_type,
            }
            if recovery_type == "known-silent-letter":
                result["silentLetterRule"] = recovery_anchor.split(":", 1)[1]
            return result
    raise ValueError(f"Could not locate recovered mapping in alignment chunks: {word} {pattern['id']}@{start}")


def write_recovery_report(path, records, aligned, baseline_mapped, mapped, lost):
    by_pattern = Counter(record["patternId"] for record in records)
    by_chunk = Counter(
        (record["alignmentChunk"], tuple(record["alignmentPhones"]), record["patternId"])
        for record in records
    )
    by_type = Counter(record["recoveryType"] for record in records)
    by_silent_rule = Counter(
        record["silentLetterRule"]
        for record in records
        if record["recoveryType"] == "known-silent-letter"
    )
    by_suffix = Counter(
        record["suffix"]
        for record in records
        if record["recoveryType"] == "suffix-inheritance"
    )
    result = {
        "method": "Additive recovery of reviewed patterns at exact alignment-chunk edges, across conservative silent-letter endings, and from pronunciation-matched base words",
        "alignedHeadwords": aligned,
        "baselineMappedHeadwords": baseline_mapped,
        "mappedHeadwords": mapped,
        "recoveredAssociations": len(records),
        "recoveredHeadwords": len({record["word"] for record in records}),
        "lostAssociations": lost,
        "recoveryTypes": [
            {"recoveryType": recovery_type, "count": count}
            for recovery_type, count in by_type.most_common()
        ],
        "silentLetterRules": [
            {"silentLetterRule": rule, "count": count}
            for rule, count in by_silent_rule.most_common()
        ],
        "inheritedSuffixes": [
            {"suffix": suffix, "count": count}
            for suffix, count in by_suffix.most_common()
        ],
        "patterns": [
            {"patternId": pattern_id, "count": count}
            for pattern_id, count in by_pattern.most_common()
        ],
        "alignmentFamilies": [
            {
                "alignmentChunk": chunk,
                "alignmentPhones": list(phones),
                "patternId": pattern_id,
                "count": count,
            }
            for (chunk, phones, pattern_id), count in by_chunk.most_common()
        ],
        "recoveries": records,
    }
    Path(path).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build(args):
    patterns = load_patterns(args.bank)
    entries = {}
    analyzed_words = {}
    aligned = 0
    mapped = 0
    baseline_mapped = 0
    recovery_records = []
    lost_associations = []
    parsed_rows = []
    for raw_line in read_text(args.alignments).splitlines():
        parsed = parse_alignment(raw_line)
        if not parsed:
            continue
        aligned += 1
        parsed_rows.append(parsed)

    for word, phones, chunks in parsed_rows:
        baseline = align_reviewed_patterns(word, phones, chunks, patterns)
        mappings, edge_recoveries = recover_chunk_edge_patterns(word, phones, chunks, patterns, baseline)
        mappings, suffix_recoveries = recover_silent_past_tense_patterns(word, phones, chunks, patterns, mappings)
        mappings, silent_letter_recoveries = recover_known_silent_letter_patterns(
            word, phones, chunks, patterns, mappings
        )
        recoveries = edge_recoveries + suffix_recoveries + silent_letter_recoveries
        if baseline:
            baseline_mapped += 1
        baseline_set = set(baseline)
        mapping_set = set(mappings)
        for recovery in recoveries:
            recovery_records.append(recovery_record(word, phones, chunks, patterns, recovery))
        for mapping in sorted(baseline_set - mapping_set):
            lost_associations.append({"word": word, "patternId": patterns[mapping[0]]["id"], "start": mapping[1]})
        analyzed_words[word] = {
            "phones": phones,
            "chunks": chunks,
            "baseline": baseline,
            "mappings": mappings,
            "silentLetters": silent_letter_annotations(word, phones, patterns, mappings),
            "supportsInheritance": bool(silent_letter_recoveries) or any(
                len(patterns[pattern_index]["pieces"]) > 1
                and split_indexes(word, patterns[pattern_index]["pieces"], start)[-1] == len(word) - 1
                for pattern_index, start in mappings
            ),
        }

    for word in sorted(analyzed_words, key=lambda candidate: (len(candidate), candidate)):
        record = analyzed_words[word]
        mappings, inherited, base_word, suffix = recover_base_word_patterns(
            word,
            record["phones"],
            patterns,
            record["mappings"],
            analyzed_words,
        )
        record["mappings"] = mappings
        if base_word:
            inherited_silent_letters = analyzed_words[base_word]["silentLetters"]
            record["silentLetters"] = sorted(set(record["silentLetters"] + inherited_silent_letters))
        if inherited:
            record["supportsInheritance"] = True
        for pattern_index, start, recovered_base_word, recovered_suffix in inherited:
            recovered_record = recovery_record(
                word,
                record["phones"],
                record["chunks"],
                patterns,
                (pattern_index, start, "suffix-inheritance"),
            )
            recovered_record.update({
                "recoveryType": "suffix-inheritance",
                "baseWord": recovered_base_word,
                "suffix": recovered_suffix,
            })
            recovery_records.append(recovered_record)
        if not mappings:
            continue
        entries[word] = [value for mapping in mappings for value in mapping]
        mapped += 1

    payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    pattern_ids = json.dumps([pattern["id"] for pattern in patterns], ensure_ascii=False, separators=(",", ":"))
    silent_rule_indexes = {rule: index for index, rule in enumerate(SILENT_LETTER_RULE_IDS)}
    silent_entries = {
        word: [value for index, rule in record["silentLetters"] for value in (index, silent_rule_indexes[rule])]
        for word, record in analyzed_words.items()
        if record["silentLetters"]
    }
    silent_payload = json.dumps(silent_entries, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    silent_rule_ids = json.dumps(SILENT_LETTER_RULE_IDS, ensure_ascii=False, separators=(",", ":"))
    output = (
        "// Generated by scripts/build-sound-spelling-lookup.py from the pinned CMUdict alignment.\n"
        "// Values are alternating reviewed-pattern indexes and starting character indexes.\n"
        "window.SpellingSoundLookup=Object.freeze({patternIds:Object.freeze("
        + pattern_ids + "),words:Object.freeze(" + payload + ")});\n"
        "window.SpellingSilentLetterLookup=Object.freeze({ruleIds:Object.freeze("
        + silent_rule_ids + "),words:Object.freeze(" + silent_payload + ")});\n"
    )
    Path(args.output).write_text(output, encoding="utf-8")
    if args.recovery_report:
        write_recovery_report(
            args.recovery_report,
            recovery_records,
            aligned,
            baseline_mapped,
            mapped,
            lost_associations,
        )
    print(json.dumps({
        "alignedHeadwords": aligned,
        "baselineMappedHeadwords": baseline_mapped,
        "mappedHeadwords": mapped,
        "recoveredAssociations": len(recovery_records),
        "recoveredHeadwords": len({record["word"] for record in recovery_records}),
        "lostAssociations": len(lost_associations),
        "reviewedPatterns": len(patterns),
        "outputBytes": len(output.encode("utf-8")),
        "output": args.output,
    }))


def parser():
    result = argparse.ArgumentParser()
    result.add_argument("--alignments", required=True)
    result.add_argument("--bank", default="static/sound-spelling-bank.js")
    result.add_argument("--output", default="static/sound-spelling-lookup.js")
    result.add_argument("--recovery-report")
    result.set_defaults(function=build)
    return result


if __name__ == "__main__":
    arguments = parser().parse_args()
    arguments.function(arguments)
