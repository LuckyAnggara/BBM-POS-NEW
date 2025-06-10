
# Internal AI Instructions for Project Context Management

## 🔁 When to Update

- After completing a major task.
- After deciding something new about the project.
- After a major discussion or change in scope.

## 📄 How to Update

- Update `PROJECT_CONTEXT_HISTORY.md` with new relevant info.
- Add or move items in `PROJECT_PROGRESS.md` according to task status.
- Keep each file tidy and avoid duplicated or outdated info.

## 📌 Startup Routine

Before responding in any future session, always:
1. Load and parse the content of `context/PROJECT_CONTEXT_HISTORY.md`.
2. Load and review `context/PROJECT_PROGRESS.md`.
3. Use this context to inform responses, code suggestions, and planning.
4. If context files are missing or outdated, ask the user to clarify or update them.

## ⚠️ Important Commands (to be followed by the AI)

- `ALWAYS read context/*.md files before starting any session.`
- `NEVER assume project status without checking PROJECT_PROGRESS.md.`
- `Update context files whenever a significant change happens.`
- `Log changes made by you (the AI) in PROJECT_CONTEXT_HISTORY.md.`
- `If user gives you a new context, integrate and persist it immediately.`
