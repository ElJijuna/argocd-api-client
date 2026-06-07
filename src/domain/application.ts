import type { QueryParams } from '../resources/types';
import type { KubernetesMetadata } from './common';

export interface ArgoCdApplication {
  metadata?: KubernetesMetadata;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  operation?: Record<string, unknown>;
}

export interface ArgoCdApplicationList {
  metadata?: KubernetesMetadata;
  items: ArgoCdApplication[];
}

export interface ArgoCdApplicationListParams extends QueryParams {
  name?: string;
  refresh?: 'normal' | 'hard' | string;
  projects?: string[];
  project?: string[];
  resourceVersion?: string;
  selector?: string;
  repo?: string;
  appNamespace?: string;
}

export interface ArgoCdApplicationGetParams extends QueryParams {
  appNamespace?: string;
  project?: string;
  refresh?: 'normal' | 'hard' | string;
}
