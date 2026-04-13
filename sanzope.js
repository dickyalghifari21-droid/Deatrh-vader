require('dotenv').config()

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const TelegramBot = require('node-telegram-bot-api')
const { open } = require('sqlite')
const sqlite3 = require('sqlite3')
const { nanoid } = require('nanoid')
const http = require('http')
const os = require('os')
const zlib = require('zlib')
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

;(async function main () {
  const BOT_TOKEN = process.env.BOT_TOKEN || ''
  const API_PORT = Number(process.env.API_PORT || 2048)
  const API_BASE_URL = process.env.API_BASE_URL || `http://nodemyayun.otax.store:${API_PORT}`
  const API_SECRET = process.env.API_SECRET || 'Syamanta031003'
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'SYAMANTA121517'
  const ENV_GROUP_TK_ID = process.env.GROUP_TK_ID
  ? String(process.env.GROUP_TK_ID)
  : (process.env.GROUP_TARGET ? String(process.env.GROUP_TARGET) : '');
const ENV_GROUP_PT_ID = process.env.GROUP_PT_ID ? String(process.env.GROUP_PT_ID) : ''
const ENV_GROUP_RESELLER_ID = process.env.GROUP_RESELLER_ID ? String(process.env.GROUP_RESELLER_ID) : ''
const ENV_GROUP_FULLUP_ID = process.env.GROUP_FULLUP_ID ? String(process.env.GROUP_FULLUP_ID) : ''

// TAMBAH INI
const ENV_OWNER_ID = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : 0;
  const BANNER_URL = process.env.BANNER_URL || 'https://files.catbox.moe/dqa730.jpg'
  const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => Number(s)).filter(Boolean)
  const OWNER_ID = Number(process.env.OWNER_ID || (ADMIN_IDS[0] || 0))
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN kosong')

  const dbFile = path.join(__dirname, 'data.sqlite')
  fs.mkdirSync(path.dirname(dbFile), { recursive: true })
  const db = await open({ filename: dbFile, driver: sqlite3.Database })

  await db.exec(`PRAGMA journal_mode=WAL;`);

// ================= USERS =================
await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  tg_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'NONE',
  max_tokens INTEGER NOT NULL DEFAULT 0,
  used_tokens INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  username TEXT
)
`);

// ================= TOKENS =================
await db.exec(`
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_tg_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  allowed_ip TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(owner_tg_id) REFERENCES users(tg_id)
)
`);

// ================= LINKS =================
await db.exec(`
CREATE TABLE IF NOT EXISTS links (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  issuer_tg_id INTEGER NOT NULL,
  role_grant TEXT,
  quota INTEGER NOT NULL DEFAULT 1,
  used INTEGER NOT NULL DEFAULT 0,
  payload TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL
)
`);

// ================= NONCES =================
await db.exec(`
CREATE TABLE IF NOT EXISTS nonces (
  key TEXT PRIMARY KEY,
  ts INTEGER NOT NULL
)
`);

// ================= AUDITS =================
await db.exec(`
CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER,
  action TEXT NOT NULL,
  meta TEXT,
  ts INTEGER NOT NULL
)
`);

// ================= APPROVALS =================
await db.exec(`
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester INTEGER NOT NULL,
  kind TEXT NOT NULL,
  file_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_by INTEGER,
  decided_at INTEGER
)
`);

// ================= STAFF =================
await db.exec(`
CREATE TABLE IF NOT EXISTS staffs (
  tg_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL
)
`);

await db.run(
  `INSERT OR IGNORE INTO staffs(tg_id, role) VALUES(?,?)`,
  OWNER_ID || 0,
  'OWNER'
);

// ================= CONFIG =================
await db.exec(`
CREATE TABLE IF NOT EXISTS cfg (
  key TEXT PRIMARY KEY,
  val TEXT NOT NULL
)
`);

// ================= CLAIM =================
await db.exec(`
CREATE TABLE IF NOT EXISTS claim_codes (
  code TEXT PRIMARY KEY,
  kind TEXT,
  owner INTEGER,
  uses_left INTEGER,
  expires_at INTEGER,
  created_at INTEGER,
  active INTEGER DEFAULT 1
)
`);

// ================= SUBS (🔥 PALING PENTING) =================
await db.exec(`CREATE TABLE IF NOT EXISTS subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  group_id INTEGER,
  role TEXT,
  requested_by INTEGER,
  duration_sec INTEGER,
  expire_at INTEGER,
  active INTEGER DEFAULT 1,
  created_at INTEGER
)`);

// AUTO FIX semua kolom (biar ga error lagi kedepan)
const subsCols = [
  ["user_id", "INTEGER"],
  ["username", "TEXT"],
  ["group_id", "INTEGER"],
  ["role", "TEXT"],
  ["requested_by", "INTEGER"],
  ["duration_sec", "INTEGER"],
  ["expire_at", "INTEGER"],
  ["active", "INTEGER DEFAULT 1"],
  ["created_at", "INTEGER"]
];

for (const [col, type] of subsCols) {
  try {
    await db.exec(`ALTER TABLE subs ADD COLUMN ${col} ${type}`);
  } catch {}
}

// ================= OWNER AUTO INSERT =================
// BATAS CUY

  for (const a of ADMIN_IDS) await db.run(`INSERT OR IGNORE INTO staffs(tg_id, role) VALUES(?,?)`, a, 'STAFF')
  if (ENV_GROUP_PT_ID) await db.run(`INSERT OR IGNORE INTO cfg(key,val) VALUES('group_PT',?)`, ENV_GROUP_PT_ID)
  if (ENV_GROUP_RESELLER_ID) await db.run(`INSERT OR IGNORE INTO cfg(key,val) VALUES('group_RESELLER',?)`, ENV_GROUP_RESELLER_ID)
  if (ENV_GROUP_FULLUP_ID) await db.run(`INSERT OR IGNORE INTO cfg(key,val) VALUES('group_FULLUP',?)`, ENV_GROUP_FULLUP_ID)
  await db.run(`UPDATE users SET role='NONE', max_tokens=0 WHERE role NOT IN ('PT','RESELLER','FULLUP') OR role IS NULL`)

  const vaultDir = path.join(__dirname, 'vault')
  const backupDir = path.join(__dirname, 'backups')
  fs.mkdirSync(vaultDir, { recursive: true })
  fs.mkdirSync(backupDir, { recursive: true })
  const TOKENS_FILE = path.join(vaultDir, 'tokens.json')
  const STATE_FILE = path.join(vaultDir, 'state.json')
  function readJsonSafe(f, fb) { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return fb } }
  function writeJsonAtomic(f, obj) { const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, f) }
  if (!fs.existsSync(TOKENS_FILE)) writeJsonAtomic(TOKENS_FILE, [])
  if (!fs.existsSync(STATE_FILE)) writeJsonAtomic(STATE_FILE, { lastSlots: [] })
  let tokensFileCache = new Set(readJsonSafe(TOKENS_FILE, []).map(x => x.token_hash))

  const now = () => Math.floor(Date.now() / 1000)
  const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')
  const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest('hex')
const ABC_NOUP="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randNoUp(n=16){let s="";for(let i=0;i<n;i++)s+=ABC_NOUP[Math.floor(Math.random()*ABC_NOUP.length)];return s}
function fmtNoUp(prefix,s){return `${prefix}-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}-${s.slice(12)}`}
async function createNoUpCode(owner,ttlSec=604800,uses=1){
  const raw=randNoUp(16);const code=fmtNoUp("NU",raw);const exp=ttlSec>0?(now()+ttlSec):null;
  await db.run("INSERT OR REPLACE INTO claim_codes(code,kind,owner,uses_left,expires_at,created_at,active) VALUES(?,?,?,?,?,?,1)",
    code,"ADDCLAIM",owner,Number(uses)||1,exp,now());
  return code
}

const ENV_FILE = path.join(__dirname, '.env');

function upsertEnvLine(src, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');

  if (re.test(src)) {
    return src.replace(re, line);
  }

  const trimmed = src.endsWith('\n') ? src : src + '\n';
  return trimmed + line + '\n';
}

async function updateEnvFile(key, value) {
  let envText = '';
  try {
    envText = await fs.promises.readFile(ENV_FILE, 'utf8');
  } catch {
    envText = '';
  }

  const re = new RegExp(`^${key}=.*\\n?`, 'm');

  if (value === '' || value === null || value === undefined) {
    envText = envText.replace(re, '');
  } else if (re.test(envText)) {
    envText = envText.replace(re, `${key}=${value}\n`);
  } else {
    envText = (envText.endsWith('\n') ? envText : envText + '\n') + `${key}=${value}\n`;
  }

  await fs.promises.writeFile(ENV_FILE, envText, 'utf8');
}

async function updateManyEnvFile(entries = {}) {
  let envText = '';
  try {
    envText = await fs.promises.readFile(ENV_FILE, 'utf8');
  } catch {
    envText = '';
  }

  for (const [key, value] of Object.entries(entries)) {
    envText = upsertEnvLine(envText, key, value);
  }

  await fs.promises.writeFile(ENV_FILE, envText, 'utf8');
}

async function redeemNoUp(code,uid){
  const c=String(code).toUpperCase().replace(/\s+/g,"");
  const row=await db.get("SELECT * FROM claim_codes WHERE code=? AND active=1",c);
  if(!row)return{ok:false,reason:"Kode tidak ditemukan"};
  if(row.expires_at&&row.expires_at<=now()){await db.run("UPDATE claim_codes SET active=0 WHERE code=?",c);return{ok:false,reason:"Kode kadaluarsa"}}
  if(row.uses_left<=0)return{ok:false,reason:"Kode sudah dipakai"};
  const u=await upsertUser(uid);
  const newMax=(Number(u.max_tokens)||0)+1;
  await db.run("UPDATE users SET max_tokens=?, used_tokens=? WHERE tg_id=?",newMax,Math.min(u.used_tokens,newMax),uid);
  await db.run("UPDATE claim_codes SET uses_left=uses_left-1,active=CASE WHEN uses_left-1<=0 THEN 0 ELSE 1 END WHERE code=?",c);
  return{ok:true,newMax}
}
  async function getCfg(k) { const r = await db.get(`SELECT val FROM cfg WHERE key=?`, k); return r ? r.val : '' }
  async function setCfg(k, v) { await db.run(`INSERT INTO cfg(key,val) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val`, k, v) }
  async function delCfg(k) { await db.run(`DELETE FROM cfg WHERE key=?`, k) }

  const bot = new TelegramBot(BOT_TOKEN, { polling: true })
  const me = await bot.getMe()
  const BOT_UN = me.username

  function okBox(lines) { return '⸙ 𝙕𝙊𝙍𝙊 — 𝙊𝙆\n' + lines.join('\n') }
  function errBox(lines) { return '⸙ 𝙕𝙊𝙍𝙊 — 𝙀𝙍𝙍𝙊𝙍\n' + lines.join('\n') }

  async function isMember(chatId, userId) { try { const m = await bot.getChatMember(chatId, userId); return !['left','kicked'].includes(m.status) } catch { return false } }
  function roleRank(r){ if(r==='PT')return 3; if(r==='RESELLER')return 2; if(r==='FULLUP')return 1; return 0 }

  async function resolveRole(userId) {
  const PT_ID = String((await getCfg('group_PT')) || ENV_GROUP_PT_ID || '').trim();
  const RS_ID = String((await getCfg('group_RESELLER')) || ENV_GROUP_RESELLER_ID || '').trim();
  const FU_ID = String((await getCfg('group_FULLUP')) || ENV_GROUP_FULLUP_ID || '').trim();

  // Prioritas role tertinggi dulu
  if (PT_ID && await isMember(PT_ID, userId)) return 'PT';
  if (RS_ID && await isMember(RS_ID, userId)) return 'RESELLER';
  if (FU_ID && await isMember(FU_ID, userId)) return 'FULLUP';

  return 'NONE';
}

  async function upsertUser(tgId){
  const baseRole = await resolveRole(tgId);
  const owner = await isOwner(tgId);
  const row = await db.get('SELECT * FROM users WHERE tg_id=?', tgId);

  const capByRole =
    owner ? 999999 :
    (baseRole === 'PT') ? 5 :
    (baseRole === 'RESELLER') ? 3 :
    (baseRole === 'FULLUP') ? 1 : 0;

  const prevMax = row ? Number(row.max_tokens) || 0 : 0;
  const newMax = Math.max(capByRole, prevMax);

  const finalRole = baseRole;

  if (!row) {
    await db.run(
      'INSERT INTO users(tg_id, role, max_tokens, used_tokens, created_at) VALUES(?,?,?,?,?)',
      tgId, finalRole, newMax, 0, now()
    );
  } else {
    await db.run(
      'UPDATE users SET role=?, max_tokens=? WHERE tg_id=?',
      finalRole, newMax, tgId
    );
  }

  return await db.get('SELECT * FROM users WHERE tg_id=?', tgId);
}

  async function addAudit(tgId, action, meta) { await db.run('INSERT INTO audits(tg_id, action, meta, ts) VALUES(?,?,?,?)', tgId||null, action, meta?JSON.stringify(meta):null, now()) }
  async function storeNonceOnce(key) { const old = await db.get('SELECT key FROM nonces WHERE key=?', key); if (old) return false; await db.run('INSERT INTO nonces(key, ts) VALUES(?,?)', key, now()); return true }
  async function cleanupNonces(ttlSec=300) { const cutoff = now()-ttlSec; await db.run('DELETE FROM nonces WHERE ts<?', cutoff) }
  setInterval(()=>{ cleanupNonces().catch(()=>{}) }, 60000)

  async function staffList() { return await db.all(`SELECT tg_id, role FROM staffs`) }
  async function isOwner(uid) { const r = await db.get(`SELECT role FROM staffs WHERE tg_id=?`, uid); return r?.role==='OWNER' }
  async function isStaff(uid) { const r = await db.get(`SELECT role FROM staffs WHERE tg_id=?`, uid); return r && (r.role==='OWNER' || r.role==='STAFF') }

  async function createOneUseInvite(chatId, ttlSec=172800){
    const expire_date = Math.floor(Date.now()/1000)+ttlSec
    try {
  const r = await bot.createChatInviteLink(chatId, {
    expire_date: Math.floor(Date.now() / 1000) + ttlSec, // atau pakai expire_date yang sudah kamu hitung
    member_limit: 1,
    creates_join_request: false,
    name: '1x'
  });
  return r.invite_link;
} catch {
  return '';
}
  }

  async function genClaimLink(issuerId, kind, payload={}, quota=1, ttlSec=86400, roleGrant=null){
    const code = nanoid(24)
    await db.run('INSERT INTO links(code, kind, issuer_tg_id, role_grant, quota, used, payload, expires_at, created_at) VALUES(?,?,?,?,?,?,?,?,?)', code, kind, issuerId, roleGrant, quota, 0, JSON.stringify(payload||{}), Math.floor(Date.now()/1000)+ttlSec, now())
    const deep = `https://t.me/${BOT_UN}?start=${kind.toUpperCase()}_${code}`
    const web = `${API_BASE_URL}/claim/${code}`
    return { code, deep, web }
  }

  async function consumeLink(code, claimerId){
    const row = await db.get('SELECT * FROM links WHERE code=?', code)
    if (!row) return { ok:false, reason:'Link tidak ditemukan' }
    if (row.expires_at && row.expires_at < Math.floor(Date.now()/1000)) return { ok:false, reason:'Link kadaluarsa' }
    if (row.used >= row.quota) return { ok:false, reason:'Link sudah terpakai' }
    await db.run('UPDATE links SET used=used+1 WHERE code=?', code)
    await addAudit(claimerId, 'consume_link', { code, kind: row.kind })
    return { ok:true, kind: row.kind, payload: JSON.parse(row.payload||'{}'), roleGrant: row.role_grant, issuer: row.issuer_tg_id }
  }

  function hardEq(a,b){const aa=Buffer.from(a);const bb=Buffer.from(b);if(aa.length!==bb.length)return false;return crypto.timingSafeEqual(aa,bb)}

  function appendTokenFile(owner_tg_id, token_hash, allowed_ip=null){
    const arr = readJsonSafe(TOKENS_FILE, [])
    if (!arr.find(x => x.token_hash===token_hash)) {
      arr.push({ owner_tg_id, token_hash, allowed_ip, created_at: now() })
      writeJsonAtomic(TOKENS_FILE, arr)
      tokensFileCache = new Set(arr.map(x=>x.token_hash))
    }
  }
  
  async function getTokenFile() {
  try {
    const res = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: process.env.GITHUB_PATH,
    });

    const content = Buffer.from(res.data.content, "base64").toString();
    return {
      sha: res.data.sha,
      data: JSON.parse(content)
    };
  } catch (e) {
    if (e.status === 404) {
      return { sha: null, data: { tokens: [] } };
    }
    throw e;
  }
}

