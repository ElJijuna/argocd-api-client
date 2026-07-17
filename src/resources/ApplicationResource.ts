import type {
  ArgoCdApplication,
  ArgoCdApplicationGetParams,
  ArgoCdApplicationFleetSummary,
  ArgoCdApplicationHealth,
  ArgoCdApplicationInsights,
  ArgoCdApplicationInsightsParams,
  ArgoCdApplicationList,
  ArgoCdApplicationListParams,
  ArgoCdApplicationLogsParams,
  ArgoCdApplicationManifests,
  ArgoCdApplicationManifestsParams,
  ArgoCdApplicationPlan,
  ArgoCdApplicationResourceManifest,
  ArgoCdApplicationResourceAllocation,
  ArgoCdApplicationResourceParams,
  ArgoCdApplicationSnapshot,
  ArgoCdApplicationSnapshotParams,
  ArgoCdApplicationWaitRequest,
  ArgoCdApplicationWatchParams,
  ArgoCdContainer,
  ArgoCdChartDetails,
  ArgoCdDeleteResourceParams,
  ArgoCdEvent,
  ArgoCdEventsParams,
  ArgoCdLogEntry,
  ArgoCdManagedResource,
  ArgoCdManagedResourcesList,
  ArgoCdManagedResourcesParams,
  ArgoCdNode,
  ArgoCdPod,
  ArgoCdPodsParams,
  ArgoCdPatchApplicationResourceParams,
  ArgoCdResourceQuantities,
  ArgoCdResourceActions,
  ArgoCdResourceLinks,
  ArgoCdResourceRequirements,
  ArgoCdResourceTree,
  ArgoCdRevisionMetadata,
  ArgoCdRevisionMetadataParams,
  ArgoCdRevisionSourceParams,
  ArgoCdRunResourceActionRequest,
  ArgoCdServerSideDiff,
  ArgoCdServerSideDiffParams,
  ArgoCdSyncManyOptions,
  ArgoCdSyncManyResult,
  ArgoCdSyncRequest,
} from '../domain/application';
import { buildApplicationInsights } from './applicationInsights';
import {
  allLimitsCovered,
  calculatePodResourceAllocation,
  sumNormalizedResources,
} from './resourceAllocation';
import type { BodyRequestFn, EmptyBodyRequestFn, NdJsonRequestFn, RequestFn } from './types';

function appendQuery(path: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    query.set(key, String(value));
  }

  const encoded = query.toString();

  return encoded ? `${path}?${encoded}` : path;
}

function waitForPoll(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    const abort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }
  });
}

/**
 * Methods for Argo CD applications.
 *
 * Applications represent deployed GitOps workloads managed by Argo CD.
 */
