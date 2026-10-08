# Chrome Web Store listing copy

## Summary

Kid-friendly, offline spelling, high-frequency word, sound-pattern, and typing practice.

## Description

Spelling B helps children practice spelling at their own pace.

### Top 10 features

1. Build unlimited titled word lists with configurable Copy, Letter Builder, Guided, Spell, and missed-word Review practice.
2. Share classroom setups offline and import existing CSV, TSV, or XLSX teacher lists with a preview before saving.
3. Keep up to 50 learners separate with local profiles, then export or import a learner’s progress for device transfers.
4. Master 1,000 high-frequency words through 100 cumulative ten-word levels.
5. Track mastery of 98 reviewed sound-to-spelling patterns and create focused practice from a curated child-safe word bank.
6. Build touch-typing through balanced daily missions, seven keyboard levels, adjustable visual guidance, and ranked tests.
7. Take no-feedback spelling tests across every assigned list, with results reported by list at the end.
8. Review local progress graphs, accuracy, response time, copy CPM, difficult words, and exportable teacher CSV reports.
9. Earn one of 200 offline stickers for completed Word List days, with learner choice or Surprise Me rewards.
10. Add teacher-reviewed example sentences using manual entry, local files, a copy-and-paste prompt, or Chrome’s optional on-device AI.

Spelling B works offline after installation when a local text-to-speech voice is available. All settings and learning data stay in the local Chrome profile. It has no ads, analytics, developer accounts, host permissions, or application network requests.

## Permission justifications

**Storage:** Saves word lists, settings, local learner profiles, classroom-import backups, word-list, high-frequency, and phonics progress, sticker awards, typing scores, test results, and session metrics locally in the Chrome profile.

**Text-to-speech:** Pronounces the current spelling word using a voice installed in Chrome or ChromeOS.

## Single purpose

Provide configurable, offline word-list, high-frequency word, sound-pattern, typing, and spelling-test practice for children.

## Store fields

- **Category:** Education
- **Language:** English (United States)
- **Homepage:** https://github.com/chasain/spelling_b
- **Privacy policy:** https://github.com/chasain/spelling_b/blob/main/chrome/PRIVACY.md

## Submission notes

Version 1.6.0 is packaged as `dist/spelling-b-chrome-extension-1.6.0.zip`; `manifest.json` is at the ZIP root. The extension contains no remote code, analytics, advertising, developer accounts, host permissions, or application network requests. Chrome's optional built-in language model is managed and executed by Chrome; generation requires no added extension permission or third-party AI service. Classroom, spreadsheet, sentence, profile, and progress CSV files are processed or generated on the device.

The `storage` permission saves settings and learning progress locally. The `tts` permission speaks practice words using a voice provided by Chrome or the operating system. The bundled phonics material is attributed under CC BY-NC-SA 4.0, and the bundled high-frequency source data is public domain; license files are included in the package.
