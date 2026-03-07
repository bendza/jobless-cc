'use strict';

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(require('os').homedir(), '.jobless', 'applications');

function ensureDir() {
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }
}

function loadAll() {
  ensureDir();
  const files = fs.readdirSync(APPS_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(APPS_DIR, f), 'utf8'));
    data._file = f;
    return data;
  });
}

function add(jsonData) {
  ensureDir();
  let record;
  if (typeof jsonData === 'string') {
    record = JSON.parse(jsonData);
  } else {
    record = jsonData;
  }

  if (!record.id) {
    const date = new Date().toISOString().slice(0, 10);
    const slug = (record.company + '-' + record.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    record.id = `${date}-${slug}`;
  }

  if (!record.timeline) {
    record.timeline = [{ event: 'created', at: new Date().toISOString() }];
  }

  if (!record.stage) {
    record.stage = 'applied';
  }

  if (!record.response) {
    record.response = { status: null, updated_at: null, notes: null };
  }

  const filename = `${record.id}.json`;
  const filePath = path.join(APPS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ ok: true, id: record.id, path: filePath }));
}

function list(stage) {
  const apps = loadAll();
  let filtered = apps;
  if (stage) {
    filtered = apps.filter(a => a.stage === stage);
  }

  // Sort by most recent first
  filtered.sort((a, b) => {
    const dateA = a.applied_at || a.timeline?.[0]?.at || '';
    const dateB = b.applied_at || b.timeline?.[0]?.at || '';
    return dateB.localeCompare(dateA);
  });

  const summary = filtered.map(a => ({
    id: a.id,
    company: a.company,
    title: a.title,
    stage: a.stage,
    applied_at: a.applied_at || a.timeline?.[0]?.at,
    response_status: a.response?.status,
    response_updated: a.response?.updated_at
  }));

  console.log(JSON.stringify(summary, null, 2));
}

function get(id) {
  const apps = loadAll();
  const app = apps.find(a => a.id === id);
  if (!app) {
    console.error(`Application not found: ${id}`);
    process.exit(1);
  }
  console.log(JSON.stringify(app, null, 2));
}

function update(id, field, value) {
  ensureDir();
  const filePath = path.join(APPS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Application not found: ${id}`);
    process.exit(1);
  }

  const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Support dot-notation for nested fields (e.g., response.status)
  const parts = field.split('.');
  let obj = record;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }

  // Try to parse value as JSON
  try {
    obj[parts[parts.length - 1]] = JSON.parse(value);
  } catch {
    obj[parts[parts.length - 1]] = value;
  }

  // Update timestamp for response changes
  if (field.startsWith('response.') || field === 'stage') {
    if (!record.response) record.response = {};
    record.response.updated_at = new Date().toISOString();

    // Add timeline event
    if (!record.timeline) record.timeline = [];
    record.timeline.push({
      event: `${field}_changed_to_${value}`,
      at: new Date().toISOString()
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ ok: true, id, field, value }));
}

function stats() {
  const apps = loadAll();

  const byStage = {};
  for (const app of apps) {
    const stage = app.stage || 'unknown';
    byStage[stage] = (byStage[stage] || 0) + 1;
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = apps.filter(a => {
    const date = a.applied_at || a.timeline?.[0]?.at;
    return date && new Date(date) >= weekAgo;
  }).length;

  const responded = apps.filter(a => a.response?.status).length;
  const responseRate = apps.length > 0
    ? Math.round((responded / apps.length) * 100)
    : 0;

  console.log(JSON.stringify({
    total: apps.length,
    by_stage: byStage,
    this_week: thisWeek,
    response_rate: `${responseRate}%`
  }, null, 2));
}

function exportData(format) {
  const apps = loadAll();

  if (format === 'csv') {
    const headers = ['id', 'company', 'title', 'url', 'platform', 'stage', 'applied_at', 'response_status'];
    const rows = apps.map(a => headers.map(h => {
      if (h === 'response_status') return a.response?.status || '';
      return (a[h] || '').toString().replace(/,/g, ';');
    }));
    console.log([headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  } else {
    console.log(JSON.stringify(apps, null, 2));
  }
}

module.exports = { loadAll, add, list, get, update, stats, exportData, APPS_DIR };
