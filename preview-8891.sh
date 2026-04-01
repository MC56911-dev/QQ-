#!/usr/bin/env bash
# 统一预览入口：在仓库根目录启动静态服务（8891）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
echo "Serving: $ROOT"
echo "Open:    http://127.0.0.1:8891/"
echo "Examples:"
echo "  http://127.0.0.1:8891/#hypha01"
echo "  http://127.0.0.1:8891/#hypha3d"
echo "  http://127.0.0.1:8891/#sketch"
echo "Press Ctrl+C to stop."
exec python3 -m http.server 8891 --bind 127.0.0.1
