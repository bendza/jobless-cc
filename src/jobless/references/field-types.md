# Application Form Field Types

25 standard field types that Claude should recognize and classify when filling application forms.

## Standard Identity Fields (auto-fill from profile.json)

| Type | Patterns | Source |
|------|----------|--------|
| `first_name` | "First name", "Given name" | profile.first_name |
| `last_name` | "Last name", "Surname", "Family name" | profile.last_name |
| `full_name` | "Full name", "Name" | profile.full_name |
| `email` | "Email", "Email address" | profile.email |
| `phone` | "Phone", "Phone number", "Mobile" | profile.phone |
| `linkedin` | "LinkedIn", "LinkedIn URL", "LinkedIn profile" | profile.linkedin |
| `website` | "Website", "Portfolio", "Personal URL" | profile.website |
| `location` | "Location", "City", "Address" | profile.location |

## File Upload Fields

| Type | Patterns | Action |
|------|----------|--------|
| `resume_upload` | "Resume", "CV", "Upload resume" | Upload resume PDF |
| `cover_letter_upload` | "Cover letter", "Upload cover letter" | Upload cover letter PDF |
| `other_upload` | "Additional documents", "Portfolio" | Ask user |

## Common Structured Fields

| Type | Patterns | Source |
|------|----------|--------|
| `salary` | "Salary", "Compensation", "Expected salary", "Pay expectations" | profile.salary_range |
| `work_auth` | "Authorized to work", "Work authorization", "Legally authorized", "Sponsorship" | profile.work_authorization |
| `start_date` | "Start date", "Availability", "When can you start" | Ask user |
| `years_experience` | "Years of experience", "How many years" | Derive from resume |
| `referral` | "How did you hear", "Referral", "Source" | Ask user |

## Demographic Fields (optional — default to skip or "Prefer not to say")

| Type | Patterns | Action |
|------|----------|--------|
| `gender` | "Gender", "Gender identity" | Ask user preference |
| `race_ethnicity` | "Race", "Ethnicity", "Racial background" | Ask user preference |
| `veteran_status` | "Veteran", "Military service" | Ask user preference |
| `disability` | "Disability", "Accommodation" | Ask user preference |

## Custom/AI-Generated Fields

| Type | Patterns | Action |
|------|----------|--------|
| `motivation` | "Why interested", "Why apply", "Why this role" | Check answers bank, then generate |
| `experience_question` | "Tell us about a time", "Describe your experience with" | Generate from resume context |
| `technical_question` | "What is your experience with [tech]" | Generate from resume skills |
| `culture_fit` | "What values", "Work environment preference" | Check answers bank, then generate |
| `custom_text` | Any other free-text field | Generate contextually |

## Classification Rules

When encountering a form field, classify it by:

1. **Label text** — match against the patterns above (case-insensitive)
2. **Input type** — `file` inputs are uploads, `select` are dropdowns, `textarea` are long-form
3. **Placeholder text** — often contains hints about expected format
4. **Field name/id** — HTML attributes like `name="first_name"` or `id="salary"`
5. **Surrounding context** — section headers like "Personal Information" or "Diversity"

## Auto-fill Priority

1. Exact match in profile.json → fill silently
2. Match in answers.json → present saved answer, ask to use/customize
3. No match → generate answer, present for approval, offer to save
