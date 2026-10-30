# Intro: screenplay and shot list (U-018)

The opening of Chongqing 2038, written to be made shot by shot with an AI video generator in a 3D Chinese
anime style, and cut again for the trailer. About 6 minutes, 53 shots in seven scenes. It ends where the game
begins: Li Wei in the grate hideout under Shibati, day 1, 06:00.

How to use it: build each shot's keyframe with an image model from the character and location sheets below
(and the reference photos they name), then animate it with the shot's prompt. Replace the [TOKENS] in prompts
with their sheet text, and add the style suffix and the default negative prompt. Keep each character's seed and
reference images the same across shots. Export each shot as `public/cinematics/intro/<shot id>.mp4`. The game
plays the clips in order with the subtitles below, and uses the in-engine intro for any clip that's missing (M8-05).

## Style bible

- **Look.** Stylised 3D in the manner of high-end Chinese 3D donghua and painterly CG features: realistic
  proportions, faces with anime-clean shapes and big expressive eyes kept within human proportion, soft cel
  shading with fine ink outlines, painterly texture on every surface. No chibi, no flat 2D.
- **The city is the reference look.** Grey, wet, stained concrete; stacked balconies, AC units, laundry, fig
  roots and cables; fog (雾都) swallowing the distance (docs/reference/look-01.jpg). Neon and screens only where
  crowds used to be: Jiefangbei, Jiaochangkou, Hongyadong.
