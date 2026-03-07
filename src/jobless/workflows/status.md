# Status Workflow

Show the user their application pipeline and let them update statuses.

## Step 1: Load Applications

Load all application records:
```bash
node .claude/jobless/bin/jobless-tools.cjs history list
node .claude/jobless/bin/jobless-tools.cjs history stats
```

Group applications by stage:
- `applied` — awaiting response
- `interview` — in process
- `offer` — received offer
- `rejected` — rejected or no response
- `withdrawn` — user withdrew

Sort within groups by date (newest first).

## Step 2: Display Pipeline

Present as a grouped visual pipeline:

```
YOUR JOB PIPELINE

APPLIED (N)
├─ Company — Title                       Date   ·  awaiting response
└─ Company — Title                       Date   ·  awaiting response

INTERVIEW (N)
└─ Company — Title                       Date   ·  stage details

OFFER (N)
└─ Company — Title                       Date   ·  offer details

REJECTED (N)
├─ Company — Title                       Date   ·  rejected Date
└─ Company — Title                       Date   ·  no response (N days)

WITHDRAWN (N)
└─ Company — Title                       Date   ·  withdrew Date

──────────────────────────────────────────────
Total: N applications  |  Response rate: X%
This week: N applied
```

If no applications exist:
"No applications tracked yet. Use /jobless:apply <job-url> to apply to your first job."

## Step 3: Update Prompt

Ask: "Want to update any status? Type a company name, or 'done'."

If user names a company:
1. Find the matching application(s). If multiple matches, ask which one.
2. Ask: "What happened?" with options:
   - Got interview
   - Got offer
   - Rejected
   - No response
   - Withdrew
3. Update the record:
   ```bash
   node .claude/jobless/bin/jobless-tools.cjs history update "<id>" stage "<new_stage>"
   node .claude/jobless/bin/jobless-tools.cjs history update "<id>" response.status "<status>"
   ```
4. Ask for optional notes (salary details for offers, interview round, etc.)
5. If notes provided:
   ```bash
   node .claude/jobless/bin/jobless-tools.cjs history update "<id>" response.notes "<notes>"
   ```
6. Show the updated pipeline

Loop until user says "done" or similar.

## Stage Mappings

| User says | stage value | response.status |
|-----------|-------------|-----------------|
| "Got interview" | interview | interview |
| "Got offer" | offer | offer |
| "Rejected" | rejected | rejected |
| "No response" | rejected | no_response |
| "Withdrew" | withdrawn | withdrawn |
