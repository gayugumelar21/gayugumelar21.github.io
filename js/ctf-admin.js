/* =========================================================
   ctf-admin.js — generator BARIS soal untuk Google Sheet
   Output: satu baris tab-delimited (TSV) dengan urutan kolom:
   id, title, category, difficulty, points, description, hint,
   files, link, author, released, flag
   -> tinggal Paste ke tab "Challenges" di Google Sheet.
   ========================================================= */

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40);
}

/* Quoting ala CSV agar sel multi-baris tetap utuh saat di-paste ke Sheets */
function cell(v) {
  let s = String(v == null ? "" : v);
  if (/[\t\n"]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
    setTimeout(() => (btn.innerHTML = old), 1500);
  });
}

document.getElementById("ch-build").addEventListener("click", () => {
  const title = document.getElementById("ch-title").value.trim();
  const flag = document.getElementById("ch-flag").value.trim();
  if (!title) { alert("Judul soal wajib diisi."); return; }
  if (!flag) { alert("Flag wajib diisi."); return; }

  const id = document.getElementById("ch-id").value.trim() || slugify(title);

  const files = [];
  const fUrl = document.getElementById("ch-file-url").value.trim();
  const fName = document.getElementById("ch-file-name").value.trim();
  if (fUrl) files.push({ name: fName || "Lampiran", url: fUrl });

  const cols = [
    id,
    title,
    document.getElementById("ch-category").value.trim() || "Misc",
    document.getElementById("ch-difficulty").value,
    parseInt(document.getElementById("ch-points").value, 10) || 0,
    document.getElementById("ch-description").value,
    document.getElementById("ch-hint").value.trim(),
    JSON.stringify(files),
    document.getElementById("ch-link").value.trim(),
    document.getElementById("ch-author").value.trim() || "Gayu",
    "TRUE",
    flag,
  ];

  const row = cols.map(cell).join("\t");
  document.getElementById("ch-out-json").textContent = row;
  document.getElementById("ch-output").style.display = "";
  document.getElementById("ch-output").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.getElementById("ch-copy").addEventListener("click", (e) =>
  copyText(document.getElementById("ch-out-json").textContent, e.currentTarget));
