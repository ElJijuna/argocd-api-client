# Argo CD compatibility

This document is the authoritative compatibility policy for `argocd-api-client`.

## Supported baseline

| Policy item | Current value |
| --- | --- |
| Minimum guaranteed Argo CD version | `v3.5.1` |
| Canonical API contract | [`v3.5.1/assets/swagger.json`](https://github.com/argoproj/argo-cd/blob/v3.5.1/assets/swagger.json) |
| Version-specific CI coverage | Not yet automated; tracked by [#2](https://github.com/ElJijuna/argocd-api-client/issues/2) |
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
Capability detection is tracked separately by
[#18](https://github.com/ElJijuna/argocd-api-client/issues/18).

## Contract changes and deprecations

Contract updates must be reviewed as explicit changes and identify added, removed, or changed HTTP
methods, routes, parameters, and response shapes. Automated drift detection is tracked by
[#2](https://github.com/ElJijuna/argocd-api-client/issues/2).

When upstream Argo CD removes or incompatibly changes an endpoint:

1. Keep the existing public method during the current package major whenever doing so is safe.
2. Mark it deprecated and document the affected Argo CD versions and replacement, when one exists.
3. Add a replacement method instead of silently changing the old method's meaning.
4. Remove the deprecated API only in a package major release.

Corrections that make an existing method conform to the pinned contract, including wrong HTTP methods
or routes, are bug fixes rather than deprecations.

## Verification claims

The test suite currently verifies request behavior with mocked or injected fetch responses. It does
not run an Argo CD server and must not be presented as live compatibility testing. Once #2 is
implemented, CI may additionally claim contract compatibility only for the exact Argo CD tags checked
by that workflow.
