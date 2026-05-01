#!/usr/bin/env bash
# Verifies that the @socios-ai/auth tag in package.json matches the
# resolved version in package-lock.json.
#
# Why this exists: npm does NOT re-resolve the SHA in package-lock.json
# when only the tag string in package.json changes. A "v0.2.6 -> v0.2.7"
# bump can leave the lockfile pinned to the v0.2.6 SHA, and `npm ci`
# (which Docker uses) honors the locked SHA verbatim. Result: the
# deployed bundle silently ships the OLD version while package.json
# claims the new one. We lost ~1 hour to this on 2026-05-01.
#
# This script catches the drift at PR time, before any deploy.
#
# Convention assumed: the @socios-ai/auth tag is `v<X.Y.Z>` and the
# package's own package.json carries `version: "X.Y.Z"`. We bump both
# in lockstep when releasing.

set -euo pipefail

PKG_JSON="${PKG_JSON:-package.json}"
LOCK_JSON="${LOCK_JSON:-package-lock.json}"

if [[ ! -f "$PKG_JSON" ]] || [[ ! -f "$LOCK_JSON" ]]; then
  echo "verify-auth-pin: missing $PKG_JSON or $LOCK_JSON in $(pwd)" >&2
  exit 1
fi

raw=$(jq -r '.dependencies["@socios-ai/auth"] // empty' "$PKG_JSON")
if [[ -z "$raw" ]]; then
  echo "verify-auth-pin: @socios-ai/auth not in dependencies; nothing to check"
  exit 0
fi

# Accept both `github:Org/repo#vX.Y.Z` and `git+ssh://...#vX.Y.Z`.
tag=$(printf '%s' "$raw" | sed -nE 's|^.*#v?([0-9]+\.[0-9]+\.[0-9]+.*)$|\1|p')
if [[ -z "$tag" ]]; then
  echo "verify-auth-pin: could not parse semver tag from '$raw'" >&2
  exit 1
fi

locked=$(jq -r '.packages["node_modules/@socios-ai/auth"].version // empty' "$LOCK_JSON")
if [[ -z "$locked" ]]; then
  echo "verify-auth-pin: @socios-ai/auth not in lockfile" >&2
  exit 1
fi

if [[ "$tag" != "$locked" ]]; then
  cat >&2 <<EOF
============================================================
LOCKFILE DRIFT DETECTED for @socios-ai/auth
============================================================
package.json tag:       v$tag
package-lock.json:      $locked

Production builds run \`npm ci\` which honors the locked SHA.
Your tag bump in package.json was NOT applied. The deployed
bundle would ship the OLD version.

Fix:
  rm -rf node_modules/@socios-ai package-lock.json
  npm install
  git add package-lock.json
  git commit --amend --no-edit
============================================================
EOF
  exit 1
fi

echo "verify-auth-pin: @socios-ai/auth v$tag matches lockfile ✓"
