# focuslock — CLAUDE.md

## What this is
macOS CLI tool that temporarily unblocks distracting sites in `/etc/hosts`, then auto-reblocks after a user-chosen duration. Interactive: picks sites, picks duration, spawns background timer.

## File map
```
focuslock          main CLI binary — all logic lives here
install.sh         copies binary, seeds config, adds /etc/hosts entries
uninstall.sh       removes binary, removes /etc/hosts entries, removes config
```

## Critical logic — read before touching hosts code

**BLOCKED state** = active line in /etc/hosts:
```
127.0.0.1    instagram.com
```

**ALLOWED state** = commented out:
```
# 127.0.0.1    instagram.com
```

This is counterintuitive. "allow" = add `#`. "block" = remove `#`.

Commenting patterns (macOS BSD sed, NOT GNU):
```bash
# Allow (add # prefix to active block entries):
sed -i '' -E "/^127\.0\.0\.1[[:space:]]+(www\.)?${escaped}/s/^/# /" /etc/hosts

# Block (remove # prefix from commented entries):
sed -i '' -E "s/^#[[:space:]]*(127\.0\.0\.1[[:space:]]+(www\.)?${escaped})/\1/" /etc/hosts
```

Escape dots in domain for sed regex: `escaped="${domain//./\\.}"`

Always flush DNS after any /etc/hosts change:
```bash
dscacheutil -flushcache && killall -HUP mDNSResponder 2>/dev/null
```

## Config
- `~/.focuslock/sites` — one base domain per line, no `www.`, `#` = comment
- `/var/db/focuslock/allowed` — newline list of sites currently allowed (block restores these)
- `/var/db/focuslock/expires-at` — epoch timestamp; daemon re-blocks when `now >= expires-at`
- `/var/db/focuslock/history.log` — append-only allow/block audit trail
- `/Library/LaunchDaemons/dev.focuslock.reblock.plist` — LaunchDaemon, runs `focuslock check` every 60s + at boot

## Timer mechanism
LaunchDaemon (NOT a sleep'ing nohup — that dies on shutdown):
- `allow` writes expiry epoch to `/var/db/focuslock/expires-at`
- LaunchDaemon `dev.focuslock.reblock` runs `focuslock check` every 60s with `RunAtLoad=true`
- `check` reads expiry, calls `cmd_block` if `now >= expiry`
- Survives reboot, sleep, terminal close. `/tmp` was used previously; macOS wipes `/tmp` on boot which left sites permanently allowed — that's why state moved to `/var/db/focuslock`.

## Known gotchas

**Chrome DNS cache**: OS DNS flush (`dscacheutil`) doesn't clear Chrome's internal DNS cache. Chrome caches DNS ~1 min. Fix: `block` closes all Chrome tabs for blocked domains via AppleScript — forces fresh DNS lookup on next visit.

**AppleScript + root**: Running `osascript` as root fails with `-1743` (not authorized to send Apple events). Must run as logged-in user:
```bash
LOGGED_USER=$(stat -f "%Su" /dev/console)
sudo -u "$LOGGED_USER" osascript << 'APPLESCRIPT'
...
APPLESCRIPT
```

**bash 3.2**: macOS ships bash 3.2 (GPL license). No `declare -A` (associative arrays added in 4.0). No `mapfile`/`readarray`. Use while+read loops and case statements instead.

**BSD sed vs GNU sed**: macOS uses BSD sed. `sed -i ''` (empty string required). No `\|` alternation in basic regex — use `-E` for extended regex with `(a|b)` syntax.

**www. variants**: Every domain in config needs both `domain.com` and `www.domain.com` entries in /etc/hosts. `install.sh` and `add` command handle this. Sed patterns use `(www\.)?` to match both.

## Subcommand map
| Command | Needs root | What it does |
|---------|------------|--------------|
| `allow` | yes | prompts site + duration, comments out entries, starts timer |
| `block` | yes | uncomments entries from ALLOWED_FILE (or all), closes Chrome tabs |
| `add <domain>` | yes | appends to sites file, adds /etc/hosts entries |
| `remove <domain>` | yes | removes from sites file and /etc/hosts |
| `list` | no | reads sites file, checks current state in /etc/hosts |
| `status` | no | checks if PID in pidfile is alive |

Root elevation: script self-elevates via `exec sudo "$0" "$@"` at top based on subcommand.

## Development workflow

Test a sed pattern before applying to real hosts file:
```bash
echo "127.0.0.1	instagram.com" | sed -E '/^127\.0\.0\.1[[:space:]]+(www\.)?instagram/s/^/# /'
echo "# 127.0.0.1	instagram.com" | sed -E 's/^#[[:space:]]*(127\.0\.0\.1[[:space:]]+(www\.)?instagram)/\1/'
```

Check current hosts state:
```bash
grep -E "(linkedin|facebook|instagram|amazon|youtube)" /etc/hosts
```

Check timer:
```bash
focuslock status
cat /tmp/focuslock.pid
cat /tmp/focuslock-allowed
```

After editing `focuslock` locally, reinstall:
```bash
sudo cp focuslock /usr/local/bin/focuslock
```

## Dictation subsystem (`focuslock dictate`)
Push-to-talk speech-to-text via local **whisper.cpp**. Separate from the blocker — no API, no network, trainable on the user's accent.

- **Hammerspoon owns** the hotkey + typing (`~/.hammerspoon/focuslock-dictate.lua`, required from `init.lua`). Hold ⌥Space (key-down starts `rec`, key-up `terminate()`s it → exit callback transcribes → `hs.eventtap.keyStrokes`). ⌘Space is Spotlight (taken); ⌥Space normally types a non-breaking space but `hs.hotkey.bind` swallows the event.
- **focuslock owns** build/model/transcribe. `dictate transcribe <wav>` prints plain text to **stdout only** (Hammerspoon types it) — never log to stdout or it gets typed.
- **Runs as the logged-in user, NEVER root** — `dictate` is deliberately absent from the root-elevation `case`. Build, mic (TCC), and keystroke injection all fail or get mis-owned as root.
- **whisper.cpp facts** (verified from README): build `cmake -B build && cmake --build build -j --config Release` (Metal default on Apple Silicon); binary `build/bin/whisper-cli`; model `ggml-<name>.bin` from `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/` (URL confirmed live via HEAD, not from README — README only points at the repo's `models/download-ggml-model.sh <name>` script as the alternative); transcribe flags `-nt -np` (no timestamps, no prints).
- **Training loop**: every clip retained in `~/.focuslock/dictate/clips/` + JSONL `stt.log` (`{ts,audio,raw,corrected,verdict,model}`). `dictate review` fills corrections; `dictate export-dataset <dir>` writes HF audiofolder (`metadata.csv` = `file_name,transcription`).
- Deps installed by `dictate setup`: sox, cmake, git, jq, Hammerspoon (cask). jq required for log/review/export.
- Permissions are manual GUI grants for **Hammerspoon**: Accessibility + Microphone + Input Monitoring.

## Do not
- Hardcode site list anywhere — always read from `~/.focuslock/sites`
- Use `declare -A` or `mapfile` — bash 3.2 incompatible
- Run `osascript` as root — use `sudo -u "$LOGGED_USER"`
- Use GNU sed syntax — macOS uses BSD sed
- Connect to any remote/production host — localhost only
- Remove the `# ` prefix check in block's sed — double-unblocking corrupts hosts file
