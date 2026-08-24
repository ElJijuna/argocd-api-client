# Argo CD compatibility

This document is the authoritative compatibility policy for `argocd-api-client`.

## Supported baseline

| Policy item | Current value |
| --- | --- |
| Minimum guaranteed Argo CD version | `v3.5.1` |
| Canonical API contract | [`v3.5.1/assets/swagger.json`](https://github.com/argoproj/argo-cd/blob/v3.5.1/assets/swagger.json) |
| Version-specific CI coverage | Method and route mappings checked against the normalized `v3.5.1` contract snapshot |
| Live-server integration coverage | None; unit tests use an injected fetch implementation |

Argo CD versions older than `v3.5.1` may work, but they are best-effort and are not covered by the
compatibility guarantee. The canonical contract must always be pinned to an exact stable Argo CD tag;
`master`, moving `stable` URLs, release candidates, and development builds are not valid baselines.

Adopting a newer stable contract is an explicit maintenance change. Raising the minimum guaranteed
Argo CD version is a breaking compatibility change and therefore requires a new major release of this
package.

## Endpoint portability

- A **portable endpoint** exists in every contract covered by the declared support baseline. Public
  methods for portable endpoints may be called without a version preflight.
- A **version-gated endpoint** is unavailable in at least one supported contract. Its public
  documentation must state the minimum Argo CD version and callers should check server capabilities
  before invoking it.
- Unknown, prerelease, and development server versions are outside the compatibility guarantee. Until
  typed capability detection is available, unsupported endpoints fail through the normal
  `ArgoCdApiError` boundary.

The client does not silently replace an unsupported operation with a different endpoint or mutation.
`ArgoCdClient.capabilities()` queries the server version once, caches the result, and evaluates typed
feature flags from the centralized baseline in `src/compatibility.ts`. Callers can pass
`{ refresh: true }` to query the server again. Unknown, prerelease, dirty, and development versions
produce conservative flags with every version-gated capability disabled.

## Contract changes and deprecations

Contract updates must be reviewed as explicit changes and identify added, removed, or changed HTTP
methods, routes, parameters, and response shapes. The checked-in normalized snapshot makes method and
route verification network-independent; see [the update procedure](contracts/argocd/README.md).

When upstream Argo CD removes or incompatibly changes an endpoint:

1. Keep the existing public method during the current package major whenever doing so is safe.
2. Mark it deprecated and document the affected Argo CD versions and replacement, when one exists.
3. Add a replacement method instead of silently changing the old method's meaning.
4. Remove the deprecated API only in a package major release.

Corrections that make an existing method conform to the pinned contract, including wrong HTTP methods
or routes, are bug fixes rather than deprecations.

## Verification claims

The test suite verifies request behavior with mocked or injected fetch responses and checks client
method/route mappings against the pinned contract snapshot. Pre-existing drift is recorded explicitly
in `contracts/argocd/known-mismatches.json`; CI rejects new drift and stale exceptions but those known
entries remain outside the compatibility claim. The suite does not run an Argo CD server and must not
be presented as live compatibility testing. CI may claim contract compatibility only for the exact
Argo CD tags recorded by the snapshot.
