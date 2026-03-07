<purpose>
Check for jobless-cc updates via npm, display changelog for versions between installed and latest, obtain user confirmation, and execute clean installation with cache clearing.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="get_installed_version">
Detect whether jobless-cc is installed locally or globally by checking both locations:

```bash
LOCAL_VERSION_FILE="./.claude/jobless/VERSION"
LOCAL_MARKER_FILE="./.claude/jobless/workflows/update.md"
GLOBAL_VERSION_FILE="$HOME/.claude/jobless/VERSION"
GLOBAL_MARKER_FILE="$HOME/.claude/jobless/workflows/update.md"

if [ -f "$LOCAL_VERSION_FILE" ] && [ -f "$LOCAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$LOCAL_VERSION_FILE"; then
  cat "$LOCAL_VERSION_FILE"
  echo "LOCAL"
elif [ -f "$GLOBAL_VERSION_FILE" ] && [ -f "$GLOBAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$GLOBAL_VERSION_FILE"; then
  cat "$GLOBAL_VERSION_FILE"
  echo "GLOBAL"
else
  echo "UNKNOWN"
fi
```

Parse output:
- If last line is "LOCAL": local install is valid; installed version is first line; use `--local`
- If last line is "GLOBAL": local missing/invalid, global install is valid; installed version is first line; use `--global`
- If "UNKNOWN": proceed to install step (treat as version 0.0.0)

**If VERSION file missing:**
```
## Jobless Update

**Installed version:** Unknown

Your installation doesn't include version tracking.

Running fresh install...
```

Proceed to install step (treat as version 0.0.0 for comparison).
</step>

<step name="check_latest_version">
Check npm for latest version:

```bash
npm view jobless-cc version 2>/dev/null
```

**If npm check fails:**
```
Couldn't check for updates (offline or npm unavailable).

To update manually: `npx jobless-cc --global`
```

Exit.
</step>

<step name="compare_versions">
Compare installed vs latest:

**If installed == latest:**
```
## Jobless Update

**Installed:** X.Y.Z
**Latest:** X.Y.Z

You're already on the latest version.
```

Exit.

**If installed > latest:**
```
## Jobless Update

**Installed:** X.Y.Z
**Latest:** A.B.C

You're ahead of the latest release (development version?).
```

Exit.
</step>

<step name="show_changes_and_confirm">
**If update available**, fetch and show what's new BEFORE updating:

1. Fetch changelog from `https://raw.githubusercontent.com/bendza/jobless-cc/main/CHANGELOG.md`
2. Extract entries between installed and latest versions
3. Display preview and ask for confirmation:

```
## Jobless Update Available

**Installed:** 0.1.0
**Latest:** 0.2.0

### What's New

## [0.2.0] - 2026-03-10

### Added
- Feature X

### Fixed
- Bug fix Y

Note: The installer performs a clean install of jobless folders:
- `commands/jobless/` will be wiped and replaced
- `jobless/` (engine) will be wiped and replaced

Your custom files in other locations are preserved:
- Custom commands not in `commands/jobless/` preserved
- Your CLAUDE.md files preserved
- Other hooks (GSD, etc.) preserved
- ~/.jobless/ user data preserved
```

Use AskUserQuestion:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Exit.
</step>

<step name="run_update">
Run the update using the install type detected in step 1:

**If LOCAL install:**
```bash
npx -y jobless-cc@latest --local
```

**If GLOBAL install (or unknown):**
```bash
npx -y jobless-cc@latest --global
```

Capture output. If install fails, show error and exit.

Clear the update cache so any status indicator disappears:

```bash
rm -f ~/.claude/cache/jobless-update-check.json
```
</step>

<step name="display_result">
Format completion message:

```
## Jobless Updated: vOLD -> vNEW

Restart Claude Code to pick up the new commands.

[View full changelog](https://github.com/bendza/jobless-cc/blob/main/CHANGELOG.md)
```
</step>

</process>

<success_criteria>
- [ ] Installed version read correctly
- [ ] Latest version checked via npm
- [ ] Update skipped if already current
- [ ] Changelog fetched and displayed BEFORE update
- [ ] Clean install warning shown
- [ ] User confirmation obtained
- [ ] Update executed successfully
- [ ] Restart reminder shown
</success_criteria>
