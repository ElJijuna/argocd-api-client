export interface ArgoCdCluster {
  server?: string;
  name?: string;
  namespaces?: string[];
  config?: Record<string, unknown>;
  info?: Record<string, unknown>;
  connectionState?: Record<string, unknown>;
}

export interface ArgoCdClusterList {
  items: ArgoCdCluster[];
}
