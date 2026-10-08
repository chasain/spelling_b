#!/usr/bin/env python3
"""Prepare CMUdict for many-to-many alignment and summarize learned mappings."""

import argparse
import collections
import hashlib
import json
import re
from pathlib import Path


PHONE_IPA = {
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AX": "ə", "AO": "ɔ",
    "AW": "aʊ", "AY": "aɪ", "EH": "ɛ", "ER": "ɝ", "AXR": "ɚ",
    "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ", "OY": "ɔɪ",
    "UH": "ʊ", "UW": "uː", "B": "b", "CH": "tʃ", "D": "d",
    "DH": "ð", "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ",
    "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ",
    "P": "p", "R": "r", "S": "s", "SH": "ʃ", "T": "t",
    "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z",
    "ZH": "ʒ", "_": "silent",
}


def normalized_phone(phone):
    match = re.fullmatch(r"([A-Z]+)([012])?", phone)
    if not match:
        return phone
    base, stress = match.groups()
    if base == "AH":
        return "AX" if stress == "0" else "AH"
    if base == "ER":
        return "AXR" if stress == "0" else "ER"
    return base


def prepare(args):
    seen = set()
    rows = []
    source = Path(args.cmudict)
    for raw_line in source.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";;; "):
            continue
        fields = line.split()
        if len(fields) < 2:
            continue
        word = re.sub(r"\(\d+\)$", "", fields[0].lower())
        if word in seen or not re.fullmatch(r"[a-z]+", word):
            continue
        seen.add(word)
        phones = [normalized_phone(phone) for phone in fields[1:]]
        rows.append(" ".join(word) + "\t" + " ".join(phones))
    output = Path(args.output)
    output.write_text("\n".join(rows) + "\n", encoding="utf-8")
    training_rows = 0
    if args.training_output:
        training = rows[::args.training_stride]
        training_rows = len(training)
        Path(args.training_output).write_text("\n".join(training) + "\n", encoding="utf-8")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    print(json.dumps({"headwords": len(rows), "trainingHeadwords": training_rows, "cmudictSha256": digest, "output": str(output)}))


def ipa_for(phones):
    if phones == ("_",):
        return "silent"
    values = [PHONE_IPA.get(phone) for phone in phones]
    return "".join(values) if all(values) else "?"


def analyze(args):
    mappings = collections.defaultdict(set)
    examples = collections.defaultdict(list)
    example_sets = collections.defaultdict(set)
    aligned_words = 0
    for raw_line in Path(args.alignments).read_text(encoding="utf-8").splitlines():
        if not raw_line.strip() or "\t" not in raw_line:
            continue
        left, right = raw_line.split("\t", 1)
        grapheme_chunks = [chunk for chunk in left.strip().strip("|").split("|") if chunk]
        phone_chunks = [chunk for chunk in right.strip().strip("|").split("|") if chunk]
        if len(grapheme_chunks) != len(phone_chunks):
            continue
        word = "".join(chunk.replace(":", "") for chunk in grapheme_chunks)
        if not re.fullmatch(r"[a-z]+", word):
            continue
        aligned_words += 1
        for grapheme_chunk, phone_chunk in zip(grapheme_chunks, phone_chunks):
            grapheme = grapheme_chunk.replace(":", "")
            phones = tuple(phone_chunk.split(":"))
            key = (grapheme, phones)
            mappings[key].add(word)
            if word not in example_sets[key] and len(examples[key]) < args.example_limit:
                examples[key].append(word)
                example_sets[key].add(word)

    records = []
    for (grapheme, phones), words in mappings.items():
        if len(words) < args.minimum:
            continue
        records.append({
            "grapheme": grapheme,
            "arpabet": list(phones),
            "ipa": ipa_for(phones),
            "count": len(words),
            "examples": examples[(grapheme, phones)],
        })
    records.sort(key=lambda record: (-record["count"], record["grapheme"], record["arpabet"]))
    result = {
        "method": "CMUdict first pronunciation; lowercase alphabetic headwords; m2m-aligner; unique-headword counts",
        "source": args.source,
        "sourceSha256": args.source_sha256,
        "aligner": args.aligner,
        "minimumOccurrences": args.minimum,
        "alignedHeadwords": aligned_words,
        "mappingCount": len(records),
        "mappings": records,
    }
    Path(args.output_json).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# CMUdict grapheme–phoneme audit",
        "",
        f"Aligned headwords: {aligned_words:,}. Threshold: {args.minimum:,} distinct headwords. Candidate mappings: {len(records):,}.",
        "",
        "This is a statistical audit, not an automatically approved teaching inventory. Compound chunks, silent letters, dialect-sensitive pronunciations, names, and alignment errors require review.",
        "",
        "| Grapheme | IPA | ARPABET | Words | Examples |",
        "|---|---:|---|---:|---|",
    ]
    for record in records:
        examples_text = ", ".join(f"`{word}`" for word in record["examples"])
        lines.append(f"| `{record['grapheme']}` | /{record['ipa']}/ | `{' '.join(record['arpabet'])}` | {record['count']:,} | {examples_text} |")
    Path(args.output_markdown).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"alignedHeadwords": aligned_words, "mappings": len(records), "output": args.output_json}))


def parser():
    root = argparse.ArgumentParser()
    commands = root.add_subparsers(dest="command", required=True)
    prepare_parser = commands.add_parser("prepare")
    prepare_parser.add_argument("--cmudict", required=True)
    prepare_parser.add_argument("--output", required=True)
    prepare_parser.add_argument("--training-output")
    prepare_parser.add_argument("--training-stride", type=int, default=6)
    prepare_parser.set_defaults(function=prepare)
    analyze_parser = commands.add_parser("analyze")
    analyze_parser.add_argument("--alignments", required=True)
    analyze_parser.add_argument("--output-json", required=True)
    analyze_parser.add_argument("--output-markdown", required=True)
    analyze_parser.add_argument("--minimum", type=int, default=100)
    analyze_parser.add_argument("--example-limit", type=int, default=20)
    analyze_parser.add_argument("--source", default="CMUdict")
    analyze_parser.add_argument("--source-sha256", default="")
    analyze_parser.add_argument("--aligner", default="m2m-aligner")
    analyze_parser.set_defaults(function=analyze)
    return root


if __name__ == "__main__":
    arguments = parser().parse_args()
    arguments.function(arguments)
