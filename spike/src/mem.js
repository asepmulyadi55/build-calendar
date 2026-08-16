// Container-level memory sampler. Reads the cgroup counter from inside the container,
// which includes Chromium's child processes. Cross-checks the host-side `docker stats`
// number that bench.sh records.

import { readFileSync, existsSync } from 'node:fs';

const V2_CURRENT = '/sys/fs/cgroup/memory.current';
const V2_PEAK = '/sys/fs/cgroup/memory.peak';
const V2_STAT = '/sys/fs/cgroup/memory.stat';
const V1_CURRENT = '/sys/fs/cgroup/memory/memory.usage_in_bytes';
const V1_PEAK = '/sys/fs/cgroup/memory/memory.max_usage_in_bytes';

function readNum(path) {
  try {
    return Number(readFileSync(path, 'utf8').trim());
  } catch {
    return null;
  }
}

// docker stats reports memory.current minus inactive_file, so subtract it to compare like for like.
function inactiveFile() {
  try {
    const stat = readFileSync(V2_STAT, 'utf8');
    const m = stat.match(/^inactive_file (\d+)$/m);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

export function currentBytes() {
  if (existsSync(V2_CURRENT)) {
    const cur = readNum(V2_CURRENT);
    return cur === null ? null : cur - inactiveFile();
  }
  return readNum(V1_CURRENT);
}

export function kernelPeakBytes() {
  return readNum(V2_PEAK) ?? readNum(V1_PEAK);
}

export function startSampler(intervalMs = 100) {
  let peak = 0;
  const tick = () => {
    const cur = currentBytes();
    if (cur !== null && cur > peak) peak = cur;
  };
  tick();
  const handle = setInterval(tick, intervalMs);
  handle.unref?.();
  return {
    mark: tick,
    stop() {
      tick();
      clearInterval(handle);
      return { sampledPeakBytes: peak, kernelPeakBytes: kernelPeakBytes() };
    },
  };
}

export const mb = (bytes) => (bytes == null ? null : Math.round(bytes / 1024 / 1024));
