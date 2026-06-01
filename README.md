# focuslock

> Temporary site blocker for macOS — allow distracting sites for a set time, then auto-reblock.

[![Lint](https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/actions/workflows/lint.yml/badge.svg)](https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/Navibyte-Innovations-Pvt-Ltd/focuslock?include_prereleases)](https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey)
![Shell: bash](https://img.shields.io/badge/shell-bash%203.2%2B-blue)

---

## What it does

focuslock blocks distracting sites via `/etc/hosts`. When you need a break from blocking, run `sudo focuslock allow` — pick which sites and for how long. It auto-reblocks when the timer expires. No app, no subscription, no background service.

```
$ sudo focuslock allow

Which sites to allow?
  1) linkedin.com
  2) facebook.com
  3) instagram.com
  4) amazon.in
  5) youtube.com
  a) All

Choice [e.g. 1 3 or 'a']: 3 5

Allow for how long?
  1) 5 min
  2) 10 min
  3) 30 min
  4) 1 hour
  5) 2 hours

Choice [1-5]: 2

Allowed : instagram.com youtube.com
Reblocks: 14:45
Timer PID: 12345
```

---

## Install

**Quick install (latest release):**
```bash
curl -L https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/releases/latest/download/focuslock-latest.tar.gz | tar -xz
sudo bash install.sh
```

**From source:**
```bash
git clone https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock
cd focuslock
sudo bash install.sh
```

---

## Update

```bash
sudo focuslock update
```

Fetches the latest release from GitHub, downloads it, and re-runs `install.sh` — updates the CLI, the reblock daemon, and the dashboard in one step. No manual steps needed.

---

## Dashboard

focuslock ships a Mac menubar app that shows your coding activity vs distraction patterns side by side.

**What it shows:**
- Today's hour-by-hour heatmap — green = coding, red = distraction, both = you did both
- Last 7 days grid — see your weekly rhythm at a glance
- Pattern analysis — which hours you typically code vs idle (from 30 days of git history)

**Requirements:** [bun](https://bun.sh) must be installed before running `install.sh`.

The dashboard reads:
- `/var/db/focuslock/history.log` — your focuslock allow/block events
- `~/coding-line/*/` — git commit timestamps across your repos

It installs automatically via `install.sh` and auto-starts on login via a LaunchAgent. No extra config needed.

---

## Usage

| Command | Needs sudo | Description |
|---------|-----------|-------------|
| `sudo focuslock allow` | yes | Pick sites + duration, auto-reblocks |
| `sudo focuslock block` | yes | Reblock all sites immediately |
| `sudo focuslock add <domain>` | yes | Add a site to the block list |
| `sudo focuslock remove <domain>` | yes | Remove a site from the block list |
| `focuslock list` | no | Show all sites and current state |
| `focuslock status` | no | Show timer status |
| `focuslock history` | no | Show allow/block history |
| `focuslock stats` | no | Show distraction stats |
| `sudo focuslock update` | yes | Update to latest release |
| `focuslock help` | no | Show help |

---

## Configuration

Sites are stored in `~/.focuslock/sites` — one base domain per line:

```
# ~/.focuslock/sites
linkedin.com
facebook.com
instagram.com
amazon.in
youtube.com
```

- Add a site: `sudo focuslock add reddit.com`
- Remove a site: `sudo focuslock remove amazon.in`
- Or edit the file directly — changes take effect on next `allow`/`block`

---

## How it works

1. **Block** — adds `127.0.0.1 domain.com` entries to `/etc/hosts`, redirecting sites to localhost
2. **Allow** — comments out those entries, flushes OS DNS cache, writes expiry timestamp to `/var/db/focuslock/expires-at`
3. **Auto-reblock** — LaunchDaemon (`dev.focuslock.reblock`) runs `focuslock check` every 60s; reblocks when expiry passes. Survives reboot and sleep.
4. **Chrome** — closes open tabs for blocked domains on reblock to force fresh DNS lookup
5. **Dashboard** — menubar app reads `history.log` + git commit timestamps; shows coding vs distraction heatmap

---

## Requirements

- macOS (uses `dscacheutil`, `mDNSResponder`, `osascript`)
- bash 3.2+ (macOS default)
- sudo access
- [bun](https://bun.sh) — required for dashboard install (`curl -fsSL https://bun.sh/install | bash`)
- Google Chrome (optional — tab closing on reblock)

---

## Uninstall

```bash
cd focuslock
sudo bash uninstall.sh
```

Removes the binary, all `/etc/hosts` entries, and `~/.focuslock/`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT © [Navibyte Innovations Pvt Ltd](https://github.com/Navibyte-Innovations-Pvt-Ltd)
