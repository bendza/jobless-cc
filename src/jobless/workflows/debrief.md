# Debrief Workflow

Capture what happened in an interview round and update the application log.

Run after any interview: recruiter screen, technical screen, take-home, onsite, or outcome.

---

## Step 0: Load Application Context

```bash
node .claude/jobless/bin/jobless-tools.cjs app get <id>
```

Read existing LOG.md if it exists:
```bash
node .claude/jobless/bin/jobless-tools.cjs app read <id> LOG.md
```

Show the user: "Here's your log for [company] so far: [summary of existing entries]"

---

## Step 1: What Happened?

Ask: "What round was this? (recruiter screen / technical / take-home / onsite / final / offer / rejection)"

Then based on round type, ask targeted questions one at a time:

### Recruiter screen
- "How long? Who was it with — recruiter, HR, or hiring manager?"
- "What did they ask? (role, salary, timeline, motivation)"
- "What's the next step they mentioned?"
- "How did it feel? Any concerns?"

### Technical screen
- "Format — coding, system design, or mixed?"
- "What problems did they give you? (describe the questions)"
- "How did you do? What would you do differently?"
- "Any feedback or signals on how it went?"

### Take-home / assignment
- "What was the task?"
- "How long did it take vs the estimate they gave?"
- "What did you build / write? Any tradeoffs you made?"
- "Still waiting for feedback or already heard back?"

### Onsite / final rounds
- "How many rounds? Who did you meet?"
- "Walk me through each round — what was asked"
- "Which round felt strongest? Which felt weakest?"
- "Any curveball questions you didn't expect?"
- "What signals did you get from the interviewers?"

### Offer
- "What's the offer? (base, equity, bonus, level, start date)"
- "Timeline to respond?"
- "Anything unclear or missing from the offer?"

### Rejection
- "How did they communicate it? (email, call)"
- "Did they give a reason?"
- "How far did you get?"

---

## Step 2: Log the Event

```bash
node .claude/jobless/bin/jobless-tools.cjs app log <id> "<Round type>" "<1-line summary>"
```

Example:
```bash
node .claude/jobless/bin/jobless-tools.cjs app log <id> "Technical screen" "90min. Two LC mediums + system design (URL shortener). Felt solid."
```

---

## Step 3: Write DEBRIEF.md

Append to `~/.jobless/applications/<id>/DEBRIEF.md` (create if doesn't exist):

```markdown
## [Round type] — [Date]

**With**: [name/title if known]
**Duration**: [X min]

### What they asked
[Full list of questions / problems]

### How it went
[Honest self-assessment]

### What to do differently
[Specific improvements for next round]

### Signals
[Any feedback, tone, comments from interviewers]

### Next step
[What they said happens next, timeline]

---
```

```bash
node .claude/jobless/bin/jobless-tools.cjs app write <id> DEBRIEF.md "<content>"
```

---

## Step 4: Update Stage

Based on what happened, update the stage:

| Outcome | Stage to set |
|---------|-------------|
| Screen passed, next round scheduled | `interviewing` |
| Onsite done, waiting | `interviewing` |
| Offer received | `offer` |
| Rejected | `rejected` |
| Withdrawn | `withdrawn` |

```bash
node .claude/jobless/bin/jobless-tools.cjs app update <id> stage <stage>
```

Also check off the relevant box in the Interview Progress section of STATE.md.

---

## Step 5: Offer path (if applicable)

If stage is now `offer`, ask:
"Want to evaluate the offer now? Run `/jobless:offer <id>` when you're ready — it'll break down total comp, equity, and compare to market."

---

## Step 6: Prep for next round (if applicable)

If there's another round coming, ask:
"Want to run `/jobless:prep <id>` to prep for the next round? I can generate likely questions based on the role and what's come up so far."
