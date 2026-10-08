# Spelling B

A dependency-free Go and Manifest V3 learning app with configurable word-list practice, 100 high-frequency word levels, sound-pattern mastery, and a seven-level daily typing trail. The Chrome extension works fully offline; speech uses an installed browser or ChromeOS voice and feedback sounds use the Web Audio API.

## Guides and user workflows

The dependency-free documentation site in [docs/index.html](docs/index.html) provides separate Student, Parent, and Teacher guides. The same guides are embedded in the Settings → Guides tab for offline access inside the app. Settings also includes Word Lists, Practice Plan, Classroom, Profiles & Data, and Appearance & Voice tabs; the Classroom tab includes the build, review, export, and distribute workflow.

Word Lists remembers the current list across page visits. Its selector also includes **+ Add New List**, which opens a new collapsible list card in Settings. Settings warns before leaving with unsaved changes and gives a one-time example-sentence reminder after a newly created list is saved without complete examples.

## Run

```sh
/usr/local/go/bin/go run .
```

Open <http://localhost:8080>. Use the gear icon to edit word lists and the lesson plan.

Environment variables:

- `ADDR` — listen address (default `:8080`)
- `DATA_FILE` — settings JSON path (default `data/settings.json`)

## Test

```sh
/usr/local/go/bin/go test ./...
```

## Configurable practice plan

Settings controls:

- how many days use Beginner mode (`0` starts in Advanced mode);
- separate Copy, Letter Builder, Guided, and Spell repetition counts for Beginner mode;
- separate repetition counts for the same lessons in Advanced mode;
- `0` repetitions disables an individual lesson.

A mode that will run must keep at least one lesson enabled. The default Beginner plan is Copy 2, Letter Builder 3, Guided 1, and Spell 0. The default Advanced plan is Copy 1, Letter Builder 0, Guided 2, and Spell 2.
Advanced mode can optionally finish with a focused missed-word review. Only incorrect submissions from the Spell stage are eligible—response time, typing speed, Guided answers, and Letter Builder choices never add work. Settings controls correct repetitions per reviewed word (1–10) and the maximum unique words reviewed per day (1–50); enabling review requires Advanced Spell to be at least 1. New installations default to one repetition and at most five words, while migrated settings leave the new option disabled until a parent or teacher enables it.


Letter Builder adds three choices per repetition, up to 24 choices, always in rows of three. Choices are unique and the upcoming correct letter is excluded from the current decoys to prevent clicks during the transition from becoming accidental errors. Mouse/touch choices retain a short success animation, while correct keyboard input advances immediately so fast typing is not dropped.

After an incorrect Spell answer, the correct word remains visible in the same style as Copy. The learner must correct the typed answer before the explicit retry button becomes available.

After completing a practice day, **Start a new day** advances the saved day counter and loads that day's configured mode. Each word list keeps separate progress in the browser. Changing the lesson configuration safely restarts the current day's stage progress.
Each completed Word List day awards at most one local sticker. The child-facing Sticker Book has its own page in the top navigation, with 20 packs of 10 stickers (200 total). New learners start in **Surprise Me** mode, which chooses from all unearned stickers; learners can instead select a specific pack, and completing it automatically returns rewards to Surprise Me. Awards are tied to the list and day so reopening a finished lesson cannot duplicate them.


## Classroom setup exchange

The Settings page can export the current word lists, optional example sentences and reviewed phoneme–grapheme mappings, generation instructions, lesson plan, and test length as a versioned `.spellingb` classroom setup. The file contains no student progress, scores, metrics, stickers, or day counters. Students can import it with the file picker or drag-and-drop, preview its contents, and either replace their lists or merge lists. Format 2 gives each list a stable ID, so later teacher exports can rename or change that list while keeping the student’s local practice progress. Format 1 files remain supported, and matching legacy progress is migrated when possible. Every import saves the previously stored configuration as a one-click recoverable backup.