async function saveTokenFile(json, sha, message) {
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    path: process.env.GITHUB_PATH,
    message,
    content: Buffer.from(JSON.stringify(json, null, 2)).toString("base64"),
    sha: sha || undefined
  });
}

async function addTokenForUser(tgId,tokenPlain,allowed_ip=null){
  const u=await upsertUser(tgId);
  const owner=await isOwner(tgId);
  const th=sha256(tokenPlain);
  const exists=await db.get("SELECT token_hash FROM tokens WHERE token_hash=?",th);
  if(exists)return{ok:false,reason:"Token sudah terdaftar"};
  if(!owner){
    if(u.role==="NONE")return{ok:false,reason:"Akses ditolak"};
    const cap=Number(u.max_tokens)||0;
    const used=(await db.get("SELECT COUNT(1) c FROM tokens WHERE owner_tg_id=?",tgId)).c;
    if(used>=cap)return{ok:false,reason:"Kuota AddToken sudah habis"};
  }
  await db.run("INSERT INTO tokens(owner_tg_id,token_hash,allowed_ip,created_at) VALUES(?,?,?,?)",tgId,th,null,now());
  appendTokenFile(tgId,th,null);
  const usedAfter=(await db.get("SELECT COUNT(1) c FROM tokens WHERE owner_tg_id=?",tgId)).c;
  await db.run("UPDATE users SET used_tokens=? WHERE tg_id=?",usedAfter,tgId);
  await addAudit(tgId,"add_token",{owner:tgId});
  return{ok:true}
}

  async function delTokenByHash(th){
    await db.run('DELETE FROM tokens WHERE token_hash=?', th)
    const arr = readJsonSafe(TOKENS_FILE, [])
    const next = arr.filter(x => x.token_hash !== th)
    writeJsonAtomic(TOKENS_FILE, next)
    tokensFileCache = new Set(next.map(x => x.token_hash))
  }

  async function tokenAllowed(tokenPlain, ip){
    const th = sha256(tokenPlain)
    const row = await db.get('SELECT allowed_ip FROM tokens WHERE token_hash=?', th)
    if (row) {
      if (row.allowed_ip && row.allowed_ip!=='ANY' && row.allowed_ip!==ip) return false
      return true
    }
    if (tokensFileCache.has(th)) {
      const arr = readJsonSafe(TOKENS_FILE, [])
      const found = arr.find(x=>x.token_hash===th)
      if (found && found.allowed_ip && found.allowed_ip!=='ANY' && found.allowed_ip!==ip) return false
      return true
    }
    return false
  }

  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet({ xPoweredBy:false, crossOriginResourcePolicy:{ policy:'cross-origin' } }))
  app.use(cors())
  app.use(rateLimit({ windowMs:60000, max:120 }))
  app.use(express.json({ limit:'512kb', verify:(req,res,buf)=>{ req.rawBody=buf } }))

  const tokenBuckets = new Map()
  function bucketAllow(key, limit=60, windowMs=60000){ const nowTs=Date.now(); const b=tokenBuckets.get(key)||{count:0,start:nowTs}; if(nowTs-b.start>windowMs){b.count=0;b.start=nowTs} b.count++; tokenBuckets.set(key,b); return b.count<=limit }

  function adminVerify(req){
    const adminKey = String(req.headers['x-admin-key'] || '')
    const ts = Number(req.headers['x-ts']||0)
    const nonce = String(req.headers['x-nonce']||'')
    const sig = String(req.headers['x-sig']||'')
    const kid = String(req.headers['x-key-id']||'')
    if (!adminKey || !ts || !nonce || !sig || !kid) return { ok:false, code:401, msg:'missing_sig' }
    const th = sha256(adminKey)
    if (adminKey !== ADMIN_API_KEY) return { ok:false, code:401, msg:'bad_admin' }
    if (kid !== th.slice(0,16)) return { ok:false, code:401, msg:'bad_kid' }
    if (Math.abs(Date.now()-ts)>90000) return { ok:false, code:401, msg:'ts_window' }
    if (!bucketAllow('adm:'+th, 120, 60000)) return { ok:false, code:429, msg:'rate' }
    const expect = hmac(`${API_SECRET}:${th}`, `${ts}.${nonce}.${req.rawBody?.toString('utf8')||''}`)
    if (!hardEq(expect, sig)) return { ok:false, code:401, msg:'bad_sig' }
    return { ok:true, th, nonceKey: sha256(`adm:${th}:${nonce}:${req.ip}`) }
  }

  app.get('/health', (req,res)=>{ res.json({ ok:true, ts:Date.now(), host:os.hostname() }) })

  app.get('/claim/:code', async (req,res)=>{
    const code = String(req.params.code||'')
    const row = await db.get('SELECT * FROM links WHERE code=?', code)
    if (!row) return res.status(404).json({ ok:false, message:'not_found' })
    const deep = `https://t.me/${BOT_UN}?start=${row.kind.toUpperCase()}_${code}`
    res.json({ ok:true, kind:row.kind, deep })
  })

  app.post('/api/token/add', async (req,res)=>{
    const v = adminVerify(req)
    if (!v.ok) return res.status(v.code).json({ ok:false, error:v.msg })
    const first = await storeNonceOnce(v.nonceKey)
    if(!first) return res.status(409).json({ ok:false, error:'replay' })
    const owner = Number(req.body?.owner_tg_id || 0)
    const token = String(req.body?.token || '')
    const ip = req.body?.allowed_ip ? String(req.body.allowed_ip) : null
    if (!owner || !token) return res.status(400).json({ ok:false, error:'bad_payload' })
    await upsertUser(owner)
    const r = await addTokenForUser(owner, token, ip)
    if (!r.ok) return res.status(409).json({ ok:false, error:r.reason })
    res.json({ ok:true, hash: sha256(token) })
  })

  app.post('/api/token/del', async (req,res)=>{
    const v = adminVerify(req)
    if (!v.ok) return res.status(v.code).json({ ok:false, error:v.msg })
    const first = await storeNonceOnce(v.nonceKey)
    if(!first) return res.status(409).json({ ok:false, error:'replay' })
    const token = String(req.body?.token || '')
    const hash = String(req.body?.hash || '')
    const th = token ? sha256(token) : hash
    if (!th) return res.status(400).json({ ok:false, error:'bad_payload' })
    await delTokenByHash(th)
    res.json({ ok:true, hash: th })
  })

  app.get('/api/token/list', async (req,res)=>{
    const v = adminVerify(req)
    if (!v.ok) return res.status(v.code).json({ ok:false, error:v.msg })
    const owner = req.query.owner ? Number(req.query.owner) : null
    const rows = owner ? await db.all('SELECT owner_tg_id, token_hash, allowed_ip, created_at FROM tokens WHERE owner_tg_id=?', owner)
                       : await db.all('SELECT owner_tg_id, token_hash, allowed_ip, created_at FROM tokens')
    res.json({ ok:true, tokens: rows })
  })

  app.post('/api/token/verify', async (req,res)=>{
    const token = String(req.body?.token || '')
    const ip = req.headers['x-real-ip'] || req.ip
    if (!token) return res.status(400).json({ ok:false, error:'bad_payload' })
    const allow = await tokenAllowed(token, ip)
    res.json({ ok:true, allow, hash: sha256(token) })
  })

  app.post('/api/backup/now', async (req,res)=>{
    const v = adminVerify(req)
    if (!v.ok) return res.status(v.code).json({ ok:false, error:v.msg })
    const first = await storeNonceOnce(v.nonceKey)
    if(!first) return res.status(409).json({ ok:false, error:'replay' })
    await writeAndSendBackup(OWNER_ID || null)
    res.json({ ok:true })
  })
 function publicVerify(req){
  const key   = String(req.headers['x-api-key'] || '')
  const tsStr = String(req.headers['x-timestamp'] || '')
  const nonce = String(req.headers['x-nonce'] || '')
  const sig   = String(req.headers['x-signature'] || '')
  const ts    = Number(tsStr)

  if (!key || !ts || !nonce || !sig) return { ok:false, code:401, msg:'missing_sig' }
  if (key !== ADMIN_API_KEY) return { ok:false, code:401, msg:'bad_key' }
  if (Math.abs(Date.now() - ts) > 90_000) return { ok:false, code:401, msg:'ts_window' }

  const th = sha256(key)
  if (!bucketAllow('pub:'+th, 180, 60_000)) return { ok:false, code:429, msg:'rate' }

  const raw = req.rawBody?.toString('utf8') ?? ''
  const bodyHash = crypto.createHash('sha256').update(raw || "{}", 'utf8').digest('hex')
  const expect = crypto.createHmac('sha256', API_SECRET).update(`${key}.${tsStr}.${nonce}.${bodyHash}`, 'utf8').digest('hex')
  if (!hardEq(expect, sig)) return { ok:false, code:401, msg:'bad_sig' }

  return { ok:true, th, nonceKey: sha256(`pub:${th}:${nonce}:${req.ip}`) }
}

