#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PACKAGE_ROOT, 'src');
const USER_DATA_DIR = path.join(require('os').homedir(), '.jobless');

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  for (const arg of args) {
    if (arg === '--local') flags.local = true;
    else if (arg === '--global') flags.global = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--version' || arg === '-v') flags.version = true;
  }
  return flags;
}

function printHelp() {
  console.log(`
jobless-cc — Install the Jobless CLI for Claude Code

Usage:
  npx jobless-cc --local     Install to .claude/ in current directory
  npx jobless-cc --global    Install to ~/.claude/ for all projects

Options:
  --local     Install commands and tools to ./claude/ (project-level)
  --global    Install commands and tools to ~/.claude/ (user-level)
  --help      Show this help message
  --version   Show version
`);
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function copyDirRecursive(src, dest) {
  const entries = [];
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const items = fs.readdirSync(src, { withFileTypes: true });
  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    if (item.isDirectory()) {
      entries.push(...copyDirRecursive(srcPath, destPath));
    } else {
      fs.copyFileSync(srcPath, destPath);
      entries.push({ path: destPath, hash: hashFile(srcPath) });
    }
  }
  return entries;
}

function ensureUserDataDir() {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    console.log(`  Created ${USER_DATA_DIR}/`);
  }

  const appsDir = path.join(USER_DATA_DIR, 'applications');
  if (!fs.existsSync(appsDir)) {
    fs.mkdirSync(appsDir, { recursive: true });
    console.log(`  Created ${appsDir}/`);
  }

  // Copy template files if they don't exist
  const templates = ['profile.json', 'config.json'];
  for (const tmpl of templates) {
    const dest = path.join(USER_DATA_DIR, tmpl);
    if (!fs.existsSync(dest)) {
      const src = path.join(SRC_DIR, 'jobless', 'templates', tmpl);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  Created ${dest}`);
      }
    }
  }

  // Copy MCP server files (no venv — setup workflow installs on demand)
  const mcpDir = path.join(USER_DATA_DIR, 'mcp');
  if (!fs.existsSync(mcpDir)) {
    fs.mkdirSync(mcpDir, { recursive: true });
  }
  let mcpCopied = 0;
  for (const f of ['server.py', 'client.py', 'requirements.txt']) {
    const src = path.join(SRC_DIR, '..', 'mcp', f);
    const dest = path.join(mcpDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      mcpCopied++;
    } else {
      console.warn(`  Warning: MCP file not found in package: ${f}`);
    }
  }
  console.log(`  Copied ${mcpCopied} MCP server files to ${mcpDir}/`);

  // Create references directory
  const refsDir = path.join(USER_DATA_DIR, 'references');
  if (!fs.existsSync(refsDir)) {
    fs.mkdirSync(refsDir, { recursive: true });
    console.log(`  Created ${refsDir}/`);
  }

  // Copy reference templates (only if not already present — don't overwrite user data)
  for (const tpl of ['stories.md', 'cover-letter-guide.md', 'angles.md']) {
    const dest = path.join(refsDir, tpl);
    if (!fs.existsSync(dest)) {
      const src = path.join(SRC_DIR, 'jobless', 'templates', tpl);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  Created ${dest}`);
      }
    }
  }

  // Create empty answers.json if it doesn't exist
  const answersPath = path.join(USER_DATA_DIR, 'answers.json');
  if (!fs.existsSync(answersPath)) {
    fs.writeFileSync(answersPath, JSON.stringify({ answers: [] }, null, 2));
    console.log(`  Created ${answersPath}`);
  }

  // Create insights.md if it doesn't exist
  const insightsPath = path.join(USER_DATA_DIR, 'insights.md');
  if (!fs.existsSync(insightsPath)) {
    const src = path.join(SRC_DIR, 'jobless', 'templates', 'insights.md');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, insightsPath);
      console.log(`  Created ${insightsPath}`);
    }
  }
}

