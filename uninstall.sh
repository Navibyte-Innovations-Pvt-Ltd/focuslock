#!/bin/bash
set -e

[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

HOSTS="/etc/hosts"
CONFIG_DIR="$HOME/.focuslock"

echo "Uninstalling focuslock..."

# Restore all blocked sites before removing
if [ -f "$CONFIG_DIR/sites" ]; then
  while IFS= read -r site; do
    [[ -z "$site" || "$site" == \#* ]] && continue
    escaped="${site//./\\.}"
    # Remove both commented and uncommented entries from /etc/hosts
    sed -i '' -E "/^#?[[:space:]]*127\.0\.0\.1[[:space:]]+(www\.)?${escaped}/d" "$HOSTS"
    echo "Removed from hosts: $site"
  done < "$CONFIG_DIR/sites"
fi

rm -f /usr/local/bin/focuslock
rm -f /tmp/focuslock.pid /tmp/focuslock-allowed /tmp/focuslock.log
rm -rf "$CONFIG_DIR"

dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null

echo "focuslock uninstalled."
