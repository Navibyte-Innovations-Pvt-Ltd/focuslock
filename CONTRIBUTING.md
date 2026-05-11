# Contributing to focuslock

Thank you for contributing. Every change — bug fix, feature, or docs — goes through a pull request. Direct pushes to `main` are not allowed.

---

## Workflow

```
fork → branch → change → PR → review → merge → release
```

### 1. Fork and clone

```bash
gh repo fork Navibyte-Innovations-Pvt-Ltd/focuslock --clone
cd focuslock
```

### 2. Create a branch

Branch naming:
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/add-brave-browser` |
| Bug fix | `fix/short-description` | `fix/amazon-not-blocking` |
| Docs | `docs/short-description` | `docs/improve-readme` |
| Chore | `chore/short-description` | `chore/update-actions` |

```bash
git checkout -b feat/your-feature
```

### 3. Make your changes

- Edit `focuslock`, `install.sh`, or `uninstall.sh`
- Reinstall locally to test: `sudo cp focuslock /usr/local/bin/focuslock`
- Run shellcheck: `shellcheck -s bash focuslock install.sh uninstall.sh`
- **Update `CHANGELOG.md`** under `[Unreleased]` — PRs without changelog update are blocked by CI

### 4. Open a PR

```bash
git push origin feat/your-feature
gh pr create --fill
```

PR checklist (also in PR template):
- [ ] `shellcheck` passes — no errors
- [ ] Tested manually on macOS
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No hardcoded site lists

CI runs automatically on every PR:
- **shellcheck** — lint all scripts
- **changelog** — fails if `CHANGELOG.md` not updated

### 5. After merge (maintainers only)

To cut a release:

```bash
# 1. Update CHANGELOG.md — move [Unreleased] items under new version
# 2. Commit
git commit -am "Release vX.Y.Z"
git push

# 3. Tag
git tag vX.Y.Z
git push origin vX.Y.Z
```

GitHub Actions automatically:
- Builds `focuslock-vX.Y.Z.tar.gz`
- Extracts changelog for that version
- Creates GitHub Release with the tarball attached

---

## Key constraints

| Constraint | Why |
|-----------|-----|
| macOS only | Uses `dscacheutil`, `mDNSResponder`, `osascript`, `stat -f "%Su"` |
| bash 3.2 | macOS ships bash 3.2 — no `declare -A`, no `mapfile` |
| BSD sed | Use `sed -i ''`, `-E` for alternation — not GNU sed |
| Root required | `/etc/hosts` edits need sudo — script self-elevates |
| AppleScript as user | `osascript` fails as root — run via `sudo -u "$LOGGED_USER"` |

See [`CLAUDE.md`](CLAUDE.md) for full sed pattern reference and debugging tips.

---

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
Include your macOS version, focuslock version, and the output of:
```bash
grep -E "(linkedin|facebook|instagram|amazon|youtube)" /etc/hosts
```

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