function install(targetDir, isGlobal) {
  console.log('\nInstalling jobless-cc...\n');

  const claudeDir = path.join(targetDir, '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // 1. Copy commands/jobless/ → .claude/commands/jobless/
  const commandsSrc = path.join(SRC_DIR, 'commands', 'jobless');
  const commandsDest = path.join(claudeDir, 'commands', 'jobless');
  console.log('  Installing slash commands...');
  const commandEntries = copyDirRecursive(commandsSrc, commandsDest);
  console.log(`    ${commandEntries.length} command files installed`);

  // 2. Copy jobless/ → .claude/jobless/
  const joblessSrc = path.join(SRC_DIR, 'jobless');
  const joblessDest = path.join(claudeDir, 'jobless');
  console.log('  Installing core engine...');
  const engineEntries = copyDirRecursive(joblessSrc, joblessDest);
  console.log(`    ${engineEntries.length} engine files installed`);

  // 3. Create ~/.jobless/ user data directory
  console.log('  Setting up user data directory...');
  ensureUserDataDir();

  // 4. Write VERSION file
  const pkg = require(path.join(PACKAGE_ROOT, 'package.json'));
  const versionFile = path.join(joblessDest, 'VERSION');
  fs.writeFileSync(versionFile, pkg.version + '\n');
  console.log(`  Wrote VERSION (${pkg.version})`);

  // 5. Copy CHANGELOG.md
  const changelogSrc = path.join(PACKAGE_ROOT, 'CHANGELOG.md');
  if (fs.existsSync(changelogSrc)) {
    const changelogDest = path.join(joblessDest, 'CHANGELOG.md');
    fs.copyFileSync(changelogSrc, changelogDest);
    console.log('  Copied CHANGELOG.md');
  }

  // 6. Install update-check hook
  const hooksSrc = path.join(PACKAGE_ROOT, 'hooks', 'dist', 'jobless-check-update.js');
  if (fs.existsSync(hooksSrc)) {
    const hooksDir = path.join(claudeDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    const hookDest = path.join(hooksDir, 'jobless-check-update.js');
    fs.copyFileSync(hooksSrc, hookDest);
    console.log('  Installed update-check hook');
  }

  // 7. Merge into settings.json (add SessionStart hook without overwriting existing hooks)
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.warn('  Warning: existing settings.json is invalid JSON — creating fresh');
      settings = {};
    }
  }
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  const hookRelPath = isGlobal
    ? `node "${path.join(require('os').homedir(), '.claude', 'hooks', 'jobless-check-update.js')}"`
    : 'node .claude/hooks/jobless-check-update.js';

  // Check for any existing jobless hook (relative or absolute path variants)
  const alreadyInstalled = settings.hooks.SessionStart.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('jobless-check-update.js'))
  );

  if (!alreadyInstalled) {
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: hookRelPath }]
    });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    console.log('  Added SessionStart hook to settings.json');
  } else {
    console.log('  SessionStart hook already present in settings.json');
  }

  // 8. Write manifest
  const allEntries = [...commandEntries, ...engineEntries];
  const fileMap = {};
  for (const e of allEntries) {
    fileMap[path.relative(claudeDir, e.path)] = e.hash;
  }
  const manifest = {
    version: pkg.version,
    timestamp: new Date().toISOString(),
    install_target: targetDir,
    files: fileMap
  };
  const manifestPath = path.join(claudeDir, 'jobless-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  Wrote manifest (${allEntries.length} files tracked)`);

  console.log(`
Installation complete!

  Commands installed to: ${commandsDest}
  Engine installed to:   ${joblessDest}
  User data directory:   ${USER_DATA_DIR}

Run /jobless:setup to get started.
`);
}

// Main
const flags = parseArgs(process.argv);

if (flags.help) {
  printHelp();
  process.exit(0);
}

if (flags.version) {
  const pkg = require(path.join(PACKAGE_ROOT, 'package.json'));
  console.log(`jobless-cc v${pkg.version}`);
  process.exit(0);
}

if (!flags.local && !flags.global) {
  console.error('Error: specify --local or --global');
  printHelp();
  process.exit(1);
}

const targetDir = flags.global ? require('os').homedir() : process.cwd();
install(targetDir, !!flags.global);
