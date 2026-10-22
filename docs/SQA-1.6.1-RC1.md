# Spelling B 1.6.1-RC1 SQA checklist

Use this checklist for hands-on release-candidate testing over several days. Record failures in the defect log at the end, including the learner profile, word list, stage, and whether the device was online.

## Release under test

- [ ] Version shown in `chrome://extensions` is **1.6.1-RC1** (`1.6.1` manifest version).
- [ ] Artifact is `dist/spelling-b-chrome-extension-1.6.1-RC1.zip`.
- [ ] SHA-256 is `cc5dc675a4610f80daabe696f8da46a4d7c4df27ef2ae715eb5d9c8c127d7087`.
- [ ] Primary test device and Chrome/ChromeOS version recorded below.
- [ ] A backup of the learner profile and classroom setup was exported before upgrade testing.

| Test item | Value |
|---|---|
| Tester | |
| Device | |
| OS version | |
| Chrome version | |
| TTS voice | |
| Install type | Fresh / Upgrade |
| Start date | |

## Suggested test schedule

- **Day 1:** installation, settings, profiles, imports, accessibility, and basic smoke tests.
- **Day 2:** a complete Beginner Word List day plus High Frequency and Sound Pattern practice.
- **Day 3:** another Word List day, typing practice, typing exploit checks, and a spelling test.
- **Day 4:** Advanced practice, missed-word review, statistics, stickers, and profile transfer.
- **Day 5:** fully offline run, upgrade/restart checks, ChromeVox or keyboard-only pass, and final regression sweep.

## 1. Installation and upgrade

### Fresh installation

- [ ] The unpacked extension loads without manifest warnings.
- [ ] Clicking the extension toolbar icon opens Spelling B in a full page.
- [ ] The first page has a Starter Words list and no broken or permanently loading controls.
- [ ] Every navigation destination opens: Word Lists, High Frequency, Sound Patterns, Typing, Test, Progress, Sticker Book, and Settings.
- [ ] The bee, learner selector, and navigation styling appear consistently on every page.
- [ ] Reloading each page produces no visible error and no uncaught console exception.

### Upgrade from 1.6.0

- [ ] Existing word lists and example sentences remain intact.
- [ ] Current-list selection remains intact after navigating away and restarting Chrome.
- [ ] Learner profiles, practice day numbers, metrics, typing levels, stickers, and High Frequency progress remain intact.
- [ ] Previously saved teacher/AI sound mappings are no longer shown or exported.
- [ ] Sound Pattern mastery still uses the bundled sound bank and retains existing progress.
- [ ] An older typing day without accuracy counters opens normally and does not corrupt progress.

## 2. Settings and word-list administration

- [ ] Settings tabs work with mouse, touch, Tab, Shift+Tab, Left Arrow, and Right Arrow.
- [ ] Adding a list opens the new list editor and places focus in its title.
- [ ] `+ Add New List` in the student Word List selector opens Settings in the right place.
- [ ] Five or more lists remain manageable; list cards collapse and show the correct title and word count.
- [ ] Duplicate and blank words are handled as expected when saving.
- [ ] A list cannot be saved without a title or at least one word.
- [ ] Unsaved changes are clearly identified.
- [ ] Navigating away with unsaved changes presents a warning.
- [ ] Saving a new list without examples shows the one-time example-sentence reminder.
- [ ] The reminder is not shown again after it has been dismissed or accepted.
- [ ] Beginner and Advanced repetition values save, including `0` to disable a stage.
- [ ] Missed-word review requires Advanced Spell to be at least `1`.
- [ ] Typing practice length saves and affects the number of keys in each round.
- [ ] Voice rate and pitch previews work and retain their values.

## 3. Example sentences and homophones

- [ ] Every word has a visible Example field even before examples are generated.
- [ ] The review area is named **Review example sentences** and has no pronunciation or sound-mapping fields.
- [ ] Chrome AI requests sentence data only; its review result contains no sound-mapping workflow.
- [ ] Canceling the Chrome model-download prompt leaves manual entry and import available.
- [ ] `Copy AI prompt` requests one sentence field per word and can be pasted into an online model manually.
- [ ] Pasted JSON imports valid examples, including JSON containing harmless escaped brackets from a web model.
- [ ] Extra legacy pronunciation or mapping fields are ignored rather than displayed.
- [ ] Per-list CSV export contains only `word` and `sentence` columns.
- [ ] Sentence CSV/TSV/JSON import fills only matching words in the selected list.
- [ ] A sentence cannot use another spelling word from the same list.
- [ ] Markdown and punctuation are not spoken as part of sentence TTS.