app.get('/v1/bot-tokens', async (req, res) => {
  const v = publicVerify(req)
  if (!v.ok) return res.status(v.code).json({ ok:false, error:v.msg })
  const first = await storeNonceOnce(v.nonceKey)
  if (!first) return res.status(409).json({ ok:false, error:'replay' })

  const rows = await db.all('SELECT token_hash FROM tokens')
  res.json({ ok:true, tokens: rows.map(r => r.token_hash) })
})
  const server = http.createServer(app)
  server.listen(API_PORT, ()=>{})

  function tzParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute };
}
function slotNow() { const p = tzParts(); return `${p.y}-${p.m}-${p.d}-${p.hh}`; }
function isBackupTime() { const p = tzParts(); return (p.hh === "00" || p.hh === "12") && p.mm === "00"; }

async function buildBackupObject() {
  const users = await db.all("SELECT * FROM users");
  const tokens = await db.all("SELECT * FROM tokens");
  const links = await db.all("SELECT * FROM links");
  const approvals = await db.all("SELECT * FROM approvals ORDER BY id DESC LIMIT 200");
  const audits = await db.all("SELECT * FROM audits ORDER BY id DESC LIMIT 2000");
  const staffs = await db.all("SELECT * FROM staffs");
  const cfgRows = await db.all("SELECT * FROM cfg");
  const tokenFile = readJsonSafe(TOKENS_FILE, []);

  const cfg = {
    owner_id: String((await getCfg("owner_id")) || OWNER_ID || ENV_OWNER_ID || ""),
    group_PT: String((await getCfg("group_PT")) || ENV_GROUP_PT_ID || ""),
    group_RESELLER: String((await getCfg("group_RESELLER")) || ENV_GROUP_RESELLER_ID || ""),
    group_FULLUP: String((await getCfg("group_FULLUP")) || ENV_GROUP_FULLUP_ID || ""),
    group_TK: String((await getCfg("group_TK")) || ENV_GROUP_TK_ID || "")
  };

  const p = tzParts();

  return {
    version: 2,
    ts: Date.now(),
    tz: "Asia/Makassar",
    date: `${p.y}-${p.m}-${p.d} ${p.hh}:${p.mm}`,
    cfg,
    cfg_rows: cfgRows,
    staffs,
    users,
    tokens,
    tokenFile,
    links,
    approvals,
    audits
  };
}

async function writeAndSendBackup(manualChatId) {
  if (!OWNER_ID && !manualChatId) return;
  const data = await buildBackupObject();
  const raw = Buffer.from(JSON.stringify(data));
  const gz = zlib.gzipSync(raw);
  const p = tzParts();
  const name = `zoro-backup-${p.y}${p.m}${p.d}-${p.hh}${p.mm}-makassar.json.gz`;
  const filePath = path.join(backupDir, name);
  fs.writeFileSync(filePath, gz);
  const to = manualChatId || OWNER_ID;
  try { await bot.sendDocument(to, filePath, { caption: okBox([`BACKUP ${data.date}`]) }); } catch {}
}

setInterval(async () => {
  try {
    if (!isBackupTime()) return;
    const st = readJsonSafe(STATE_FILE, { lastSlots: [] });
    const s = slotNow();
    if (st.lastSlots.includes(s)) return;
    await writeAndSendBackup();
    const next = st.lastSlots.concat(s).slice(-10);
    writeJsonAtomic(STATE_FILE, { lastSlots: next });
  } catch {}
}, 25000);

await db.exec(`CREATE TABLE IF NOT EXISTS whitelists(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  username TEXT NOT NULL,
  tg_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`);
try { await db.exec(`ALTER TABLE whitelists ADD COLUMN tg_id TEXT`); } catch {}

await db.exec(`CREATE TABLE IF NOT EXISTS pendings(
  uid TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  file_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`);

function extractPhotoFileIdFrom(msg) {
  if (Array.isArray(msg.photo) && msg.photo.length) return msg.photo[msg.photo.length - 1].file_id;
  if (msg.reply_to_message && Array.isArray(msg.reply_to_message.photo) && msg.reply_to_message.photo.length) return msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
  return "";
}
function normUser(u) { return String(u || "").replace(/^@/, "").toLowerCase(); }

async function addWhitelist(chatId, username, ttlSec = 86400, tgId = 0) {
  const un = normUser(username);
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  await db.run(
    "INSERT INTO whitelists(chat_id,username,tg_id,expires_at,created_at) VALUES(?,?,?,?,?)",
    String(chatId),
    un,
    String(tgId || ""),
    exp,
    now()
  );
  return true;
}

async function popWhitelist(chatId, username, tgId = 0) {
  const un = normUser(username);
  const nowSec = Math.floor(Date.now() / 1000);
  let row = null;
  if (tgId) row = await db.get("SELECT id FROM whitelists WHERE chat_id=? AND tg_id=? AND expires_at>? ORDER BY id ASC LIMIT 1", String(chatId), String(tgId), nowSec);
  if (!row && un) row = await db.get("SELECT id FROM whitelists WHERE chat_id=? AND username=? AND expires_at>? ORDER BY id ASC LIMIT 1", String(chatId), un, nowSec);
  if (!row) return false;
  await db.run("DELETE FROM whitelists WHERE id=?", row.id);
  return true;
}

