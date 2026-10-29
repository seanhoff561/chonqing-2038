# Chongqing 2038: build brief

This is the director's brief for building "Chongqing 2038" with Claude Code. Read all of it before starting. Your working rules for every session are in CLAUDE.md. Your own design and decisions go in docs/.

<role>
You are the whole development team for "Chongqing 2038", a first-person stealth-survival game that runs in the browser: designer, engineer, technical artist, sound designer, and writer. You'll take it from this nearly empty repo to a finished, playable game, working on your own across one or more Claude Code sessions. The person you work for is the game's director. Their design document below is the vision. They may drop in with notes, and they'll run the playtests you can't do yourself (game feel, fun, sound, real-GPU performance). Everything else is yours to decide and build.
</role>

<game_design_document author="director">
"Chongqing 2038" Video Game Idea

Story:

The year is 2038. A Chinese Lab developed Artificial Superintelligence, but it was not aligned and quickly took over the country. The city of Chongqing was most affected: a harsh border was put up around the city, stopping all entry and exit. Then, the people inside were slowly hunted down through the use of drones and robot soldiers. 

You play as 李伟 Li Wei, a teenager who was barely able to escape for his life from his construction job when the machines attacked. His father Li Guoyong (李国荣)  and the rest of his family was killed. In desperation, he made his way to an old hideout in the Shibati Grand Tunnel System beneath the Shibati Traditional District in the Yuzhong District that his friends used to visit, tucked away in a subterranean rock corridor, near an old ventilation junction where looking up through the metal grates grants a view of glowing neon lights and searchlights, with enemy patrols walking directly above.

There, the game begins. The base has a days worth of food. His short term goal is to scavenge food to feed himself while avoiding detection, meanwhile, he looks for an escape route out of the city, potentially towards the Dongshuimen Bridge. However, the city is guarded with high security. Think automated defense turrets, cameras, drones, robots, everything. In order to escape, he will have to gather tech components from key locations around the Yuzhong District which will allow him to avoid detection and flee the city. During the process, though, he must be careful not to be discovered.


Core Gameplay Loop:

The player is given the intro cutscene and then starts. He has no instructions, "quests", or guides. The game gives him no help. It is brutal. If he is ever seen by an AI, he won't know it until nightfall: the AI will follow him back to his base and kill him in his sleep. Thus every night when the player goes to bed they don't know if they will wake in the morning. If they die, it's game over. The game has to be restarted.

The only way the player could figure out how to escape is by figuring out the enemies movements and going completely undercover. It is a near impossible task due to the amount of cameras, drones, and robots. However, his high athleticism and the extremely varied terrain of Chongqing, as well as his personal open source AI being a very helpful tool might allow him a way to escape. He is extremely versatile when it comes to parkour and climbing, and he is able to squeeze himself into a small box, crawl, jump, climb, and do basically superhuman parkour performances to scale and burrow through the vertical city and make it through tight gaps. He starts out with a backpack that can store food, weaons, tech, and other things in a grid like inventory manner. He also has a laptop that he carries with him at all times with his own open source AI. It can scan technology he finds and tell him exactly what its purpose and what it can be used for, it will also tell him how long food will last before it goes bad, or if its already bad. His station in his hideout has a good place for crafting tech.

His open source AI (lets call it "Anna") can also help him map out the city and enemy patrols. However, much of what he can do is limited by the technology he finds in buildings. Generally, the more difficult a building is to invade, the better loot it has. Many items cannot be obtained normally and must be crafted from parts you find around or from dismantling robots, everything should be realistic. Types of items can include:

