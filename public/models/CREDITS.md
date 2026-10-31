# Family Fun 2.3.0 — Model credits

All models below are REAL downloaded GLB files (not code shapes). Each has a
`.glb.b64` text companion in the same folder, because the GitHub connector
push is text-only; the game tries the real `.glb` first, then decodes the
`.b64` to a blob URL. If both fail, the game keeps the 2.2.0 capsule
character / detailed box car — it never shows an invisible character or car.

## Characters — Gobkit (CC0 1.0)

Source: https://gobkit.com — free, self-contained binary glTF, no Draco.
License: **CC0 1.0** (public domain, no attribution required; credited here
anyway). Human packs ship named animation clips: `Idle`, `Walk`, `Run`,
`Death`, `Hit`, `Attack`, `Special`. Models face +Z, units in metres.

| File | Gobkit model | Replaces |
|---|---|---|
| `char-courier.glb` | FoodCourier (human001) | Player character (was the capsule) |
| `char-cashier.glb` | Cashier (human001) | NPC variety |
| `char-accountant.glb` | Accountant (human002) | NPC variety |
| `char-patrol.glb` | HighwayPatrol (human012) | NPC variety (police look) |
| `char-paramedic.glb` | Paramedic (human005) | NPC variety |

Total characters: ~2.6 MB.

## Cars — Kenney Car Kit (CC0 1.0)

Source: Kenney free assets, car kit (via the Suica demo asset mirror
`boytchev.github.io/suica/assets/models/cars/`, which cites the Kenney CC0
license https://creativecommons.org/publicdomain/zero/1.0/).
License: **CC0 1.0**. Wheels are separate nodes (`wheel-front-left/right`,
`wheel-back-left/right`); front wheels are at +Z, so forward = +Z, matching
the game's heading math. No `sedan`/`taxi`/`police` filenames exist in that
folder — the set below is what actually exists there.

| File | Kenney model | Role in game |
|---|---|---|
| `car-race.glb` | race | Sports / traffic car |
| `car-suv.glb` | suvLuxury | SUV / traffic car |
| `car-truck.glb` | garbageTruck | Truck |
| `car-ambulance.glb` | ambulance | Emergency / police-car body (red-blue light bar added in code) |
| `car-van.glb` | Cesium Milk Truck (see below) | Van / truck |

## Van — Khronos glTF Sample Assets (CC BY 4.0)

Source: https://github.com/KhronosGroup/glTF-Sample-Assets (`CesiumMilkTruck.glb`).
License: **CC BY 4.0** — © 2017 Cesium. Attribution: model by Cesium,
used under CC BY 4.0 (this file is the attribution record). Note: the
original sample carries a Cesium logo/trademark note; the truck body in the
game is used as a generic delivery van.

Total models: ~4.1 MB (characters + cars), well under the 10 MB phone aim
(the `.b64` text companions add ~33% in the repo, not in game memory).

## Props — built in code, NOT downloaded GLBs (honest note)

No free GLB phone/backpack of good quality was found in this round, so the
phone and backpack in `models23.js` are detailed multi-part primitives with
textures (phone: dark body + canvas screen with clock/contact/call button;
backpack: fabric body + front pocket + straps + zipper strip). They are
reported as primitives, not as downloaded models, in the release notes.

## 3.0.0 — Ten more characters, real nature, a tractor, a pet dog
Source: Gobkit free library (https://gobkit.com/api/free, CC0 1.0 — public
domain, no attribution required; credited here anyway). All files below
were downloaded 2026-11-01, verified to start with the `glTF` magic, and
verified to load in Three.js r158 (GLTFLoader) with their animation clips.

| File | Gobkit model | Notes |
|---|---|---|
| `char-grandma.glb` | GrandmaShopper (human001) | Elder shopper; rendered 0.93x (slightly shorter) |
| `char-officelady.glb` | OfficeLady (human001) | Office worker |
| `char-schoolkid.glb` | Schoolkid (human001) | Child proportions; rendered 0.78x (~1.4 units, family game, no sexualisation) |
| `char-stockclerk.glb` | StockClerk (human001) | Shop worker |
| `char-officemanager.glb` | OfficeManager (human002) | Has Wave, Sit, Talk, TalkSit, Present clips; used for the seated park figure + waves |
| `char-receptionist.glb` | Receptionist (human002) | Has Greet, Wave, Sit, Talk clips; used for the talking market figure + waves |
| `char-nurse.glb` | WardNurse (human005) | Hospital staff |
| `char-doctor.glb` | WhiteCoatDoctor (human005) | Hospital staff |
| `char-firechief.glb` | FireChief (human007) | Emergency services |
| `char-policechief.glb` | PoliceChief (human012) | Police |
| `prop-tree-low.glb` / `prop-tree-med.glb` / `prop-tree-high.glb` | TreeLow001 / TreeMed002 / TreeHigh002 (Nature Kit) | Static nature props. NOTE: Gobkit props are NOT in metres — file-space heights are 432 / 745 / 790 units, so the game scales them to 2.6 / 4.2 / 6.0 units and instances them (not one mesh per tree). |
| `prop-bush.glb` / `prop-rock.glb` / `prop-cloud.glb` | Bush002 / Rock001 / Cloud002 (Nature Kit) | Bushes/rocks instanced; clouds scaled from 235 file units to ~12-16 units and drifted. |
| `pet-corgi.glb` | Corgi (Animal Pack Vol.1) | Pet dog; clips idle/attack/dead/walk (lowercase). Follows the player; a second corgi wanders the park. File-space height 441 units (minY -200), scaled to 0.55 units with feet on the ground. |

Total characters now: 15 (5 from 2.3.0 + 10 new). New binary total in 3.0.0: ~5.7 MB (characters ~5.3 MB, tractor 0.18 MB, nature 0.1 MB, corgi 0.11 MB); with .b64 companions ~7.6 MB of repo text (not game memory).

## 3.0.0 — Vehicles (variants, not new downloads, except the tractor)
| File / variant | Source | Notes |
|---|---|---|
| `car-tractor.glb` | Kenney Car Kit via the Suica demo asset mirror (CC0), `tractor.glb` | Real wheel nodes (wheel-front/back-left/right); drivable as a parked GTA car (pitch 0.62 diesel rumble in audio.js). Other Suica car names (sedan/taxi/police/hatchback/van/bus/pickup) returned 404 — they do not exist in that mirror, so they are NOT claimed. |
| TAXI | Existing Kenney `race` body | Every 4th GTA traffic car is repainted yellow (0xf7c948) with a canvas TAXI roof sign (models23 installCars). A role/variant, not a separate GLB. |
| Police car | Existing Kenney `suvLuxury` body | Now a white SUV (0xf5f5f5) with the red/blue light bar (was the ambulance body). |
| Bus | Existing Kenney van body | A STATIC bus prop at the bus stop is NOT in 3.0.0 — cut for performance honesty: stretching the van GLB would distort its wheels. The bus remains a future item, not a claim. |