setInterval(async () => { try { await db.run("DELETE FROM whitelists WHERE expires_at<?", Math.floor(Date.now() / 1000)); } catch {} }, 60000);

async function groupHandle(chatId) {
  try { const c = await bot.getChat(chatId); return c.username ? "@" + c.username : "ID:" + chatId; } catch { return "ID:" + chatId; }
}
async function userHandle(id) {
  try {
    const c = await bot.getChat(id);
    if (c.username) return "@" + c.username;
    const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    return n || String(id);
  } catch { return String(id); }
}

// --- 1. FUNGSI REQUEST (Saat User Kirim Bukti) ---
async function requestApproval(kind, requester, file_id) {
  const id = (await db.run(
    "INSERT INTO approvals(requester,kind,file_id,status,created_at) VALUES(?,?,?,?,?)",
    requester, kind, file_id, "PENDING", now()
  )).lastID;

  let username = "-";
  try {
    const u = await bot.getChat(requester);
    if (u.username) username = u.username;
  } catch {}

  const cap = [
    "⧃ ZORO — VALIDASI",
    "",
    `⩥ Jenis : ${kindLabel(kind)}`,
    `⩥ Req   : @${username || ""} (${requester})`,
    `⩥ ID    : ${id}`,
    `⩥ User  : -`
  ].join("\n");

  const kb = {
    inline_keyboard: [
      [
        { text: "7H", callback_data: `APV_DUR:${id}:7` },
        { text: "14H", callback_data: `APV_DUR:${id}:14` },
        { text: "30H", callback_data: `APV_DUR:${id}:30` },
        { text: "90H", callback_data: `APV_DUR:${id}:90` },
        { text: "∞", callback_data: `APV_DUR:${id}:0` }
      ],
      [{ text: "✕ Tolak", callback_data: `REJECT:${id}` }]
    ]
  };

  const ownerId = (await getCfg("owner_id")) || ENV_OWNER_ID;
  const tkId = (await getCfg("group_TK")) || ENV_GROUP_TK_ID;

  if (ownerId) await bot.sendPhoto(ownerId, file_id, { caption: cap, reply_markup: kb }).catch(() => {});
  if (tkId) await bot.sendPhoto(tkId, file_id, { caption: cap, reply_markup: kb }).catch(() => {});

  return id;
}



async function requestApprovalQuota(requester, text, file_id) {
  const id = (await db.run(
    "INSERT INTO approvals(requester,kind,file_id,status,created_at) VALUES(?,?,?,?,?)",
    requester, "REQQUOTA", String(file_id || ""), "PENDING", now()
  )).lastID;

  await setCfg(`apv:${id}:note`, String(text || ""));
  const req_un = await userHandle(requester);
  const cap = [
    "⸙ 𝙕𝙊𝙍𝙊 — 𝙍𝙀𝙌 𝙆𝙐𝙊𝙏𝘼",
    `Req   : ${req_un} (${requester})`,
    `ID    : ${id}`,
    `Pesan : ${text || "-"}`
  ].join("\n");
  const kbOwner = { inline_keyboard: [[
    { text: "⎙ APPROVE", callback_data: `APV_${id}` },
    { text: "∅ REJECT",  callback_data: `REJ_${id}` }
  ]] };

  const owners = (await staffList()).filter(s => s.role === "OWNER");
  for (const s of owners) {
    try {
      if (file_id) await bot.sendPhoto(s.tg_id, file_id, { caption: cap, reply_markup: kbOwner });
      else         await bot.sendMessage(s.tg_id, cap,      { reply_markup: kbOwner });
    } catch {}
  }
  await addAudit(requester, "request_quota", { id });
  return id;
}
// Pakai untuk bikin link undangan
async function createInviteLink(chatId, {
  ttlSec = 86400,
  requestJoin = true,    // true = join by request; false = langsung masuk
  oneUse = true,         // hanya dipakai saat requestJoin=false
  name = '1x'
} = {}) {
  const expire_date = Math.floor(Date.now() / 1000) + ttlSec;
  const base = { expire_date, name };

  try {
    if (requestJoin) {
      // Mode join-request: JANGAN set member_limit
      const r = await bot.createChatInviteLink(chatId, { ...base, creates_join_request: true });
      return r.invite_link;
    } else {
      // Mode langsung masuk: boleh member_limit
      const r = await bot.createChatInviteLink(chatId, {
        ...base,
        creates_join_request: false,
        ...(oneUse ? { member_limit: 1 } : {})
      });
      return r.invite_link;
    }
  } catch (e) {
    const desc = e?.response?.body?.description || '';
    // Jika grup memaksa join-request, fallback tanpa member_limit
    if (/member limit can't be specified/i.test(desc)) {
      const r = await bot.createChatInviteLink(chatId, { ...base, creates_join_request: true });
      return r.invite_link;
    }
    throw e;
  }
}

function detectKind(t) {
  const s = String(t || "").toLowerCase();
  if (/^pt\b/.test(s)) return "UPPT"; 
  if (/reseller|rs\b/.test(s)) return "UPRESELLER";
  if (/full ?up|fullup|fu\b/.test(s)) return "UPFULLUP";
  if (/no ?up|noup|add(token)?|add\b/.test(s)) return "ADDCLAIM";
  return "";
}
function extractAt(t) { const m = String(t || "").match(/@([A-Za-z0-9_]{5,32})/); return m ? "@" + m[1] : ""; }

function kindLabel(k) { 
  if (k === "UPPT") return "PT";
  if (k === "UPRESELLER") return "Reseller"; 
  if (k === "UPFULLUP") return "FullUp"; 
  if (k === "ADDCLAIM") return "NoUp"; 
  return "-"; 
}


async function setPending(uid, kind, file_id) {
  await db.run(
    "INSERT INTO pendings(uid,kind,file_id,created_at) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET kind=excluded.kind,file_id=excluded.file_id,created_at=excluded.created_at",
    String(uid),
    kind,
    file_id,
    now()
  );
}
async function getPending(uid) { return db.get("SELECT * FROM pendings WHERE uid=?", String(uid)); }
async function delPending(uid) { await db.run("DELETE FROM pendings WHERE uid=?", String(uid)); }
await db.exec(`CREATE TABLE IF NOT EXISTS subs(id INTEGER PRIMARY KEY AUTOINCREMENT,role TEXT,group_id TEXT,uname TEXT,user_id INTEGER,requested_by INTEGER,duration_sec INTEGER,created_at INTEGER,joined_at INTEGER,expire_at INTEGER,active INTEGER DEFAULT 1)`);
function durationKeyboard(){return{inline_keyboard:[[{text:"7 Hari",callback_data:"DURSEL:604800"}],[{text:"14 Hari",callback_data:"DURSEL:1209600"}],[{text:"30 Hari",callback_data:"DURSEL:2592000"}],[{text:"90 Hari",callback_data:"DURSEL:7776000"}],[{text:"Skip",callback_data:"DURSEL:0"}]]}}
async function addSub(role, group_id, username, requested_by, duration_sec) {
  // Memasukkan data ke kolom 'username'
  await db.run(
    "INSERT INTO subs(role, group_id, username, requested_by, duration_sec, created_at, active) VALUES(?,?,?,?,?,?,1)",
    [role, String(group_id), normUser(username), Number(requested_by), Number(duration_sec), Math.floor(Date.now() / 1000)]
  );
}

async function markJoin(group_id, user_id, username) {
  // Mencari data berdasarkan kolom 'username'
  const row = await db.get(
    "SELECT id, duration_sec FROM subs WHERE group_id=? AND username=? AND active=1 ORDER BY id DESC LIMIT 1",
    [String(group_id), normUser(username || "")]
  );

  if (row) {
    const expired_at = Math.floor(Date.now() / 1000) + Number(row.duration_sec);
    await db.run(
      "UPDATE subs SET user_id=?, joined_at=?, expired_at=?, active=1 WHERE id=?",
      [Number(user_id), Math.floor(Date.now() / 1000), expired_at, row.id]
    );
    return true;
  }
  return false;
}


async function expireTick(){const ts=now();const rows=await db.all("SELECT id,group_id,user_id FROM subs WHERE active=1 AND duration_sec>0 AND user_id IS NOT NULL AND expire_at IS NOT NULL AND expire_at<=?",ts);for(const r of rows){try{await bot.banChatMember(r.group_id,Number(r.user_id));await bot.unbanChatMember(r.group_id,Number(r.user_id),{only_if_banned:true})}catch{}await db.run("UPDATE subs SET active=0 WHERE id=?",r.id)}}
setInterval(expireTick,60000)
async function savePendingDur(uid,p){await setCfg("pend:"+uid,JSON.stringify(p))}
async function loadPendingDur(uid){const s=await getCfg("pend:"+uid);return s?JSON.parse(s):null}
async function delPendingDur(uid){await delCfg("pend:"+uid)}
async function groupIdForKind(kind){if(kind==="UPRESELLER"){const x=(await getCfg("group_RESELLER"))||ENV_GROUP_RESELLER_ID;return x||null}if(kind==="UPFULLUP"){const x=(await getCfg("group_FULLUP"))||ENV_GROUP_FULLUP_ID;return x||null}return null}
async function canRequest(kind, uid) {
  if (await isOwner(uid)) return true;
  const u = await upsertUser(uid);
  if (kind === "UPRESELLER") return u.role === "PT";
  if (kind === "UPFULLUP") return u.role === "PT" || u.role === "RESELLER";
  if (kind === "ADDCLAIM") return u.role === "PT" || u.role === "RESELLER";
  return false;
}

async function promptSelectKind(chatId, uid) {
  await setPending(uid, "", extractPhotoFileIdFrom(lastPhotoByUser.get(uid) || {}));
  const kb = { 
    inline_keyboard: [
      [{ text: "PT (Partner)", callback_data: "SEL_KIND:UPPT" }],
      [{ text: "NoUp (AddToken)", callback_data: "SEL_KIND:ADDCLAIM" }], 
      [{ text: "FullUp", callback_data: "SEL_KIND:UPFULLUP" }], 
      [{ text: "Reseller", callback_data: "SEL_KIND:UPRESELLER" }]
    ] 
  };
  await bot.sendMessage(chatId, "Pilih jenis validasi:", { reply_markup: kb });
}

const lastPhotoByUser = new Map();

