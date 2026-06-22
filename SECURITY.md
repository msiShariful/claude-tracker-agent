# Security Policy

## Supported Versions

This project is actively maintained on the `master` branch. Security fixes are applied to the latest version only.

| Version | Supported |
| ------- | --------- |
| latest (`master`) | :white_check_mark: |
| older commits | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) ("Report a vulnerability" under the **Security** tab), **or**
- Email the maintainer at **nipon@6amtech.com**.

Please include steps to reproduce, affected versions, and potential impact. You can expect an initial response within **5 business days**. Please do not open a public issue for security reports.

## Security Considerations

- `config.json` holds your `api_key` and tracker URL. It is ignored by git (`.gitignore`) — never commit it, and rotate the key if it is exposed. Only `config.example.json` (with placeholder values) belongs in version control.
- The agent opens `~/.claude/usage.db` in **read-only** mode and only reads token-usage metadata (model name, token counts, timestamps); it does not read prompt or response content. Review what is synced before pointing it at a remote server.
- Usage data is sent to `tracker_url` over the network. Always use an `https://` endpoint so the API key and usage data are encrypted in transit.
