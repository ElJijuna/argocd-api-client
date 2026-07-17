import type { QueryParams } from '../resources/types';
import type { KubernetesMetadata } from './common';

/** Argo CD application resource. */
export interface ArgoCdApplication {
  /** Kubernetes metadata for the application. */
  metadata?: KubernetesMetadata;
  /** Application spec. Kept open because Argo CD versions may add fields. */
  spec?: Record<string, unknown>;
  /** Application status. Kept open because Argo CD versions may add fields. */
  status?: Record<string, unknown>;
  /** Current or requested operation. */
  operation?: Record<string, unknown>;
}

/** List response for applications. */
export interface ArgoCdApplicationList {
  /** List metadata. */
  metadata?: KubernetesMetadata;
  /** Applications returned by Argo CD. */
  items: ArgoCdApplication[];
}

/** Query parameters for listing applications. */
export interface ArgoCdApplicationListParams extends QueryParams {
  /** Filter by application name. */
  name?: string;
  /** Request normal or hard refresh while listing. */
  refresh?: 'normal' | 'hard' | string;
  /** Filter by multiple project names. */
  projects?: string[];
  /** Filter by repeated project query params. */
  project?: string[];
  /** Kubernetes resource version. */
  resourceVersion?: string;
  /** Kubernetes label selector. */
  selector?: string;
  /** Filter by source repository URL. */
  repo?: string;
  /** Application namespace for multi-namespace Argo CD installs. */
  appNamespace?: string;
}

/** Query parameters for getting one application. */
export interface ArgoCdApplicationGetParams extends QueryParams {
  /** Application namespace for multi-namespace Argo CD installs. */
  appNamespace?: string;
  /** Project name used for authorization checks. */
  project?: string;
  /** Request normal or hard refresh before returning the application. */
  refresh?: 'normal' | 'hard' | string;
}

/** Query parameters for fetching application logs. */
export interface ArgoCdApplicationLogsParams extends QueryParams {
  /** Pod name to fetch logs from. */
  podName?: string;
  /** Container name within the pod. */
  container?: string;
  /** Namespace of the pod. */
  namespace?: string;
  /** Number of lines to return from the end of the log. */
  tailLines?: number;
  /** Whether to follow the log stream (set false to retrieve buffered logs). */
  follow?: boolean;
  /** Return logs since this Unix timestamp. */
  sinceSeconds?: number;
  /** Filter log lines matching this string. */
  filter?: string;
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
}

/** Query parameters for rendering an application's desired manifests. */
export interface ArgoCdApplicationManifestsParams extends QueryParams {
  /** Render one revision for a single-source application. */
  revision?: string;
  /** Application namespace for multi-namespace Argo CD installations. */
  appNamespace?: string;
  /** Project used for authorization checks. */
  project?: string;
  /** One-based source positions for a multi-source application. */
  sourcePositions?: number[];
  /** Revisions corresponding to `sourcePositions`. */
  revisions?: string[];
  /** Bypass Argo CD's manifest cache. */
  noCache?: boolean;
}

/** Integrity check returned while rendering application manifests. */
export interface ArgoCdManifestIntegrityCheck {
  name?: string;
  problems?: string[];
}

/** Rendered desired manifests and source metadata returned by Argo CD. */
export interface ArgoCdApplicationManifests {
  commands?: string[];
  manifests?: string[];
  namespace?: string;
  revision?: string;
  server?: string;
  sourceType?: string;
  verifyResult?: string;
  sourceIntegrityResult?: { checks?: ArgoCdManifestIntegrityCheck[] };
}

/** Selector shared by live-resource, action, and deep-link endpoints. */
export interface ArgoCdApplicationResourceParams extends QueryParams {
  namespace?: string;
  resourceName?: string;
  version?: string;
  group?: string;
  kind?: string;
  appNamespace?: string;
  project?: string;
}

