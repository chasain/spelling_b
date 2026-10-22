# CMUdict candidates not adopted as teaching patterns

## Purpose

This note explains what was previously described too loosely as “unteachable patterns.” A better description is **high-frequency aligner output that was not adopted as a standalone Spelling B teaching pattern**.

The distinction matters. A rejected machine chunk is not necessarily an invalid fact about English, and an absent pattern is not necessarily impossible to teach. The audit was designed to find correspondences worth human review, not to generate a curriculum automatically.

The underlying evidence is in:

- [`CMUDICT-MAPPING-AUDIT.md`](CMUDICT-MAPPING-AUDIT.md), which describes the method and review policy;
- [`cmudict-mapping-audit.json`](cmudict-mapping-audit.json), which contains all 294 candidates, counts, ARPABET phones, broad IPA, and sample headwords; and
- [`sound-spelling-bank.js`](../static/sound-spelling-bank.js), which is the reviewed 98-pattern teaching bank.

## What the audit actually found

The m2m-aligner divided 117,454 CMUdict headwords into letter and phone chunks. A chunk became an audit candidate when it appeared in at least 100 distinct aligned headwords.

| Result | Count | Meaning |
|---|---:|---|
| Statistical candidates | 294 | Machine-produced letter/phone chunks meeting the frequency threshold |
| Exact candidate matches in the reviewed bank | 74 | Same written chunk and broad IPA as a shipped pattern |
| Reviewed bank patterns | 98 | The final instructional categories used by the application |
| Candidates without an exact bank match | 220 | A mixture of normalized evidence, deferred correspondences, context-bound chunks, name/loanword effects, and alignment artifacts |

The arithmetic must not be read as “74 good and 220 bad.” Twenty-four bank entries do not have an exact candidate counterpart. Some are conventional teaching units reconstructed from awkward machine boundaries, such as `qu`, `tion`, `sion`, and split-vowel patterns. Others were retained through manual review even if the precise statistical chunk did not clear the threshold.

## Working definition of a useful teaching pattern

Spelling B adopted a pattern only when it could reasonably satisfy all of these constraints:

1. **Reusable:** it recurs as a recognizable spelling–sound correspondence rather than only inside one suffix, name family, or borrowed spelling.
2. **Appropriately sized:** it represents a grapheme or established spelling unit, not an arbitrary onset, rime, syllable, or word ending created by the aligner.
3. **Explainable:** an educator can describe why the letters belong together and can provide a useful Guided hint.
4. **Supported by familiar examples:** the project could identify at least 20 distinct, child-appropriate examples containing the written pattern.
5. **Non-overlapping for metrics:** the same letters are not credited simultaneously to a broad chunk and to smaller patterns inside it.
6. **Reasonably stable:** the correspondence is not dominated by dialect, stress, morphology, proper names, or language-of-origin effects.
7. **Safe to generalize:** presenting the category will not encourage a learner to apply a narrow observation as a general spelling rule.

These are product criteria for a mastery metric and focus-list generator. A reading specialist may still choose to teach a larger rime, a morpheme, or a word-specific exception for another purpose.

## Dialect-sensitive candidates specifically

Dialect sensitivity is one reason to defer a candidate, but it is rarely the only reason. The audit uses the first North American English pronunciation supplied by CMUdict. That gives the generator one reproducible analysis per headword; it does not make that pronunciation the only correct one, nor does it make every letter boundary chosen by the aligner instructionally useful.

These are the main dialect-sensitive areas visible in the candidates that were not adopted as standalone patterns:

