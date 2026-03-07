'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const APPS_DIR = path.join(os.homedir(), '.jobless', 'applications');
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

function detectPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashbyhq.com')) return 'ashby';
  if (url.includes('workday.com') || url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('icims.com')) return 'icims';
  if (url.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (url.includes('jobvite.com')) return 'jobvite';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('kula.ai')) return 'kula';
  return 'unknown';
}

function makeSlug(company, title) {
  return (company + '-' + title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function getDir(id) {
  return path.join(APPS_DIR, id);
}

function create(company, title, url) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = makeSlug(company || 'company', title || 'role');
  const id = `${date}-${slug}`;
  const dir = path.join(APPS_DIR, id);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const platform = detectPlatform(url);

  // Write STATE.md from template
  const templatePath = path.join(TEMPLATES_DIR, 'STATE.md');
  let stateContent = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf8')
    : getDefaultStateTemplate();

  stateContent = stateContent
    .replace(/\{\{id\}\}/g, id)
    .replace(/\{\{company\}\}/g, company || '')
    .replace(/\{\{title\}\}/g, title || '')
    .replace(/\{\{url\}\}/g, url || '')
    .replace(/\{\{platform\}\}/g, platform)
    .replace(/\{\{timestamp\}\}/g, timestamp);

  fs.writeFileSync(path.join(dir, 'STATE.md'), stateContent);

  const result = { ok: true, id, dir, company, title, url, platform, created_at: timestamp };
  console.log(JSON.stringify(result));
  return result;
}

function getDefaultStateTemplate() {
  return `---
id: {{id}}
company: {{company}}
title: {{title}}
url: {{url}}
platform: {{platform}}
stage: in_progress
current_step: job_read
applied_at: null
created_at: {{timestamp}}
updated_at: {{timestamp}}
job_id: null
resume_id: null
cover_letter_id: null
chosen_angle: null
conversation_notes: |
  <!-- Append notes during session: constraints, interests, things user mentioned -->
---

# Application: {{title}} @ {{company}}

## Progress
- [ ] Job read
- [ ] Company researched
- [ ] Match analysis done
- [ ] Angle chosen
- [ ] Resume tailored
- [ ] Cover letter written
- [ ] Form filled
- [ ] Applied

## Materials
resume_path: null
cover_letter_id: null

## Response Tracking
status: null
updated_at: null
notes: null

## Timeline
- {{timestamp}}: Created
`;
}

function parseStateFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    fm[key] = val === 'null' ? null : val;
  }
  return fm;
}

