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
