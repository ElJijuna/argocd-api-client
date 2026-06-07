/** Argo CD managed cluster. */
export interface ArgoCdCluster {
  /** Kubernetes API server URL. */
  server?: string;
  /** Cluster display name. */
  name?: string;
  /** Namespaces managed by Argo CD on this cluster. */
  namespaces?: string[];
  /** Cluster connection config. */
  config?: Record<string, unknown>;
  /** Cluster info returned by Argo CD. */
  info?: Record<string, unknown>;
  /** Cluster connection state. */
  connectionState?: Record<string, unknown>;
}

/** List response for clusters. */
export interface ArgoCdClusterList {
  /** Clusters returned by Argo CD. */
  items: ArgoCdCluster[];
}
