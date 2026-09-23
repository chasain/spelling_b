# Chrome Web Store listing copy

## Summary

Kid-friendly, offline spelling, high-frequency word, phonics, and typing practice.

## Description

Spelling B helps children practice spelling at their own pace.

- Create as many titled word lists as you need.
- Export a classroom setup once and import or merge it offline on student devices.
- Bring in existing teacher lists from CSV, TSV, or XLSX with a selectable layout preview.
- Configure beginner and advanced lesson stages.
- Tune an editable sentence-generation prompt, generate teacher-reviewable examples with Chrome's on-device AI, or import them from a local file.
- Practice by copying, building words from letter choices, following color hints, and spelling from speech.
- Start a new day while keeping long-term progress.
- Take a no-feedback spelling test across all lists.
- Master 1,000 high-frequency words in 100 focused levels of 10 words.
- Work through 120 Open Source Phonics lessons using 160 focused, interactive example-word practice sets and tutor guides.
- Build touch-typing skills through gated daily missions, balanced key practice, seven incremental key levels, configurable keyboard guidance, and repeatable ranked tests.
- Review local session metrics including accuracy, response time, CPM copy speed, and difficult words.
- Work offline after installation when using a locally installed text-to-speech voice.

All settings and learning data stay in the local Chrome profile. Spelling B has no ads, analytics, accounts, or network requests.

## Permission justifications

**Storage:** Saves word lists, settings, classroom-import backups, word-list, high-frequency, and phonics progress, typing scores, test results, and session metrics locally in the Chrome profile.

**Text-to-speech:** Pronounces the current spelling word using a voice installed in Chrome or ChromeOS.

## Single purpose

Provide configurable, offline word-list, high-frequency word, phonics, typing, and spelling-test practice for children.

## Version 1.5.0-RC1 tuning notes

- Added optional on-device example-sentence generation using Chrome's built-in Prompt API.
- Prefers one concise three-word phrase by default without rejecting other lengths; results must contain the spelling word and are explicitly prompted to be safe for an 8-year-old.
- Added teacher review and editing before generated sentences are saved.
- Added explicit teacher approval and a system-requirements warning before Chrome begins the initial model download.
- Added editable sentence-style instructions and a temporary advanced system-prompt editor, each with a reset button; generated results still require teacher review.
- Improved short-fragment generation by requesting one spelling word at a time, permitting fragments in the system instruction, retrying malformed results, and removing Markdown before review or speech.
- Added local JSON, CSV, and TSV sentence import as a backup for unsupported devices.
- Added per-list CSV export for sharing or editing example sentences.
- Added a sentence speech button that emphasizes the spelling word without passing markup or trailing punctuation to system voices.
- Included saved example sentences in offline classroom setup export and merge workflows.

## Store fields

- **Category:** Education
- **Language:** English (United States)
- **Homepage:** https://github.com/chasain/spelling_b
- **Privacy policy:** https://github.com/chasain/spelling_b/blob/main/chrome/PRIVACY.md

## Submission notes

Version 1.5.0-RC1 is ready for prompt tuning and testing. The eventual upload artifact is `dist/spelling-b-chrome-extension-1.5.0-RC1.zip`; `manifest.json` is at the ZIP root. The extension contains no remote code, analytics, advertising, accounts, host permissions, or application network requests. Chrome's optional built-in language model is managed and executed by Chrome; generation requires no added extension permission or third-party AI service. Classroom, spreadsheet, and sentence imports use local file pickers and are processed on the device.

The `storage` permission saves settings and learning progress locally. The `tts` permission speaks practice words using a voice provided by Chrome or the operating system. The bundled phonics material is attributed under CC BY-NC-SA 4.0, and the bundled high-frequency source data is public domain; license files are included in the package.
