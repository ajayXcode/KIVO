# 24 — Licenses, Third-Party Notices, and Attribution

## Policy
Before public release, review the license for every direct dependency and every copied/adapted code snippet. Verify transitive licenses using tooling and record required notices. Legal interpretation is outside this engineering document; seek qualified review if obligations are unclear.

## Open-source references

- Freqtrade: review repository `LICENSE` and any code/data files reused.
- Jesse: review repository license for the exact current revision and files reused.
- Hummingbot: review repository `LICENSE` and dependency/connector files reused.
- TradingView Lightweight Charts: official repository lists Apache License 2.0 and requires an attribution notice/link to TradingView in the page; follow the current LICENSE/NOTICE exactly if used.

Reference study does not require code copying. Writing original code inspired by public architecture patterns still requires careful license review if code or nontrivial text was copied.

## Required repository artefacts
- `LICENSE`: chosen project license after team approval.
- `THIRD_PARTY_NOTICES.md`: third-party libraries and required attributions.
- Lockfiles for Python/frontend packages.
- Optional generated software bill of materials (SBOM) if tooling/time permit.

## Review checklist
- [ ] Chosen project license approved.
- [ ] Every direct runtime/dev dependency has license checked.
- [ ] Chart attribution requirements implemented if Lightweight Charts is used.
- [ ] Copied snippets are minimal, attributed where required, and license-compatible.
- [ ] License files/notices retained where required.
- [ ] No copied credentials/example keys.
- [ ] Re-check license on major dependency upgrades.
