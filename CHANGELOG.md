# Changelog

All notable changes to focuslock are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