| Candidate or family | Audit count | Source of variation | Current Spelling B treatment |
|---|---:|---|---|
| `o` → /ɔ/ | 4,803 | Many North American speakers merge the vowels in *cot* and *caught*, while others keep them distinct. A single broad /ɔ/ category would therefore group words differently for different learners. | Deferred. Existing familiar spellings such as `aw` and `au` remain teachable categories, but the broad single-letter candidate is not scored. |
| `a` → /ɔ/; related context-bound `alk` words | 753 for the raw `a` → /ɔ/ candidate | In *talk*, *walk*, and *chalk*, the aligner uses a larger chunk and the useful spelling context is `alk`, not a general rule that `a` says /ɔ/. The vowel also participates in the cot–caught distinction. | The final `k` can earn `/k/` mastery credit and `l` can receive a silent-letter Guided hint. The `alk` vowel remains unscored rather than being generalized as `a` → /ɔ/. |
| `a` → /ɑ/ | 10,364 | This combines ordinary *father*-type evidence with names, loans, and vowel systems that divide PALM, LOT, BATH, and related word sets differently. | Deferred until it can be divided into a narrow, familiar family with a useful child-facing explanation. |
| `e` → /ɪ/ | 6,821 | Much of the evidence comes from unstressed syllables and endings such as `-ed`. Separately, speakers with the pin–pen merger may pronounce `e` and `i` alike before nasal consonants. | Deferred. Spelling B does not turn this mixed evidence into a rule that `e` generally says /ɪ/. |
| `ore` → /ɔr/ and standalone `r` → /ɚ/ | 391 and 1,521 | Rhotic speakers pronounce post-vocalic `r`; non-rhotic speakers may not. The raw chunks also mix the vowel, `r`, silent `e`, and alignment boundaries. | Not adopted as those raw chunks. Reviewed r-controlled spellings are kept where the spelling unit remains useful, with broad North American IPA used only as an educator label. |
| Unstressed `o`, `e`, `i`, or `u` → /ə/ | 8,320; 7,566; 4,041; and 2,501 | Vowel reduction depends on lexical stress, speaking style, morphology, and dialect. The written vowel alone poorly predicts when reduction occurs. | Deferred as broad single-letter rules. A few narrow, familiar categories such as unstressed `er` are reviewed separately. |

