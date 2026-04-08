# jobless-cc

[![npm version](https://img.shields.io/npm/v/jobless-cc.svg)](https://www.npmjs.com/package/jobless-cc)
[![license](https://img.shields.io/npm/l/jobless-cc.svg)](https://github.com/bendza/jobless-cc/blob/main/LICENSE)

Claude Code extension for job applications — research, resume tailoring, cover letters, form filling, and pipeline tracking.

## Install

```bash
# Global (all projects)
npx jobless-cc --global

# Local (current project only)
npx jobless-cc --local
```

## Commands

| Command | Description |
|---------|-------------|
| `/jobless:setup` | First-time profile setup, optional MCP server configuration |
| `/jobless:apply` | Guided job application (research, resume, cover letter, form fill) |
| `/jobless:status` | View and manage your application pipeline |
| `/jobless:debrief` | Post-interview debrief and learning capture |
| `/jobless:update` | Update to latest version with changelog |

## Optional: MCP Server

The standalone MCP server lives in its own repo: [bendza/jobless-mcp](https://github.com/bendza/jobless-mcp). Install with `pip install jobless-mcp` or use the hosted version at `mcp.jobless.dev`. See that repo's README for setup instructions.

## What Gets Installed

```
.claude/
  commands/jobless/         # 5 slash commands (setup, apply, status, debrief, update)
  jobless/                  # Core engine
    VERSION                 # Installed version for update checks
    CHANGELOG.md            # Local changelog copy
    workflows/              # Workflow definitions
    templates/              # Profile, config, reference templates
    references/             # Field types, platform mappings, voice guide
    bin/                    # Internal CLI tooling
  hooks/
    jobless-check-update.js # Background update checker
  settings.json             # SessionStart hook entry (merged, not overwritten)
  jobless-manifest.json     # Install manifest with file hashes

~/.jobless/
  profile.json              # Your profile data
  config.json               # API key and settings
  answers.json              # Saved application answers
  insights.md               # Accumulated application insights
  applications/             # Downloaded resumes and cover letters
  references/               # Stories, angles, cover letter guide
  mcp/                      # MCP server files (no venv until setup)
```

## Links

- [jobless.dev](https://jobless.dev) — Job tracking platform
- [Changelog](https://github.com/bendza/jobless-cc/blob/main/CHANGELOG.md)
- [Issues](https://github.com/bendza/jobless-cc/issues)
