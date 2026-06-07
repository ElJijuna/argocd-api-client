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
