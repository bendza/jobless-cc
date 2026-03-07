# Platform Mappings

CSS selectors and interaction patterns for common ATS platforms.

## Greenhouse

**URL patterns**: `boards.greenhouse.io/*`, `job-boards.greenhouse.io/*`, `*.greenhouse.io/embed/*`

**Application form selectors**:
```
Form container:     #application_form, .application-form
First name:         #first_name, input[name="job_application[first_name]"]
Last name:          #last_name, input[name="job_application[last_name]"]
Email:              #email, input[name="job_application[email]"]
Phone:              #phone, input[name="job_application[phone]"]
LinkedIn:           input[name*="linkedin"], input[autocomplete="url"]
Resume upload:      input[type="file"]#resume, .attach-or-paste input[type="file"]
Cover letter:       input[type="file"]#cover_letter, textarea#cover_letter
Custom questions:   .field .application-field, [data-field-type="custom"]
Submit button:      input[type="submit"]#submit_app, button[type="submit"]
```

**Multi-page**: Greenhouse typically uses single-page forms.

**Notes**:
- Resume can be pasted as text OR uploaded as file
- Custom questions use various input types (text, textarea, select, checkbox)
- Demographic questions are in a separate section at the bottom

## Lever

**URL patterns**: `jobs.lever.co/*`, `*.lever.co/*`

**Application form selectors**:
```
Form container:     .application-form, form.template-btn-submit
First name:         input[name="name"]  (full name, single field)
Email:              input[name="email"]
Phone:              input[name="phone"]
LinkedIn:           input[name="urls[LinkedIn]"]
Website:            input[name="urls[Portfolio]"], input[name="urls[Other]"]
Resume upload:      input[name="resume"], .resume-upload input[type="file"]
Cover letter:       textarea[name="comments"]
Custom questions:   .application-question, [data-qa="question"]
Submit button:      button.template-btn-submit, button[type="submit"]
```

**Notes**:
- Lever uses full name (single field), not first/last split
- LinkedIn and website are under "Web" section with labeled URL fields
- Cover letter is typically a textarea, not a file upload

## Ashby

**URL patterns**: `jobs.ashbyhq.com/*`, `*.ashbyhq.com/*`

**Application form selectors**:
```
Form container:     form[data-testid="application-form"], .ashby-application-form
First name:         input[name="firstName"], input[data-testid="first-name"]
Last name:          input[name="lastName"], input[data-testid="last-name"]
Email:              input[name="email"], input[data-testid="email"]
Phone:              input[name="phone"], input[data-testid="phone"]
LinkedIn:           input[name="linkedIn"], input[data-testid="linkedin"]
Resume upload:      input[type="file"][data-testid="resume"]
Custom questions:   [data-testid*="custom-question"], .custom-field
Submit button:      button[data-testid="submit"], button[type="submit"]
```

**Notes**:
- Ashby forms are React-rendered, may need wait for hydration
- File upload uses drag-and-drop zone with fallback file input

## Workday

**URL patterns**: `*.myworkdayjobs.com/*`, `*.wd5.myworkdayjobs.com/*`

**Application form selectors**:
```
Form container:     [data-automation-id="applicationForm"]
First name:         [data-automation-id="legalNameSection_firstName"]
Last name:          [data-automation-id="legalNameSection_lastName"]
Email:              [data-automation-id="email"]
Phone:              [data-automation-id="phone-number"]
Resume upload:      [data-automation-id="file-upload-input-ref"]
Next button:        [data-automation-id="bottom-navigation-next-button"]
Submit button:      [data-automation-id="bottom-navigation-next-button"] (last page)
```

**Multi-page**: Workday ALWAYS uses multi-page forms (typically 3-5 pages):
1. My Information (name, contact)
2. My Experience (resume upload, work history)
3. Application Questions (custom)
4. Voluntary Self-Identification (demographics)
5. Review & Submit

**Notes**:
- Most complex platform — uses shadow DOM in some sections
- Requires login/account creation before applying
- data-automation-id attributes are the most reliable selectors

## General Detection Strategy

To detect which platform a job page uses:

```
1. Check URL patterns against known platforms
2. Look for platform-specific meta tags or scripts:
   - Greenhouse: meta[name="greenhouse"], script src containing "greenhouse"
   - Lever: meta[property="og:site_name" content="Lever"]
   - Ashby: script src containing "ashbyhq"
3. Fall back to generic form detection:
   - Find all <form> elements
   - Classify inputs by type and label
   - Use generic selectors: label + input, placeholder text matching
```

## Form Interaction Best Practices

1. **Wait for page load**: Use browser_wait_for with a key form element
2. **Fill order**: Standard fields first (name, email), then custom questions
3. **File uploads**: Use browser_file_upload, not JavaScript injection
4. **Dropdowns**: Use browser_select_option with the visible text
5. **Checkboxes**: Use browser_click on the checkbox element
6. **Multi-page**: After filling, click Next/Continue, wait for new page, repeat
7. **Never submit**: Stop at the submit button and ask the user to review
