# focuslock — Project Rules

## What this is
macOS bash tool that temporarily allows blocked distracting sites, then auto-reblocks after a chosen duration. Blocks via `/etc/hosts` + flushes OS/Chrome DNS.

## File map
- `focuslock` — single CLI binary with subcommands (allow / block / add / remove / list / status)
- `install.sh` — copies binary, seeds `~/.focuslock/sites`, adds /etc/hosts entries
- `uninstall.sh` — removes binary, cleans /etc/hosts entries, removes config

## Config
- `~/.focuslock/sites` — one base domain per line (no `www.`), comments with `#`
- `/etc/hosts` — blocking entries added as `127.0.0.1 domain` + `127.0.0.1 www.domain`
- `/tmp/focuslock.pid` — background timer PID
- `/tmp/focuslock-allowed` — sites currently allowed (used by block to know what to restore)

## Constraints
- macOS only — uses `dscacheutil`, `mDNSResponder`, `osascript`, `stat -f "%Su"`
- bash 3.2 (macOS default) — NO `mapfile`, NO `declare -A` associative arrays
- All `/etc/hosts` edits need root — script self-elevates via `exec sudo "$0" "$@"`
- Chrome tab closing runs as logged-in user (not root) via `sudo -u "$LOGGED_USER" osascript`
- `sed -i ''` (macOS BSD sed) — not GNU sed

## Patterns
- Escape dots in domains for sed: `${domain//./\\.}`
- Comment a host entry (allow): `sed -i '' -E "/^127\.0\.0\.1.../s/^/# /"`
- Uncomment a host entry (block): `sed -i '' -E "s/^#[[:space:]]*(127\.0\.0\.1...)/\1/"`
- Always `dscacheutil -flushcache && killall -HUP mDNSResponder` after hosts changes

## Do not
- Hardcode site list — read from `~/.focuslock/sites`
- Use `declare -A` — bash 3.2 incompatible
- Touch production/remote hosts — localhost only
