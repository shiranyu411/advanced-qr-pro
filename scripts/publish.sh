#!/usr/bin/env bash
# Publish Advanced QR Pro to a new GitHub repository.
# Usage:
#   bash scripts-publish.sh [github-username] [repo-name]
set -euo pipefail
USER_NAME="${1:-shiranyu411}"
REPO_NAME="${2:-advanced-qr-pro}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${HOME}/Downloads/${REPO_NAME}"

echo "Source: $SRC"
echo "Dest:   $DEST"
echo "Repo:   ${USER_NAME}/${REPO_NAME}"

if [[ ! -f "$SRC/manifest.json" ]]; then
  echo "manifest.json not found in $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete --exclude '.git' "$SRC/" "$DEST/"
cd "$DEST"

if [[ ! -d .git ]]; then
  git init -b main
  git add -A
  git commit -m "Initial open-source release of Advanced QR Pro v1.2.2"
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login -h github.com"
  exit 1
fi

if gh repo view "${USER_NAME}/${REPO_NAME}" >/dev/null 2>&1; then
  echo "Remote repo already exists: ${USER_NAME}/${REPO_NAME}"
else
  gh repo create "${USER_NAME}/${REPO_NAME}" --public --source=. --remote=origin --description "Chrome MV3 region-select QR code scanner"
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${USER_NAME}/${REPO_NAME}.git"
git push -u origin main
echo "Done: https://github.com/${USER_NAME}/${REPO_NAME}"
