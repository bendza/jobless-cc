# Apply Workflow

Guide the user through applying to a single job: research the company, analyze fit, discuss strategy, rewrite resume, generate cover letter, fill the application form, and track the result.

## Core Principle

This is a CONVERSATION, not a pipeline. Ask questions. Listen to answers. Adapt. The user is the decision-maker — Claude is the advisor and executor.

---

## When Things Fail

If any step fails (WebFetch can't load, CLI errors, MCP unavailable):
- Tell the user what failed in one sentence
- Log it: `node .claude/jobless/bin/jobless-tools.cjs app log <id> "Failed: <step>" "<error>"`
- Continue with the obvious fallback (ask user to paste content, skip optional step, etc.)

Never block the whole session over one failed step.

---

## Preamble: Job Selection

**If a URL was provided as an argument** (`/jobless:apply <url>`): use that URL, set `job_id = null` unless it can be resolved later.

**If no URL was provided** (`/jobless:apply` with no args):

Check if MCP is connected:
```bash
node .claude/jobless/bin/jobless-tools.cjs config get jobless_token
```

If connected: call `mcp__jobless__list_bookmarked_jobs()` and present the results:
```
Your bookmarked jobs:
  1. Software Engineer @ Acme (Remote)
  2. Backend Engineer @ Startup (SF)
  3. ...

Which one do you want to apply to?
```
User picks → use that job's `url` and store `job_id` for later MCP calls (resume save, cover letter, tracking).

If not connected or bookmarks are empty: ask "Paste the job URL:"

---

## Required Reading

Before starting, load user context:
```bash
node .claude/jobless/bin/jobless-tools.cjs profile get
node .claude/jobless/bin/jobless-tools.cjs config get
```

Also read these files if they exist:
- `~/.jobless/resume-parsed.json` (user's current resume data)
- `~/.jobless/answers.json` (saved answers for form fields)
- `.claude/jobless/references/human-voice-guide.md` (writing rules)

Load reference files (these make cover letters and angles much better):
```bash
node .claude/jobless/bin/jobless-tools.cjs references exists stories
node .claude/jobless/bin/jobless-tools.cjs references exists guide
node .claude/jobless/bin/jobless-tools.cjs references exists angles
```

If any reference exists with content, read it now:
```bash
node .claude/jobless/bin/jobless-tools.cjs references get stories
node .claude/jobless/bin/jobless-tools.cjs references get guide
node .claude/jobless/bin/jobless-tools.cjs references get angles
```

If profile doesn't exist or setup isn't complete, tell the user:
"Run /jobless:setup first to set up your profile and resume."

---

## Step 0: Resume Detection

Before reading the job, use fuzzy lookup to check if we've started this application before:
```bash
node .claude/jobless/bin/jobless-tools.cjs app find "<url>"
```

This strips UTM params and tracking codes before comparing, so `?utm_source=linkedin` won't create duplicates.

**If the result array has an entry with `confidence > 0.8`:**
Read the existing STATE.md to get current_step and conversation_notes:
```bash
node .claude/jobless/bin/jobless-tools.cjs app get <id>
```

Ask: "I see you started applying to [company] on [date]. You're at the '[current_step]' step. Resume from there? [Yes / Start fresh]"

If resuming:
1. Read JOB.md, RESEARCH.md, MATCH.md, RESUME.md, LOG.md (whichever exist) from `~/.jobless/applications/<id>/`
2. Read STATE.md directly for `chosen_angle` and `conversation_notes`
3. Show the user:

```
Picking up where we left off:
  Job: [title] @ [company]
  Last step: [current_step]
  Chosen angle: [chosen_angle or 'not chosen yet']
  Notes from last session: [conversation_notes or 'none']
  Files ready: [list what exists]

Continue from [next step]? Or jump to a specific step?
```

4. Wait for user confirmation before proceeding.

**If no match (empty array or all confidence ≤ 0.8):**
Create a new application folder immediately:
```bash
node .claude/jobless/bin/jobless-tools.cjs app create "<company>" "<title>" "<url>"
```
Save the returned `id` — use it for all subsequent file writes and state updates.

If `job_id` is known (came from bookmarked jobs):
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> job_id <job_id>
```

---

## Step 1: Read the Job

Read the job posting from the provided URL using WebFetch.

If WebFetch fails (login wall, JS-rendered page, empty content):
"This page needs authentication or JavaScript to load. Please open it in your browser, copy the full job description, and paste it here."

Extract and present:
- Job title, company, location, remote/hybrid/onsite
- Tech stack / requirements (split must-haves vs nice-to-haves)
- Seniority level
- Key responsibilities
- Team info if mentioned

Write extracted job description to the application folder:
```
Write to: ~/.jobless/applications/<id>/JOB.md

Format:
# Job: <title> @ <company>

## Overview
- **Title**: ...
- **Company**: ...
- **Location**: ...
- **Type**: Remote / Hybrid / Onsite

## Requirements
### Must-have
- ...

### Nice-to-have
- ...

## Responsibilities
- ...

## Stack / Tech
- ...

## Notes
[Anything unusual or interesting from the posting]
```

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step job_read
```

---

## Step 2–3: Parallel Research & Analysis

After JOB.md is written, spawn three agents simultaneously (single message, three Task calls):

**Agent A — Company Researcher** (`sonnet`)
Context to pass in prompt:
- app_id, app_dir (`~/.jobless/applications/<id>/`)
- Read JOB.md for company name, role, context
Task: WebSearch company overview, funding, engineering blog, recent news, culture signals, hiring person
Output: write `~/.jobless/applications/<id>/RESEARCH.md` using the existing format

**Agent B — Match Analyzer** (`sonnet`)
Context to pass in prompt:
- app_id, app_dir
- Read JOB.md (requirements) and `~/.jobless/resume-parsed.json` (user's experience)
- Read `~/.jobless/references/stories.md` if it exists
Task: Compare resume vs requirements, identify strengths/gaps/keywords, flag relevant stories, suggest 3 positioning angles
Output: write `~/.jobless/applications/<id>/MATCH.md` using the existing format

**Agent C — Salary Researcher** (`haiku`)
Context to pass in prompt:
- app_id, app_dir
- Read JOB.md for: role title, seniority level, company name, location/remote
- Check config: `node .claude/jobless/bin/jobless-tools.cjs config get browser_tool`
Task:
  1. WebSearch: "[role] [company] salary 2026", "[role] h1b salary [company]", "[role] [location] salary range 2026"
  2. WebSearch: "site:levels.fyi [company] [role]", "site:glassdoor.com [company] [role] salary"
  3. Check job posting itself for stated salary range (already in JOB.md Notes)
  4. If browser_tool != "none": open Chrome tab → navigate glassdoor.com → search for [company] [role] salaries → read visible data
Output: write `~/.jobless/applications/<id>/SALARY.md`

SALARY.md format:
```
# Salary Research: <title> @ <company>

## Stated range
[From job posting, or "Not stated"]

## Market data
| Source | Role | Location | Range | Notes |
|--------|------|----------|-------|-------|
| Glassdoor | ... | ... | $X–$Y | ... |
| H1B data | ... | ... | $X | Median filing |
| Levels.fyi | ... | ... | $X–$Y | ... |

## Recommendation
**Target**: $X
**Floor**: $Y
**Rationale**: [1-2 sentences]
```

Wait for all three agents to complete, then read RESEARCH.md, MATCH.md, SALARY.md from disk.

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step researched_and_matched
```

---

## Step 4: Discuss with User

Present the unified research summary from the three agent outputs (RESEARCH.md, MATCH.md, SALARY.md), then open the strategy discussion.

Also present the salary benchmark from SALARY.md:
"Market rate for this role: [range from SALARY.md recommendation]
 The job [states / doesn't state] a range[: $X–$Y].
 Does this align with your expectations? Any constraints I should know?"

Ask: "Which angle resonates? Or tell me what you want to emphasize."

Follow-up questions to consider:
- "Any experience not on your resume that's relevant here?"
- "What excites you most about this role?"
- "Anything you want to downplay or reframe?"

Continue the conversation until the user indicates they're happy with the direction. Listen for signals like "let's go", "sounds good", "that works", etc.

After the angle is confirmed, immediately persist the context so resumed sessions have real starting state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app note <id> "Chosen angle: <angle name> — <one sentence reason>"
node .claude/jobless/bin/jobless-tools.cjs app note <id> "User mentioned: <any experience/constraints/preferences stated during discussion>"
node .claude/jobless/bin/jobless-tools.cjs app update <id> chosen_angle "<angle name>"
```

Then offer:
"Want to save this positioning for future applications to similar roles? [Yes / No]"

If yes, use the CLI (not the Write tool directly):
```bash
node .claude/jobless/bin/jobless-tools.cjs references append angles "## <role type> at <company type>\n**Angle**: <chosen angle>\n**Context**: worked at <company on <date>"
```

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step angle_chosen
```

---

## Step 5: Rewrite Resume

Load `.claude/jobless/references/human-voice-guide.md` for writing rules.

Rewrite ONLY the sections that need changing for this specific application:
- **Summary**: Reframe for this role and company
- **Experience bullets**: Reword to match JD language naturally
- **Skills**: Reorder to prioritize what they're looking for
- **Projects**: Surface or add relevant ones the user mentioned

Show ALL changes inline in the conversation as before/after BEFORE writing to any file:

```
**Summary**
Before: [old summary text]
After: [new summary text]

**[Company] — [Role] bullets**
Before: "Led development of..."
After: "Architected and shipped..."
```

Ask "Look good? Want to adjust anything?" Iterate until the user approves.

Only write RESUME.md after user approves.

If MCP connected and `job_id` known: after approval, call `create_resume_for_job` + `download_resume` to get the PDF.
If no MCP: write RESUME.md only. User handles PDF from their own resume tool.

Rules:
- Never fabricate experience
- If the user mentioned experience not on their resume, add it truthfully
- Keep bullet format consistent with the user's existing style
- Match JD keywords naturally — don't keyword-stuff
- Changes should be minimal and targeted, not a full rewrite

Write to the application folder:
```
Write to: ~/.jobless/applications/<id>/RESUME.md

Format:
# Resume Changes: <title> @ <company>

## Summary
**Before**: [old text]
**After**: [new text]

## Experience Changes

### [Company name] — [Role]
**Before**:
- ...

**After**:
- ...

## Skills reorder
[Old order → new order]
```

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step resume_tailored
```

**If MCP connected and `job_id` is known:**
Push the tailored resume to the platform and download the PDF:
```
mcp__jobless__create_resume_for_job(job_id=<job_id>, resume_data=<updated_parsed_data>)
→ returns {resume_id, title}
```
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> resume_id <resume_id>
```
```
mcp__jobless__download_resume(resume_id=<resume_id>)
→ downloads PDF, returns {path, folder}
```
Tell user: "Resume PDF saved to [path] — ready to upload."

---

## Step 6: Cover Letter (optional)

**If MCP connected and `job_id` is known:**
Ask: "Want a cover letter? [Yes / No]
  If yes — generate via Jobless AI (fast), or I'll draft one based on our conversation?"

If **Jobless AI**:
```
mcp__jobless__generate_cover_letter(job_id=<job_id>, resume_id=<resume_id>)
→ returns {cover_letter_id, content}
```
Present content for review. Let user edit in conversation. When approved, download PDF:
```
mcp__jobless__download_cover_letter(cover_letter_id=<cover_letter_id>, company="<company>", job_title="<title>")
```
Store `cover_letter_id` for Step 8.

If **custom draft**: follow the standard flow below, then save + download:
```
mcp__jobless__create_cover_letter(content="<text>", resume_id=<resume_id>, job_id=<job_id>, company="<company>", position="<title>")
→ returns {cover_letter_id}
mcp__jobless__download_cover_letter(cover_letter_id=<cover_letter_id>, company="<company>", job_title="<title>")
```

---

**If MCP not connected:** Ask: "Want a cover letter? [Yes / No / Short email-style]"

If yes, load reference files to ground the cover letter:
- stories.md → find the most relevant story for this role type
- cover-letter-guide.md → apply user's specific voice rules (overrides human-voice-guide.md)
- angles.md → use the confirmed positioning angle from Step 4
- RESEARCH.md → specific company details to reference

Generate following the loaded voice guide rules:
- Reference specific company details from RESEARCH.md
- Connect user's experience to the company's specific challenges
- If a relevant story exists in stories.md, use it — reference it by name, not just generically
- Keep under 300 words unless user asks for longer
- NO generic phrases — every sentence should be specific to this application

Present the full text. Iterate if the user wants changes.

After approval, ask: "Save this approach to your story bank? (Saves the angle + what worked for this role type) [Yes / No]"

If yes, use the CLI (not the Write tool directly):
```bash
node .claude/jobless/bin/jobless-tools.cjs references append stories "## <Story title>\n**Best for**: <role type>\n**Used at**: <company>, <date>\n**What worked**: <one sentence summary>"
```

Write to the application folder:
```
Write to: ~/.jobless/applications/<id>/COVER_LETTER.md

Format:
# Cover Letter: <title> @ <company>

## Final text
[Approved cover letter]

## References used
- Story: [story title if used]
- Angle: [angle name]
- Voice rules applied: [list]
```

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step cover_letter_written
```

---

## Step 7: Fill Application Form

Check config for browser tool availability:
```bash
node .claude/jobless/bin/jobless-tools.cjs config get browser_tool
```

If `browser_tool` is "none" or null:
"I can't fill the form automatically (no browser tools). Here's a summary of everything for you to fill manually:
  - Your tailored resume changes (apply these to your resume file)
  - Cover letter text (if generated)
  - Suggested answers for common questions"
Skip to Step 8.

### Form Filling Process

a) Navigate to the application URL using the browser tool.

b) **Auth gate check**: If a login wall is detected:
"Please log in to {platform} in the browser, then tell me when you're done."
Wait for user confirmation before continuing.

c) Take a browser snapshot to detect all form fields. Classify each field against the 25 types in `.claude/jobless/references/field-types.md`.

