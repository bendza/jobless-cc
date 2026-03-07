#!/usr/bin/env node
'use strict';

const profile = require('./lib/profile.cjs');
const config = require('./lib/config.cjs');
const answers = require('./lib/answers.cjs');
const history = require('./lib/history.cjs');
const state = require('./lib/state.cjs');
const app = require('./lib/app.cjs');

const fs = require('fs');
const path = require('path');
const os = require('os');

const REFS_DIR = path.join(os.homedir(), '.jobless', 'references');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Map shortnames to actual filenames
const REF_FILES = {
  stories: 'stories.md',
  guide: 'cover-letter-guide.md',
  angles: 'angles.md'
};

const EMPTY_MARKERS = [
  '<!-- Stories will be added here during onboarding -->',
  '<!-- Added during setup -->',
  '<!-- Angles will be added here during onboarding -->'
];

const references = {
  _resolve(file) {
    return REF_FILES[file] ? path.join(REFS_DIR, REF_FILES[file]) : path.join(REFS_DIR, `${file}.md`);
  },
  get(file) {
    const filePath = this._resolve(file);
    if (!fs.existsSync(filePath)) {
      console.log(JSON.stringify({ exists: false, file }));
      return;
    }
    console.log(fs.readFileSync(filePath, 'utf8'));
  },
  init() {
    if (!fs.existsSync(REFS_DIR)) {
      fs.mkdirSync(REFS_DIR, { recursive: true });
    }
    for (const tpl of ['stories.md', 'cover-letter-guide.md', 'angles.md']) {
      const dest = path.join(REFS_DIR, tpl);
      if (!fs.existsSync(dest)) {
        const src = path.join(TEMPLATES_DIR, tpl);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
    console.log(JSON.stringify({ ok: true, dir: REFS_DIR }));
  },
  exists(file) {
    const filePath = this._resolve(file);
    const exists = fs.existsSync(filePath);
    let hasContent = false;
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf8');
      hasContent = content.includes('##') && !EMPTY_MARKERS.some(m => content.includes(m));
    }
    console.log(JSON.stringify({ exists, hasContent, file, path: filePath }));
  },
  append(file, content) {
    const filePath = this._resolve(file);
    if (!fs.existsSync(REFS_DIR)) fs.mkdirSync(REFS_DIR, { recursive: true });
    // Ensure file exists (init from template if not)
    if (!fs.existsSync(filePath)) this.init();
    let existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    // Strip placeholder comments on first real write
    for (const marker of EMPTY_MARKERS) {
      existing = existing.replace('\n' + marker, '');
    }
    // Convert literal \n sequences to real newlines (from CLI args)
    const normalized = content.replace(/\\n/g, '\n');
    fs.writeFileSync(filePath, existing.trimEnd() + '\n\n---\n\n' + normalized + '\n');
    console.log(JSON.stringify({ ok: true, file, path: filePath }));
  }
};

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function usage() {
  console.log(`
jobless-tools — CLI backbone for the Jobless apply framework

Usage: node jobless-tools.cjs <command> <subcommand> [args...]

Commands:

  profile get [field]                    Read profile field or full profile
  profile set <field> <value>            Update a profile field
  profile show                           Display formatted profile

  resume show                            Display parsed resume summary

  answers list [--category <cat>]        List saved answers
  answers add <pattern> <answer> [cat]   Add answer to bank
  answers remove <index>                 Remove answer by index
  answers search <question_text>         Find matching answers
  answers mark-used <index>              Increment usage counter

  history add <json_data>                Save new application record
  history list [--stage <stage>]         List applications by stage
  history get <id>                       Get full application details
  history update <id> <field> <value>    Update application field
  history stats                          Pipeline statistics
  history export [--format csv|json]     Export all applications

  state create <json_data>               Create new in-progress application
  state event <id> <event_name>          Add timeline event
  state update <id> <section> <data>     Update application section

  app create <company> <title> <url>     Create application folder + STATE.md
  app list [--stage <stage>]             List all application folders
  app get <id>                           Get application details + progress
  app update <id> <field> <value>        Update STATE.md frontmatter field
  app write <id> <filename> <content>    Write markdown file into app folder
  app read <id> <filename>               Read markdown file from app folder
  app stats                              Folder-based pipeline statistics
  app find <url_or_company>             Fuzzy lookup — strips UTM params, matches by domain or company name
  app note <id> <text>                   Append a timestamped note to conversation_notes in STATE.md
  app log <id> <event> [notes]           Append a row to LOG.md (applied, recruiter screen, rejected, etc.)
  app insights <id> <company> <title> <angle> [notable]  Append row to ~/.jobless/insights.md

  references get <file>                  Read references file (stories|guide|angles)
  references init                        Create empty reference templates
  references exists <file>               Check if reference file exists + has content
  references append <file> <content>     Append a new entry to a references file (stories|angles)

  config get [key]                       Read config value
  config set <key> <value>               Write config value
  config init                            Initialize config
  config check-browser                   Check browser tool availability

  util slug <text>                       Generate URL-safe slug
  util timestamp                         Current ISO timestamp
`);
}

try {
  switch (command) {
    case 'profile':
      switch (subcommand) {
        case 'get': profile.get(args[2]); break;
        case 'set': profile.set(args[2], args.slice(3).join(' ')); break;
        case 'show': profile.show(); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'resume':
      switch (subcommand) {
        case 'show': {
          const fs = require('fs');
          const path = require('path');
          const resumePath = path.join(require('os').homedir(), '.jobless', 'resume-parsed.json');
          if (fs.existsSync(resumePath)) {
            console.log(fs.readFileSync(resumePath, 'utf8'));
          } else {
            console.log('No parsed resume found. Run /jobless:setup first.');
          }
          break;
        }
        default: usage(); process.exit(1);
      }
      break;

    case 'answers':
      switch (subcommand) {
        case 'list': {
          const catIdx = args.indexOf('--category');
          const cat = catIdx !== -1 ? args[catIdx + 1] : null;
          answers.list(cat);
          break;
        }
        case 'add': answers.add(args[2], args[3], args[4], args[5]); break;
        case 'remove': answers.remove(args[2]); break;
        case 'search': answers.search(args.slice(2).join(' ')); break;
        case 'mark-used': answers.markUsed(args[2]); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'history':
      switch (subcommand) {
        case 'add': history.add(args.slice(2).join(' ')); break;
        case 'list': {
          const stageIdx = args.indexOf('--stage');
          const stg = stageIdx !== -1 ? args[stageIdx + 1] : null;
          history.list(stg);
          break;
        }
        case 'get': history.get(args[2]); break;
        case 'update': history.update(args[2], args[3], args.slice(4).join(' ')); break;
        case 'stats': history.stats(); break;
        case 'export': {
          const fmtIdx = args.indexOf('--format');
          const fmt = fmtIdx !== -1 ? args[fmtIdx + 1] : 'json';
          history.exportData(fmt);
          break;
        }
        default: usage(); process.exit(1);
      }
      break;

    case 'state':
      switch (subcommand) {
        case 'create': state.createApplication(JSON.parse(args.slice(2).join(' '))); break;
        case 'event': state.addTimelineEvent(args[2], args[3]); break;
        case 'update': state.updateSection(args[2], args[3], args.slice(4).join(' ')); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'config':
      switch (subcommand) {
        case 'get': config.get(args[2]); break;
        case 'set': config.set(args[2], args.slice(3).join(' ')); break;
        case 'init': config.init(); break;
        case 'check-browser': config.checkBrowser(); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'app':
      switch (subcommand) {
        case 'create': app.create(args[2], args[3], args[4]); break;
        case 'list': {
          const stageIdx = args.indexOf('--stage');
          app.list(stageIdx !== -1 ? args[stageIdx + 1] : null);
          break;
        }
        case 'get': app.get(args[2]); break;
        case 'update': app.updateState(args[2], args[3], args.slice(4).join(' ')); break;
        case 'write': app.writeFile(args[2], args[3], args.slice(4).join(' ')); break;
        case 'read': app.readFile(args[2], args[3]); break;
        case 'stats': app.stats(); break;
        case 'find': app.find(args.slice(2).join(' ')); break;
        case 'note': app.appendNote(args[2], args.slice(3).join(' ')); break;
        case 'insights': app.appendToInsights(args[2], args[3], args[4], args[5], args[6]); break;
        case 'log': app.logEvent(args[2], args[3], args.slice(4).join(' ')); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'references':
      switch (subcommand) {
        case 'get': references.get(args[2]); break;
        case 'init': references.init(); break;
        case 'exists': references.exists(args[2]); break;
        case 'append': references.append(args[2], args.slice(3).join(' ')); break;
        default: usage(); process.exit(1);
      }
      break;

    case 'util':
      switch (subcommand) {
        case 'slug': state.slug(args.slice(2).join(' ')); break;
        case 'timestamp': state.timestamp(); break;
        default: usage(); process.exit(1);
      }
      break;

    default:
      usage();
      process.exit(args.length === 0 ? 0 : 1);
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}
