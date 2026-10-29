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

## Q-002 GitHub Pages source (resolved: deploys succeed)
The deploy workflow publishes with GitHub Actions. If the Pages source in the repo settings isn't set to "GitHub Actions", the deploy job fails while tests and build still pass. Default: leave the workflow as is; set Settings > Pages > Source to GitHub Actions once.

## Q-003 Hand sprites (open)
The White Knuckle sprite sheets you shared are that game's copyrighted art, and images pasted in chat don't reach the cloud session as files. Default: original hand sprites drawn in code in the same dithered style (idle, readied, gripping, pulling, both hands). If you have rights to other art, commit the PNGs under public/hands/ and I'll use them.

## Q-004 Stamina (open)
You weren't sure about stamina. Default: no running stamina at all; only grip endurance while hanging (it refills as soon as the hands are free, and the hands shake as it runs low). Say if you want grip to be unlimited too, or a light running limit back.

## Q-005 Mouse pull direction while gripping (open)
Default: dragging the mouse down hauls him up toward the hands and sideways swings him that way, like White Knuckle. If you meant the body should follow the mouse (drag down to lower yourself), say so and it becomes the default; either way an invert option goes into settings.

## Q-006 Reference image file (resolved)
The director uploaded it; it now lives at `docs/reference/look-01.jpg`, described in DESIGN section 15.

## Q-007 Reference photo downloads blocked (resolved)
Resolved: the director opened the network; 42 freely licensed photos are in docs/reference/places/ (M3-24).

The session's network policy denies commons.wikimedia.org and upload.wikimedia.org (also Flickr, Unsplash, Openverse), so M3-24 has notes and links (docs/reference/PLACES.md) but no photos yet. To allow them: open the cloud environment menu in the session's title bar, then Edit, then Network access, and add those two hosts under Allowed domains (leave "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access. You can also upload photos yourself like look-01 (docs/reference/places/). Default meanwhile: model places from the notes and look-01.