/** Live Kubernetes manifest returned for one application resource. */
export interface ArgoCdApplicationResourceManifest {
  manifest?: string;
}

/** Parameters for patching one live application resource. */
export interface ArgoCdPatchApplicationResourceParams extends ArgoCdApplicationResourceParams {
  /** Kubernetes patch media type, for example `application/merge-patch+json`. */
  patchType?: string;
}

/** Parameter accepted by an Argo CD resource action. */
export interface ArgoCdResourceActionParameter {
  name?: string;
  value?: string;
}

/** Resource action exposed by Argo CD. */
export interface ArgoCdResourceAction {
  disabled?: boolean;
  displayName?: string;
  iconClass?: string;
  name?: string;
  params?: ArgoCdResourceActionParameter[];
}

/** Available resource actions response. */
export interface ArgoCdResourceActions {
  actions?: ArgoCdResourceAction[];
}

/** Request for the parameter-aware resource action V2 endpoint. */
export interface ArgoCdRunResourceActionRequest {
  action: string;
  namespace?: string;
  resourceName?: string;
  version?: string;
  group?: string;
  kind?: string;
  appNamespace?: string;
  project?: string;
  resourceActionParameters?: ArgoCdResourceActionParameter[];
}

/** Deep link associated with one live application resource. */
export interface ArgoCdResourceLink {
  description?: string;
  iconClass?: string;
  title?: string;
  url?: string;
}

/** Resource deep links response. */
export interface ArgoCdResourceLinks {
  items?: ArgoCdResourceLink[];
}

/** Parameters selecting one source from a multi-source revision. */
export interface ArgoCdRevisionSourceParams extends QueryParams {
  appNamespace?: string;
  project?: string;
  sourceIndex?: number;
  versionId?: number;
}

/** Helm chart metadata returned for an application revision. */
export interface ArgoCdChartDetails {
  description?: string;
  home?: string;
  maintainers?: string[];
}

/** A single log entry returned by the application logs endpoint. */
export interface ArgoCdLogEntry {
  /** Log line content. */
  content?: string;
  /** Log timestamp. */
  timestamp?: string;
  /** Pod that produced this log line. */
  podName?: string;
  /** Container that produced this log line. */
  container?: string;
}

/** A node in the application resource tree. */
export interface ArgoCdResourceNode {
  /** Kubernetes group. */
  group?: string;
  /** Kubernetes version. */
  version?: string;
  /** Kubernetes kind. */
  kind?: string;
  /** Namespace. */
  namespace?: string;
  /** Resource name. */
  name?: string;
  /** Resource UID. */
  uid?: string;
  /** Health status. */
  health?: Record<string, unknown>;
  /** Sync status. */
  status?: string;
  /** Parent references. */
  parentRefs?: Array<Record<string, unknown>>;
  /** Network info. */
  networkingInfo?: Record<string, unknown>;
  /** Images. */
  images?: string[];
  /** Resource version. */
  resourceVersion?: string;
  /** Whether created by app. */
  createdAt?: string;
}

/** Application resource tree returned by the resource-tree endpoint. */
export interface ArgoCdResourceTree {
  /** All nodes in the resource tree. */
  nodes?: ArgoCdResourceNode[];
  /** Orphaned nodes (not owned by the application). */
  orphanedNodes?: ArgoCdResourceNode[];
  /** Host nodes. */
  hosts?: Array<Record<string, unknown>>;
}

/** Query parameters for managed-resources. */
export interface ArgoCdManagedResourcesParams extends QueryParams {
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
  /** Filter by Kubernetes group. */
  group?: string;
  /** Filter by Kubernetes kind. */
  kind?: string;
  /** Filter by namespace. */
  namespace?: string;
  /** Filter by resource name. */
  resourceName?: string;
  /** Filter by version. */
  version?: string;
}

