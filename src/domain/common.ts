export interface KubernetesMetadata {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  resourceVersion?: string;
  uid?: string;
}

export interface EmptyResponse {
  [key: string]: never;
}
