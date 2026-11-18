#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_node() {
  if command -v node >/dev/null 2>&1; then
    node "$@"
  elif [[ -x "/Applications/Antigravity.app/Contents/MacOS/Antigravity" ]]; then
    ELECTRON_RUN_AS_NODE=1 "/Applications/Antigravity.app/Contents/MacOS/Antigravity" "$@"
  else
    echo "Error: Could not find Node.js or Antigravity runtime." >&2
    exit 1
  fi
}

run_node "$ROOT_DIR/scripts/build.mjs"
run_node "$ROOT_DIR/scripts/install-antigravity.mjs"
echo "Done! Model Periodic Table plugin is ready in Antigravity and chrome-extension/."
