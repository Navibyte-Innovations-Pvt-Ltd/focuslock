#!/bin/bash
# Deploy the per-site usage tracker + dashboard changes to the live install.
# Run from the repo root:  bash scratch-deploy-usage.sh
set -e
REPO="/Users/webnaresh/coding-line/focuslock"

echo "1/4  Updating focuslock binary (sudo)…"
sudo cp "$REPO/focuslock" /usr/local/bin/focuslock
sudo chmod +x /usr/local/bin/focuslock

echo "2/4  Redeploying rebuilt dashboard (sudo)…"
sudo rsync -a --delete "$REPO/dashboard/out/" /usr/local/lib/focuslock-dashboard/out/
sudo chown -R "$(whoami):staff" /usr/local/lib/focuslock-dashboard/out

echo "3/4  Reloading dashboard agent…"
launchctl bootout "gui/$(id -u)/dev.focuslock.dashboard" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/dev.focuslock.dashboard.plist"

echo "4/4  Starting usage tracker…"
/usr/local/bin/focuslock install-usage

echo
echo "Now grant Automation: open YouTube in Chrome, focus it, then run:"
echo "    focuslock track-tick"
echo "Click OK on the macOS prompt. Verify it logged:"
echo "    cat ~/.focuslock/usage.log"
