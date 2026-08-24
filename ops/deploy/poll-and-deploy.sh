#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${LEAVES_APP_DIR:-/opt/leaves/current}"
REMOTE="${LEAVES_DEPLOY_REMOTE:-origin}"
BRANCH="${LEAVES_DEPLOY_BRANCH:-main}"
DEPLOY_SCRIPT="${LEAVES_DEPLOY_SCRIPT:-${APP_DIR}/ops/deploy/deploy.sh}"
LOCK_FILE="${LEAVES_DEPLOY_LOCK:-/tmp/leaves-deploy.lock}"

cd "$APP_DIR"

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"

if ! flock -n 9; then
  printf 'Deployment check skipped because another run is already active.\n'
  exit 0
fi

git fetch --prune "$REMOTE" "+refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}"

current="$(git rev-parse HEAD)"
target="$(git rev-parse "${REMOTE}/${BRANCH}")"

if [ "$current" = "$target" ]; then
  printf 'Leaves is already up to date at %s.\n' "$(git rev-parse --short HEAD)"
  exit 0
fi

printf 'Leaves update detected: %s -> %s\n' \
  "$(git rev-parse --short HEAD)" \
  "$(git rev-parse --short "${REMOTE}/${BRANCH}")"

flock -u 9

set +e
bash "$DEPLOY_SCRIPT"
status="$?"
set -e

if [ "$status" -eq 75 ]; then
  printf 'Deployment skipped because another run is already active.\n'
  exit 0
fi

exit "$status"