/** A managed Kubernetes resource. */
export interface ArgoCdManagedResource {
  /** Kubernetes group. */
  group?: string;
  /** Kubernetes version. */
  version?: string;
  /** Kubernetes kind. */
  kind?: string;
  /** Namespace. */
  namespace?: string;
  /** Resource name. */
  name?: string;
  /** Live manifest JSON. */
  liveState?: string;
  /** Target manifest JSON. */
  targetState?: string;
  /** Predicted live manifest JSON. */
  predictedLiveState?: string;
  /** Normalised live manifest JSON. */
  normalizedLiveState?: string;
  /** Hook info. */
  hook?: boolean;
  /** Requires pruning. */
  requiresPruning?: boolean;
}

/** Response for the managed-resources endpoint. */
export interface ArgoCdManagedResourcesList {
  /** Managed resources. */
  items?: ArgoCdManagedResource[];
}

/** Health status of an application. */
export interface ArgoCdApplicationHealth {
  /** Argo CD health status string. */
  status: 'Healthy' | 'Degraded' | 'Progressing' | 'Suspended' | 'Missing' | 'Unknown' | string;
  /** Human-readable message explaining the status. */
  message?: string;
}

/** Kubernetes resource quantities exactly as returned by the Pod manifest. */
export type ArgoCdResourceQuantities = Record<string, string>;

/** Resource requests and limits declared for a container or Pod. */
export interface ArgoCdResourceRequirements {
  /** Resources reserved by the Kubernetes scheduler. */
  requests?: ArgoCdResourceQuantities;
  /** Maximum resources the workload may consume. */
  limits?: ArgoCdResourceQuantities;
}

/** CPU, memory, and ephemeral storage normalized for arithmetic. */
export interface ArgoCdNormalizedResources {
  /** CPU in millicores. */
  cpuMillicores: number;
  /** Memory in bytes. */
  memoryBytes: number;
  /** Ephemeral storage in bytes. */
  ephemeralStorageBytes: number;
}

/** Whether every effective container contributing to a resource declares a limit. */
export interface ArgoCdResourceLimitCoverage {
  cpu: boolean;
  memory: boolean;
  ephemeralStorage: boolean;
}

/** Effective scheduler requests and declared limits for one live Pod. */
export interface ArgoCdPodResourceAllocation {
  /** Pod name. */
  name?: string;
  /** Pod namespace. */
  namespace?: string;
  /** Node currently hosting the Pod. */
  nodeName?: string;
  /** Current Pod phase. */
  phase?: string;
  /** Effective request used for scheduling, including init containers and Pod overhead. */
  requests: ArgoCdNormalizedResources;
  /** Effective declared limit, including init containers and Pod overhead. */
  limits: ArgoCdNormalizedResources;
  /** False means the corresponding effective limit is unbounded despite the numeric declared sum. */
  limitsFullySpecified: ArgoCdResourceLimitCoverage;
  /** Raw Pod overhead quantities, when a RuntimeClass added them. */
  overhead?: ArgoCdResourceQuantities;
  /** Raw Pod-level resources. These override container totals when present. */
  podResources?: ArgoCdResourceRequirements;
  /** Regular containers with their raw resource declarations. */
  containers: ArgoCdContainer[];
  /** Init containers with their raw resource declarations. */
  initContainers?: ArgoCdContainer[];
}

/** Aggregated allocation for application Pods scheduled on one node. */
export interface ArgoCdNodeResourceAllocation {
  /** Node name, or undefined for unscheduled Pods. */
  nodeName?: string;
  /** Number of application Pods assigned to this group. */
  podCount: number;
  /** Sum of effective Pod scheduler requests. */
  requests: ArgoCdNormalizedResources;
  /** Sum of effective declared Pod limits. */
  limits: ArgoCdNormalizedResources;
  /** Whether every Pod in this node group declares each limit. */
  limitsFullySpecified: ArgoCdResourceLimitCoverage;
}

