/** Argo CD repository certificate. */
export interface ArgoCdCertificate {
  /** Hostname the certificate is for. */
  serverName?: string;
  /** Certificate type (`ssh` or `https`). */
  certType?: string;
  /** Certificate sub-type (e.g. `ssh-rsa`, `ecdsa-sha2-nistp256`). */
  certSubType?: string;
  /** PEM-encoded certificate data (https) or public key (ssh). */
  certData?: string;
  /** Human-readable info (e.g. key fingerprint). */
  certInfo?: string;
}

/** List response for repository certificates. */
export interface ArgoCdCertificateList {
  /** Certificates returned by Argo CD. */
  items?: ArgoCdCertificate[];
}

/** Query params for deleting certificates. */
export interface ArgoCdCertificateDeleteParams {
  /** Hostname pattern to match (supports glob). */
  hostNamePattern?: string;
  /** Limit delete to certificates of this type (`ssh` or `https`). */
  certType?: string;
  /** Limit delete to certificates of this sub-type. */
  certSubType?: string;
}