function updateStateFrontmatter(content, field, value) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return content;

  const lines = match[1].split('\n');
  let found = false;
  const updated = lines.map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return line;
    const key = line.slice(0, colonIdx).trim();
    if (key === field) {
      found = true;
      return `${key}: ${value}`;
    }
    return line;
  });

  if (!found) updated.push(`${field}: ${value}`);

  // Also update updated_at
  const withUpdatedAt = updated.map(line => {
    if (line.startsWith('updated_at:')) return `updated_at: ${new Date().toISOString()}`;
    return line;
  });

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${withUpdatedAt.join('\n')}\n---`);
}

function list(stage) {
  if (!fs.existsSync(APPS_DIR)) {
    console.log(JSON.stringify([]));
    return;
  }

  const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const statePath = path.join(APPS_DIR, d.name, 'STATE.md');
      if (!fs.existsSync(statePath)) return null;
      const fm = parseStateFrontmatter(fs.readFileSync(statePath, 'utf8'));
      return { id: d.name, ...fm };
    })
    .filter(Boolean);

  const filtered = stage ? entries.filter(e => e.stage === stage) : entries;
  const sorted = filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  console.log(JSON.stringify(sorted));
}

function get(id) {
  const dir = path.join(APPS_DIR, id);
  if (!fs.existsSync(dir)) {
    console.error(JSON.stringify({ error: `Application not found: ${id}` }));
    process.exit(1);
  }

  const statePath = path.join(dir, 'STATE.md');
  const fm = fs.existsSync(statePath)
    ? parseStateFrontmatter(fs.readFileSync(statePath, 'utf8'))
    : {};

  const files = fs.readdirSync(dir).filter(f => f !== 'STATE.md');
  const progress = {
    JOB: files.includes('JOB.md'),
    RESEARCH: files.includes('RESEARCH.md'),
    MATCH: files.includes('MATCH.md'),
    RESUME: files.includes('RESUME.md'),
    COVER_LETTER: files.includes('COVER_LETTER.md'),
    FORM: files.includes('FORM.md')
  };

  console.log(JSON.stringify({ id, ...fm, files, progress }));
}

function updateState(id, field, value) {
  const statePath = path.join(APPS_DIR, id, 'STATE.md');
  if (!fs.existsSync(statePath)) {
    console.error(JSON.stringify({ error: `Application not found: ${id}` }));
    process.exit(1);
  }

  const content = fs.readFileSync(statePath, 'utf8');
  const updated = updateStateFrontmatter(content, field, value);
  fs.writeFileSync(statePath, updated);
  console.log(JSON.stringify({ ok: true, id, field, value }));
}

function writeFile(id, filename, content) {
  const dir = path.join(APPS_DIR, id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  console.log(JSON.stringify({ ok: true, path: filePath }));
}

function readFile(id, filename) {
  const filePath = path.join(APPS_DIR, id, filename);
  if (!fs.existsSync(filePath)) {
    console.error(JSON.stringify({ error: `File not found: ${filePath}` }));
    process.exit(1);
  }
  console.log(fs.readFileSync(filePath, 'utf8'));
}

function stats() {
  if (!fs.existsSync(APPS_DIR)) {
    console.log(JSON.stringify({ total: 0, by_stage: {}, by_platform: {} }));
    return;
  }

  const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const statePath = path.join(APPS_DIR, d.name, 'STATE.md');
      if (!fs.existsSync(statePath)) return null;
      return parseStateFrontmatter(fs.readFileSync(statePath, 'utf8'));
    })
    .filter(Boolean);

  const byStage = {};
  const byPlatform = {};
  for (const e of entries) {
    byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    byPlatform[e.platform] = (byPlatform[e.platform] || 0) + 1;
  }

  console.log(JSON.stringify({ total: entries.length, by_stage: byStage, by_platform: byPlatform }));
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Strip UTM params, ref, session IDs, tracking params
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      if (!k.startsWith('utm_') && k !== 'ref' && k !== 'sid' && k !== 'session' && k !== 'token') {
        keep.set(k, v);
      }
    }
    const qs = keep.toString();
    return u.origin + u.pathname + (qs ? '?' + qs : '');
  } catch {
    return url;
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function find(query) {
  if (!fs.existsSync(APPS_DIR)) {
    console.log(JSON.stringify([]));
    return;
  }

  const normalizedQuery = normalizeUrl(query);
  const queryDomain = extractDomain(query);
  const queryLower = query.toLowerCase();

  const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const statePath = path.join(APPS_DIR, d.name, 'STATE.md');
      if (!fs.existsSync(statePath)) return null;
      const fm = parseStateFrontmatter(fs.readFileSync(statePath, 'utf8'));
      return { id: d.name, ...fm };
    })
    .filter(Boolean);

  const scored = entries.map(entry => {
    let confidence = 0;

    // URL-based matching
    if (entry.url) {
      const normalizedEntry = normalizeUrl(entry.url);
      const entryDomain = extractDomain(entry.url);

      if (normalizedEntry === normalizedQuery) {
        confidence = 1.0;
      } else if (normalizedEntry.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedEntry)) {
        confidence = 0.9;
      } else if (entryDomain && queryDomain && entryDomain === queryDomain) {
        confidence = 0.75;
      }
    }

    // Company name fuzzy matching (if URL didn't match well)
    if (confidence < 0.8 && entry.company) {
      const companyLower = entry.company.toLowerCase();
      if (companyLower === queryLower || companyLower.includes(queryLower) || queryLower.includes(companyLower)) {
        confidence = Math.max(confidence, 0.7);
      }
    }

    return { ...entry, confidence };
  })
  .filter(e => e.confidence > 0)
  .sort((a, b) => b.confidence - a.confidence);

  console.log(JSON.stringify(scored));
}

function appendNote(id, note) {
  const statePath = path.join(APPS_DIR, id, 'STATE.md');
  if (!fs.existsSync(statePath)) {
    console.error(JSON.stringify({ error: `Application not found: ${id}` }));
    process.exit(1);
  }

  let content = fs.readFileSync(statePath, 'utf8');
  const timestamp = new Date().toISOString();
  const noteEntry = `  - [${timestamp}]: ${note.replace(/\\n/g, ' ')}`;

  // Find the conversation_notes multiline block in frontmatter
  if (content.includes('conversation_notes: |')) {
    // Find the marker comment and replace or append after it
    const commentMarker = '  <!-- Append notes during session: constraints, interests, things user mentioned -->';
    if (content.includes(commentMarker)) {
      content = content.replace(commentMarker, commentMarker + '\n' + noteEntry);
    } else {
      // Append after the conversation_notes: | line
      content = content.replace(
        /^(conversation_notes: \|.*)/m,
        `$1\n${noteEntry}`
      );
    }
  } else {
    // conversation_notes field doesn't exist — add it before closing ---
    const fmEnd = content.indexOf('\n---', 3);
    if (fmEnd !== -1) {
      const insertPos = fmEnd;
      content = content.slice(0, insertPos) +
        `\nconversation_notes: |\n${noteEntry}` +
        content.slice(insertPos);
    }
  }

  fs.writeFileSync(statePath, content);
  console.log(JSON.stringify({ ok: true, id, note }));
}

function logEvent(id, event, notes) {
  const dir = path.join(APPS_DIR, id);
  if (!fs.existsSync(dir)) {
    console.error(JSON.stringify({ error: `Application not found: ${id}` }));
    process.exit(1);
  }

  const logPath = path.join(dir, 'LOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${event} | ${(notes || '').replace(/\\n/g, ' ')} |`;

  if (!fs.existsSync(logPath)) {
    // Read company/title from STATE.md for the header
    const statePath = path.join(dir, 'STATE.md');
    const fm = fs.existsSync(statePath)
      ? parseStateFrontmatter(fs.readFileSync(statePath, 'utf8'))
      : {};
    const header = `# Activity Log: ${fm.title || id} @ ${fm.company || ''}\n\n| Date | Event | Notes |\n|------|-------|-------|\n`;
    fs.writeFileSync(logPath, header + row + '\n');
  } else {
    const existing = fs.readFileSync(logPath, 'utf8');
    fs.writeFileSync(logPath, existing.trimEnd() + '\n' + row + '\n');
  }

  console.log(JSON.stringify({ ok: true, id, event, date }));
}

function appendToInsights(id, company, title, angle, notable) {
  const insightsPath = path.join(os.homedir(), '.jobless', 'insights.md');
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${company || id} | ${title || ''} | ${angle || ''} | applied | ${notable || ''} |`;

  if (!fs.existsSync(insightsPath)) {
    // Create from template
    const templatePath = path.join(TEMPLATES_DIR, 'insights.md');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, insightsPath);
    } else {
      fs.writeFileSync(insightsPath, '# Application Insights\n\n| Date | Company | Role | Angle used | Outcome | Notable |\n|------|---------|------|-----------|---------|---------||\n<!-- Rows appended automatically after each /jobless:apply session -->\n');
    }
  }

  let content = fs.readFileSync(insightsPath, 'utf8');
  content = content.trimEnd() + '\n' + row + '\n';
  fs.writeFileSync(insightsPath, content);
  console.log(JSON.stringify({ ok: true, path: insightsPath, row }));
}

module.exports = { create, list, get, updateState, writeFile, readFile, getDir, stats, detectPlatform, find, appendNote, appendToInsights, logEvent };
