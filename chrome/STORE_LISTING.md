# Chrome Web Store listing copy

## Summary

Kid-friendly, offline spelling, high-frequency word, sound-pattern, and typing practice.

## Description

Spelling B helps children practice spelling at their own pace.

### Top 10 features

- Build unlimited titled word lists with configurable Copy, Letter Builder, Guided, Spell, and missed-word Review practice; parents and teachers control whether Guided offers timed pattern hints and ghost letters.
- Add spoken example sentences that hide the spelling word on screen—useful for homophones—or personalize examples through manual entry, local files, a copy-and-paste prompt, or Chrome's optional on-device AI.
- Share classroom setups or individual word lists offline, and import existing CSV, TSV, or XLSX teacher lists with a preview before saving.
- Keep up to 50 learners separate with local profiles, then export or import a learner’s progress for device transfers.
- Master 1,000 high-frequency words through 100 cumulative ten-word levels.
- Track mastery of 98 reviewed sound-to-spelling patterns, receive pattern-aware Guided help, and create focused practice from a curated child-safe word bank.
- Build touch-typing through balanced daily missions, seven keyboard levels, adjustable visual guidance, accuracy requirements, and ranked tests.
- Take no-feedback spelling tests across every assigned list, with results reported by list at the end.
- Review local progress graphs, accuracy, response time, copy CPM, difficult words, sound-pattern mastery, and exportable teacher CSV reports.
- Use learner-specific larger text, higher contrast, and reduced-motion options, and earn one of 200 offline stickers for completed Word List days.

Spelling B works offline after installation when a local text-to-speech voice is available. All settings and learning data stay in the local Chrome profile. It has no ads, analytics, developer accounts, host permissions, or application network requests.

## Permission justifications

**Storage:** Saves word lists, settings, local learner profiles, classroom-import backups, word-list, high-frequency, and sound-pattern progress, sticker awards, typing scores, test results, and session metrics locally in the Chrome profile.

**Text-to-speech:** Pronounces the current spelling word using a voice installed in Chrome or ChromeOS.

## Single purpose

Provide configurable, offline word-list, high-frequency word, sound-pattern, typing, and spelling-test practice for children.

## Store fields

- **Category:** Education
- **Language:** English (United States)
- **Homepage:** https://github.com/chasain/spelling_b
- **Privacy policy:** https://github.com/chasain/spelling_b/blob/main/chrome/PRIVACY.md

## Submission notes

Release 1.7.1 uses the upload filename `dist/spelling-b-chrome-extension-1.7.1.zip`; the packaged manifest identifies the version as `1.7.1`, and `manifest.json` is at the ZIP root. This release adds configurable Guided scaffolding with a letter counter, timed pattern hints, comparison words, and a later ghost-letter reveal. Reviewed spelling-family hints support silent letters, dialect-sensitive families, and suffixed forms without turning uncertain pronunciations into mastery credit. Homophone practice can display the example sentence with the spelling word blanked out, typing advancement now requires both 60 CPM and 80% accuracy, and learner display options improve keyboard, zoom, contrast, reduced-motion, and screen-reader use. The deterministic sound lookup, educator methodology review, local learner profiles, individual-list sharing, and profile transfer have also been expanded. The extension contains no remote code, analytics, advertising, developer accounts, host permissions, or application network requests. Chrome's optional built-in language model is managed and executed by Chrome; generation requires no added extension permission or third-party AI service. Classroom, spreadsheet, sentence, profile, and progress CSV files are processed or generated on the device.

The `storage` permission saves settings and learning progress locally. The `tts` permission speaks practice words using a voice provided by Chrome or the operating system. The bundled phonics material is attributed under CC BY-NC-SA 4.0, and the bundled high-frequency source data is public domain; license files are included in the package.
