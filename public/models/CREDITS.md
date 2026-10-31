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
