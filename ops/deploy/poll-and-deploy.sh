#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${LEAVES_APP_DIR:-/opt/leaves/current}"
REMOTE="${LEAVES_DEPLOY_REMOTE:-origin}"
BRANCH="${LEAVES_DEPLOY_BRANCH:-main}"
DEPLOY_SCRIPT="${LEAVES_DEPLOY_SCRIPT:-${APP_DIR}/ops/deploy/deploy.sh}"
LOCK_FILE="${LEAVES_DEPLOY_LOCK:-/tmp/leaves-deploy.lock}"
GIT_HTTP_VERSION="${LEAVES_GIT_HTTP_VERSION:-HTTP/1.1}"
GIT_FETCH_ATTEMPTS="${LEAVES_GIT_FETCH_ATTEMPTS:-5}"
GIT_FETCH_RETRY_DELAY="${LEAVES_GIT_FETCH_RETRY_DELAY:-5}"

git_fetch_branch() {
  refspec="+refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}"
  attempt=1

  while [ "$attempt" -le "$GIT_FETCH_ATTEMPTS" ]; do
    if git -c "http.version=${GIT_HTTP_VERSION}" fetch --prune "$REMOTE" "$refspec"; then
      return 0
    fi

    status="$?"
    if [ "$attempt" -ge "$GIT_FETCH_ATTEMPTS" ]; then
      printf 'Git fetch failed after %s attempts.\n' "$GIT_FETCH_ATTEMPTS" >&2
      return "$status"
    fi

    printf 'Git fetch failed on attempt %s/%s; retrying in %ss.\n' "$attempt" "$GIT_FETCH_ATTEMPTS" "$GIT_FETCH_RETRY_DELAY" >&2
    sleep "$GIT_FETCH_RETRY_DELAY"
    attempt=$((attempt + 1))
  done
}

cd "$APP_DIR"

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"

if ! flock -n 9; then
  printf 'Deployment check skipped because another run is already active.\n'
  exit 0
fi

git_fetch_branch

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
