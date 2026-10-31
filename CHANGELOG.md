## 2.7.0 — Closer camera + quiet text + denser city (2026-10-31)
- CAMERA CLOSER (camera24.js, still the single TPV controller; game-core calls it, the old inline code is fallback-only): the 2.6.0 driving shot left the van tiny in a sea of grass. With the 2.5.0 scale (player 1.8 units): Follow foot 4.8 -> 3.8 / height 2.7 -> 2.5 / FOV 64 (slant sqrt(3.8^2 + (2.5-1.45)^2) = 3.94, visible height 2*3.94*tan(32deg) = 4.93, player = 1.8/4.93 = 36.5% of screen height, was 29%); Shoulder foot 3.4 -> 2.8 / 2.3 / 62; Wide foot 7.5 -> 5.5 / 3.3 / 68; driving Follow 8.6 -> 6.3 / 3.9 -> 3.4 / 74 -> 72; Shoulder drive 6.5 -> 5.0 / 3.2 / 70; Wide drive 11 -> 8.0 / 4.8 / 74. dt-damping + collision pull-in (min distance 1.2, height floor) unchanged, so closer defaults still never clip through walls/vehicles.
- QUIET TEXT (game-core.js updateTag + showToast, index.html, new quiet27.js loaded last so its CSS wins): NPC name tags only within ~12 units and only in front of the camera, fading from 0.85 opacity close to ~0.25 at 12 units, then hidden entirely — far NPCs get no tag at all; player tag follows the same rule; tag pill smaller (10px, background 0.55 alpha, no emoji clutter in the sub-line). Interact/exit button is now a small quiet pill (44px tall area, 12px font, dark translucent, 1px border, NO glow, NO pulse animation) anchored bottom-right (right:88px, bottom:44px) instead of the huge glowing centre "پیاده شو" button. Toasts capped at ONE at a time (2500 ms, smaller 11px, 0.75 alpha); stats labels tiny + faint (8px, 0.45) even when expanded; quest card collapsed to 160px wide with dot + short title only; dialog headers compact; location/weather/tip signs small and faint. Guidance moves into the world: a small pulsing cyan ground ring at the central plaza (-10, 44) marks the default objective area instead of floating text.
- DENSER CITY (new city27.js, all try/catch): a second road grid (vertical x=-32, horizontal z=32) with asphalt, sidewalks, curbs and dashes; 10 varied district buildings (heights 5-9, brick/plaster facades, window grids with some lit windows, doors, coloured awnings) in the outer ring, each registered as a logic collider so player and camera collide with them; tree rows along roads as InstancedMesh (trunks + 3 foliage colours); lamp posts along the new roads (emissive bulbs only, no extra point lights for mobile performance); a park at (-20, 26) inside the road-bounded block (paths, benches, flower beds) clear of both new roads; 4 detailed parked cars along the new roads (paint body, dark cabin, cylinder wheels, userData.gtaCar so camera24 avoids them, plus a logic collider each); a 24-tower skyline silhouette ring at radius ~88 so the horizon is not an empty flat plane.
- KEPT: landscape-only + rotate overlay, decluttered HUD, joystick 2.5.0 camera-basis fix, camera modes (persisted), GTA systems, soft sound mix 2.6.0, enter/exit cars 2.6.0, soft collisions, save, Persian RTL, quality presets.
- HONEST LIMITS: no real phone was available, so the 36.5% screen fraction is computed from FOV + distance + 1.8 height, not measured from a rendered frame; the plaza ring marks the default objective area, not a dynamic objective tracker (objective coordinates are not exposed by world-overhaul); new district buildings are textured boxes with window grids, not interior-modelled buildings.

