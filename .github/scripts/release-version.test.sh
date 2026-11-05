#!/usr/bin/env bash
# Checks that release-version.sh accepts only release branches that match package.json.
set -uo pipefail

SCRIPT="$(dirname "$0")/release-version.sh"
VERSION=$(node -p "require('./package.json').version")
failures=0

expect() {
  local description="$1" expected_status="$2" branch="$3"
  SKIP_TAG_CHECK=true "$SCRIPT" "$branch" > /dev/null 2>&1
  local status=$?

  if [[ "$status" -ne "$expected_status" ]]; then
    echo "FAIL: $description (branch \"$branch\", exit $status)"
    failures=$((failures + 1))
  else
    echo "ok: $description"
  fi
}

expect 'accepts the version in package.json' 0 "release/$VERSION"
expect 'refuses a branch that is not a release' 1 'feature/new-section'
expect 'refuses a version that is not semver' 1 'release/1.0'
expect 'refuses a version different from package.json' 1 'release/99.0.0'

exit "$failures"