The cot–caught merger is a documented North American dialect difference ([University of Pennsylvania](https://babel.ling.upenn.edu/phono_atlas/ICSLP4/BW/ICSLP4BW.html); [PBS, *Do You Speak American?*](https://www.pbs.org/speak/seatosea/americanvarieties/midwest/)). Yale's Grammatical Diversity Project describes the pin–pen merger as a feature found in Southern varieties of American English ([Yale](https://ygdp.yale.edu/african-american-language-and-grammatical-diversity-2020)). Rhotic and non-rhotic varieties differ in whether written post-vocalic `r` is pronounced ([Cambridge Dictionary](https://dictionary.cambridge.org/us/dictionary/english/rhotic?topic=phonology-and-phonetics)). These references explain the variation; the accept/defer decisions remain Spelling B's conservative product policy.

Dialect sensitivity is not an automatic ban. The reviewed bank retains useful categories such as `aw`, `au`, `air`, `are`, `ear`, and r-controlled spellings when they have a recognizable written unit and familiar examples. Their broad IPA labels are approximations, and a learner's home pronunciation is not treated as an error. Conversely, some candidates in the table would still be rejected even in a single-dialect app because they are composite chunks, alignment artifacts, or poor spelling generalizations.

### Guided help without dialect-dependent scoring

Leaving a broad pronunciation category unscored does not mean leaving the learner without a useful hint. Guided practice has a separate, non-scoring family layer for bounded spellings whose written form remains useful across dialects:

| Guided family | Example explanation |
|---|---|
| `alk` | Write `a`, then a quiet `l`, before `k`, as in *walk*, *talk*, and *chalk*. |
| `all` | Write `a` followed by `ll`, as in *ball*, *call*, and *fall*. |
| `alm` | Write `a`, then a quiet `l`, before `m`, as in *calm*, *palm*, and *balm*. |
| `ore` | Write `o` and `r` together, then a quiet `e`, as in *more*, *store*, and *shore*. |
| `og`, `ong`, `ost`, and `oss` | The middle vowel is explicitly identified as `o`; examples stay within the same written family. |
| `a` after a /w/ sound | The hint explains that `a` can sound different after /w/ but is still written `a`, as in *want*, *wash*, and *watch*. |

These hints deliberately describe letters and word families instead of declaring one required vowel pronunciation. They appear only for reviewed word sets, show two comparison words while excluding the active spelling word, and do not add sound-pattern mastery credit. This is safer than generating a hint from visual similarity alone: English contains counterexamples such as *own* versus *down*, *move* versus *love*, and *one* versus *bone*.

## Why statistical alignment produces poor teaching units

CMUdict supplies a spelling and a pronunciation, but it does not mark which letters correspond to which phones. The aligner must infer those boundaries. It optimizes statistical fit, not instructional clarity.

For example:

- The aligner often represented `qu` as `q` → /kw/ plus a silent `u`. Spelling B instead uses the conventional unit `qu` → /kw/.
- It often represented `tion` as `tio` → /ʃə/ plus `n` → /n/. Spelling B uses `tion` → /ʃən/.
- A split-vowel word such as `make` can be represented as `ake` → /eɪk/. For instruction, `a_e` → /eɪ/ is more useful because it isolates the long-vowel pattern while leaving /k/ to `k`.

The raw chunks are evidence about the alignment model. They are not automatically the right units for a child to study.

## Major exclusion and deferral classes

### 1. Whole suffixes, endings, and syllable-sized chunks

These chunks frequently encode several smaller correspondences or combine spelling with morphology. Teaching the entire chunk as one sound pattern would hide useful structure and create overlapping mastery credit.

| Candidate | Words | Why it was not used as one sound pattern |
|---|---:|---|
| `ing` → /ɪŋ/ | 5,142 | A common suffix containing short `i` plus `ng`; better handled as morphology or smaller correspondences |
| `ers` → /ɚz/ | 1,570 | Combines unstressed `er` and plural/third-person `s` |
| `ati` → /eɪʃ/ | 1,200 | An alignment fragment from words such as *abbreviation* and *abdication*; the following `on` completes the ending |
| `der` → /dɚ/ | 1,025 | Combines `d` with unstressed `er` |
| `ate` → /eɪt/ | 965 | Can be a word ending, suffix, or split-vowel rime; it is not one indivisible grapheme |
| `ler` → /lɚ/ | 621 | Combines a consonant with unstressed `er` |
| `ess` → /əs/ | 566 | Stress- and morphology-dependent ending rather than a stable sound spelling |
| `ies` → /iːz/ | 521 | Plural morphology plus a vowel spelling change |
| `ize` → /aɪz/ | 504 | A real suffix, but it contains separable vowel and consonant correspondences |
| `ish` → /ɪʃ/ | 483 | A suffix or word ending built from short `i` and `sh` |
| `ive` → /ɪv/ | 458 | Stress-sensitive suffix containing smaller patterns |
| `ine` → /aɪn/ | 457 | A rime or suffix whose pronunciation is not stable across words |
| `nce` → /ns/ | 422 | Combines `n` with soft `c`; final `e` is not independently sounded |
| `ous` → /əs/ | 312 | A common suffix, but not a simple letter-to-sound unit |

These units may belong in a future **morphology** feature. That would require different scoring and explanations from the present grapheme–phoneme mastery model.

### 2. Rimes and word-family chunks that are too broad for this metric

Many chunks are perfectly usable for word-family instruction. They were not adopted because Spelling B tracks reusable sound spellings and must avoid awarding credit twice for the same letters.

| Candidate | Words | Smaller or conventional analysis |
|---|---:|---|
| `ick` → /ɪk/ | 424 | short `i` + `ck` |
| `ill` → /ɪl/ | 406 | short `i` + `ll` |
| `oun` → /aʊn/ | 396 | `ou` + `n` |
| `ore` → /ɔr/ | 391 | an r-controlled spelling plus final `e`; dialect and analysis vary |
| `ack` → /æk/ | 361 | short `a` + `ck` |
| `ide` → /aɪd/ | 294 | `i_e` + `d` |
| `ite` → /aɪt/ | 283 | `i_e` + `t` |
| `ook` → /ʊk/ | 274 | `oo` as in *book* + `k` |
| `ead` → /ɛd/ | 269 | a word-family chunk; `ea` has several pronunciations |
| `ass` → /æs/ | 255 | short `a` + `ss` |
| `ake` → /eɪk/ | 252 | `a_e` + `k` |
| `one` → /oʊn/ | 244 | `o_e` + `n`, with important exceptions such as *one* itself |
| `ash` → /æʃ/ | 243 | short `a` + `sh` |
| `own` → /aʊn/ | 239 | `ow` as in *cow* + `n`; conflicts with words such as *own* |
| `eck` → /ɛk/ | 238 | short `e` + `ck` |
| `ail` → /eɪl/ | 235 | `ai` + `l` |

This is a scope choice, not a claim that word families are poor instruction.

### 3. Inflectional endings folded into neighboring letters

English endings change pronunciation according to the preceding sound. The aligner often attached an ending to nearby letters, creating many frequent but overly specific chunks.

| Candidate | Words | What is mixed together |
|---|---:|---|
| `ngs` → /ŋz/ | 328 | `ng` plus plural `s` pronounced /z/ |
| `ors` → /ɚz/ | 268 | an r-controlled/unstressed ending plus plural `s` |
| `es` → /z/ | 278 | a context-dependent inflection; `es` has multiple pronunciations |
| `ned` → /nd/ | 229 | final `n` plus past-tense `ed` pronounced /d/ |
| `ves` → /vz/ | 163 | `v` plus plural/verb `s`, sometimes involving an `f`/`v` spelling change |
| `ked` → /kt/ | 182 | `k` sound plus past-tense `ed` pronounced /t/ |
| `ped` → /pt/ | 138 | `p` plus past-tense `ed` pronounced /t/ |
| `ied` → /aɪd/ | 126 | spelling change plus past-tense ending |
| `ays` → /eɪz/ | 116 | `ay` plus plural/verb `s` |
| `tes` → /ts/ | 137 | final `t` plus plural/verb `s` |
| `lls` → /lz/ | 114 | `ll` plus plural/verb `s` |
| `les` → /lz/ | 112 | several possible syllable and inflection structures |

These are better taught as morphology and allomorphy: for example, the past-tense spelling `ed` can be pronounced /t/, /d/, or /ɪd/. Treating every attached chunk as a separate sound pattern would fragment that larger idea.

### 4. Schwa, syllabic consonants, and stress-dependent boundaries

Unstressed speech lets vowels reduce and consonants carry a syllable. The written boundary is often debatable, and the same spelling can behave differently under stress or across dialects.

| Candidate | Words | Concern |
|---|---:|---|
| `o` → /ə/ | 8,320 | Very frequent vowel reduction, but weak as a spelling prediction without stress/morpheme context |
| `e` → /ə/ | 7,566 | Same problem; often belongs to an ending or unstressed syllable |
| `i` → /ə/ | 4,041 | Context- and dialect-sensitive reduction |
| `u` → /ə/ | 2,501 | Context- and dialect-sensitive reduction |
| `l` → /əl/ | 2,088 | Represents a syllabic `l` and an inferred schwa, not simply the sound of `l` |
| `r` → /ɚ/ | 1,521 | Can reflect a syllabic/r-colored ending whose written vowel was assigned elsewhere |
| `m` → /mə/ | 923 | A boundary artifact or reduced syllable rather than a general `m` correspondence |
| `lla` → /lə/ | 394 | A name/loanword-heavy reduced ending |
| `n` → /ən/ | 175 | Syllabic `n` or an inferred schwa; analysis varies |
| `tle` → /əl/ | 184 | The /t/ may be assigned to a preceding chunk; the remainder is not a reusable grapheme |
| `lin` → /əl/ | 165 | Strong evidence of a misplaced alignment boundary |
| `ten` → /ən/ | 113 | Stress and morphology determine the reduction |
| `len` → /ən/ | 110 | Frequently driven by surnames and reduced endings |

The current bank includes `a` → /ə/ and unstressed `er` → /ɚ/ as deliberately narrow, familiar categories. Excluding the other reduced vowels is a conservative scope decision, not proof that they should never be taught. They are reasonable candidates for future educator review if the app adds syllable and stress instruction.

### 5. Proper names, loanwords, and language-of-origin effects

CMUdict is a pronunciation dictionary, not an elementary vocabulary list. Its many surnames, place names, brands, and borrowed words can push a narrow convention above the 100-headword threshold.

| Candidate | Words | Typical evidence in the audit | Concern |
|---|---:|---|---|
| `sch` → /ʃ/ | 558 | *baasch, baisch, barasch, barsch* | Mostly name/language-of-origin behavior; conflicts with /sk/ in familiar Greek-derived words |
| `z` → /ts/ | 467 | *abbruzzese, abitz, abramovitz* | Name and borrowed-spelling convention |
| `c` → /tʃ/ | 331 | *adamcik, alcester, alcina, ancira* | Strongly language/name dependent |
| `z` → /s/ | 292 | *achatz, altzheimer, amstutz* | Mostly surnames and borrowed spellings |
| `u` → /w/ | 264 | *abuellah, actual, aguado, aguanga* | Boundary and language-of-origin effects |
| `j` → /j/ | 257 | *ahuja, alejandre, alejandro* | Valid in other languages, not a general English `j` rule |
| `w` → /f/ | 229 | *andrzejewski, bakowski, bankowski* | Surname transliteration effect |
| `i` → /j/ | 217 | *abiquiu, abkhazia, aeritalia* | Context and language dependent |
| `w` → /v/ | 135 | many names ending in *-wicz* | Language-of-origin effect |
| `cci` → /tʃiː/ | 117 | mostly Italian surnames | Too language-specific for the current elementary bank |
| `hei` → /haɪ/ | 113 | largely German-derived names | Whole borrowed chunk rather than a general English grapheme |

Such patterns can be important when teaching a learner’s own name or a specific language of origin. They are unsafe as broad default mastery categories.

### 6. Silent-letter chunks without a stable instructional unit

Silent letters are teachable when their role is stable and the spelling family is clear. The raw “letter → silent” output often combines several unrelated causes.

| Candidate | Words | Why it was not adopted directly |
|---|---:|---|
| `e` → silent | 2,907 | Includes split-vowel `e`, inflectional endings, French-derived endings, and aligner choices. Spelling B tracks specific `a_e`, `i_e`, and `o_e` patterns instead of one universal silent-`e` category. |
| `u` → silent | 195 | Includes `qu`, `gu`, borrowed spellings, and boundary artifacts; those do not form one rule. |
| `h` → silent | 151 | Mixes words such as *annihilate* with many names and borrowed spellings. |
| `i` → silent | 124 | Examples are largely names, loans, or disputed boundaries. |
| `gh` → silent | 114 | A real historical spelling family, but pronunciation and neighboring-vowel effects vary; the 20 examples need separate educator review before adding it. |

The reviewed bank does include stable silent-letter teams such as `kn` → /n/ and `wr` → /r/.

### 7. Clear alignment-boundary artifacts

Some outputs make little sense as independent spelling units even though the full word alignment can still reproduce the pronunciation.

| Candidate | Words | Likely issue |
|---|---:|---|
| `q` → /kw/ | 859 | The phone sequence was assigned to `q`, leaving `u` silent; normalized to `qu` → /kw/ in the teaching bank |
| `tio` → /ʃə/ | 773 | Final /n/ was assigned separately; normalized to `tion` → /ʃən/ |
| `g` → /ɪŋ/ | 493 | The aligner placed the vowel and nasal phones on final `g` in many *-ing* words |
| `ssio` → /ʃə/ | 136 | Incomplete `ssion` ending |
| `sio` → /ʒə/ | 108 | Incomplete `sion` ending |
| `ical` → /ɪk/ | 102 | The remainder of the suffix was assigned to neighboring chunks |
| `ht` → /t/ | 244 | Usually a silent-`h` history or a boundary inside a larger spelling, not a reusable `ht` grapheme |
| `nke` → /ŋk/ | 234 | Final `e` was absorbed into a chunk even when it has no consistent role |
| `te` → /t/ | 238 | Mixes silent final `e`, suffixes, and borrowed endings |
| `ne` → /n/ | 410 | Mixes silent final `e`, suffixes, and alignment choices |

These are the strongest examples of output that should not be presented to a learner without reinterpretation.

### 8. Real correspondences that were deferred because they are ambiguous or under-reviewed

Some candidates may deserve future inclusion. They were omitted because the audit did not yet establish a stable child-facing explanation and 20 familiar examples for the same use.

| Candidate | Words | Review question |
|---|---:|---|
| `a` → /ɑ/ | 10,364 | How much comes from ordinary words versus names, loans, and dialect? Should this be a narrow *father*-type category? |
| `i` → /iː/ | 8,323 | Can familiar examples be separated cleanly from names and word-final foreign-derived `i`? |
| `e` → /ɪ/ | 6,821 | Much of the count is reduced speech or suffix morphology; what narrow category would be teachable? |
| `o` → /ɔ/ | 4,803 | Dialect-sensitive merger issues require careful labeling and examples. |
| `u` → /uː/ | 3,157 | Often valid, but overlaps long-`u` analyses and loan/name evidence. |
| `n` → /ŋ/ | 1,447 | Usually occurs before velars; should it be taught as assimilation or kept under `ng`/`nk` spellings? |
| `e` → /eɪ/ | 849 | Valid in some words, but examples are name-heavy and the context is not obvious. |
| `a` → /ɛ/ | 771 | Often dialect-, name-, or neighboring-sound dependent. |
| `a` → /ɔ/ | 753 | Often dialect and language-of-origin dependent. |
| `ei` → /aɪ/ | 648 | A real but low-predictability spelling that needs a carefully bounded example set. |

“Deferred” is the right label for this group. Adding one should require a specific instructional rationale, not just a high dictionary count.

## Why raw occurrence count is insufficient

A count answers only: “How often did this exact chunk appear in this particular statistical alignment of this dictionary snapshot?” It does not answer:

- whether the chunk is the best linguistic boundary;
- whether it is common in children’s reading and spelling vocabulary;
- whether it generalizes beyond names or borrowed words;
- whether its pronunciation is stable across dialects;
- whether a learner can act on the explanation; or
- whether tracking it would duplicate credit assigned to another pattern.

The threshold of 100 was therefore a **review trigger**, not an acceptance score.

## Recommended terminology going forward

Use these terms in documentation and discussion:

- **Reviewed teaching pattern:** included in the 98-pattern bank.
- **Normalized candidate:** audit evidence that was converted to a conventional unit, such as `q` + silent `u` becoming `qu`.
- **Deferred correspondence:** plausible instructional content that has not yet received a narrow definition and reviewed examples.
- **Composite chunk:** a valid larger spelling segment made from smaller teachable units.
- **Morphological chunk:** a suffix or inflection that needs morphology-aware instruction.
- **Name/loanword pattern:** real in a limited language-of-origin context but unsafe as a general English rule.
- **Alignment artifact:** a machine boundary that should not be treated as a standalone relationship.

Avoid using **unteachable** as the umbrella term. It overstates what the audit can establish.

## Questions for educator review

1. Should Spelling B eventually add a separate morphology model for `-s`, `-es`, `-ed`, `-ing`, and common derivational suffixes?
2. Should word-family/rime practice exist separately from sound-pattern mastery so that `-ack` can be taught without duplicating `a` and `ck` credit?
3. Which reduced-vowel categories are useful to an 8-year-old speller, and how should stress be explained?
4. Should silent `gh` receive a reviewed category, or is it better handled as several word families?
5. Which dialect should labels and examples target when common North American pronunciations differ?
6. Should language-of-origin patterns be offered as optional educator-selected extensions rather than default mastery categories?
7. What evidence should be required before moving a deferred correspondence into the bank: a curriculum reference, expert review, child-frequency data, or all three?

## Reproducing the comparison

The headline counts above compare each audit candidate’s exact `(grapheme, broad IPA)` pair with the reviewed bank. This comparison is intentionally literal. It does not attempt to infer that a raw chunk and a pedagogically normalized pattern are equivalent.

For full reproducibility, use the audit commands in [`CMUDICT-MAPPING-AUDIT.md`](CMUDICT-MAPPING-AUDIT.md), then compare the generated JSON with the `sound` and `grapheme` fields in [`sound-spelling-bank.js`](../static/sound-spelling-bank.js).

The source snapshot and its SHA-256 are recorded in both audit files. The raw examples remain audit evidence only; they are not recommendations for student practice.
