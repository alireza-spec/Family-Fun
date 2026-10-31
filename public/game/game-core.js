
// ════════════════════════════════════
// CONFIG
// ════════════════════════════════════
const C = {
  SPEED:5, SPRINT:1.85, CAM_DIST:6.8, CAM_H:3.4, CAM_TILT:0.85,
  CAM_LAG:0.08, WORLD:72, NPC_SPEED:1.3, INTERACT:2.4,
};

// ════════════════════════════════════
// GAME STATE
// ════════════════════════════════════
let pName="بازیکن", pGender="male";
var scene,camera,renderer,clock;
var playerGroup, playerBody;
var npcs=[],interactables=[];
var particles=[];
let moveX=0,moveY=0,isSprint=false;
let camYaw=0, camMode='TPV';
let isBlock=false;
let activeInteract=null;
let isGameRunning=false;
let gameTime=8*60, gameDay=1;
let stats={health:100,energy:80,hunger:70,happy:85,money:40,xp:0,level:1};
let inventory=[];
var worldObjs={};
let currentLoc="خیابان";

// ════════════════════════════════════
// ALL CHARACTERS
// ════════════════════════════════════
const ALL_CHARS = [
  {
    id:"alireza", name:"علیرضا", gender:"male", emoji:"😎",
    color:0x2255cc, hairColor:0x1a0a00, shirtColor:0x2255cc,
    role:"صاحب بوتیک لباس", loc:"boutique",
    worldPos:[18,0,5],
    callResponse: p=>`سلام ${p}! چی لازم داری داداش؟ بوتیک بازه بیا لباس بگیر 😄`,
    callAction: (p)=>{ showToast("🛍️ علیرضا: بیا بوتیک پیشم!"); teleportTo("boutique"); },
    dialogs:[
      {id:"root",text:"داداش چطوری؟ پایه‌ای؟",choices:[
        {label:"لباس می‌خوام 👕",next:"clothes"},
        {label:"چه خبر؟",next:"news"},
        {label:"پایه اعتراض هستی؟",next:"protest"},
      ]},
      {id:"clothes",text:"بزن بریم! الان چی می‌خوای؟",choices:[
        {label:"رنگ لباسمو عوض کن",next:"changeClothes"},
        {label:"یه چیز شیک",next:"shik"},
      ]},
      {id:"changeClothes",text:"باشه داداش، یه ثانیه...",choices:[{label:"ممنون!",next:null,action:"changeClothes"}]},
      {id:"shik",text:"آخ جون! این ست نو آوردم، خوشگله؟",choices:[{label:"آره عالیه! 🔥",next:null}]},
      {id:"news",text:"والا آقا اوضاع بازار خرابه ولی ما سرپاییم!",choices:[{label:"گلی داری 💪",next:null}]},
      {id:"protest",text:"آره داداش، آدم باید حقشو بگیره. فردا یه جمع هست، میای؟",choices:[
        {label:"آره پایه‌ام ✊",next:"protest2"},
        {label:"نه ممنون",next:null},
      ]},
      {id:"protest2",text:"بزن بریم! باید صدامونو برسونیم.",choices:[{label:"قطعاً 💪",next:null}]},
    ]
  },
  {
    id:"mohammad", name:"محمد", gender:"male", emoji:"👨‍⚕️",
    color:0x009688, hairColor:0x1a0a00, shirtColor:0xffffff,
    role:"دکتر جراح | موزیسین", loc:"hospital",
    worldPos:[12,0,-15],
    callResponse: p=>`سلام ${p} جان. شیفت عملم تموم شده، چیزی شده؟`,
    callAction: ()=>{ showToast("🏥 محمد: بیا بیمارستان یا یه آهنگ بزنیم!"); },
    dialogs:[
      {id:"root",text:"سلام عزیزم. خوبی؟ چیزی شده؟",choices:[
        {label:"حالت چطوره؟",next:"hi"},
        {label:"از موسیقیت بگو",next:"music"},
        {label:"یه مشکل پزشکی دارم",next:"medical"},
      ]},
      {id:"hi",text:"خوبم ممنون. امروز ۳ تا عمل داشتم. خستم ولی خوشحالم.",choices:[{label:"آفرین، کارت درسته 💙",next:null}]},
      {id:"music",text:"دیشب یه قطعه پیانو ضبط کردم. آروم‌بخشه، گوش میدی؟",choices:[{label:"حتماً 🎵",next:null}]},
      {id:"medical",text:"بگو چی شده؟ اگه جدیه باید بریم مطب.",choices:[{label:"نه جدی نیست",next:null}]},
    ]
  },
  {
    id:"reza", name:"رضا", gender:"male", emoji:"😒",
    color:0x555555, hairColor:0x0a0a0a, shirtColor:0x555555,
    role:"تنها / طردشده", loc:"remote",
    worldPos:[-35,0,-30],
    callResponse: p=>`...`,
    callAction: ()=>{ showToast("📵 رضا جواب نداد."); },
    dialogs:[
      {id:"root",text:"اومدی اینجا؟ خوبه... همه فراموشم کردن.",choices:[
        {label:"می‌خوام آشتیت بدم 🤝",next:"peace"},
        {label:"خودت مقصری",next:"blame"},
      ]},
      {id:"peace",text:"جدی میگی؟ آخه اونا منو می‌خوان؟",choices:[
        {label:"آره، بیا دنبالم",next:"peace2"},
        {label:"نمیدونم...",next:null},
      ]},
      {id:"peace2",text:"باشه... ولی اگه دوباره اذیتم کنن برمیگردم اینجا.",choices:[{label:"نگران نباش 🙏",next:null}]},
      {id:"blame",text:"گمشو! خودت چی بودی؟! همیشه همینطوری‌ها...",choices:[{label:"ببخشید، اشتباه کردم",next:"peace"}]},
    ]
  },
  {
    id:"abolfazl", name:"ابوالفضل", gender:"male", emoji:"👨‍🏫",
    color:0x8b4513, hairColor:0x1a0a00, shirtColor:0x8b4513,
    role:"معلم عربی | کدنویس", loc:"school",
    worldPos:[5,0,15],
    callResponse: p=>`السلام علیکم ${p}! چطوری رفیق؟ الان سر کلاسم.`,
    callAction: ()=>{ showToast("📚 ابوالفضل: بیا مدرسه!"); teleportTo("school"); },
    dialogs:[
      {id:"root",text:"اَهلاً وَسَهلاً! خوش اومدی. درسی داری یا شیطونی؟",choices:[
        {label:"شیطونی! 😈",next:"fun"},
        {label:"از برنامه‌نویسیت بگو",next:"code"},
        {label:"عربی یادم بده",next:"arabic"},
      ]},
      {id:"fun",text:"هههه! بزن بریم داداش. بعد کلاس یه شیطونی بلدم!",choices:[{label:"آوردنیه 😄",next:null}]},
      {id:"code",text:"دیشب یه پروژه جاوااسکریپت تموم کردم. خفنه! میخوای ببینی؟",choices:[{label:"آره نشونم بده",next:null}]},
      {id:"arabic",text:"اوکی! تکرر! یعنی تکرار. لَیسَ... یعنی نیست. فهمیدی؟",choices:[{label:"آره ممنون استاد 😄",next:null}]},
    ]
  },
  {
    id:"ali", name:"علی", gender:"male", emoji:"🔧",
    color:0x4a4a1a, hairColor:0x2a1500, shirtColor:0x4a4a1a,
    role:"مکانیک", loc:"garage",
    worldPos:[-18,0,8],
    callResponse: p=>`سلام ${p}! ماشینت مشکل داره؟ بگو بیام یا بیارش گاراژ.`,
    callAction: (p)=>{ showToast("🔧 علی داره میاد ماشینو درست کنه!"); stats.money=Math.max(0,stats.money-10); updateHUD(); },
    dialogs:[
      {id:"root",text:"سلام رفیق. ماشین لازم داری یا مشکلی پیش اومده؟",choices:[
        {label:"ماشینم خراب شد",next:"broken"},
        {label:"از ماشینا بگو",next:"cars"},
        {label:"حالت خوبه工程؟",next:"hi"},
      ]},
      {id:"broken",text:"بیارش، یه نگاه می‌کنم. معمولاً سریع درست می‌کنم.",choices:[{label:"ممنون علی 🙏",next:null}]},
      {id:"cars",text:"آقا ماشین عشقمه! دیشب یه پراید تیون کردم، ۲۴۰ میزنه!",choices:[{label:"واو جدی؟! 😱",next:null}]},
      {id:"hi",text:"خوبم رفیق. کار زیاده ولی شاکرم.",choices:[{label:"گلی داری 💪",next:null}]},
    ]
  },
  {
    id:"hamid", name:"حمید", gender:"male", emoji:"✈️",
    color:0x1a237e, hairColor:0x0a0a00, shirtColor:0x1a237e,
    role:"مهاجر | ایتالیا", loc:"street",
    worldPos:[25,0,-5],
    callResponse: p=>`${p} جان! من الان ایتالیام! سیگنال ضعیفه... زنگ بعداً`,
    callAction: ()=>{ showToast("✈️ حمید: من الان ایتالیام، اگه اومدی خوش میگذره!"); },
    dialogs:[
      {id:"root",text:"سلام! برگشتم ایران یه سر. اینجا هوا چقدر فرق داره!",choices:[
        {label:"ایتالیا چطوره؟",next:"italy"},
        {label:"چقدر موندی؟",next:"stay"},
      ]},
      {id:"italy",text:"آخ جون! رُم خیلی قشنگه. پیتزا، قهوه، مردم خوشحال... دلم میخواد بمونم.",choices:[{label:"خوش به حالت! 😄",next:null}]},
      {id:"stay",text:"فردا برمیگردم. کارام زیاده اونجا.",choices:[{label:"مراقب خودت باش",next:null}]},
    ]
  },
  {
    id:"aryan", name:"آرین", gender:"male", emoji:"🚗",
    color:0xf44336, hairColor:0x1a0a00, shirtColor:0xf44336,
    role:"نمایشگاه ماشین", loc:"showroom",
    worldPos:[28,0,12],
    callResponse: p=>`یوو ${p}! ماشین لازم داری؟ بیا نمایشگاه یا یکی بفرستم؟`,
    callAction: (p)=>{ showToast("🚗 آرین یه ماشین فرستاد!"); showEvent("🚗 ماشین آرین اومد!",2000); },
    dialogs:[
      {id:"root",text:"بفرما رفیق! چه ماشینی میخوای؟ پایه مهمونی هم هستیم!",choices:[
        {label:"یه ماشین بده 🚗",next:"car"},
        {label:"مهمونی داری؟ 🎉",next:"party"},
        {label:"نمایشگاه نشونم بده",next:"show"},
      ]},
      {id:"car",text:"باشه! ولی یکم هزینه داره ها. کدوم رنگ؟",choices:[{label:"مهم نیست، هر رنگی",next:"carDone",action:"getCar"}]},
      {id:"carDone",text:"بفرما! مراقبش باش 😄",choices:[{label:"ممنون آرین! 🚗",next:null}]},
      {id:"party",text:"آره! جمعه شب. پایه‌ای؟ خونه‌م بزن و بکوب!",choices:[{label:"پایه‌ام 🎉",next:null}]},
      {id:"show",text:"بیا ببین! ۲۰ تا ماشین دارم. از پراید تا BMW!",choices:[{label:"خفنه! 😎",next:null}]},
    ]
  },
  {
    id:"milad", name:"میلاد", gender:"male", emoji:"💻",
    color:0x7c4dff, hairColor:0x0a0a0a, shirtColor:0x7c4dff,
    role:"نخبه تکنولوژی | درآمد آنلاین", loc:"street",
    worldPos:[-5,0,-10],
    callResponse: p=>`${p}! امروز ۵ میلیون درآوردم از گوشی! میخوای یادت بدم؟`,
    callAction: (p)=>{ stats.money=Math.min(100,stats.money+20); updateHUD(); showToast("💰 میلاد +۲۰ پول فرستاد!"); showEvent("💰 +۲۰ پول از میلاد!",2000); },
    dialogs:[
      {id:"root",text:"سلام! درآمد آنلاینم این ماه خوب بود. میخوای راهش بدم؟",choices:[
        {label:"آره یادم بده 💻",next:"teach"},
        {label:"چقدر درآوردی؟",next:"money"},
      ]},
      {id:"teach",text:"باشه! اول باید بدونی که هر روز یه ساعت وقت بذاری...",choices:[{label:"باشه شروع می‌کنم",next:null}]},
      {id:"money",text:"این ماه ۳0 میلیون. بیشتر از حقوقم! 😄",choices:[{label:"واو نخبه‌ای داداش 🙌",next:null}]},
    ]
  },
  {
    id:"ilya", name:"ایلیا", gender:"male", emoji:"💐",
    color:0xe91e63, hairColor:0x1a0a00, shirtColor:0xe91e63,
    role:"پسر اجتماعی", loc:"street",
    worldPos:[0,0,-18],
    callResponse: p=>`${p} عزیزم! دلم برات تنگ شده بود! میام پیشت با دسته گل 💐`,
    callAction: (p)=>{ 
      showCallScreen("ایلیا","💐",`${p} عزیزم! میام پیشت! با هم باشیم؟`,[
        {label:"✅ قبوله! 💑",action:()=>{ showToast("💑 با ایلیا وارد رابطه شدی!"); showEvent("💑 رابطه جدید!",2000); }},
        {label:"❌ نه ممنون",action:()=>{ showToast("😢 ایلیا ناراحت شد..."); }},
      ]);
    },
    dialogs:[
      {id:"root",text:"سلام! من... یعنی... دوستت دارم! میخوام با هم باشیم؟",choices:[
        {label:"ممنون ولی نه 🙏",next:"no"},
        {label:"هوم، شاید...",next:"maybe"},
      ]},
      {id:"no",text:"آخ... باشه. ولی اگه نظرت عوض شد بگو! 😢",choices:[{label:"باشه",next:null}]},
      {id:"maybe",text:"واقعاً؟! خوشحالم! میخوام همیشه ببینمت!",choices:[{label:"آروم باش 😄",next:null}]},
    ]
  },
  {
    id:"morad", name:"مراد", gender:"male", emoji:"🍁",
    color:0x00897b, hairColor:0x0a0a00, shirtColor:0x00897b,
    role:"مهاجر کانادا", loc:"street",
    worldPos:[-25,0,20],
    callResponse: p=>`${p}! کانادا عالیه! بیا اینجا! همه چی آمادست.`,
    callAction: ()=>{ showToast("🍁 مراد: مدارک آماده کن، بریم کانادا!"); showEvent("🍁 پیشنهاد مهاجرت!",2000); },
    dialogs:[
      {id:"root",text:"سلام رفیق! پیشنهاد مهاجرت داری؟ کانادا جای خوبیه.",choices:[
        {label:"آره، بریم 🍁",next:"go"},
        {label:"نه ایران خوبه",next:"no"},
      ]},
      {id:"go",text:"آفرین! من راهنماییت می‌کنم. اول ویزا باید بگیری.",choices:[{label:"ممنون مراد",next:null}]},
      {id:"no",text:"باشه، هر کی انتخاب خودشو داره. ولی پشیمون میشی!",choices:[{label:"شاید 😄",next:null}]},
    ]
  },
  {
    id:"arsan", name:"ارسان", gender:"male", emoji:"🧠",
    color:0x37474f, hairColor:0x0a0a0a, shirtColor:0x37474f,
    role:"روانشناس", loc:"therapy",
    worldPos:[-10,0,-20],
    callResponse: p=>`${p} عزیز. می‌شنوم. بیا مطب، صحبت می‌کنیم.`,
    callAction: ()=>{ stats.happy=Math.min(100,stats.happy+15); updateHUD(); showToast("🧠 ارسان کمکت کرد! +۱۵ شادی"); teleportTo("therapy"); },
    dialogs:[
      {id:"root",text:"بنشین. چه احساسی داری؟ بگو تا گوش بدم.",choices:[
        {label:"اضطراب دارم",next:"anxiety"},
        {label:"خوبم فقط خسته‌ام",next:"tired"},
        {label:"دلتنگم",next:"lonely"},
      ]},
      {id:"anxiety",text:"اضطراب طبیعیه. بذار تکنیک تنفس یادت بدم. نفس عمیق بکش...",choices:[{label:"ممنون حس بهتری دارم 🙏",next:null}]},
      {id:"tired",text:"خستگی هم پیامی داره. بدنت داره چیزی میگه. باید استراحت کنی.",choices:[{label:"راست میگی",next:null}]},
      {id:"lonely",text:"دلتنگی، یعنی ظرفیت عشق داری. این نعمته، نه ضعف.",choices:[{label:"قشنگ گفتی 💙",next:null}]},
    ]
  },
  {
    id:"saba", name:"سبا", gender:"female", emoji:"📖",
    color:0x9c27b0, hairColor:0x1a0500, shirtColor:0x9c27b0,
    role:"دانشجو | همیشه امتحان داره", loc:"library",
    worldPos:[8,0,-25],
    callResponse: p=>`${p} الان وقت ندارمـ امتحان دارم فردا! ولی بیا کتابخونه پیشم`,
    callAction: ()=>{ showToast("📖 سبا: بیا کتابخونه! ولی آروم باشـ دارم میخونم"); teleportTo("library"); },
    dialogs:[
      {id:"root",text:"اوه سلام! بشین آرووم باش. دارم درس میخونم. چیکار داری؟",choices:[
        {label:"باهات درس بخونم",next:"study"},
        {label:"یه استراحت بکن",next:"rest"},
        {label:"چه درسی؟",next:"subject"},
      ]},
      {id:"study",text:"باشه ولی ساکت باش! من داریم به این فصل میرسم مهمه.",choices:[{label:"باشه آروم 🤫",next:null}]},
      {id:"rest",text:"نمیشه! امتحانم فرداسـ هنوز ۵ فصل مونده. بذار بخونم.",choices:[{label:"باشه موفق باشی",next:null}]},
      {id:"subject",text:"آمار! اصلاً دوستش ندارم ولی چاره نیسـ",choices:[{label:"موفق باشی 💪",next:null}]},
    ]
  },
  {
    id:"asal1", name:"عسل جهانی", gender:"female", emoji:"🏦",
    color:0xf06292, hairColor:0x3a1500, shirtColor:0xf06292,
    role:"مدیر بانک", loc:"bank",
    worldPos:[20,0,-20],
    callResponse: p=>`سلام ${p}! بیا بانک کارتو راه بندازیم 😄`,
    callAction: ()=>{ stats.money=Math.min(100,stats.money+30); updateHUD(); showToast("💳 عسل جهانی وام داد! +۳۰ پول"); teleportTo("bank"); },
    dialogs:[
      {id:"root",text:"سلام! به بانک چچن خوش اومدی! چیکار می‌تونم برات بکنم؟",choices:[
        {label:"وام می‌خوام",next:"loan"},
        {label:"حساب باز کنم",next:"account"},
        {label:"دعوا باکی داری؟ 😄",next:"fight"},
      ]},
      {id:"loan",text:"باشه! ولی اگه دیر بدی پس می‌گیرم! 😤 کی میخوای؟",choices:[{label:"همین الان",next:"loanDone",action:"getLoan"}]},
      {id:"loanDone",text:"بفرما! ولی یادت نره پس بدی!",choices:[{label:"ممنون عسل 🙏",next:null}]},
      {id:"account",text:"اوکی، کارتت آماده‌ست. ولی کمیسیون داره ها!",choices:[{label:"باشه",next:null}]},
      {id:"fight",text:"هیچکی! ولی اگه کسی اذیتم کنه... 😡",choices:[{label:"آروم باش 😄",next:null}]},
    ]
  },
  {
    id:"asal2", name:"عسل آل‌یعقوب", gender:"female", emoji:"🕌",
    color:0x263238, hairColor:0x0a0a0a, shirtColor:0x263238,
    role:"مذهبی | مسجد محل", loc:"mosque",
    worldPos:[-15,0,-5],
    noHair: true,
    callResponse: p=>`سلام ${p} عزیزم. بیا مسجد، هیئت داریم.`,
    callAction: ()=>{ showToast("🕌 عسل آل‌یعقوب: بیا مسجد، هیئت داریم!"); teleportTo("mosque"); },
    dialogs:[
      {id:"root",text:"سلام، خوش اومدی. امشب هیئت داریم، میای؟",choices:[
        {label:"آره میام 🕌",next:"come"},
        {label:"ممنون، شاید",next:"maybe"},
        {label:"دعا بخون برام",next:"pray"},
      ]},
      {id:"come",text:"خوشحال میشم! ساعت ۸ شب. یادت باشه.",choices:[{label:"حتماً میام",next:null}]},
      {id:"maybe",text:"اِن شاءالله بیا. جای خوبیه، آروم میشی.",choices:[{label:"ممنون",next:null}]},
      {id:"pray",text:"اللهم اشفِه واعفو عنه... دعا کردم عزیزم. خدا همراهته.",choices:[{label:"ممنون 🙏",next:null}]},
    ]
  },
  {
    id:"baharak", name:"بهارک", gender:"female", emoji:"🌸",
    color:0xe91e8c, hairColor:0x4a2000, shirtColor:0xe91e8c,
    role:"دوست رفیق | کافه و عروسی", loc:"cafe",
    worldPos:[3,0,20],
    callResponse: p=>`${p} جاااان! بریم کافه یا عروسی؟ 🥳`,
    callAction: ()=>{ 
      showCallScreen("بهارک","🌸","بریم کافه یا عروسی؟",[
        {label:"☕ کافه",action:()=>{ teleportTo("cafe"); showToast("☕ رفتید کافه با بهارک!"); }},
        {label:"💒 عروسی",action:()=>{ teleportTo("wedding"); showToast("💒 رفتید تالار عروسی!"); showEvent("💒 عروسی!",2000); }},
      ]);
    },
    dialogs:[
      {id:"root",text:"اوی! چقدر دلم برات تنگ شده بود! بریم جایی؟",choices:[
        {label:"بریم کافه ☕",next:"cafe"},
        {label:"بریم عروسی 💒",next:"wedding"},
        {label:"اینجا بمونیم",next:"stay"},
      ]},
      {id:"cafe",text:"آره آره! کافه جدیده رو بریم. قهوه‌اش عالیه!",choices:[{label:"بریم! ☕",next:null,action:"goCafe"}]},
      {id:"wedding",text:"وای! باید بریم! لباس پوشیدی؟ من آمادم 💃",choices:[{label:"بریم رقص! 💒",next:null,action:"goWedding"}]},
      {id:"stay",text:"اوکی اینجا بمونیم. بگو از خودت، چه خبر exchange؟",choices:[{label:"خوبم ممنون 😊",next:null}]},
    ]
  },
  {
    id:"rojan", name:"روژان", gender:"female", emoji:"🎮",
    color:0x00bcd4, hairColor:0x0a0a0a, shirtColor:0x00bcd4,
    role:"گیمر | گیم‌نت", loc:"gamenet",
    worldPos:[-20,0,15],
    callResponse: p=>`${p}! وسط گیمم! بیا گیم‌نت، یه بازی بذاریم 🎮`,
    callAction: ()=>{ showToast("🎮 روژان: بیا گیم‌نت، بازی بذاریم!"); teleportTo("gamenet"); },
    dialogs:[
      {id:"root",text:"اوه سلام! وسط گیمم ولی خوش اومدی. پایه‌ای؟",choices:[
        {label:"کدوم بازی؟",next:"game"},
        {label:"بذار ببینم چی بازی میکنی",next:"watch"},
      ]},
      {id:"game",text:"الان Elden Ring بازی میکنم. سخته ولی عالیه!",choices:[{label:"منم دوست دارم!",next:null}]},
      {id:"watch",text:"اینجا نشین تماشا کن. ولی سکوت! الان باس می‌جنگم.",choices:[{label:"باشه آروم میشینم 🤫",next:null}]},
    ]
  },
  {
    id:"aram", name:"آرام", gender:"female", emoji:"💆",
    color:0xff7043, hairColor:0x2a0a00, shirtColor:0xff7043,
    role:"دانشجو | تازه عمل کرده", loc:"street",
    worldPos:[15,0,25],
    callResponse: p=>`${p}... میشه بیای؟ دلم گرفته. دلتنگ اکسمم...`,
    callAction: ()=>{ 
      stats.social=Math.min(100,stats.social+8); updateHUD();
      showToast("💆 آرام اومد، از دلتنگی حرف زد. +۸ اجتماع");
    },
    dialogs:[
      {id:"root",text:"سلام... دماغمو تازه عمل کردم. چطوره؟",choices:[
        {label:"خیلی خوب شده! 😊",next:"good"},
        {label:"از اکست بگو",next:"ex"},
        {label:"حالت خوبه؟",next:"feeling"},
      ]},
      {id:"good",text:"جدی میگی؟ خودمم هنوز عادت نکردم. هر روز نگاه میکنم...",choices:[{label:"قشنگه واقعاً",next:null}]},
      {id:"ex",text:"آخ... دلتنگشم. میدونم که اشتباه بود ولی... یادم نمیره.",choices:[{label:"وقت همه چیزو درست میکنه 💙",next:null}]},
      {id:"feeling",text:"خوبم... شاید. نمیدونم. دلم میخواد یکی باشه.",choices:[{label:"اینجام، نگران نباش",next:null}]},
    ]
  },
  {
    id:"elly", name:"الی", gender:"female", emoji:"📷",
    color:0xffb300, hairColor:0x3a0a00, shirtColor:0xffb300,
    role:"عکاس | آتلیه", loc:"studio",
    worldPos:[22,0,-10],
    callResponse: p=>`${p}! بیا آتلیه ازت عکس بگیرم! 📷`,
    callAction: ()=>{ showToast("📷 الی: بیا آتلیه!"); teleportTo("studio"); showEvent("📷 عکس گرفته شد!",2000); },
    dialogs:[
      {id:"root",text:"سلام! آماده‌ای؟ میخوام ازت عکس بگیرم!",choices:[
        {label:"آره بزن 📷",next:"photo"},
        {label:"من خوب نمیام تو عکس",next:"shy"},
      ]},
      {id:"photo",text:"عالی! بشین اینجا، بخند، ۳... ۲... ۱... 📷",choices:[{label:"کلیک! 😄",next:null,action:"takePhoto"}]},
      {id:"shy",text:"بیخود! همه تو عکس خوب میان. اعتماد به نفس داشته باش!",choices:[{label:"باشه امتحان میکنم 😊",next:null}]},
    ]
  },
  {
    id:"hanane", name:"حنانه", gender:"female", emoji:"🥋",
    color:0x4caf50, hairColor:0x1a0a00, shirtColor:0x4caf50,
    role:"مدرس زبان | کاراته‌کار", loc:"dojo",
    worldPos:[-8,0,25],
    callResponse: p=>`${p}! کلاس کاراته دارم. بیا باهم ورزش کنیم!`,
    callAction: ()=>{ stats.health=Math.min(100,stats.health+15); updateHUD(); showToast("🥋 حنانه تمرین داد! +۱۵ سلامت"); },
    dialogs:[
      {id:"root",text:"سلام! میخوای کاراته یاد بگیری یا زبان انگلیسی؟",choices:[
        {label:"کاراته 🥋",next:"karate"},
        {label:"زبان انگلیسی 🇬🇧",next:"english"},
      ]},
      {id:"karate",text:"بسم‌الله! اول حالت بدنت درسته؟ بیا اینجا بایست.",choices:[{label:"آماده‌ام استاد! 🥋",next:null}]},
      {id:"english",text:"Great! Let's start. Repeat after me: Hello, how are you?",choices:[{label:"Hello, how are you? 😄",next:null}]},
    ]
  },
  {
    id:"saghar", name:"ساغر", gender:"female", emoji:"🌟",
    color:0xff4081, hairColor:0x4a1500, shirtColor:0xff4081,
    role:"رفیق همه‌جا", loc:"street",
    worldPos:[10,0,10],
    callResponse: p=>`${p}ی! بریم؟ هرجا بخوای منم هستم 🌟`,
    callAction: ()=>{
      showCallScreen("ساغر","🌟","بریم کجا؟",[
        {label:"☕ کافه",action:()=>{ teleportTo("cafe"); }},
        {label:"🛍️ خرید",action:()=>{ teleportTo("boutique"); }},
        {label:"🚶 گردش",action:()=>{ showToast("🚶 با ساغر رفتید گردش!"); stats.happy=Math.min(100,stats.happy+12); updateHUD(); }},
        {label:"💒 عروسی",action:()=>{ teleportTo("wedding"); }},
      ]);
    },
    dialogs:[
      {id:"root",text:"سلام! خوشحالم دیدمت! بریم یه جایی؟",choices:[
        {label:"بریم کافه ☕",next:"cafe"},
        {label:"گردش 🚶",next:"walk"},
        {label:"فقط حرف بزنیم",next:"talk"},
      ]},
      {id:"cafe",text:"آره آره! عاشق قهوه‌ام! بریم!",choices:[{label:"بریم! 😄",next:null,action:"goCafe"}]},
      {id:"walk",text:"عالیه! هوا خوبه. بریم پارک؟",choices:[{label:"بریم! 🌳",next:null}]},
      {id:"talk",text:"اوکی! بگو چی شده. گوش میدم.",choices:[{label:"ممنون ساغر 🌟",next:null}]},
    ]
  },
  {
    id:"darya", name:"دریا", gender:"female", emoji:"🌊",
    color:0x1565c0, hairColor:0x0a0a0a, shirtColor:0x1565c0,
    role:"مرموز و کم‌حرف", loc:"street",
    worldPos:[-28,0,-15],
    callResponse: p=>`...`,
    callAction: ()=>{ showToast("📵 دریا جواب نداد."); },
    dialogs:[
      {id:"root",text:"...",choices:[
        {label:"حالت خوبه؟",next:"hi"},
        {label:"چرا اینجایی؟",next:"why"},
      ]},
      {id:"hi",text:"...آره.",choices:[{label:"اوکی، مراقب خودت باش",next:null}]},
      {id:"why",text:"...دوست دارم.",choices:[{label:"باشه",next:null}]},
    ]
  },
  {
    id:"fati", name:"فطی", gender:"female", emoji:"💅",
    color:0xec407a, hairColor:0x3a0a00, shirtColor:0xec407a,
    role:"اهل کلاس | رفیق مراد", loc:"street",
    worldPos:[-22,0,5],
    callResponse: p=>`الو؟ ببخشید، الان با مراد دارم حرف میزنم. بعداً زنگ بزن.`,
    callAction: ()=>{ showToast("💅 فطی: الان با مراد مشغولم!"); },
    dialogs:[
      {id:"root",text:"سلام... چی میخوای؟ کار مهمی داری؟",choices:[
        {label:"فقط اومدم سلام بدم",next:"hi"},
        {label:"کجا بودی؟",next:"where"},
      ]},
      {id:"hi",text:"اوکی... سلام. خب دیگه...",choices:[{label:"خداحافظ 😄",next:null}]},
      {id:"where",text:"با مراد بودیم. کارامون مهمه، وقت نداریم زیاد.",choices:[{label:"باشه، خوش بگذره",next:null}]},
    ]
  },
  {
    id:"sarina", name:"سارینا", gender:"female", emoji:"🎪",
    color:0xff6f00, hairColor:0x2a0500, shirtColor:0xff6f00,
    role:"پایه مهمونی و گردش", loc:"street",
    worldPos:[5,0,-30],
    callResponse: p=>`${p} جووون! بریم یه جایی؟ خونه نمیشینم 🎉`,
    callAction: ()=>{
      showCallScreen("سارینا","🎪","کجا بریم؟",[
        {label:"🎉 مهمونی",action:()=>{ showToast("🎉 مهمونی شروع شد!"); showEvent("🎉 مهمونی!",2000); stats.happy=Math.min(100,stats.happy+20); updateHUD(); }},
        {label:"☕ کافه",action:()=>{ teleportTo("cafe"); }},
        {label:"🌴 سفر",action:()=>{ showToast("🌴 رفتید سفر با سارینا!"); showEvent("🌴 سفر!",2000); }},
      ]);
    },
    dialogs:[
      {id:"root",text:"یووو! چطوری؟ بریم یه جایی؟ خونه حوصله‌م سر میره!",choices:[
        {label:"بریم مهمونی 🎉",next:"party"},
        {label:"بریم کافه ☕",next:"cafe"},
      ]},
      {id:"party",text:"آره! میزنیم بهم! کیا میان؟",choices:[{label:"جمع می‌کنیم 😄",next:null}]},
      {id:"cafe",text:"اوکی! قهوه سفارش بده، من عکس میذارم اینستا!",choices:[{label:"برو عکست بگیر 😄",next:null}]},
    ]
  },
  {
    id:"kami", name:"کامی", gender:"male", emoji:"🌑",
    color:0x212121, hairColor:0x0a0a0a, shirtColor:0x212121,
    role:"درونگرا | کم‌پیدا", loc:"remote2",
    worldPos:[35,0,-35],
    callResponse: p=>`...مم.`,
    callAction: ()=>{ showToast("📵 کامی: مم."); },
    dialogs:[
      {id:"root",text:"...",choices:[
        {label:"سلام کامی",next:"hi"},
      ]},
      {id:"hi",text:"سلام.",choices:[
        {label:"حالت خوبه؟",next:"fine"},
      ]},
      {id:"fine",text:"هم.",choices:[{label:"باشه، خداحافظ",next:null}]},
    ]
  },
];