## 2.6.0 — Soft sound mix + touch enter/exit cars + soft collisions + polish (2026-10-31)
- SOUND DIAGNOSIS (measured, not guessed): engine loop pitch reached 2.24x (0.7+speed*0.05, x1.18 police) = pure whine, with no filter; horn file peaks at 0.0 dB (full-scale) and ran 3.2 s at 0.56 effective gain; siren is a loud two-tone recording (mean -13.4 dB) looped with NO distance attenuation; city/birds/rain/engine/ambient/footstep layers stacked at master 0.7 with no compressor and no fade-in on one-shots (click/pop attacks).
- SOUND FIX (audio.js + ambient23.js + engine22.js): new ffmpeg-softened derivatives of the same CC0 sources — siren-soft.mp3 (lowpass 1500 Hz, -6 dB, 0.4 s fades; mean now -19.3 dB, max -16.9 dB) and engine-soft.mp3 (lowpass 800 Hz); engine rate capped at 1.25x (police 1.05x, van/truck 0.82x) and base lowered to 0.03+speed*0.0025; all loops routed through a WebAudio DynamicsCompressor (threshold -20 dB, ratio 5) with per-loop gain nodes, falling back to el.volume if the graph cannot be built; every one-shot fades in over ~80 ms; horn fades out after 0.9 s (never a 3.2 s blast); siren is distance-attenuated (0.09 at <=6 units -> 0.012 at >=35, 0.9 s fades) using the nearest police light distance measured in engine22's 1/sec tick; beds lowered (city 0.14, birds 0.10, crickets 0.14, rain 0.20, wind 0.07); one-shot gains cut (click 0.35, footstep 0.32, door 0.42, coin 0.40, horn 0.45); ambient events lowered + 150 ms fade-in; default master 0.55 (was 0.7); the drawer volume slider already controlled all loops via applyLoopVolumes and still does (now via the gain nodes).
- ENTER/EXIT CARS (the mobile bug): GTA enter was keyboard-E ONLY and the touch interact button only handled objects/NPCs, so on a phone cars were literally unboardable. Now game-core checkInteractions shows "🚗 سوار شو — <car label>" within 3.5 units of any GTA parked/traffic/police car (label via FFGTA.carLabel) and "🚶 پیاده شو" while driving, wired to FFGTA.enterCar/exitCar (newly exposed on window.FFGTA along with nearestCar/cars/policeCars). enterCar stops a moving traffic car first (it stays parked after you leave), steps the player to the nearer door side instead of teleporting, then hides after 250 ms with a door sound; exitCar places the player beside the car on a side that is NOT inside a building (old diagonal +2,+2 could drop you into a wall), with a 0.9 s enter/exit grace (FFEnterGrace) during which car push-out is disabled. The gameplay-overhaul E handler now defers to GTA when a GTA car is near or GTA driving is active (previously both E handlers could fire: GTA enter + overhaul enter/mission toast).
- COLLISIONS, SOFT (game-core.js + gta.js): player movement is substepped into <=0.4-unit steps (no tunnelling on sprint); player-vs-car contact pushes the player out to a 2.3-unit circle (prompt range 3.5 still lets you board); NPC separation eases to 0.9 at dt*3/s instead of teleporting to exactly 0.9 in one frame; car-vs-building impact is now speed-proportional (gentle touch: speed x0.35, no damage, no fine; hard hit >8: damage min(12, speed*0.5), soft bounce x-0.15, fine) and the old SECOND car-car damage loop was removed (it double-counted every impact); traffic cars now also stop for a pedestrian on foot within 4 units (was: only for the player car), so nobody gets run over while walking up to board.
- POLISH (gta.js makeCarMesh): car interiors (front seats + rear bench + steering wheel, visible through the glass), brake lights (bright while braking), indicators (blink with steering), headlights (bright at night, dim by day). Landscape-only, decluttered HUD, joystick 2.5.0 camera-basis fix, camera modes, GTA systems, save, Persian RTL, quality presets all preserved.
- HONEST LIMITS: no real phone was available to hear the mix or drive a car in-game; the soft mix is gain/envelope/filter based (loops additionally through a live compressor when WebAudio is available) and must be judged by ear on the phone; horn is still the same CC0 recording, only capped/faded, not replaced (no verified softer CC0 horn was found in this round).

## 2.5.0 — Joystick L/R fix + scale fix + camera modes + GTA city dressing (2026-10-31)