/** Resource allocation derivable from an application's live Pods in Argo CD. */
export interface ArgoCdApplicationResourceAllocation {
  /** Number of live Pod manifests returned by Argo CD. */
  podCount: number;
  /** Number of regular containers across those Pods. */
  containerCount: number;
  /** Number of init containers, including restartable sidecars. */
  initContainerCount: number;
  /** Effective allocation per live Pod. */
  pods: ArgoCdPodResourceAllocation[];
  /** Effective allocation grouped by assigned node. */
  nodes: ArgoCdNodeResourceAllocation[];
  /** Sum of effective Pod scheduler requests. */
  requests: ArgoCdNormalizedResources;
  /** Sum of effective declared Pod limits. */
  limits: ArgoCdNormalizedResources;
  /** Whether every live Pod declares each limit. */
  limitsFullySpecified: ArgoCdResourceLimitCoverage;
}

/** Stable warning codes emitted by `applications.insights()`. */
export type ArgoCdApplicationInsightCode =
  | 'IMAGE_LATEST_TAG'
  | 'IMAGE_NOT_PINNED'
  | 'MISSING_CPU_REQUEST'
  | 'MISSING_MEMORY_REQUEST'
  | 'MISSING_CPU_LIMIT'
  | 'MISSING_MEMORY_LIMIT'
  | 'CONTAINER_RESTARTS'
  | 'WARNING_EVENT'
  | 'OUT_OF_SYNC_RESOURCE'
  | 'ORPHANED_RESOURCE';

/** One actionable application observation derived from Argo CD data. */
export interface ArgoCdApplicationInsightWarning {
  code: ArgoCdApplicationInsightCode;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resource?: { kind?: string; namespace?: string; name?: string };
  container?: string;
}

/** Options controlling the locally-computed application insight report. */
export interface ArgoCdApplicationInsightsParams {
  appNamespace?: string;
  project?: string;
  /** Restart count at which a container warning is emitted. Defaults to 1. */
  restartWarningThreshold?: number;
}

/** Consolidated read-only application health, drift, allocation, and risk report. */
export interface ArgoCdApplicationInsights {
  name: string;
  health: string;
  sync: string;
  revision?: string;
  images: string[];
  allocation: ArgoCdApplicationResourceAllocation;
  warnings: ArgoCdApplicationInsightWarning[];
  counts: {
    resources: number;
    orphanedResources: number;
    warningEvents: number;
  };
}

/** A single container within a pod. */
export interface ArgoCdContainer {
  /** Container name. */
  name: string;
  /** Container image reference. */
  image: string;
  /** Whether the container passed its readiness probe. */
  ready?: boolean;
  /** Number of times the container has restarted. */
  restartCount?: number;
  /** Current container state (running, waiting, terminated). */
  state?: Record<string, unknown>;
  /** Raw resource requests and limits from the live Pod manifest. */
  resources?: ArgoCdResourceRequirements;
  /** `Always` identifies a restartable init container (native sidecar). */
  restartPolicy?: string;
  /** Name of the pod this container belongs to — set by containers(). */
  podName?: string;
}

/** A live pod managed by an application. */
export interface ArgoCdPod {
  /** Pod name. */
  name?: string;
  /** Pod namespace. */
  namespace?: string;
  /** Pod phase (Running, Pending, Failed, Succeeded, Unknown). */
  phase?: string;
  /** Name of the node the pod is scheduled on. */
  nodeName?: string;
  /** Pod-level resources, available on clusters with PodLevelResources enabled. */
  resources?: ArgoCdResourceRequirements;
  /** RuntimeClass overhead added to effective requests and limits. */
  overhead?: ArgoCdResourceQuantities;
  /** Regular containers in the pod. */
  containers: ArgoCdContainer[];
  /** Init containers in the pod. */
  initContainers?: ArgoCdContainer[];
}

