/* =========================================================
   ctf.js — Gayu CTF Labs (mode API / Google Sheets backend)
   ---------------------------------------------------------
   - Soal & skor dari Google Apps Script (lihat ctf-config.js)
   - Flag DICEK DI SERVER (flag asli tidak pernah ke browser)
   - Akun: nama tim + password (login dari perangkat mana pun)
   ========================================================= */

const CFG = window.CTF || {};
const SESS_KEY = "ctf_session_v2";

let CHALLENGES = [];
let SOLVED = new Set();      // id soal yang sudah dipecahkan tim ini
let SCORE = 0;               // skor dari server
let SCOREBOARD = [];         // cache papan skor
let activeCategory = "Semua";
let openChallengeId = null;
let busy = false;

/* ---------- Session ---------- */
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESS_KEY)) || null; } catch { return null; }
}
function setSession(s) { localStorage.setItem(SESS_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(SESS_KEY); }

/* ---------- API ---------- */
async function api(action, payload = {}) {
  if (!CFG.API_URL) throw new Error("NO_API");
  const res = await fetch(CFG.API_URL, {
    method: "POST",
    body: JSON.stringify({ action, ...payload }), // text/plain -> tanpa preflight CORS
    redirect: "follow",
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data;
}

/* ---------- Tiny Markdown renderer ---------- */
function renderMarkdown(md = "") {
  const codeBlocks = [];
  let s = md.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.replace(/^\n/, "").replace(/\n$/, ""));
    return ` CB${codeBlocks.length - 1} `;
  });
  s = escapeHTML(s);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(?:^|\n)((?:- .*(?:\n|$))+)/g, (m, block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `\n<ul>${items}</ul>`;
  });
  s = s.split(/\n{2,}/).map((p) => {
    if (/^\s*<(ul|pre|h\d)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  s = s.replace(/ CB(\d+) /g, (_, i) => `<pre><code>${escapeHTML(codeBlocks[+i])}</code></pre>`);
  return s;
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, type = "info") {
  const el = document.getElementById("ctf-toast");
  el.className = `ctf-toast ctf-toast--${type}`;
  el.innerHTML = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3400);
}

/* ---------- Difficulty color ---------- */
function diffClass(d = "") {
  const k = d.toLowerCase();
  if (k.startsWith("easy") || k.startsWith("mud")) return "diff-easy";
  if (k.startsWith("hard") || k.startsWith("sul") || k.startsWith("ins")) return "diff-hard";
  return "diff-medium";
}
function isSolved(id) { return SOLVED.has(String(id)); }

/* ---------- Filters ---------- */
function renderFilters() {
  const cats = ["Semua", ...new Set(CHALLENGES.map((c) => c.category))];
  const bar = document.getElementById("ctf-filters");
  bar.innerHTML = cats.map((c) =>
    `<button class="filter-btn ${c === activeCategory ? "active" : ""}" data-cat="${escapeHTML(c)}">${escapeHTML(c)}</button>`
  ).join("");
  bar.querySelectorAll(".filter-btn").forEach((b) =>
    b.addEventListener("click", () => { activeCategory = b.dataset.cat; renderFilters(); renderGrid(); }));
}

/* ---------- Grid (grouped per kategori) ---------- */
function cardHTML(c) {
  const solved = isSolved(c.id);
  return `
    <button class="ctf-card ${solved ? "is-solved" : ""}" data-id="${escapeHTML(c.id)}">
      <div class="ctf-card-top">
        <span class="ctf-cat-badge">${escapeHTML(c.category)}</span>
        ${solved ? '<span class="ctf-check"><i class="fa-solid fa-circle-check"></i></span>' : ""}
      </div>
      <h3>${escapeHTML(c.title)}</h3>
      <div class="ctf-card-foot">
        <span class="ctf-diff ${diffClass(c.difficulty)}">${escapeHTML(c.difficulty)}</span>
        <span class="ctf-pts">${c.points}</span>
      </div>
    </button>`;
}
function renderGrid() {
  const grid = document.getElementById("ctf-grid");
  const list = CHALLENGES.filter((c) => activeCategory === "Semua" ? true : c.category === activeCategory);
  grid.className = "";
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">Belum ada soal di kategori ini.</div>`;
    return;
  }
  const cats = [...new Set(list.map((c) => c.category))];
  grid.innerHTML = cats.map((cat) => {
    const items = list.filter((c) => c.category === cat).sort((a, b) => a.points - b.points);
    return `
      <section class="ctf-cat-section">
        <div class="ctf-cat-head">
          <h3><span class="dot"></span>${escapeHTML(cat)} <span class="count">${items.length} soal</span></h3>
          <span class="line"></span>
        </div>
        <div class="ctf-grid">${items.map(cardHTML).join("")}</div>
      </section>`;
  }).join("");
  grid.querySelectorAll(".ctf-card").forEach((card) =>
    card.addEventListener("click", () => openChallenge(card.dataset.id)));
}