### Homophone presentation

- [ ] Add a homophone pair with distinct examples, such as `there` and `their`.
- [ ] Guided and Spell show the sentence with the target word replaced by one blank underline.
- [ ] The target spelling does not leak into the visible sentence clue.
- [ ] Sentence TTS speaks the complete stored example with the target word included.
- [ ] Word TTS still speaks only the spelling word.
- [ ] Copy shows the word and offers both the word-audio and sentence-audio buttons.
- [ ] A word without an example does not show an empty clue or sentence button.

## 4. Word List learner flow

### Copy

- [ ] The word is visible and input accepts typing after clicking anywhere reasonable on the page.
- [ ] The small speaker button pronounces the word but does not automatically replay unexpectedly.
- [ ] Enter does nothing when the answer is blank.
- [ ] Correct and incorrect results are distinguishable by text/symbol, not color alone.

### Letter Builder

- [ ] Rounds show 3, 6, and 9 unique choices as configured.
- [ ] Choices contain no duplicate letters.
- [ ] The next correct letter is not used as a decoy during the transition.
- [ ] Fast keyboard entry does not lose valid letters during the choice transition.
- [ ] A wrong visible choice gives a clear message and visual indication.
- [ ] A keyboard letter not among the choices gives a clear message and visual indication.
- [ ] The final letter appears normally rather than leaving a green dot.

### Guided, Spell, and review

- [ ] Guided marks correct and incorrect positions with shape/text decoration as well as color.
- [ ] Spell provides no per-character correctness hints before submission.
- [ ] An incorrect Spell answer displays the correct word and requires the learner to fix the entry.
- [ ] Enter accepts the corrected word as well as the confirmation button.
- [ ] Holding Enter cannot submit a blank answer on the next screen.
- [ ] Clicking a speech button and then pressing Enter submits a nonblank answer instead of replaying speech.
- [ ] Clicking within an entered word moves the real caret and subsequent text appears at that position.
- [ ] Advanced missed-word review includes only words misspelled during Spell.
- [ ] Review respects its configured repetitions and maximum word count.
- [ ] Finishing a day, visiting Settings, and returning advances correctly instead of restarting the finished day.
- [ ] Starting a new day resets stage progress and increments the day counter.

## 5. Spelling test

- [ ] Test selection respects the configured maximum words per list.
- [ ] Each selected word is asked exactly once.
- [ ] Word-list selection includes words from every configured list when available.
- [ ] No correctness feedback is shown until the test ends.
- [ ] Blank answers cannot be submitted.
- [ ] Final results show correct and missed counts separately for each list.
- [ ] Test attempts appear correctly in Progress without changing practice-day counters.

## 6. High Frequency and Sound Patterns

### High Frequency

- [ ] Copy displays the word once, with the placeholder inside the input rather than above it.
- [ ] Guided and Spell do not expose a cheat-sheet word list.
- [ ] Incorrect Spell answers require correction and confirmation.
- [ ] Repeated sessions add mastery at the documented rates and do not master a level in one trivial pass.
- [ ] Completed levels remain completed after reload and profile switching.
- [ ] Successful attempts feed Sound Pattern mastery through the bundled lookup.

### Sound Patterns

- [ ] Keep Practicing, Try Something New, and Mastered groups show sensible results.
- [ ] The initial view limits crowded pattern results and **Show more** reveals the remainder.
- [ ] A pattern score never exceeds 100 and a single word contributes no more than 10 points.
- [ ] Incorrect attempts do not subtract mastery or add credit.
- [ ] **Create Sound Pattern Focus list** favors several words for the same selected pattern rather than random unrelated words.
- [ ] The generated focus list contains at most 12 words and opens in Word Lists.
- [ ] Sources and methodology explain phoneme/grapheme notation, CVC patterns, CMUdict use, and the reviewed sound bank.
- [ ] No UI suggests that AI-generated mappings affect mastery.

