/* =========================================================
   admin-gate.js — simple client-side password gate
   ---------------------------------------------------------
   CATATAN KEAMANAN:
   Ini hanya menghalangi pengunjung awam, BUKAN keamanan kuat.
   Password disimpan sebagai hash SHA-256 (bukan teks mentah),
   tapi orang teknis tetap bisa melewatinya. Jangan pakai untuk
   melindungi data sensitif.

   GANTI PASSWORD:
   1. Buka Console browser (F12) lalu jalankan:
        await sha256("password-baru-anda")
   2. Salin hasil hash, tempel ke PASSWORD_HASH di bawah.
   ========================================================= */

// Hash SHA-256 dari password default: "gayugumelar2026"  (ganti!)
const PASSWORD_HASH = "264f5d1ad6725e3df5b70e72a1ed96d1711dd798f8d093761f64b6ebf0fc5ea6";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
window.sha256 = sha256; // tersedia di console untuk membuat hash baru

(function buildGate() {
  // Sudah login di sesi ini? lewati.
  if (sessionStorage.getItem("admin_ok") === "1") return;

  // Sembunyikan body sampai lolos
  const style = document.createElement("style");
  style.textContent = `body > *:not(#admin-gate){visibility:hidden}
    #admin-gate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
      background:linear-gradient(135deg,#eff4ff,#fff);font-family:Inter,sans-serif}
    #admin-gate .box{background:#fff;border:1px solid #e5e7eb;border-radius:16px;
      padding:36px;width:min(380px,90vw);box-shadow:0 20px 50px rgba(15,23,42,.15);text-align:center}
    #admin-gate i.lock{font-size:2rem;color:#2563eb;margin-bottom:12px}
    #admin-gate h2{color:#0f172a;margin:0 0 4px;font-size:1.3rem}
    #admin-gate p{color:#6b7280;font-size:.88rem;margin:0 0 20px}
    #admin-gate input{width:100%;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;
      font-size:1rem;outline:none;margin-bottom:12px}
    #admin-gate input:focus{border-color:#2563eb;box-shadow:0 0 0 4px #eff4ff}
    #admin-gate button{width:100%;padding:12px;border:0;border-radius:999px;background:#2563eb;
      color:#fff;font-weight:600;font-size:1rem;cursor:pointer}
    #admin-gate button:hover{background:#1d4ed8}
    #admin-gate .err{color:#dc2626;font-size:.85rem;min-height:18px;margin-top:8px}`;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "admin-gate";
  gate.innerHTML = `
    <form class="box" id="gate-form">
      <i class="fa-solid fa-lock lock"></i>
      <h2>Area Editor</h2>
      <p>Masukkan password untuk mengakses editor konten.</p>
      <input type="password" id="gate-pass" placeholder="Password" autofocus autocomplete="current-password" />
      <button type="submit">Masuk</button>
      <div class="err" id="gate-err"></div>
    </form>`;
  // Pasang segera (sebelum DOMContentLoaded) agar konten tak sempat terlihat
  (document.body || document.documentElement).appendChild(gate);

  gate.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = document.getElementById("gate-pass").value;
    const hash = await sha256(val);
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem("admin_ok", "1");
      gate.remove();
      document.querySelectorAll("body > *").forEach((el) => (el.style.visibility = ""));
      style.remove();
    } else {
      document.getElementById("gate-err").textContent = "Password salah. Coba lagi.";
      document.getElementById("gate-pass").select();
    }
  });
})();
