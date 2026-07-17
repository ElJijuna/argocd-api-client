import type {
  ArgoCdApplication,
  ArgoCdApplicationInsights,
  ArgoCdApplicationInsightsParams,
  ArgoCdApplicationInsightWarning,
  ArgoCdApplicationResourceAllocation,
  ArgoCdEvent,
  ArgoCdManagedResource,
  ArgoCdResourceTree,
} from '../domain/application';

interface InsightInput {
  name: string;
  application: ArgoCdApplication;
  resources: ArgoCdManagedResource[];
  tree: ArgoCdResourceTree;
  events: ArgoCdEvent[];
  allocation: ArgoCdApplicationResourceAllocation;
  params: ArgoCdApplicationInsightsParams;
}

export function buildApplicationInsights(input: InsightInput): ArgoCdApplicationInsights {
  const { name, application, resources, tree, events, allocation, params } = input;
  const warnings: ArgoCdApplicationInsightWarning[] = [];
  const images = [...new Set((tree.nodes ?? []).flatMap((node) => node.images ?? []))];
  const restartThreshold = params.restartWarningThreshold ?? 1;

  for (const image of images) {
    if (image.endsWith(':latest')) {
      warnings.push({
        code: 'IMAGE_LATEST_TAG',
        severity: 'warning',
        message: `Image uses mutable latest tag: ${image}`,
      });
    }

    if (!image.includes('@sha256:')) {
      warnings.push({
        code: 'IMAGE_NOT_PINNED',
        severity: 'info',
        message: `Image is not pinned by digest: ${image}`,
      });
    }
  }

  for (const pod of allocation.pods) {
    const resource = { kind: 'Pod', namespace: pod.namespace, name: pod.name };

    for (const container of [...pod.containers, ...(pod.initContainers ?? [])]) {
      const checks: Array<{
        missing: boolean;
        code: ArgoCdApplicationInsightWarning['code'];
        message: string;
      }> = [
        {
          missing: container.resources?.requests?.['cpu'] === undefined,
          code: 'MISSING_CPU_REQUEST',
          message: 'Container has no CPU request',
        },
        {
          missing: container.resources?.requests?.['memory'] === undefined,
          code: 'MISSING_MEMORY_REQUEST',
          message: 'Container has no memory request',
        },
        {
          missing: container.resources?.limits?.['cpu'] === undefined,
          code: 'MISSING_CPU_LIMIT',
          message: 'Container has no CPU limit',
        },
        {
          missing: container.resources?.limits?.['memory'] === undefined,
          code: 'MISSING_MEMORY_LIMIT',
          message: 'Container has no memory limit',
        },
      ];

      for (const check of checks) {
        if (check.missing) {
          warnings.push({
            code: check.code,
            severity: 'warning',
            message: check.message,
            resource,
            container: container.name,
          });
        }
      }

      const restartCount = container.restartCount ?? 0;

      if (restartCount >= restartThreshold) {
        warnings.push({
          code: 'CONTAINER_RESTARTS',
          severity: 'warning',
          message: `Container restarted ${restartCount} times`,
          resource,
          container: container.name,
        });
      }
    }
  }

  const warningEvents = events.filter((event) => event.type === 'Warning');

  for (const event of warningEvents) {
    warnings.push({
      code: 'WARNING_EVENT',
      severity: event.reason === 'OOMKilling' ? 'critical' : 'warning',
      message: event.message ?? event.reason ?? 'Kubernetes warning event',
      resource: event.involvedObject,
    });
  }

  for (const resource of resources) {
    if (
      resource.liveState &&
      resource.normalizedLiveState &&
      resource.liveState !== resource.normalizedLiveState
    ) {
      warnings.push({
        code: 'OUT_OF_SYNC_RESOURCE',
        severity: 'warning',
        message: 'Live resource differs from normalized target state',
        resource,
      });
    }
  }

  for (const orphan of tree.orphanedNodes ?? []) {
    warnings.push({
      code: 'ORPHANED_RESOURCE',
      severity: 'warning',
      message: 'Resource is orphaned from the application ownership tree',
      resource: orphan,
    });
  }

  const status = application.status as Record<string, unknown> | undefined;
  const health = status?.['health'] as Record<string, unknown> | undefined;
  const sync = status?.['sync'] as Record<string, unknown> | undefined;

  return {
    name,
    health: (health?.['status'] as string | undefined) ?? 'Unknown',
    sync: (sync?.['status'] as string | undefined) ?? 'Unknown',
    revision: sync?.['revision'] as string | undefined,
    images,
    allocation,
    warnings,
    counts: {
      resources: resources.length,
      orphanedResources: tree.orphanedNodes?.length ?? 0,
      warningEvents: warningEvents.length,
    },
  };
}