## 7. Typing practice and exploit regression

### Layout and guidance

- [ ] Keyboard rows line up with the background, including `Q` and `/`.
- [ ] F and J have visible tactile-position bars.
- [ ] Split keyboard, finger colors, hands, and gap slider each work independently.
- [ ] Gap values from 0 through 25 mm render without clipping or horizontal drift.
- [ ] Hands remain visible during every applicable round.
- [ ] Each eligible key appears the configured number of times in a balanced shuffled cycle.
- [ ] The same key is not presented twice in a row when another order is possible.
- [ ] Round 1 highlights the requested key.
- [ ] Round 2 shows the keyboard without highlighting until an error.
- [ ] Round 3 begins blank and progressively reveals guidance after errors.
- [ ] Clicking outside the white practice area does not stop keyboard input.

### 60 CPM and 80% accuracy gates

- [ ] During practice, the UI displays both CPM and accuracy.
- [ ] Completing all rounds below 60 CPM keeps the test locked.
- [ ] Completing all rounds at 60+ CPM but below 80% accuracy keeps the test locked.
- [ ] Rapidly pressing many home-row keys cannot unlock the test when accuracy is below 80%.
- [ ] Completing all rounds at 60+ CPM and exactly 80% accuracy offers the test.
- [ ] A test at 60+ CPM but below 80% accuracy does not master the level or unlock the next level.
- [ ] A test at 80%+ accuracy but below 60 CPM does not master or unlock.
- [ ] A test at 60+ CPM and 80%+ accuracy masters the level and unlocks the next level.
- [ ] Failure text says whether CPM, accuracy, or both need improvement.
- [ ] A fast inaccurate attempt does not replace an existing passing best score.
- [ ] Three different sentences are used in a test and typed characters are not visually graded during the test.
- [ ] Typing metrics store both CPM and accuracy in Progress.

## 8. Progress, metrics, and stickers

- [ ] Progress graphs render with real data and have understandable text labels or summaries.
- [ ] Copy CPM uses only Copy samples and excludes the slowest 25%.
- [ ] Word timings are capped at 60 seconds so an idle break does not dominate averages.
- [ ] Accuracy, character accuracy, correction count, Letter Builder choices, and stage totals update correctly.
- [ ] Sound Pattern mastery uses bundled word mappings for teacher-provided lists.
- [ ] Teacher CSV export opens safely in spreadsheet software and contains the visible metrics.
- [ ] Formula-like learner data is escaped in CSV cells.
- [ ] A completed Word List day awards no more than one sticker.
- [ ] The Sticker Book is reachable directly from the main navigation.
- [ ] Surprise Me is the default and a completed selected pack returns to Surprise Me.
- [ ] Reopening a finished session cannot award a duplicate sticker.

## 9. Profiles and classroom transfer

### Learner profiles

- [ ] Create, rename, switch, and delete profiles; the final profile cannot be deleted.
- [ ] The active learner selector remains on the left side of the navigation area.
- [ ] Word Lists are shared, while progress, current list, metrics, typing, stickers, and accessibility preferences remain learner-specific.
- [ ] Exporting and importing a profile preserves all learner progress and rewards.
- [ ] Import creates a new profile and does not overwrite an existing learner.
- [ ] The mastered fixture in `test_data` displays all completed rewards and progress when imported in a development build.

### Classroom sharing

- [ ] Exported `.spellingb` files contain lists, examples, and lesson settings but no learner progress.
- [ ] Replace import produces the same classroom setup on a second device.
- [ ] Merge import retains personal lists and avoids duplicate words.
- [ ] Re-importing a changed package with stable list IDs updates the list without resetting matching progress.
- [ ] The pre-import backup restores the previous setup.
- [ ] CSV delimiter detection works for comma, tab, semicolon, and pipe files.
- [ ] Spreadsheet layout choices work for titled columns, titled rows, list/word pairs, flat lists, untitled rows, and untitled columns.
- [ ] XLSX worksheet selection works for a workbook with multiple sheets.

## 10. Accessibility

### Keyboard and focus