// ════════════════════════════════════
// LOCATIONS (teleport targets)
// ════════════════════════════════════
const LOCATIONS = {
  home:     {pos:[0,0,0],   label:"خانه"},
  boutique: {pos:[18,0,5],  label:"بوتیک علیرضا"},
  hospital: {pos:[12,0,-15],label:"بیمارستان"},
  school:   {pos:[5,0,15],  label:"مدرسه"},
  garage:   {pos:[-18,0,8], label:"گاراژ علی"},
  showroom: {pos:[28,0,12], label:"نمایشگاه آرین"},
  therapy:  {pos:[-10,0,-20],label:"مطب روانشناسی"},
  library:  {pos:[8,0,-25], label:"کتابخانه"},
  bank:     {pos:[20,0,-20],label:"بانک چچن"},
  mosque:   {pos:[-15,0,-5],label:"مسجد محل"},
  cafe:     {pos:[3,0,20],  label:"کافه"},
  wedding:  {pos:[25,0,25], label:"تالار عروسی"},
  gamenet:  {pos:[-20,0,15],label:"گیم‌نت"},
  studio:   {pos:[22,0,-10],label:"آتلیه عکاسی"},
  dojo:     {pos:[-8,0,25], label:"دوجو کاراته"},
};

// ACTIVE NPCS (filtered by player name)
let activeChars = [];