/* ---------- Stats ---------- */
function refreshStats() {
  const s = getSession();
  const loggedIn = !!s;
  document.getElementById("ctf-statbar").hidden = !loggedIn;
  document.getElementById("ctf-loginhint").hidden = loggedIn;

  if (loggedIn) {
    document.getElementById("stat-score").textContent = SCORE;
    document.getElementById("stat-solved").textContent = SOLVED.size;
    document.getElementById("stat-total").textContent = CHALLENGES.length;
    const idx = SCOREBOARD.findIndex((t) => t.name.toLowerCase() === s.name.toLowerCase());
    document.getElementById("stat-rank").textContent = idx >= 0 ? `#${idx + 1}` : "—";
  }

  const link = document.getElementById("ctf-auth-link");
  link.innerHTML = loggedIn
    ? `<i class="fa-solid fa-user"></i> ${escapeHTML(s.name)} (keluar)`
    : `<i class="fa-solid fa-right-to-bracket"></i> Masuk`;

  const wrap = document.getElementById("ctf-progress-wrap");
  if (loggedIn && CHALLENGES.length) {
    wrap.hidden = false;
    const pct = Math.round((SOLVED.size / CHALLENGES.length) * 100);
    document.getElementById("ctf-progress-fill").style.width = pct + "%";
    document.getElementById("ctf-progress-label").textContent = `${SOLVED.size}/${CHALLENGES.length} soal • ${pct}%`;
  } else {
    wrap.hidden = true;
  }
}

/* ---------- Challenge modal ---------- */
function openChallenge(id) {
  const c = CHALLENGES.find((x) => String(x.id) === String(id));
  if (!c) return;
  openChallengeId = c.id;

  document.getElementById("m-category").textContent = c.category;
  const diff = document.getElementById("m-difficulty");
  diff.textContent = c.difficulty;
  diff.className = `ctf-diff ${diffClass(c.difficulty)}`;
  document.getElementById("m-points").textContent = c.points;
  document.getElementById("m-title").textContent = c.title;
  document.getElementById("m-author").innerHTML = c.author
    ? `<i class="fa-solid fa-user-pen"></i> oleh ${escapeHTML(c.author)}` : "";
  document.getElementById("m-description").innerHTML = renderMarkdown(c.description || "");

  const filesEl = document.getElementById("m-files");
  let filesHtml = (c.files || []).map((f) =>
    `<a class="ctf-file" href="${escapeHTML(f.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-paperclip"></i> ${escapeHTML(f.name || "Lampiran")}</a>`).join("");
  if (c.link) filesHtml += `<a class="ctf-file" href="${escapeHTML(c.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-link"></i> Buka Tantangan</a>`;
  filesEl.innerHTML = filesHtml;
  filesEl.hidden = !filesHtml;

  const hintBox = document.getElementById("m-hint-box");
  const hintText = document.getElementById("m-hint-text");
  if (c.hint) {
    hintBox.hidden = false; hintText.hidden = true; hintText.textContent = c.hint;
    document.getElementById("m-hint-toggle").innerHTML = '<i class="fa-solid fa-lightbulb"></i> Tampilkan Hint';
  } else { hintBox.hidden = true; }

  const solved = isSolved(c.id);
  document.getElementById("m-submit-msg").textContent = "";
  document.getElementById("m-flag").value = "";
  document.getElementById("m-solved-banner").hidden = !solved;
  document.getElementById("m-submit-form").hidden = solved;
  if (solved) document.getElementById("m-solved-pts").textContent = c.points;

  showModal("ctf-modal");
}

