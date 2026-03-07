'use strict';

const fs = require('fs');
const path = require('path');

const ANSWERS_PATH = path.join(require('os').homedir(), '.jobless', 'answers.json');

function load() {
  if (!fs.existsSync(ANSWERS_PATH)) {
    return { answers: [] };
  }
  return JSON.parse(fs.readFileSync(ANSWERS_PATH, 'utf8'));
}

function save(data) {
  const dir = path.dirname(ANSWERS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ANSWERS_PATH, JSON.stringify(data, null, 2));
}

function list(category) {
  const data = load();
  let answers = data.answers;
  if (category) {
    answers = answers.filter(a => a.category === category);
  }
  console.log(JSON.stringify(answers, null, 2));
}

function add(pattern, answer, category, tags) {
  const data = load();
  const entry = {
    pattern,
    category: category || 'general',
    answer,
    used_count: 0,
    last_used: null,
    tags: tags ? tags.split(',').map(t => t.trim()) : ['general']
  };
  data.answers.push(entry);
  save(data);
  console.log(JSON.stringify({ ok: true, total: data.answers.length }));
}

function remove(index) {
  const data = load();
  const idx = parseInt(index, 10);
  if (idx < 0 || idx >= data.answers.length) {
    console.error(`Invalid index: ${index}. Have ${data.answers.length} answers.`);
    process.exit(1);
  }
  const removed = data.answers.splice(idx, 1)[0];
  save(data);
  console.log(JSON.stringify({ ok: true, removed: removed.pattern }));
}

function search(questionText) {
  const data = load();
  const matches = [];
  for (let i = 0; i < data.answers.length; i++) {
    const entry = data.answers[i];
    try {
      const re = new RegExp(entry.pattern, 'i');
      if (re.test(questionText)) {
        matches.push({ index: i, ...entry });
      }
    } catch {
      // If pattern is invalid regex, try simple includes
      if (questionText.toLowerCase().includes(entry.pattern.toLowerCase())) {
        matches.push({ index: i, ...entry });
      }
    }
  }
  console.log(JSON.stringify(matches, null, 2));
}

function markUsed(index) {
  const data = load();
  const idx = parseInt(index, 10);
  if (idx >= 0 && idx < data.answers.length) {
    data.answers[idx].used_count++;
    data.answers[idx].last_used = new Date().toISOString().slice(0, 10);
    save(data);
    console.log(JSON.stringify({ ok: true }));
  }
}

module.exports = { load, save, list, add, remove, search, markUsed, ANSWERS_PATH };
