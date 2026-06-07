export interface ArgoCdRepository {
  repo?: string;
  name?: string;
  type?: string;
  project?: string;
  username?: string;
  password?: string;
  sshPrivateKey?: string;
  tlsClientCertData?: string;
  tlsClientCertKey?: string;
  insecure?: boolean;
  enableLfs?: boolean;
  insecureIgnoreHostKey?: boolean;
}

export interface ArgoCdRepositoryList {
  items: ArgoCdRepository[];
}
