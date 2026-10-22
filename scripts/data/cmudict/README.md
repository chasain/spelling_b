# Pinned CMUdict mapping inputs

These compressed development artifacts make the sound–spelling lookup reproducible without relying on files in `/tmp` or downloading a moving upstream branch.

- `cmudict-0.7b.dict.gz` is the exact CMUdict source used by the audit. Its uncompressed SHA-256 is `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
- `cmudict-0.7b.m2m-align.gz` is the canonical full alignment produced with m2m-aligner commit `7878040896ca82b9797d3cfbe7143fae9cf00d16`, `--delX --maxX 4 --maxY 2`, and the deterministic every-sixth-headword training subset. Its uncompressed SHA-256 is `4103e427ccf570798df9f92d85fd6f2f15992006652599ca080fd8c1a1429c31`.
- `chunk-edge-recoveries.json.gz` is the complete additive-recovery ledger emitted by `build-sound-spelling-lookup.py` (the filename is retained for compatibility). It records every recovered word, pattern, character position, alignment span, phone sequence, and recovery type for chunk-edge consonants, silent-`e` past-tense words, conservative terminal silent-letter families, and pronunciation-matched suffix inheritance. Silent-letter rules and base-word/suffix provenance are included where applicable. Its uncompressed SHA-256 is `c5a6b2d4a71ce2f2e43a9fcc98c61790a56b7cd9b98c483fc73ae46bed619db1`.

These files are not copied by `scripts/build-extension.sh` and are not present in the Chrome extension package. CMUdict's license is retained in `docs/CMUDICT-LICENSE.txt`. m2m-aligner is an audit-time tool only and is not vendored or shipped.

Regenerate the runtime lookup and recovery ledger with:

```sh
python3 scripts/build-sound-spelling-lookup.py \
  --alignments scripts/data/cmudict/cmudict-0.7b.m2m-align.gz \
  --output static/sound-spelling-lookup.js \
  --recovery-report /tmp/chunk-edge-recoveries.json
```

The generated report should contain zero lost associations. Compress a newly reviewed ledger deterministically with `gzip -n` before replacing the pinned copy.
