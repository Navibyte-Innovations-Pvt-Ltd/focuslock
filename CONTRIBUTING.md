# Contributing to focuslock

## Before you start

- Check [open issues](https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock/issues) before filing a new one
- For big changes, open an issue first to discuss

## Setup

```bash
git clone https://github.com/Navibyte-Innovations-Pvt-Ltd/focuslock
cd focuslock
```

No build step. The `focuslock` file is the binary.

## Making changes

1. Edit `focuslock`, `install.sh`, or `uninstall.sh`
2. Test locally: `sudo cp focuslock /usr/local/bin/focuslock`
3. Run shellcheck: `shellcheck -s bash focuslock install.sh uninstall.sh`
4. Test the affected commands manually

## Key constraints

- macOS only — uses `dscacheutil`, `mDNSResponder`, `osascript`
- bash 3.2 compatible — no `declare -A`, no `mapfile`
- BSD sed — use `sed -i ''`, use `-E` for alternation, not `\|`
- Scripts touching `/etc/hosts` must run as root (self-elevate via `exec sudo "$0" "$@"`)
- AppleScript must run as logged-in user, not root

See `CLAUDE.md` for full pattern reference.

## Pull request checklist

- [ ] `shellcheck -s bash focuslock install.sh uninstall.sh` passes with no errors
- [ ] Tested on macOS (real terminal, not CI)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No hardcoded site lists — reads from `~/.focuslock/sites`

## Releasing (maintainers)

1. Update `CHANGELOG.md` — move `[Unreleased]` items under new version + date
2. Commit: `git commit -m "Release vX.Y.Z"`
3. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. GitHub Actions creates the release and attaches the tarball automatically