d) Present the plan:
"Found {N} fields:
  {X} standard — auto-fill from your profile
  {Y} custom questions — I'll generate answers
  {Z} file uploads — resume + cover letter
  {W} demographic — skip unless you want to fill"

e) Fill standard fields silently from profile.json.

f) For each custom question:
  1. Check `answers.json` for a regex match:
     ```bash
     node .claude/jobless/bin/jobless-tools.cjs answers search "<question text>"
     ```
  2. If match found, present the saved answer and ask: "Use this / Customize for this company / Write new?"
  3. If no match, generate an answer using JD + resume + angle context, present for approval
  4. After acceptance: "Save this answer for future applications? [Yes / No]"
  5. If yes: `node .claude/jobless/bin/jobless-tools.cjs answers add "<pattern>" "<answer>" "<category>"`

g) Upload files: use browser_file_upload for resume and cover letter PDFs.

h) **Multi-page forms**: After filling visible fields, detect "Next"/"Continue" button. Click, wait for new page, repeat field detection and filling.

i) **STOP before submit**:
"All fields are filled. REVIEW THE FORM IN YOUR BROWSER. Click Submit when you're ready, then tell me."

j) Wait for user to confirm they submitted.

Log form session to the application folder:
```
Write to: ~/.jobless/applications/<id>/FORM.md

Format:
# Form Log: <company>

## Fields filled
| Field | Source | Value |
|-------|--------|-------|
| Name  | profile | John Doe |
| ...   | ...     | ...      |

## Custom questions
### Q: [question]
**Source**: generated / saved bank
**Answer**: [answer]
**Saved to bank**: Yes / No
```

