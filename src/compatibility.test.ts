import {
  ARGO_CD_MINIMUM_SUPPORTED_VERSION,
  buildArgoCdServerCapabilities,
  normalizeArgoCdServerVersion,
} from './compatibility';

describe('Argo CD compatibility policy', () => {
  it('normalizes a supported stable version and enables known capabilities', () => {
    const capabilities = buildArgoCdServerCapabilities({
      Version: 'v3.5.1+abcdef',
      GitTreeState: 'clean',
    });

    expect(capabilities.version).toEqual({
      raw: 'v3.5.1+abcdef',
      major: 3,
      minor: 5,
      patch: 1,
      prerelease: undefined,
      buildMetadata: 'abcdef',
      kind: 'stable',
    });
    expect(capabilities.minimumSupportedVersion).toBe(ARGO_CD_MINIMUM_SUPPORTED_VERSION);
    expect(capabilities.supported).toBe(true);
    expect(Object.values(capabilities.features).every(Boolean)).toBe(true);
  });

  it('treats stable versions below the baseline as unsupported', () => {
    const capabilities = buildArgoCdServerCapabilities({ Version: 'v3.5.0' });

    expect(capabilities.version.kind).toBe('stable');
    expect(capabilities.supported).toBe(false);
    expect(Object.values(capabilities.features).every((available) => !available)).toBe(true);
  });

  it.each([
    [{ Version: 'development' }, 'development'],
    [{ Version: 'v3.6.0-dev.1' }, 'development'],
    [{ Version: 'v3.6.0-rc.1' }, 'prerelease'],
    [{ Version: 'not-semver' }, 'unknown'],
    [{}, 'unknown'],
    [{ GitTag: 'v3.5.1', GitTreeState: 'dirty' }, 'development'],
  ] as const)('returns conservative flags for %p', (raw, kind) => {
    const capabilities = buildArgoCdServerCapabilities(raw);

    expect(capabilities.version.kind).toBe(kind);
    expect(capabilities.supported).toBe(false);
    expect(Object.values(capabilities.features).every((available) => !available)).toBe(true);
  });

  it('falls back to GitTag when Version is absent', () => {
    expect(normalizeArgoCdServerVersion({ GitTag: 'v3.5.2' })).toMatchObject({
      raw: 'v3.5.2',
      major: 3,
      minor: 5,
      patch: 2,
      kind: 'stable',
    });
  });
});
