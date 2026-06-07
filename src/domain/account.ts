export interface ArgoCdAccount {
  name?: string;
  enabled?: boolean;
  capabilities?: string[];
  tokens?: ArgoCdAccountToken[];
}

export interface ArgoCdAccountToken {
  id?: string;
  issuedAt?: number;
  expiresAt?: number;
}

export interface ArgoCdAccountList {
  items: ArgoCdAccount[];
}

export interface ArgoCdCanIResponse {
  value: string;
}