export class ApplicationResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
    private readonly patchRequest: BodyRequestFn,
    private readonly put: BodyRequestFn,
    private readonly ndJson: NdJsonRequestFn,
  ) {}

  /**
   * Lists Argo CD applications, optionally filtered by project, label selector, repo, or namespace.
   *
   * @param params - Optional filters: `project`, `selector`, `repo`, `appNamespace`, etc.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Paginated list of applications.
   *
   * @example
   * // All apps in a project
   * const { items } = await argocd.applications.list({ project: ['default'] });
   * console.log(items.map(a => a.metadata?.name));
   *
   * @example
   * // Filter by label selector
   * const { items } = await argocd.applications.list({ selector: 'env=prod' });
   */
  async list(
    params: ArgoCdApplicationListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationList> {
    return this.request<ArgoCdApplicationList>('/api/v1/applications', params, signal);
  }

  /**
   * Gets a single application by name.
   *
   * @param name - Application name.
   * @param params - Optional: `appNamespace`, `project`, `refresh` (`'normal'` | `'hard'`).
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The full application object including `spec` and `status`.
   *
   * @example
   * const app = await argocd.applications.get('guestbook');
   * console.log(app.status?.health?.status); // 'Healthy'
   *
   * @example
   * // Force hard refresh before returning
   * const app = await argocd.applications.get('guestbook', { refresh: 'hard' });
   */
  async get(
    name: string,
    params: ArgoCdApplicationGetParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.request<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      params,
      signal,
    );
  }

  /**
   * Creates a new Argo CD application.
   *
   * @param application - Application manifest. At minimum `metadata.name` and `spec` are required.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The created application as stored by Argo CD.
   *
   * @example
   * const app = await argocd.applications.create({
   *   metadata: { name: 'guestbook' },
   *   spec: {
   *     project: 'default',
   *     source: { repoURL: 'https://github.com/acme/guestbook.git', path: 'helm', targetRevision: 'HEAD' },
   *     destination: { server: 'https://kubernetes.default.svc', namespace: 'guestbook' },
   *   },
   * });
   */
  async create(application: ArgoCdApplication, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>('/api/v1/applications', { application }, signal);
  }

  /**
   * Replaces an application (full PUT). Use {@link patch} for partial updates.
   *
   * @param name - Application name.
   * @param application - Complete application manifest to replace the current one.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The updated application.
   *
   * @example
   * const updated = await argocd.applications.update('guestbook', {
   *   metadata: { name: 'guestbook' },
   *   spec: { /* full spec *\/ },
   * });
   */
  async update(
    name: string,
    application: ArgoCdApplication,
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.put<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      { application },
      signal,
    );
  }

  /**
   * Deletes an application by name.
   *
   * @param name - Application name.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Empty object on success.
   *
   * @example
   * await argocd.applications.deleteByName('guestbook');
   */
  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      signal,
    );
  }

  /**
   * Applies a JSON merge patch to an application. Prefer this over {@link update} for partial changes.
   *
   * @param name - Application name.
   * @param patch - Partial application object to merge. Only provided fields are changed.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The patched application.
   *
   * @example
   * // Change only the sync policy
   * const app = await argocd.applications.patch('guestbook', {
   *   spec: { syncPolicy: { automated: { prune: true, selfHeal: true } } },
   * });
   */
  async patch(name: string, patch: unknown, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.patchRequest<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      patch,
      signal,
    );
  }

  /**
   * Triggers a sync for an application, reconciling live state with the desired Git state.
   *
   * @param name - Application name.
   * @param body - Optional sync options: `revision`, `prune`, `dryRun`, `resources`, etc.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The application after sync is initiated.
   *
   * @example
   * // Sync to HEAD
   * await argocd.applications.sync('guestbook');
   *
   * @example
   * // Sync to a specific revision with prune
   * await argocd.applications.sync('guestbook', { revision: 'v2.1.0', prune: true });
   */
  async sync(
    name: string,
    body: ArgoCdSyncRequest = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      body,
      signal,
    );
  }

  /** Synchronizes multiple applications with bounded concurrency and per-application results. */
  async syncMany(
    names: readonly string[],
    options: ArgoCdSyncManyOptions = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdSyncManyResult[]> {
    const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4));
    const results = new Array<ArgoCdSyncManyResult>(names.length);

    let next = 0;

    const worker = async () => {
      while (next < names.length) {
        const index = next++;
        const name = names[index];

        try {
          let application = await this.sync(name, options.sync, signal);

          if (options.wait) {
            application = await this.wait(name, options.waitFor, signal);
          }

          results[index] = { name, status: 'fulfilled', application };
        } catch (error) {
          results[index] = {
            name,
            status: 'rejected',
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));

    return results;
  }

  /** Iterates applications from the current Argo CD list response. */
  async *iterate(
    params: ArgoCdApplicationListParams = {},
    signal?: AbortSignal,
  ): AsyncIterable<ArgoCdApplication> {
    const response = await this.list(params, signal);

    for (const application of response.items) {
      yield application;
    }
  }

  /** Polls Argo CD and yields applications whose resourceVersion changed. */
  async *watch(
    params: ArgoCdApplicationWatchParams = {},
    signal?: AbortSignal,
  ): AsyncIterable<ArgoCdApplication> {
    const { intervalMs = 5_000, emitInitial = true, ...listParams } = params;
    const versions = new Map<string, string | undefined>();

    let initial = true;

    while (!signal?.aborted) {
      const response = await this.list(listParams, signal);

      for (const application of response.items) {
        const key = `${application.metadata?.namespace ?? ''}/${application.metadata?.name ?? ''}`;
        const version = application.metadata?.resourceVersion;

        if ((initial && emitInitial) || (!initial && versions.get(key) !== version)) {
          yield application;
        }

        versions.set(key, version);
      }

      initial = false;
      await waitForPoll(intervalMs, signal);
    }
  }

  /** Summarizes fleet health and sync states from one list call. */
  async fleetSummary(
    params: ArgoCdApplicationListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationFleetSummary> {
    const { items } = await this.list(params, signal);
    const health: Record<string, number> = {};
    const sync: Record<string, number> = {};

    for (const application of items) {
      const status = application.status as Record<string, unknown> | undefined;
      const healthValue = ((status?.['health'] as Record<string, unknown> | undefined)?.[
        'status'
      ] ?? 'Unknown') as string;
      const syncValue = ((status?.['sync'] as Record<string, unknown> | undefined)?.['status'] ??
        'Unknown') as string;

      health[healthValue] = (health[healthValue] ?? 0) + 1;
      sync[syncValue] = (sync[syncValue] ?? 0) + 1;
    }

    return { total: items.length, health, sync, applications: items };
  }

  /**
   * Rolls back an application to a previous deployment by history ID.
   *
   * @param name - Application name.
   * @param body - Rollback options.
   * @param body.id - History ID to roll back to (from `app.status.history`).
   * @param body.prune - Whether to delete resources not present in the target revision.
   * @param body.dryRun - Simulate without applying changes.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The application after rollback is initiated.
   *
   * @example
   * await argocd.applications.rollback('guestbook', { id: 3 });
   */
  async rollback(
    name: string,
    body: { id?: number; prune?: boolean; dryRun?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/rollback`,
      body,
      signal,
    );
  }

  /**
   * Fetches pod logs for an application. The server streams NDJSON; this method buffers and returns
   * it as an array. Use `params.follow: false` (default) for a bounded response.
   *
   * @param name - Application name.
   * @param params - Log options: `podName`, `container`, `namespace`, `tailLines`, `sinceSeconds`, `filter`, etc.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of log entries, each with `content`, `timestamp`, `podName`, and `container`.
   *
   * @example
   * const logs = await argocd.applications.logs('guestbook', {
   *   container: 'api',
   *   tailLines: 100,
   * });
   * logs.forEach(l => console.log(l.content));
   */
  async logs(
    name: string,
    params: ArgoCdApplicationLogsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdLogEntry[]> {
    return this.ndJson<ArgoCdLogEntry>(
      `/api/v1/applications/${encodeURIComponent(name)}/logs`,
      params,
      signal,
    );
  }

  /**
   * Renders desired application manifests through Argo CD without applying them.
   * Supports single-source revisions and paired multi-source `sourcePositions` / `revisions`.
   */
  async manifests(
    name: string,
    params: ArgoCdApplicationManifestsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationManifests> {
    return this.request<ArgoCdApplicationManifests>(
      `/api/v1/applications/${encodeURIComponent(name)}/manifests`,
      params,
      signal,
    );
  }

  /** Performs Argo CD's server-side apply dry-run diff for supplied target manifests. */
  async serverSideDiff(
    name: string,
    params: ArgoCdServerSideDiffParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdServerSideDiff> {
    return this.request<ArgoCdServerSideDiff>(
      `/api/v1/applications/${encodeURIComponent(name)}/server-side-diff`,
      params,
      signal,
    );
  }

  /**
   * Streams pod logs as they arrive from Argo CD without buffering the full response.
   * Iteration is lazy: the HTTP request starts when the iterable is consumed.
   *
   * @param name - Application name.
   * @param params - Log options. Set `follow: true` to keep receiving new entries.
   * @param signal - Optional `AbortSignal` to stop the stream.
   * @returns Async iterable of log entries.
   *
   * @example
   * for await (const entry of argocd.applications.logsStream('guestbook', { follow: true })) {
   *   console.log(entry.content);
   * }
   */
  logsStream(
    name: string,
    params: ArgoCdApplicationLogsParams = {},
    signal?: AbortSignal,
  ): AsyncIterable<ArgoCdLogEntry> {
    return this.ndJson.stream<ArgoCdLogEntry>(
      `/api/v1/applications/${encodeURIComponent(name)}/logs`,
      params,
      signal,
    );
  }

  /**
   * Returns the live Kubernetes resource tree for an application — all nodes (Deployments, ReplicaSets,
   * Pods, Services…) with health, status, and parent references.
   *
   * @param name - Application name.
   * @param params - Optional `appNamespace` for multi-namespace installs.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Tree with `nodes`, `orphanedNodes`, and `hosts`.
   *
   * @example
   * const tree = await argocd.applications.resourceTree('guestbook');
   * const pods = tree.nodes?.filter(n => n.kind === 'Pod');
   */
  async resourceTree(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdResourceTree> {
    return this.request<ArgoCdResourceTree>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource-tree`,
      params,
      signal,
    );
  }

  /**
   * Returns the managed Kubernetes resources for an application, including their live and target
   * manifests as JSON strings (`liveState`, `targetState`, `normalizedLiveState`).
   *
   * @param name - Application name.
   * @param params - Optional filters: `kind`, `group`, `namespace`, `resourceName`, `version`, `appNamespace`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of managed resources (empty array if none).
   *
   * @example
   * // All managed resources
   * const resources = await argocd.applications.managedResources('guestbook');
   *
   * @example
   * // Only Deployments
   * const deployments = await argocd.applications.managedResources('guestbook', { kind: 'Deployment' });
   */
  async managedResources(
    name: string,
    params: ArgoCdManagedResourcesParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdManagedResource[]> {
    const res = await this.request<ArgoCdManagedResourcesList>(
      `/api/v1/applications/${encodeURIComponent(name)}/managed-resources`,
      params,
      signal,
    );

    return res.items ?? [];
  }

  /** Returns one live Kubernetes manifest managed by an application. */
  async getResource(
    name: string,
    params: ArgoCdApplicationResourceParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationResourceManifest> {
    return this.request<ArgoCdApplicationResourceManifest>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource`,
      params,
      signal,
    );
  }

  /**
   * Patches one live Kubernetes resource. `patch` must be the JSON-encoded patch string expected by
   * Argo CD; `patchType` selects merge, strategic merge, or JSON patch semantics.
   */
  async patchResource(
    name: string,
    patch: string,
    params: ArgoCdPatchApplicationResourceParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationResourceManifest> {
    const path = appendQuery(`/api/v1/applications/${encodeURIComponent(name)}/resource`, params);

    return this.post<ArgoCdApplicationResourceManifest>(path, patch, signal);
  }

  /** Lists built-in and custom actions available for one live resource. */
  async resourceActions(
    name: string,
    params: ArgoCdApplicationResourceParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdResourceActions> {
    return this.request<ArgoCdResourceActions>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource/actions`,
      params,
      signal,
    );
  }

  /** Runs a parameter-aware resource action through Argo CD's V2 action endpoint. */
  async runResourceAction(
    name: string,
    action: ArgoCdRunResourceActionRequest,
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    return this.post<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource/actions/v2`,
      { ...action, name },
      signal,
    );
  }

  /** Returns configured deep links (for example dashboards or logs) for one live resource. */
  async resourceLinks(
    name: string,
    params: ArgoCdApplicationResourceParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdResourceLinks> {
    return this.request<ArgoCdResourceLinks>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource/links`,
      params,
      signal,
    );
  }

  /**
   * Triggers a normal refresh and returns the updated application. Convenience wrapper for
   * `get(name, { refresh: 'normal' })`. Use `get(name, { refresh: 'hard' })` for a hard refresh.
   *
   * @param name - Application name.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The refreshed application.
   *
   * @example
   * const app = await argocd.applications.refresh('guestbook');
   * console.log(app.status?.sync?.status); // 'Synced'
   */
  async refresh(name: string, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.get(name, { refresh: 'normal' }, signal);
  }

  /**
   * Returns the deduplicated list of container images currently running across all resources
   * of an application. Data sourced from `resourceTree` node `images` fields.
   *
   * @param name - Application name.
   * @param params - Optional `appNamespace` for multi-namespace installs.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of unique image references (e.g. `['my-app:v2.1.0', 'nginx:1.25']`).
   *
   * @example
   * const images = await argocd.applications.images('guestbook');
   * console.log(images); // ['my-app:v2.1.0', 'redis:7', 'nginx:1.25']
   */
  async images(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<string[]> {
    const tree = await this.resourceTree(name, params, signal);
    const all = (tree.nodes ?? []).flatMap((n) => n.images ?? []);

    return [...new Set(all)];
  }

  /**
   * Returns the live pods for an application, parsed from the managed-resources `liveState` manifests.
   * Each pod includes its phase, node assignment, container specs, and container statuses.
   *
   * @param name - Application name.
   * @param params - Optional filters: `namespace`, `resourceName`, `appNamespace`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of pods, each with `containers` (including `ready` and `restartCount`).
   *
   * @example
   * const pods = await argocd.applications.pods('guestbook');
   * pods.forEach(p => {
   *   console.log(p.name, p.phase);            // 'api-abc123' 'Running'
   *   console.log(p.containers[0].restartCount); // 0
   * });
   *
   * @example
   * // Filter by namespace
   * const pods = await argocd.applications.pods('guestbook', { namespace: 'production' });
   */
  async pods(
    name: string,
    params: ArgoCdPodsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdPod[]> {
    const resources = await this.managedResources(name, { ...params, kind: 'Pod' }, signal);

    return resources
      .filter((r) => r.liveState)
      .map((r) => {
        const manifest = JSON.parse(r.liveState!);
        const containerStatuses: Array<Record<string, unknown>> =
          manifest.status?.containerStatuses ?? [];
        const toContainer = (c: Record<string, unknown>): ArgoCdContainer => {
          const { name, image, resources, restartPolicy } = c;
          const cs = containerStatuses.find(({ name: statusName }) => statusName === name) ?? {};
          const { ready, restartCount, state } = cs;

          return {
            name: name as string,
            image: image as string,
            ready: ready as boolean | undefined,
            restartCount: restartCount as number | undefined,
            state: state as Record<string, unknown> | undefined,
            resources: resources as ArgoCdResourceRequirements | undefined,
            restartPolicy: restartPolicy as string | undefined,
          };
        };

        return {
          name: manifest.metadata?.name,
          namespace: manifest.metadata?.namespace,
          phase: manifest.status?.phase,
          nodeName: manifest.spec?.nodeName,
          resources: manifest.spec?.resources as ArgoCdResourceRequirements | undefined,
          overhead: manifest.spec?.overhead as ArgoCdResourceQuantities | undefined,
          containers: (manifest.spec?.containers ?? []).map(toContainer),
          initContainers: manifest.spec?.initContainers?.map(toContainer),
        };
      });
  }

  /**
   * Returns all containers across every pod of an application, flattened into a single array.
   * Each entry includes `podName` as a back-reference. Delegates to {@link pods} internally.
   *
   * @param name - Application name.
   * @param params - Optional filters forwarded to {@link pods}: `namespace`, `resourceName`, `appNamespace`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Flat array of containers with `name`, `image`, `ready`, `restartCount`, `state`, and `podName`.
   *
   * @example
   * const containers = await argocd.applications.containers('guestbook');
   * containers.forEach(c => {
   *   console.log(`${c.podName} / ${c.name} — ${c.image} (ready: ${c.ready})`);
   * });
   *
   * @example
   * // Get logs for the first container
   * const [c] = await argocd.applications.containers('guestbook');
   * const logs = await argocd.applications.logs('guestbook', { podName: c.podName, container: c.name });
   */
  async containers(
    name: string,
    params: ArgoCdPodsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdContainer[]> {
    const pods = await this.pods(name, params, signal);

    return pods.flatMap((pod) => pod.containers.map((c) => ({ ...c, podName: pod.name })));
  }

  /**
   * Calculates resource allocation from live Pod manifests available through Argo CD.
   * Requests follow Kubernetes scheduling rules for regular containers, init containers,
   * restartable init sidecars, Pod-level resources, and RuntimeClass overhead. Results include
   * CPU, memory, and ephemeral storage grouped by Pod and assigned node.
   *
   * This is declared allocation, not real-time usage. Cluster capacity and resources consumed by
   * workloads outside this application are not available from the Argo CD application API.
   *
   * @param name - Application name.
   * @param params - Optional Pod filters: `namespace`, `resourceName`, `appNamespace`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   */
  async resourceAllocation(
    name: string,
    params: ArgoCdPodsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationResourceAllocation> {
    const pods = await this.pods(name, params, signal);
    const allocations = pods.map(calculatePodResourceAllocation);
    const grouped = new Map<string | undefined, typeof allocations>();

    for (const allocation of allocations) {
      const current = grouped.get(allocation.nodeName) ?? [];

      current.push(allocation);
      grouped.set(allocation.nodeName, current);
    }

    const nodes = [...grouped.entries()].map(([nodeName, nodePods]) => ({
      nodeName,
      podCount: nodePods.length,
      requests: sumNormalizedResources(nodePods.map((pod) => pod.requests)),
      limits: sumNormalizedResources(nodePods.map((pod) => pod.limits)),
      limitsFullySpecified: allLimitsCovered(nodePods),
    }));

    return {
      podCount: pods.length,
      containerCount: pods.reduce((count, pod) => count + pod.containers.length, 0),
      initContainerCount: pods.reduce((count, pod) => count + (pod.initContainers?.length ?? 0), 0),
      pods: allocations,
      nodes,
      requests: sumNormalizedResources(allocations.map((pod) => pod.requests)),
      limits: sumNormalizedResources(allocations.map((pod) => pod.limits)),
      limitsFullySpecified: allLimitsCovered(allocations),
    };
  }

  /**
   * Returns the Kubernetes nodes that host this application's pods, with OS and container runtime
   * metadata sourced from the `resourceTree` host list (`NodeSystemInfo`).
   *
   * @param name - Application name.
   * @param params - Optional `appNamespace` for multi-namespace installs.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of nodes, each with `osImage`, `operatingSystem`, `architecture`,
   *   `kernelVersion`, `containerRuntimeVersion`, and `kubeletVersion`.
   *
   * @example
   * const nodes = await argocd.applications.nodes('guestbook');
   * nodes.forEach(n => {
   *   console.log(n.name, n.osImage, n.architecture);
   *   // 'node-1' 'Ubuntu 22.04 LTS' 'amd64'
   * });
   */
  async nodes(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdNode[]> {
    const tree = await this.resourceTree(name, params, signal);

    return (tree.hosts ?? []).map((h) => {
      const { name: hostName, systemInfo } = h;
      const sys = systemInfo as Record<string, unknown> | undefined;
      const {
        osImage,
        operatingSystem,
        architecture,
        kernelVersion,
        containerRuntimeVersion,
        kubeletVersion,
      } = sys ?? {};

      return {
        name: hostName as string | undefined,
        osImage: osImage as string | undefined,
        operatingSystem: operatingSystem as string | undefined,
        architecture: architecture as string | undefined,
        kernelVersion: kernelVersion as string | undefined,
        containerRuntimeVersion: containerRuntimeVersion as string | undefined,
        kubeletVersion: kubeletVersion as string | undefined,
        systemInfo: sys,
      };
    });
  }

  /**
   * Returns the current health status of an application without loading the full object.
   * Internally calls {@link get} and extracts `status.health`.
   *
   * @param name - Application name.
   * @param params - Optional: `appNamespace`, `project`, `refresh`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns `{ status, message? }` — status is one of `'Healthy'`, `'Degraded'`,
   *   `'Progressing'`, `'Suspended'`, `'Missing'`, `'Unknown'`.
   *
   * @example
   * const { status, message } = await argocd.applications.health('guestbook');
   * if (status === 'Degraded') {
   *   console.warn('App degraded:', message);
   * }
   */
  async health(
    name: string,
    params: ArgoCdApplicationGetParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationHealth> {
    const app = await this.get(name, params, signal);
    const h = (app.status as Record<string, unknown> | undefined)?.['health'] as
      | Record<string, unknown>
      | undefined;

    return {
      status: (h?.['status'] as string | undefined) ?? 'Unknown',
      message: h?.['message'] as string | undefined,
    };
  }

  /**
   * Builds a read-only operational report from Argo CD application, resource-tree, managed-resource,
   * event, and live-Pod data. Detects mutable images, missing requests/limits, restarts, warning
   * events, drift, and orphaned resources without contacting Kubernetes directly.
   */
  async insights(
    name: string,
    params: ArgoCdApplicationInsightsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationInsights> {
    const { appNamespace, project } = params;
    const [application, resources, tree, events, allocation] = await Promise.all([
      this.get(name, { appNamespace, project }, signal),
      this.managedResources(name, { appNamespace }, signal),
      this.resourceTree(name, { appNamespace }, signal),
      this.events(name, { appNamespace }, signal),
      this.resourceAllocation(name, { appNamespace }, signal),
    ]);

    return buildApplicationInsights({
      name,
      application,
      resources,
      tree,
      events,
      allocation,
      params,
    });
  }

  /** Captures application, desired manifests, live resources, and insights at one point in time. */
  async snapshot(
    name: string,
    params: ArgoCdApplicationSnapshotParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationSnapshot> {
    const { appNamespace, project, revision, sourcePositions, revisions, noCache } = params;
    const [application, insights, manifests, resources] = await Promise.all([
      this.get(name, { appNamespace, project }, signal),
      this.insights(name, params, signal),
      this.manifests(
        name,
        { appNamespace, project, revision, sourcePositions, revisions, noCache },
        signal,
      ),
      this.managedResources(name, { appNamespace }, signal),
    ]);

    return {
      capturedAt: new Date().toISOString(),
      name,
      application,
      insights,
      manifests,
      resources,
    };
  }

  /** Renders desired manifests and performs a server-side dry-run diff. No resources are mutated. */
  async plan(
    name: string,
    params: ArgoCdApplicationSnapshotParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationPlan> {
    const { appNamespace, project, revision, sourcePositions, revisions, noCache } = params;
    const [manifests, insights] = await Promise.all([
      this.manifests(
        name,
        { appNamespace, project, revision, sourcePositions, revisions, noCache },
        signal,
      ),
      this.insights(name, params, signal),
    ]);
    const diff = await this.serverSideDiff(
      name,
      { appNamespace, project, targetManifests: manifests.manifests ?? [] },
      signal,
    );

    return {
      manifests,
      diff,
      insights,
      modifiedResources: (diff.items ?? []).filter((item) => item.modified),
    };
  }

  /**
   * Returns only the managed resources whose live state differs from the normalized target state —
   * i.e. resources that are out of sync. Compares `liveState` vs `normalizedLiveState` strings.
   *
   * @param name - Application name.
   * @param params - Optional filters forwarded to {@link managedResources}: `kind`, `group`, `namespace`, etc.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of out-of-sync resources (empty if fully synced).
   *
   * @example
   * const diffs = await argocd.applications.diff('guestbook');
   * if (diffs.length > 0) {
   *   console.warn('Out of sync:', diffs.map(r => `${r.kind}/${r.name}`));
   * }
   */
  async diff(
    name: string,
    params: ArgoCdManagedResourcesParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdManagedResource[]> {
    const resources = await this.managedResources(name, params, signal);

    return resources.filter(
      (r) => r.liveState && r.normalizedLiveState && r.liveState !== r.normalizedLiveState,
    );
  }

  /**
   * Returns Kubernetes events for an application or a specific resource within it.
   * Useful for diagnosing crash loops, image pull failures, OOM kills, and scheduling issues.
   *
   * @param name - Application name.
   * @param params - Optional filters: `resourceName`, `resourceNamespace`, `resourceUID`, `appNamespace`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Array of events, each with `reason`, `message`, `type` (`'Normal'` | `'Warning'`),
   *   `count`, `firstTimestamp`, `lastTimestamp`, `involvedObject`, and `source`.
   *
   * @example
   * // All events for the app
   * const events = await argocd.applications.events('guestbook');
   * const warnings = events.filter(e => e.type === 'Warning');
   *
   * @example
   * // Events for a specific pod
   * const events = await argocd.applications.events('guestbook', {
   *   resourceName: 'api-abc123',
   *   resourceNamespace: 'default',
   * });
   */
  async events(
    name: string,
    params: ArgoCdEventsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdEvent[]> {
    const res = await this.request<{ items?: ArgoCdEvent[] }>(
      `/api/v1/applications/${encodeURIComponent(name)}/events`,
      params,
      signal,
    );

    return res.items ?? [];
  }

  /**
   * Returns Git commit metadata for a specific revision of an application's source.
   *
   * @param name - Application name.
   * @param revision - Git ref (branch, tag, or commit SHA).
   * @param params - Optional `appNamespace` and `project` for authorization.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns `{ author, date, tags, message }`.
   */
  async revisionMetadata(
    name: string,
    revision: string,
    params: ArgoCdRevisionMetadataParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdRevisionMetadata> {
    return this.request<ArgoCdRevisionMetadata>(
      `/api/v1/applications/${encodeURIComponent(name)}/revisions/${encodeURIComponent(revision)}/metadata`,
      params,
      signal,
    );
  }

  /** Returns Helm chart metadata for one application revision/source. */
  async chartDetails(
    name: string,
    revision: string,
    params: ArgoCdRevisionSourceParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdChartDetails> {
    return this.request<ArgoCdChartDetails>(
      `/api/v1/applications/${encodeURIComponent(name)}/revisions/${encodeURIComponent(revision)}/chartdetails`,
      params,
      signal,
    );
  }

  /** Terminates a running sync operation for an application. */
  async terminateSync(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      signal,
    );
  }

  /** Terminates the currently running application operation using the current Argo CD endpoint. */
  async terminateOperation(
    name: string,
    params: { appNamespace?: string; project?: string } = {},
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    const path = appendQuery(`/api/v1/applications/${encodeURIComponent(name)}/operation`, params);

    return this.deleteRequest<Record<string, never>>(path, signal);
  }

  /**
   * Waits until the application reaches the requested state (health, sync, or operation complete).
   *
   * @param name - Application name.
   * @param body - Wait conditions: `health`, `operation`, `suspended`, `timeout`, `resources`.
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns The application once it reaches the desired state (or the server times out).
   */
  async wait(
    name: string,
    body: ArgoCdApplicationWaitRequest = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/wait`,
      body,
      signal,
    );
  }

  /**
   * Deletes a specific managed Kubernetes resource from an application.
   * Use this to remove individual resources (e.g. a stuck Pod or a Deployment) without syncing.
   *
   * @param name - Application name.
   * @param params - Resource selector: `kind`, `resourceName`, `version` are required by the API.
   * @param signal - Optional `AbortSignal` to cancel the request.
   */
  async deleteResource(
    name: string,
    params: ArgoCdDeleteResourceParams = {},
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    }

    const qs = query.toString();

    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource${qs ? `?${qs}` : ''}`,
      signal,
    );
  }
}
