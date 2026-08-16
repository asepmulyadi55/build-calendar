#!/usr/bin/env bash
# Runs one render per container under a hard 1 GB cap and records peak RSS two ways:
#   1. host side  - polls `docker stats` and keeps the maximum
#   2. guest side - the render process reads the cgroup counter every 100 ms
# The guest number is the authoritative one; `docker stats --no-stream` costs about a
# second per call, so it under-samples a short render. It is reported because
# P1-US-000 asks for it.
#
# Results are pulled out with `docker cp` rather than a bind mount: on this Windows
# host a -v bind of the project drive silently resolves somewhere else, and a bind
# mount would also add page-cache noise to the memory measurement.

set -uo pipefail
export MSYS_NO_PATHCONV=1 # stop Git Bash rewriting /app/out into a Windows path

IMAGE=${IMAGE:-buildcalendar-spike}
MEM=${MEM:-1g}
REPEAT=${REPEAT:-3} # runs per format, so `docker stats` gets enough samples
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SPIKE_DIR/out"
mkdir -p "$OUT_DIR"

# The docker CLI is a Windows binary here and cannot read Git Bash's /d/... paths.
if command -v cygpath >/dev/null 2>&1; then
  HOST_OUT="$(cygpath -w "$OUT_DIR")"
else
  HOST_OUT="$OUT_DIR"
fi

peak_from_stats() {
  # docker stats prints e.g. "276.4MiB / 1GiB"; keep the first field in MiB.
  awk '
    /GiB/ { gsub(/GiB/,""); printf "%.0f", $1 * 1024; next }
    /MiB/ { gsub(/MiB/,""); printf "%.0f", $1; next }
    /KiB/ { gsub(/KiB/,""); printf "%.0f", $1 / 1024; next }
    { print 0 }'
}

render_one() {
  local id="$1"
  local name="spike-$id-$$"

  echo ""
  echo "──────────────────────────────────────────────"
  echo " $id — docker run -m $MEM"
  echo "──────────────────────────────────────────────"

  docker rm -f "$name" >/dev/null 2>&1

  docker run -d -m "$MEM" -e REPEAT="$REPEAT" --name "$name" "$IMAGE" node src/render.js "$id" >/dev/null || {
    echo "failed to start container"
    return 1
  }

  local peak_mb=0 samples=0
  while [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null)" = "true" ]; do
    local usage mb
    usage=$(docker stats --no-stream --format '{{.MemUsage}}' "$name" 2>/dev/null | awk '{print $1}')
    [ -z "${usage:-}" ] && continue
    mb=$(printf '%s' "$usage" | peak_from_stats)
    if [ -n "$mb" ] && [ "$mb" -gt "$peak_mb" ] 2>/dev/null; then peak_mb=$mb; fi
    samples=$((samples + 1))
  done

  local code oom
  code=$(docker inspect -f '{{.State.ExitCode}}' "$name")
  oom=$(docker inspect -f '{{.State.OOMKilled}}' "$name")

  docker logs "$name"
  docker cp "$name:/app/out/." "$HOST_OUT" >/dev/null 2>&1
  docker rm -f "$name" >/dev/null 2>&1

  echo ""
  echo "  exit code            : $code"
  echo "  OOM killed           : $oom"
  echo "  docker stats samples : $samples"
  echo "  docker stats peak    : ${peak_mb} MiB"

  printf '%s,%s,%s,%s\n' "$id" "$peak_mb" "$code" "$oom" >>"$OUT_DIR/bench.csv"
}

verify_all() {
  local name="spike-verify-$$"
  echo ""
  echo "──────────────────────────────────────────────"
  echo " verify — page size, vector text, image DPI"
  echo "──────────────────────────────────────────────"

  docker rm -f "$name" >/dev/null 2>&1
  docker create --name "$name" "$IMAGE" \
    sh -c 'node src/verify.js && cd /app/out && for f in *.pdf; do pdftoppm -png -r 40 -singlefile "$f" "preview-${f%.pdf}"; done' >/dev/null

  docker cp "$HOST_OUT\." "$name:/app/out" >/dev/null
  docker start -a "$name"
  local code=$?
  docker cp "$name:/app/out/." "$HOST_OUT" >/dev/null 2>&1
  docker rm -f "$name" >/dev/null 2>&1
  return $code
}

IDS=("$@")
if [ ${#IDS[@]} -eq 0 ]; then IDS=(a3 a2); fi

echo "id,docker_stats_peak_mib,exit_code,oom_killed" >"$OUT_DIR/bench.csv"
for id in "${IDS[@]}"; do
  render_one "$id"
done

verify_all

echo ""
echo "summary — out/bench.csv"
cat "$OUT_DIR/bench.csv"
