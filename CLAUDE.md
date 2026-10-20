# CLAUDE.md

## HRCastell project link

This repository is linked to the HRCastell project with `project_code` **`AVIATOR`**.
Use this exact `project_code` for every HRCastell MCP call made from this repository.

Note: the paths `mcp-server/src/server.js` and `docs/mcp-server.md` referenced below live in the HRCastell `app-tracker` repository, not in this one.

## HRCastell agent workflow

Use this protocol only when this repository is linked to a HRCastell project and the local MCP server is configured. It is an explicit operating procedure, not a background sync or permission to invent work. The complete local setup and secret-handling instructions are in `docs/mcp-server.md`.

### Setup prerequisites

Before an agent synchronizes work, all of the following must be true:

- The local MCP client runs `mcp-server/src/server.js` with `HRC_API_URL`, `HRC_API_TOKEN`, and `HRC_AGENT_NAME` supplied by its environment or secret store, never a repository file, prompt, or log.
- The token is active, restricted to this repository's linked HRCastell project whenever possible, and has both `projects:read` and `work:write` scopes.
- The agent has the exact linked HRCastell `project_code` from the repository/project linkage. The MCP server does not infer the project code; a project-scoped token enforces the link on every request.
- The agent can use the configured MCP tools. It must not substitute direct database access, browser cookies, or an unscoped API request.

### Session protocol

1. **Pull context first.** At session start, call `pull_project_changes` for the linked `project_code`. Use the last returned `serverTime` as `since` for a later incremental pull when it is available; otherwise pull a full snapshot. Review the returned tasks, ideas, plans, and development logs before selecting work.
2. **Pick up only work routed to you.** Every task has an `agent` field: `CLAUDE`, `CODEX`, or `null` (not routed). Claude Code accepts only a `DEVELOPMENT` task assigned to **Hernan Castellanos** with `agent = CLAUDE`; Codex accepts only the same kind of task with `agent = CODEX` (call `pull_project_changes` with your `agent` value to list them). Take an unrouted task only when the user explicitly asks for it in the session. Never pick up, create as your own work, or change an `ADMINISTRATIVE` or in-person task, a task routed to the other agent, or a task claimed by another agent (`claimedByAgent`). If no eligible task exists, report that fact and wait for explicit user direction.
3. **Claim it, then make the lifecycle visible.** Claim an eligible `TODO` task by calling `move_task` to set it to `IN_PROGRESS` before substantive work; the API records the claim and answers `409` (`claimed_by_other_agent` / `routed_to_other_agent`) when another agent owns it, in which case stop and report it. Do not reorder the board or change unrelated tasks. When a user explicitly asks to track a new piece of development work in your session, record it with `create_task` in `TODO` with `agent` set to yourself (`CLAUDE` or `CODEX`); only accept it after it meets the assignment and category rule above.
4. **Record real work.** During meaningful work, call `log_task_time` with actual minutes (split entries longer than one day) and an optional concise note. Use `create_dev_log` for relevant implementation activity, fixes, decisions, or meetings so project history and reports reflect what happened.
5. **Finish in review, never self-approve.** When the implementation is ready, record the final relevant time/log entries and call `move_task` to set the task to `REVIEW`. Only a human/user approval may move the task to `DONE`; an agent must not do so, even if its own tests pass (the API refuses it with `403 done_requires_human`). Moving a task back to `TODO` releases your claim; do that only when you stop working on it.
6. **Capture ideas separately.** When the user says "note this idea" (or clearly asks to capture an idea), call `add_idea` for the linked project only if the configured project scope permits it. An idea is not automatically a task.

### Fail closed

If the MCP server, API URL, token, scopes, project linkage, or any MCP tool call is missing or fails, do **not** claim that HRCastell was synchronized, a task was moved, time was logged, or an idea was saved. State the limitation plainly. Continue repository work only when the user gives explicit safe direction; do not guess a project, retry with credentials from files, expose a token, or bypass the API.