// ════════════════════════════════════
// GEOMETRY HELPERS
// ════════════════════════════════════
function mat(c,o={}){return new THREE.MeshStandardMaterial({color:c,...o});}
function mkMesh(geo,m,x,y,z,cast=true){
  const mesh=new THREE.Mesh(geo,m);
  mesh.position.set(x,y,z);
  if(cast){mesh.castShadow=true;mesh.receiveShadow=true;}
  scene.add(mesh);return mesh;
}
function box(w,h,d){return new THREE.BoxGeometry(w,h,d);}
function cyl(rt,rb,h,s=8){return new THREE.CylinderGeometry(rt,rb,h,s);}
function sph(r,s=8){return new THREE.SphereGeometry(r,s,s);}

// ════════════════════════════════════
// INIT
// ════════════════════════════════════
function setGender(g){
  pGender=g;
  document.getElementById('gbM').classList.toggle('active',g==='male');
  document.getElementById('gbF').classList.toggle('active',g==='female');
}

function initGame(){
  const inp=document.getElementById('username');
  if(!inp.value.trim()){
    alert("اول اسمتو بنویس!");
    return;
  }
  if(typeof THREE==='undefined'){
    alert("بازی هنوز داره لود میشه. چند ثانیه صبر کن و دوباره بزن!");
    return;
  }
  pName=inp.value.trim();
  activeChars=ALL_CHARS.filter(c=>c.name!==pName);
  document.getElementById('start-screen').style.opacity=0;
  setTimeout(()=>document.getElementById('start-screen').style.display='none',800);
  document.getElementById('hud').style.display='block';
  document.getElementById('hud-name').textContent=pName;
  try{
    if(window.FFQuality) window.FFQuality.apply(window.FFQuality.current);
    setupThreeJS();
    buildWorld();
    enhanceWorld();
    createPlayer();
    spawnNPCs();
    setupControls();
    buildPhoneUI();
    startTimers();
    clock=new THREE.Clock();
    isGameRunning=true;
    if(window.FFSave && window.FFSave.pending){ window.FFSave.apply(window.FFSave.pending); window.FFSave.pending=null; showToast('💾 پیشرفت ذخیره‌شده برگشت'); }
    if(window.FFAudio){ window.FFAudio.unlock(); window.FFAudio.startPad(); }
    if(window.FFQuests) window.FFQuests.render();
    animate();
    showEvent("به شهر کوچیک ما خوش اومدی!",2500);
    setTimeout(()=>showToast("📱 دکمه تلفن رو بزن برای تماس با دوستات"),3500);
  }catch(e){
    console.error("Game init error:",e);
    alert("خطا در شروع بازی: "+e.message+" — صفحه رو رفرش کن.");
  }
}

// ════════════════════════════════════
// THREE.JS
// ════════════════════════════════════
function setupThreeJS(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x87ceeb);
  scene.fog=new THREE.FogExp2(0xc5d9f0,0.012);

  camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.1,200);

  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio, (window.FFQuality?window.FFQuality.def.pixelRatio:1.5)));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  document.body.insertBefore(renderer.domElement,document.getElementById('hud'));

  scene.add(new THREE.AmbientLight(0xfff0e0,0.9));
  const sun=new THREE.DirectionalLight(0xfff0c0,1.3);
  sun.position.set(40,80,30);
  sun.castShadow=true;
  sun.shadow.mapSize.set((window.FFQuality?window.FFQuality.def.shadow:1024),(window.FFQuality?window.FFQuality.def.shadow:1024));
  sun.shadow.camera.near=0.5;sun.shadow.camera.far=150;
  sun.shadow.camera.left=sun.shadow.camera.bottom=-60;
  sun.shadow.camera.right=sun.shadow.camera.top=60;
  sun.shadow.bias=-0.001;
  scene.add(sun);
  worldObjs.sun=sun;
  scene.add(new THREE.HemisphereLight(0x87ceeb,0x4a7c59,0.5));

  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
}

