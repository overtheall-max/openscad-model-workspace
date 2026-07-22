#!/bin/zsh
set -euo pipefail

VIEWER_APP_DIR=${0:A:h}
exec /usr/bin/python3 "$VIEWER_APP_DIR/native_helper.py"
