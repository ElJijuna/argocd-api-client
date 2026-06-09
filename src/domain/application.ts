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
