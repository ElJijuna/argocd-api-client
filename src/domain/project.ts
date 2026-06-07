import type { KubernetesMetadata } from './common';
import type { QueryParams } from '../resources/types';

/** Argo CD project resource. */
export interface ArgoCdProject {
  /** Kubernetes metadata for the project. */
  metadata?: KubernetesMetadata;
  /** Project spec. Kept open because Argo CD versions may add fields. */
  spec?: Record<string, unknown>;
  /** Project status. */
  status?: Record<string, unknown>;
}

/** List response for projects. */
export interface ArgoCdProjectList {
  /** List metadata. */
  metadata?: KubernetesMetadata;
  /** Projects returned by Argo CD. */
  items: ArgoCdProject[];
}

/** Query parameters for listing projects. */
export interface ArgoCdProjectListParams extends QueryParams {
  /** Filter by project name. */
  name?: string;
}
