/* =========================================================
   article.js — single article reader (renders Markdown)
   ========================================================= */

function getSlug() {
  return new URLSearchParams(location.search).get("slug");
}

async function initArticle() {
  const slug = getSlug();
  const hero = document.getElementById("article-hero");
  const content = document.getElementById("article-content");

  try {
    const profile = await loadJSON("data/profile.json");
    renderFooter(profile);

    const index = await loadJSON("articles/index.json");
    const meta = index.find((a) => a.slug === slug);

    if (!slug || !meta) {
      hero.innerHTML = `<div class="container"><a class="back-link" href="articles.html"><i class="fa-solid fa-arrow-left"></i> Kembali</a><h1>Artikel tidak ditemukan</h1></div>`;
      content.innerHTML = "";
      return;
    }

    document.title = `${meta.title} — Gayu Gumelar`;
    const tags = (meta.tags || []).map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join("");
    hero.innerHTML = `
      <div class="container">
        <a class="back-link" href="articles.html"><i class="fa-solid fa-arrow-left"></i> Kembali ke Artikel</a>
        <span class="article-cat" style="font-weight:600">${escapeHTML(meta.category)}</span>
        <h1>${escapeHTML(meta.title)}</h1>
        <div class="article-meta">
          <span><i class="fa-solid fa-user"></i> ${escapeHTML(meta.author || "Admin")}</span>
          <span><i class="fa-regular fa-calendar"></i> ${formatDate(meta.date)}</span>
          <span><i class="fa-regular fa-clock"></i> ${escapeHTML(String(meta.readingTime || 3))} menit baca</span>
        </div>
        <div class="article-tags" style="margin-top:14px">${tags}</div>
      </div>
      ${meta.cover ? `<div class="article-cover-full"><img src="${escapeHTML(meta.cover)}" alt="${escapeHTML(meta.title)}"></div>` : ""}`;

    const res = await fetch(`articles/${slug}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`File artikel articles/${slug}.md tidak ditemukan`);
    const md = await res.text();

    marked.setOptions({ breaks: true, gfm: true });
    content.innerHTML = marked.parse(md);
  } catch (err) {
    content.innerHTML = `<p class="empty-state">${escapeHTML(err.message)}<br>Pastikan dibuka lewat server (http://localhost), bukan file://</p>`;
  }
}

document.addEventListener("DOMContentLoaded", initArticle);
