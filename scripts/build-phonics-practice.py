#!/usr/bin/env python3
"""Derive short phonics practice sets from labeled examples in bundled lessons."""

import json
import re
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_DIR / "static" / "phonics-lessons.json"
MAX_WORDS = 10


def unique(values):
    result = []
    seen = set()
    for value in values:
        value = re.sub(r"\s+", " ", value).strip(" \t\n.;:()“”\"")
        key = value.casefold()
        if value and len(value) <= 40 and key not in seen:
            seen.add(key)
            result.append(value)
    return result[:MAX_WORDS]


def comma_examples(text):
    return unique(text.split(","))


def word_examples(text):
    return unique(re.findall(r"[A-Za-z]+(?:[’'][A-Za-z]+)*(?:-[A-Za-z]+)?", text))


def focus_title(lesson, prompt, index):
    prompt = re.sub(r"\s+", " ", prompt).strip()
    patterns = [
        r"(?:words?(?: that)?(?: have)?(?: the)?|with)\s+[‘“'\"]([^’”'\"]{1,16})[’”'\"]\s*sound",
        r"(?:start|starts|begin|begins|end|ends)(?:ing)?\s+with\s+[‘“'\"]([^’”'\"]{1,16})[’”'\"]",
        r"[‘“'\"]([^’”'\"]{1,16})[’”'\"]\s+sound",
    ]
    sound = ""
    for pattern in patterns:
        matches = re.findall(pattern, prompt, re.IGNORECASE)
        if matches:
            sound = matches[-1].strip(" .")
            break
    if sound and len(set(sound.casefold())) == 1:
        sound = sound[0]

    positions = []
    for label, pattern in [
        ("beginning", r"\b(?:begin|begins|beginning|start|starts)(?:ing)?\s+with\b"),
        ("ending", r"\b(?:end|ends|ending)(?:ing)?\s+with\b"),
    ]:
        for match in re.finditer(pattern, prompt, re.IGNORECASE):
            positions.append((match.start(), label))
    position = max(positions)[1] if positions else ""

    if sound:
        return f"{sound} sound" + (f" · {position}" if position else "")
    return f"{lesson['title']} · examples {index}"


def groups_for(lesson):
    guide = lesson.get("guide", "")
    groups = []
    example_pattern = r"(?:^|\n)\s*Examples:\s*(.*?)(?=\n\s*\n)"

    for example_index, match in enumerate(re.finditer(example_pattern, guide, re.DOTALL), 1):
        block = match.group(1)
        labels = list(re.finditer(r"(?m)^\s*([A-Za-z]{1,8}):\s*", block))
        if len(labels) > 1:
            for label_index, label_match in enumerate(labels):
                end = labels[label_index + 1].start() if label_index + 1 < len(labels) else len(block)
                words = comma_examples(block[label_match.end():end])
                if words:
                    label = label_match.group(1)
                    groups.append({
                        "title": f"{label} blend",
                        "words": words,
                        "source": "Examples",
                    })
            continue

        words = comma_examples(block)
        if not words:
            continue
        prefix = guide[:match.start()].rstrip()
        prompt = re.split(r"\n\s*\n", prefix)[-1]
        groups.append({
            "title": focus_title(lesson, prompt, example_index),
            "words": words,
            "source": "Examples",
        })

    if not groups:
        words_pattern = r"(?:^|\n)\s*(Words to read and write[^:\n]*):\s*(.*?)(?=\n\s*\n)"
        for match in re.finditer(words_pattern, guide, re.DOTALL | re.IGNORECASE):
            words = word_examples(match.group(2))
            if words:
                heading = re.sub(r"\s+", " ", match.group(1)).strip()
                title = heading.replace("Words to read and write", "Practice words").strip()
                groups.append({
                    "title": title or f"{lesson['title']} · practice",
                    "words": words,
                    "source": "Words to read and write",
                })

    if not groups:
        words = unique((lesson.get("words") or [])[:MAX_WORDS])
        if words:
            groups.append({
                "title": f"{lesson['title']} · practice",
                "words": words,
                "source": "Student examples",
            })

    for index, group in enumerate(groups, 1):
        group["id"] = f"{lesson['number']}.{index}"
    return groups


def main():
    course = json.loads(DATA_FILE.read_text())
    for lesson in course["lessons"]:
        groups = groups_for(lesson)
        if not groups:
            raise ValueError(f"Lesson {lesson['number']} has no practice examples")
        lesson["practiceGroups"] = groups
        lesson["words"] = unique(word for group in groups for word in group["words"])

    DATA_FILE.write_text(json.dumps(course, ensure_ascii=False, separators=(",", ":")) + "\n")
    total = sum(len(lesson["practiceGroups"]) for lesson in course["lessons"])
    print(f"Generated {total} practice sets for {len(course['lessons'])} lessons.")


if __name__ == "__main__":
    main()
