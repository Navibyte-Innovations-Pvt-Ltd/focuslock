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

## Usage

| Command | Needs sudo | Description |
|---------|-----------|-------------|
| `sudo focuslock allow` | yes | Pick sites + duration, auto-reblocks |
| `sudo focuslock block` | yes | Reblock all sites immediately |
| `sudo focuslock add <domain>` | yes | Add a site to the block list |
| `sudo focuslock remove <domain>` | yes | Remove a site from the block list |
| `focuslock list` | no | Show all sites and current state |
| `focuslock status` | no | Show timer status |
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
2. **Allow** — comments out those entries, flushes OS DNS cache
3. **Auto-reblock** — spawns a `nohup` background timer; runs `block` when it expires
4. **Chrome** — closes open tabs for blocked domains on reblock to clear browser DNS cache

---

## Requirements

- macOS (uses `dscacheutil`, `mDNSResponder`, `osascript`)
- bash 3.2+ (macOS default)
- Google Chrome (optional — tab closing on reblock)
- sudo access

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