async function buildMenuText(uid, u) {
  const owner = await isOwner(uid);
  const staff = await isStaff(uid);

  const title = (owner || staff)
    ? "⸙ 𝙕𝙊𝙍𝙊 — 𝙆𝙄𝙉𝙂"
    : "⸙ 𝙕𝙊𝙍𝙊 — 𝙋𝘼𝙉𝙀𝙇";

  return [
    title,
    `Role  : ${owner ? "KING" : u.role}`,
    `Kuota : ${u.used_tokens}/${u.max_tokens}`,
    "",
    "Pilih tombol:"
  ].join("\n");
}
async function buildMenuKeyboard(uid) {
  const owner = await isOwner(uid);
  const staff = await isStaff(uid);
  
  // Baris 1: Status & AddToken (Semua User)
  const rows = [
    [{ text: "⸙ Status", callback_data: "CMD_MYSTATUS" }, { text: "፠ AddToken", callback_data: "CMD_ADDHELP" }]
  ];

  // Baris 2: FullUp & Reseller (Semua User bisa lihat)
  rows.push([
    { text: "⌬ FullUp", callback_data: "CMD_GETFULLUPHELP" }, 
    { text: "⇈ Reseller", callback_data: "CMD_GETRESELLERHELP" }
  ]);

  // Baris 3: Tambah PT (Hanya muncul untuk Owner)
  if (owner) {
    rows.push([{ text: "⎙ Tambah PT", callback_data: "CMD_GETPTHELP" }]);
  }
  
  // Baris 4: Backup (Hanya muncul untuk Staff atau Owner)
  if (staff || owner) {
    rows.push([{ text: "ꀆ Backup", callback_data: "CMD_BACKUP" }]);
  }

  // Baris 5: Refresh (Semua User)
  rows.push([{ text: "↻ Refresh", callback_data: "CMD_MENU" }]);

  return { inline_keyboard: rows };
}

async function sendMainMenu(chatId, uid) {
  const u = await db.get("SELECT role, used_tokens, max_tokens FROM users WHERE tg_id=?", uid);
  const kb = await buildMenuKeyboard(uid);
  const text = await buildMenuText(uid, u);

  try {
    await bot.sendPhoto(chatId, BANNER_URL, { caption: text, reply_markup: kb });
  } catch {
    await bot.sendMessage(chatId, text, { reply_markup: kb });
  }
}
function mustPrivate(msg, uid) {
  return isOwner(uid).then(ok => {
    if (ok) return true;
    if (msg.chat?.type !== "private") {
      return bot.sendMessage(msg.chat.id, "⸙ Perintah ini hanya di *private chat*.", { parse_mode: "Markdown", reply_to_message_id: msg.message_id }).then(() => false).catch(() => false);
    }
    return true;
  });
}

bot.onText(/^\/start(?:\s+(.+))?$/i, async (msg, m) => {
  const chatId = msg.chat.id;
  const uid = msg.from.id;
  await upsertUser(uid);
  const payload = (m && m[1]) ? String(m[1]).trim() : "";
  if (!payload) return sendMainMenu(chatId, uid);
  if (/^(ADDCLAIM|UPFULLUP|UPRESELLER)_/i.test(payload)) {
    const code = payload.split("_").pop();
    const res = await consumeLink(code, uid);
    if (!res.ok) return bot.sendMessage(chatId, errBox([res.reason]));
    if (res.kind === "ADDCLAIM") return bot.sendMessage(chatId, okBox(["Hak AddToken aktif. Gunakan:", "/addtoken <TOKEN>"]));
    if (res.kind === "UPFULLUP") { await bot.sendMessage(chatId, okBox(["Upgrade FULLUP berhasil. Link undangan telah dikirim di chat."])); return; }
    if (res.kind === "UPRESELLER") { await bot.sendMessage(chatId, okBox(["Upgrade RESELLER berhasil. Link undangan telah dikirim di chat."])); return; }
  }
});

bot.onText(/^\/mystatus$/i, async (msg) => {
  if (!await mustPrivate(msg, msg.from.id)) return;
  const u = await upsertUser(msg.from.id);
  const lines = ["⸙ 𝙕𝙊𝙍𝙊 — 𝙎𝙏𝘼𝙏𝙐𝙎", `Role : ${u.role}`, `Kuota AddToken : ${u.used_tokens}/${u.max_tokens}`];
  await bot.sendMessage(msg.chat.id, lines.join("\n"));
});

bot.onText(/^\/aden\s+(\S+)$/i, async (msg, m) => {
  if (!await mustPrivate(msg, msg.from.id)) return;
  const uid = msg.from.id;
  const token = String(m[1]).trim();
  const u = await upsertUser(uid);
  if (u.role === "NONE") return bot.sendMessage(msg.chat.id, errBox(["Akses ditolak."]));
  const r = await addTokenForUser(uid, token, null);
  if (!r.ok) return bot.sendMessage(msg.chat.id, errBox([r.reason]));
  await bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
  await bot.sendMessage(msg.chat.id, okBox(["Token terdaftar."]));
});

bot.onText(/^\/addtoken\s+(\S+)$/i, async (msg, m) => {
  if (!await mustPrivate(msg, msg.from.id)) return;

  const uid = msg.from.id;
  const token = String(m[1]).trim();
  const chatId = msg.chat.id;

  const u = await upsertUser(uid);
  if (u.role === "NONE") {
    return bot.sendMessage(chatId, errBox(["Akses ditolak."]));
  }

  try {
    // ===== AMBIL DATABASE GITHUB =====
    let { sha, data } = await getTokenFile();

    if (!data.tokens) data.tokens = [];

    // ===== CEK DUPLIKAT GLOBAL =====
    if (data.tokens.includes(token)) {
      return bot.sendMessage(chatId, errBox(["Token sudah ada di database global."]));
    }

    // ===== TAMBAH KE DATABASE GITHUB =====
    data.tokens.push(token);

    await saveTokenFile(data, sha, "Add token via bot");

    // ===== MASUKIN KE BASE LAMA (BIAR KEPAKE SYSTEM USED TOKEN) =====
    const r = await addTokenForUser(uid, token, null);

    if (!r.ok) {
      return bot.sendMessage(chatId, errBox([r.reason]));
    }

    // ===== HAPUS COMMAND =====
    await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

    // ===== RESPONSE USER =====
    await bot.sendMessage(chatId, okBox([
      "Token berhasil ditambahkan ke database.",
      "Siap digunakan."
    ]));

    // ===== LOG KE OWNER =====
    await bot.sendMessage(process.env.OWNER_ID,
`🆕 <b>ADD TOKEN</b>

👤 User: ${msg.from.first_name}
🆔 ID: <code>${uid}</code>

🔑 Token:
<code>${token}</code>`,
    { parse_mode: "HTML" });

  } catch (err) {
    console.error(err);

    await bot.sendMessage(chatId, errBox([
      "Gagal menambahkan token.",
      err.message
    ]));
  }
});

bot.onText(/^\/lapor\s+([\s\S]+)$/i, async (msg, m) => {
  if (!await mustPrivate(msg, msg.from.id)) return;
  const uid = msg.from.id;
  const text = String(m[1]).trim().slice(0, 1000);

  const file_id = extractPhotoFileIdFrom(
    msg.reply_to_message || lastPhotoByUser.get(uid) || {}
  );

  if (!file_id) {
    await bot.sendMessage(
      msg.chat.id,
      errBox(["Lampirkan bukti screenshot: kirim foto lalu /lapor <alasan>, atau reply perintah ini ke foto."])
    );
    return;
  }

  const id = await requestApprovalQuota(uid, text, file_id);
  await bot.sendMessage(
    msg.chat.id,
    okBox([`Laporan terkirim (#${id}) menunggu persetujuan Owner`])
  );
});

bot.onText(/^\/groups$/i, async (msg) => {
  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;

  const PT = (await getCfg("group_PT")) || ENV_GROUP_PT_ID || "-";
  const RS = (await getCfg("group_RESELLER")) || ENV_GROUP_RESELLER_ID || "-";
  const FU = (await getCfg("group_FULLUP")) || ENV_GROUP_FULLUP_ID || "-";
  const TK = (await getCfg("group_TK")) || ENV_GROUP_TK_ID || "-"; // Tambahan TK

  const lines = [
    "⸙ 𝙕𝙊𝙍𝙊 — 𝙂𝙍𝙊𝙐𝙋𝙎",
    `━━━━━━━━━━━━━━━━━━`,
    `PT       : ${PT}`,
    `RESELLER : ${RS}`,
    `FULLUP   : ${FU}`,
    `TK/STAFF : ${TK}`, // Tampilkan di list
    `━━━━━━━━━━━━━━━━━━`,
    "",
    "Tambahkan grup: /addgroup <PT|RESELLER|FULLUP|TK>",
    "Hapus grup: /delgroup <PT|RESELLER|FULLUP|TK>"
  ];
  await bot.sendMessage(msg.chat.id, lines.join("\n"));
});

bot.onText(/^\/addgroup\s+(PT|RESELLER|FULLUP|TK)$/i, async (msg, m) => {
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    return bot.sendMessage(msg.chat.id, "Command ini hanya bisa dijalankan di dalam grup.");
  }

  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;

  const role = m[1].toUpperCase();
  const targetChatId = String(msg.chat.id);

  try {
    if (role === "TK") {
      // simpan ke DB
      await setCfg("group_TK", targetChatId);
      await setCfg("group_TARGET", targetChatId);

      // simpan ke .env
      await updateManyEnvFile({
        GROUP_TK_ID: targetChatId,
        GROUP_TARGET: targetChatId
      });

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          `Group TK berhasil diikat ke ${targetChatId}`,
          `Group TARGET berhasil diikat ke ${targetChatId}`,
          `.env berhasil diperbarui`
        ])
      );
    }

    if (role === "PT") {
      // simpan ke DB
      await setCfg("group_PT", targetChatId);

      // simpan ke .env
      await updateEnvFile("GROUP_PT_ID", targetChatId);

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          `Group PT berhasil diikat ke ${targetChatId}`,
          `.env berhasil diperbarui`
        ])
      );
    }

    if (role === "RESELLER") {
      await setCfg("group_RESELLER", targetChatId);
      await updateEnvFile("GROUP_RESELLER_ID", targetChatId);

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          `Group RESELLER berhasil diikat ke ${targetChatId}`,
          `.env berhasil diperbarui`
        ])
      );
    }

    if (role === "FULLUP") {
      await setCfg("group_FULLUP", targetChatId);
      await updateEnvFile("GROUP_FULLUP_ID", targetChatId);

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          `Group FULLUP berhasil diikat ke ${targetChatId}`,
          `.env berhasil diperbarui`
        ])
      );
    }

  } catch (e) {
    return bot.sendMessage(
      msg.chat.id,
      errBox([
        `Gagal update group ${role}`,
        String(e.message || e)
      ])
    );
  }
});

