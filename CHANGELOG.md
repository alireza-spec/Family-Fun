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
