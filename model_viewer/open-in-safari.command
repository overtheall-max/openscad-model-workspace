#!/bin/zsh
set -euo pipefail

VIEWER_DIR=${0:A:h}
exec /usr/bin/python3 "$VIEWER_DIR/app/native_helper.py"
