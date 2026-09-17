# Chrome Web Store listing copy

## Summary

Kid-friendly, offline spelling, high-frequency word, phonics, and typing practice.

## Description

Spelling B helps children practice spelling at their own pace.

- Create as many titled word lists as you need.
- Export a classroom setup once and import or merge it offline on student devices.
- Bring in existing teacher lists from CSV, TSV, or XLSX with a selectable layout preview.
- Configure beginner and advanced lesson stages.
- Practice by copying, building words from letter choices, following color hints, and spelling from speech.
- Start a new day while keeping long-term progress.
- Take a no-feedback spelling test across all lists.
- Master 1,000 high-frequency words in 100 focused levels of 10 words.
- Work through 120 Open Source Phonics lessons using 160 focused, interactive example-word practice sets and tutor guides.
- Build touch-typing skills through gated daily missions, seven incremental key levels, and repeatable ranked tests.
- Review local session metrics including accuracy, response time, CPM copy speed, and difficult words.
- Work offline after installation when using a locally installed text-to-speech voice.

All settings and learning data stay in the local Chrome profile. Spelling B has no ads, analytics, accounts, or network requests.

## Permission justifications

**Storage:** Saves word lists, settings, classroom-import backups, word-list, high-frequency, and phonics progress, typing scores, test results, and session metrics locally in the Chrome profile.

**Text-to-speech:** Pronounces the current spelling word using a voice installed in Chrome or ChromeOS.

## Single purpose

Provide configurable, offline word-list, high-frequency word, phonics, typing, and spelling-test practice for children.

## Version 1.3.0 release notes

- Added 120 Open Source Phonics lessons with 160 interactive practice sets.
- Added 100 high-frequency-word levels covering 1,000 words.
- Added daily touch-typing missions, progressive key unlocks, keyboard guidance, and ranked tests.
- Added configurable beginner and advanced lesson plans, per-session metrics, CPM reporting, and difficult-word tracking.
- Added offline classroom setup export/import plus CSV, TSV, and XLSX word-list imports.
- Improved spelling corrections, fast keyboard input, navigation focus handling, settings organization, and kid-friendly visuals.

## Store fields

- **Category:** Education
- **Language:** English (United States)
- **Homepage:** https://github.com/chasain/spelling_b
- **Privacy policy:** https://github.com/chasain/spelling_b/blob/main/chrome/PRIVACY.md

## Submission notes

Version 1.3.0 is ready for publication. Upload `dist/spelling-b-chrome-extension-1.3.0.zip`; `manifest.json` is at the ZIP root. The extension is fully offline and contains no remote code, analytics, advertising, accounts, host permissions, or network requests. Classroom and spreadsheet imports use the Settings file picker or drag-and-drop, require no additional permission, and are processed locally. The manifest intentionally omits ChromeOS-only `file_handlers` so it loads without cross-platform warnings.

The `storage` permission saves settings and learning progress locally. The `tts` permission speaks practice words using a voice provided by Chrome or the operating system. The bundled phonics material is attributed under CC BY-NC-SA 4.0, and the bundled high-frequency source data is public domain; license files are included in the package.
