# Spelling B

A dependency-free Go and Manifest V3 learning app with configurable word-list practice, 100 high-frequency word levels, 120 phonics lessons, and a seven-level daily typing trail. The Chrome extension works fully offline; speech uses an installed browser or ChromeOS voice and feedback sounds use the Web Audio API.

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

Letter Builder adds three choices per repetition, up to 24 choices, always in rows of three. Choices are unique and the upcoming correct letter is excluded from the current decoys to prevent clicks during the transition from becoming accidental errors. Mouse/touch choices retain a short success animation, while correct keyboard input advances immediately so fast typing is not dropped.

After an incorrect Spell answer, the correct word remains visible in the same style as Copy. The learner must correct the typed answer before the explicit retry button becomes available.

After completing a practice day, **Start a new day** advances the saved day counter and loads that day's configured mode. Each word list keeps separate progress in the browser. Changing the lesson configuration safely restarts the current day's stage progress.

## Classroom setup exchange

The Settings page can export the current word lists, lesson plan, and test length as a versioned `.spellingb` classroom setup. The file contains no student progress, scores, metrics, or day counters. Students can import it with the file picker or drag-and-drop, preview its contents, and either replace their lists or merge lists with matching titles. Every import saves the previously stored configuration as a one-click recoverable backup.

Teachers can also import existing `.csv`, `.tsv`, and `.xlsx` workbooks. The on-device preview supports six layouts: titled columns, titled rows, two-column list/word records, one flat list, untitled rows, and untitled columns. CSV imports detect comma, tab, semicolon, and pipe delimiters, while still allowing the teacher to choose the delimiter. Multi-sheet XLSX files include a worksheet picker. Spreadsheet imports change word lists only; lesson settings remain unchanged.

The workflow is completely local and needs no hosted service. Use **Import classroom setup** or drag a file onto the Settings drop zone. Every import displays a layout or content preview and never silently changes settings. The extension intentionally does not register an operating-system file handler, keeping the same warning-free manifest on ChromeOS, Linux, Windows, and macOS.

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

The most recent 100 sessions are retained. Metrics never leave the device.

## High Frequency Words

The **High Frequency** page divides 1,000 unique common English words into 100 levels of 10 words. Its multi-day Copy, Guided, and Spell practice emphasizes mastery rather than one-pass completion, including the required correction-and-confirmation step after a missed Spell answer. Level completion and overall progress stay in local browser storage.

The word data is a classroom-friendly, de-duplicated adaptation of the public-domain Moby Words II general-text and Internet frequency lists from Project Gutenberg. Source data, the reproducible generator, and attribution are bundled in the repository; the finished extension needs no network access.

## Phonics

The **Phonics** page contains all 120 sequential Open Source Phonics lessons. Student practice is the default view and provides 160 focused practice sets derived from labeled Examples sections (with labeled reading-word sections as a fallback). Sets are numbered like 1.1 and 1.2, contain at most 10 entries, and run through Copy, Guided, and Spell activities. The separate tutor guide, completion tracking, and unchanged printable PDF remain available. The curriculum is by Dr. Katie Spurlock / Open Source Phonics and is adapted under CC BY-NC-SA 4.0. See LICENSE-PHONICS.md. The lessons and PDF are bundled locally and require no network access.

## Typing

The **Typing** page is a seven-level daily trail with tactile F/J markers and page-wide focus recovery for accidental trackpad clicks. It begins with Home Row and adds groups of two to four keys from the middle of the keyboard outward until the full letter keyboard is available. Balanced shuffled cycles ensure every new key appears during the first round. Color-coded finger zones, consistent illustrated hand guides, a split keyboard, and a 0–25 mm split-gap control can each be configured in Settings; the original unified, uncolored keyboard remains available. Each daily mission has three short training rounds followed by a three-sentence test; reaching 60 CPM unlocks the next level. Tests retain the learner's best CPM score and award Growing Typist, Keyboard Explorer, Gold Star Typist, or Lightning Bee rankings. Daily participation and streaks stay on the device.

## Text-to-speech voices

The Settings page explains how to choose or install voices on ChromeOS, Windows, and Linux and includes a voice-preview button. On ChromeOS, an English voice labeled **(Natural)** is recommended. Some system-provided Natural voices may process speech online; this is controlled by ChromeOS rather than Spelling B.

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
- `dist/spelling-b-chrome-extension-1.4.0.zip` — the final Chrome Web Store upload artifact;
- `dist/spelling-b-chrome-extension.sha256` — a copy-verification checksum.

For local testing, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome-extension`. Click the Spelling B toolbar icon to open the full-page app.

The extension works without the Go server or a network connection. It uses only Chrome's `storage` permission for local settings/progress and `tts` permission for installed ChromeOS voices. It requests no host permissions and makes no network calls. Web Store description text, permission justifications, and submission notes are in `chrome/STORE_LISTING.md`; the privacy policy is in `chrome/PRIVACY.md`.

Settings and learning history from the Go-hosted version are not automatically migrated because extension storage is isolated from website storage.
