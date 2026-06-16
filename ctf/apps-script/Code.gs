/* =========================================================
   Gayu CTF Labs — Backend (Google Apps Script)
   ---------------------------------------------------------
   Database  : Google Sheets (3 tab: Challenges, Players, Solves)
   Endpoint  : Web App (doPost) -> dipanggil dari frontend GitHub Pages
   Fitur     : register, login, submit flag (DICEK DI SERVER),
               scoreboard global, sinkron solve per pemain.

   >> Cara deploy ada di ctf/SETUP-SPREADSHEET.md <<
   ========================================================= */

/* --- Konfigurasi ringan --- */
const CFG = {
  trimFlag: true,            // hapus spasi depan/belakang sebelum cek
  caseInsensitiveFlag: false // true = flag tidak peka huruf besar/kecil
};

/* Nama tab di spreadsheet */
const TAB = { CH: "Challenges", PL: "Players", SO: "Solves" };

/* ---------- Router ---------- */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");
    const map = {
      challenges: actChallenges,
      register: actRegister,
      login: actLogin,
      submit: actSubmit,
      scoreboard: actScoreboard,
      me: actMe
    };
    if (!map[action]) return out({ ok: false, error: "Aksi tidak dikenal." });
    return out(map[action](body));
  } catch (err) {
    return out({ ok: false, error: "Server error: " + err.message });
  }
}

/* Health-check via browser (GET) */
function doGet() {
  return out({ ok: true, service: "Gayu CTF Labs API", ts: new Date().toISOString() });
}

/* ---------- Helpers ---------- */
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name) {
  const s = ss().getSheetByName(name);
  if (!s) throw new Error("Tab '" + name + "' tidak ditemukan di spreadsheet.");
  return s;
}
function rows(name) {
  const sh = sheet(name);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const head = data[0].map((h) => String(h).trim());
  return data.slice(1).map((r) => {
    const o = {};
    head.forEach((h, i) => (o[h] = r[i]));
    return o;
  });
}
function sha256(text) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return raw.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("");
}
function token() { return Utilities.getUuid().replace(/-/g, ""); }
function normFlag(f) {
  let s = String(f == null ? "" : f);
  if (CFG.trimFlag) s = s.trim();
  if (CFG.caseInsensitiveFlag) s = s.toLowerCase();
  return s;
}
function cleanName(n) { return String(n || "").trim().replace(/\s+/g, " "); }

/* Buang field flag dari challenge sebelum dikirim ke client */
function publicChallenge(c) {
  let files = [];
  try { files = c.files ? JSON.parse(c.files) : []; } catch (_) { files = []; }
  return {
    id: String(c.id),
    title: String(c.title || ""),
    category: String(c.category || "Misc"),
    difficulty: String(c.difficulty || "Easy"),
    points: Number(c.points) || 0,
    description: String(c.description || ""),
    hint: String(c.hint || ""),
    files: files,
    link: String(c.link || ""),
    author: String(c.author || "Gayu")
  };
}

/* ---------- Actions ---------- */
function actChallenges() {
  const list = rows(TAB.CH)
    .filter((c) => c.id && String(c.released).toLowerCase() !== "false")
    .map(publicChallenge);
  return { ok: true, challenges: list };
}

function actRegister(b) {
  const name = cleanName(b.name);
  const pass = String(b.password || "");
  if (name.length < 2) return { ok: false, error: "Nama tim minimal 2 karakter." };
  if (pass.length < 4) return { ok: false, error: "Password minimal 4 karakter." };

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const players = rows(TAB.PL);
    if (players.some((p) => cleanName(p.name).toLowerCase() === name.toLowerCase()))
      return { ok: false, error: "Nama tim sudah dipakai. Pilih nama lain atau login." };
    const tok = token();
    sheet(TAB.PL).appendRow([name, sha256(pass), tok, new Date().toISOString()]);
    return { ok: true, name: name, token: tok, solves: [], score: 0 };
  } finally {
    lock.releaseLock();
  }
}

function actLogin(b) {
  const name = cleanName(b.name);
  const pass = String(b.password || "");
  const player = rows(TAB.PL).find((p) => cleanName(p.name).toLowerCase() === name.toLowerCase());
  if (!player) return { ok: false, error: "Tim tidak ditemukan. Daftar dulu." };
  if (String(player.passhash) !== sha256(pass)) return { ok: false, error: "Password salah." };
  const mine = mySolves(player.name);
  return { ok: true, name: String(player.name), token: String(player.token), solves: mine.ids, score: mine.score };
}