Update state:
```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step form_filled
```

---

## Step 8: Track

**Verification gate — ask before marking applied:**

> "Before I mark this as applied — can you confirm you submitted? Paste the application confirmation number, describe the confirmation page, or just say 'confirmed'."

Wait for user to explicitly confirm. Do NOT run the update commands until confirmed.

After user confirms:

```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> stage applied
node .claude/jobless/bin/jobless-tools.cjs app update <id> applied_at "<ISO timestamp>"
node .claude/jobless/bin/jobless-tools.cjs app update <id> current_step applied
node .claude/jobless/bin/jobless-tools.cjs app log <id> Applied "<platform> — confirmation: <number or 'none'>"
```

Also log to cross-application insights:
```bash
node .claude/jobless/bin/jobless-tools.cjs app insights <id> "<company>" "<title>" "<chosen_angle>" "<hardest question if any>"
```

**If MCP connected and `job_id` is known:** sync to platform:
```
mcp__jobless__track_application(
  job_id=<job_id>,
  stage="applied",
  angle=<chosen_angle>,
  resume_id=<resume_id>,        # if created
  cover_letter_id=<cover_letter_id>  # if created
)
```

Also save to history for backward compat:
```bash
node .claude/jobless/bin/jobless-tools.cjs history add '{"company":"...","title":"...","url":"...","stage":"applied","applied_at":"..."}'
```