- [ ] Pressing Tab first exposes **Skip to main content**, and activating it moves past repeated navigation.
- [ ] Every link, button, input, summary, dialog action, and settings tab has a clearly visible focus indicator.
- [ ] All core activities can be completed with the keyboard alone.
- [ ] Page-wide typing ignores Ctrl, Alt, Meta, Tab, browser shortcuts, and text entered into Settings fields.
- [ ] Dialog focus remains inside an open dialog and returns to a sensible control when closed.

### Learner display preferences

- [ ] Larger text applies across every page without clipped controls or lost content.
- [ ] Higher contrast removes the decorative background and strengthens borders and text contrast.
- [ ] Reduced motion stops flashes, bouncing celebrations, and animated transitions.
- [ ] The operating system/browser reduced-motion preference works even when the in-app option is off.
- [ ] Accessibility selections follow the active learner profile and survive restart and profile export/import.
- [ ] One learner’s accessibility selections do not silently change another learner’s selections.

### Zoom and assistive technology

- [ ] At 200% browser zoom, all functions remain available without overlapping text.
- [ ] At 400% zoom, content reflows and can be reached without losing controls.
- [ ] ChromeVox announces page headings, labeled inputs, progress, answer feedback, and dialogs meaningfully.
- [ ] Correct/incorrect feedback remains understandable with color perception removed or grayscale enabled.
- [ ] Speech buttons announce a loading/busy state and return to their original accessible label afterward.

## 11. Speech and offline behavior

- [ ] Word, Copy, sentence, High Frequency, Sound Pattern, and test speech controls all work with the selected voice.
- [ ] A visible spinner appears while speech is taking time to start.
- [ ] Repeated clicks do not overlap multiple words or leave a spinner permanently active.
- [ ] Speech failure produces understandable feedback and does not block typing.
- [ ] With Wi-Fi disabled before launch, saved lists, all practice modes, typing, statistics, stickers, imports, exports, and bundled sound mappings work.
- [ ] After restarting Chrome offline, all saved progress is still present.
- [ ] Chrome AI generation is unavailable or reports a useful error offline without affecting manual examples.
- [ ] Developer tools show no application network request for remote scripts, JavaScript, Wasm, analytics, ads, or learner data.

## 12. Soak and child-use observations

Repeat these during normal learner use rather than directing every action.

- [ ] Complete at least three Word List days on the same list.
- [ ] Complete at least one Beginner-to-Advanced transition.
- [ ] Leave and return through Settings after a completed day.
- [ ] Use audio repeatedly under both good and poor connectivity.
- [ ] Observe whether accidental trackpad clicks, long Enter presses, fast typing, or repeated speaker clicks cause missed or duplicate actions.
- [ ] Verify sentence blanks help distinguish homophones without revealing the answer.
- [ ] Verify the typing accuracy requirement encourages deliberate typing without feeling punitive.
- [ ] Record confusing wording, controls the learner cannot find, and places where adult help is required.

## Release exit criteria

- [ ] No open **Blocker** or **High** defects.
- [ ] No data loss during upgrade, profile transfer, classroom import, or restart.
- [ ] Offline core lessons complete successfully.
- [ ] Word List, High Frequency, Sound Patterns, Typing, Test, Progress, and Sticker Book each complete at least one full happy-path run.
- [ ] Typing cannot be mastered below either 60 CPM or 80% accuracy.
- [ ] Accessibility checks have no keyboard trap or inaccessible core action.
- [ ] Any accepted Medium or Low issue has a written workaround or follow-up issue.
- [ ] Final artifact checksum matches the release candidate tested above.

## Defect log

Severity guide:

- **Blocker:** data loss, app cannot start, or core practice cannot be completed.
- **High:** wrong scoring/progress, broken import/export, accessibility blocker, or repeatable crash.
- **Medium:** feature works only with a workaround or produces substantial confusion.
- **Low:** cosmetic, wording, spacing, or minor inconvenience.

| ID | Date | Severity | Device/profile | Area and exact steps | Expected | Actual | Reproducible? | Screenshot/log |
|---|---|---|---|---|---|---|---|---|
| SQA-001 | | | | | | | | |
| SQA-002 | | | | | | | | |
| SQA-003 | | | | | | | | |

## Final sign-off

| Decision | Check |
|---|---|
| Ready to publish | [ ] |
| Retest required | [ ] |
| Do not publish | [ ] |

Final notes:

>

Tester/sign-off: ____________________  Date: ____________________
