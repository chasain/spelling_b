# CMUdict sound–spelling mapping audit

This audit checks Spelling B's conservative sound–spelling metric bank against the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict). It is an audit aid, not a phonics curriculum and not a rule that every statistically learned chunk belongs in the student-facing bank.

## Result

- Source: CMUdict's first listed North American English pronunciation for each distinct lowercase alphabetic headword.
- Source file: `cmudict.dict`, downloaded from the official `cmusphinx/cmudict` repository on 2026-10-06.
- Source SHA-256: `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
- Input: 117,493 distinct headwords.
- Successfully aligned: 117,454 headwords; 39 did not align.
- Review threshold: at least 100 distinct aligned headwords.
- Statistical candidates above the threshold: 294.
- Reviewed Spelling B bank after the audit: 98 patterns and 1,960 pattern–word associations, up from 32 patterns and 640 associations.
- Runtime lookup: 116,563 aligned CMUdict headwords have at least one word-specific association with those 98 reviewed patterns. The lookup does not promote other statistical chunks into tracked patterns.

The machine-readable list of all 294 candidates, their counts, ARPABET phones, broad IPA rendering, and sample headwords is in [`cmudict-mapping-audit.json`](cmudict-mapping-audit.json). Examples in that file are raw audit evidence and are not student word recommendations.

## Method

CMUdict does not include letter-to-phone boundaries. The audit therefore used [m2m-aligner](https://github.com/letter-to-phoneme/m2m-aligner), a many-to-many expectation-maximization aligner, with up to four letters and two phones per learned chunk. CMUSphinx's [letter-to-phoneme documentation](https://cmusphinx.github.io/page23/) describes why statistical alignment is needed when manual grapheme-to-phoneme alignments are unavailable.

The preparation script keeps the first pronunciation, removes CMUdict's stress digits, preserves stressed `AH` as /ʌ/, maps unstressed `AH0` to schwa /ə/, and treats unstressed `ER0` separately from stressed /ɝ/. A deterministic every-sixth-headword subset (19,583 entries) trained the model; the fixed model then aligned the full input. Counts are distinct headwords, so a repeated pattern within one word counts once.

```sh
python3 scripts/audit-sound-mappings.py prepare \
  --cmudict /path/to/cmudict.dict \
  --output /tmp/cmudict-full.txt \
  --training-output /tmp/cmudict-training.txt \
  --training-stride 6

m2m-aligner --delX --maxX 4 --maxY 2 \
  -i /tmp/cmudict-training.txt \
  --alignerOut /tmp/cmudict.model \
  -o /tmp/cmudict-training.align

m2m-aligner --delX --maxX 4 --maxY 2 \
  -i /tmp/cmudict-full.txt \
  --alignerIn /tmp/cmudict.model \
  -o /tmp/cmudict.align

python3 scripts/audit-sound-mappings.py analyze \
  --alignments /tmp/cmudict.align \
  --minimum 100 \
  --output-json docs/cmudict-mapping-audit.json \
  --output-markdown /tmp/cmudict-audit.md
```

## Review decisions

Frequency triggered human review; it did not automatically add a category. The expanded bank adds foundational consonants, hard and soft `c`/`g`, `s` pronounced /z/, `qu`, `x`, common doubled consonants, `kn`, `wr`, `nk`, `tch`, `dge`, `ch` pronounced /k/, common single-vowel alternatives, `y` used as a vowel, `tion`, both common sounds of `sion`, and common vowel/r-controlled spellings including `ow` as in *snow*, `aw`, `air`, `are`, `ear`, `eer`, unstressed `er`, and `or` as in *world*.

The review also retained useful correspondences that the aligner split across neighboring chunks. For example, the statistical model commonly represented `qu` as `q` → /kw/ plus a silent `u`; Spelling B teaches the conventional `qu` unit. Likewise, an ending such as `tion` may appear as `tio` → /ʃə/ plus `n` → /n/. Such cases were interpreted only when the conventional correspondence was clear.

Candidates were not added when they were primarily:

- whole suffixes or syllables rather than a reusable grapheme (for example `ing` → /ɪŋ/ or `ate` → /eɪt/);
- accidental chunks created by alignment boundaries;
- proper-name or loanword spellings without 20 familiar child-appropriate examples;
- dialect-sensitive categories that would merge substantially different pronunciations;
- overlapping fragments that would blame the same letters twice in one word; or
- rare alternatives that exceeded the numerical threshold only because CMUdict contains many names and inflected forms.

Each shipped category has 20 manually reviewed example words. `scripts/validate-sound-spelling-bank.py` verifies unique IDs, at least 20 unique examples, and grapheme coverage. It cannot judge pronunciation, so example selection still requires human review. These examples are the only words eligible for automatic focus-list creation.

`scripts/build-sound-spelling-lookup.py` makes a separate compact word lookup from the fixed full alignment. It recognizes only the reviewed pattern IDs, stores their character positions, and does not ship raw pronunciations or unreviewed pattern categories. `scripts/validate-sound-spelling-lookup.py` checks the generated indexes, non-overlap, bank-version agreement, and a teacher-provided regression sample.

## Limitations

CMUdict models North American English and includes names, abbreviations, compounds, and multiple dialect-sensitive pronunciations. A statistical alignment is not a linguistic analysis, and its learned boundaries are not authoritative. Broad IPA in Spelling B is a compact parent/teacher label. Metrics fire only for reviewed patterns found by the bundled word-specific lookup; a dictionary word may still have sounds outside the 98-pattern scope. Raw dictionary words are never offered as student practice, and AI-generated mappings never enter these metrics.

Progress is expressed as mastery rather than sound-pattern answer accuracy. Successful Copy, Letter Builder, Guided, Spell, and missed-word Review practice add increasingly strong credit. Each word is capped at 10 points, only the ten strongest word totals count, and a pattern is mastered at 100. Incorrect attempts do not reduce mastery or add credit.

CMUdict is redistributed under its permissive license; see [`CMUDICT-LICENSE.txt`](CMUDICT-LICENSE.txt). m2m-aligner is used as an audit-time development tool and is not included in the extension.
