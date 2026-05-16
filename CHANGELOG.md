# Changelog

All notable changes to focuslock are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `sudo focuslock update` subcommand — fetches the latest GitHub release tag, downloads its tarball, and runs the bundled `install.sh`. One command upgrades the binary, daemon, and Chrome policy in place.

### Fixed
- Self-healing: every privileged command (`allow`, `block`, `add`, daemon `check`) now runs `repair_bad_entries` which strips any `/etc/hosts` line whose host field contains URL chars (`://`, `/`, `:port`, `?`), plus the same cleanup on the sites file. Heals existing installs damaged by the old buggy `add` without user intervention.
- `focuslock add <url>` silently wrote a junk `/etc/hosts` line for inputs like `https://www.reddit.com` because only the `www.` prefix was stripped — protocol, paths, and ports leaked into the hosts entry and never matched any DNS lookup, so the site stayed reachable. Now sanitizes input (strips `http(s)://`, `www.`, path, port, query) before adding. `remove` accepts both sanitized and original raw form to clean up legacy bad entries.
- LaunchDaemon ran with empty `$HOME`, making `CONFIG_DIR` resolve to `/.focuslock` on the read-only root volume and spamming `mkdir: Read-only file system` errors in the daemon log. Now derives a real home (via `/dev/console` console user) when `$HOME` is missing.
- Chrome's Secure DNS (DNS-over-HTTPS) bypassed `/etc/hosts`, letting YouTube/Google load despite the host file blocks. Install now writes a managed Chrome policy (`DnsOverHttpsMode=off`, `BuiltInDnsClientEnabled=false`) so Chrome uses the OS resolver.
- YouTube/Google etc. were not actually blocked because they resolve over IPv6 and `/etc/hosts` had only `127.0.0.1` entries — IPv6 lookup returned the real address. Now adds matching `::1` entries; allow/block sed patterns cover both protocols; auto-migration on every privileged command for existing installs.

### Added
- `sudo focuslock disable-chrome-doh` subcommand — writes the Chrome enterprise policy that forces Chrome through the OS DNS resolver.
- `allow` prompt now shows today's total allowed minutes + per-site last-allow timestamp (12h format) and duration, sourced from `/var/db/focuslock/history.log` — gives user context before re-allowing

---

## [1.0.6]

### Added
- Persistent state in `/var/db/focuslock/` (expires-at, allowed, history.log) — survives reboot, replacing `/tmp` which macOS wipes on boot
- LaunchDaemon `dev.focuslock.reblock` runs `focuslock check` every 60s and at boot — re-blocks if expiry passed, even after laptop restart or sleep (closes #7)
- `focuslock history` command — view last 50 allow/block events
- `focuslock check`, `install-daemon`, `uninstall-daemon` subcommands
- Randomized site + duration labels on every `allow` (random letters, shuffled order) — forces user to read prompts instead of muscle-memory typing
- Confirmation step in `allow` — must type a randomly generated short code before block is applied, preventing accidental allows (closes #5)

### Changed
- Lint workflow runs on PRs only — not on push to main (redundant after merge)
- `allow` no longer spawns nohup `sleep` timer; LaunchDaemon handles reblock instead (more reliable, survives shutdown)
- `status` now reports remaining time + daemon install state

### Fixed
- Sites stayed permanently allowed after reboot because `/tmp/focuslock-allowed` was wiped on boot before any reblock could run — fixed by moving state to `/var/db/focuslock`
- `osascript` hangs indefinitely when Chrome is not running — `tell application "Google Chrome"` launches Chrome and waits. Now skips Chrome tab closing if Chrome is not already open.

---

## [Previous Unreleased — merged]

### Fixed
- Auto-reblock timer called `sudo focuslock block` from already-root process — sudo inside root silently fails. Timer now calls `focuslock block` directly (already root).

### Changed
- Release workflow now auto-triggers on push to main (no manual tagging needed)
- Release workflow now publishes npm package to GitHub Packages on every release
- Removed bot CHANGELOG commit step that was failing against branch protection

### Added
- `package.json` for GitHub Packages npm registry (`@navibyte-innovations-pvt-ltd/focuslock`)

---

## [1.0.1] - 2026-05-11

### Fixed
- Reblock time now displays in 12-hour format (e.g. `03:52 PM` instead of `15:52`)

---

## [1.0.0] - 2026-05-11

### Added
- `focuslock allow` — interactive site picker + duration selector (5 min / 10 min / 30 min / 1 hr / 2 hr)
- `focuslock block` — immediate reblock; restores only the sites that were allowed
- `focuslock add <domain>` — add site to block list and `/etc/hosts`
- `focuslock remove <domain>` — remove site from block list and `/etc/hosts`
- `focuslock list` — show all sites with live allowed/blocked state
- `focuslock status` — show background timer status
- `focuslock help` — usage reference
- Background auto-reblock timer via `nohup` (survives terminal close)
- Chrome tab auto-close on reblock (clears browser DNS cache)
- Configurable site list at `~/.focuslock/sites`
- `install.sh` and `uninstall.sh`
- GitHub Actions: lint (shellcheck) + release workflows

[Unreleased]: https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/releases/tag/v1.0.0
