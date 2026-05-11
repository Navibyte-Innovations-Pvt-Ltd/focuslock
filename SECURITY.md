# Security Policy

## Scope

focuslock modifies `/etc/hosts` and requires `sudo` to do so. It only connects to `localhost` (127.0.0.1) — it never makes outbound network requests.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a vulnerability

Do **not** open a public issue for security vulnerabilities.

Email: **bhosalenaresh73@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You'll receive a response within 48 hours. If confirmed, a patch will be released and you'll be credited in the changelog.

## Security considerations for users

- `sudo` is required for `/etc/hosts` edits — review the source before running
- The install script only writes to `/usr/local/bin/`, `~/.focuslock/`, and `/etc/hosts`
- No data is collected or transmitted
- Background timer runs as root — it only executes `focuslock block`
