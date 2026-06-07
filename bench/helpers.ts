/** Runs a synchronous benchmark and logs ops/sec. */
export function runBench(label: string, fn: () => void, iterations = 100_000): void {
  const warmup = Math.floor(iterations / 10);
  for (let i = 0; i < warmup; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = performance.now() - start;
  const opsPerSec = Math.round(iterations / (ms / 1000));

  console.log(
    `  ${label}: ${opsPerSec.toLocaleString()} ops/sec  (${ms.toFixed(1)} ms / ${iterations.toLocaleString()} iters)`,
  );
}

/** Runs an async benchmark sequentially and logs ops/sec. */
export async function runBenchAsync(
  label: string,
  fn: () => Promise<unknown>,
  iterations = 1_000,
): Promise<void> {
  const warmup = Math.floor(iterations / 10);
  for (let i = 0; i < warmup; i++) await fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) await fn();
  const ms = performance.now() - start;
  const opsPerSec = Math.round(iterations / (ms / 1000));

  console.log(
    `  ${label}: ${opsPerSec.toLocaleString()} ops/sec  (${ms.toFixed(1)} ms / ${iterations.toLocaleString()} iters)`,
  );
}
