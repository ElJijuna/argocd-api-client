/** Argo CD repository credentials/config. */
export interface ArgoCdRepository {
  /** Repository URL. */
  repo?: string;
  /** Repository display name. */
  name?: string;
  /** Repository type, such as `git` or `helm`. */
  type?: string;
  /** Project this repository belongs to. */
  project?: string;
  /** Username for repository auth. */
  username?: string;
  /** Password for repository auth. */
  password?: string;
  /** SSH private key for repository auth. */
  sshPrivateKey?: string;
  /** TLS client certificate data. */
  tlsClientCertData?: string;
  /** TLS client certificate key. */
  tlsClientCertKey?: string;
  /** Whether TLS verification is disabled. */
  insecure?: boolean;
  /** Whether Git LFS is enabled. */
  enableLfs?: boolean;
  /** Whether SSH host key checks are disabled. */
  insecureIgnoreHostKey?: boolean;
}

/** List response for repositories. */
export interface ArgoCdRepositoryList {
  /** Repositories returned by Argo CD. */
  items: ArgoCdRepository[];
}

/** A single Git ref (branch, tag, or commit). */
export interface ArgoCdRepositoryRef {
  /** Ref name, e.g. `refs/heads/main`. */
  name?: string;
}

/** Response for the repository refs endpoint. */
export interface ArgoCdRepositoryRefs {
  /** Branch refs. */
  branches?: string[];
  /** Tag refs. */
  tags?: string[];
}
