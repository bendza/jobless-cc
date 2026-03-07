'use strict';

const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.join(require('os').homedir(), '.jobless', 'profile.json');

function load() {
  if (!fs.existsSync(PROFILE_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
}

function save(profile) {
  const dir = path.dirname(PROFILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
}

function get(field) {
  const profile = load();
  if (!profile) {
    console.error('No profile found. Run /jobless:setup first.');
    process.exit(1);
  }
  if (field) {
    const value = profile[field];
    if (value === undefined) {
      console.error(`Unknown field: ${field}`);
      process.exit(1);
    }
    console.log(JSON.stringify(value));
  } else {
    console.log(JSON.stringify(profile, null, 2));
  }
}

function set(field, value) {
  let profile = load();
  if (!profile) {
    // Start from template
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'profile.json');
    if (fs.existsSync(templatePath)) {
      profile = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    } else {
      profile = {};
    }
  }
  profile[field] = value;
  save(profile);
  console.log(JSON.stringify({ ok: true, field, value }));
}

function show() {
  const profile = load();
  if (!profile) {
    console.log('No profile configured. Run /jobless:setup first.');
    return;
  }

  const lines = [];
  lines.push('Profile:');
  for (const [key, val] of Object.entries(profile)) {
    if (val && val !== '') {
      lines.push(`  ${key}: ${val}`);
    }
  }
  console.log(lines.join('\n'));
}

module.exports = { load, save, get, set, show, PROFILE_PATH };