// ════════════════════════════════════
// WORLD
// ════════════════════════════════════
function buildWorld(){
  buildGround();
  buildHouse();
  buildCity();
  buildTrees();
}

function buildGround(){
  var T=window.FFTextures;
  var groundMat=T?T.material(0x4a7c59,'grass',{roughness:0.95,rx:24,ry:24}):mat(0x4a7c59,{roughness:0.95});
  const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200),groundMat);
  g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  var roadMat=T?T.material(0x2a2d33,'asphalt',{roughness:0.92,rx:2,ry:20}):mat(0x2a2a2a,{roughness:0.9});
  [[0,0.02,0,6,80],[80,0.02,0,80,6]].forEach(([x,y,z,w,d])=>{
    const r=new THREE.Mesh(new THREE.PlaneGeometry(w,d),roadMat);
    r.rotation.x=-Math.PI/2;r.position.set(x,y,z);r.receiveShadow=true;scene.add(r);
  });
  var walkMat=T?T.material(0xc9bba6,'sidewalk',{roughness:0.85,rx:1,ry:20}):mat(0xccbbaa,{roughness:0.8});
  [[-4,0.03,0,2,80],[4,0.03,0,2,80]].forEach(([x,y,z,w,d])=>{
    const s=new THREE.Mesh(new THREE.PlaneGeometry(w,d),walkMat);
    s.rotation.x=-Math.PI/2;s.position.set(x,y,z);s.receiveShadow=true;scene.add(s);
  });
}

function buildHouse(){
  const wm=mat(0xf5e6d0,{roughness:0.85});
  const fm=mat(0xd4a96a,{roughness:0.6});
  const rm=mat(0xb23a2a,{roughness:0.7});
  const wn=mat(0x88ccff,{transparent:true,opacity:0.55,roughness:0.1,metalness:0.1});

  mkMesh(box(24,0.18,20),fm,0,0.09,0);
  mkMesh(box(24,5,0.28),wm,0,2.5,-10);
  mkMesh(box(0.28,5,20),wm,-12,2.5,0);
  mkMesh(box(0.28,5,20),wm,12,2.5,0);
  mkMesh(box(8,5,0.28),wm,-8,2.5,10);
  mkMesh(box(8,5,0.28),wm,8,2.5,10);
  mkMesh(box(4,1.2,0.28),wm,0,4.6,10);

  // Roof
  const rL=mkMesh(box(24.5,0.22,11.5),rm,0,5.3,-2);rL.rotation.x=Math.atan2(2.5,10);
  const rR=mkMesh(box(24.5,0.22,11.5),rm,0,5.3,2);rR.rotation.x=-Math.atan2(2.5,10);
  mkMesh(box(24.5,0.38,0.38),rm,0,5+2.5,0);
  mkMesh(box(1.2,2.5,1.2),mat(0x8b4513,{roughness:0.9}),-4,6,-5);
  mkMesh(box(1.4,0.18,1.4),mat(0x555),-4,7.5,-5);

  // Windows
  [[-6,2.8,-9.9],[6,2.8,-9.9],[-11.9,2.8,-2],[11.9,2.8,-2],[-11.9,2.8,5],[11.9,2.8,5]].forEach(([x,y,z])=>{
    const hz=Math.abs(z)<0.5;
    mkMesh(hz?box(1.8,1.3,0.12):box(0.12,1.3,1.8),wn,x,y,z);
  });

  // Door
  const dg=new THREE.Group();
  const dm=new THREE.Mesh(box(1.85,3.1,0.1),mat(0x6b3a1f,{roughness:0.8}));
  dm.position.set(0.925,1.55,0);
  dg.add(dm);
  dg.position.set(-0.925,0,10.05);
  scene.add(dg);worldObjs.door=dg;

  // Furniture
  buildIndoors();
}

function addPart(group, geo, material, x, y, z){
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function buildIndoors(){
  // Bed
  const bed=new THREE.Group();
  addPart(bed, box(2.2,0.42,3.2), mat(0x8b7355,{roughness:0.85}), 0,0.21,0);
  addPart(bed, box(2.2,0.28,3.2), mat(0xfff8f0,{roughness:0.9}), 0,0.56,0);
  addPart(bed, box(2.3,0.78,0.18), mat(0x6b4226,{roughness:0.8}), 0,0.59,1.7);
  bed.position.set(-7,0,-6);scene.add(bed);
  addInteractable(bed,'bed',[-7,0,-6]);

  // TV
  const tv=new THREE.Group();
  addPart(tv, box(2.5,0.28,0.48), mat(0x111,{roughness:0.4,metalness:0.4}), 0,0.14,0);
  const scr=addPart(tv, box(2.2,1.28,0.08), mat(0x060618,{emissive:0x061838,emissiveIntensity:0.4,roughness:0.05}), 0,1.0,0.2);
  worldObjs.tv=scr;
  tv.position.set(4,0.8,-9.2);scene.add(tv);
  addInteractable(tv,'tv',[4,0.8,-9.2]);

  // Sofa
  const sf=new THREE.Group();
  addPart(sf, box(3.5,0.48,1.2), mat(0x8d6e63,{roughness:0.9}), 0,0.24,0);
  addPart(sf, box(3.5,0.78,0.32), mat(0x8d6e63,{roughness:0.9}), 0,0.88,-0.46);
  sf.position.set(4,0,-5);scene.add(sf);
  addInteractable(sf,'sofa',[4,0,-5]);

  // Fridge
  const fr=new THREE.Group();
  addPart(fr, box(1.0,2.2,0.7), mat(0xeee,{roughness:0.3,metalness:0.1}), 0,1.1,0);
  fr.position.set(-9.5,0,-8.5);scene.add(fr);
  addInteractable(fr,'fridge',[-9.5,0,-8.5]);

  // Shower
  const sh=new THREE.Group();
  addPart(sh, box(0.1,2.4,2), mat(0xc8d8e8,{roughness:0.1,metalness:0.1}), -0.88,1.2,0);
  addPart(sh, box(2,0.05,2), mat(0xaabbc0,{roughness:0.5}), 0,0.03,0);
  sh.position.set(8,0,7);scene.add(sh);
  addInteractable(sh,'shower',[8,0,7]);

  // Piano
  const pn=new THREE.Group();
  addPart(pn, box(1.8,0.78,0.7), mat(0x111,{roughness:0.3,metalness:0.1}), 0,0.39,0);
  pn.position.set(9.5,0,3);scene.add(pn);
  addInteractable(pn,'piano',[9.5,0,3]);
}

function buildCity(){
  buildBuilding(18,0,5,6,4,7,0xe91e63,"بوتیک","🛍️",0x880e4f);
  buildBuilding(12,0,-15,8,5,8,0xffffff,"بیمارستان","🏥",0xf44336);
  buildBuilding(5,0,15,9,5,8,0xffeb3b,"مدرسه","📚",0xf57f17);
  buildBuilding(-18,0,8,8,4,7,0x607d8b,"گاراژ","🔧",0x37474f);
  buildBuilding(28,0,12,10,4,8,0x2196f3,"نمایشگاه","🚗",0x0d47a1);
  buildBuilding(-10,0,-20,6,4,6,0x9c27b0,"روانشناس","🧠",0x4a148c);
  buildBuilding(8,0,-25,7,5,7,0x795548,"کتابخانه","📖",0x4e342e);
  buildBuilding(20,0,-20,8,5,7,0xffd700,"بانک","🏦",0xe65100);
  buildBuilding(-15,0,-5,7,6,7,0x1a237e,"مسجد","🕌",0x0d47a1);
  buildBuilding(3,0,20,5,4,5,0x8d6e63,"کافه","☕",0x4e342e);
  buildBuilding(25,0,25,12,6,10,0xffc0cb,"تالار عروسی","💒",0xc2185b);
  buildBuilding(-20,0,15,7,4,6,0x212121,"گیم‌نت","🎮",0x311b92);
  buildBuilding(22,0,-10,6,4,6,0xffb300,"آتلیه","📷",0xe65100);
  buildBuilding(-8,0,25,6,4,6,0x388e3c,"دوجو","🥋",0x1b5e20);
}

function buildBuilding(x,y,z,w,h,d,wallColor,name,icon,accentColor){
  var T=window.FFTextures;
  var wm=T?T.material(wallColor,'brick',{roughness:0.85,rx:Math.max(1,Math.round(w/3)),ry:Math.max(1,Math.round(h/3))}):mat(wallColor,{roughness:0.8});
  var am=T?T.material(accentColor,'roof',{roughness:0.7}):mat(accentColor,{roughness:0.7});
  mkMesh(box(w,h,d),wm,x,h/2,z);
  // varied roof: flat parapet for tall blocks, pitched look for small shops
  if(w>=8){ mkMesh(box(w+0.4,0.35,d+0.4),am,x,h+0.17,z); }
  else { const r1=mkMesh(box(w+0.4,0.18,d*0.7),am,x,h+0.35,z-d*0.18); r1.rotation.x=0.35;
         const r2=mkMesh(box(w+0.4,0.18,d*0.7),am,x,h+0.35,z+d*0.18); r2.rotation.x=-0.35; }
  // door frame + door
  mkMesh(box(1.7,2.9,0.14),mat(0x3a2a18,{roughness:0.7}),x,1.45,z+d/2+0.02);
  mkMesh(box(1.4,2.6,0.12),mat(0x6b4226,{roughness:0.8}),x,1.3,z+d/2+0.06);
  // Persian sign (canvas texture) + emissive window frames
  if(T){
    var signMat=new THREE.MeshStandardMaterial({map:T.sign(name,icon,'#'+accentColor.toString(16).padStart(6,'0')),emissive:accentColor,emissiveIntensity:0.35});
    const signGeo=new THREE.Mesh(box(2.6,0.7,0.1),signMat);
    signGeo.position.set(x,h-0.7,z+d/2+0.08); scene.add(signGeo);
  } else {
    const signGeo=new THREE.Mesh(box(2.2,0.7,0.1),mat(accentColor,{roughness:0.5,emissive:accentColor,emissiveIntensity:0.2}));
    signGeo.position.set(x,h-0.7,z+d/2+0.06); scene.add(signGeo);
  }
  var winMat=mat(0x9edbff,{roughness:0.12,metalness:0.15,emissive:0x102840,emissiveIntensity:0.35});
  if(!window.FFEmissiveWindows) window.FFEmissiveWindows=[];
  window.FFEmissiveWindows.push(winMat);
  for(let i=-1;i<=1;i+=2){
    // frame
    mkMesh(box(1.15,1.05,0.06),mat(0xf2efe6,{roughness:0.6}),x+i*(w/3),h*0.6,z+d/2+0.03);
    mkMesh(box(1.0,0.9,0.08),winMat,x+i*(w/3),h*0.6,z+d/2+0.06);
  }
  // awning (striped look via two-tone boxes)
  const aw=mat(0xd94b52,{roughness:0.8});
  const canopy=mkMesh(box(Math.min(w*0.7,5),0.12,1.1),aw,x,h*0.62,z+d/2+0.55); canopy.rotation.x=-0.18;
  const enterObj=new THREE.Group();
  enterObj.position.set(x,0,z+d/2+0.5);
  scene.add(enterObj);
  const locId=findLocId(x,z);
  if(locId) addInteractable(enterObj,'enter_'+locId,[x,0,z+d/2+0.5],`دخول ${name}`);
}

function findLocId(x,z){
  for(const [id,loc] of Object.entries(LOCATIONS)){
    if(Math.abs(loc.pos[0]-x)<5 && Math.abs(loc.pos[2]-z)<5) return id;
  }
  return null;
}

function buildTrees(){
  var positions=[[-18,0,-12],[-20,0,5],[-22,0,14],[17,0,-15],[18,0,10],[-15,0,-18],[20,0,-18],[-30,0,0],[30,0,-25],[0,0,35],[-35,0,10]];
  var trunkGeo=cyl(0.18,0.28,3.8,7), crownGeo=new THREE.IcosahedronGeometry(1.35,1);
  var trunks=new THREE.InstancedMesh(trunkGeo,mat(0x5c3d1e,{roughness:0.9}),positions.length);
  var crowns=new THREE.InstancedMesh(crownGeo,mat(0x2d6a2d,{roughness:0.8}),positions.length);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), s=new THREE.Vector3(), p=new THREE.Vector3();
  positions.forEach(([x,y,z],i)=>{
    var sc=0.85+((i*37)%10)/20;
    m4.compose(p.set(x,1.9,z),q,s.set(sc,1,sc)); trunks.setMatrixAt(i,m4);
    m4.compose(p.set(x,4.1,z),q,s.set(sc,sc,sc)); crowns.setMatrixAt(i,m4);
  });
  trunks.castShadow=true; crowns.castShadow=true; trunks.receiveShadow=true; crowns.receiveShadow=true;
  trunks.instanceMatrix.needsUpdate=true; crowns.instanceMatrix.needsUpdate=true;
  scene.add(trunks); scene.add(crowns);
  // low-poly distant ring (simple LOD: hidden on Low quality by graphics quality apply)
  var ringGeo=new THREE.ConeGeometry(5,12,7);
  var ring=new THREE.InstancedMesh(ringGeo,mat(0x4a6e4a,{roughness:1}),10);
  for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2, r=85+((i*13)%15);
    m4.compose(p.set(Math.cos(a)*r,6,Math.sin(a)*r),q,s.set(1,1,1)); ring.setMatrixAt(i,m4); }
  ring.instanceMatrix.needsUpdate=true; scene.add(ring); window.FFTreeBackground=ring;
}


