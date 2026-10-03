#!/usr/bin/env bash
# Self-deploy poller for the DigitalOcean Droplet (same pattern as the
# Urbanation app).
#
# Run every 2 minutes by cube-self-deploy.timer. If origin/main has new
# commits, it pulls them, builds a new image (the build runs the tests),
# and restarts the container. If the container is not running, it starts it.
#
# Safety:
#   * The build runs BEFORE the restart. A failed build or a failed test
#     leaves the old version serving.
#   * The checkout is deploy-only: this script uses `git reset --hard`.
#     Never edit code on the Droplet.
#   * flock stops two runs from overlapping.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/cube/app}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_PROJECT="${DEPLOY_PROJECT:-cube_prod}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log() { echo "$(date '+%Y-%m-%dT%H:%M:%S%z') [self-deploy] $*"; }

if command -v flock > /dev/null 2>&1; then
  exec 9>"/tmp/cube-self-deploy.lock"
  if ! flock -n 9; then
    log "another run is in progress; skipping"
    exit 0
  fi
fi

cd "$REPO_DIR"
compose() { docker compose -p "$DEPLOY_PROJECT" -f docker-compose.prod.yml "$@"; }

git fetch --quiet origin "$DEPLOY_BRANCH"
target=$(git rev-parse "origin/${DEPLOY_BRANCH}")
current=$(git rev-parse HEAD)

running=false
if compose ps --status running --services 2>/dev/null | grep -qx "web"; then
  running=true
fi

if [ "$target" = "$current" ] && [ "$running" = true ]; then
  exit 0   # nothing to do, the usual case
fi

if [ "$target" != "$current" ]; then
  log "deploying ${current:0:9} -> ${target:0:9} (origin/${DEPLOY_BRANCH})"
  git reset --hard "$target" --quiet
else
  log "container not running; starting it at ${current:0:9}"
fi

# Build first: a failed build or test stops here, and the old version keeps serving.
compose build --quiet web
compose up -d

deadline=$(( SECONDS + HEALTH_TIMEOUT ))
until curl -fsS "$HEALTH_URL" 2>/dev/null | grep -q '^ok'; do
  if (( SECONDS >= deadline )); then
    log "ERROR: ${target:0:9} did not answer on ${HEALTH_URL} within ${HEALTH_TIMEOUT}s"
    compose logs --no-color --tail 40 web || true
    exit 1
  fi
  sleep 2
done

log "deployed ${target:0:9}; app healthy"
docker image prune -f > /dev/null 2>&1 || true