- JOYSTICK L/R ROOT CAUSE (game-core.js, PROVEN from the camera geometry — the 2.2.0 claim was wrong): the camera sits at player − (sin,cos)·dist and looks along F=(sin,cos), so its true screen-right is F × up = (−cos,sin). The old right vector was (1,0,0) rotated by camYaw = (cos,−sin) — exactly the NEGATIVE of screen-right. So joystick-right (and D) moved the player screen-LEFT and joystick-left moved screen-RIGHT, while forward/back (which used the correct F) stayed right — precisely the 2.4.0 user report. FIX: the movement basis is now derived DIRECTLY from the live camera every frame (forward = camera.getWorldDirection() projected on XZ; right = forward × up), so joystick-up = forward, joystick-right = screen-right, and WASD uses the same basis — keys and joystick can never disagree again, whatever camYaw convention is. Driving steering sign fixed the same way in both driving systems (gta.js, gameplay-overhaul.js): car forward F=(sin h,cos h) has dF/dh = (cos,−sin) = −screen-right, so turning screen-right needs heading to DECREASE; the old '+=' steered the wrong way. Joystick container is also forced direction:ltr so the knob can never be RTL-mirrored.
- SCALE FIX (models23.js fitCharacter, measured with three's own shader formula, not Box3 and not a magic factor): Box3 ignores skinning (0.15 for a character whose SKINNED render is 0.4455 in scene space, measured with three r158: skinVertex = bindMatrix·pos; skinned = Σ boneMat·skinVertex·weight; world = bindMatrixInverse·skinned, then matrixWorld). The 2.4.0 factor 0.5 therefore still left the player at 0.4455×5.667 = 2.52 units in one direction and, combined with the far camera, reading as tiny on the user's screenshot. Now fitCharacter measures each model's skinned height at runtime (courier 0.4455, cashier 0.3907, accountant 0.3415, patrol 0.3756, paramedic 0.3883) and sets scale = 1.8 / measured, so EVERY character renders exactly 1.8 units tall (±6% NPC variation), feet grounded on the skinned min-Y (not the Box3 min). A sedan is 4.1 long / ~1.0–1.7 high, so a 1.8 person next to a car now reads correctly (head near a sedan roof, below a van/truck roof). Backpack (y 0.88) and phone (y 1.48) heights re-tuned for the 1.8 player; name tags moved to y+2.05.
- GTA CAMERA MODES (camera24.js, still the single TPV controller): Follow (default, closer: dist 4.8 / height 2.7 / FOV 64, side 0.55 — slant 4.97, screen fraction 1.8/(2×4.97×tan32°) = 29%, the GTA target band 25–30%), Shoulder (dist 3.4 / height 2.3 / FOV 62, side 1.05), Wide (dist 7.5 / height 3.8 / FOV 70). Driving scales per mode (Follow 8.6/3.9/74, Shoulder 6.5/3.2/70, Wide 11/4.8/76). A 🎥 button in the ☰ drawer cycles the modes and persists the choice in localStorage; collision pull-in (buildings AND vehicles) and dt-damped smoothing are unchanged and apply to all modes. Head anchor raised to 1.65 / look to 1.45 for the 1.8 player.
- ALL PEOPLE ARE GLB NOW: the yellow capsule figure in the 2.4.0 screenshot was a GTA traffic pedestrian (gta.js makePed) — a separate list from window.npcs, so installNPCs never touched it. gta.js now exposes FFGTA.peds, and models23 installPeds() replaces every ped with a GLB model at the corrected scale (original capsule hidden, mixer driven from position delta like NPCs). NPC walk speeds now vary per NPC (0.85–1.17×) via speedFactor.
- GTA CITY DRESSING (new city25.js): dashed white centre lines on both main roads, zebra crossings at the four junction approaches, dark curb stones along the sidewalks, flower planters on the plaza approaches, and two glowing Persian district signs ('مرکز شهر', 'بازار شبانه') on posts. Cars also get real paint: each GLB car gets a cloned MeshStandardMaterial in a varied palette (red/blue/yellow/green/purple/orange/teal/white) with metalness 0.55 / roughness 0.38, and dark wheels, instead of the flat all-white look in the screenshot.
- KEPT: landscape-only + rotate overlay, decluttered HUD, GTA systems, save, Persian RTL, quality presets, 2.3.0 ambient sounds, 2.2.0 audio manager. Honest limit: no phone/browser render was available to this agent, so the 29% screen-fraction figure is computed from FOV + distance + 1.8 height (not measured from a rendered frame) — the phone retest must confirm the player size on screen.

## 2.4.0 — GTA camera + scale fix + all NPCs + natural walking (2026-10-31)

- SCALE FIX (models23.js fitCharacter) — the 2.3.0 giant-player bug, measured not guessed: Box3.setFromObject() ignores skinning, so for a skinned Gobkit character it measures only bind-pose geometry (height ≈0.15, measured in node with three r158, the game's own code path). The old scale 1.7/0.15 ≈ 11.3 made the skinned render come out ~2.7–4.6 units tall on the user's phone screenshots (player filled ~50% of screen height), towering over a race car whose reliable non-skinned height is only 1.17. Fix: halve the Box3-derived scale (correction 0.5, midpoint of the measured 1.6–2.7x over-scale range) → rendered player ≈1.7 units. STANDARD (all measured, three r158 Box3 at scale 1): character ≈1.7 tall; race car length 2.56→fitted 4.1, height 1.17; SUV 2.85→4.1, height 1.87; truck 3.45→4.6, height 2.13; ambulance 3.25→4.1, height 2.27; van 4.87→4.6, height 2.50; cars are now clearly larger than a person, and the player is the SAME height as every NPC (±6% deterministic variation only).
- GTA CAMERA (new camera24.js — the ONLY TPV camera controller; game-core calls it, old inline code is fallback only): camera behind the character, over the shoulder, slightly above; frame-rate-independent exponential damping everywhere (yaw 5/s, position 6/s, look 8/s, FOV 4/s) instead of the old per-frame lerp(0.08) that made smoothing depend on fps; look target is damped too (the old instant lookAt while position lerped was the visible shake). CONTINUOUS collision: a ray from the player's head to the desired camera position is tested against every building AABB (expanded 0.45) AND every vehicle sphere (radius from the fitted length/width) and shortened to the first hit minus 0.35 — no 0.5-unit steps (which popped) and no building-only checks (which let the camera sit INSIDE the van in screenshot 2). Minimum distance 1.2, height floor so a pulled-in camera stays above the head instead of diving to the ground. Foot: dist 6.0 / height 3.0 / FOV 68 (≈21% screen height for a 1.7 player); driving: dist 8.6 / height 3.9 / FOV 74, same collision + smoothing. The old logic23 cameraDistance() is deprecated but kept for the fallback path.
- ALL NPCs: all 24 NPCs use a GLB model (rotating courier/cashier/accountant/patrol/paramedic) at the player's scale (±6%); the "tiny NPC" look in the screenshots was the giant player making normal NPCs look small by comparison, plus any unmodelled capsule fallback now uses the corrected scale. NPCs also turn smoothly (shortest-arc yaw lerp) instead of lookAt() snapping.
- NATURAL WALKING + MOVEMENT: player body yaw now lerps to the movement direction (shortest arc, dt*10) instead of snapping; the GLB player group in models23 follows the capsule yaw with the same damped lerp instead of a direct assignment (which had re-introduced the snap). Animation playback rate follows ground speed (walk ~0.7–1.1x, run 1.3x, idle 1x) with the existing 0.2s crossfades; footsteps now trigger on walk-cycle zero crossings (every half cycle) so step rhythm matches walk vs sprint instead of a fixed 0.38s timer. Accel/decel curves from 2.3.0 kept.
- CARS: fitCar now takes the LONGEST horizontal extent as length, rotates an X-dominant model -90° about Y so its front faces +Z like every other car, and caps width at 2.1; fitted dims are stored (wrapper.userData.ff24) for the camera's vehicle spheres. Backpack/phone prop heights re-tuned for the 1.7 player (backpack y 0.82, phone y 1.32).
- KEPT: landscape-only + rotate overlay, decluttered HUD, joystick fix, engine22, 512px textures, GTA systems, save, Persian RTL, quality presets. Honest limit: the 0.5 scale correction is calibrated from screenshot proportions + Box3 measurement, not from a rendered frame (no phone/browser render available to this agent) — the phone retest must confirm the player is ~1.7 next to a car before this is called exact.

## 2.2.0 — Joystick fix + engine/graphics + real audio & images (2026-10-31)

- JOYSTICK ROOT CAUSE (game-core.js): the camera sits at player − (sin,cos)·dist and looks along +(sin,cos), but the walk-forward vector was (0,0,−1) rotated by camYaw = (−sin,−cos) — the direction from the player TO the camera. So joystick-up / W moved the player toward the viewer (reversed on screen), and the character walked facing the camera. Fixed: forward is now (0,0,1) rotated = +(sin,cos). The right vector (1,0,0) rotated was already screen-right, so only forward/back was flipped. Camera drag was also reversed (drag-right panned left): camYaw now increases with drag-right for both touch and mouse. Joystick is clamped to ±1 with a 0.15 deadzone, exposes window.FFJoy, and driving now reads it — both GTA driving (gta.js) and overhaul driving (gameplay-overhaul.js) previously read ONLY keyboard keys, so the joystick did nothing in a car at all. There is exactly ONE joystick implementation (game-core setupControls); no second joystick was found to merge.
- ENGINE: Three.js deliberately kept at 0.158.0 (already has outputColorSpace, physical lights, ACES; 0.17x adds no visible benefit and risks breaking bundled addons/globals on phones). Pipeline upgraded in engine22.js: PCFSoft shadows, 170×170 shadow camera, bias/normalBias tuned, sRGB output explicit, exposure 1.15, anisotropy up to 8 on all textures, sun-glow sprite following the sun, day/night ambience switching.
- GRAPHICS: real 512px image textures (public/textures/, Pillow-generated, canvas fallback if a file fails): grass, asphalt, sidewalk, brick, plaster, wood, roof, foliage, sky; Persian shop signs (Noto Naskh Arabic Bold + Raqm, no emoji — emoji rendered as tofu in that font, so signs are text-only); logo.png and menu-bg.jpg on the start screen. City props: benches, bins, hydrants, bus-stop shelter, billboard. Cars: headlights/taillights, wheels that spin on their own axis, brake-light pulse. Characters: NPC scale + skin-tone variety so they are not clones.
- AUDIO (replaces procedural beeps): 12 real Freesound CC0 recordings in public/audio/ (~1.7 MB total, sources + licences in public/audio/CREDITS.md): click, footstep, door, coin, engine (rate follows speed), horn, siren (soft, while wanted), city/birds day ambience, crickets night, rain + wind. Footsteps play in rhythm with the walk animation; ambience crossfades day/night/rain; master volume slider added to the ☰ menu drawer; mute/volume persist. No audio before the first gesture. Honest gap: a pavement-specific footstep could not be verified CC0, so the verified grass footstep covers all surfaces.
- SHIPPING NOTE: the GitHub connector push is text-only, so every binary also ships as a `.b64` text companion decoded to a blob URL at runtime (audio.js loadB64, textures.js fallback, engine22 start-image fallback); real .mp3/.jpg files are kept locally and tried first.
- KEPT from 2.1.0: landscape-only + rotate overlay, decluttered HUD (slim top bar, 90px minimap, collapsible quest, single ☰ drawer), GTA police/wanted/jobs/story/properties, save, Persian RTL, quality presets.

## 2.1.0 — افقی + خلوت‌سازی کامل (۲۰۲۶-۱۰-۳۱)
- بازی اصلی فقط افقی: قفل جهت افقی روی دکمه ورود + اورلی «گوشی را افقی بچرخانید» در حالت عمودی که بازی را می‌پوشاند؛ صفحه شروع در هر جهتی باز می‌ماند؛ manifest روی landscape است.
- HUD یکپارچه: یک نوار باریک بالا (آواتار، نام، سطح، سکه، ساعت)؛ آمار فقط با ضربه روی نوار بالا یا ۴ ثانیه پس از تغییر دیده می‌شود؛ یک مینی‌مپ ۹۰ پیکسلی؛ یک کارت مأموریت جمع‌شونده؛ همه‌ی دکمه‌های GTA/شغل/تنظیمات در یک کشوی منو؛ سرعت فقط هنگام رانندگی؛ راهنمای لمسی به‌جای WASD/Shift/E روی گوشی؛ نشان پایین صفحه حذف شد.
- دوربین عقب‌تر (فاصله ۳٫۲ به ۶٫۸، ارتفاع ۱٫۹ به ۳٫۴، زاویه دید ۶۰ به ۶۸) تا کاراکتر حداکثر ~۲۵٪ ارتفاع صفحه در حالت افقی باشد.
- کاراکتر کپسولی واقعی: buildHumanoid بازنویسی شد (تنه و دست و پای کپسولی، سر کروی با چشم و لبخند، مو/حجاب) و برای بازیکن و همه‌ی NPCها اعمال می‌شود؛ پل window.initGame هم صریح شد.
- شهر: میدان مرکزی با فواره و نیمکت و چراغ‌های واقعی شب، خط‌کشی جاده‌های اصلی، درخت‌های متنوع، تابلوهای فارسی جدید.

# Changelog

## 2.0.1 — رفع هنگ بارگذاری + مرحله‌های GTA (۲۰۲۶-۱۰-۳۱)

### رفع باگ بارگذاری
- علت: سایت زنده ریشه ریپو را سرو می‌کرد، نه خروجی dist اکشن‌ها؛
  `src/main.js` خام با ایمپورت bare ‏`three` در مرورگر اجرا نمی‌شد و
  `boot()` هرگز اجرا نشد، پس صفحه بارگذاری برای همیشه ماند.
- رفع: هر فایل بازی حداکثر ۸ ثانیه برای بارگذاری وقت دارد؛ در صورت خطا،
  صفحه بارگذاری پنهان و یک پنل خطای فارسی با نام فایل/پیام و دکمه
  «تلاش مجدد» (رفرش صفحه) نشان داده می‌شود؛ یک نگهبان ۲۵ ثانیه‌ای در
  `index.html` هم جلوی چرخش بی‌پایان را می‌گیرد (برای حالتی که خود باندل
  ماژول اصلاً اجرا نشود). پوش تازه به main یک ران جدید Pages را تریگر
  می‌کند تا dist به‌درستی جایگزین سرو ریشه شود.

### GTA مرحله ۱ — سیستم‌های شهر باز
- شهر تا ‎±۷۲‎ گسترش یافت (قبلاً ‎±۴۰‎)، جاده‌های حلقه‌ای، تابلوهای محله‌ها،
  اداره پلیس، ۸ ماشین ترافیک با مسیر و توقف پشت چراغ، ۱۲ ماشین پارک‌شده،
  ۳ ماشین پلیس، ۱۰ عابر پیاده.
- رانندگی کامل: شتاب/ترمز/ترمز دستی، آسیب و دود، بنزین، تعمیر با R در گاراژ،
  سوار هر ماشین نزدیک با E.
- پلیس + وانتد ۱ تا ۵ ستاره، تعقیب، جریمه و برگشت به خانه در دستگیری.

### GTA مرحله ۲ — زندگی شهر و گرافیک
- آب‌وهوا: صاف، غروب، باران، مه — با اثر روی چسبندگی جاده، سرعت ترافیک و
  رفتار عابرها؛ نور شب پنجره‌ها، نیمکت، سطل، بیلبورد فارسی، چراغ‌های حلقه‌ای.
- فضای داخلی قابل ورود: کافه، گاراژ، اداره پلیس (با E نزدیک در).
- شخصی‌سازی: رنگ لباس/مو، رنگ ماشین در گاراژ، چراغ حیاط خانه.

### GTA مرحله ۳ — داستان و پیشرفت
- ۶ مأموریت زنجیره‌ای با دیالوگ سینمایی و نشان هدف، شغل تاکسی/تحویل/پیک،
  خرید ملک با درآمد دوره‌ای، شهرت محله‌ها، دستاوردها، باز شدن ماشین اسپرت.
- همه محتوای قبلی حفظ شد: ۲۴ شخصیت، ۱۴ ساختمان، مأموریت‌ها، شغل‌ها،
  ذخیره، صدا و سه کیفیت گرافیک.


## 2.0.0 — ارتقای حرفه‌ای (۲۰۲۶-۱۰-۳۱، محلی، منتشر نشده)

### تثبیت (Phase 0)
- یک نقطه ورودی واحد: `index.html` + `src/main.js`.
- حذف فایل تکراری `family-fun-index.html`.
- انتقال `src-nextgen.js` و `src-cinematic.js` به `docs/legacy/` و عدم بارگذاری آن‌ها.
- یکپارچه‌سازی سه حلقه `requestAnimationFrame` (هسته، جهان، گیم‌پلی) در یک
  حلقه مرکزی با یک `delta time`.
- حذف مینی‌مپ دوم و پنل وضعیت دوم؛ یک HUD، یک مینی‌مپ، یک پنل مأموریت.

### گرافیک (Phase 1)
- بافت‌های رویه‌ای Canvas برای چمن، آسفالت، آجر، دیوار، چوب، سقف و پیاده‌رو
  با `map` + `bumpMap` و زبری متنوع، به‌جای رنگ تخت همه‌جا.
- کیت ساختمان: نمای آجری، قاب پنجره، سایبان، در با قاب، سقف متنوع و
  تابلوی فارسی Canvas با نور ملایم.
- درختان با `InstancedMesh` و حلقه دوردست کم‌پلی.
- کاراکترهای کپسولی با مفصل‌های نام‌دار، چهره ساده، ترکیب راه رفتن/دویدن
  و تنفس در حالت بی‌حرکت.
- چرخه روز و شب بر اساس ساعت بازی: خورشید/ماه، نور نیم‌کره، پنجره‌ها و
  چراغ‌های روشن در شب، آسمان Shaderای، ستاره و ابر، مه.
- ذرات: غبار/برگ، گرد قدم، جرقه تعامل، باران با بازگشت به بالا.
- Bloom (فقط کیفیت بالا، از طریق EffectComposer در باندل Vite) و
  Tone Mapping از نوع ACES.
- سه پیش‌تنظیم کیفیت (سبک/متعادل/بالا) با تشخیص خودکار موبایل و
  وضوح تطبیقی؛ یک نور سایه‌انداز جهت‌دار با سایه قابل تنظیم.
- Three.js با Vite + npm باندل می‌شود؛ وابستگی به CDN در زمان اجرا حذف شد.

### گیم‌پلی داده‌محور (Phase 2)
- `quests.js`: سه زنجیره مأموریت (آشنایی با شهر، کار و درآمد، دوست‌های جدید)
  با قدم‌های گفتگو/ورود/شغل و پاداش.
- `economy.js`: یک وضعیت پول واحد؛ پایان جدایی پول HUD و پول مأموریت و
  پایان سقف ۱۰۰ (تا ۹۹٬۹۹۹).
- شغل‌های شیفتی: کافه، کتابخانه، گاراژ — با حقوق، هزینه انرژی و گذر زمان.

### صدا و ذخیره (Phase 3)
- صدای رویه‌ای WebAudio: کلیک، قدم، در، غرش موتور، باران، پد موسیقی
  روز/شب؛ دکمه قطع صدا و ذخیره تنظیم در `localStorage`.
- ذخیره `localStorage`: ذخیره خودکار، ۳ اسلات، خروجی/ورودی JSON؛
  بازیکن، آمار، پول، مأموریت، موقعیت و زمان پس از رفرش باقی می‌مانند.

### موبایل و دسترسی‌پذیری (Phase 4)
- HUD شیشه‌ای یکدست، دکمه‌های ذخیره/صدا/کیفیت/اسلات، برچسب سکه،
  پنل مأموریت یکپارچه و دکمه ادامه بازی ذخیره‌شده.
- Safe-area، چیدمان واکنش‌گرا برای صفحه کوچک، متن فارسی خواناتر،
  و پشتیبانی از `prefers-reduced-motion`.
- مانیفست PWA بدون Service Worker (تا نسخه قدیمی کش نشود).

### انتشار (Phase 5)
- نسخه ۲٫۰٫۰ در بازی و README، این Changelog، TESTING.md، و ورک‌فلوی
  GitHub Pages (فقط فایل، اجرا نشده).

## 2.3.0 — مدل‌های واقعی + صداهای متنوع + منطق بازی بهتر

- **مدل‌های واقعی (GLB، نه کد):** ۵ کاراکتر انسانی Gobkit با CC0 (بازیکن: پیک غذا؛ NPCها: صندوقدار، حسابدار، پلیس بزرگراه، امدادگر) با انیمیشن‌های Idle/Walk/Run؛ ۴ ماشین Kenney با CC0 (مسابقه، SUV لوکس، کامیون زباله، آمبولانس) + وانت شیر Cesium با CC BY 4.0. چرخ‌ها نود جداگانه‌اند و می‌چرخند/فرمان می‌گیرند. در صورت خطای بارگذاری، کپسول/ماشین جعبه‌ای ۲٫۲٫۰ باقی می‌ماند — بازی هرگز شخصیت نامرئی نشان نمی‌دهد. مجموع مدل‌ها ~۴٫۱ مگابایت.
- **صداهای متنوع، بدون لوپ تکراری:** سیستم رویداد تصادفی محیطی (هر ۴ تا ۱۵ ثانیه، ولوم تصادفی): ۴ صدای جدید CC0 (جیغ پرنده، کلاغ، جمعیت کافه، زنگ در) + وزش باد و عبور ماشین به‌صورت تک‌رویداد با اوج‌گیری صدا، نه لوپ. قدم‌ها بر اساس سطح (چمن/پیاده‌رو/چوب داخل خانه) با نرخ پخش متفاوت. صدای موتور بر اساس نوع ماشین زیرتر/بم‌تر می‌شود (ماشین ۱٫۰، وانت/کامیون ۰٫۷۵، پلیس/آمبولانس ۱٫۱۸).
- **برخوردها:** برخورد واقعی بازیکن و NPCها با ساختمان‌ها (لغزش کنار دیوار به‌جای عبور یا گیر کردن)، برخورد ماشین‌به‌ماشین حین رانندگی (کند شدن + برگشت + آسیب/جریمه)، NPCها از داخل بازیکن عبور نمی‌کنند.
- **دوربین:** دنبال‌کردن نرم با نگاه به جلو در جهت حرکت، فاصله بیشتر حین رانندگی، و جمع شدن دوربین وقتی دیواری پشت بازیکن است (دیگر از داخل ساختمان رد نمی‌شود).
- **حرکت و انیمیشن:** منحنی شتاب/کاهش سرعت (بدون سرعت آنی)، فرمان وابسته به سرعت، پرش واقعی با Space (جاذبه + فرود)، خم شدن بدن در پیچ‌ها، ترکیب Walk/Run/Idle در مدل‌های GLB، چرخش چرخ‌ها + زاویه فرمان چرخ‌های جلو، صدای در + مکث کوتاه هنگام سوار شدن (نه تلپورت آنی).
- **گوشی و کوله‌پشتی:** گوشی با صفحه روشن (ساعت/تماس) هنگام باز بودن پنجره گفتگو کنار سر شخصیت ظاهر می‌شود؛ کوله‌پشتی با بند و جیب همیشه روی کمر است و با دکمه 🎒 در منوی ☰ نمایش/پنهان می‌شود. صادقانه: این دو وسیله مدل چندبخشی دقیق با بافت‌اند، نه GLB دانلودی (GLB باکیفیت رایگان برایشان پیدا نشد).
- **محدودیت‌های صادقانه:** صدای پارس سگ، زنگ تلفن، جیرجیر ترمز و قدم‌های سنگ/کاشی مجزا در این نسخه نیستند (پیش‌نمایش CC0شان قابل بازیابی نبود) — قدم‌ها فعلاً واریاسیون نرخ همان فایل چمن‌اند و موتور دوم فایل جدا نیست، بلکه تغییر زیر صدای موتور موجود است.
