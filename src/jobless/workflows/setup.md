# Setup Workflow

First-run setup: provide resume, extract profile, confirm details, check browser tools, build story bank and voice guide.

---

## Step 0: Check Jobless MCP (optional)

Jobless has an optional MCP server that lets this workflow pull the user's resume directly instead of asking for a file path. It's **not required** — the workflow works fine without it.

**Check if MCP is connected:**

Look at the tool list for this session. If tools like `mcp__jobless__get_resume` are available, MCP is connected — you can use them in Step 2 below. If not, skip to Step 1 and the user will provide a resume file manually.

**If the user asks about connecting Jobless MCP:**

Tell them: "Visit https://jobless.dev/mcp — sign in with your Jobless account, copy the one-line install command for your Claude client (Claude Code, Desktop, or Cursor), paste it into your terminal, then restart Claude Code. You'll get personalized job matches, resume data, and profile status right inside Claude. Free tier includes 100 matches per day."

**Do not try to install MCP from this workflow.** The old venv-based install at `~/.jobless/mcp/` is deprecated. The MCP is now a hosted service at `mcp.jobless.dev` (open source at https://github.com/bendza/jobless-mcp).

Proceed to Step 1.

---

## Step 1: Check Existing Setup

Check if `~/.jobless/profile.json` exists and has data:
```bash
node .claude/jobless/bin/jobless-tools.cjs profile get full_name
```

If the profile already has a name set, ask:
"You already have a profile set up. Want to update it? [Yes / No]"
If no, skip to Step 7 (Reference file status).

## Step 2: Get Resume

**If MCP is connected:**
```
mcp__jobless__get_resume()
```
This returns the primary resume with full `parsed_data`. Use that as the resume source — skip asking the user for a file. Save the returned `resume_id` for later steps.

**If MCP is not connected:**
Ask: "I need your resume to get started. Either:
  1. Give me the path to a PDF (e.g., ~/Documents/resume.pdf)
  2. Paste the text directly here"

If file path: use the Read tool (Claude has native PDF support).
If pasted text: use directly.

## Step 3: Extract Everything from Resume

Parse the resume and extract TWO things at once:

### A. Profile info (auto-fill instead of asking)
Extract from the resume:
- full_name, first_name, last_name
- email
- phone
- linkedin (if present)
- website (if present)
- location

Save each field:
```bash
node .claude/jobless/bin/jobless-tools.cjs profile set full_name "John Doe"
node .claude/jobless/bin/jobless-tools.cjs profile set first_name "John"
node .claude/jobless/bin/jobless-tools.cjs profile set last_name "Doe"
node .claude/jobless/bin/jobless-tools.cjs profile set email "john@email.com"
node .claude/jobless/bin/jobless-tools.cjs profile set phone "+1-555-0123"
node .claude/jobless/bin/jobless-tools.cjs profile set linkedin "https://linkedin.com/in/johndoe"
node .claude/jobless/bin/jobless-tools.cjs profile set location "San Francisco, CA"
```

### B. Structured resume data
Extract into this format:
```json
{
  "summary": "...",
  "skills": {
    "technical": ["..."],
    "soft": ["..."]
  },
  "experience": [
    {
      "company": "...",
      "title": "...",
      "dates": "...",
      "bullets": ["..."]
    }
  ],
  "education": [...],
  "projects": [...],
  "certifications": [...]
}
```

Save to `~/.jobless/resume-parsed.json` using the Write tool.

## Step 4: Present and Confirm

Show everything extracted in one view:

"Here's what I pulled from your resume:

  **Profile**
  Name: John Doe
  Email: john@email.com
  Phone: +1-555-0123
  LinkedIn: linkedin.com/in/johndoe
  Location: San Francisco, CA

  **Resume**
  Current role: Senior Backend Engineer at Current Corp
  Skills: Go, Python, PostgreSQL, Docker, gRPC
  Experience: 3 positions
  Education: BS Computer Science, MIT

  Anything wrong or missing?"

Let the user correct anything. Update fields as needed.

Then ask only what the resume CAN'T tell us (2-3 questions max):
- "Work authorization status? (e.g., US Citizen, H1B, Green Card)"
- "Salary range you're targeting? (optional — helps auto-fill forms)"

Save these:
```bash
node .claude/jobless/bin/jobless-tools.cjs profile set work_authorization "US Citizen"
node .claude/jobless/bin/jobless-tools.cjs profile set salary_range "$180,000 - $210,000"
node .claude/jobless/bin/jobless-tools.cjs profile set resume_parsed_at "<timestamp>"
```

## Step 5: Optional Story Session

After confirming profile, offer — don't require:

> "Your profile is set up. Optionally, I can ask you a few questions to build a story bank — this makes cover letters sound like you instead of generic AI. Takes about 5 minutes.
> Want to do it now, or skip and add stories later? [Now / Skip]"

### If skip:
Initialize empty reference files and move on. The apply workflow will work with resume only (current behavior). User can always run `/jobless:setup` again to add stories later.
```bash
node .claude/jobless/bin/jobless-tools.cjs references init
```

### If now:
Ask these questions one at a time, conversationally. Wait for a real answer before moving to the next.

1. "What's the hardest technical problem you've solved? Walk me through what actually happened — the context, what you tried, what broke, and how you got unstuck."

2. "Something you built that you're genuinely proud of — not the most impressive to a recruiter, the one that felt right. What made it feel that way?"

3. "Any experience not on your resume — side projects, something you built for fun, a problem you solved outside of work?"

After each answer, ask a brief follow-up if the story is vague: "What was the outcome?", "What was the hardest part?", "How long did it take?"

Then synthesize into STAR format and write to `~/.jobless/references/stories.md`:

```markdown
# Story Bank

## Story 1: [Short title]
**Context**: [When/where this happened]
**Situation**: [What the problem or challenge was]
**Task**: [What you were responsible for]
**Action**: [What you specifically did — concrete steps]
**Result**: [Outcome, metrics if available]
**Best for**: [startup / scale / leadership / technical depth / ownership]

---

## Story 2: [Short title]
...
```

Use the Write tool to write directly to `~/.jobless/references/stories.md`.

Show the user a summary: "I've saved 2 stories to your story bank. Here's what I captured: [brief list]"

## Step 6: Optional Voice Questions

After stories (or immediately after profile if stories were skipped), offer:

> "Quick voice questions? These make cover letters sound specifically like you, not generic AI. [Yes / Skip]"

### If yes:
Ask these one at a time:

1. "What's one thing you hate about typical cover letters? (The thing that makes you cringe when you read them)"

2. "A good cover letter should make the reader feel ___"

3. "How would you describe your communication style in 3 words?"

Synthesize into a voice guide and write to `~/.jobless/references/cover-letter-guide.md`:

```markdown
# Cover Letter Voice Guide

## What I always avoid
[Derived from hates — specific things to never do]

## What I want the reader to feel
[From their answer]

## Tone
[From communication style — e.g., "Direct and honest. No hedging."]

## Rules specific to me
- [Rule 1 extracted from answers]
- [Rule 2 extracted from answers]
```

Use the Write tool to write directly to `~/.jobless/references/cover-letter-guide.md`.

## Step 5b: Check Browser Tools

Check for available browser automation tools. Look for:
- `mcp__playwright__browser_snapshot` — Playwright MCP
- `mcp__claude-in-chrome__read_page` — Claude in Chrome

If Playwright is available:
```bash
node .claude/jobless/bin/jobless-tools.cjs config set browser_tool "playwright"
```

If Claude in Chrome is available:
```bash
node .claude/jobless/bin/jobless-tools.cjs config set browser_tool "claude-in-chrome"
```

If both are available, prefer Playwright.

If neither:
"No browser tools detected. You can still generate tailored resumes and cover letters, but I won't be able to auto-fill application forms. To enable form filling, install the Playwright MCP server."
```bash
node .claude/jobless/bin/jobless-tools.cjs config set browser_tool "none"
```

## Step 7: Finalize

```bash
node .claude/jobless/bin/jobless-tools.cjs config set setup_complete true
node .claude/jobless/bin/jobless-tools.cjs config init
```

Check reference file status:
```bash
node .claude/jobless/bin/jobless-tools.cjs references exists stories
node .claude/jobless/bin/jobless-tools.cjs references exists guide
node .claude/jobless/bin/jobless-tools.cjs references exists angles
```

Print setup summary:
```
Setup complete!
  Profile: ✓ (name, email, location, work auth)
  Resume: ✓ (parsed and saved)
  Stories: ✓ N stories saved / ○ not set up (run /jobless:setup to add)
  Voice guide: ✓ saved / ○ not set up
  Angles: ○ builds automatically as you apply

You can now:
  /jobless:apply <job-url>  — Apply to a job
  /jobless:status           — View your application pipeline
```

## Re-run behavior

If `/jobless:setup` is run when stories already exist, show the current story bank summary and offer:
"Add a new story / Update voice guide / Skip"
Skip Steps 2-4 (resume already extracted). Jump directly to Step 5 with context about what's already there.
