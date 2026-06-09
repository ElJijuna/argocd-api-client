import type { KubernetesMetadata } from './common';
import type { QueryParams } from '../resources/types';

/** Argo CD ApplicationSet resource. */
export interface ArgoCdApplicationSet {
  /** Kubernetes metadata. */
  metadata?: KubernetesMetadata;
  /** ApplicationSet spec. Kept open because versions may add fields. */
  spec?: Record<string, unknown>;
  /** ApplicationSet status. */
  status?: Record<string, unknown>;
}

/** List response for ApplicationSets. */
export interface ArgoCdApplicationSetList {
  /** List metadata. */
  metadata?: KubernetesMetadata;
  /** ApplicationSets returned by Argo CD. */
  items: ArgoCdApplicationSet[];
}

/** Query parameters for listing ApplicationSets. */
export interface ArgoCdApplicationSetListParams extends QueryParams {
  /** Filter by project. */
  project?: string[];
  /** Application namespace for multi-namespace installs. */
  appsetNamespace?: string;
}