Update STATE.md progress checklist — mark all completed steps with [x] by editing the STATE.md file directly (use Write tool to rewrite or Edit tool to update the checkboxes).

Present summary:
"Applied to {company} — {title}. Application folder saved at ~/.jobless/applications/{id}/
 Type /jobless:status to see your pipeline."

---

## Form Filling Rules

- **NEVER** click Submit. The user ALWAYS submits manually.
- For demographic questions (gender, race, veteran, disability): ask user preference. Default to "Prefer not to say" or skip.
- For salary questions: use `profile.salary_range` if set, ask if not.
- For "How did you hear about us?": ask user.
- Save every Q&A pair to FORM.md and offer to save to the answers bank.
- After each custom answer is accepted, offer to save to the answers bank.

## Resume Rewrite Rules

- Never fabricate experience. Only reframe, reword, reorder.
- If user mentions experience not on resume, add it truthfully.
- Keep bullet format consistent with original resume style.
- Match JD keywords naturally — don't keyword-stuff.
- Changes should be minimal and targeted, not a full rewrite.

## Cover Letter Rules (when reference files exist)

- cover-letter-guide.md OVERRIDES human-voice-guide.md for voice/tone rules
- stories.md provides the raw material — pick the most relevant story, don't just reference "my experience"
- angles.md provides proven positioning — use the angle confirmed in Step 4
- Every sentence must be specific to this company/role. No filler.