bot.onText(/^\/delgroup\s+(PT|RESELLER|FULLUP|TK)$/i, async (msg, m) => {
  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;

  const role = m[1].toUpperCase();

  try {
    if (role === "TK") {
      // hapus dari DB
      await delCfg("group_TK");
      await delCfg("group_TARGET");

      // kosongkan di .env
      await updateManyEnvFile({
        GROUP_TK_ID: "",
        GROUP_TARGET: ""
      });

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          "Group TK berhasil dihapus",
          "Group TARGET berhasil dihapus",
          ".env berhasil diperbarui"
        ])
      );
    }

    if (role === "PT") {
      await delCfg("group_PT");
      await updateEnvFile("GROUP_PT_ID", "");

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          "Group PT berhasil dihapus",
          ".env berhasil diperbarui"
        ])
      );
    }

    if (role === "RESELLER") {
      await delCfg("group_RESELLER");
      await updateEnvFile("GROUP_RESELLER_ID", "");

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          "Group RESELLER berhasil dihapus",
          ".env berhasil diperbarui"
        ])
      );
    }

    if (role === "FULLUP") {
      await delCfg("group_FULLUP");
      await updateEnvFile("GROUP_FULLUP_ID", "");

      return bot.sendMessage(
        msg.chat.id,
        okBox([
          "Group FULLUP berhasil dihapus",
          ".env berhasil diperbarui"
        ])
      );
    }

  } catch (e) {
    return bot.sendMessage(
      msg.chat.id,
      errBox([
        `Gagal hapus group ${role}`,
        String(e.message || e)
      ])
    );
  }
});


bot.onText(/^\/stafflist$/i, async (msg) => {
  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;
  const list = await staffList();
  const lines = ["⸙ 𝙕𝙊𝙍𝙊 — 𝙎𝙏𝘼𝙁𝙁", ...list.map(s => `${s.role.padEnd(6)} : ${s.tg_id}`)];
  await bot.sendMessage(msg.chat.id, lines.join("\n"));
});

bot.onText(/^\/staffadd\s+(\d+)$/i, async (msg, m) => {
  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;
  const id = Number(m[1]);
  await db.run("INSERT OR IGNORE INTO staffs(tg_id,role) VALUES(?,?)", id, "STAFF");
  await bot.sendMessage(msg.chat.id, okBox([`STAFF ditambah: ${id}`]));
});

bot.onText(/^\/staffdel\s+(\d+)$/i, async (msg, m) => {
  const uid = msg.from.id;
  if (!(await isOwner(uid))) return;
  const id = Number(m[1]);
  await db.run("DELETE FROM staffs WHERE tg_id=? AND role!='OWNER'", id);
  await bot.sendMessage(msg.chat.id, okBox([`STAFF dihapus: ${id}`]));
});

bot.onText(/^\/backup$/i, async (msg) => {
  if (!await mustPrivate(msg, msg.from.id)) return;
  const uid = msg.from.id;
  if (!await isStaff(uid)) return;
  await writeAndSendBackup(msg.chat.id);
});
bot.onText(/^\/claim\s+([A-Za-z0-9-]{6,})$/i,async(msg,m)=>{
  const uid=msg.from.id;const chatId=msg.chat.id;const code=String(m[1]).trim();
  const r=await redeemNoUp(code,uid);
  if(!r.ok)return bot.sendMessage(chatId,errBox([r.reason]));
  const u=await db.get("SELECT used_tokens,max_tokens FROM users WHERE tg_id=?",uid);
  return bot.sendMessage(chatId,okBox([`Kuota AddToken bertambah 1`,`Kuota: ${u.used_tokens}/${u.max_tokens}`]))
});
function bufFromStream(s){return new Promise((r,j)=>{const c=[];s.on("data",d=>c.push(d));s.on("end",()=>r(Buffer.concat(c)));s.on("error",j)})}
async function writeJsonAtomic(file,data){const tmp=file+".tmp";await fs.promises.writeFile(tmp,JSON.stringify(data,null,2));await fs.promises.rename(tmp,file)}
async function tableColumns(name){const rows=await db.all(`PRAGMA table_info(${name})`);return rows.map(x=>x.name)}
function pick(obj, cols){const o={};for(const k of cols)o[k]=obj[k]===undefined?null:obj[k];return o}
async function insertRow(name, cols, row){const qs="("+cols.map(_=>"?").join(",")+")";const sql=`INSERT OR REPLACE INTO ${name} (${cols.join(",")}) VALUES ${qs}`;await db.run(sql, cols.map(k=>row[k]))}

if (typeof okBox==='undefined') global.okBox=a=>"⸙ 𝙕𝙊𝙍𝙊 — 𝙊𝙆\n"+a.join("\n")
if (typeof errBox==='undefined') global.errBox=a=>"⸙ 𝙕𝙊𝙍𝙊 — 𝙀𝙍𝙍𝙊𝙍\n"+a.join("\n")
if (typeof infBox==='undefined') global.infBox=a=>"⸙ 𝙕𝙊𝙍𝙊 — 𝙎𝙏𝘼𝙏𝙐𝙎\n"+a.join("\n")

bot.onText(/^\/upback(?:@[\w_]+)?$/i, async (msg) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;
  if (!(await isOwner(uid))) return;

  const src = msg.reply_to_message && msg.reply_to_message.document
    ? msg.reply_to_message.document
    : null;

  if (!src) {
    return bot.sendMessage(chatId, errBox(["Balas perintah ini ke file backup .json atau .json.gz"]));
  }

  try {
    await bot.sendMessage(chatId, infBox([`Mengambil: ${src.file_name || src.file_id}`]));

    const stream = await bot.getFileStream(src.file_id);
    const buf = await bufFromStream(stream);
    const raw =
      (src.file_name && src.file_name.endsWith(".gz")) || (buf[0] === 0x1f && buf[1] === 0x8b)
        ? zlib.gunzipSync(buf)
        : buf;

    const b = JSON.parse(raw.toString("utf8"));
    if (!b || typeof b !== "object") throw new Error("Format tidak valid");

    const users = Array.isArray(b.users) ? b.users : [];
    const tokens = Array.isArray(b.tokens) ? b.tokens : [];
    const tokenFile = b.tokenFile || null;
    const cfgRows = Array.isArray(b.cfg_rows) ? b.cfg_rows : [];
    const staffs = Array.isArray(b.staffs) ? b.staffs : [];
    const cfg = b.cfg && typeof b.cfg === "object" ? b.cfg : {};

    const tkCols = await tableColumns("tokens").catch(() => []);
    const usCols = await tableColumns("users").catch(() => []);
    const cfgCols = await tableColumns("cfg").catch(() => []);
    const staffCols = await tableColumns("staffs").catch(() => []);

    let nUsers = 0;
    let nOwners = 0;
    let nTokens = 0;
    let nCfg = 0;
    let nStaff = 0;
    let tkOwnerKey = null;

    if (tkCols.includes("owner")) tkOwnerKey = "owner";
    else if (tkCols.includes("user")) tkOwnerKey = "user";
    else if (tkCols.includes("tg_id")) tkOwnerKey = "tg_id";

    await db.run("BEGIN");

    // users
    if (users.length && usCols.length) {
      for (const u of users) {
        await insertRow("users", usCols, pick(u, usCols));
        nUsers++;
      }
    }

    // tokens
    if (tokens.length && tkCols.length) {
      if (tkOwnerKey) {
        const owners = [...new Set(tokens.map(t => t[tkOwnerKey]).filter(Boolean))];
        for (const o of owners) {
          await db.run(`DELETE FROM tokens WHERE ${tkOwnerKey}=?`, o);
          nOwners++;
        }
      } else {
        await db.run("DELETE FROM tokens");
      }

      for (const t of tokens) {
        await insertRow("tokens", tkCols, pick(t, tkCols));
        nTokens++;
      }
    }

    // cfg full rows
    if (cfgRows.length && cfgCols.length) {
      await db.run("DELETE FROM cfg");
      for (const row of cfgRows) {
        await insertRow("cfg", cfgCols, pick(row, cfgCols));
        nCfg++;
      }
    } else {
      // fallback backup lama / sederhana
      const mapCfg = {
        owner_id: cfg.owner_id || "",
        group_PT: cfg.group_PT || "",
        group_RESELLER: cfg.group_RESELLER || "",
        group_FULLUP: cfg.group_FULLUP || "",
        group_TK: cfg.group_TK || ""
      };

      for (const [k, v] of Object.entries(mapCfg)) {
        if (String(v || "") !== "") {
          await setCfg(k, String(v));
          nCfg++;
        }
      }
    }

    // staffs
    if (staffs.length && staffCols.length) {
      await db.run("DELETE FROM staffs");
      for (const s of staffs) {
        await insertRow("staffs", staffCols, pick(s, staffCols));
        nStaff++;
      }
    }

    if (tokenFile) {
      await writeJsonAtomic(TOKENS_FILE, tokenFile);
    }

    await db.run("COMMIT");

    // sinkron ke .env
    await updateManyEnvFile({
      OWNER_ID: String(cfg.owner_id || ""),
      GROUP_PT_ID: String(cfg.group_PT || ""),
      GROUP_RESELLER_ID: String(cfg.group_RESELLER || ""),
      GROUP_FULLUP_ID: String(cfg.group_FULLUP || ""),
      GROUP_TK_ID: String(cfg.group_TK || "")
    });

    const lines = [
      "UPBACK SELESAI",
      `Users di-upsert: ${nUsers}`,
      `Owner tokens diganti: ${tkOwnerKey ? nOwners : "semua"}`,
      `Tokens dimuat: ${nTokens}`,
      `Config dimuat: ${nCfg}`,
      `Staff dimuat: ${nStaff}`
    ];

    await bot.sendMessage(chatId, okBox(lines));
  } catch (e) {
    try { await db.run("ROLLBACK"); } catch {}
    await bot.sendMessage(chatId, errBox([String(e.message || e)]));
  }
});

