#!/bin/bash
set -e

[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

INSTALL_DIR="/usr/local/bin"
HOSTS="/etc/hosts"

# Resolve real user home — sudo resets $HOME to /var/root which is wrong
_LOGGED_USER=$(stat -f "%Su" /dev/console 2>/dev/null)
if [ -n "$_LOGGED_USER" ] && [ "$_LOGGED_USER" != "root" ] && [ -d "/Users/$_LOGGED_USER" ]; then
  CONFIG_DIR="/Users/$_LOGGED_USER/.focuslock"
else
  CONFIG_DIR="$HOME/.focuslock"
fi

echo "Installing focuslock..."

# Copy main script
cp "$(dirname "$0")/focuslock" "$INSTALL_DIR/focuslock"
chmod +x "$INSTALL_DIR/focuslock"

# Create config dir + default sites
mkdir -p "$CONFIG_DIR"
if [ ! -f "$CONFIG_DIR/sites" ]; then
  cat > "$CONFIG_DIR/sites" << 'DEFAULTS'
linkedin.com
facebook.com
instagram.com
amazon.in
youtube.com
DEFAULTS
  echo "Created config: $CONFIG_DIR/sites"
fi

# This script runs as root (self-elevates), so the dir + files above are created
# root-owned. The config lives in the USER's home and must be writable by the
# user — the dashboard, the Hammerspoon usage tracker, and `focuslock dictate`
# all run as the user and write here. Hand it back, or those writes fail silently.
if [ -n "$_LOGGED_USER" ] && [ "$_LOGGED_USER" != "root" ]; then
  chown -R "$_LOGGED_USER:staff" "$CONFIG_DIR"
fi

# Add default sites to /etc/hosts if not present
add_host() {
  local domain="$1"
  if ! grep -qE "127\.0\.0\.1[[:space:]]+${domain//./\\.}" "$HOSTS"; then
    printf "127.0.0.1\t%s\n127.0.0.1\twww.%s\n" "$domain" "$domain" >> "$HOSTS"
    echo "Blocked (IPv4): $domain"
  fi
  # IPv6 — required because YouTube/Google resolve over IPv6 and bypass IPv4 entries
  if ! grep -qE "^::1[[:space:]]+${domain//./\\.}" "$HOSTS"; then
    printf "::1\t%s\n::1\twww.%s\n" "$domain" "$domain" >> "$HOSTS"
    echo "Blocked (IPv6): $domain"
  fi
}

while IFS= read -r site; do
  [[ -z "$site" || "$site" == \#* ]] && continue
  add_host "$site"
done < "$CONFIG_DIR/sites"

dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null

# Install reblock daemon — survives reboot, runs at boot + every 60s
"$INSTALL_DIR/focuslock" install-daemon

# Stop Chrome bypassing /etc/hosts via Secure DNS (DoH)
"$INSTALL_DIR/focuslock" disable-chrome-doh

# Per-site usage tracking — user LaunchAgent (NOT root): polls the frontmost
# browser tab every 20s so the dashboard can show real time-on-site per domain.
# Needs the user's GUI session for AppleScript, so install as the logged-in user.
if [ -n "$_LOGGED_USER" ] && [ "$_LOGGED_USER" != "root" ]; then
  sudo -u "$_LOGGED_USER" -H "$INSTALL_DIR/focuslock" install-usage || true
fi

# ── Dashboard ──────────────────────────────────────────────────────────────
DASHBOARD_SRC="$(dirname "$0")/dashboard"
DASHBOARD_DEST="/usr/local/lib/focuslock-dashboard"
AGENT_LABEL="dev.focuslock.dashboard"
AGENT_PLIST="/Users/$_LOGGED_USER/Library/LaunchAgents/${AGENT_LABEL}.plist"
LOGGED_UID=$(id -u "$_LOGGED_USER" 2>/dev/null || echo "")

if [ -d "$DASHBOARD_SRC" ]; then
  echo ""
  echo "Installing focuslock dashboard..."

  # Resolve bun — may live in ~/.bun/bin even when not on root's PATH
  BUN_BIN="/Users/$_LOGGED_USER/.bun/bin/bun"
  if [ ! -f "$BUN_BIN" ]; then
    BUN_BIN=$(sudo -u "$_LOGGED_USER" bash -lc 'command -v bun 2>/dev/null' || true)
  fi

  if [ -z "$BUN_BIN" ]; then
    echo "Warning: bun not found — dashboard skipped. Install bun first: https://bun.sh"
  else
    # Copy fresh dashboard files
    rm -rf "$DASHBOARD_DEST"
    mkdir -p "$DASHBOARD_DEST"
    cp -r "$DASHBOARD_SRC/"* "$DASHBOARD_DEST/"
    chown -R "$_LOGGED_USER:staff" "$DASHBOARD_DEST"

    # Install deps + build as user (not root)
    rm -f /tmp/focuslock-dashboard-setup.XXXXXX.sh 2>/dev/null || true
    SETUP_SCRIPT=$(mktemp /tmp/focuslock-dashboard-setup.XXXXXX)
    cat > "$SETUP_SCRIPT" << SETUP
#!/bin/bash
set -e
cd "$DASHBOARD_DEST"
"$BUN_BIN" install --frozen-lockfile 2>/dev/null || "$BUN_BIN" install
[ -d out ] || "$BUN_BIN" run build
SETUP
    chmod 755 "$SETUP_SCRIPT"
    chown "$_LOGGED_USER" "$SETUP_SCRIPT"
    sudo -u "$_LOGGED_USER" bash "$SETUP_SCRIPT"
    rm -f "$SETUP_SCRIPT"

    # Launcher script — single entry point used by LaunchAgent + subcommand
    cat > /usr/local/bin/focuslock-dashboard << 'LAUNCHER'
#!/bin/bash
exec /usr/local/lib/focuslock-dashboard/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron \
     /usr/local/lib/focuslock-dashboard/out/main/index.js "$@"
LAUNCHER
    chmod +x /usr/local/bin/focuslock-dashboard

    # LaunchAgent plist (user-level — auto-starts on login, restarts on crash)
    mkdir -p "/Users/$_LOGGED_USER/Library/LaunchAgents"
    cat > "$AGENT_PLIST" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>dev.focuslock.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/focuslock-dashboard</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/focuslock-dashboard.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/focuslock-dashboard.err</string>
</dict>
</plist>
PLIST
    chown "$_LOGGED_USER" "$AGENT_PLIST"

    # Load / reload LaunchAgent as user
    if [ -n "$LOGGED_UID" ]; then
      launchctl bootout "gui/$LOGGED_UID/$AGENT_LABEL" 2>/dev/null || true
      sudo -u "$_LOGGED_USER" launchctl bootstrap "gui/$LOGGED_UID" "$AGENT_PLIST"
    fi

    echo "Dashboard installed — menubar icon appears on next login."
    echo "Launch now: focuslock-dashboard &"
  fi
fi

echo ""
echo "focuslock installed."
echo "Run: sudo focuslock allow"
echo ""
echo "Optional — push-to-talk dictation (local whisper, no API, trainable on your voice):"
echo "  focuslock dictate setup          # NOT sudo — builds whisper.cpp + hotkey"