// ════════════════════════════════════
function createPlayer(){
  playerGroup=new THREE.Group();
  playerGroup.position.set(0,0,6);
  scene.add(playerGroup);
  playerBody=buildHumanoid(pGender==='male'?0x2255cc:0xcc2288,pGender==='female');
  playerGroup.add(playerBody);
  playerGroup.userData.tag=createNameTag(pName,true);
}

function buildHumanoid(shirtColor,isFemale,customHair,noHair){
  // 2.1.0: capsule humanoid (replaces the flat-box body) with the SAME named
  // joints the core animate() loop and GTA applyLook() expect: torso, head,
  // leftArm/rightArm, leftLeg/rightLeg. Player and NPCs both use this, so the
  // capsule look is visible without relying on the character-studio hook.
  const g=new THREE.Group();
  const skin=mat(0xffcc99,{roughness:0.8});
  const shirt=mat(shirtColor,{roughness:0.8});
  const pants=mat(isFemale?0x663399:0x1a1a4a,{roughness:0.9});
  const hairM=mat(customHair||0x1a0a00,{roughness:0.9});
  const shoe=mat(0x222,{roughness:0.9});
  function capsuleMesh(r,len,material){
    const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,6,16),material);
    m.castShadow=true; return m;
  }
  const torso=capsuleMesh(0.22,0.35,shirt);
  torso.position.y=0.85; torso.name='torso'; torso.scale.set(1,1,0.72); g.add(torso);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(0.115,0.025,6,16),mat(0xe6d6ba));
  collar.position.y=1.15; collar.rotation.x=Math.PI/2; g.add(collar);
  const neck=new THREE.Mesh(cyl(0.075,0.085,0.12,10),skin);
  neck.position.y=1.2; neck.castShadow=true; g.add(neck);
  const head=new THREE.Group(); head.position.y=1.43; head.name='head';
  const face=new THREE.Mesh(new THREE.SphereGeometry(0.245,16,12),skin);
  face.scale.set(0.92,1.05,0.86); face.castShadow=true; head.add(face);
  const eyeM=mat(0x111);
  [-0.075,0.075].forEach(function(x){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.028,8,8),eyeM);
    eye.position.set(x,0.03,0.22); head.add(eye);
  });
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.027,8,6),skin);
  nose.position.set(0,-0.035,0.245); head.add(nose);
  const smile=new THREE.Mesh(new THREE.TorusGeometry(0.055,0.012,6,12,Math.PI),mat(0x7b2940));
  smile.position.set(0,-0.09,0.23); smile.rotation.z=Math.PI; head.add(smile);
  if(!noHair){
    if(isFemale){
      const cap=new THREE.Mesh(new THREE.SphereGeometry(0.245,16,10,0,Math.PI*2,0,Math.PI*0.62),hairM);
      cap.name='hairCap'; cap.position.set(0,0.14,-0.01); head.add(cap);
      const back=new THREE.Mesh(new THREE.SphereGeometry(0.24,14,10),hairM);
      back.name='hairBack'; back.position.set(0,-0.08,-0.13); back.scale.set(1,1.35,0.48); head.add(back);
    } else {
      const cap=new THREE.Mesh(new THREE.SphereGeometry(0.245,16,10,0,Math.PI*2,0,Math.PI*0.6),hairM);
      cap.name='hairCap'; cap.position.set(0,0.14,0); head.add(cap);
      for(let i=-2;i<=2;i++){
        const fr=new THREE.Mesh(new THREE.SphereGeometry(0.06,9,7),hairM);
        fr.name='fringe'+i; fr.position.set(i*0.075,0.08,0.19); head.add(fr);
      }
    }
  } else {
    const hijab=new THREE.Mesh(sph(0.18,8),mat(0x111,{roughness:0.9}));
    hijab.name='hairCap'; hijab.position.y=0.03; head.add(hijab);
    const drape=new THREE.Mesh(box(0.32,0.35,0.22),mat(0x111,{roughness:0.9}));
    drape.position.set(0,-0.14,-0.04); head.add(drape);
  }
  g.add(head);
  [['leftArm',0.29],['rightArm',-0.29]].forEach(function(pair){
    const ag=new THREE.Group(); ag.name=pair[0];
    const arm=capsuleMesh(0.075,0.34,shirt); arm.position.y=-0.17; ag.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.075,10,8),skin);
    hand.position.y=-0.42; ag.add(hand);
    ag.position.set(pair[1],1.08,0); ag.rotation.z=pair[1]>0?0.08:-0.08; g.add(ag);
  });
  [['leftLeg',0.115],['rightLeg',-0.115]].forEach(function(pair){
    const lg=new THREE.Group(); lg.name=pair[0];
    const leg=capsuleMesh(0.095,0.38,pants); leg.position.y=-0.19; lg.add(leg);
    const foot=new THREE.Mesh(box(0.18,0.09,0.3),shoe);
    foot.position.set(0,-0.45,0.055); lg.add(foot);
    lg.position.set(pair[1],0.54,0); g.add(lg);
  });
  if(isFemale && !noHair){
    const skirt=new THREE.Mesh(cyl(0.265,0.3,0.28,12),mat(shirtColor===0xcc2288?0x880e4f:0x6600aa,{roughness:0.9}));
    skirt.position.y=0.56; g.add(skirt);
  }
  return g;
}

// ════════════════════════════════════
// NPCs
// ════════════════════════════════════
function spawnNPCs(){
  activeChars.forEach(def=>{
    const g=new THREE.Group();
    const wp=def.worldPos||[0,0,0];
    g.position.set(wp[0],0,wp[2]);

    const isFem=def.gender==='female';
    const body=buildHumanoid(def.shirtColor||def.color,isFem,def.hairColor,def.noHair);
    g.add(body);

    g.userData={
      id:def.id, name:def.name, role:def.role, emoji:def.emoji,
      dialogs:def.dialogs, body:body,
      target:new THREE.Vector3(wp[0],0,wp[2]),
      waitTime:Math.random()*5, walkOff:Math.random()*Math.PI*2,
      homePos:new THREE.Vector3(wp[0],0,wp[2]),
      talking:false,
    };
    g.userData.tag=createNameTag(`${def.emoji} ${def.name}`,false,def.role);
    scene.add(g);
    npcs.push(g);
  });
}

// ════════════════════════════════════
// NAME TAGS
// ════════════════════════════════════
function createNameTag(name,isPlayer,sub=''){
  const d=document.createElement('div');
  d.className='name-tag'+(isPlayer?' player':'');
  d.innerHTML=`<div class="nt-name">${name}${sub?`<br><span style="font-size:9px;opacity:.55">${sub}</span>`:''}</div>`;
  document.getElementById('hud').appendChild(d);
  return d;
}
function updateTag(obj,tag){
  if(!tag)return;
  // در حالت اول شخص تگ نام خود پلیر را مخفی کن
  if(camMode === 'POV' && obj === playerGroup) {
    tag.style.display = 'none';
    return;
  }
  // 2.7.0 QUIET TEXT: name tags only within ~12 units, fading out with
  // distance, and only in front of the camera. Far NPCs get NO tag at all
  // — this removes most of the crowded writings in the screenshots.
  var camDist = 0;
  try{ if(camera) camDist = obj.position.distanceTo(camera.position); }catch(e){}
  if(camDist > 12){ tag.style.display='none'; return; }
  // Opacity: 0.85 close, fading to ~0.25 at 12 units.
  var op = camDist <= 4 ? 0.85 : 0.85 * (1 - (camDist - 4) / 8 * 0.7);
  const p=obj.position.clone();p.y+=2.05;p.project(camera); // 2.5.0: 1.8-unit player, tag just above the head
  const x=(p.x*.5+.5)*innerWidth, y=(-p.y*.5+.5)*innerHeight;
  if(p.z<1&&x>0&&x<innerWidth&&y>0&&y<innerHeight){
    tag.style.display='flex';tag.style.left=x+'px';tag.style.top=y+'px';
    tag.style.opacity=op.toFixed(2);
  } else tag.style.display='none';
}

// ════════════════════════════════════
// INTERACTABLES
// ════════════════════════════════════
const OBJ_DEFS={
  bed:   {emoji:"🛏️",label:"تخت",action:"بخواب",stat:"energy",val:40,msg:"خوابیدی 😴 +۴۰ انرژی"},
  tv:    {emoji:"📺",label:"TV",action:"ببین",stat:"happy",val:15,msg:"یه چیز باحال دیدی 📺 +۱۵ شادی"},
  sofa:  {emoji:"🛋️",label:"مبل",action:"لم بده",stat:"energy",val:10,msg:"لم دادی 🛋️ +۱۰ انرژی"},
  fridge:{emoji:"🥗",label:"یخچال",action:"بخور",stat:"hunger",val:25,msg:"غذا خوردی 🍽️ +۲۵ سیری"},
  shower:{emoji:"🚿",label:"دوش",action:"دوش بگیر",stat:"health",val:20,msg:"دوش گرفتی 🚿 +۲۰ سلامت"},
  piano: {emoji:"🎹",label:"پیانو",action:"بنواز",stat:"happy",val:20,msg:"آهنگ زدی 🎹 +۲۰ شادی"},
};

function addInteractable(mesh,type,pos,customLabel){
  interactables.push({mesh,type,pos,customLabel});
}

function checkInteractions(){
  if(isBlock){document.getElementById('interact-btn').style.display='none';return;}
  let nearest=null,minD=C.INTERACT;
  const pp=playerGroup.position;

  interactables.forEach(obj=>{
    const op=obj.mesh.position;
    const d=Math.sqrt((pp.x-op.x)**2+(pp.z-op.z)**2);
    if(d<minD){minD=d;nearest={kind:'obj',data:obj};}
  });
  npcs.forEach(npc=>{
    const d=Math.sqrt((pp.x-npc.position.x)**2+(pp.z-npc.position.z)**2);
    if(d<minD+0.3){minD=d;nearest={kind:'npc',data:npc};}
  });

  // 2.6.0 CAR PROMPT (mobile enter/exit): the interact button is the ONLY
  // touch path into a car — GTA enter was keyboard-E only, so on a phone
  // cars were literally unboardable. Cars come from FFGTA (parked/traffic/
  // police); the button shows while driving too, as the exit button.
  let carPrompt=null;
  try{
    if(window.FFGTA && window.FFGTA.driving){ carPrompt={kind:'exit'}; }
    else if(window.FFGTA && window.FFGTA.nearestCar){
      const nc=window.FFGTA.nearestCar(3.5);
      if(nc) carPrompt={kind:'enter',car:nc};
    }
  }catch(e){}
  const btn=document.getElementById('interact-btn');
  if(carPrompt){
    if(carPrompt.kind==='exit'){
      btn.textContent='🚶 پیاده شو';
      activeInteract=()=>{ if(window.FFGTA) window.FFGTA.exitCar(); };
    } else {
      const lbl=(window.FFGTA.carLabel?window.FFGTA.carLabel(carPrompt.car):'ماشین');
      btn.textContent='🚗 سوار شو — '+lbl;
      activeInteract=()=>{ if(window.FFGTA) window.FFGTA.enterCar(carPrompt.car); };
    }
    btn.style.display='block';
  } else if(nearest){
    if(nearest.kind==='obj'){
      const t=nearest.data.type;
      if(t.startsWith('enter_')){
        btn.textContent=`🚪 ${nearest.data.customLabel||'وارد شو'}`;
        activeInteract=()=>enterBuilding(t.replace('enter_',''));
      } else {
        const def=OBJ_DEFS[t];
        if(def){btn.textContent=`${def.emoji} ${def.action}`;activeInteract=()=>doObjAction(nearest.data);}
      }
    } else {
      btn.textContent=`💬 صحبت با ${nearest.data.userData.name}`;
      activeInteract=()=>startDialog(nearest.data);
    }
    btn.style.display='block';
  } else {
    btn.style.display='none';activeInteract=null;
  }
}

function triggerInteract(){if(activeInteract)activeInteract();}

// ════════════════════════════════════
// OBJECT ACTIONS
// ════════════════════════════════════
function doObjAction(obj){
  const def=OBJ_DEFS[obj.type];
  if(!def)return;
  isBlock=true;
  document.getElementById('interact-btn').style.display='none';

  if(obj.type==='bed'){
    fadeOut(1,()=>{
      stats[def.stat]=Math.min(100,stats[def.stat]+def.val);
      stats.health=Math.min(100,stats.health+10);
      gameTime=8*60;gameDay++;
      showToast(def.msg);updateHUD();addXP(12);
      fadeIn(1);isBlock=false;
    });
    return;
  }
  stats[def.stat]=Math.min(100,stats[def.stat]+def.val);
  showToast(def.msg);updateHUD();addXP(6);
  setTimeout(()=>isBlock=false,1200);
}

