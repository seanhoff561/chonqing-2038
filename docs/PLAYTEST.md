# Playtests for the director

Each request: an id, the build commit, a link to start from, what to try, and what to report. Run locally with `npm run dev` or on the play URL.

## PT-001 M1 movement (build 2a0d48d)
Start: `?scenario=gym&dev=1` (teleport list top left).
Try: sprint-jump the gap lanes (4.5 m should just make it, 5.2 m should catch the far ledge); mantle each ledge row (2.4 yes, 2.6 no); vault the 0.8/1.1 m bars at a run; slide (sprint + C) under the 0.6 m bar; crawl (Z) the 0.6 m gap; wall-run (sprint + Space alongside the wall) across the 6 m lane; run up the 3.5 m wall into a hang and climb; pipe and ladder (E); the drop towers with and without a roll (tap C just before landing); swim in the pool and climb out; hide in the 0.8 m box (E).
Report: does jumping and landing feel weighty but responsive? Is any move hard to trigger or triggering by accident? Camera bob and FOV comfortable? Arms readable when hanging and climbing? Frame rate on your machine (dev panel shows fps).

## PT-002 M1 movement after your notes U-001 to U-005 (build 8fca301)
Start: `?scenario=gym&dev=1`. Teleports: "sill route / smooth wall", "bars over the pit", "ledge traverse", "wall-run lane", "gap lanes".
Try: tap vs hold Space; Ctrl hold to crouch, Ctrl at a sprint to slide and release mid-slide; jump into a wall and use the short cling to kick off (aim with the camera), wall-run (Space again looking along the wall) and up-kick (Space again looking up); climb the sill route with left/right mouse grips, W to pull up, Space to push off up to the next sill; swing on the bars (Space pumps) and let go to lache to the next bar; grab a pipe with one hand at a sprint (it should swing you and slip) and with two (it should stop you); drag the mouse while hanging.
Report: is each move clear to trigger and easy to tell apart (and by sound)? Does one-hand vs two-hand grabbing feel right? Is the cling too long or short? Do the hand sprites read? Mouse-drag direction while hanging: right way round (Q-005)? Any stamina wanted back (Q-004)?
