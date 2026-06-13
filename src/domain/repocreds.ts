/** Argo CD repository credential template. */
export interface ArgoCdRepoCred {
  /** URL prefix this credential template applies to. */
  url?: string;
  /** Git username. */
  username?: string;
  /** SSH private key. */
  sshPrivateKey?: string;
  /** TLS client certificate (PEM). */
  tlsClientCertData?: string;
  /** TLS client certificate key (PEM). */
  tlsClientCertKey?: string;
  /** Repository type (`git` or `helm`). */
  type?: string;
  /** GitHub App ID. */
  githubAppId?: number;
  /** GitHub App installation ID. */
  githubAppInstallationId?: number;
  /** GitHub Enterprise base URL. */
  githubAppEnterpriseBaseUrl?: string;
  /** Whether TLS verification is disabled. */
  insecure?: boolean;
  /** Whether server-side certificate verification is enabled for Helm repos. */
  enableOCI?: boolean;
}

/** List response for repository credential templates. */
export interface ArgoCdRepoCredList {
  /** Credential templates returned by Argo CD. */
  items: ArgoCdRepoCred[];
}
