/** Argo CD GPG public key. */
export interface ArgoCdGpgKey {
  /** Short key ID (e.g. `A123BC45`). */
  keyID?: string;
  /** Full key fingerprint. */
  fingerprint?: string;
  /** Key owner name / email. */
  owner?: string;
  /** Key trust level (e.g. `ultimate`, `full`). */
  trust?: string;
  /** Key algorithm sub-type (e.g. `rsa4096`, `ed25519`). */
  subType?: string;
  /** ASCII-armored PGP public key data. */
  keyData?: string;
}

/** Response returned when creating GPG keys. */
export interface ArgoCdGpgKeyCreateResponse {
  /** Keys that were successfully imported, keyed by key ID. */
  created?: Record<string, ArgoCdGpgKey>;
  /** Key IDs that were skipped (already present). */
  skipped?: string[];
}

/** List response for GPG keys. */
export interface ArgoCdGpgKeyList {
  /** GPG keys returned by Argo CD, keyed by key ID. */
  items?: Record<string, ArgoCdGpgKey>;
}
