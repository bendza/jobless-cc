'use strict';

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(require('os').homedir(), '.jobless');

/**
 * Application state management for in-progress job applications.
 * Tracks the current step in the apply flow so it can be resumed.
 */

function getStatePath(applicationId) {
  return path.join(STATE_DIR, 'applications', `${applicationId}.json`);
}

function createApplication(data) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = (data.company + '-' + data.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

  const id = `${date}-${slug}`;

  const record = {
    id,
    company: data.company,
    title: data.title,
    url: data.url,
    platform: data.platform || detectPlatform(data.url),
    stage: 'in_progress',
    applied_at: null,

    research: {
      company_info: null,
      hiring_person: null,
      match_strengths: [],
      match_gaps: [],
      angle: null
    },

    materials: {
      resume_changes: [],
      cover_letter_generated: false,
      cover_letter_tone: null
    },

    form: {
      fields_total: 0,
      fields_auto_filled: 0,
      fields_ai_generated: 0,
      fields_skipped: 0,
      answers: []
    },

    timeline: [
      { event: 'created', at: new Date().toISOString() }
    ],

    response: {
      status: null,
      updated_at: null,
      notes: null
    }
  };

  const appsDir = path.join(STATE_DIR, 'applications');
  if (!fs.existsSync(appsDir)) {
    fs.mkdirSync(appsDir, { recursive: true });
  }

  const filePath = path.join(appsDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ ok: true, id, path: filePath }));
  return record;
}

function detectPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashbyhq.com')) return 'ashby';
  if (url.includes('workday.com')) return 'workday';
  if (url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('icims.com')) return 'icims';
  if (url.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (url.includes('jobvite.com')) return 'jobvite';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'unknown';
}

function addTimelineEvent(id, event) {
  const filePath = path.join(STATE_DIR, 'applications', `${id}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Application not found: ${id}`);
    process.exit(1);
  }

  const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!record.timeline) record.timeline = [];
  record.timeline.push({ event, at: new Date().toISOString() });
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ ok: true, event }));
}

function updateSection(id, section, data) {
  const filePath = path.join(STATE_DIR, 'applications', `${id}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Application not found: ${id}`);
    process.exit(1);
  }

  const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (typeof data === 'string') {
    data = JSON.parse(data);
  }

  record[section] = { ...record[section], ...data };
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ ok: true, id, section }));
}

function slug(text) {
  const result = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  console.log(result);
  return result;
}

function timestamp() {
  const ts = new Date().toISOString();
  console.log(ts);
  return ts;
}

module.exports = {
  createApplication,
  detectPlatform,
  addTimelineEvent,
  updateSection,
  slug,
  timestamp
};
