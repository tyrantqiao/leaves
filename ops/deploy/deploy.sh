#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

APP_DIR="${LEAVES_APP_DIR:-/opt/leaves/current}"
REMOTE="${LEAVES_DEPLOY_REMOTE:-origin}"
BRANCH="${LEAVES_DEPLOY_BRANCH:-main}"
PM2_APP="${LEAVES_PM2_APP:-leaves}"
DATA_DIR="${LEAVES_DATA_DIR:-/opt/leaves/shared/data}"
HEALTH_URL="${LEAVES_HEALTH_URL:-http://127.0.0.1:4173/}"
LOCK_FILE="${LEAVES_DEPLOY_LOCK:-/tmp/leaves-deploy.lock}"
GIT_HTTP_VERSION="${LEAVES_GIT_HTTP_VERSION:-HTTP/1.1}"
GIT_FETCH_ATTEMPTS="${LEAVES_GIT_FETCH_ATTEMPTS:-5}"
GIT_FETCH_RETRY_DELAY="${LEAVES_GIT_FETCH_RETRY_DELAY:-5}"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 127
  fi
}

git_fetch_branch() {
  refspec="+refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}"
  attempt=1

  while [ "$attempt" -le "$GIT_FETCH_ATTEMPTS" ]; do
    if git -c "http.version=${GIT_HTTP_VERSION}" fetch --prune "$REMOTE" "$refspec"; then
      return 0
    fi

    status="$?"
    if [ "$attempt" -ge "$GIT_FETCH_ATTEMPTS" ]; then
      log "Git fetch failed after ${GIT_FETCH_ATTEMPTS} attempts"
      return "$status"
    fi

    log "Git fetch failed on attempt ${attempt}/${GIT_FETCH_ATTEMPTS}; retrying in ${GIT_FETCH_RETRY_DELAY}s"
    sleep "$GIT_FETCH_RETRY_DELAY"
    attempt=$((attempt + 1))
  done
}

deploy() {
  require_command git
  require_command npm
  require_command pm2
  require_command curl

  mkdir -p "$DATA_DIR"

  cd "$APP_DIR"

  if [ "$(git rev-parse --is-inside-work-tree)" != "true" ]; then
    printf 'Not a git repository: %s\n' "$APP_DIR" >&2
    exit 2
  fi

  current_branch="$(git branch --show-current)"
  if [ "$current_branch" != "$BRANCH" ]; then
    printf 'Refusing to deploy branch %s while checkout is on %s\n' "$BRANCH" "${current_branch:-detached HEAD}" >&2
    exit 4
  fi

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    git status --short --untracked-files=no >&2
    printf 'Refusing to deploy with tracked local changes in %s\n' "$APP_DIR" >&2
    exit 3
  fi

  log "Fetching ${REMOTE}/${BRANCH}"
  git_fetch_branch

  local_ref="${REMOTE}/${BRANCH}"
  before="$(git rev-parse --short HEAD)"
  target="$(git rev-parse --short "$local_ref")"

  log "Merging ${local_ref}: ${before} -> ${target}"
  git merge --ff-only "$local_ref"

  after="$(git rev-parse --short HEAD)"

  log "Installing production dependencies"
  npm ci --omit=dev

  export NODE_ENV="${NODE_ENV:-production}"
  export LEAVES_DATA_DIR="$DATA_DIR"

  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    log "Restarting PM2 app: ${PM2_APP}"
    pm2 restart "$PM2_APP" --update-env
  else
    log "Starting PM2 app from ecosystem.config.cjs: ${PM2_APP}"
    pm2 start ecosystem.config.cjs --only "$PM2_APP"
  fi

  pm2 save

  log "Checking health URL: ${HEALTH_URL}"
  curl -fsS --retry 10 --retry-delay 1 --retry-connrefused "$HEALTH_URL" >/dev/null

  log "Deployment completed: ${before} -> ${after}"
}

mkdir -p "$(dirname "$LOCK_FILE")"
require_command flock

(
  if ! flock -n 9; then
    printf 'Another Leaves deployment is already running.\n' >&2
    exit 75
  fi

  deploy
) 9>"$LOCK_FILE"
