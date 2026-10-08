#!/usr/bin/env python3
"""Generate an importable, fully completed learner profile for UI testing."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "test_data" / "mastered-spelling-b.spellingb-profile"
APP_VERSION = "1.6.0"
FIXTURE_DATE = date(2026, 10, 7)
FIXTURE_TIMESTAMP = "2026-10-07T12:00:00Z"
LIST_ID = "mastered-profile-test-words"
LIST_TITLE = "Mastered Profile Words"
LIST_WORDS = ["apple", "because", "friend", "little", "school", "would", "world", "water", "mother", "through"]
PLAN = {
    "beginnerDays": 2,
    "beginner": {"copy": 2, "letterBuilder": 3, "guided": 1, "spell": 0},
    "advanced": {"copy": 1, "letterBuilder": 0, "guided": 2, "spell": 2},
    "advancedReview": {"enabled": True, "repetitions": 1, "maxWords": 5},
}
STICKER_PACKS = [
    "animals", "space", "dinosaurs", "ocean", "sports", "fantasy", "farm", "bugs", "birds", "fruit",
    "treats", "weather", "garden", "vehicles", "music", "art", "school", "celebration", "adventure", "robots",
]


def compact(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def sound_patterns() -> list[dict[str, object]]:
    source = (ROOT / "static" / "sound-spelling-bank.js").read_text(encoding="utf-8")
    expression = re.compile(
        r"\{ id: '([^']+)', sound: '([^']+)', grapheme: '([^']+)', label: '([^']+)', words: \[([^\]]+)\] \}"
    )
    patterns = []
    for match in expression.finditer(source):
        words = re.findall(r"'([^']+)'", match.group(5))
        patterns.append({
            "id": match.group(1),
            "sound": match.group(2),
            "grapheme": match.group(3),
            "label": match.group(4),
            "words": words,
        })
    if len(patterns) != 98 or any(len(pattern["words"]) < 10 for pattern in patterns):
        raise RuntimeError(f"expected 98 complete sound patterns, found {len(patterns)}")
    return patterns


def complete_sound_mastery(patterns: list[dict[str, object]]) -> dict[str, object]:
    result = {}
    for pattern in patterns:
        result[str(pattern["id"])] = {
            "sound": pattern["sound"],
            "letters": pattern["grapheme"],
            "patternId": pattern["id"],
            "words": {word.lower(): 10 for word in pattern["words"][:10]},
            "stagePoints": {"copy": 5, "letters": 20, "guided": 40, "spell": 60},
        }
    return result


def word_session(patterns: list[dict[str, object]], timestamp: str) -> dict[str, object]:
    timings = [{"word": word, "stage": "spell", "seconds": 1.5, "correct": True} for word in LIST_WORDS]
    return {
        "id": "mastered-word-list-session",
        "startedAt": timestamp,
        "lastActiveAt": timestamp,
        "endedAt": timestamp,
        "completed": True,
        "activity": "word-list",
        "listTitle": LIST_TITLE,
        "contextLabel": "Advanced · Day 5",
        "day": 5,
        "mode": "advanced",
        "stages": ["copy", "guided", "spell", "review"],
        "wordTimings": timings,
        "wordStats": {word: {"word": word, "samples": 1, "seconds": 1.5, "correct": 1} for word in LIST_WORDS},
        "wordSamples": len(LIST_WORDS),
        "wordSeconds": len(LIST_WORDS) * 1.5,
        "typedAttempts": len(LIST_WORDS),
        "correctTypedAttempts": len(LIST_WORDS),
        "typedCharacters": sum(map(len, LIST_WORDS)),
        "correctPositionCharacters": sum(map(len, LIST_WORDS)),
        "comparedCharacters": sum(map(len, LIST_WORDS)),
        "typingSeconds": len(LIST_WORDS) * 1.5,
        "corrections": 0,
        "letterChoices": 30,
        "correctLetterChoices": 30,
        "builderWords": len(LIST_WORDS),
        "soundMastery": complete_sound_mastery(patterns),
    }


def auxiliary_sessions(timestamp: str) -> list[dict[str, object]]:
    sessions = []
    for level in range(1, 8):
        sessions.append({
            "id": f"mastered-typing-{level}",
            "startedAt": timestamp,
            "lastActiveAt": timestamp,
            "endedAt": timestamp,
            "completed": True,
            "activity": "typing-test",
            "listTitle": f"Typing · Level {level}",
            "contextLabel": "Lightning Bee",
            "mode": "test",
            "level": level,
            "stages": ["test"],
            "characterAttempts": 300,
            "correctCharacters": 300,
            "activeSeconds": 120,
            "cpm": 90 + level,
            "accuracy": 100,
        })
    sessions.extend([
        {
            "id": "mastered-spelling-test",
            "startedAt": timestamp,
            "lastActiveAt": timestamp,
            "endedAt": timestamp,
            "completed": True,
            "activity": "spelling-test",
            "listTitle": "All lists test",
            "contextLabel": "Perfect score",
            "mode": "test",
            "stages": ["spell"],
            "wordTimings": [{"word": word, "stage": "spell", "seconds": 1, "correct": True} for word in LIST_WORDS],
            "wordStats": {word: {"word": word, "samples": 1, "seconds": 1, "correct": 1} for word in LIST_WORDS},
            "wordSamples": len(LIST_WORDS),
            "wordSeconds": len(LIST_WORDS),
            "typedAttempts": len(LIST_WORDS),
            "correctTypedAttempts": len(LIST_WORDS),
            "typedCharacters": sum(map(len, LIST_WORDS)),
            "correctPositionCharacters": sum(map(len, LIST_WORDS)),
            "comparedCharacters": sum(map(len, LIST_WORDS)),
            "typingSeconds": len(LIST_WORDS),
            "corrections": 0,
            "letterChoices": 0,
            "correctLetterChoices": 0,
            "builderWords": 0,
        },
        {
            "id": "mastered-high-frequency-session",
            "startedAt": timestamp,
            "lastActiveAt": timestamp,
            "endedAt": timestamp,
            "completed": True,
            "activity": "high-frequency",
            "listTitle": "High Frequency · Level 100",
            "contextLabel": "Words 991–1000",
            "mode": "practice",
            "stages": ["copy", "guided", "spell"],
            "wordTimings": [{"word": "command", "stage": "spell", "seconds": 1, "correct": True}],
            "wordStats": {"command": {"word": "command", "samples": 1, "seconds": 1, "correct": 1}},
            "wordSamples": 1,
            "wordSeconds": 1,
            "typedAttempts": 1,
            "correctTypedAttempts": 1,
            "typedCharacters": 7,
            "correctPositionCharacters": 7,
            "comparedCharacters": 7,
            "typingSeconds": 1,
            "corrections": 0,
            "letterChoices": 0,
            "correctLetterChoices": 0,
            "builderWords": 0,
            "soundMastery": {},
            "soundMasteryBackfillVersion": 1,
        },
    ])
    return sessions


def high_frequency_progress() -> dict[str, object]:
    course = json.loads((ROOT / "static" / "high-frequency-words.json").read_text(encoding="utf-8"))
    mastery = {}
    for level in course["levels"]:
        mastery[str(level["number"])] = {
            "signature": compact(level["words"]),
            "words": {word.lower(): 10 for word in level["words"]},
        }
    return {
        "current": 99,
        "completed": list(range(1, 101)),
        "practice": {},
        "mastery": mastery,
        "masteryVersion": 1,
    }


def legacy_phonics_progress() -> dict[str, object]:
    course = json.loads((ROOT / "static" / "phonics-lessons.json").read_text(encoding="utf-8"))
    completed = [group["id"] for lesson in course["lessons"] for group in lesson["practiceGroups"]]
    return {"current": 119, "group": 0, "completed": completed, "view": "student", "practice": {}}


def typing_progress(today: date, timestamp: str) -> dict[str, object]:
    best = [{"cpm": 97 + level, "accuracy": 100, "rank": "Lightning Bee", "at": timestamp} for level in range(7)]
    daily_levels = {str(level): {"correct": 999, "tested": True, "practiceCPM": 95} for level in range(7)}
    return {
        "level": 6,
        "unlocked": 6,
        "mastered": [True] * 7,
        "best": best,
        "days": [(today - timedelta(days=offset)).isoformat() for offset in range(29, -1, -1)],
        "daily": {"date": today.isoformat(), "levels": daily_levels},
    }


def sticker_collection() -> dict[str, object]:
    earned = {pack: list(range(10)) for pack in STICKER_PACKS}
    awards = {}
    for pack in STICKER_PACKS:
        for index in range(10):
            awards[f"fixture:{pack}:{index + 1}"] = {"packID": pack, "stickerIndex": index, "sticker": "⭐"}
    return {"selectedPack": "random", "earned": earned, "awards": awards}


def main() -> None:
    patterns = sound_patterns()
    today = FIXTURE_DATE
    timestamp = FIXTURE_TIMESTAMP
    plan_signature = compact(PLAN)
    list_signature = compact([LIST_TITLE, LIST_WORDS])
    learner_data = {
        "spelling-b:session-metrics:v1": [word_session(patterns, timestamp), *auxiliary_sessions(timestamp)],
        "spelling-b:stickers:v1": sticker_collection(),
        "spelling-b:current-word-list:v1": {"index": 0, "signature": list_signature},
        "spelling-b:high-frequency-progress:v1": high_frequency_progress(),
        "spelling-b:phonics-progress:v3": legacy_phonics_progress(),
        "spelling-b:typing-progress:v2": typing_progress(today, timestamp),
        f"spelling-b:list:{LIST_ID}:progress:v1": {
            "version": 4,
            "planSignature": plan_signature,
            "day": 5,
            "stageIndex": 3,
            "counts": {},
            "missedSpellWords": {},
            "reviewActive": False,
            "reviewWords": [],
            "completed": True,
        },
    }
    package = {
        "format": "spelling-b-profile",
        "version": 1,
        "appVersion": APP_VERSION,
        "exportedAt": timestamp,
        "profile": {"name": "Mastery Test Learner"},
        "learnerData": learner_data,
        "wordLists": [{"id": LIST_ID, "title": LIST_TITLE, "words": LIST_WORDS}],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
