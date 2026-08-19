# Argo CD API contract snapshot

`api-contract.json` is a normalized, network-independent snapshot of the official Swagger contract
selected by [COMPATIBILITY.md](../../COMPATIBILITY.md). It records the exact Argo CD tag, source URL,
SHA-256 of the downloaded Swagger document, and every HTTP method/route pair.

`known-mismatches.json` records pre-existing client mappings that do not match the pinned contract.
The checker accepts those exact entries so CI can establish a baseline, but fails for every new
mismatch and for stale exceptions. Do not add an exception as part of an endpoint implementation;
triage and fix the mapping or document the separate follow-up work first.

To update it after approving a new compatibility baseline:

```bash
npm run contract:update -- vMAJOR.MINOR.PATCH
npm run contract:check
npm run test:contract
```

Review the resulting operation diff. Update `COMPATIBILITY.md`, `README.md`, `ROADMAP.md`, and
`ARCHITECTURE.md` in the same change. Never generate the snapshot from `master`, `stable`, a release
candidate, or a development build.
