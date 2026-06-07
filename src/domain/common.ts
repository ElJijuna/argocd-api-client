/** Common Kubernetes object metadata returned by Argo CD resources. */
export interface KubernetesMetadata {
  /** Resource name. */
  name?: string;
  /** Kubernetes namespace. */
  namespace?: string;
  /** Kubernetes labels. */
  labels?: Record<string, string>;
  /** Kubernetes annotations. */
  annotations?: Record<string, string>;
  /** Kubernetes resource version. */
  resourceVersion?: string;
  /** Kubernetes object UID. */
  uid?: string;
}

/** Empty response body used by delete-like endpoints. */
export interface EmptyResponse {
  [key: string]: never;
}
