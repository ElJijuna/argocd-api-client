import type {
  ArgoCdNormalizedResources,
  ArgoCdPod,
  ArgoCdPodResourceAllocation,
  ArgoCdResourceQuantities,
  ArgoCdResourceLimitCoverage,
  ArgoCdResourceRequirements,
} from '../domain/application';

const ZERO = (): ArgoCdNormalizedResources => ({
  cpuMillicores: 0,
  memoryBytes: 0,
  ephemeralStorageBytes: 0,
});
const DECIMAL_MULTIPLIERS: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  '': 1,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};
const BINARY_MULTIPLIERS: Record<string, number> = {
  Ki: 2 ** 10,
  Mi: 2 ** 20,
  Gi: 2 ** 30,
  Ti: 2 ** 40,
  Pi: 2 ** 50,
  Ei: 2 ** 60,
};

function parseQuantity(value: string): number {
  const match =
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(Ki|Mi|Gi|Ti|Pi|Ei|n|u|m|k|K|M|G|T|P|E)?$/.exec(
      value,
    );

  if (!match) {
    return 0;
  }

  const [, number, suffix = ''] = match;
  const multiplier = (BINARY_MULTIPLIERS[suffix] ?? DECIMAL_MULTIPLIERS[suffix]) as number;

  return Number(number) * multiplier;
}

function normalize(quantities: ArgoCdResourceQuantities | undefined): ArgoCdNormalizedResources {
  return {
    cpuMillicores: parseQuantity(quantities?.['cpu'] ?? '0') * 1000,
    memoryBytes: parseQuantity(quantities?.['memory'] ?? '0'),
    ephemeralStorageBytes: parseQuantity(quantities?.['ephemeral-storage'] ?? '0'),
  };
}

function add(
  left: ArgoCdNormalizedResources,
  right: ArgoCdNormalizedResources,
): ArgoCdNormalizedResources {
  return {
    cpuMillicores: left.cpuMillicores + right.cpuMillicores,
    memoryBytes: left.memoryBytes + right.memoryBytes,
    ephemeralStorageBytes: left.ephemeralStorageBytes + right.ephemeralStorageBytes,
  };
}

function maximum(
  left: ArgoCdNormalizedResources,
  right: ArgoCdNormalizedResources,
): ArgoCdNormalizedResources {
  return {
    cpuMillicores: Math.max(left.cpuMillicores, right.cpuMillicores),
    memoryBytes: Math.max(left.memoryBytes, right.memoryBytes),
    ephemeralStorageBytes: Math.max(left.ephemeralStorageBytes, right.ephemeralStorageBytes),
  };
}

function resourcesFor(
  requirements: ArgoCdResourceRequirements | undefined,
  type: 'requests' | 'limits',
): ArgoCdNormalizedResources {
  return normalize(requirements?.[type]);
}

function overrideWithPodResources(
  calculated: ArgoCdNormalizedResources,
  requirements: ArgoCdResourceRequirements | undefined,
  type: 'requests' | 'limits',
): ArgoCdNormalizedResources {
  const quantities = requirements?.[type];
  const explicit = normalize(quantities);

  return {
    cpuMillicores:
      quantities?.['cpu'] === undefined ? calculated.cpuMillicores : explicit.cpuMillicores,
    memoryBytes:
      quantities?.['memory'] === undefined ? calculated.memoryBytes : explicit.memoryBytes,
    ephemeralStorageBytes:
      quantities?.['ephemeral-storage'] === undefined
        ? calculated.ephemeralStorageBytes
        : explicit.ephemeralStorageBytes,
  };
}

function effectiveForPod(pod: ArgoCdPod, type: 'requests' | 'limits'): ArgoCdNormalizedResources {
  const applicationContainers = pod.containers.reduce(
    (total, container) => add(total, resourcesFor(container.resources, type)),
    ZERO(),
  );

  let runningSidecars = ZERO();
  let maximumInit = ZERO();

  for (const container of pod.initContainers ?? []) {
    const resources = resourcesFor(container.resources, type);

    if (container.restartPolicy === 'Always') {
      runningSidecars = add(runningSidecars, resources);
      maximumInit = maximum(maximumInit, runningSidecars);
    } else {
      maximumInit = maximum(maximumInit, add(runningSidecars, resources));
    }
  }

  const runningContainers = add(applicationContainers, runningSidecars);
  const containers = maximum(runningContainers, maximumInit);
  const podLevel = overrideWithPodResources(containers, pod.resources, type);

  return add(podLevel, normalize(pod.overhead));
}

function limitCoverageForPod(pod: ArgoCdPod): ArgoCdResourceLimitCoverage {
  const allContainers = [...pod.containers, ...(pod.initContainers ?? [])];
  const isCovered = (resource: string): boolean => {
    if (pod.resources?.limits?.[resource] !== undefined) {
      return true;
    }

    return (
      allContainers.length > 0 &&
      allContainers.every((container) => container.resources?.limits?.[resource] !== undefined)
    );
  };

  return {
    cpu: isCovered('cpu'),
    memory: isCovered('memory'),
    ephemeralStorage: isCovered('ephemeral-storage'),
  };
}

export function calculatePodResourceAllocation(pod: ArgoCdPod): ArgoCdPodResourceAllocation {
  return {
    name: pod.name,
    namespace: pod.namespace,
    nodeName: pod.nodeName,
    phase: pod.phase,
    requests: effectiveForPod(pod, 'requests'),
    limits: effectiveForPod(pod, 'limits'),
    limitsFullySpecified: limitCoverageForPod(pod),
    overhead: pod.overhead,
    podResources: pod.resources,
    containers: pod.containers,
    initContainers: pod.initContainers,
  };
}

export function allLimitsCovered(
  allocations: Iterable<ArgoCdPodResourceAllocation>,
): ArgoCdResourceLimitCoverage {
  const values = [...allocations];

  return {
    cpu: values.length > 0 && values.every((allocation) => allocation.limitsFullySpecified.cpu),
    memory:
      values.length > 0 && values.every((allocation) => allocation.limitsFullySpecified.memory),
    ephemeralStorage:
      values.length > 0 &&
      values.every((allocation) => allocation.limitsFullySpecified.ephemeralStorage),
  };
}

export function sumNormalizedResources(
  resources: Iterable<ArgoCdNormalizedResources>,
): ArgoCdNormalizedResources {
  let total = ZERO();

  for (const resource of resources) {
    total = add(total, resource);
  }

  return total;
}
