# Changelog

All notable changes to focuslock are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[Unreleased]: https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/releases/tag/v1.0.0
