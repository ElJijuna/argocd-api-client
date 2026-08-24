import type { ArgoCdVersion } from './domain/version';

/** Minimum Argo CD version covered by the compatibility guarantee. */
export const ARGO_CD_MINIMUM_SUPPORTED_VERSION = 'v3.5.1' as const;

const CAPABILITY_RULES = {
  applicationWatchStream: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationResourceTreeStream: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationSyncWindows: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationDeepLinks: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationOciMetadata: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationSetGeneration: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationSetDiagnostics: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  applicationSetWatchStream: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  projectSyncWindows: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  projectDeepLinks: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  repositoryOciTags: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  repositoryHelmCharts: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  repositoryValidation: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  clusterAuthRotation: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  projectRoleTokens: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
} as const;

/** Operations whose availability can be checked before invocation. */
export type ArgoCdCapability = keyof typeof CAPABILITY_RULES;

/** Conservative availability flags for version-gated Argo CD operations. */
export type ArgoCdFeatureFlags = Readonly<Record<ArgoCdCapability, boolean>>;

/** Classification applied to the version reported by the server. */
export type ArgoCdServerVersionKind = 'stable' | 'prerelease' | 'development' | 'unknown';

/** Parsed, normalized Argo CD semantic version information. */
export interface ArgoCdNormalizedServerVersion {
  readonly raw?: string;
  readonly major?: number;
  readonly minor?: number;
  readonly patch?: number;
  readonly prerelease?: string;
  readonly buildMetadata?: string;
  readonly kind: ArgoCdServerVersionKind;
}

/** Result returned by {@link ArgoCdClient.capabilities}. */
export interface ArgoCdServerCapabilities {
  /** Raw response returned by the VersionService. */
  readonly raw: ArgoCdVersion;
  /** Normalized version and its stability classification. */
  readonly version: ArgoCdNormalizedServerVersion;
  /** Whether the server is inside the guaranteed compatibility baseline. */
  readonly supported: boolean;
  /** Current minimum version used to evaluate support and feature flags. */
  readonly minimumSupportedVersion: typeof ARGO_CD_MINIMUM_SUPPORTED_VERSION;
  /** Typed availability flags. Unknown and development versions return all `false`. */
  readonly features: ArgoCdFeatureFlags;
}

/** Options for querying server capabilities. */
export interface ArgoCdCapabilitiesOptions {
  /** Ignore the cached result and query VersionService again. */
  refresh?: boolean;
  /** Abort the VersionService request. */
  signal?: AbortSignal;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  buildMetadata?: string;
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
const DEVELOPMENT_PATTERN = /(?:^|[-+.])(dev|devel|development|unknown)(?:$|[-+.])/i;

function parseVersion(value: string): ParsedVersion | undefined {
  const match = VERSION_PATTERN.exec(value.trim());

  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
    buildMetadata: match[5],
  };
}

function isDevelopmentBuild(raw: ArgoCdVersion, value: string): boolean {
  return (
    raw.GitTreeState?.toLowerCase() === 'dirty' ||
    DEVELOPMENT_PATTERN.test(value) ||
    DEVELOPMENT_PATTERN.test(raw.ExtraBuildInfo ?? '')
  );
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }

  return 0;
}

function isStableVersionAtLeast(version: ArgoCdNormalizedServerVersion, minimum: string): boolean {
  const parsedMinimum = parseVersion(minimum);

  if (
    version.kind !== 'stable' ||
    version.major === undefined ||
    version.minor === undefined ||
    version.patch === undefined ||
    !parsedMinimum
  ) {
    return false;
  }

  return (
    compareVersions(
      { major: version.major, minor: version.minor, patch: version.patch },
      parsedMinimum,
    ) >= 0
  );
}

/** @internal */
export function normalizeArgoCdServerVersion(raw: ArgoCdVersion): ArgoCdNormalizedServerVersion {
  const value = raw.Version ?? raw.GitTag;

  if (!value) {
    return { kind: 'unknown' };
  }

  const parsed = parseVersion(value);

  if (!parsed) {
    return { raw: value, kind: DEVELOPMENT_PATTERN.test(value) ? 'development' : 'unknown' };
  }

  const kind: ArgoCdServerVersionKind = isDevelopmentBuild(raw, value)
    ? 'development'
    : parsed.prerelease
      ? 'prerelease'
      : 'stable';

  return { raw: value, ...parsed, kind };
}

function evaluateFeatures(version: ArgoCdNormalizedServerVersion): ArgoCdFeatureFlags {
  if (version.kind !== 'stable') {
    return Object.fromEntries(Object.keys(CAPABILITY_RULES).map((feature) => [feature, false])) as {
      [Feature in ArgoCdCapability]: boolean;
    };
  }

  return Object.fromEntries(
    Object.entries(CAPABILITY_RULES).map(([feature, minimum]) => [
      feature,
      isStableVersionAtLeast(version, minimum),
    ]),
  ) as { [Feature in ArgoCdCapability]: boolean };
}

/** @internal */
export function buildArgoCdServerCapabilities(raw: ArgoCdVersion): ArgoCdServerCapabilities {
  const version = normalizeArgoCdServerVersion(raw);
  const features = evaluateFeatures(version);

  return {
    raw,
    version,
    supported: isStableVersionAtLeast(version, ARGO_CD_MINIMUM_SUPPORTED_VERSION),
    minimumSupportedVersion: ARGO_CD_MINIMUM_SUPPORTED_VERSION,
    features,
  };
}
