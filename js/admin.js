/* =========================================================
   admin.js — browser-based content helper (no server needed)
   Generates the Markdown file + JSON entry for you to commit.
   ========================================================= */

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
    setTimeout(() => (btn.innerHTML = old), 1500);
  });
}

/* ---------- Tabs ---------- */
function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).style.display = "block";
    });
  });
}

/* ---------- Article generator ---------- */
function buildArticle() {
  const title = document.getElementById("a-title").value.trim();
  if (!title) { alert("Judul wajib diisi."); return; }
  let slug = document.getElementById("a-slug").value.trim();
  if (!slug) { slug = slugify(title); document.getElementById("a-slug").value = slug; }

  const meta = {
    slug,
    title,
    excerpt: document.getElementById("a-excerpt").value.trim(),
    cover: document.getElementById("a-cover").value.trim() || "assets/img/avataaars.svg",
    category: document.getElementById("a-category").value.trim() || "Umum",
    tags: document.getElementById("a-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    author: document.getElementById("a-author").value.trim() || "Gayu Gumelar",
    date: document.getElementById("a-date").value || new Date().toISOString().slice(0, 10),
    readingTime: Number(document.getElementById("a-reading").value) || 3
  };
  const body = document.getElementById("a-body").value;

  document.getElementById("a-out-md").textContent = body;
  document.getElementById("a-out-json").textContent = JSON.stringify(meta, null, 2) + ",";
  document.getElementById("a-output").style.display = "block";
  document.getElementById("a-filename").textContent = `articles/${slug}.md`;

  // wire buttons
  document.getElementById("a-dl-md").onclick = () => download(`${slug}.md`, body);
  document.getElementById("a-copy-md").onclick = (e) => copyText(body, e.currentTarget);
  document.getElementById("a-copy-json").onclick = (e) => copyText(JSON.stringify(meta, null, 2) + ",", e.currentTarget);
}

/* ---------- Certificate generator ---------- */
function buildCert() {
  const title = document.getElementById("c-title").value.trim();
  if (!title) { alert("Judul sertifikat wajib diisi."); return; }
  const entry = {
    title,
    image: document.getElementById("c-image").value.trim(),
    description: document.getElementById("c-desc").value.trim(),
    category: document.getElementById("c-category").value.trim() || "Sertifikat",
    year: document.getElementById("c-year").value.trim()
  };
  document.getElementById("c-out-json").textContent = JSON.stringify(entry, null, 2) + ",";
  document.getElementById("c-output").style.display = "block";
  document.getElementById("c-copy-json").onclick = (e) =>
    copyText(JSON.stringify(entry, null, 2) + ",", e.currentTarget);
}

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  try { renderFooter(await loadJSON("data/profile.json")); } catch (e) {}
  document.getElementById("a-date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("a-title").addEventListener("blur", () => {
    const slugEl = document.getElementById("a-slug");
    if (!slugEl.value.trim()) slugEl.value = slugify(document.getElementById("a-title").value);
  });
  document.getElementById("a-build").addEventListener("click", buildArticle);
  document.getElementById("c-build").addEventListener("click", buildCert);
});