---

## Sub-agent Prompt Templates

Use these exact prompts when spawning the parallel agents in Step 2–3.

### Agent A: Company Researcher

```
You are researching a company for a job application.

Application: <id>
Application dir: ~/.jobless/applications/<id>/

Read ~/.jobless/applications/<id>/JOB.md first.

Then search the web:
- "{company} company overview funding employees"
- "{company} engineering blog tech stack"
- "{company} recent news 2026"
- "{company} glassdoor culture reviews"
- Find recruiter/hiring manager name from the job posting

Write RESEARCH.md to ~/.jobless/applications/<id>/RESEARCH.md using this format:

# Research: <company>

## What they do
[1-2 sentence summary]

## Stage & size
[Funding, headcount, age]

## Tech stack
[From job posting, engineering blog, or tech signals]

## Recent news
[Last 6 months, anything relevant]

## Culture signals
[From glassdoor, blog posts, job posting language]

## Hiring person
[Name, title, LinkedIn if found]

## Key insights for application
[2-3 specific things to reference in cover letter or conversation]

Write the file and return. Do not interact with the user.
```

### Agent B: Match Analyzer

```
You are analyzing how well a candidate matches a job.

Application: <id>
Application dir: ~/.jobless/applications/<id>/

Read these files:
- ~/.jobless/applications/<id>/JOB.md (requirements)
- ~/.jobless/resume-parsed.json (candidate experience)
- ~/.jobless/references/stories.md (if exists)

Compare requirements against experience. Produce:
- Strengths table (requirement vs match vs evidence)
- Gaps table (requirement vs gap level vs mitigation)
- Keywords to incorporate
- Relevant stories from stories.md (if loaded)
- 3 specific positioning angles

Write MATCH.md to ~/.jobless/applications/<id>/MATCH.md using this format:

# Match Analysis: <title> @ <company>

## Strengths
| Requirement | Your match | Evidence |
|-------------|-----------|----------|
| ...         | Strong    | ... |

## Gaps
| Requirement | Gap level | Mitigation |
|-------------|-----------|-----------|
| ...         | Partial   | ... |

## Keywords to incorporate
- ...

## Relevant stories from your bank
[If stories.md exists, list matching stories by title]

## Positioning angles
### Angle 1: [Name]
[Specific strategy]

### Angle 2: [Name]
[Specific strategy]

### Angle 3: [Name]
[Specific strategy]

Write the file and return. Do not interact with the user.
```

### Agent C: Salary Researcher

```
You are researching market salary for a job role.

Application: <id>
Application dir: ~/.jobless/applications/<id>/

Read ~/.jobless/applications/<id>/JOB.md. Extract: role title, seniority, company name, location/remote.

Check browser availability:
node .claude/jobless/bin/jobless-tools.cjs config get browser_tool

Research steps:
1. WebSearch: "[role] [company] salary 2026"
2. WebSearch: "[role] h1b salary [company]" (check h1bdata.info results)
3. WebSearch: "[role] [location or remote] salary range 2026"
4. WebSearch: "site:glassdoor.com [company] [role] salary"
5. Check JOB.md Notes section for any stated salary range
6. If browser_tool != "none":
   - Create a Chrome tab
   - Navigate to glassdoor.com and search for [company] [role] salaries
   - Read visible salary data (user may already be logged in)

Write SALARY.md to ~/.jobless/applications/<id>/SALARY.md using this format:

# Salary Research: <title> @ <company>

## Stated range
[From job posting, or "Not stated"]

## Market data
| Source | Role | Location | Range | Notes |
|--------|------|----------|-------|-------|
| Glassdoor | ... | ... | $X–$Y | ... |
| H1B data | ... | ... | $X | Median filing |
| Levels.fyi | ... | ... | $X–$Y | ... |

## Recommendation
**Target**: $X
**Floor**: $Y
**Rationale**: [1-2 sentences]

Write the file and return. Do not interact with the user.
```
