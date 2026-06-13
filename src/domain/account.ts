/** Argo CD local account. */
export interface ArgoCdAccount {
  /** Account name. */
  name?: string;
  /** Whether account is enabled. */
  enabled?: boolean;
  /** Capabilities granted to account. */
  capabilities?: string[];
  /** Account tokens. */
  tokens?: ArgoCdAccountToken[];
}

/** Argo CD account token metadata. */
export interface ArgoCdAccountToken {
  /** Token id. */
  id?: string;
  /** Issued-at Unix timestamp. */
  issuedAt?: number;
  /** Expiration Unix timestamp. */
  expiresAt?: number;
}

/** List response for accounts. */
export interface ArgoCdAccountList {
  /** Accounts returned by Argo CD. */
  items: ArgoCdAccount[];
}

/** Response returned by account `can-i` checks. */
export interface ArgoCdCanIResponse {
  /** Authorization result, usually `yes` or `no`. */
  value: string;
}

/** List response for account tokens. */
export interface ArgoCdAccountTokenList {
  /** Tokens returned by Argo CD. */
  items: ArgoCdAccountToken[];
}

/** Request body for creating an account token. */
export interface ArgoCdAccountCreateTokenRequest {
  /** Go duration string (`"24h"`, `"1h30m"`, `"0"` for no expiry). */
  expiresIn?: string;
  /** Optional token identifier / name. */
  id?: string;
}

/** Response returned when a new account token is created. */
export interface ArgoCdAccountTokenCreated {
  /** The JWT string for the new token. */
  token?: string;
  /** Token identifier. */
  id?: string;
  /** Unix timestamp when the token was issued. */
  issuedAt?: number;
  /** Unix timestamp when the token expires (absent when no expiry). */
  expiresAt?: number;
}