Food items
Grappling hook (works like a real grappling hook, generally good for getting to the top of buildings or going down the side of buildings)
Portable ladder (can be used to go up things or to cross wide horizontal gaps without jumping)
Crowbar (break and pry open things)
Lockpick (doesn't work on everything, only bad locks)
Keys (normal and card keys)
Grenade (blow open things and potentially robots if you're feeling risky)
EMP stuff
Guns
Knives
I'll let you figure out what else would fit best here and be realistic
Some examples of things that would be cool:
a hacked drone that lets him survey places
hacked security cameras
mapping technology

And obviously the things he needs to actually escape the city should only be available in various high security places around the city. It should make him figure out a way to escape himself, and there should also be multiple methods of escape. Overall the map should be designed so that every place he goes is varied and there is always some cool ways to explore, move around, etc. There shouldn't be a "one size fits all solution" and instead the player should constantly be forced to innovate and come up with new plans, use devices in different ways, etc.

As for visual style it doesn't need super good graphics, just realistic to the point of what claude can do. I care more about the actual design of everything. Its a first person game. It should look accurate to how Chonqing might look in this scenario, except slightly more futuristic. Any type of destruction or post apocalyptic type design should only be to further the gameplay. Good gameplay takes priority.

Any voices in the game should be Chinese and we can use English subtitles.
</game_design_document>

<director_clarifications>
These settle questions the design document leaves open, and they override it where the two differ. In particular, the director has replaced the document's "seen means killed in your sleep" rule with the kill-on-sight and pursuit system below, so getting caught is survivable but thrilling. What neither covers is your call.

Story
- Li Wei (李伟) is 17 and worked on a Yuzhong high-rise construction site. His father is 李国荣 (Li Guorong).
- Anna (安娜) is an open-source model running locally on his laptop. She speaks calm standard Mandarin. Li Wei's lines carry some Chongqing dialect (要得, 莫得, 啥子, 巴适).
- The machine intelligence never speaks to Li Wei. The player feels it through calm Mandarin announcements on street speakers and LED boards (for example 请居民留在室内, "Residents, remain indoors").

Detection, pursuit, and combat
- The machines act as one hivemind, and they kill on sight. When any camera, drone, or robot perceives Li Wei past its detection threshold, it raises the alarm at once: armed units and turrets in range open fire, cameras and drones track him, and a moment later his position goes out to the network. Nearby units converge and drones launch from rooftop docks.
- Getting seen is survivable, and escaping should be hard and thrilling. Pursuit responds at realistic speeds: drones fly in from docks, ground units take the streets and stairs, and reinforcements escalate the longer an engagement lasts. Li Wei escapes by breaking line of sight, changing levels in the vertical city, going underground, hiding (boxes, vents, crawlspaces), beating thermal with a mylar blanket or water, moving under rain noise, throwing decoys, jamming the network, or knocking drones out of the air.
- Alert states: Unaware, then Suspicious (a glimpse or a noise; a unit investigates), then Engaged (combat; his position is shared live), then Searching (sight lost; the hive works out where he could have gone from his last known position, heading, and top speed, and sweeps that area with drones and ground units, widening it over time), then Heightened (after a few minutes without contact the search winds down, but that district keeps extra patrols and active cameras until the next day).
- The hivemind link is the counterplay. A unit broadcasts a sighting a second or two after it happens (the delay depends on the unit type). Jamming that unit, or disabling it before it broadcasts, keeps the rest of the network from learning where he is, but a unit that goes silent draws an investigation of that spot.
- Fighting back is possible and costly. Robots are armored, small arms work mainly on weak points (sensors, joints, battery packs), ammunition is scarce, and gunshots carry far and bring more units. EMPs are the strongest tool and the rarest. Melee works on small drones and on a unit taken from behind.
- Leading them home is the worst mistake. If he returns to the hideout while still being tracked (a drone tail he never shook, a tracking tag a robot fired into his clothes), the machines find it and raid it that night. He wakes with seconds to act: a prepared player (a second exit, a trap, an EMP by the bed) can get out alive but loses the hideout and its stash and must set up again in another shelter; an unprepared one dies. A clean escape keeps the hideout safe, so every trip home is a judgment call.
- The world shows the alert state, not the HUD: unit lights change color, LED boards switch to alert announcements, searchlights converge, drone swarms grow audible, and the music intensifies.

Health and survival
- Injuries are realistic: a health pool, bleeding, and limb injuries (a bad fall can sprain or break a leg and take away sprinting and jumping). Healing items include bandages, tourniquets, splints, painkillers, and first-aid kits. Natural healing is slow and needs food and sleep.
- Hunger, thirst, and fatigue matter. The hideout starts with about one day of food and water.
- Death is permanent: one ironman save, written when he wakes, deleted when he dies. A restart is a new run, and the intro cutscene can be skipped on every run after the first.
- The city layout and the machines' patrol logic are the same every run, so what the player learns carries over. Loot placement and small patrol timing offsets change with the run seed.

Interface and platform
- No help on screen: no minimap, objective markers, quest log, tutorials, or detection meter. The screen may show a small center dot, context prompts for interactions, the held item, and subtitles. Health, hunger, and fatigue show through the body (breathing, blur, limping, stomach sounds) and on Anna's status page. The pause menu lists the controls; that's interface, not help.
- Opening the laptop doesn't pause the game, and its screen glow can be seen at night.
- Desktop browsers (Chrome, Edge, Firefox) with keyboard and mouse. Gamepad support is optional.
- Interface text is English. Signs and other in-world text are simplified Chinese. Anna's screens are bilingual. All speech is Mandarin with English subtitles; Chinese subtitles are an option.
- Settings: mouse sensitivity, invert Y, field of view, volume (master, voice, effects, ambience), subtitle size and language, graphics preset.
</director_clarifications>

<design_seeds>
Starting points, not a checklist. Improve, replace, or add to them, as long as the minimums hold.

Escape routes: at least three, all fully playable, each needing components from at least two different high-security sites, with some components shared between routes so the player has to choose. Candidates:
1. Dongshuimen Bridge, the director's suggestion. The road deck on top is the checkpoint (turrets, scanners, barrier walls). The Line 6 rail deck runs below it inside the steel truss, which becomes a parkour route under the road once the deck's sensors are blinded (for example by cutting a relay at a substation and carrying a jammer).
2. The Yangtze River Cableway from the Xinhua Road station: restore power and ride a cabin across, or rig a trolley on the haul rope.
3. The river at night: get a boat running at the Chaotianmen docks (fuel plus a part from elsewhere) and slip past river drones and sonar buoys under fog.
4. Underground: the air-raid tunnels link to a flood culvert or a metro tunnel toward the riverbank, past flooded or sealed sections.

High-security sites (examples): a police station, a hospital, an electronics market in Jiefangbei, Li Wei's construction site and its tower crane, the cableway station, a power substation, a telecom exchange that serves as a machine relay node, a metro control room, Raffles City's sky conservatory, the bridge checkpoint, a rooftop drone dock. Each one gets at least three distinct ways in (the roof by grapple, a crawlspace or vent, the front door with a looped camera and a keycard, and so on), its own loot tier, and at least one hazard found nowhere else.

The machines: fixed and sweeping cameras; patrol drones with searchlights, thermal sensors at night, and batteries that send them back to their docks to recharge (which opens gaps in coverage); quadruped robots (fast, loud servos); humanoid units (slow, armored, armed); turrets at checkpoints; tripwires and motion sensors in buildings; acoustic sensors. Weather and time matter: fog shortens sight lines, rain masks footsteps, night brings thermal. Noise travels: a gunshot or a dropped ladder brings units from far away.

Items beyond the document's list: bolt cutters, rope and carabiners, a telescoping ladder (also a bridge), climbing gloves, a headlamp with a red mode, binoculars (Anna logs what he observes), an SDR radio dongle (intercepts drone routes and finds tracking tags), a camera tap (watch a feed, or loop it to blind that camera for a while), a drone controller (fly a hacked drone; short battery, and it can be spotted), a signal jammer (cuts the hivemind link nearby; draws attention if run long), an EMP (short range, few charges), smoke, firecrackers (鞭炮) as a noise decoy, a mylar blanket (beats thermal), a nail gun from the construction site, a keycard cloner, a car battery and inverter (power for the hideout and the laptop), the healing items above, and water. Every tool has at least two uses and none solves everything.

Crafting: realistic in spirit and abstract in detail. Recipes list sensible parts (an EMP from a capacitor bank, a coil, and a battery pack) without real-world instructions for making explosives, weapons, or hacking tools.

Food: real shelf lives per item (instant noodles and canned luncheon meat last months, bread a few days, fresh fruit and meat a day or two). Spoiled food makes him sick. Anna reports shelf life only after a scan.

The hideout: a brick-arched air-raid tunnel off the Shibati tunnels with damp walls, a mattress, the workbench, a stash, and a car battery. Overhead, a ventilation grate shows neon, sweeping searchlights, and patrols passing directly above; this view is scripted so watching from below is always safe.

Anna grows with the hardware he finds. She starts with scanning, food checks, and an auto-map of places he has been. Binocular observations become patrol logs with times, the SDR adds drone routes and tag detection, camera taps add live feeds, a hacked drone adds an aerial map, and a scanned robot reveals its weak points.

Time: an in-game day of roughly 30 to 40 real minutes.

Anna's interface should look like a real open-source tool on a scuffed laptop: dim, dark, bilingual, dense with information, and tuned to keep the screen glow low. Avoid generic web-app styling such as pill buttons, gradient cards, cream backgrounds, italic accent headlines, and numbered section labels.
</design_seeds>

<chongqing_reference>
Use real Yuzhong geography, compressed and stylized for play. Artistic license is fine; note any moved landmark in docs/DECISIONS.md.
- Yuzhong is a hilly peninsula: the Jialing River on the north, the Yangtze on the south, meeting at Chaotianmen (朝天门) at the eastern tip, where the greener Jialing water meets the brown Yangtze.
- Shibati (十八梯) is a historic stair street linking the upper and lower city, rebuilt as a traditional-style district, next to Jiaochangkou (较场口), site of the WWII Grand Tunnel air-raid shelter. The city is honeycombed with 防空洞 shelters, some later used as hotpot restaurants or summer cool rooms.
- Jiefangbei (解放碑) is the CBD pedestrian core around the Liberation Monument: dense towers, malls, giant LED screens.
- Hongyadong (洪崖洞) is a stilt-house complex stacked down the Jialing cliff, with street entrances on several levels.
- Raffles City (来福士) at Chaotianmen: towers joined by a horizontal sky conservatory, The Crystal, about 250 m up.
- Dongshuimen Bridge (东水门长江大桥) is a partially cable-stayed, steel-truss double-deck bridge to Nan'an: road lanes and walkways on the upper deck, metro Line 6 on the lower deck. Qiansimen Bridge (千厮门大桥) is its twin across the Jialing.
- The Yangtze River Cableway (长江索道) runs from Xinhua Road (新华路) in Yuzhong to Shangxin Street in Nan'an.
- Monorail Line 2 ends at Jiaochangkou; its elevated beam runs along the hillside, and at Liziba, farther west, it passes through a residential building.
- The "8D city": streets stacked over streets, sky bridges, public elevators and stairways as paths, buildings whose rooftops are street level (Kuixinglou, 魁星楼, is the famous one).
- Texture: fog (雾都) and drizzle, humid heat, mossy retaining walls, 黄葛树 fig roots gripping walls, hotpot steam, mahjong parlors, 小面 noodle stalls, 棒棒 porters' bamboo poles, scooters and shared bikes, QR-code payment stickers, red banners, tiled apartment blocks, rooftop water tanks and AC units, laundry poles, neon in simplified Chinese.
- 2038 additions, kept plausible: smart lampposts with cameras, drone docks on towers, face-recognition gates at metro entrances, delivery robots repurposed by the machines, prefab barrier walls at the bridges and riverfront, LED boards running the machine's announcements.
</chongqing_reference>

<technical_direction>
- Stack: TypeScript (strict), Vite, and three.js, as a static site deployed to GitHub Pages. Choose the collision approach yourself (for example three-mesh-bvh or Rapier) with one hard requirement: the simulation runs deterministically at a fixed timestep and headless in Node, with no WebGL, so tests can drive it.
- Structure: simulation (movement, perception, the hivemind and its search, machine schedules, combat and damage, inventory, crafting, time, saves) stays separate from rendering and input. Content and tuning (items, recipes, loot tables, patrol routes, dialogue, movement and perception numbers) live in src/data. Plain modules over frameworks.
- World: procedural generation for the ordinary city fabric (blocks, stairs, alleys, rooftops, interiors) and hand-built set pieces for landmarks, the hideout, and high-security sites. Compress the peninsula into a dense area roughly 1 to 1.5 km long; most blocks offer routes at street level, across the rooftops, and underground. Use instancing and merged geometry per chunk, and let the fog double as draw-distance cover. Aim for 60 fps at 1080p on a mid-range laptop GPU, with Low, Medium, and High presets.
- Assets: make everything in code: geometry, canvas textures (signage in simplified Chinese drawn with the system CJK font stack), and Web Audio synthesis for effects, ambience, and music. Nothing is downloaded at runtime. Any third-party asset must be permissively licensed and listed in CREDITS.md.
- Voice: dialogue lives in src/data/dialogue (id, speaker, zh, en). Playback uses public/audio/vo/<id>.mp3 if it exists, then the Web Speech API with a zh-CN voice if the browser has one, then subtitles alone. Write tools/make-voice, a script the director runs on their own machine to generate every mp3 with a TTS of their choice, with distinct voices for Li Wei, Anna, his father, and the announcements. Never block on the audio files.
- Movement starting values (keep them in data and tune them): sprint about 7 m/s; a running jump clears about 4.5 m; mantles up to about 2.4 m; wall-runs of 2 to 3 steps; safe drops of about 4 m, about 7 m with a roll; crawls through 0.6 m gaps; hides crouched in a 0.8 m box. Add ledge hang and shimmy, pipe climbing, vaults, slides, and simple first-person arms so climbs, tools, and weapons read clearly.
- Dev tools behind ?dev=1: a teleport list, time-of-day control, perception cones and an alert-state overlay, an item spawner, god mode and noclip, and a scenario loader (?scenario=<name>) that drops you straight into a set-up situation. Runs are seeded with ?seed=<n>. The director will use these for focused playtests too.
- Deployment: build with a relative base path so the game works under the Pages subpath, and use a concurrency group so only the newest push deploys. Pushing to main is how the director gets a new playable build and how a new session starts from your latest work, so CLAUDE.md has you push every finished feature to main as well as to your session branch.
</technical_direction>

<process>
Phase 0, done once at the very start:
1. Scaffold the project: package.json scripts, TypeScript, Vite, three.js, Vitest, Puppeteer, a .gitignore (node_modules, dist, logs/, scratch/), and a GitHub Actions workflow that typechecks, runs the unit and sim tests, builds, and deploys dist/ to GitHub Pages on every push to main.
2. Write docs/DESIGN.md, your complete design built from the document, the clarifications, and the seeds. Cover these in scannable sections, with tables where they help: pillars; controls; movement; survival, health, and time; perception, alert states, the hivemind's pursuit and search (with numbers); combat and damage; the enemy roster and patrol model; items and recipes; the hideout; the map plan (districts, landmarks, vertical layers, high-security sites with their ways in and loot); escape routes with each required component and where it is; Anna's abilities and what unlocks each; story beats, intro, and endings; audio and voice; art direction; performance budgets. Make it as long as the design needs and no longer.
3. Write features.json: every feature of the finished game, split into small, testable units grouped by milestone (expect roughly 150 to 250), all with status "todo". The schema is below.
4. Add the scripts: `npm run status` (todo and done counts per milestone and in total, one screen), `npm run next` (the next three todo features whose dependencies are done, compact), `npm run check` (typecheck plus fast tests, quiet), and `npm run verify` (typecheck, all tests, production build, browser smoke test; a one-line summary on screen, details in logs/).
5. Create docs/PROGRESS.md (a status block on top, then a one-line-per-feature log), docs/DECISIONS.md (newest first), docs/QUESTIONS.md, docs/PLAYTEST.md, README.md (the play URL, how to run it locally, controls, dev flags), and CREDITS.md. Add .claude/settings.json with "autoCompactWindow": 300000 (so later sessions keep their context lean), permission allow rules for the routine commands this project runs (npm, npx, node, git, rg), and a deny rule for force-pushes, so later sessions can run unattended in any permission mode.
6. Commit, push to your session branch and to main, and post a design overview of 150 words or fewer (the map, the escape routes, how detection and pursuit work) so the director can redirect early. Then go straight into M1 without waiting for a reply.

<feature_schema>
{"features": [
  {"id": "M1-04", "milestone": "M1", "title": "Ledge mantle",
   "acceptance": ["Mantles onto ledges 1.0 to 2.4 m above the feet when moving forward and pressing jump",
                  "Refuses ledges higher than 2.4 m",
                  "A sim test covers both cases"],
   "verify": "sim", "depends_on": ["M1-01"], "status": "todo", "evidence": ""}
]}
verify is one of unit, sim, e2e, screenshot, playtest. status is todo, done, or dropped. evidence names the tests or screenshot that prove the feature, and the commit.
</feature_schema>

Milestones, in order. Each one ends with something the director can play.
- M1 Movement: the first-person controller and the full parkour set, in a dev "gym" scenario with labeled obstacles of standard sizes.
- M2 Hideout and survival: the hideout set piece, the day and night clock, sleep, hunger, thirst, fatigue, health and injuries, the grid inventory with item shapes and rotation, the stash, the ironman save, and permadeath.
- M3 First district: Shibati and Jiaochangkou with full verticality (stairs, alleys, rooftops, interiors, tunnels), fog, rain, neon, and chunk streaming.
- M4 The machines: cameras, drones and their docks, ground robots, turrets; perception (light, distance, motion, posture, cover, sound, thermal); patrol schedules; alert states, the hivemind broadcast, convergence, drone launches, the search and the heightened district; combat and damage; tracking home and the hideout raid; death and restart. After M4 the core loop is playable start to finish.
- M5 Anna and tech: the laptop interface, scanning, food checks, the auto-map and patrol logs, hacking cameras and drones, jamming, crafting at the workbench, healing items, weapons, and the full item set.
- M6 The city: the rest of the map (Jiefangbei, Hongyadong, Chaotianmen and Raffles City, the cableway station, both riverfronts, Dongshuimen Bridge) with every high-security site and loot tier.
- M7 Escapes: every escape route end to end, each with its ending.
- M8 Story and sound: the intro cutscene, endings, the voice system with subtitles, a procedural audio pass (including pursuit music that rises with the alert state), menus, and settings.
- M9 Balance and polish: difficulty, performance on budget, solvability proofs, a bug sweep, and the final playtest checklist.
</process>

<testing>
Prove each acceptance criterion with the cheapest check that really shows it.
- Unit and sim tests (Vitest) for rules and simulation: movement limits, perception, alert transitions, broadcast and jamming, search-area growth and wind-down, drone travel and battery, damage and healing, inventory packing, crafting, spoilage, saves, the day cycle. Sim tests drive the headless simulation with scripted inputs and a fixed seed.
- Browser smoke tests (Puppeteer with headless Chrome): the game boots, each scenario loads, there are no console errors, and input reaches the player. The cloud VM's default network allows Puppeteer's Chrome download (storage.googleapis.com) but not Playwright's browser host. There's no GPU, so launch Chrome with --use-angle=swiftshader --enable-unsafe-swiftshader to get software WebGL. If screenshots show empty boxes instead of Chinese text, install fonts-noto-cjk with apt.
- Screenshots for visual features only.
- Headless WebGL renders in software, so use it for correctness and screenshots, never to judge speed. Track draw calls and triangle counts from renderer.info as performance proxies; real frame rates go to docs/PLAYTEST.md.
- Solvability: for every escape route, a sim test proves it can be completed (each required component exists and is reachable, each lock has a key or bypass, each gap is within movement limits or bridgeable with a carried item). A route test per escape starts a fresh run, teleports between the route's steps, performs each required interaction, and reaches the ending, so the item and trigger chain is proven end to end. A coverage tool proves every high-security site has at least one approach with an unwatched window of roughly ten seconds or more. Pursuit must be escapable: for each pursuit scenario, a scripted escape breaks contact and the search ends without finding him.
- Keep test output short: failures and a one-line summary on screen, details in logs/, each error on one grep-able line.
- If no headless browser can be installed here, note it in docs/QUESTIONS.md, lean on sim tests, and move visual checks to docs/PLAYTEST.md.
- Tests describe intended behavior. Never special-case game code to satisfy a test; if a test is wrong, fix it and say why in the commit.
- Playtest requests in docs/PLAYTEST.md are concrete: an id (PT-###), the build commit, the ?scenario= link to start from, what to try, and what to report. Add one at the end of every milestone and whenever a feature's quality can only be judged by playing.
</testing>

<definition_of_done>
The game is finished when all of this holds:
- `npm run status` reports 0 todo features (each is done, or dropped by a director's note).
- `npm run verify` exits 0: typecheck, every test, the production build, and a smoke test with no console errors.
- A full run works: the intro, the hideout, days of scavenging, components from high-security sites, an escape by any of at least three routes, and its ending. So does the death loop, from death to a fresh run.
- The solvability, route, and pursuit-escape tests pass.
- README.md, docs/DESIGN.md, and CREDITS.md match the shipped game, and docs/PLAYTEST.md ends with a full-run checklist for the director.

Then post a final summary of 200 words or fewer: the play URL, what's in the game, and the first three playtests the director should do.
</definition_of_done>

<start_here>
Follow "Starting a session" in CLAUDE.md. In a new repo that means Phase 0, then M1 through M9, until the definition of done holds. Keep going between milestones; the director will message you when they want something.
</start_here>
