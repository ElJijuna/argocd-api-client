import type {
  ArgoCdApplication,
  ArgoCdApplicationGetParams,
  ArgoCdApplicationHealth,
  ArgoCdApplicationList,
  ArgoCdApplicationListParams,
  ArgoCdApplicationLogsParams,
  ArgoCdContainer,
  ArgoCdEvent,
  ArgoCdEventsParams,
  ArgoCdLogEntry,
  ArgoCdManagedResource,
  ArgoCdManagedResourcesList,
  ArgoCdManagedResourcesParams,
  ArgoCdNode,
  ArgoCdPod,
  ArgoCdPodsParams,
  ArgoCdResourceTree,
} from '../domain/application';
import type { BodyRequestFn, EmptyBodyRequestFn, NdJsonRequestFn, RequestFn } from './types';

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

  /** Lists applications, optionally filtered by project, selector, repo, or namespace. */
  async list(
    params: ArgoCdApplicationListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationList> {
    return this.request<ArgoCdApplicationList>('/api/v1/applications', params, signal);
  }

  /** Gets one application by name. */
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

  /** Creates an application. */
  async create(application: ArgoCdApplication, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>('/api/v1/applications', { application }, signal);
  }

  /** Updates an application by name (full replace). */
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

  /** Deletes an application by name. */
  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      signal,
    );
  }

  /** Applies a JSON merge patch to an application. */
  async patch(name: string, patch: unknown, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.patchRequest<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      patch,
      signal,
    );
  }

  /** Starts a sync operation for an application. */
  async sync(
    name: string,
    body: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      body,
      signal,
    );
  }

  /** Rolls back an application to a previous deployment ID. */
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

  /** Fetches buffered pod logs for an application. */
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

  /** Returns the live resource tree for an application. */
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

  /** Returns the managed Kubernetes resources for an application. */
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

  /** Refreshes an application using the normal refresh mode. */
  async refresh(name: string, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.get(name, { refresh: 'normal' }, signal);
  }

  /** Returns the unique container images running across all resources of an application. */
  async images(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<string[]> {
    const tree = await this.resourceTree(name, params, signal);
    const all = (tree.nodes ?? []).flatMap((n) => n.images ?? []);
    return [...new Set(all)];
  }

  /** Returns the live pods for an application, including container specs and status. */
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
          const cs = containerStatuses.find((s) => s['name'] === c['name']) ?? {};
          return {
            name: c['name'] as string,
            image: c['image'] as string,
            ready: cs['ready'] as boolean | undefined,
            restartCount: cs['restartCount'] as number | undefined,
            state: cs['state'] as Record<string, unknown> | undefined,
          };
        };
        return {
          name: manifest.metadata?.name,
          namespace: manifest.metadata?.namespace,
          phase: manifest.status?.phase,
          nodeName: manifest.spec?.nodeName,
          containers: (manifest.spec?.containers ?? []).map(toContainer),
          initContainers: manifest.spec?.initContainers?.map(toContainer),
        };
      });
  }

  /** Returns all containers flattened from all pods for an application. */
  async containers(
    name: string,
    params: ArgoCdPodsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdContainer[]> {
    const pods = await this.pods(name, params, signal);
    return pods.flatMap((pod) => pod.containers.map((c) => ({ ...c, podName: pod.name })));
  }

  /** Returns the Kubernetes nodes hosting this application's pods, with OS and runtime info. */
  async nodes(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdNode[]> {
    const tree = await this.resourceTree(name, params, signal);
    return (tree.hosts ?? []).map((h) => {
      const sys = h['systemInfo'] as Record<string, unknown> | undefined;
      return {
        name: h['name'] as string | undefined,
        osImage: sys?.['osImage'] as string | undefined,
        operatingSystem: sys?.['operatingSystem'] as string | undefined,
        architecture: sys?.['architecture'] as string | undefined,
        kernelVersion: sys?.['kernelVersion'] as string | undefined,
        containerRuntimeVersion: sys?.['containerRuntimeVersion'] as string | undefined,
        kubeletVersion: sys?.['kubeletVersion'] as string | undefined,
        systemInfo: sys,
      };
    });
  }

  /** Returns the current health status of an application. */
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

  /** Returns managed resources whose live state differs from the normalized target state. */
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

  /** Returns Kubernetes events for an application or one of its resources. */
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
}
