/** Argo CD server version info. */
export interface ArgoCdVersion {
  /** Argo CD release version string (e.g. `v2.9.3`). */
  Version?: string;
  /** ISO 8601 build date. */
  BuildDate?: string;
  /** Git commit SHA. */
  GitCommit?: string;
  /** Git tag at build time. */
  GitTag?: string;
  /** `clean` or `dirty`. */
  GitTreeState?: string;
  /** Go runtime version used to build. */
  GoVersion?: string;
  /** Go compiler name. */
  Compiler?: string;
  /** `GOOS/GOARCH` build target. */
  Platform?: string;
  /** Extra build info (may be empty). */
  ExtraBuildInfo?: string;
}