bot.on("photo",async(msg)=>{
  if(msg.chat?.type!=="private")return
  const uid=msg.from.id
  const file_id=extractPhotoFileIdFrom(msg)
  lastPhotoByUser.set(uid,msg)
  const kind=detectKind(msg.caption||"")
  const want=kind||""
  if(!want)return promptSelectKind(msg.chat.id,uid)
  if(!(await canRequest(want,uid)))return bot.sendMessage(msg.chat.id,errBox([`Akses ditolak untuk ${kindLabel(want)}`]))
  if(want==="ADDCLAIM"){
    const id=await requestApproval("ADDCLAIM",uid,file_id)
    await bot.sendMessage(msg.chat.id,okBox([`Request NoUp dikirim (#${id})`]))
    return
  }
  const uname=extractAt(msg.caption||"")
  if(!uname){
    await setPending(uid,want,file_id)
    await bot.sendMessage(msg.chat.id,"Kirim @username target pada chat ini.")
    return
  }
  if(want==="UPFULLUP"||want==="UPRESELLER"){
    await savePendingDur(uid,{kind:want,file_id,uname})
    await bot.sendMessage(msg.chat.id,"Pilih masa aktif:",{reply_markup:durationKeyboard()})
    return
  }
})

bot.on("message", async (msg) => {
if(msg.chat?.type==="private"&&typeof msg.text==="string"){
  const uid=msg.from.id
  const pend=await getPending(uid)
  if(pend&&/@[A-Za-z0-9_]{5,32}/.test(msg.text)){
    const uname=extractAt(msg.text)
    const file_id=pend.file_id
    const kind=pend.kind
    if(!(await canRequest(kind,uid))){await delPending(uid);return bot.sendMessage(msg.chat.id,errBox([`Akses ditolak untuk ${kindLabel(kind)}`]))}
    if(kind==="UPFULLUP"||kind==="UPRESELLER"){
      await savePendingDur(uid,{kind,file_id,uname})
      await bot.sendMessage(msg.chat.id,"Pilih masa aktif:",{reply_markup:durationKeyboard()})
      return
    }
  }
}
  if (msg.chat?.type !== "private" && typeof msg.text === "string" && /^\/(addtoken|getlink|getfullup|getreseller|mystatus|backup|lapor)/i.test(msg.text)) {
    if (!(await isOwner(msg.from.id))) { try { await bot.sendMessage(msg.chat.id, "Perintah ini hanya di private chat.", { reply_to_message_id: msg.message_id }); } catch {} }
  }
});

bot.on("callback_query", async q => {
  if (!q.message) return;

  const uid = q.from.id;
  const data = String(q.data || "");
  const chatId = q.message.chat.id;

  const isApproveAction =
    data.startsWith("APV_DUR:") ||
    data.startsWith("REJECT:");

  if (!isApproveAction && q.message.chat?.type !== "private") {
    try {
      await bot.answerCallbackQuery(q.id, { text: "Gunakan di private chat" });
    } catch {}
    return;
  }

  // ===== DURASI SELECT =====
  if (data.startsWith("DURSEL:")) {
    const secs = Number(data.split(":")[1] || "0") | 0;
    const pend = await loadPendingDur(uid);

    if (!pend) return bot.answerCallbackQuery(q.id, { text: "Tidak ada data" });

    const { kind, file_id, uname } = pend;
    const id = await requestApproval(kind, uid, file_id);

    await setCfg(`apv:${id}:username`, uname);
    await setCfg(`apv:${id}:durasi`, String(secs));
    await setCfg(`apv:${id}:kind`, kind);

    await delPending(uid);
    await delPendingDur(uid);

    await bot.sendMessage(chatId, okBox([`Request ${kindLabel(kind)} dikirim (#${id}) untuk ${uname}`]));
    return bot.answerCallbackQuery(q.id, { text: "OK" });
  }

  // ===== APPROVE DENGAN DURASI =====
// ✅ APPROVE + KIRIM LINK
if (data.startsWith("APV_DUR:")) {
  if (!(await isOwner(uid))) {
    return bot.answerCallbackQuery(q.id, { text: "Owner saja" });
  }

  const [_, id, days] = data.split(":");
  const dur = Number(days) * 86400;

  await setCfg(`apv:${id}:durasi`, String(dur));

  const r = await finalizeApproval(uid, Number(id), true);

  if (r.ok) {
    const uname = (await getCfg(`apv:${id}:username`)) || "-";
    const kind = (await getCfg(`apv:${id}:kind`)) || "-";

    const PT = Number(process.env.GROUP_PT_ID);
    const RS = Number(process.env.GROUP_RESELLER_ID);
    const FU = Number(process.env.GROUP_FULLUP_ID);

    let msg = "";
    let link = null;

    // 🔥 LOGIKA PER ROLE
    if (kind === "PT") {
      link = await createInviteLink(PT, {
        ttlSec: dur,
        requestJoin: true,
        oneUse: true,
        name: `PT-${uname}`
      });

      msg = `⧃ UPPT DISETUJUI untuk ${uname}
Ⰶ Grup : PT - GB PT/TK ZORO
⩥ Link : ${link}
⩥ Masa : ${days} hari
⧯ Disetujui oleh: @${q.from.username || "OWNER"}`;
    }

    if (kind === "RESELLER") {
      link = await createInviteLink(RS, {
        ttlSec: dur,
        requestJoin: true,
        oneUse: true,
        name: `RS-${uname}`
      });

      msg = `⧃ RESELLER DISETUJUI untuk ${uname}
Ⰶ Grup : RESELLER - KAUM BAWANG
⩥ Link : ${link}
⩥ Masa : ${days} hari
⧯ Disetujui oleh: @${q.from.username || "OWNER"}`;
    }

    if (kind === "FULLUP") {
      link = await createInviteLink(FU, {
        ttlSec: dur,
        requestJoin: true, // 🔥 FULLUP pake request join
        oneUse: true,
        name: `FU-${uname}`
      });

      msg = `⧃ FULLUP DISETUJUI untuk ${uname}
Ⰶ Grup : FULLUP - FULL UP BUYER ZORO
⩥ Link : ${link}
⩥ Masa : ${days} hari
⧯ Disetujui oleh: @${q.from.username || "OWNER"}`;
    }

    let sendTo = null;

// kalau approve dari group → kirim ke group itu
if (q.message.chat.type !== "private") {
  sendTo = q.message.chat.id;
} else {
  // kalau approve dari pv → kirim ke requester
  sendTo = r.requester;
}

if (sendTo && link) {
  try {
    await bot.sendMessage(sendTo, msg);
  } catch (e) {
    console.log("Gagal kirim:", e.message);
  }
}

    await bot.answerCallbackQuery(q.id, { text: `APPROVED #${id}` });
  }

  return;
}
  // ===== REJECT =====
  if (data.startsWith("REJECT:")) {
    if (!(await isOwner(uid))) {
      return bot.answerCallbackQuery(q.id, { text: "Owner saja" });
    }

    const id = Number(data.split(":")[1]);
    const r = await finalizeApproval(uid, id, false);

    if (r.ok) {
      return bot.answerCallbackQuery(q.id, { text: `REJECTED #${id}` });
    }
  }

  // ===== SELECT ROLE =====
  if (data.startsWith("SEL_KIND:")) {
    const kind = data.split(":")[1];
    const pend = await getPending(uid);

    if (!pend) return bot.answerCallbackQuery(q.id, { text: "Kirim foto dulu" });
    if (!(await canRequest(kind, uid))) return bot.answerCallbackQuery(q.id, { text: "Akses ditolak" });

    await setPending(uid, kind, pend.file_id);

    if (kind === "ADDCLAIM") {
      const idClaim = await requestApproval("ADDCLAIM", uid, pend.file_id);
      await delPending(uid);
      await bot.sendMessage(chatId, okBox([`Request NoUp dikirim (#${idClaim})`]));
    } else {
      await bot.sendMessage(chatId, `Kirim @username target untuk ${kindLabel(kind)}.`);
    }

    return bot.answerCallbackQuery(q.id);
  }

  // ===== MENU =====
if (data === "CMD_MENU") {
    await sendMainMenu(chatId, uid);
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_MYSTATUS") {
    const u = await upsertUser(uid);
    await bot.sendMessage(chatId, `⸙ STATUS\nRole: ${u.role}\nKuota: ${u.used_tokens}/${u.max_tokens}`);
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_ADDHELP") {
    await bot.sendMessage(chatId, okBox([
      "ADD TOKEN",
      "Gunakan perintah:",
      "/addtoken <TOKEN>"
    ]));
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_GETFULLUPHELP") {
    await bot.sendMessage(chatId, okBox([
      "FULLUP",
      "Kirim foto bukti di private chat.",
      "Caption contoh:",
      "fullup @username"
    ]));
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_GETRESELLERHELP") {
    await bot.sendMessage(chatId, okBox([
      "RESELLER",
      "Kirim foto bukti di private chat.",
      "Caption contoh:",
      "reseller @username"
    ]));
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_GETPTHELP") {
    if (!(await isOwner(uid))) {
      return bot.answerCallbackQuery(q.id, { text: "Owner saja" });
    }

    await bot.sendMessage(chatId, okBox([
      "PT",
      "Kirim foto bukti di private chat.",
      "Caption contoh:",
      "pt @username"
    ]));
    return bot.answerCallbackQuery(q.id);
  }

  if (data === "CMD_BACKUP") {
    if (!(await isStaff(uid))) {
      return bot.answerCallbackQuery(q.id, { text: "Tidak diizinkan" });
    }

    await writeAndSendBackup(chatId);
    return bot.answerCallbackQuery(q.id);
  }

  await bot.answerCallbackQuery(q.id);
});

