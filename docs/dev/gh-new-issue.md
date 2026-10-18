### Create Issues with GitHub CLI (`gh`)

```bash
# 1) Authenticate once
gh auth login

# 2) Create an issue (pick type by title prefix + label)
# Bug
gh issue create \
  --repo MohamedAljoke/social-deduction-game \
  --title "[Bug]: <short title>" \
  --label bug

# Feature
gh issue create \
  --repo MohamedAljoke/social-deduction-game \
  --title "[Feature]: <short title>" \
  --label enhancement

# Improvement / Refactor
gh issue create \
  --repo MohamedAljoke/social-deduction-game \
  --title "[Improvement]: <short title>" \
  --label enhancement \
  --label refactor
```

Tip: use `--body-file /path/to/file.md` to prepare structured issue content before creating it.

add tags for issues if is good first issue, if it is a new task (task, enhancement, bug, refactor)
