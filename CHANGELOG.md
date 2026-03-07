# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-07

### Fixed
- Setup workflow: MCP server registration now happens before asking for API key (was skipping venv/register steps)
- Made Step 0 ordering explicit so AI follows venv → register → key → restart sequence

## [0.1.0] - 2026-03-07

### Added
- `/jobless:setup` — First-time profile setup, optional MCP server configuration
- `/jobless:apply` — Guided job application workflow (research, resume tailoring, cover letter, form filling)
- `/jobless:status` — Pipeline tracker for all active applications
- `/jobless:debrief` — Post-interview debrief and learning capture
- `/jobless:update` — Self-update with changelog display
- MCP server for direct Jobless API access (optional, configured via `/jobless:setup`)
- Background update-check hook (SessionStart)