function enterBuilding(locId){
  if(window.FFQuests) window.FFQuests.onEnter(locId);
  if(window.FFAudio) window.FFAudio.door();
  const loc=LOCATIONS[locId];
  if(!loc)return;
  isBlock=true;
  fadeOut(0.6,()=>{
    playerGroup.position.set(loc.pos[0],0,loc.pos[2]);
    currentLoc=loc.label;
    const sign=document.getElementById('location-sign');
    sign.style.display='block';sign.textContent='📍 '+loc.label;
    showToast('وارد '+loc.label+' شدی');
    fadeIn(0.6);isBlock=false;
  });
}

function teleportTo(locId){
  if(window.FFQuests) window.FFQuests.onEnter(locId);
  const loc=LOCATIONS[locId];
  if(!loc)return;
  fadeOut(0.5,()=>{
    playerGroup.position.set(loc.pos[0],0,loc.pos[2]);
    currentLoc=loc.label;
    document.getElementById('location-sign').style.display='block';
    document.getElementById('location-sign').textContent='📍 '+loc.label;
    fadeIn(0.5);
  });
}

// ════════════════════════════════════
// DIALOG
// ════════════════════════════════════
let curDialogNPC=null, curNode=null;

function startDialog(npc){
  if(window.FFQuests && npc && npc.userData) window.FFQuests.onTalk(npc.userData.id);
  isBlock=true;
  curDialogNPC=npc;
  npc.userData.talking=true;
  const root=npc.userData.dialogs.find(n=>n.id==='root');
  if(!root){closeDialog();return;}
  curNode=root;renderDialog();
  document.getElementById('dialog-box').style.display='block';
  stats.social=Math.min(100,stats.social+8);updateHUD();addXP(8);
}

function renderDialog(){
  if(!curNode||!curDialogNPC)return;
  const ud=curDialogNPC.userData;
  document.getElementById('dialog-portrait').textContent=ud.emoji;
  document.getElementById('dialog-npc').textContent=`${ud.name} — ${ud.role}`;
  document.getElementById('dialog-text').textContent=curNode.text;
  const dc=document.getElementById('dialog-choices');
  dc.innerHTML='';
  curNode.choices.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='dchoice';btn.textContent=c.label;
    btn.onclick=()=>{
      if(c.action){handleDialogAction(c.action);}
      if(c.next===null){closeDialog();}
      else{
        const nx=curDialogNPC.userData.dialogs.find(n=>n.id===c.next);
        if(nx){curNode=nx;renderDialog();}else closeDialog();
      }
    };
    dc.appendChild(btn);
  });
}

function handleDialogAction(action){
  if(action==='changeClothes'){
    const colors=[0xff4081,0x2196f3,0x4caf50,0xff9800,0x9c27b0,0xf44336,0x00bcd4,0xffc107];
    const nc=colors[Math.floor(Math.random()*colors.length)];
    playerBody.traverse(c=>{if(c.isMesh&&c.material.color.getHex()!==0xffcc99&&c.material.color.getHex()!==0x222222&&c.material.color.getHex()!==0x1a0a00) c.material.color.setHex(nc);});
    showToast("👕 رنگ لباست عوض شد!");
  }
  if(action==='getLoan'){stats.money=Math.min(100,stats.money+30);updateHUD();showToast("💳 وام گرفتی! +۳۰ پول");}
  if(action==='getCar'){showToast("🚗 ماشین گرفتی از آرین!");}
  if(action==='takePhoto'){showEvent("📷 عکس گرفته شد!",2000);showToast("📷 عکست رو الی گرفت!");}
  if(action==='goCafe'){teleportTo('cafe');showToast("☕ رفتید کافه!");}
  if(action==='goWedding'){teleportTo('wedding');showToast("💒 رفتید عروسی!");showEvent("💃 برقص!",2000);}
}

function closeDialog(){
  document.getElementById('dialog-box').style.display='none';
  if(curDialogNPC)curDialogNPC.userData.talking=false;
  curDialogNPC=null;curNode=null;isBlock=false;
}

// ════════════════════════════════════
// PHONE UI
// ════════════════════════════════════
function buildPhoneUI(){
  const c=document.getElementById('phone-contacts');
  c.innerHTML='';
  activeChars.forEach(def=>{
    const div=document.createElement('div');
    div.className='pcontact';
    const colors=['#e91e63','#2196f3','#4caf50','#ff9800','#9c27b0','#f44336','#00bcd4','#795548','#607d8b','#ff5722'];
    const bg=colors[Math.floor(Math.random()*colors.length)];
    div.innerHTML=`
      <div class="pc-avatar" style="background:${bg}20;border:2px solid ${bg}40">${def.emoji}</div>
      <div class="pc-info">
        <div class="pc-name">${def.name}</div>
        <div class="pc-role">${def.role}</div>
        <div class="pc-action">📞 تماس</div>
      </div>`;
    div.onclick=()=>callChar(def);
    c.appendChild(div);
  });
}

// تغییر زاویه دید به POV یا بازگشت به سوم شخص
function toggleCameraMode() {
  if(!isGameRunning) return;
  camMode = (camMode === 'TPV') ? 'POV' : 'TPV';
  const btn = document.getElementById('cam-toggle-btn');
  if(camMode === 'POV') {
    btn.textContent = '👁️';
    if(playerBody) playerBody.visible = false;
    showToast("زاویه دید: اول شخص (POV)");
  } else {
    btn.textContent = '🎥';
    if(playerBody) playerBody.visible = true;
    showToast("زاویه دید: سوم شخص");
  }
}

function openPhone(){
  document.getElementById('phone-overlay').style.display='flex';
}
function closePhone(e){
  if(!e||e.target===document.getElementById('phone-overlay'))
    document.getElementById('phone-overlay').style.display='none';
}

function callChar(def){
  closePhone();
  const resp=typeof def.callResponse==='function'?def.callResponse(pName):def.callResponse;
  
  document.getElementById('call-avatar').textContent=def.emoji;
  document.getElementById('call-name').textContent=def.name;
  document.getElementById('call-status').textContent=def.role;
  document.getElementById('call-response').textContent='';
  document.getElementById('call-screen').style.display='flex';

  setTimeout(()=>{
    document.getElementById('call-status').textContent='در حال صحبت...';
    document.getElementById('call-response').textContent=resp;
    if(typeof def.callAction==='function') def.callAction(pName);
  },1500);
}

function showCallScreen(name,emoji,text,choices){
  document.getElementById('call-avatar').textContent=emoji;
  document.getElementById('call-name').textContent=name;
  document.getElementById('call-status').textContent='در حال صحبت...';
  document.getElementById('call-response').textContent=text;
  document.getElementById('call-screen').style.display='flex';
  
  const row=document.getElementById('call-screen').querySelector('.call-btn-row');
  const old=row.querySelectorAll('.choice-btn');
  old.forEach(b=>b.remove());
  
  choices.forEach(c=>{
    const btn=document.createElement('div');
    btn.className='call-btn accept choice-btn';
    btn.style.cssText='width:auto;border-radius:12px;padding:8px 12px;font-size:12px;font-family:Vazirmatn,sans-serif;';
    btn.textContent=c.label;
    btn.onclick=()=>{c.action&&c.action();endCall();};
    row.appendChild(btn);
  });
}

function endCall(){
  document.getElementById('call-screen').style.display='none';
  const row=document.getElementById('call-screen').querySelector('.call-btn-row');
  const old=row.querySelectorAll('.choice-btn');
  old.forEach(b=>b.remove());
}