/* ---------- Submit flag (cek di server) ---------- */
async function handleSubmit(e) {
  e.preventDefault();
  if (busy) return;
  const msg = document.getElementById("m-submit-msg");
  const s = getSession();
  if (!s) {
    msg.className = "ctf-submit-msg err";
    msg.textContent = "Masuk dulu untuk submit flag.";
    setTimeout(() => { hideModal("ctf-modal"); openAuth("login"); }, 800);
    return;
  }
  const val = document.getElementById("m-flag").value.trim();
  if (!val) return;

  busy = true;
  const btn = e.target.querySelector("button[type=submit]");
  const old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cek…';
  msg.className = "ctf-submit-msg"; msg.textContent = "";

  try {
    const r = await api("submit", { name: s.name, token: s.token, challengeId: openChallengeId, flag: val });
    if (!r.ok) {
      msg.className = "ctf-submit-msg err";
      msg.textContent = r.error || "Gagal submit.";
      if (/sesi/i.test(r.error || "")) { clearSession(); setTimeout(() => { hideModal("ctf-modal"); openAuth("login"); }, 900); }
    } else if (r.correct) {
      SOLVED = new Set((r.solves || []).map(String));
      SCORE = r.score != null ? r.score : SCORE;
      const c = CHALLENGES.find((x) => String(x.id) === String(openChallengeId));
      msg.className = "ctf-submit-msg ok";
      msg.innerHTML = r.already
        ? `<i class="fa-solid fa-circle-check"></i> Sudah pernah benar sebelumnya.`
        : `<i class="fa-solid fa-circle-check"></i> Benar! +${c ? c.points : ""} poin`;
      if (!r.already) toast(`🎉 <strong>${escapeHTML(c ? c.title : "Soal")}</strong> terpecahkan!`, "ok");
      renderGrid();
      loadScoreboard().then(refreshStats);
      refreshStats();
      setTimeout(() => openChallenge(openChallengeId), 700);
    } else {
      msg.className = "ctf-submit-msg err";
      msg.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Flag salah. Coba lagi!`;
    }
  } catch (err) {
    msg.className = "ctf-submit-msg err";
    msg.textContent = err.message === "NO_API" ? "Backend belum dikonfigurasi." : "Koneksi gagal. Coba lagi.";
  } finally {
    busy = false; btn.disabled = false; btn.innerHTML = old;
  }
}

/* ---------- Scoreboard ---------- */
async function loadScoreboard() {
  try {
    const r = await api("scoreboard");
    if (r.ok) SCOREBOARD = r.scoreboard || [];
  } catch (_) {}
  return SCOREBOARD;
}
function renderScoreboard() {
  const el = document.getElementById("ctf-scoretable");
  const me = getSession();
  if (!SCOREBOARD.length) {
    el.innerHTML = `<div class="empty-state">Belum ada tim. Jadilah yang pertama!</div>`;
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Tim</th><th>Solved</th><th>Poin</th></tr></thead>
      <tbody>
        ${SCOREBOARD.map((t, i) => {
          const isMe = me && t.name.toLowerCase() === me.name.toLowerCase();
          return `<tr class="${isMe ? "is-me" : ""}">
            <td>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
            <td>${escapeHTML(t.name)}${isMe ? ' <span class="you-tag">kamu</span>' : ""}</td>
            <td>${t.solved}</td><td><strong>${t.score}</strong></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

/* ---------- Auth (register / login) ---------- */
let authMode = "register";
function openAuth(mode = "register") {
  setAuthMode(mode);
  document.getElementById("ctf-auth-msg").textContent = "";
  const s = getSession();
  document.getElementById("ctf-name").value = s ? s.name : "";
  document.getElementById("ctf-pass").value = "";
  showModal("ctf-auth-modal");
  setTimeout(() => document.getElementById("ctf-name").focus(), 50);
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".ctf-auth-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.mode === mode));
  document.getElementById("ctf-auth-submit").innerHTML = mode === "register"
    ? '<i class="fa-solid fa-user-plus"></i> Daftar & Main'
    : '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
}
async function handleAuth(e) {
  e.preventDefault();
  if (busy) return;
  const msg = document.getElementById("ctf-auth-msg");
  const name = document.getElementById("ctf-name").value.trim().replace(/\s+/g, " ");
  const pass = document.getElementById("ctf-pass").value;
  if (name.length < 2) { msg.className = "ctf-submit-msg err"; msg.textContent = "Nama tim minimal 2 karakter."; return; }
  if (pass.length < 4) { msg.className = "ctf-submit-msg err"; msg.textContent = "Password minimal 4 karakter."; return; }

  busy = true;
  const btn = document.getElementById("ctf-auth-submit");
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses…';
  msg.className = "ctf-submit-msg"; msg.textContent = "";
  try {
    const r = await api(authMode, { name, password: pass });
    if (!r.ok) { msg.className = "ctf-submit-msg err"; msg.textContent = r.error || "Gagal."; return; }
    setSession({ name: r.name, token: r.token });
    SOLVED = new Set((r.solves || []).map(String));
    SCORE = r.score || 0;
    hideModal("ctf-auth-modal");
    toast(`Selamat datang, <strong>${escapeHTML(r.name)}</strong>! 🚀`, "ok");
    await loadScoreboard();
    renderGrid(); refreshStats();
  } catch (err) {
    msg.className = "ctf-submit-msg err";
    msg.textContent = err.message === "NO_API" ? "Backend belum dikonfigurasi." : "Koneksi gagal. Coba lagi.";
  } finally {
    busy = false; btn.disabled = false; btn.innerHTML = old;
  }
}

/* ---------- Modal utils ---------- */
function showModal(id) {
  const m = document.getElementById(id);
  m.classList.add("open"); m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function hideModal(id) {
  const m = document.getElementById(id);
  m.classList.remove("open"); m.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".ctf-modal.open")) document.body.style.overflow = "";
}

/* ---------- Events ---------- */
function bindEvents() {
  document.getElementById("ctf-modal-close").addEventListener("click", () => hideModal("ctf-modal"));
  document.getElementById("ctf-auth-close").addEventListener("click", () => hideModal("ctf-auth-modal"));
  document.getElementById("ctf-score-close").addEventListener("click", () => hideModal("ctf-score-modal"));
  document.getElementById("m-submit-form").addEventListener("submit", handleSubmit);
  document.getElementById("ctf-auth-form").addEventListener("submit", handleAuth);
  document.querySelectorAll(".ctf-auth-tab").forEach((t) =>
    t.addEventListener("click", () => setAuthMode(t.dataset.mode)));

  document.getElementById("m-hint-toggle").addEventListener("click", () => {
    const t = document.getElementById("m-hint-text");
    t.hidden = !t.hidden;
    document.getElementById("m-hint-toggle").innerHTML = t.hidden
      ? '<i class="fa-solid fa-lightbulb"></i> Tampilkan Hint'
      : '<i class="fa-solid fa-lightbulb"></i> Sembunyikan Hint';
  });

  document.getElementById("ctf-scoreboard-btn").addEventListener("click", async () => {
    document.getElementById("ctf-scoretable").innerHTML = `<div class="empty-state">Memuat…</div>`;
    showModal("ctf-score-modal");
    await loadScoreboard(); renderScoreboard();
  });

  document.getElementById("ctf-auth-link").addEventListener("click", (e) => {
    e.preventDefault();
    if (getSession()) {
      if (confirm("Keluar dari tim ini? Skormu tetap tersimpan di server, login lagi kapan saja.")) {
        clearSession(); SOLVED = new Set(); SCORE = 0;
        renderGrid(); refreshStats(); toast("Kamu sudah keluar.", "info");
      }
    } else { openAuth("login"); }
  });
  document.getElementById("ctf-loginhint-link").addEventListener("click", (e) => { e.preventDefault(); openAuth("register"); });

  document.querySelectorAll(".ctf-modal").forEach((m) =>
    m.addEventListener("click", (e) => { if (e.target === m) hideModal(m.id); }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".ctf-modal.open").forEach((m) => hideModal(m.id));
  });
}

/* ---------- Init ---------- */
function showSetupNotice() {
  document.getElementById("ctf-grid").innerHTML = `
    <div class="ctf-setup-notice">
      <i class="fa-solid fa-screwdriver-wrench"></i>
      <h3>Backend belum dikonfigurasi</h3>
      <p>Isi <code>API_URL</code> di <code>js/ctf-config.js</code> dengan URL Apps Script kamu.<br>
      Panduan lengkap: <code>ctf/SETUP-SPREADSHEET.md</code></p>
    </div>`;
}

async function initCTF() {
  document.getElementById("ctf-title").textContent = CFG.title || "CTF Labs";
  document.getElementById("ctf-subtitle").textContent = CFG.subtitle || "";
  document.getElementById("ctf-flagfmt").textContent = CFG.flagFormat || "GGCTF{...}";
  document.getElementById("m-flag").placeholder = CFG.flagFormat || "GGCTF{...}";

  bindEvents();

  if (!CFG.API_URL) {
    showSetupNotice();
    document.getElementById("ctf-loginhint").hidden = true;
    try { renderFooter(await loadJSON("../data/profile.json")); } catch {}
    return;
  }

  try {
    const r = await api("challenges");
    if (!r.ok) throw new Error(r.error || "Gagal memuat soal");
    CHALLENGES = r.challenges || [];

    await loadScoreboard();

    // validasi sesi & ambil solve tim ini
    const s = getSession();
    if (s) {
      try {
        const m = await api("me", { name: s.name, token: s.token });
        if (m.ok) { SOLVED = new Set((m.solves || []).map(String)); SCORE = m.score || 0; }
        else clearSession();
      } catch (_) {}
    }

    renderFilters();
    renderGrid();
    refreshStats();
  } catch (err) {
    document.getElementById("ctf-grid").innerHTML =
      `<div class="empty-state">Gagal memuat dari server.<br><small>${escapeHTML(err.message)}</small><br>
       <small>Pastikan Apps Script sudah di-deploy "Anyone" dan URL di ctf-config.js benar.</small></div>`;
  }

  try { renderFooter(await loadJSON("../data/profile.json")); } catch {}
}

document.addEventListener("DOMContentLoaded", initCTF);
