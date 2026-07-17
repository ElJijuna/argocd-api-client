import type {
  ArgoCdApplicationSnapshot,
  ArgoCdApplicationSnapshotDiff,
  ArgoCdNormalizedResources,
} from '../domain/application';

function difference<T>(left: Iterable<T>, right: Set<T>): T[] {
  return [...new Set(left)].filter((value) => !right.has(value));
}

function subtract(
  after: ArgoCdNormalizedResources,
  before: ArgoCdNormalizedResources,
): ArgoCdNormalizedResources {
  return {
    cpuMillicores: after.cpuMillicores - before.cpuMillicores,
    memoryBytes: after.memoryBytes - before.memoryBytes,
    ephemeralStorageBytes: after.ephemeralStorageBytes - before.ephemeralStorageBytes,
  };
}

/** Compares two snapshots locally; performs no network requests. */
export function compareApplicationSnapshots(
  before: ArgoCdApplicationSnapshot,
  after: ArgoCdApplicationSnapshot,
): ArgoCdApplicationSnapshotDiff {
  const beforeImages = new Set(before.insights.images);
  const afterImages = new Set(after.insights.images);
  const beforeWarnings = new Set(before.insights.warnings.map((warning) => warning.code));
  const afterWarnings = new Set(after.insights.warnings.map((warning) => warning.code));

  return {
    healthChanged: before.insights.health !== after.insights.health,
    syncChanged: before.insights.sync !== after.insights.sync,
    revisionChanged: before.insights.revision !== after.insights.revision,
    addedImages: difference(after.insights.images, beforeImages),
    removedImages: difference(before.insights.images, afterImages),
    addedWarningCodes: difference(afterWarnings, beforeWarnings),
    resolvedWarningCodes: difference(beforeWarnings, afterWarnings),
    requestDelta: subtract(after.insights.allocation.requests, before.insights.allocation.requests),
  };
}