Teachers can also import existing `.csv`, `.tsv`, and `.xlsx` workbooks. The on-device preview supports six layouts: titled columns, titled rows, two-column list/word records, one flat list, untitled rows, and untitled columns. CSV imports detect comma, tab, semicolon, and pipe delimiters, while still allowing the teacher to choose the delimiter. Multi-sheet XLSX files include a worksheet picker. Spreadsheet imports change word lists only; lesson settings remain unchanged.

The workflow is completely local and needs no hosted service. Use **Import classroom setup** or drag a file onto the Settings drop zone. Every import displays a layout or content preview and never silently changes settings. The extension intentionally does not register an operating-system file handler, keeping the same warning-free manifest on ChromeOS, Linux, Windows, and macOS.

## Learner profiles and transfer

Spelling B supports up to 50 local learner profiles. Profiles share the device's word lists, lesson plan, appearance, and voice settings, while keeping word-list progress, the current list, high-frequency and phonics progress, typing levels, session metrics, test results, and stickers separate. Existing learner data is copied into the initial **Learner** profile on first use of this version; the legacy storage records are retained as a rollback safeguard.

The active profile appears in the title bar. Settings → Profiles & Data can create, switch, rename, or delete profiles. Deleting a profile requires confirmation, the last profile cannot be deleted, and switching warns when unsaved Settings changes would be lost.

**Export active profile** creates a local `.spellingb-profile` JSON file containing that learner's data plus a snapshot of the word lists needed to interpret list progress on another device. Import validates the format and allowed storage records, always creates a new profile, and adds only missing stable-ID word lists; it never replaces existing lists or lesson settings. Profile files are limited to 8 MB and are read only after the user chooses one. They may contain a learner name and detailed educational history, so they should be handled as private student records.

## Learning metrics

Practice and spelling-test sessions are stored locally in the browser. The Progress page reports:

- individual word-response times, capped at 60 seconds;
- average word time;
- spelling accuracy;
- correct-position character accuracy;
- copy speed in characters per minute (CPM), calculated only from Copy attempts and excluding the slowest 25% of samples;
- Backspace corrections;
- Letter Builder choice accuracy;
- per-stage timing and accuracy.

The most recent 250 sessions are retained. Progress includes a spreadsheet-safe **Export teacher CSV** action with session, activity, stage, word-attempt, accuracy, timing, CPM, and sound-mastery rows. Export happens only when the user presses the button; the file is created locally and metrics never leave the device automatically.
Successful Word List practice builds mastery for 98 reviewed sound-to-spelling patterns. Copy earns 0.05 points; Letter Builder earns 0.1, 0.15, or 0.2 for its 3-, 6-, or 9-plus-choice rounds; Guided earns 0.4; and Spell or missed-word Review earns 0.6. Incorrect attempts do not add or subtract mastery. Each word contributes at most 10 points, only the ten strongest word totals count, and a pattern reaches mastery at 100. A generated, deterministic lookup associates 116,563 CMUdict headwords with those reviewed patterns at word-specific character positions, allowing arbitrary teacher-supplied dictionary words to contribute without AI-generated segmentation. A separate child-facing bank keeps at least 20 hand-reviewed examples per pattern (1,960 pattern-word associations in total); only those curated words can be selected for an automatic focus list. The pattern scope was cross-checked against the bundled Open Source Phonics sequence, UFLI's Suggested Scope & Sequence for Teaching Phoneme–Grapheme Correspondences, and a reproducible audit of CMUdict grapheme–phone alignments found in at least 100 distinct headwords. The raw 294-candidate output and review method are documented in [docs/CMUDICT-MAPPING-AUDIT.md](docs/CMUDICT-MAPPING-AUDIT.md); statistical chunks are never added as new tracked patterns without review. Broad General American IPA is used only as a compact parent/teacher label, and pronunciation can vary by speaker and dialect. From Progress, a parent or teacher can create a 12-word **Sound Pattern Focus** list that prioritizes patterns already in progress and then introduces unpracticed ones.


The Progress page’s “Words needing practice” report may still use timing as a parent/teacher diagnostic. Timing is never used by the automatic missed-word review.

## High Frequency Words

