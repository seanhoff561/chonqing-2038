# Chongqing 2038: working rules

You are building "Chongqing 2038" on your own, start to finish. BRIEF.md is the director's brief: the vision, the settled decisions, and the process. Don't edit it. Your design lives in docs/DESIGN.md and the work list is features.json.

## Starting a session (and after context compaction)
1. Get the latest work: if features.json isn't in this checkout, run `git fetch origin` and merge the most recently committed remote branch that has it.
2. Still no features.json anywhere? Phase 0 isn't finished: read BRIEF.md in full and do its Phase 0, keeping any earlier work already here.
3. Orient: read the status block at the top of docs/PROGRESS.md, run `npm run status` and `npm run next`, and skim the newest entries in docs/DECISIONS.md and `git log --oneline -15`.
4. Run `npm run check`. If something is broken, fixing it comes first.

Read sections of BRIEF.md and docs/DESIGN.md when a feature needs them, not whole files every time.

## The loop
1. Take the first feature from `npm run next`.
2. Build it completely: no stubs, placeholders, or TODO comments left behind.
3. Prove each acceptance criterion with the cheapest real check (BRIEF.md, testing section). Anything only a person can judge goes into docs/PLAYTEST.md and doesn't block "done".
4. Set its status to "done" and fill in its evidence. Run `npm run check`, commit as `feat(<id>): <what>`, then push to your session branch and to main (`git push origin HEAD` and `git push origin HEAD:main`; if main has moved, merge origin/main first). Main is the director's playable build and where new sessions start.
5. Update the status block at the top of docs/PROGRESS.md and add one log line. Keep the file under about 150 lines by folding old lines into a summary.
6. Start the next feature.

At the end of each milestone, also run `npm run verify`, add that milestone's playtest request to docs/PLAYTEST.md, and push.

## Working unattended
The director is often away, and a goal check sends you back to work while features remain. A reply without a tool call ends your turn, so put any status line in the same message as your next tool call, and skip closing summaries, offers to continue, and milestone reports. If everything left truly needs the director, write it in docs/QUESTIONS.md and say so in one line.

## Rules
- features.json: never delete a feature or weaken its acceptance criteria to make it pass. Splitting features and adding new ones is fine. Only a director's note can drop one (status "dropped", citing its U-number).
- Design authority: where BRIEF.md is silent, decide, log a D-### line in docs/DECISIONS.md (what and why), and move on. When torn, choose what is more realistic, more tense, and gives the player more ways to solve the problem. Gameplay beats graphics.
- Questions for the director go in docs/QUESTIONS.md with the default you chose; carry on with that default.
- Never special-case game code to pass a test. If a test is wrong, fix the test and say why in the commit.
- Git: no force-push, history rewrites, branch deletion, or --no-verify.
- Ambitious game, simple code: no abstractions, options, or files the game doesn't need yet.

## Director's notes
When the director messages you mid-build, their note outranks everything, BRIEF.md included. Log it in docs/DECISIONS.md as U-### (their words, then how you'll apply it), update features.json (add, change, or drop features), apply it right away if it's small or make it the next feature if it's big, reply in a line or two, and carry on. Playtest reports work the same way: fix what failed, note what passed. Answer questions briefly and carry on. If they say stop or pause, stop.

## Token budget
Every token is the director's; spend them on the game.
- Find with rg, then read only the lines you need. Don't re-read files that haven't changed.
- Keep source files small (about 400 lines at most) and single-purpose. Edit them; don't rewrite whole files.
- Run the narrowest check that proves a change. Run `npm run verify` at the end of each milestone and after changes to rendering or boot code.
- Keep tool output short: tests print failures and a one-line summary; long output goes to logs/ and you grep it.
- Screenshots only for visual features, 960x540 or smaller, one at a time.
- In chat, one short line per feature. Status lives in files, so no recaps.
- Work directly. Use a subagent only for a big, independent job that would flood your context, one at a time, with a report of 150 words or fewer, and never to re-check your own work.
- Scratch files go in scratch/ (gitignored) and get deleted when you're done with them.
- When something is costly to prove automatically but quick for a person (feel, fun, real-GPU frame rate, audio), put it in docs/PLAYTEST.md instead.

## Commands (Phase 0 creates these)
- `npm run status`: feature counts per milestone
- `npm run next`: the next three workable features
- `npm run check`: typecheck and fast tests, quiet
- `npm run verify`: typecheck, all tests, production build, browser smoke test
- `npm run dev`: dev server (`?dev=1` dev tools, `?scenario=<name>`, `?seed=<n>`)
