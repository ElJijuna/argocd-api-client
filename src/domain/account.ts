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