async function requestApproval(kind, requester, file_id) {
  const id = (await db.run(
    "INSERT INTO approvals(requester,kind,file_id,status,created_at) VALUES(?,?,?,?,?)",
    requester, kind, file_id, "PENDING", now()
  )).lastID;

  const user = { username: requester };
  const un = user ? user.username : requester;

  const cap = [
    "⧃ ZORO — VALIDASI",
    "",
    `⩥ Jenis : ${kindLabel(kind)}`,
    `⩥ Req   : @${un} (${requester})`,
    `⩥ ID    : ${id}`,
    `⩥ User  : ${un}`
  ].join("\n");

  const kb = {
    inline_keyboard: [
      [{ text: "7H", callback_data: `APV_DUR:${id}:7` }, { text: "14H", callback_data: `APV_DUR:${id}:14` }, { text: "30H", callback_data: `APV_DUR:${id}:30` }, { text: "90H", callback_data: `APV_DUR:${id}:90` }, { text: "∞", callback_data: `APV_DUR:${id}:0` }],
      [{ text: "✕ Tolak", callback_data: `REJECT:${id}` }]
    ]
  };

  const ownerId = (await getCfg("owner_id")) || ENV_OWNER_ID;
  const tkId = (await getCfg("group_TK")) || ENV_GROUP_TK_ID;

  if (ownerId) await bot.sendPhoto(ownerId, file_id, { caption: cap, reply_markup: kb }).catch(() => {});
  if (tkId) await bot.sendPhoto(tkId, file_id, { caption: cap, reply_markup: kb }).catch(() => {});

  await addAudit(requester, "request_approval", { kind, id });
  return id;
}

async function requestApprovalQuota(requester, text) {
  const id = (await db.run(
    "INSERT INTO approvals(requester,kind,file_id,status,created_at) VALUES(?,?,?,?,?)",
    requester, "REQQUOTA", String(text || ""), "PENDING", now()
  )).lastID;
  const req_un = await userHandle(requester);
  const staffs = await staffList();
  const cap = [
    "⸙ 𝙕𝙊𝙍𝙊 — 𝙍𝙀𝙌 𝙆𝙐𝙊𝙏𝘼",
    `Req   : ${req_un} (${requester})`,
    `ID    : ${id}`,
    `Pesan : ${text}`
  ].join("\n");
  const kbOwner = { inline_keyboard: [[{ text: "⎙ APPROVE", callback_data: `APV_${id}` }, { text: "∅ REJECT", callback_data: `REJ_${id}` }]] };
  for (const s of staffs) { if (s.role === "OWNER") { try { await bot.sendMessage(s.tg_id, cap, { reply_markup: kbOwner }); } catch {} } }
  await addAudit(requester, "request_quota", { id });
  return id;
}

async function createInviteLink(chatId, { ttlSec = 86400, requestJoin = true, oneUse = true, name = "1x" } = {}) {
  const expire_date = Math.floor(Date.now() / 1000) + ttlSec;
  const base = { expire_date, name };
  if (requestJoin) {
    const r = await bot.createChatInviteLink(chatId, { ...base, creates_join_request: true });
    return r.invite_link;
  } else {
    const r = await bot.createChatInviteLink(chatId, { ...base, creates_join_request: false, ...(oneUse ? { member_limit: 1 } : {}) });
    return r.invite_link;
  }
}
await db.exec(`CREATE TABLE IF NOT EXISTS invite_links(
  invite_link TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  username TEXT NOT NULL,
  tg_id TEXT,
  expire_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`)

async function saveInvite(chatId, link, username, tgId, ttlSec){
  const exp = Math.floor(Date.now()/1000)+ttlSec
  await db.run(
    "INSERT OR REPLACE INTO invite_links(invite_link,chat_id,username,tg_id,expire_at,created_at) VALUES(?,?,?,?,?,?)",
    String(link), String(chatId), normUser(username), String(tgId||''), exp, now()
  )
}

async function revokeInviteByLink(chatId, link){
  try{ await bot.revokeChatInviteLink(chatId, link) }catch{}
  await db.run("DELETE FROM invite_links WHERE invite_link=?", String(link))
}

async function revokeInvitesByUsername(chatId, username){
  const rows = await db.all("SELECT invite_link FROM invite_links WHERE chat_id=? AND username=?", String(chatId), normUser(username))
  for(const r of rows){ await revokeInviteByLink(chatId, r.invite_link) }
}

setInterval(async()=>{ try{ await db.run("DELETE FROM invite_links WHERE expire_at<?", Math.floor(Date.now()/1000)) }catch{} }, 600000)
async function finalizeApproval(deciderId, id, approve) {
  const row = await db.get("SELECT * FROM approvals WHERE id=?", id);
  if (!row || row.status !== "PENDING") return { ok: false, reason: "Sudah diproses atau tidak ada" };

  const decider_un = await userHandle(deciderId);
  await db.run(
    "UPDATE approvals SET status=?, decided_by=?, decided_at=? WHERE id=?",
    approve ? "APPROVED" : "REJECTED",
    deciderId,
    now(),
    id
  );

  let target_un = "User";

  if (approve) {
    const target = await getCfg(`apv:${id}:username`);
    const dur = Number(await getCfg(`apv:${id}:durasi`) || "0");
    const un = normUser(target || "");
    target_un = un ? "@" + un : "User";

    if (row.kind !== "REQQUOTA") {
      let roleToSet = "NONE";
      let maxTokens = 0;

      if (row.kind === "UPPT") { roleToSet = "PT"; maxTokens = 5; }
      else if (row.kind === "UPRESELLER") { roleToSet = "RESELLER"; maxTokens = 3; }
      else if (row.kind === "UPFULLUP") { roleToSet = "FULLUP"; maxTokens = 1; }

      await db.run(
        "UPDATE users SET role=?, max_tokens=? WHERE tg_id=?",
        roleToSet,
        maxTokens,
        row.requester
      );

      const ptId = (await getCfg("group_PT")) || ENV_GROUP_PT_ID;
      const rsId = (await getCfg("group_RESELLER")) || ENV_GROUP_RESELLER_ID;
      const fuId = (await getCfg("group_FULLUP")) || ENV_GROUP_FULLUP_ID;

      let msg = [`⧃ UP${roleToSet} DISETUJUI untuk ${target_un}`, ""];

      // ====== LOGIKA LINK SESUAI ROLE ======
      async function pushGroup(label, gid, cfgKey) {
        if (!gid) return;

        const inv = await createInviteLink(gid, {
          requestJoin: true,
          name: `ACC-${id}`
        });

        await setCfg(cfgKey, inv);

        await addSub(roleToSet, gid, un, row.requester, dur);

        msg.push(
          `Ⰶ Grup : ${label}`,
          `⩥ Link : ${inv}`,
          `⩥ Masa : ${Math.floor(dur / 86400)} hari`,
          ""
        );
      }

      if (roleToSet === "PT") {
  await pushGroup("PT - GB PT/TK ZORO", ptId, "last_invite_pt");
  await pushGroup("RESELLER - KAUM BAWANG", rsId, "last_invite_reseller");
  await pushGroup("FULLUP - FULL UP BUYER ZORO", fuId, "last_invite_fullup");
} 
else if (roleToSet === "RESELLER") {
  await pushGroup("RESELLER - KAUM BAWANG", rsId, "last_invite_reseller");
  await pushGroup("FULLUP - FULL UP BUYER OTAX", fuId, "last_invite_fullup");
} 
else if (roleToSet === "FULLUP") {
  await pushGroup("FULLUP - FULL UP BUYER OTAX", fuId, "last_invite_fullup");
}

      msg.push(`⧯ Disetujui oleh: ${decider_un}`);

      await bot.sendMessage(row.requester, msg.join("\n"));
    } else {
      // REQQUOTA
      const u = await upsertUser(row.requester);
      const newMax = (Number(u.max_tokens) || 0) + 1;

      await db.run(
        "UPDATE users SET max_tokens=?, used_tokens=? WHERE tg_id=?",
        newMax,
        Math.min(u.used_tokens, newMax),
        row.requester
      );

      const updated = await db.get(
        "SELECT role,used_tokens,max_tokens FROM users WHERE tg_id=?",
        row.requester
      );

      await bot.sendMessage(
        row.requester,
        okBox([
          `Kuota AddToken ditambah 1 oleh ${decider_un}`,
          `Kuota: ${updated.used_tokens}/${updated.max_tokens}`
        ])
      );
    }
  } else {
    try {
      await bot.sendMessage(
        row.requester,
        errBox([`Request ${id} ditolak`, `Oleh: ${decider_un}`])
      );
    } catch {}
  }

  await delCfg(`apv:${id}:username`);
  await delCfg(`apv:${id}:durasi`);

  await addAudit(deciderId, approve ? "approve" : "reject", {
    id,
    kind: row.kind,
    requester: row.requester,
    username: target_un
  });

  return {
    ok: true,
    id,
    kind: row.kind,
    target: target_un,
    requester: row.requester,
    decider: deciderId,
    decider_un
  };
}


// --- 2. HANDLER TOMBOL (ACC & REJECT) ---
bot.on("message", async (msg) => {
  const uid = msg.from.id;
  const chatId = msg.chat.id;

  if (msg.chat?.type === "private" && typeof msg.text === "string") {
    const pend = await getPending(uid);
    
    // Validasi format username @example
    if (pend && pend.kind && /@[A-Za-z0-9_]{5,32}/.test(msg.text)) {
      const uname = extractAt(msg.text);
      
      if (!(await canRequest(pend.kind, uid))) {
        await delPending(uid);
        return bot.sendMessage(chatId, "❌ Akses Ditolak.");
      }

      // Pindahkan ke sesi durasi
      await savePendingDur(uid, { kind: pend.kind, uname: uname, file_id: pend.file_id });
      await delPending(uid);

      return bot.sendMessage(chatId, `✅ Target: ${uname}\n\nSilahkan pilih masa aktif:`, { 
        reply_markup: durationKeyboard() 
      });
    }
  }
});

// --- 1. HANDLER PESAN (Menerima Input Username) ---
  // --- HANDLER CALLBACK QUERY (FIXED & CLEANED) ---
 

  // --- HANDLER JOIN REQUEST ---
  // AUTO APPROVE JOIN REQUEST + DELETE LINK
bot.on("chat_join_request", async (ctx) => {
  try {
    await bot.approveChatJoinRequest(ctx.chat.id, ctx.from.id);

    // hapus semua invite link lama dari cfg
    const keys = ["last_invite_pt", "last_invite_reseller", "last_invite_fullup"];
    for (const k of keys) {
      const link = await getCfg(k);
      if (link) {
        try {
          await bot.revokeChatInviteLink(ctx.chat.id, link);
        } catch {}
        await delCfg(k);
      }
    }
  } catch (e) {
    console.log("Join request error:", e.message);
  }
});

  bot.on("my_chat_member", async (u) => { 
    const uid = u.from?.id; 
    if (uid) await upsertUser(uid).catch(() => {}); 
  });

  console.log(`🚀 Bot @${BOT_UN} is running...`);

})().catch(e=>{ console.error(e); process.exit(1) })