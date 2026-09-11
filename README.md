# Spelling B

A small, dependency-free Go spelling practice app. Word lists and lesson settings are stored in a local JSON file, speech uses the browser's Web Speech API, and feedback sounds use the Web Audio API.

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

A mode that will run must keep at least one lesson enabled. Defaults preserve the original plan: two Beginner days with Copy, Letter Builder, and Guided at three repetitions, followed by Advanced days with Guided and Spell at three repetitions.

Letter Builder adds three choices per repetition, up to 24 choices, always in rows of three. Choices are unique and the upcoming correct letter is excluded from the current decoys to prevent clicks during the transition from becoming accidental errors.

After completing a practice day, **Start a new day** advances the saved day counter and loads that day's configured mode. Each word list keeps separate progress in the browser. Changing the lesson configuration safely restarts the current day's stage progress.

## Learning metrics

Practice and spelling-test sessions are stored locally in the browser. The Progress page reports:

- individual word-response times, capped at 60 seconds;
- average word time;
- spelling accuracy;
- correct-position character accuracy;
- typing speed in characters per minute (CPM);
- Backspace corrections;
- Letter Builder choice accuracy;
- per-stage timing and accuracy.

The most recent 100 sessions are retained. Metrics never leave the device.

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
- `dist/spelling-b-chrome-extension.zip` — the upload artifact for the Chrome Web Store;
- `dist/spelling-b-chrome-extension.sha256` — a copy-verification checksum.

For local testing, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome-extension`. Click the Spelling B toolbar icon to open the full-page app.

The extension works without the Go server or a network connection. It uses only Chrome's `storage` permission for local settings/progress and `tts` permission for installed ChromeOS voices. It requests no host permissions and makes no network calls. Web Store description text, permission justifications, and submission notes are in `chrome/STORE_LISTING.md`; the privacy policy is in `chrome/PRIVACY.md`.

Settings and learning history from the Go-hosted version are not automatically migrated because extension storage is isolated from website storage.
