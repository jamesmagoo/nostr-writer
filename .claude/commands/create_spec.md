---
argument-hint: <feature-name> <description>
description: Create a new feature specification from template
---

Create a new feature specification using the template system.

First read @specs/README.md to understand the specification system.

## Arguments
Parse $ARGUMENTS as:
1. Feature name (kebab-case, e.g., "user-authentication", "email-notifications")
2. Feature description (brief 1-2 sentence description of what the feature accomplishes)

## Process
1. Read @specs/README.md to understand the specification system
2. Validate feature name is in kebab-case format (lowercase letters, numbers, hyphens only)
3. Read @specs/templates/feature-spec-template.md
4. Create new file at specs/features/{feature-name}.md
5. Replace template placeholders:
   - `[Feature Name]` → Convert kebab-case to Title Case (e.g., "user-auth" → "User Auth")
   - `[Date]` → Current date in YYYY-MM-DD format
   - `[Brief 2-3 sentence description...]` → User-provided description
6. Confirm creation and provide next steps

## Example Usage
```
/create_spec user-authentication Enable users to securely log in and manage their accounts
/create_spec data-export Allow users to export their data in multiple formats  
/create_spec email-notifications Send automated email notifications for important events
```

## Expected Output
- Validate arguments format
- Confirm file created at specs/features/{feature-name}.md
- Remind user to fill in TODO lists, specific file paths, and implementation details
- Note that the completed spec can be used to direct future LLM implementation work