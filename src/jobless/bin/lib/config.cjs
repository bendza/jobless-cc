'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(require('os').homedir(), '.jobless', 'config.json');

function load() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function save(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function get(key) {
  const config = load();
  if (key) {
    console.log(JSON.stringify(config[key] ?? null));
  } else {
    console.log(JSON.stringify(config, null, 2));
  }
}

function set(key, value) {
  const config = load();
  // Try to parse value as JSON for booleans/numbers
  try {
    config[key] = JSON.parse(value);
  } catch {
    config[key] = value;
  }
  save(config);
  console.log(JSON.stringify({ ok: true, key, value: config[key] }));
}

function init() {
  const config = load();
  if (!config.created_at) {
    config.created_at = new Date().toISOString();
  }
  config.version = require('../../templates/config.json').version || '0.1.0';
  save(config);
  console.log(JSON.stringify({ ok: true, initialized: true }));
}

function checkBrowser() {
  // This outputs the current browser_tool setting
  const config = load();
  console.log(JSON.stringify({
    browser_tool: config.browser_tool || null,
    setup_complete: config.setup_complete || false
  }));
}

module.exports = { load, save, get, set, init, checkBrowser, CONFIG_PATH };