function actSubmit(b) {
  const name = cleanName(b.name);
  const tok = String(b.token || "");
  const chId = String(b.challengeId || "");
  const player = rows(TAB.PL).find((p) => cleanName(p.name).toLowerCase() === name.toLowerCase());
  if (!player || String(player.token) !== tok)
    return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };

  const ch = rows(TAB.CH).find((c) => String(c.id) === chId);
  if (!ch) return { ok: false, error: "Soal tidak ditemukan." };

  const correct = normFlag(b.flag) === normFlag(ch.flag);
  if (!correct) return { ok: true, correct: false };

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const already = rows(TAB.SO).some(
      (s) => cleanName(s.player).toLowerCase() === name.toLowerCase() && String(s.challengeId) === chId
    );
    const points = Number(ch.points) || 0;
    if (!already) {
      sheet(TAB.SO).appendRow([String(player.name), chId, points, new Date().toISOString()]);
    }
    const mine = mySolves(player.name);
    return { ok: true, correct: true, points: points, already: already, score: mine.score, solves: mine.ids };
  } finally {
    lock.releaseLock();
  }
}

function actScoreboard() {
  const agg = {};
  rows(TAB.SO).forEach((s) => {
    const n = String(s.player);
    if (!agg[n]) agg[n] = { name: n, score: 0, solved: 0, last: "" };
    agg[n].score += Number(s.points) || 0;
    agg[n].solved += 1;
    const t = String(s.timestamp || "");
    if (t > agg[n].last) agg[n].last = t;
  });
  const board = Object.values(agg).sort(
    (a, b) => b.score - a.score || (a.last < b.last ? -1 : 1) // skor desc, lebih cepat menang
  );
  return { ok: true, scoreboard: board };
}

function actMe(b) {
  const name = cleanName(b.name);
  const tok = String(b.token || "");
  const player = rows(TAB.PL).find((p) => cleanName(p.name).toLowerCase() === name.toLowerCase());
  if (!player || String(player.token) !== tok) return { ok: false, error: "Sesi tidak valid." };
  const mine = mySolves(player.name);
  return { ok: true, name: String(player.name), solves: mine.ids, score: mine.score };
}

/* ---------- util skor pemain ---------- */
function mySolves(playerName) {
  const ids = [];
  let score = 0;
  rows(TAB.SO).forEach((s) => {
    if (cleanName(s.player).toLowerCase() === cleanName(playerName).toLowerCase()) {
      ids.push(String(s.challengeId));
      score += Number(s.points) || 0;
    }
  });
  return { ids: ids, score: score };
}

/* ---------- (opsional) bikin tab + contoh soal sekali klik ----------
   Jalankan manual dari editor Apps Script: pilih fungsi `setupSheets` -> Run.
   Aman dijalankan ulang (tidak menimpa kalau tab sudah ada). */
function setupSheets() {
  const book = ss();
  function ensure(name, header) {
    let sh = book.getSheetByName(name);
    if (!sh) { sh = book.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
    return sh;
  }
  const ch = ensure(TAB.CH, ["id","title","category","difficulty","points","description","hint","files","link","author","released","flag"]);
  ensure(TAB.PL, ["name","passhash","token","created"]);
  ensure(TAB.SO, ["player","challengeId","points","timestamp"]);

  if (ch.getLastRow() < 2) {
    const sample = [
      ["misc-welcome","Selamat Datang","Misc","Easy",25,"Pemanasan! Flag-nya ada di petunjuk ini: GGCTF{w3lc0m3_t0_gayu_ctf}","Salin saja flag di deskripsi.","[]","","Gayu",true,"GGCTF{w3lc0m3_t0_gayu_ctf}"],
      ["web-robots","Robots Rahasia","Web","Easy",50,"File apa yang diintip mesin pencari sebelum merayapi situs? Cari path tersembunyi di sana.","Cek /robots.txt dan /sitemap.xml","[]","","Gayu",true,"GGCTF{r0b0ts_dan_s1t3map}"],
      ["crypto-base64","Bukan Enkripsi","Crypto","Easy",50,"Decode: R0dDVEZ7YmFzZTY0X2J1a2FuX2Vua3JpcHNpfQ==","Akhiran == ciri Base64.","[]","","Gayu",true,"GGCTF{base64_bukan_enkripsi}"],
      ["crypto-rot13","Salad Caesar","Crypto","Easy",75,"Geser 13: TTPGS{p4rfne_f4ynq_ebg13}","ROT13.","[]","","Gayu",true,"GGCTF{c4esar_s4lad_rot13}"],
      ["web-cookie","Cookie Monster","Web","Medium",100,"Jalankan di Console: atob('R0dDVEZ7YzAwazEzX20wbnN0M3JfbnVtX251bX0=')","Buka Console (F12).","[]","","Gayu",true,"GGCTF{c00k13_m0nst3r_num_num}"],
      ["web-inspect","Inspect Element","Web","Medium",100,"Flag disembunyikan di komentar HTML halaman /ctf. Cari 'CTF-HINT'.","View Source -> cari CTF-HINT.","[]","","Gayu",true,"GGCTF{1nsp3ct_3l3m3nt_ftw}"]
    ];
    ch.getRange(2, 1, sample.length, sample[0].length).setValues(sample);
  }
}
