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

echo ""
echo "focuslock installed."
echo "Run: sudo focuslock allow"