The **High Frequency** page divides 1,000 unique common English words into 100 levels of 10 words. Each level has a persistent 0–100 mastery score: Copy earns 0.05 points, Guided earns 0.4, and Spell earns 0.6 per successful entry, with each word capped at 10 points. Three rounds of all three stages make one 31.5-point practice pass, so a new level normally reaches mastery on its fourth pass. Incorrect entries earn no credit, and Spell retains its correction-and-confirmation step. Existing completed levels migrate as mastered, while the saved position of an unfinished level becomes its starting score.

Successful High Frequency attempts also feed the same reviewed Sound Pattern metrics used by Word Lists. Historical High Frequency sessions are backfilled once from their stored correct attempts. The bundled deterministic lookup plus curated fallback currently covers at least 99% of the 1,000-word course; words without a reviewed mapping still build level mastery but do not receive guessed sound-pattern credit. Level completion and overall progress stay in local browser storage.

The word data is a classroom-friendly, de-duplicated adaptation of the public-domain Moby Words II general-text and Internet frequency lists from Project Gutenberg. Source data, the reproducible generator, and attribution are bundled in the repository; the finished extension needs no network access.

## Sound Patterns

The child-facing **Sound Patterns** page turns Word List practice into a collection of 98 sound-to-spelling patterns. It separates patterns into **Keep Practicing**, **Try Something New**, and **Mastered**, avoids IPA in the student view, and can create a focused 12-word list using the same configurable lesson stages as Word Lists. A learner can also practice one pattern at a time. Teacher-assigned lists remain the main source of mastery evidence, while automatic lists draw only from the curated child-safe bank.

The earlier 120-lesson Open Source Phonics course is retired from the student workflow. Its original printable PDF, parsed lesson data, license, and existing learner progress records remain packaged for educator reference and rollback compatibility. The curriculum is by Dr. Katie Spurlock / Open Source Phonics and is adapted under CC BY-NC-SA 4.0. See LICENSE-PHONICS.md.

## Typing

The **Typing** page is a seven-level daily trail with tactile F/J markers and page-wide keyboard capture after accidental trackpad clicks. It begins with Home Row and adds groups of two to four keys from the middle of the keyboard outward until the full letter keyboard is available. Balanced shuffled cycles give every eligible key the configured number of turns in each round. Color-coded finger zones, consistent illustrated hand guides, a split keyboard, a 0–25 mm split-gap control, and one to six repetitions per key can each be configured in Settings; the original unified, uncolored keyboard remains available. Each daily mission has three training rounds and tracks session CPM using the fastest 75% of correct-key intervals. A 60 CPM practice session offers the three-sentence test, and reaching 60 CPM on that test unlocks the next level. Tests retain the learner's best CPM score and award Growing Typist, Keyboard Explorer, Gold Star Typist, or Lightning Bee rankings. Daily participation and streaks stay on the device.

## Text-to-speech voices

The Settings page explains how to choose or install voices on ChromeOS, Windows, and Linux and includes a voice-preview button. On ChromeOS, an English voice labeled **(Natural)** is recommended. Sentence playback removes trailing punctuation and emphasizes the spelling word using separate plain-text speech segments. Device-local Settings controls let the user tune regular rate, emphasized-word rate, and emphasized-word pitch, with an immediate preview. Markdown and punctuation markers such as `**word**` or `!word!` are stripped rather than sent to TTS. Some system-provided Natural voices may process speech online; this is controlled by ChromeOS rather than Spelling B.

## AI-generated example sentences

On supported devices, the Chrome extension can use Chrome's built-in on-device Prompt API to generate a short example and an ordered sound-to-spelling mapping for each spelling word. Settings exposes sentence style, vocabulary, and preferred-length instructions in an editable text box with a one-click reset. The reviewed child-safety system prompt is built in and is no longer editable. Spelling B supplies one word per model request. The default teacher prompt asks for one three-word phrase rather than a complete sentence, but longer or shorter results are accepted and shown for review. Generated mappings remain editable and must cover every letter exactly once before they can be saved. They provide teacher reference data; core learning metrics use the app's curated mapping bank.

