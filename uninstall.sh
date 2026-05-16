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

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~$REAL_USER")
PLIST="$REAL_HOME/Library/LaunchAgents/com.focuslock.reblock.plist"
if [ -f "$PLIST" ]; then
  sudo -u "$REAL_USER" launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
fi

rm -rf "$CONFIG_DIR"

dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null

echo "focuslock uninstalled."
