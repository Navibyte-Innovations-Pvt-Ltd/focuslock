#!/bin/bash
set -e

[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.focuslock"
HOSTS="/etc/hosts"

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

# Add default sites to /etc/hosts if not present
add_host() {
  local domain="$1"
  if ! grep -qE "127\.0\.0\.1[[:space:]]+${domain//./\\.}" "$HOSTS"; then
    printf "127.0.0.1\t%s\n127.0.0.1\twww.%s\n" "$domain" "$domain" >> "$HOSTS"
    echo "Blocked: $domain"
  fi
}

while IFS= read -r site; do
  [[ -z "$site" || "$site" == \#* ]] && continue
  add_host "$site"
done < "$CONFIG_DIR/sites"

dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null

# Install LaunchAgent to reblock on login (survives restarts)
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~$REAL_USER")
LAUNCH_AGENTS_DIR="$REAL_HOME/Library/LaunchAgents"
PLIST="$LAUNCH_AGENTS_DIR/com.focuslock.reblock.plist"

mkdir -p "$LAUNCH_AGENTS_DIR"
cat > "$PLIST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.focuslock.reblock</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/focuslock</string>
        <string>block</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$REAL_HOME/.focuslock/focuslock.log</string>
    <key>StandardErrorPath</key>
    <string>$REAL_HOME/.focuslock/focuslock.log</string>
</dict>
</plist>
PLIST_EOF

chown "$REAL_USER" "$PLIST"

# Load it for the current session without requiring re-login
sudo -u "$REAL_USER" launchctl load "$PLIST" 2>/dev/null || true

echo ""
echo "focuslock installed."
echo "LaunchAgent installed — focuslock block will run automatically on login."
echo "Run: sudo focuslock allow"
