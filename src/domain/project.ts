import type { KubernetesMetadata } from './common';
import type { QueryParams } from '../resources/types';

export interface ArgoCdProject {
  metadata?: KubernetesMetadata;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
}

export interface ArgoCdProjectList {
  metadata?: KubernetesMetadata;
  items: ArgoCdProject[];
}

export interface ArgoCdProjectListParams extends QueryParams {
  name?: string;
}