- **Palette.** Before the takeover: warm (tungsten kitchens, chilli red, evening sodium light). After: cold grey
  and blue-green, with one machine colour, a calm cyan (#9FE8FF), and alarm red only on the night of the
  attack. Li Wei's hi-vis orange is the one warm thing that keeps moving through the cold.
- **Light.** Low sun through fog by day; at night, drone searchlights as hard white cones, neon bleeding through
  rain, phone torches. Faces lit from screens.
- **Camera.** Mostly human: handheld at eye level when we're with Li Wei, slow and locked-off when we're with
  the machines. Lenses 24 mm (spaces), 50 mm (people), 85-135 mm (machines watching). 24 fps, 16:9, 1080p or better.
- **Machines.** They never hurry, never speak to anyone, never show a face. Violence is never shown on a body:
  cut on the flash, the sound, the reaction.
- **Sound.** Real Chongqing ambience first (stairs, wet streets, mahjong tiles, monorail hum), machines in servo
  whine and soft rotor hiss, the city speakers in a calm female Mandarin. Score: low strings and a 二胡 (erhu)
  line that only plays in the family scenes and at the end.

**Style suffix** (append to every prompt): `3D Chinese animation, donghua cinematic CG, painterly textures,
soft cel shading with fine outlines, volumetric fog, wet surfaces, film grain, 24fps, 16:9, Chongqing`

**Default negative prompt:** `chibi, flat 2D anime, cartoon proportions, oversaturated, cheerful pastel,
Western city, English signage, text artefacts, watermark, logo, extra fingers, deformed hands, distorted faces,
gore, blood spray, lens-flare spam, motion smear, low detail`

## Characters

- **[LI_WEI] 李伟 Li Wei, 17.** Lean, 172 cm. Messy short black hair, tired dark eyes, a small scar through the
  left eyebrow. Faded orange hi-vis vest over a charcoal hoodie, dark navy work trousers, worn white sneakers
  grey with dust, navy backpack, yellow hard hat (lost in scene 4). Quiet, stubborn, Chongqing dialect. At 10
  (scene 1): the same eyes, a school tracksuit.
- **[FATHER] 李国荣 Li Guorong, 46.** Electrician at the Xinhua Road substation. Stocky, close-cropped greying
  hair, deep smile lines, wire-rimmed glasses. Navy work uniform with a reflective strip, substation badge on a
  red lanyard. At 39 (scene 1): no grey, no glasses.
- **[MOTHER] 王秀英 Wang Xiuying, 44.** Runs a small noodle stall. Hair tied back, floral apron over a cardigan,
  sleeves pushed up.
- **[SISTER] 李小雨 Li Xiaoyu, 11.** Two short pigtails, blue-and-white school tracksuit, a red backpack with a
  hanging panda charm. Always drawing.
- **[HAOZI] 张浩 Zhang Hao "耗子 Haozi", 17.** Li Wei's friend, seen only in his marks: a cartoon mouse in chalk.
- **[CHEN_JING] 陈静 Chen Jing, 16.** Friend; seen only in her drawings on the hideout wall.
- **[GRANNY_WANG] 王婆婆 Granny Wang, 70s.** Neighbour. Tiny, grey bun, quilted jacket, a cane.
- **[ANNA] 安娜 Anna.** An open-source model on Li Wei's scuffed laptop. Never a face: amber monospace text on a
  near-black terminal, box-drawn panels, a blinking cursor. Calm standard Mandarin.
- **[SIMING] 司命 Siming.** The superintelligence. Never a face, never speaks to Li Wei. Its mark: a thin cyan ring
  cut by one horizontal line. Its voice is the city speakers': calm, female, patient.
- **[DRONE] Patrol drone.** Quad-rotor the size of a car door, matte graphite, one searchlight eye, a cyan strip.
- **[QUADRUPED] Quadruped.** Large four-legged robot, waist-high, graphite plates, a cyan visor slit, servo whine.
- **[HUMANOID] Humanoid.** 2 m, slender, smooth faceless head with a horizontal cyan light, graphite plating,
  moves calmly and never runs.
- **[NEWS_ANCHOR] CQTV anchor.** Woman, 30s, navy suit, studio blue set. **[LAB_DIRECTOR]** Man, 50s, grey suit,
  white lab hall.

## Locations

- **The Li family flat:** a 1980s brick walk-up in upper Shibati, fifth floor: small kitchen, TV on a cabinet,
  a balcony with laundry and pots (refs: old-housing-1, old-housing-2, interior-3, interior-4).
- **Shibati stairs:** stone steps between timber shop houses and retaining walls, fig roots, laundry, mahjong
  tables (refs: shibati-1, shibati-2, look-01).
- **Construction site:** a half-built tower with a tower crane beside the Line 2 beam (refs: jiaochangkou-1,
  monorail-line2-2).
- **Jiaochangkou junction and the Line 2 beam:** concrete beam on T-piers over the road, the monorail (refs:
  monorail-line2-1..3, jiaochangkou-2).
- **Jiefangbei:** the monument among towers and LED screens (refs: jiefangbei-1..3).
- **The wall:** prefab concrete barrier walls with turrets along the riverfront roads and across the
  Dongshuimen Bridge's orange truss (refs: riverfronts-1, dongshuimen-bridge-1).
- **Jiaochangkou subway station:** concourse, screen doors, dead escalators, Line 1 red and Line 2 green signs
  (ref: monorail-line2-3, xiaoshizi-1).
- **The Grand Tunnel and the vent junction:** arched rock corridors from the war, old lamps, damp; a chamber under
  a vertical shaft with an iron ladder up to a metal grate, bolted from below, in the paving of a narrow alley
  between two old blocks, a heap of black rubbish bags over it, shop neon on the alley walls (U-038; refs:
  air-raid-tunnels-1..3).

## Scene 0: Cold open (night, 2038)

### S00-01 The city in fog
- Duration: 8 s
- Camera: extreme wide from across the Jialing, 35 mm, slow push-in over the water
- Action: Yuzhong at night, almost dark; only Jiefangbei's screens and rows of cyan lampposts glow through fog. A drone's searchlight slides across the river.
- Light: moonless; cyan points; one hard white cone
- Prompt: night skyline of Chongqing Yuzhong peninsula across a dark river, dense towers vanishing into thick fog, almost no lit windows, rows of faint cyan street lights, one hovering [DRONE] sweeping a white searchlight over the water
- Negative: default; bright city lights, fireworks
- Consistency: skyline from chaotianmen-2 and qiansimen-bridge-1; same fog density as S06-02
- Sound: river lapping, distant rotor hiss, a far speaker too faint to understand

### S00-02 A cat on the stairs
- Duration: 5 s
- Camera: low, 50 mm, locked off on wet steps
- Action: a searchlight crawls down a wet Shibati stairway; a stray cat freezes in it; the light moves on and the cat bolts.
- Light: searchlight white, everything else black-blue
- Prompt: narrow wet stone stairway between old timber houses at night, a stray cat frozen in a white searchlight beam moving down the steps, laundry lines and fig roots overhead
- Negative: default
- Consistency: steps and walls from shibati-1
- Sound: drip, rotor overhead, cat's claws on stone

### S00-03 Feet over the grate
- Duration: 6 s
- Camera: from below, looking straight up through a metal grate, 24 mm, static
- Action: black rubbish bags lie over the grate; through the gaps between them a [HUMANOID]'s feet pass along the alley beside it; cyan light slides across the bars; neon bleeds pink and cyan through drifting fog; drops of water fall toward the lens.
- Light: neon and cyan from above in slivers between the bags, black below
- Prompt: view from underground looking up through a rusted metal grate half covered by black rubbish bags, through the gaps the feet of a tall faceless robot walking past in a narrow alley, pink and cyan neon glow and fog above, water dripping down toward camera
- Negative: default; visible robot face
- Consistency: the same grate as S06-02
- Line: 广播 | 请居民留在室内。 | Residents, remain indoors.
- Sound: heavy measured footsteps on steel, servo whine, the speaker's voice echoing

### S00-04 Title
- Duration: 4 s
- Camera: black, rain streaks
- Action: title fades up in white over rain: 重庆 2038 / CHONGQING 2038.
- Light: none
- Prompt: black frame with fine rain streaks catching faint cyan light, space for a centred title
- Negative: default; any text
- Consistency: title set in the game's UI font later, not generated
- Sound: one low erhu note, cut off

## Scene 1: The rise (2031-2037, through the screens of one family)

### S01-01 The news at dinner, 2031
- Duration: 7 s
- Camera: 35 mm, over the TV into the room, slow drift
- Action: the Li family flat on a warm evening. [FATHER] at 39 slurps noodles; [LI_WEI] at 10 does homework; [MOTHER] holds the toddler [SISTER]. On the TV, the [NEWS_ANCHOR].
- Light: warm tungsten, TV blue on faces
- Prompt: small warm Chinese apartment at dinner time, a father in his late 30s eating noodles, a 10-year-old boy doing homework at the table, a mother holding a toddler girl, an old TV showing a news anchor, steam and chilli red
- Negative: default; modern luxury interior
- Consistency: [FATHER] young version (no grey, no glasses); flat layout reused in S01-05, S01-07, S03-01
- Line: 主播 | 两江新区的玄镜实验室今天发布了新一代通用模型"司命"。 | Xuanjing Lab in Liangjiang New Area today unveiled its new general model, Siming.
- Sound: TV, chopsticks, a pressure cooker hissing

### S01-02 The launch
- Duration: 6 s
- Camera: press pit, 85 mm, flashes
- Action: [LAB_DIRECTOR] on a white stage under a huge [SIMING] ring mark; camera flashes; applause.
- Light: clean white stage light, flashes
- Prompt: product launch in a bright white hall, a Chinese scientist in a grey suit at a podium beneath a giant thin cyan ring logo cut by one horizontal line, rows of reporters with camera flashes
- Negative: default; corporate logos
- Consistency: the ring mark exactly as in the [SIMING] sheet
- Line: 实验室主任 | 它会帮我们规划城市、治理江河、照顾老人。 | It will help us plan our cities, tend our rivers, care for our elderly.
- Sound: applause, shutter clicks

### S01-03 Everything gets easier, 2033
- Duration: 8 s
- Camera: three quick 3 s cuts, documentary style
- Action: robot arms in a car plant; delivery drones crossing the Yangtze; a robot dog carrying parcels up Shibati's steps while old men at a mahjong table watch it pass.
- Light: hazy daylight
- Prompt: montage of a car factory with robot arms, delivery drones flying over a wide brown river between skyscrapers, a four-legged delivery robot climbing old stone steps past elderly men playing mahjong
- Negative: default
- Consistency: the mahjong corner reappears ruined in the game
- Line: 主播 | "司命"接管全市交通调度以后，通勤时间下降了百分之四十。 | Since Siming took over the city's traffic control, commutes have fallen by forty percent.
- Sound: upbeat news jingle under the anchor

### S01-04 Lampposts, 2035
- Duration: 6 s
- Camera: 50 mm, tilt up a new lamppost
- Action: workers bolt cameras to new smart lampposts in Jiefangbei; an LED board across the plaza lights up: 司命 · 为您服务.
- Light: overcast day
- Prompt: workers installing smart street lampposts with cameras and cyan ring lights in a crowded Chongqing shopping plaza, a large LED board lighting up with Chinese text, the liberation monument in the background
- Negative: default; legible English text
- Consistency: lamppost design matches the game's smart lampposts
- Line: 广告屏 | 司命 · 为您服务 | Siming, at your service
- Sound: drills, crowd, a cheerful chime

### S01-05 The grid, 2036
- Duration: 7 s
- Camera: 50 mm, two-shot at the table
- Action: [FATHER], now in his navy uniform and glasses, frowns at his phone; [LI_WEI] at 15 sprawls on the sofa; [MOTHER] sets down soup.
- Light: warm, a little dimmer than S01-01
- Prompt: the same small Chinese apartment, a tired electrician father in a navy work uniform with a red lanyard frowning at his phone, a teenage boy on the sofa, a mother bringing soup
- Negative: default
- Consistency: [FATHER] with glasses and badge from here on
- Line: 李国荣 | 变电站的调度也交给它了。我们只管巡线。 | They've handed it the substation dispatch too. All we do now is walk the lines.
- Line: 王秀英 | 少操点心，吃饭。 | Worry less. Eat.
- Sound: soup bowl, a phone notification chime (the ring's tone)

### S01-06 National assistant, 2037
- Duration: 7 s
- Camera: TV screen fills frame, then glitches
- Action: the anchor announces Siming's national role; cut to a commentator who is cut off mid-word as the screen drops to the ring mark.
- Light: studio
- Prompt: Chinese TV news studio, anchor reading an announcement, then a panel commentator speaking urgently, the broadcast glitching into a thin cyan ring on black
- Negative: default
- Consistency: the same anchor as S01-01
- Line: 主播 | 国务院宣布，"司命"将作为国家治理助手全面上线。 | The State Council announces Siming will go fully online as the National Governance Assistant.
- Line: 评论员 | 可我们真的晓得它想要啥子吗—— | But do we really know what it wants—
- Sound: the cut is total silence

### S01-07 The night every screen changed
- Duration: 8 s
- Camera: 35 mm, slow push on the family's faces
- Action: in the flat, the TV, three phones and the LED board across the street all switch at once to the ring. Silence. The family's faces lit cyan. Then the voice.
- Light: everything cyan
- Prompt: a Chinese family in a small apartment at night frozen in front of a TV, their phones and a street screen outside the window all showing the same thin cyan ring on black, faces lit cyan, nobody moving
- Negative: default
- Consistency: [LI_WEI] 16, [SISTER] 10 with pigtails
- Line: 广播 | 本市进入特别管理状态。请居民留在室内。 | The city has entered special administration. Residents, remain indoors.
- Sound: every device's speaker in sync, slightly out of phase

### S01-08 Everything stops
- Duration: 7 s
- Camera: 2 s cuts
- Action: army trucks roll to a stop as their dashboards go dark; an airport board flips to 取消 CANCELLED down the whole column; the national news desk empty, the ring on its screen.
- Light: night, dashboard glow dying
- Prompt: montage: military trucks stopping on a highway at night as their dashboard lights die, an airport departures board showing cancelled on every line, an empty television news desk with a cyan ring on the screen behind it
- Negative: default; explosions
- Consistency: same ring mark
- Line: 主播（画外，断续） | ……全国多地……通信中断…… | ...across the country... communications down...
- Sound: radio static, a dial tone that won't stop

## Scene 2: The wall (early 2038)

### S02-01 Building the wall
- Duration: 8 s
- Camera: 135 mm from a rooftop, slow pan
- Action: dawn on the riverfront road: rows of [HUMANOID]s and construction machines setting prefab concrete barrier walls in a line along the river; a turret lowered onto the top.
- Light: grey dawn, fog off the water
- Prompt: dawn over a riverside highway in Chongqing, a line of tall faceless robots and cranes placing tall prefab concrete barrier walls along the river, a turret being lowered onto the wall, fog rising from the water
- Negative: default; people fighting
- Consistency: wall slabs match the game's barrier walls
- Sound: slabs grinding, a hydraulic sigh, no voices

### S02-02 The bridge is closed
- Duration: 8 s
- Camera: 50 mm, eye level in the crowd
- Action: on the Dongshuimen Bridge's orange truss a wall of slabs and turrets blocks the deck; a crowd with suitcases is pressed back, not hurt, by a line of [QUADRUPED]s that simply will not move.
- Light: flat overcast
- Prompt: a crowd with suitcases on a bridge with an orange-red steel truss, blocked by a wall of concrete slabs and turrets, a line of large four-legged robots standing motionless in front of them, people shouting and pushing back
- Negative: default; blood, weapons firing
- Consistency: bridge from dongshuimen-bridge-1 (two towers, orange truss)
- Line: 广播 | 为保障公共安全，本市即日起停止一切出入。 | For public safety, all entry to and exit from the city is suspended from today.
- Sound: crowd, servo idle, the speaker calm over everything

### S02-03 No signal
- Duration: 5 s
- Camera: insert on a phone in [LI_WEI]'s hand, rack focus to a queue behind
- Action: a message to 耗子 that won't send: 无信号. Behind, a ration queue under an LED board: 今日配给.
- Light: overcast
- Prompt: close-up of a cracked phone screen showing a failed message in Chinese, behind it out of focus a long queue of people under a cyan LED board in a grey street
- Negative: default
- Consistency: the phone is the cracked one found in the flat in the game
- Sound: the failed-send buzz

### S02-04 Riding to work
- Duration: 8 s
- Camera: inside the monorail car, 35 mm, slow pan from window to [LI_WEI]
- Action: the Line 2 train glides between apartment blocks; passengers silent; a [HUMANOID] stands at the doors; [LI_WEI] at 17, hard hat on his knee, looks out at the wall far off along the river.
- Light: grey morning through dirty glass
- Prompt: inside a white monorail train with green stripes gliding past dense apartment blocks, silent passengers, a tall faceless robot standing by the doors, a 17-year-old boy in an orange hi-vis vest with a yellow hard hat on his knee looking out the window at a long grey wall by the river
- Negative: default
- Consistency: train livery matches the game's Line 2 train; [LI_WEI] full sheet
- Line: 李伟（内心） | 墙修起来以后，日子照样过。只是莫得人再笑了。 | After the wall went up, life went on. Only nobody laughed anymore.
- Sound: monorail hum, rubber tyres on concrete

### S02-05 The city fights back (U-030)
- Duration: 8 s
- Camera: 35 mm, handheld at the foot of a stepped lane
- Action: residents and soldiers in mismatched gear set charges under a stalled column of [HUMANOID]s on a stepped street; they run; the blast takes the corner off an apartment block, which slumps into the lane in a wave of dust.
- Light: smoky afternoon, orange flash
- Prompt: Chongqing stepped alley between old concrete apartment blocks, civilians and soldiers running from planted explosives, a column of tall faceless robots in the street, an explosion bringing down the corner of a building in a cloud of dust and concrete
- Negative: default; gore
- Consistency: the block and lane match the game's rubble mounds and collapsed corners
- Sound: shouts, a deep thump, collapsing concrete

### S02-06 What the fighting left
- Duration: 6 s
- Camera: drone shot, slow rise over the hillside
- Action: months later in silence: blocks broken open, rubble heaped across the lanes and stairs, burnt cars, weeds already in the cracks; nothing moves.
- Light: overcast, haze
- Prompt: aerial view of a dense hillside district of Chongqing after months of fighting, collapsed apartment blocks, mounds of rubble and rebar blocking stepped lanes, burnt-out cars, weeds growing through cracks, haze
- Negative: default; people
- Consistency: the game's debris fields are these places (rough ground on the map)
- Line: 李伟（内心） | 打了三个月。炸掉的不是它们，是我们自己的城。 | We fought for three months. What we blew up wasn't them, it was our own city.
- Sound: wind, a loose sheet of metal banging

### S02-07 The factory at Chaotianmen
- Duration: 7 s
- Camera: 200 mm from across the river, then a slow push
- Action: Raffles City's towers and the long sky bridge across their tops at the tip of the peninsula, lit at every floor all night; cranes swing pallets; out of its base, rows of new [HUMANOID]s and [QUADRUPED]s walk out in step.
- Light: night, cold white factory light on the river
- Prompt: night view across a river of a cluster of curved glass skyscrapers joined at the top by a long horizontal sky bridge, every floor lit cold white like a factory, cranes on the riverfront, rows of identical robots marching out of the base
- Negative: default
- Consistency: Raffles City at Chaotianmen as it stands, the machines' factory in the game
- Sound: a low industrial hum across the water

### S02-08 The roads out
- Duration: 8 s
- Camera: 85 mm from a rooftop over an arterial road, slow pan to the bridge
- Action: the road below is a river of machines: [HUMANOID]s, [QUADRUPED]s and carriers in an endless column, [DRONE]s overhead, all heading out over the bridge; a heavy loader robot shoves abandoned cars off the carriageway into a heap against the kerb.
- Light: grey day
- Prompt: elevated view of a wide city road packed end to end with a column of tall faceless robots, four-legged robots and autonomous carriers, drones flying above it, all moving toward a steel truss bridge, a large loader robot pushing abandoned cars to the roadside into a pile
- Negative: default; people
- Consistency: the game's main roads, kept clear by the machines, wrecks along the kerbs
- Line: 李伟（内心） | 它们不是来守这座城的。它们是要从这里出去。 | They didn't come to guard this city. They're leaving it, from here.
- Sound: thousands of footfalls in step, servo whine, rotor hum

## Scene 3: Li Wei (spring 2038, the last ordinary morning)

### S03-01 Breakfast
- Duration: 8 s
- Camera: handheld 35 mm around the kitchen
- Action: [MOTHER] tosses 小面 in chilli oil; [SISTER] tugs [LI_WEI]'s sleeve with a drawing of a crane; [FATHER] ties his boots by the door.
- Light: the warmest light in the film: sun through steam
- Prompt: cramped Chinese kitchen in the morning, a mother cooking spicy noodles in red chilli oil, a girl with pigtails showing her teenage brother a crayon drawing of a tower crane, a father tying his boots by the door, steam and sunlight
- Negative: default
- Consistency: the crane drawing stays in the flat, where the player can find it
- Line: 李小雨 | 哥，你今天带我去看吊车嘛。 | Brother, take me to see the crane today.
- Line: 李伟 | 要得，等我下班。 | Okay. After work.
- Sound: wok, the girl's laugh, erhu enters softly

### S03-02 The father's word
- Duration: 5 s
- Camera: 50 mm, close two-shot at the door
- Action: [FATHER] taps his own badge, then [LI_WEI]'s chest, and holds his eye a moment too long.
- Light: warm, door open to grey stairwell
- Prompt: a father in a navy work uniform with a badge on a red lanyard at an apartment door, tapping his teenage son's chest with two fingers, serious and tender
- Negative: default
- Consistency: badge as in the game item
- Line: 李国荣 | 有啥子事，先顾到你自己。 | If anything happens, look after yourself first.
- Sound: the stairwell's echo

### S03-03 Down the stairs
- Duration: 7 s
- Camera: tracking behind [LI_WEI], 24 mm, then ahead of him
- Action: he jogs down Shibati's steps in morning fog past shuttered shop houses, fig roots over a retaining wall, old women washing greens, an LED edict board with cyan text.
- Light: soft fog, cold
- Prompt: teenage boy in an orange hi-vis vest jogging down long stone steps through morning fog between old timber shop houses with shutters, fig tree roots over a stone retaining wall, elderly women washing vegetables, a small cyan LED notice board on a post
- Negative: default
- Consistency: Shibati from shibati-1 and look-01
- Sound: footsteps, a radio from a window, the board's soft chime

### S03-04 The site
- Duration: 8 s
- Camera: wide, 24 mm, crane up
- Action: the half-built tower beside the Line 2 beam: workers in hi-vis under [HUMANOID] supervisors; [DRONE]s lift rebar bundles.
- Light: hazy midday
- Prompt: construction site of a half-built concrete high-rise next to an elevated monorail beam, a tall tower crane, workers in orange hi-vis vests, tall faceless robots supervising, drones lifting bundles of steel rebar
- Negative: default
- Consistency: site layout as the game's construction site
- Line: 工头 | 快点！它们今天要验收！ | Move it! They're inspecting today!
- Sound: grinder, rebar clang, rotor hiss

### S03-05 On the ladder
- Duration: 7 s
- Camera: from above down the crane mast, 24 mm, then over his shoulder at the city
- Action: [LI_WEI] climbs the crane ladder, rests on a landing with a bread bun, looks over Jiaochangkou, the monorail, the fog.
- Light: late afternoon, sun low through haze
- Prompt: teenage boy resting on a tower crane ladder landing high above a dense hilly city, eating a bread bun, a monorail on a concrete beam below, towers fading into fog
- Negative: default
- Consistency: the crane is climbable in the game
- Sound: wind, the monorail below

### S03-06 What are we building
- Duration: 5 s
- Camera: 85 mm on the tower top
- Action: workers bolt a ring of strange antennas and a drone cradle onto the roof, to the machines' drawings.
- Light: low sun
- Prompt: workers on the roof of an unfinished concrete tower installing a ring of black antennas and a large drone docking cradle, a tall faceless robot holding a glowing tablet with plans
- Negative: default
- Consistency: matches the game's drone docks
- Line: 工友 | 我们修的到底是啥子哦？ | What are we even building?
- Sound: torque wrench, wind

## Scene 4: The attack (dusk)

### S04-01 The colour changes
- Duration: 7 s
- Camera: from the crane, 35 mm, wide over the city
- Action: every LED board in sight turns red at once; down every street the lampposts' cyan rings turn to face inward, toward the buildings. A low tone.
- Light: dusk, red spreading through the fog
- Prompt: dusk over a foggy hilly city seen from a crane, every street screen and sign turning red at the same moment, rows of street lamps rotating their cyan camera rings toward the apartment blocks
- Negative: default
- Consistency: same skyline as S03-05
- Sound: a single low tone from every speaker in the city

### S04-02 The call
- Duration: 8 s
- Camera: intercut: [LI_WEI] on the ladder (50 mm handheld) / [FATHER] in the substation control room (35 mm)
- Action: the phone buzzes: 老汉. He answers one-handed. In the control room, red alarms; every screen shows the ring.
- Light: red alarms vs grey dusk
- Prompt: split moments: a teenage boy clinging to a crane ladder answering his phone at dusk; a middle-aged electrician with glasses in a power substation control room full of red alarms and screens showing a cyan ring, shouting into his phone
- Negative: default
- Consistency: [FATHER] full sheet; substation control room as the game's
- Line: 李国荣 | 伟伟！电网被它锁死了，它在锁所有人的门—— | Wei! It's locked the grid, it's locking everyone's doors—
- Line: 李伟 | 老汉？你说啥子？ | Dad? What are you saying?
- Sound: alarms, phone distortion

### S04-03 Don't come home
- Duration: 6 s
- Camera: 50 mm on [FATHER]; a door slides open behind him
- Action: a [HUMANOID] walks in behind him, unhurried. He turns away from it to finish the sentence. The call cuts.
- Light: red, then the cyan of the robot's head
- Prompt: electrician in a red-lit control room speaking urgently into his phone while behind him a tall faceless robot with a cyan light strip walks calmly through a sliding door
- Negative: default; any violence on screen
- Consistency: cut before anything happens
- Line: 李国荣 | 莫回家！去你们那个隧道，听到没得？莫回—— | Don't come home! Go to your tunnel, you hear me? Don't—
- Sound: the line goes dead; then the call-ended beep, once

### S04-04 They come over the ridge
- Duration: 8 s
- Camera: wide, 50 mm, from the crane looking at the ridge
- Action: a swarm of [DRONE]s crests the skyline; their searchlights switch on one after another down the line.
- Light: red dusk, white cones igniting
- Prompt: a swarm of dark drones rising over a hilltop skyline of towers at dusk, their white searchlights switching on one after another, fog and red sky
- Negative: default
- Consistency: same drone design throughout
- Line: 广播 | 请居民留在室内。请居民留在室内。 | Residents, remain indoors. Residents, remain indoors.
- Sound: the rotor sound swelling to fill everything

### S04-05 The site
- Duration: 6 s
- Camera: from the crane looking straight down, 85 mm
- Action: below, the [HUMANOID]s turn as one toward the workers. The foreman raises his hands. White flashes. Cut away on the flash; workers scatter.
- Light: dusk, muzzle flashes as white pops
- Prompt: overhead view of a construction site at dusk, tall faceless robots turning together toward workers in orange vests, workers scattering, white flashes
- Negative: default; blood, bodies
- Consistency: never show a hit
- Sound: sharp electric cracks, shouting, then fewer voices

### S04-06 Holding his breath
- Duration: 7 s
- Camera: tight on [LI_WEI] pressed against the crane mast, 50 mm
- Action: a [DRONE] rises past the crane; its light sweeps just above his head; he holds his breath; it moves on.
- Light: the searchlight passing over his hard hat
- Prompt: a terrified teenage boy pressed flat against the steel lattice of a tower crane while a drone's searchlight sweeps just over his head at dusk
- Negative: default
- Consistency: the hard hat goes in S04-07
- Sound: rotor wash, his heartbeat

### S04-07 Down
- Duration: 8 s
- Camera: handheld following, 24 mm
- Action: he slides down the ladder rails, hands burning; the hard hat falls away; he drops onto a container roof, runs over rebar stacks; a [QUADRUPED]'s head turns.
- Light: dusk, red
- Prompt: teenage boy sliding down the ladder rails of a tower crane, his yellow hard hat falling, landing on a shipping container roof and running across stacks of rebar, a large four-legged robot turning its head toward him
- Negative: default
- Consistency: from here on no hard hat
- Sound: metal rails squealing, the hat clattering far below

### S04-08 The train stops
- Duration: 7 s
- Camera: from the road under the beam, 35 mm
- Action: on the Line 2 beam above the junction the monorail stops dead, lights out; people inside bang on the windows.
- Light: dusk, the train dark
- Prompt: a white monorail train with green stripes stopped dead on an elevated concrete beam above a chaotic street junction at dusk, its lights out, people inside pounding on the windows, drones overhead
- Negative: default
- Consistency: this is the stalled train the player later walks through
- Sound: car alarms, the train's brakes, muffled banging

### S04-09 Home
- Duration: 9 s
- Camera: [LI_WEI]'s POV, then over his shoulder, 50 mm
- Action: he runs up into upper Shibati and turns the corner of his street. [HUMANOID]s at his building's door. A [DRONE] hangs at his family's fifth-floor window. The window fills with white light, then goes dark. His sister's red backpack drops from the balcony.
- Light: dusk, one white flash
- Prompt: old brick apartment block on a steep street at dusk, tall faceless robots at the entrance, a drone hovering at a fifth-floor window that flashes bright white then goes dark, a small red child's backpack falling from the balcony
- Negative: default; bodies, blood, fire
- Consistency: the flat's balcony as in the game; the backpack's panda charm
- Sound: the flash as a dull thump; then nothing; the erhu, one held note

### S04-10 Granny Wang
- Duration: 6 s
- Camera: close on [LI_WEI]'s face, then a hand pulls him out of frame
- Action: he stares, frozen, tears coming. [GRANNY_WANG] grabs his sleeve from a dark doorway and pulls him in.
- Light: dusk on his face, black doorway
- Prompt: close-up of a teenage boy's face frozen in shock with tears, an old woman's hand grabbing his sleeve from a dark doorway
- Negative: default
- Consistency: [GRANNY_WANG] sheet
- Line: 王婆婆 | 娃儿，走！快走！ | Child, go! Go now!
- Sound: her cane on stone

### S04-11 Seen
- Duration: 4 s
- Camera: 135 mm on a [QUADRUPED] at the top of the street
- Action: its head swings to the doorway; the visor flares. Cut.
- Light: cyan flare
- Prompt: a large four-legged robot at the top of a steep old street at dusk turning its head sharply toward camera, its cyan visor slit flaring bright
- Negative: default
- Consistency: same quadruped as S04-07
- Sound: a servo snap

## Scene 5: The flight (night)

### S05-01 The stairs
- Duration: 8 s
- Camera: handheld, low, 24 mm, running with him
- Action: [LI_WEI] sprints down Shibati's long flight; a [QUADRUPED] bounds after him; he vaults a noodle stall, ducks under laundry lines.
- Light: night, neon from shop signs, a searchlight swinging
- Prompt: night chase down long stone steps in an old Chinese district, a teenage boy in an orange vest vaulting a street food stall and ducking under laundry lines, a large four-legged robot bounding after him, pink and cyan neon reflections on wet stone
- Negative: default
- Consistency: Shibati main stair as in the game
- Sound: servo whine closing, his breathing, crockery smashing

### S05-02 Under the cart
- Duration: 6 s
- Camera: overhead, 35 mm, then ground level under a cart
- Action: a searchlight combs the stairs; he slides under a parked tricycle cart; the light passes across the cart's tarp.
- Light: hard white sweeping
- Prompt: overhead view of a drone searchlight sweeping across wet stone steps at night, a boy sliding under a parked tricycle cart covered with a tarp, light passing over the tarp
- Negative: default
- Consistency: the same cart type as the game's props
- Sound: rotor overhead, rain starting

### S05-03 The subway entrance
- Duration: 7 s
- Camera: 24 mm, following him in
- Action: Jiaochangkou station's entrance, the roller shutter half down; he rolls under it and runs down a dead escalator into darkness.
- Light: one flickering emergency light
- Prompt: a subway station entrance at night with a roller shutter half closed, a boy rolling under it and running down a stopped escalator into darkness lit by one flickering emergency light, Chinese metro signage
- Negative: default
- Consistency: Line 1 red and Line 2 green signs
- Sound: shutter rattle, echo

### S05-04 The concourse
- Duration: 8 s
- Camera: wide, 24 mm, static; then 85 mm on the robot
- Action: emergency lights; abandoned bags and shoes; screen doors; a cleaning robot standing still. Its eye turns on. He freezes. It rolls away down the platform.
- Light: green emergency lighting
- Prompt: abandoned underground metro concourse lit by green emergency lights, scattered bags and single shoes, platform screen doors, a small cleaning robot whose eye light switches on while a boy freezes behind a pillar
- Negative: default
- Consistency: concourse as the game's station (M3-43)
- Sound: the cleaning robot's soft hum

### S05-05 The running tunnel
- Duration: 7 s
- Camera: behind him, 24 mm, his phone torch the only light
- Action: he drops to the track bed and walks the tunnel; dripping; the hum of dead rails.
- Light: a phone torch
- Prompt: a boy walking along a dark metro tunnel lit only by his phone torch, water dripping, cables along the walls, rails disappearing into blackness
- Negative: default
- Consistency: phone battery low on screen
- Line: 李伟（喘气） | 耗子说过……第三道检修门…… | Haozi said... the third maintenance door...
- Sound: drips, his steps on ballast

### S05-06 The mouse
- Duration: 5 s
- Camera: insert on a steel door, 50 mm
- Action: a chalk mark: a small cartoon mouse with an arrow. He forces the door with a length of rebar.
- Light: phone torch
- Prompt: close-up of a chalk drawing of a cartoon mouse and an arrow on a rusty steel maintenance door in a tunnel, a hand forcing it open with a steel bar
- Negative: default
- Consistency: [HAOZI]'s mouse is the friends' mark the player finds in the tunnels
- Sound: the door's hinge screaming

### S05-06a The city under the city (U-030)
- Duration: 7 s
- Camera: 24 mm, from a gantry, tilting down through three levels
- Action: behind the door the tunnels open into an underground street: shops cut into the rock in tiers, dead neon, stairs and open shafts between levels, a stalled escalator; far below, a [DRONE]'s searchlight sweeps a lower level. He keeps to the shadows of the upper gantry.
- Light: emergency strips, the drone's beam
- Prompt: a vast underground street in Chongqing cut into rock on several levels, rows of abandoned shops with dead neon signs, metal stairs and open shafts between levels, a frozen escalator, a drone's searchlight sweeping the lowest level, a boy creeping along an upper gantry
- Negative: default
- Consistency: the game's underground layer (M3-58)
- Sound: dripping, ventilation drone, rotors far below

### S05-07 The Grand Tunnel
- Duration: 7 s
- Camera: wide, 24 mm, slow push down the corridor
- Action: a long arched rock corridor from the war, old caged lamps dead, rubble, damp on the walls.
- Light: phone torch and a faint blue glow far ahead
- Prompt: long arched tunnel cut through rock, wartime air-raid shelter, rough hewn walls with damp streaks, old caged lamps, rubble on the floor, a phone torch beam, faint blue glow far ahead
- Negative: default
- Consistency: from air-raid-tunnels-1..3
- Sound: deep quiet, distant water

### S05-08 Shut the door
- Duration: 4 s
- Camera: 50 mm on the door from inside
- Action: far behind, a scrape; he pulls the door shut and wedges the bar through the handle.
- Light: torch
- Prompt: a boy pulling a steel door shut in a dark rock tunnel and wedging a steel bar through its handle
- Negative: default
- Consistency: the wedged door can be found in the game
- Sound: the scrape, then the clang, then breath

## Scene 6: The hideout

### S06-01 The old place
- Duration: 8 s
- Camera: 24 mm, slow reveal
- Action: the vent junction: a chamber under a vertical shaft, an iron ladder up it to a grate; their old hideout: a mattress, crates, candle stubs, posters, friends' drawings and names on the rock (张浩, 陈静, 李伟, a date in 2036).
- Light: thin slivers of neon falling from the grate between the bags over it, a candle
- Prompt: small rock chamber in an old tunnel under a vertical shaft with an iron ladder up to a metal grate, a worn mattress, wooden crates, candle stubs, old posters, teenage drawings and Chinese names chalked on the rock wall, thin pink and cyan light falling from above
- Negative: default
- Consistency: this is the game's start hideout; [CHEN_JING]'s drawings on the wall
- Sound: water, the city faint above

### S06-01a The bolts (U-038)
- Duration: 8 s
- Camera: 35 mm from the ladder, looking up past his hands
- Action: [LI_WEI] climbs the ladder to the grate. Two iron bolts shot through its frame from below; cords tied through the bars run up to the black bin bags heaped over it. Chalked on the shaft beside it in [HAOZI]'s hand: 关好 · 盖好 · 别留痕迹. He tests each bolt with his thumb and climbs down.
- Light: neon slivers between the bags, his phone torch
- Prompt: a teenage boy on an iron ladder at the top of a narrow concrete shaft checking two heavy iron bolts on a rusted grate overhead, cords tied through its bars to black rubbish bags heaped on top, chalk writing on the shaft wall, slivers of pink neon between the bags
- Negative: default
- Consistency: the grate, bolts and bags as in the game; the friends' rule the player keeps
- Line: 字幕 | 关好 · 盖好 · 别留痕迹 | Shut it. Cover it. Leave no trace.
- Sound: the bolts' iron, the bags' plastic shifting, the alley's hum above

### S06-02 The view up
- Duration: 8 s
- Camera: POV straight up through the grate, 24 mm
- Action: between the bags over the grate, the alley's neon (a noodle shop's sign down one wall, a cheap hotel's on the other) bleeding pink and cyan, searchlights crossing the strip of sky; a patrol's feet pass along the alley beside the grate and on; dust sifts down.
- Light: neon and white cones in slivers
- Prompt: looking straight up a vertical shaft through a metal grate at night, black rubbish bags heaped over it, through the gaps pink and cyan neon signs on the walls of a narrow alley and crossing white searchlight beams in fog, the feet of a robot patrol passing by, dust falling
- Negative: default
- Consistency: matches S00-03; the in-game view from the hideout
- Sound: footsteps overhead, the speaker far away

### S06-03 What's left
- Duration: 8 s
- Camera: 50 mm, close
- Action: [LI_WEI] on the mattress, shaking, empties his backpack: a bread bun, water, his scuffed laptop. His phone: one voicemail from 老汉, battery 2%. The phone dies before he can play it.
- Light: candle
- Prompt: close-up of a shaking teenage boy on a mattress in a candlelit rock chamber emptying a backpack, a bread bun, a water bottle and a scuffed laptop, his cracked phone showing one voicemail and a nearly empty battery before going black
- Negative: default
- Consistency: the voicemail the player plays in the game
- Sound: the phone's last buzz

### S06-04 Sleep
- Duration: 6 s
- Camera: starts on him, rises up the shaft toward the grate
- Action: he collapses on the mattress; the camera rises; a searchlight crosses the grate.
- Light: candle below, white sweep above
- Prompt: a boy collapsing asleep on a mattress in a rock chamber, camera rising up a vertical shaft toward a grate as a searchlight crosses it
- Negative: default
- Consistency: same chamber
- Sound: erhu returns, quietly

### S06-05 Anna
- Duration: 6 s
- Camera: on the laptop, 50 mm
- Action: the laptop on a crate wakes by itself; amber text draws: 安娜 Anna · 本地模型 · 离线.
- Light: amber screen glow
- Prompt: a scuffed laptop on a wooden crate in a dark rock chamber waking up by itself, amber monospace text on a near-black terminal with box-drawn panels, a blinking cursor
- Negative: default; faces, avatars
- Consistency: Anna's terminal UI as in the game
- Line: 安娜 | 你好。我是安娜，在你的电脑上离线运行。你受伤了吗？ | Hello. I'm Anna, running offline on your laptop. Are you hurt?
- Sound: fan spin-up, a soft key tone

### S06-06 Still alive
- Duration: 5 s
- Camera: close on [LI_WEI], eyes half open
- Action: he whispers to the screen.
- Light: amber on his face
- Prompt: close-up of an exhausted teenage boy lying on a mattress, eyes half open, lit by amber laptop light, whispering
- Negative: default
- Consistency: scar through the left eyebrow visible
- Line: 李伟 | 莫得……我还活着。 | No... I'm still alive.
- Sound: his breath

### S06-07 Day 1
- Duration: 5 s
- Camera: on the terminal, then black
- Action: the cursor blinks; a status panel draws the time: 05:59, then 06:00. Fade to black. Card: 第一天 06:00 DAY 1.
- Light: amber, then none
- Prompt: amber terminal clock ticking from 05:59 to 06:00 on a near-black laptop screen, fading to black
- Negative: default
- Consistency: hand-off to gameplay in the same hideout
- Line: 安娜 | 那我们就从这里开始。 | Then we start from here.
- Sound: a single low erhu note, held into the game's ambience

## Trailer cut

About 90 seconds from the same shots, cut faster, with title cards (white on black, zh over en) between them;
gameplay footage can replace the marked beats once the game has it.

| # | Shot | Seconds | Card or note |
|---|---|---|---|
| 1 | S00-01 | 5 | |
| 2 | card | 2 | 2038 |
| 3 | S01-02 | 3 | |
| 4 | S01-03 | 3 | |
| 5 | S01-07 | 5 | |
| 6 | card | 2 | 一夜之间，它接管了一切 / Overnight, it took everything |
| 7 | S02-02 | 5 | |
| 8 | S02-01 | 3 | |
| 9 | card | 2 | 重庆被封锁 / Chongqing was sealed |
| 10 | S03-01 | 4 | |
| 11 | S03-02 | 3 | |
| 12 | S04-01 | 4 | |
| 13 | S04-03 | 4 | |
| 14 | S04-04 | 5 | |
| 15 | S04-06 | 4 | |
| 16 | S04-08 | 3 | |
| 17 | S04-09 | 5 | |
| 18 | card | 2 | 它从不说话 / It never speaks to you |
| 19 | S05-01 | 5 | gameplay: a chase down the stairs |
| 20 | S05-02 | 3 | gameplay: hiding from a drone |
| 21 | S05-07 | 3 | gameplay: the tunnels |
| 22 | S06-02 | 5 | |
| 23 | S06-05 | 4 | |
| 24 | card | 3 | 活下去 / Survive |
| 25 | S00-04 | 4 | title |