/** A Kubernetes node hosting application pods, with OS and runtime metadata. */
export interface ArgoCdNode {
  /** Node name. */
  name?: string;
  /** Human-readable OS image string (e.g. "Ubuntu 22.04 LTS"). */
  osImage?: string;
  /** Operating system family (e.g. "linux"). */
  operatingSystem?: string;
  /** CPU architecture (e.g. "amd64", "arm64"). */
  architecture?: string;
  /** Linux kernel version. */
  kernelVersion?: string;
  /** Container runtime and version (e.g. "containerd://1.7.0"). */
  containerRuntimeVersion?: string;
  /** Kubelet version running on the node. */
  kubeletVersion?: string;
  /** Full NodeSystemInfo object from the Kubernetes API. */
  systemInfo?: Record<string, unknown>;
}

/** A Kubernetes event associated with an application or one of its resources. */
export interface ArgoCdEvent {
  /** Short machine-readable reason for the event (e.g. "Pulled", "OOMKilling"). */
  reason?: string;
  /** Human-readable event message. */
  message?: string;
  /** Event type: Normal or Warning. */
  type?: 'Normal' | 'Warning' | string;
  /** Number of times this event has occurred. */
  count?: number;
  /** Timestamp of the first occurrence. */
  firstTimestamp?: string;
  /** Timestamp of the most recent occurrence. */
  lastTimestamp?: string;
  /** The Kubernetes object this event refers to. */
  involvedObject?: { kind?: string; name?: string; namespace?: string; uid?: string };
  /** Component that generated the event. */
  source?: { component?: string; host?: string };
}

/** Query parameters for pods() and containers(). */
export interface ArgoCdPodsParams extends QueryParams {
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
  /** Filter pods by namespace. */
  namespace?: string;
  /** Filter by pod name. */
  resourceName?: string;
}

/** Query parameters for events(). */
export interface ArgoCdEventsParams extends QueryParams {
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
  /** Namespace of the involved resource. */
  resourceNamespace?: string;
  /** Name of the involved resource. */
  resourceName?: string;
  /** UID of the involved resource. */
  resourceUID?: string;
}

/** Git revision metadata returned by the revision-metadata endpoint. */
export interface ArgoCdRevisionMetadata {
  /** Commit author name / email. */
  author?: string;
  /** ISO 8601 commit date. */
  date?: string;
  /** Git tags pointing at this revision. */
  tags?: string[];
  /** Commit message. */
  message?: string;
}

/** Query parameters for revisionMetadata(). */
export interface ArgoCdRevisionMetadataParams extends QueryParams {
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
  /** Project name used for authorization checks. */
  project?: string;
}

/** Request body for wait() — waits until the application reaches a desired state. */
export interface ArgoCdApplicationWaitRequest {
  /** Specific resources to wait for (filters the wait scope). */
  resources?: Array<{ group?: string; kind?: string; name?: string; namespace?: string }>;
  /** Maximum time to wait as a Go duration string (e.g. `"60s"`, `"5m"`). */
  timeout?: string;
  /** Wait until health status is not `Progressing`. */
  health?: boolean;
  /** Wait until no active operation is running. */
  operation?: boolean;
  /** Wait until the app is not suspended. */
  suspended?: boolean;
}

/** Query parameters for deleteResource() — deletes one managed Kubernetes resource. */
export interface ArgoCdDeleteResourceParams extends QueryParams {
  /** API group of the resource (e.g. `apps`, empty for core resources). */
  group?: string;
  /** Kubernetes kind (e.g. `Deployment`, `Pod`). */
  kind?: string;
  /** Namespace of the resource. */
  namespace?: string;
  /** Name of the resource. */
  resourceName?: string;
  /** API version (e.g. `v1`, `apps/v1`). */
  version?: string;
  /** Application namespace for multi-namespace installs. */
  appNamespace?: string;
  /** When true, leave child resources as orphans instead of cascading the delete. */
  orphan?: boolean;
  /** When true, force-delete even if the resource is stuck terminating. */
  force?: boolean;
  /** When true, recursively delete child resources. */
  recurse?: boolean;
}