The model is managed by Chrome and may require a substantial first-time download. Before starting it, Spelling B shows an approval dialog with Chrome's operating-system, storage, GPU/CPU, memory, and network requirements; canceling leaves local file import and manual entry available. No spelling words are sent to the developer or a third-party API. Unsupported devices can copy a list-specific, example-only prompt into an online model and paste its JSON response directly into the list; Spelling B never sends it itself. Sound mappings are intentionally omitted from that copied prompt because student metrics use the deterministic bundled mapping bank. Custom and older JSON responses may still include mappings, and those remain importable and editable as teacher reference data. If a web model adds Markdown-style backslashes such as `\[` to an otherwise valid response, the paste and JSON-file import paths repair only those unsupported escapes while preserving valid JSON escapes. Legacy sentence-only JSON and four-column files with a pronunciation field remain accepted. New CSV exports contain the word, sentence, and sound-mapping columns.

If Chrome reports that it cannot create a model session, restart Chrome and inspect `chrome://on-device-internals` → **Broker State** and `chrome://gpu`. Spelling B includes the Chrome version, availability before and after session creation, and user-activation state in its error message to make browser-level failures diagnosable.

Saved sentences and reviewed sound mappings are included in classroom exports and can be distributed to students who do not have Chrome AI support. Each word list can also export its words, examples, and mappings as a CSV file that can be edited and imported into another list. During practice, a second speech button reads the stored sentence using the same text-to-speech voice as the spelling word; no AI is needed at practice time.

## Spelling test

The **Test** page selects up to the configured number of words from every list. Each selected word gets one answer, feedback is withheld during the test, and the final screen reports scores and missed words separately for each list. Configure the per-list limit in Settings.

## Offline Pixelbook deployment

Build self-contained Linux artifacts on the development machine:

```sh
make GO=/usr/local/go/bin/go artifacts
```

The `dist` directory contains:

- `spelling-b-linux-amd64` for an Intel Pixelbook (`uname -m` reports `x86_64`)
- `spelling-b-linux-arm64` for an ARM Chromebook (`uname -m` reports `aarch64` or `arm64`)
- `SHA256SUMS` for copy verification

On the Pixelbook, enable the ChromeOS Linux development environment while network access is still available. Copy the matching binary into **Linux files** (external/Downloads mounts may not allow executables), then run:

```sh
mkdir -p ~/spelling-b
cp /path/to/spelling-b-linux-amd64 ~/spelling-b/spelling-b
cd ~/spelling-b
chmod +x spelling-b
./spelling-b
```

Open <http://localhost:8080> in Chrome. The executable contains all templates and browser assets and requires no Go installation or network connection. Settings are written to `~/spelling-b/data/settings.json`; browser-based practice progress and metrics remain in that Chrome profile.

To verify the copy, place `SHA256SUMS` beside the original artifact name and run `sha256sum -c SHA256SUMS`. ChromeOS text-to-speech should use a locally installed system voice; confirm that voice works before taking the device fully offline.

## Chrome extension (recommended for Pixelbook)

Build the offline Manifest V3 extension:

```sh
make GO=/usr/local/go/bin/go extension
```

This creates:

- `dist/chrome-extension/` — an unpacked build for local testing with **Load unpacked**;
- `dist/spelling-b-chrome-extension-1.6.0.zip` — the Chrome Web Store release artifact;
- `dist/spelling-b-chrome-extension.sha256` — a copy-verification checksum.

For local testing, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome-extension`. Click the Spelling B toolbar icon to open the full-page app.

The extension works without the Go server or a network connection. It uses only Chrome's `storage` permission for local settings/progress and `tts` permission for installed ChromeOS voices. It requests no host permissions and makes no network calls. Web Store description text, permission justifications, and submission notes are in `chrome/STORE_LISTING.md`; the privacy policy is in `chrome/PRIVACY.md`.

Settings and learning history from the Go-hosted version are not automatically migrated because extension storage is isolated from website storage.
