# Questions for the director

Each has the default I chose; I carry on with the default.

## Q-001 .claude/settings.json could not be written (open)
Phase 0 asks for `.claude/settings.json` with `"autoCompactWindow": 300000`, allow rules for npm, npx, node, git and rg, and a deny rule for force-pushes. The session's permission guard blocks the agent from writing its own settings file ("self-modification"), so it isn't in the repo. Default: carry on without it. To add it yourself, commit this as `.claude/settings.json`:

```json
{
  "autoCompactWindow": 300000,
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(npx:*)", "Bash(node:*)", "Bash(git:*)", "Bash(rg:*)"],
    "deny": ["Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(git push --force-with-lease:*)"]
  }
}
```

## Q-002 GitHub Pages source (open)
The deploy workflow publishes with GitHub Actions. If the Pages source in the repo settings isn't set to "GitHub Actions", the deploy job fails while tests and build still pass. Default: leave the workflow as is; set Settings > Pages > Source to GitHub Actions once.
