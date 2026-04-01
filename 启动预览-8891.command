#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
URL="http://127.0.0.1:8891/#hypha01"

if lsof -i TCP:8891 -s TCP:LISTEN >/dev/null 2>&1; then
  open "$URL"
  echo "已检测到 8891 端口服务，已打开：$URL"
  exit 0
fi

cd "$ROOT"
open "$URL"
exec python3 -m http.server 8891 --bind 127.0.0.1
