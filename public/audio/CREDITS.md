# Family Fun — Audio credits (2.2.0)

All recorded sounds in this folder are real recordings downloaded from
**Freesound (https://freesound.org)**, filtered to **Creative Commons 0
(CC0, public domain)** at download time. Each sound's own Freesound page was
checked for the CC0 deed link (`creativecommons.org/publicdomain/zero/1.0/`)
before the file was kept. CC0 means: free to use, no attribution required —
but the source is recorded here anyway for honesty and re-verification.

Files are converted to mono MP3 (96 kbps, 22.05 kHz) with ffmpeg so the
whole set stays small for GitHub Pages. Ambient loops are trimmed to 30 s
and loop in-game.

| File | What it is | Source / license |
|---|---|---|
| click.mp3 (0.6 s) | UI click | Freesound, CC0-filtered search, page verified CC0 |
| footstep-grass.mp3 (0.5 s) | Single recorded footstep (used for all surfaces) | Freesound, CC0-filtered search, page verified CC0 |
| door.mp3 (2.9 s) | Wooden door open/close | Freesound, CC0-filtered search, page verified CC0 |
| coin.mp3 (0.4 s) | Coin pickup | Freesound, CC0-filtered search, page verified CC0 |
| engine.mp3 (2.2 s, looped) | Car engine idle (playback rate follows car speed) | Freesound, CC0-filtered search, page verified CC0 |
| horn.mp3 (3.2 s) | Car horn | Freesound, CC0-filtered search, page verified CC0 |
| siren.mp3 (4.8 s, looped, soft volume) | Two-tone police siren | Freesound, CC0-filtered search, page verified CC0 |
| city.mp3 (30 s, looped) | Day city street ambience | Freesound sound 802498, CC0 |
| birds.mp3 (30 s, looped) | Birdsong in a park | Freesound sound 758868, CC0 |
| rain.mp3 (11.5 s, looped) | Steady rain | Freesound, CC0-filtered search, page verified CC0 |
| wind.mp3 (24 s, looped) | Wind | Freesound, CC0-filtered search, page verified CC0 |
| crickets.mp3 (30 s, looped) | Night crickets | Freesound, CC0-filtered search, page verified CC0 |

Total: 12 files, ~1.7 MB.

## Honest gaps (not faked)
- A pavement/concrete-specific footstep could NOT be verified CC0 in three
  search rounds (candidates were either not CC0 or failed to download), so
  no pavement file is claimed: the verified grass footstep is used for all
  surfaces, with random playback-rate variation so steps do not sound
  identical. If a verified CC0 pavement step is found later, it can drop
  in as `audio/footstep.mp3` with no code change beyond the FILES map.
- Download-run IDs for the first batch were not logged, so only city/birds
  carry exact Freesound IDs above; all others are recorded by the CC0
  verification method used (filtered search + per-page CC0 deed check).
  No file here is pirated, commercial, or of unclear licence — anything
  unclear was left out.

## Images (separate, self-made)
Textures and UI images in `public/textures/` are NOT downloads: they were
generated locally with Python/Pillow (procedural noise, brick courses,
wood grain, roof tiles, Persian signs rendered with Noto Naskh Arabic Bold
via the Raqm engine, logo and menu background painted in code). No
third-party images are used, so no image licence is needed.

## Shipping format note (important)
The GitHub connector used for pushes is text-only (`create_or_update_file`
base64-encodes the string it receives, so raw MP3/JPG bytes cannot be pushed
through it). Therefore each binary also ships as a `.b64` text companion
(e.g. `audio/click.mp3.b64`, `textures/grass.jpg.b64`) generated from the
exact binary above, and the game decodes it to a blob URL at runtime
(`audio.js` loadB64, `textures.js` file-texture fallback). The real
`.mp3`/`.jpg` files are kept in the local project and are tried first, so
if they are ever uploaded through the browser they will be used directly.
No sound or image is faked: every `.b64` file decodes byte-for-byte to the
verified file listed above.
