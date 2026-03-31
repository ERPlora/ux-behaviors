#!/usr/bin/env bash
# Run after push to main: purge CDN cache + copy to local projects
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
DIST="$REPO_DIR/dist/ux-behaviors.min.js"

# 1. Purge jsDelivr cache
echo "Purging jsDelivr cache..."
curl -sf "https://purge.jsdelivr.net/gh/ERPlora/ux-behaviors@main/dist/ux-behaviors.min.js" > /dev/null 2>&1 && \
    echo "  OK — jsDelivr cache purged" || \
    echo "  WARN — jsDelivr purge failed (non-critical)"

# 2. Copy to Hub and Cloud vendor (local dev only)
HUB_VENDOR="$REPO_DIR/../hub/static/js/vendor/ux-behaviors.min.js"
CLOUD_VENDOR="$REPO_DIR/../cloud/static/js/vendor/ux-behaviors.min.js"

if [ -f "$DIST" ]; then
    [ -d "$(dirname "$HUB_VENDOR")" ] && cp "$DIST" "$HUB_VENDOR" && echo "  OK — copied to hub/static/js/vendor/"
    [ -d "$(dirname "$CLOUD_VENDOR")" ] && cp "$DIST" "$CLOUD_VENDOR" && echo "  OK — copied to cloud/static/js/vendor/"
else
    echo "  ERROR — dist/ux-behaviors.min.js not found"
    exit 1
fi

echo "Done. Hub and Cloud need redeploy to go live."
