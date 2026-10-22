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
- Baseline runtime lookup: 116,563 aligned CMUdict headwords had at least one word-specific association with those 98 reviewed patterns.
- Current runtime lookup: 117,177 headwords have at least one association after four strictly additive recovery passes: 20,094 reviewed consonants at alignment-chunk edges, 2,614 patterns unlocked by silent `e` in final `-ed`, 119 patterns obscured by five conservative silent-letter endings, and 1,850 unchanged patterns inherited from pronunciation-matched base words. No prior association or headword was removed or replaced.

The machine-readable list of all 294 candidates, their counts, ARPABET phones, broad IPA rendering, and sample headwords is in [`cmudict-mapping-audit.json`](cmudict-mapping-audit.json). Examples in that file are raw audit evidence and are not student word recommendations.

For an educator-oriented explanation of the candidates that were normalized, deferred, or excluded, see [`CMUDICT-NON-TEACHING-CANDIDATES.md`](CMUDICT-NON-TEACHING-CANDIDATES.md). It also clarifies why “unteachable” is not an accurate umbrella term for those results.

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

The statistical aligner sometimes fuses an exceptional or silent-letter spelling with an otherwise ordinary consonant. Examples include `eak` → `EY:K` in *break*, `alk` → `AO:K` in *walk*, `ead` → `EH:D` in *head*, and `ht` → `T` in *eight*. The original lookup could skip the whole chunk but could not credit the reviewed consonant inside it.

The generator performs a strictly additive chunk-edge recovery pass. A mapping is recovered only when:

- the reviewed grapheme and its exact consonant phone sequence touch the same start or end edge of one alignment chunk;
- some other written letters remain in that chunk;
- the candidate does not overlap any mapping selected by the original algorithm;
- the candidate is not a vowel category or the ambiguous standalone `r`/`rr`; and
- repeated-letter ambiguity without a reviewed larger pattern is rejected.

This recovered 20,094 associations across 17,086 headwords while preserving every baseline association. Learner-vocabulary screening reduced uncovered ordinary final consonants from 20 to 2 in the 1,000-word high-frequency course, from 27 to 1 in 1,297 bundled phonics words, and from 6 to 0 in the 48 teacher-supplied regression words. The remaining *four*, *your*, and *heir* cases are deliberately excluded because the final `r` participates in a larger r-controlled spelling.

A second additive pass handles past-tense words where the statistical aligner fused a silent `e` into a larger final `-ed` chunk. It is enabled only when the written word ends in `ed` and the unconsumed pronunciation is exactly `D` or `T`; forms with a spoken vowel, such as *wanted*, do not qualify. The original mappings remain immutable, and a newly unlocked reviewed pattern is accepted only on previously unclaimed letters. This added 2,614 associations across 1,673 headwords—including long-o `ow` in *rowed*—with zero removed associations or headwords.

A third pass audits five conservative word-final silent-letter families: `mb` (*lamb*), `mn` (*hymn*), `gn` (*sign*), `lk` (*folk*), and `bt` (*doubt*). The spelling rule merely permits the aligner to skip the candidate silent letter; the complete CMUdict phone sequence must still align, so a pronounced letter cannot be discarded to create a match. Only reviewed patterns on previously unclaimed letters are added. This recovered 119 associations across 87 headwords, including short `a` and `/m/` in *lamb*, long `i` in *sign*, and `ou` in *doubt*. Silent letters themselves are not mastery categories.

The wider silent-letter review did not justify a universal “silent letter” rule. Initial `kn` and `wr` already have reviewed mappings and regression coverage. Split final `e` is represented by the reviewed `a_e`, `i_e`, and `o_e` patterns. Spellings such as `gh`, `eigh`, and `ough` interact with neighboring vowels in several ways, while `ould` and `alk` do not correspond to one reviewed vowel pattern; they remain explicit limitations rather than inferred metrics. Ordinary reviewed consonants inside those chunks can still be credited by the chunk-edge pass—for example final `/t/` in *eight* and `/k/` in *talk*.

Guided hints use a separate deterministic annotation layer for the five verified terminal families and the three reviewed split-e families. A terminal annotation is emitted only when CMUdict confirms that the candidate letter's usual phone is absent—for example `lk` ending in /k/, not /lk/—so *folk* is annotated while *milk* is not. Exact spelling-prefix and pronunciation-prefix checks carry annotations into supported suffix forms such as *lambs*, *signed*, and *doubts*. The packaged lookup currently contains 6,466 such word-position annotations. They provide an explanation and examples during Guided but are deliberately excluded from mastery scoring.

A fourth pass preserves reviewed patterns across suffixes when the statistical alignment changes around a silent spelling. The written base must be an exact prefix, its full CMUdict phone sequence must be an exact prefix of the derived pronunciation, and the base must already contain a reviewed split-vowel spelling or a mapping recovered by the silent-letter pass. Only unchanged, unclaimed character positions are inherited. This recovers cases such as *make* → *makes*, *safe* → *safely*, and *sign* → *signed*, while declining spelling-changing or pronunciation-changing derivations. It added 1,850 associations across 966 headwords.

Together, the four passes record 24,677 recoveries across 18,885 unique headwords. The complete machine-readable ledger records the recovery type, word, pattern, position, source alignment span, phones, silent-letter rule, and base-word/suffix provenance where applicable.

## Preserved reproducibility data

The exact source dictionary, canonical full m2m alignment, and complete recovery ledger are retained under [`scripts/data/cmudict/`](../scripts/data/cmudict/README.md). They are compressed development inputs and are not copied into the extension package. This allows the runtime lookup and audit to be regenerated without another download, without retraining the aligner, and without relying on temporary files.

## Limitations

CMUdict models North American English and includes names, abbreviations, compounds, and multiple dialect-sensitive pronunciations. A statistical alignment is not a linguistic analysis, and its learned boundaries are not authoritative. Broad IPA in Spelling B is a compact parent/teacher label. Metrics fire only for reviewed patterns found by the bundled word-specific lookup; a dictionary word may still have sounds outside the 98-pattern scope.

Mastery mappings and Guided annotations have different jobs. A mastery mapping awards progress for a reviewed sound-to-spelling pattern. A Guided annotation can explain a spelling feature, such as a silent letter, without asserting that the feature is a separate sound or awarding it mastery credit. For example, in *talk*, final `k` → /k/ earns mastery credit and `l` receives a silent-letter Guided hint, but the vowel is left unscored. Describing the missing vowel mapping as merely `a` → /ɔ/ would hide the more useful spelling context: the teachable family is closer to `alk`, as in *talk*, *walk*, and *chalk*. The bank does not yet include a reviewed, dialect-safe vowel category for that family; pronunciations can also differ in dialects with the cot–caught merger. Leaving this part unscored is more conservative than turning a context-dependent family into a broad rule that `a` says /ɔ/.

The bank deliberately does not turn every silent letter into its own mastery category. Raw dictionary words are never offered as student practice.

Progress is expressed as mastery rather than sound-pattern answer accuracy. Successful Copy, Letter Builder, Guided, Spell, and missed-word Review practice add increasingly strong credit. Each word is capped at 10 points, only the ten strongest word totals count, and a pattern is mastered at 100. Incorrect attempts do not reduce mastery or add credit.

CMUdict is redistributed under its permissive license; see [`CMUDICT-LICENSE.txt`](CMUDICT-LICENSE.txt). m2m-aligner is used as an audit-time development tool and is not included in the extension.