// ════════════════════════════════════
// CONTROLS
// ════════════════════════════════════
function setupControls(){
  const zone=document.getElementById('joystick-zone');
  const knob=document.getElementById('joystick-knob');
  // 2.5.0: the page is RTL — force the joystick container LTR so the knob
  // can never be mirrored by direction:rtl (knob px offsets are screen px).
  try{ zone.style.direction='ltr'; zone.style.unicodeBidi='isolate'; }catch(e){}
  let jx=0,jy=0;

  zone.addEventListener('touchstart',e=>{e.preventDefault();jx=e.touches[0].clientX;jy=e.touches[0].clientY;},{passive:false});
  zone.addEventListener('touchmove',e=>{
    e.preventDefault();
    const dx=e.touches[0].clientX-jx,dy=e.touches[0].clientY-jy;
    const dist=Math.min(Math.hypot(dx,dy),50);
    const angle=Math.atan2(dy,dx);
    knob.style.transform=`translate(-50%,-50%) translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
    moveX=Math.max(-1,Math.min(1,dx/50));moveY=Math.max(-1,Math.min(1,dy/50));
    if(Math.abs(moveX)<0.15)moveX=0; if(Math.abs(moveY)<0.15)moveY=0;
    window.FFJoy={x:moveX,y:moveY}; // 2.2.0: driving code (gta.js / gameplay-overhaul) reads this, so the joystick works in a car too
  },{passive:false});
  zone.addEventListener('touchend',()=>{knob.style.transform='translate(-50%,-50%)';moveX=0;moveY=0;window.FFJoy={x:0,y:0};});
  zone.addEventListener('touchcancel',()=>{knob.style.transform='translate(-50%,-50%)';moveX=0;moveY=0;window.FFJoy={x:0,y:0};});

  let px=0,pid=-1;
  document.addEventListener('touchstart',e=>{
    for(const t of e.changedTouches){
      if(!e.target.closest('#joystick-zone')&&!e.target.closest('button')&&!e.target.closest('#dialog-box')&&!e.target.closest('#action-btns')&&!e.target.closest('#phone-overlay')&&!e.target.closest('#call-screen')){
        if(t.clientX>innerWidth*0.38){px=t.clientX;pid=t.identifier;}
      }
    }
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===pid){camYaw+=(t.clientX-px)*0.004;px=t.clientX;} // 2.2.0: was -=, which panned the view left when dragging right
    }
  },{passive:true});
  document.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===pid)pid=-1;});

  let mdown=false;
  renderer.domElement.addEventListener('mousedown',e=>{if(e.button!==1){mdown=true;renderer.domElement.requestPointerLock?.();}});
  document.addEventListener('mousemove',e=>{if(mdown||document.pointerLockElement===renderer.domElement){camYaw+=e.movementX*0.003;}}); // 2.2.0: same drag-sign fix as touch
  document.addEventListener('mouseup',()=>mdown=false);
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

  const keys={};
  document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='ShiftLeft')setSprint(true);});
  document.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='ShiftLeft')setSprint(false);});
  window._keys=keys;
}

function setSprint(v){isSprint=v;document.getElementById('sprint-btn').classList.toggle('on',v);}

function openInventory(){
  showToast('🎒 کوله‌پشتی: '+(inventory.length?inventory.join('، '):'خالیه!'));
}

// ════════════════════════════════════
// MINIMAP
// ════════════════════════════════════
function drawMinimap(){
  const cv=document.getElementById('mm-canvas');
  if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const scale=W/(C.WORLD*2.5);
  const cx=W/2,cy=H/2;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(10,15,30,0.85)';
  ctx.beginPath();ctx.arc(cx,cy,W/2,0,Math.PI*2);ctx.fill();

  Object.values(LOCATIONS).forEach(loc=>{
    const lx=cx+loc.pos[0]*scale, ly=cy+loc.pos[2]*scale;
    ctx.fillStyle='rgba(255,200,50,0.6)';
    ctx.fillRect(lx-3,ly-3,6,6);
  });

  activeChars.forEach((def,i)=>{
    const npc=npcs[i];if(!npc)return;
    const nx=cx+npc.position.x*scale, ny=cy+npc.position.z*scale;
    ctx.fillStyle='rgba(100,200,255,0.7)';
    ctx.beginPath();ctx.arc(nx,ny,2.5,0,Math.PI*2);ctx.fill();
  });

  const pp=playerGroup?playerGroup.position:new THREE.Vector3();
  const px2=cx+pp.x*scale, py2=cy+pp.z*scale;
  ctx.fillStyle='#ffd700';
  ctx.beginPath();ctx.arc(px2,py2,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,215,0,0.5)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(px2,py2,7,0,Math.PI*2);ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(cx,cy,W/2-1,0,Math.PI*2);ctx.stroke();
}

// ════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════
let walkT=0;
// 2.3.0: smooth movement state — acceleration curves, jump physics, lean.
// 2.4.0: ffSmoothYaw stops the body snapping to the movement direction
// (the old code assigned rotation.y = newYaw instantly every frame);
// ffPrevWalkSin drives footsteps from the walk-cycle zero crossing, so
// steps stay in rhythm with the animation instead of a fixed 0.38s timer.
let ffCurSpeed=0, ffJumpVy=0, ffJumping=false, ffPrevYaw=0, ffLastMoveX=0, ffLastMoveZ=0;
let ffSmoothYaw=0, ffSmoothYawInit=false, ffPrevWalkSin=0;

function animate(){
  requestAnimationFrame(animate);
  if(!isGameRunning)return;
  const dt=Math.min(clock.getDelta(),0.05);
  const t=clock.getElapsedTime();
  const drivingNow = !!(window.FFGTA && window.FFGTA.driving);

  if(!isBlock){
    // 2.5.0 JOYSTICK L/R ROOT CAUSE + FIX (the 2.2.0 claim was WRONG):
    // The old right vector was (1,0,0) rotated by camYaw = (cos,-sin).
    // But the camera sits at player - (sin,cos)*dist and looks along
    // F=(sin,cos), so its true screen-right is F x up = (-cos,sin) —
    // exactly the NEGATIVE of the old vector. So joystick-right (and D)
    // moved the player screen-LEFT, and joystick-left moved screen-RIGHT,
    // while forward/back (which used the correct F) stayed right — which
    // is exactly what the user reported in 2.4.0. The fix below derives
    // the basis DIRECTLY from the live camera every frame, so it cannot
    // drift from any camYaw convention again: forward = camera view
    // direction projected on XZ, right = forward x up (Three's camera
    // right). Joystick-up = forward, joystick-right = screen-right, and
    // WASD uses the same basis, so keys and joystick can never disagree.
    var fwd=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),camYaw);
    try{
      if(camera){ camera.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()>0.001) fwd.normalize(); else fwd.set(Math.sin(camYaw),0,Math.cos(camYaw)); }
    }catch(e){}
    var rgt=new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0));
    let mx=moveX,my=moveY;
    const k=window._keys||{};
    if(k['KeyW']||k['ArrowUp'])my=-1;
    if(k['KeyS']||k['ArrowDown'])my=1;
    if(k['KeyA']||k['ArrowLeft'])mx=-1;
    if(k['KeyD']||k['ArrowRight'])mx=1;

    const mv=new THREE.Vector3().addScaledVector(fwd,-my).addScaledVector(rgt,mx);
    const moving=mv.length()>0.1;

    if(moving){
      // 2.3.0 acceleration curve: no instant full speed, smooth stop.
      const targetSpeed=C.SPEED*(isSprint?C.SPRINT:1);
      ffCurSpeed += (targetSpeed - ffCurSpeed) * Math.min(1, dt * 8);
      mv.normalize().multiplyScalar(ffCurSpeed*dt);
      // 2.3.0 real collision: slide along walls instead of passing through.
      // 2.6.0 SUBSTEPS: split the frame move into <=0.4-unit steps so a fast
      // sprint can never tunnel through a thin wall in one frame.
      const mvLen=Math.hypot(mv.x, mv.z);
      const steps=Math.max(1, Math.ceil(mvLen / 0.4));
      for(let si=0; si<steps; si++){
        const sx=playerGroup.position.x + mv.x/steps, sz=playerGroup.position.z + mv.z/steps;
        if(window.FFLogic){
          const res=window.FFLogic.resolveMove(playerGroup.position.x, playerGroup.position.z, sx, sz, 0.55);
          playerGroup.position.x=res.x; playerGroup.position.z=res.z;
        } else {
          playerGroup.position.x=sx; playerGroup.position.z=sz;
        }
      }
      // 2.6.0 player-vs-car contact: you cannot walk THROUGH a car (push out
      // to a 2.3-unit circle), but the enter prompt range is 3.5, so boarding
      // still works — and the 0.9s enter/exit grace disables the shove.
      try{
        if(window.FFGTA && window.FFGTA.cars && !window.FFGTA.driving &&
           !(window.FFEnterGrace && Date.now() < window.FFEnterGrace)){
          window.FFGTA.cars.forEach(function(c){
            if(!c.group || !c.group.visible) return;
            const dx=playerGroup.position.x - c.group.position.x, dz=playerGroup.position.z - c.group.position.z;
            const d=Math.hypot(dx, dz);
            if(d < 2.3 && d > 0.001){
              playerGroup.position.x = c.group.position.x + dx/d*2.3;
              playerGroup.position.z = c.group.position.z + dz/d*2.3;
            }
          });
        }
      }catch(e){}
      const newYaw=Math.atan2(mv.x,mv.z);
      // 2.3.0 body lean into turns (turn speed depends on speed).
      let dYaw=newYaw-ffPrevYaw; while(dYaw>Math.PI)dYaw-=Math.PI*2; while(dYaw<-Math.PI)dYaw+=Math.PI*2;
      // 2.4.0: turn smoothly toward the movement direction (shortest arc,
      // frame-rate-independent) instead of snapping rotation.y every frame.
      if(!ffSmoothYawInit){ ffSmoothYaw=newYaw; ffSmoothYawInit=true; }
      else {
        let dy=newYaw-ffSmoothYaw; while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
        ffSmoothYaw += dy * Math.min(1, dt*10);
      }
      playerBody.rotation.y=ffSmoothYaw;
      playerBody.rotation.z=Math.max(-0.18,Math.min(0.18,-dYaw*Math.min(1,ffCurSpeed/C.SPEED)*0.6));
      ffPrevYaw=newYaw;
      ffLastMoveX=mv.x; ffLastMoveZ=mv.z;
      walkT+=dt*(isSprint?14:9);
      // 2.4.0: a footstep on every half walk cycle (sin zero crossing),
      // so steps follow the animation speed (walk vs sprint), not a clock.
      const ws=Math.sin(walkT);
      if(window.FFFootstep && ((ffPrevWalkSin>0 && ws<=0) || (ffPrevWalkSin<0 && ws>=0))){ window.FFAudio&&window.FFAudio.footstep(); window.FFFootstep(playerGroup.position.x,playerGroup.position.z); }
      ffPrevWalkSin=ws;
      const sw=Math.sin(walkT)*0.48;
      const ll=playerBody.getObjectByName('leftLeg'); if(ll)ll.rotation.x=sw;
      const rl=playerBody.getObjectByName('rightLeg'); if(rl)rl.rotation.x=-sw;
      const la=playerBody.getObjectByName('leftArm'); if(la)la.rotation.x=-sw*0.55;
      const ra=playerBody.getObjectByName('rightArm'); if(ra)ra.rotation.x=sw*0.55;
      playerBody.position.y=Math.abs(Math.sin(walkT))*0.035;
    } else {
      ffCurSpeed += (0 - ffCurSpeed) * Math.min(1, dt * 10);
      playerBody.rotation.z *= 0.85;
      // idle breathing (instead of a frozen pose)
      playerBody.position.y=Math.sin(t*1.8)*0.012;
      ['leftLeg','rightLeg','leftArm','rightArm'].forEach(n=>{
        const o=playerBody.getObjectByName(n);if(o)o.rotation.x*=0.82;
      });
    }
    playerGroup.position.x=Math.max(-C.WORLD,Math.min(C.WORLD,playerGroup.position.x));
    playerGroup.position.z=Math.max(-C.WORLD,Math.min(C.WORLD,playerGroup.position.z));
    // 2.3.0 jump (on foot only, Space): gravity + landing, no teleport.
    if(!drivingNow && (k['Space'] || k['SpaceKey']) && !ffJumping && playerGroup.position.y<=0.01){
      ffJumping=true; ffJumpVy=5.6;
    }
    if(ffJumping){
      ffJumpVy -= 14*dt;
      playerGroup.position.y += ffJumpVy*dt;
      if(playerGroup.position.y<=0){ playerGroup.position.y=0; ffJumpVy=0; ffJumping=false; }
    } else if(!moving){
      playerGroup.position.y=0;
    } else {
      // Walking on ground: keep the bob from above, do not force y=0
      // while the jump arc is in flight (handled above).
      if(playerGroup.position.y<0) playerGroup.position.y=0;
    }
  }

  // ── سیستم دوربین جدید و پیشرفته ──
  if(camMode === 'POV') {
    // موقعیت روی چشم‌های کاراکتر
    const eyeHeight = 1.36;
    camera.position.set(playerGroup.position.x, playerGroup.position.y + eyeHeight, playerGroup.position.z);
    
    // هدف دید دوربین رو به جلو بر اساس چرخش زاویه تاچ/موس
    const targetVector = new THREE.Vector3(
      playerGroup.position.x + Math.sin(camYaw),
      playerGroup.position.y + eyeHeight,
      playerGroup.position.z + Math.cos(camYaw)
    );
    camera.lookAt(targetVector);
  } else if (window.FFCamera24) {
    // 2.4.0: THE single TPV camera controller (camera24.js) — GTA-style
    // behind-the-character camera with dt-based damping and continuous
    // raycast collision vs buildings AND vehicles. The old inline code
    // below is kept only as a fallback if camera24.js failed to load.
    window.FFCamera24.update(dt, {pos: playerGroup.position, yaw: camYaw, driving: drivingNow});
  } else {
    // Fallback (camera24.js missing): old 2.3.0 follow camera.
    let cd = C.CAM_DIST;
    let ch = C.CAM_H;
    if(drivingNow){ cd = C.CAM_DIST * 1.45; ch = C.CAM_H * 1.25; }
    if(window.FFLogic){
      cd = window.FFLogic.cameraDistance(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z, camYaw, cd, ch);
    }
    const tx = playerGroup.position.x - Math.sin(camYaw) * cd;
    const ty = playerGroup.position.y + ch * (cd / (drivingNow ? C.CAM_DIST * 1.45 : C.CAM_DIST));
    const tz = playerGroup.position.z - Math.cos(camYaw) * cd;

    camera.position.lerp(new THREE.Vector3(tx, ty, tz), C.CAM_LAG);
    const la = 1.1;
    camera.lookAt(
      playerGroup.position.x + ffLastMoveX * la * 8,
      playerGroup.position.y + 0.9,
      playerGroup.position.z + ffLastMoveZ * la * 8
    );
  }

  updateNPCs(dt,t);

  updateTag(playerGroup,playerGroup.userData.tag);
  npcs.forEach(n=>updateTag(n,n.userData.tag));

  checkInteractions();
  updateParticles(dt);

  if(worldObjs.tv) worldObjs.tv.material.emissiveIntensity=0.25+Math.sin(t*2.2)*0.08+Math.sin(t*7.1)*0.04;

  // ── ONE central loop (Phase 0): world + gameplay + particles + graphics ──
  try{ if(window.FFWorldUpdate) window.FFWorldUpdate(dt,t); }catch(e){ console.warn('world update',e); }
  try{ if(window.FFGameplayUpdate) window.FFGameplayUpdate(performance.now()); }catch(e){ console.warn('gameplay update',e); }
  try{ if(window.FFParticles) window.FFParticles.update(dt); }catch(e){ console.warn('particles',e); }
  try{ if(window.FFGraphics) window.FFGraphics.update(dt,t); }catch(e){ console.warn('graphics',e); }
  try{ if(window.FFGTAUpdate) window.FFGTAUpdate(dt,t); }catch(e){ console.warn('gta update',e); }
  drawMinimap();
  if(window.FFRender) window.FFRender(); else renderer.render(scene,camera);
}

// ════════════════════════════════════
// NPC UPDATE
// ════════════════════════════════════
function updateNPCs(dt,t){
  npcs.forEach((npc,i)=>{
    const ud=npc.userData;
    if(ud.talking)return;
    ud.waitTime-=dt;
    if(ud.waitTime<=0){
      const home=ud.homePos;
      const wander=8;
      ud.target.set(
        home.x+(Math.random()-.5)*wander*2,
        0,
        home.z+(Math.random()-.5)*wander*2
      );
      ud.waitTime=4+Math.random()*7;
    }
    const dir=new THREE.Vector3().subVectors(ud.target,npc.position);
    const dist=dir.length();
    if(dist>0.5){
      dir.normalize().multiplyScalar(C.NPC_SPEED*(ud.speedFactor||1)*dt); // 2.5.0: per-NPC walk speed (set by models23)
      // 2.3.0: peds do not walk through the player or through buildings.
      const nx=npc.position.x+dir.x, nz=npc.position.z+dir.z;
      if(window.FFLogic){
        const res=window.FFLogic.resolveMove(npc.position.x, npc.position.z, nx, nz, 0.5);
        npc.position.x=res.x; npc.position.z=res.z;
      } else {
        npc.position.add(dir);
      }
      if(playerGroup){
        const pdx=npc.position.x-playerGroup.position.x, pdz=npc.position.z-playerGroup.position.z;
        const pd=Math.sqrt(pdx*pdx+pdz*pdz);
        // 2.6.0 SMOOTH ped separation: ease out to 0.9 instead of teleporting
        // the NPC to exactly 0.9 in one frame (the old pop).
        if(pd<0.9 && pd>0.001){
          const need=0.9-pd, step=Math.min(need, dt*3);
          npc.position.x += pdx/pd*step; npc.position.z += pdz/pd*step;
        }
      }
      // 2.4.0: NPCs turn smoothly toward their walk direction (shortest
      // arc, dt-based) instead of lookAt() snapping every frame. The yaw
      // convention matches the player: +Z faces the movement direction.
      const tyaw=Math.atan2(ud.target.x-npc.position.x, ud.target.z-npc.position.z);
      if(ud.smoothYaw===undefined) ud.smoothYaw=npc.rotation.y;
      let ndy=tyaw-ud.smoothYaw; while(ndy>Math.PI)ndy-=Math.PI*2; while(ndy<-Math.PI)ndy+=Math.PI*2;
      ud.smoothYaw += ndy * Math.min(1, dt*6);
      npc.rotation.y=ud.smoothYaw;
      const wt=t*9+ud.walkOff;
      const body=ud.body;
      body.getObjectByName('leftLeg').rotation.x=Math.sin(wt)*0.42;
      body.getObjectByName('rightLeg').rotation.x=Math.sin(wt+Math.PI)*0.42;
      body.getObjectByName('leftArm').rotation.x=-Math.sin(wt)*0.25;
      body.getObjectByName('rightArm').rotation.x=Math.sin(wt)*0.25;
    } else {
      const body=ud.body;
      ['leftLeg','rightLeg','leftArm','rightArm'].forEach(n=>{
        const o=body.getObjectByName(n);if(o)o.rotation.x*=0.8;
      });
    }
  });
}

// ════════════════════════════════════
// SYSTEM HELPER FUNCTIONS
// ════════════════════════════════════
function updateParticles(dt) {
  // افکت‌های محیطی ساده در صورت نیاز
}

function showToast(msg){
  // 2.7.0 QUIET TEXT: max ONE toast at a time, never stacked.
  const area=document.getElementById('toast-area');
  if(!area) return;
  while(area.firstChild) area.firstChild.remove();
  const d=document.createElement('div');d.className='toast';d.textContent=msg;
  area.appendChild(d);setTimeout(()=>d.remove(),2500);
}

function showEvent(txt,dur){
  const b=document.getElementById('event-banner');const t=document.getElementById('eb-text');
  t.textContent=txt;b.style.display='block';
  setTimeout(()=>b.style.display='none',dur);
}

function updateHUD(){
  document.getElementById('b-health').style.width=stats.health+'%';
  document.getElementById('b-energy').style.width=stats.energy+'%';
  document.getElementById('b-hunger').style.width=stats.hunger+'%';
  document.getElementById('b-happy').style.width=stats.happy+'%';
  document.getElementById('b-money').style.width=Math.min(100,stats.money)+'%';
  var ml=document.getElementById('ff-money-text'); if(ml) ml.textContent=stats.money;
}

function addXP(v){
  stats.xp+=v;
  if(stats.xp>=100){
    stats.xp-=100;stats.level++;
    document.getElementById('hud-lv').textContent='⭐ سطح '+stats.level;
    showEvent("🎉 افزایش سطح! سطح "+stats.level,3000);
  }
}

function startTimers(){
  setInterval(()=>{
    if(!isGameRunning||isBlock)return;
    gameTime++;
    if(gameTime>=24*60){
      gameTime=0;gameDay++;
      document.getElementById('day-disp').textContent='روز '+gameDay;
    }
    const h=String(Math.floor(gameTime/60)).padStart(2,'0');
    const m=String(gameTime%60).padStart(2,'0');
    document.getElementById('time-disp').textContent=h+':'+m;
    
    if(Math.random()<0.15){
      stats.hunger=Math.max(0,stats.hunger-1);
      stats.energy=Math.max(0,stats.energy-1);
      if(stats.hunger<15||stats.energy<15) stats.happy=Math.max(0,stats.happy-1);
      updateHUD();
    }
  },1000);
}

function fadeOut(dur,cb){const f=document.getElementById('fade');f.style.opacity=1;setTimeout(cb,dur*1000);}
function fadeIn(dur){const f=document.getElementById('fade');setTimeout(()=>f.style.opacity=0,50);}

// ════════════════════════════════════
// FAMILY FUN — REALISM & WORLD DETAIL PASS
// ════════════════════════════════════
function makeCanvasTexture(draw,w=512,h=256){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function enhancedLabel(text,icon,color){
  return makeCanvasTexture((c,w,h)=>{
    c.fillStyle='#172033';c.fillRect(0,0,w,h);c.fillStyle=color||'#ffd166';c.fillRect(0,h-12,w,12);
    c.font='bold 54px Vazirmatn, Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText(icon+'  '+text,w/2,h/2-4);
  },512,128);
}
function addEnhancedMesh(geo,material,x,y,z,group){
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(group||scene).add(m);return m;
}
function enhanceWorld(){
  if(window.__familyFunEnhanced||typeof THREE==='undefined')return;window.__familyFunEnhanced=true;
  /* 2.1.0: bottom badge removed (HUD declutter) */
  buildStreetDetail();buildArchitectureDetail();buildGardens();buildTraffic();buildAtmosphere();
  window.setInterval(updateEnhancedLighting,800);
}
function buildStreetDetail(){
  const asphalt=mat(0x242832,{roughness:.95});
  // اصلاح محور خیابان دوم به محدوده‌ی قابل بازی و افزودن خط‌کشی مقیاس‌دار
  addEnhancedMesh(new THREE.PlaneGeometry(80,6),asphalt,0,.035,0).rotation.x=-Math.PI/2;
  const lineMat=mat(0xf5d76e,{roughness:.7});
  for(let z=-36;z<=36;z+=7){const a=addEnhancedMesh(new THREE.PlaneGeometry(1.8,.09),lineMat,0,.07,z);a.rotation.x=-Math.PI/2;}
  for(let x=-36;x<=36;x+=7){const a=addEnhancedMesh(new THREE.PlaneGeometry(.09,1.8),lineMat,x,.071,0);a.rotation.x=-Math.PI/2;}
  // گذرگاه‌ها
  [-10,10].forEach(z=>{for(let i=-3;i<=3;i++){const a=addEnhancedMesh(new THREE.PlaneGeometry(1.2,4.8),mat(0xe9edf2,{roughness:.85}),i*1.7,.075,z);a.rotation.x=-Math.PI/2;}});
  // چراغ‌های گرم خیابان
  [[-5,-13],[5,-13],[-5,13],[5,13],[-25,-3],[25,3]].forEach(([x,z])=>{
    const g=new THREE.Group();addEnhancedMesh(new THREE.CylinderGeometry(.07,.11,3.2,8),mat(0x303744,{metalness:.65,roughness:.35}),x,1.6,z,g);
    addEnhancedMesh(new THREE.SphereGeometry(.18,10,8),mat(0xffd27d,{emissive:0xffa62b,emissiveIntensity:.9}),x,3.25,z,g);
    const l=new THREE.PointLight(0xffb35c,0,7);l.position.set(x,3.15,z);g.add(l);g.userData.lamp=l;scene.add(g);
  });
}
function buildArchitectureDetail(){
  const windowMat=mat(0x9edbff,{roughness:.12,metalness:.15,emissive:0x102840,emissiveIntensity:.35});
  // قاب‌های پنجره و سایه‌بان‌های متفاوت برای حس ساختمان واقعی
  [[18,5,6,4],[12,-15,8,5],[5,15,9,5],[-18,8,8,4],[28,12,10,4],[-10,-20,6,4],[8,-25,7,5],[20,-20,8,5],[-15,-5,7,6],[3,20,5,4],[25,25,12,6],[-20,15,7,4],[22,-10,6,4],[-8,25,6,4]].forEach(([x,z,w,h])=>{
    const front=z+(h*.65)+.08;for(let i=-1;i<=1;i+=2){
      addEnhancedMesh(new THREE.BoxGeometry(1.45,1.25,.07),windowMat,x+i*Math.min(w/3,2.2),h*.62,front);
      addEnhancedMesh(new THREE.BoxGeometry(1.8,.08,.55),mat(0xf2b56b,{roughness:.65}),x+i*Math.min(w/3,2.2),h*1.08,front+.08);
    }
    const aw=mat(0xd94b52,{roughness:.8});const canopy=addEnhancedMesh(new THREE.BoxGeometry(Math.min(w*.7,5),.12,1.1),aw,x,h*.62,front+.5);canopy.rotation.x=-.18;
  });
}
function buildGardens(){
  const soil=mat(0x6d472c,{roughness:1});const leaf=mat(0x4f9b58,{roughness:.9});const flower=mat(0xff7198,{roughness:.75,emissive:0x1b0610,emissiveIntensity:.15});
  [[-9,9],[9,9],[-15,-11],[16,17],[-26,20]].forEach(([x,z],n)=>{
    addEnhancedMesh(new THREE.BoxGeometry(5,.12,2.4),soil,x,.08,z);
    for(let i=0;i<7;i++){const px=x-2+i*.65;addEnhancedMesh(new THREE.CylinderGeometry(.05,.08,.45,6),leaf,px,.32,z+(i%2-.5)*.65);addEnhancedMesh(new THREE.SphereGeometry(.15,7,6),flower,px,.62,z+(i%2-.5)*.65);}
  });
}
function carPaint(c){return mat(c,{roughness:.28,metalness:.62});}
function makeCar(x,z,color,axis){
  const g=new THREE.Group();addEnhancedMesh(new THREE.BoxGeometry(2.3,.55,4.1),carPaint(color),0,.58,0,g);
  addEnhancedMesh(new THREE.BoxGeometry(1.8,.48,1.55),mat(0x172333,{roughness:.15,metalness:.3}),0,1.05,-.15,g);
  [-.78,.78].forEach(px=>[-1.35,1.35].forEach(pz=>addEnhancedMesh(new THREE.CylinderGeometry(.32,.32,.18,12),mat(0x111318,{roughness:.75}),px,.3,pz,g).rotation.z=Math.PI/2));
  g.position.set(x,0,z);g.userData.axis=axis;g.userData.speed=.8+Math.random()*.7;g.userData.phase=Math.random()*20;scene.add(g);return g;
}
function buildTraffic(){
  window.__familyCars=[makeCar(-18,2,0xd94b4b,'x'),makeCar(12,-2,0x3e8ed0,'x'),makeCar(2,-28,0xf0b429,'z')];
  window.setInterval(()=>{const cars=window.__familyCars||[];cars.forEach(c=>{if(c.userData.axis==='x'){c.position.x+=.25*c.userData.speed;if(c.position.x>42)c.position.x=-42;}else{c.position.z+=.22*c.userData.speed;if(c.position.z>42)c.position.z=-42;}})},120);
}
function buildAtmosphere(){
  // لایه‌ی آسمان و ذرات کم‌هزینه‌ی گرده/پرنده برای عمق بیشتر
  const sky=new THREE.Mesh(new THREE.SphereGeometry(95,32,16),new THREE.MeshBasicMaterial({color:0x76b8df,side:THREE.BackSide,transparent:true,opacity:.28,depthWrite:false}));scene.add(sky);
  const pts=[];for(let i=0;i<70;i++)pts.push((Math.random()-.5)*80,.6+Math.random()*5,(Math.random()-.5)*80);
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const dust=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffe6a3,size:.035,transparent:true,opacity:.28}));scene.add(dust);window.__familyDust=dust;
}
function updateEnhancedLighting(){
  if(!window.__familyFunEnhanced||typeof scene==='undefined'||!worldObjs.sun)return;
  const t=(gameTime%1440)/1440;const daylight=Math.max(0,Math.sin((t-.25)*Math.PI*2));
  const night=1-daylight;worldObjs.sun.intensity=.25+daylight*1.15;worldObjs.sun.color.setHSL(.1,.65,.62+.18*daylight);
  scene.background.setHSL(.57,.58,.12+.43*daylight);scene.fog.color.setHSL(.58,.35,.14+.42*daylight);scene.fog.density=.010+.006*night;
  scene.traverse(o=>{if(o.userData&&o.userData.lamp)o.userData.lamp.intensity=night>0.35?1.8:0;});
  if(window.__familyDust)window.__familyDust.rotation.y+=.003;
}


// ── Phase 0/3 bridge: top-level `let` bindings are NOT window properties in
// classic scripts, but the new modules (economy/save/quests/graphics) read
// window.stats / window.gameTime / etc. These live getters/setters bridge them.
try{
  Object.defineProperty(window,'pName',{get:()=>pName,set:v=>{pName=v;},configurable:true});
  Object.defineProperty(window,'pGender',{get:()=>pGender,set:v=>{pGender=v;},configurable:true});
  Object.defineProperty(window,'gameTime',{get:()=>gameTime,set:v=>{gameTime=v;},configurable:true});
  Object.defineProperty(window,'gameDay',{get:()=>gameDay,set:v=>{gameDay=v;},configurable:true});
  Object.defineProperty(window,'isGameRunning',{get:()=>isGameRunning,set:v=>{isGameRunning=v;},configurable:true});
  Object.defineProperty(window,'stats',{get:()=>stats,configurable:true});
  Object.defineProperty(window,'inventory',{get:()=>inventory,configurable:true});
}catch(e){ console.warn('FF bridge',e); }

// 2.1.0: explicit window bridge so overlay hooks (character-studio, landscape) always see initGame.
window.initGame = initGame;
