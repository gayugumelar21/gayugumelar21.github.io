/* =========================================================
   articles.js — articles listing page with search & filter
   ========================================================= */

let ARTICLES = [];

function articleCardHTML(a) {
  const tags = (a.tags || []).slice(0, 3).map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join("");
  return `
    <article class="card article-card" onclick="location.href='article.html?slug=${encodeURIComponent(a.slug)}'">
      <div class="article-cover"><img loading="lazy" src="${escapeHTML(a.cover)}" alt="${escapeHTML(a.title)}"></div>
      <div class="article-body">
        <div class="article-meta">
          <span class="article-cat">${escapeHTML(a.category)}</span>
          <span><i class="fa-regular fa-calendar"></i> ${formatDate(a.date)}</span>
          <span><i class="fa-regular fa-clock"></i> ${escapeHTML(String(a.readingTime || 3))} mnt</span>
        </div>
        <h3>${escapeHTML(a.title)}</h3>
        <p>${escapeHTML(a.excerpt)}</p>
        <div class="article-tags">${tags}</div>
        <span class="read-more">Baca selengkapnya <i class="fa-solid fa-arrow-right"></i></span>
      </div>
    </article>`;
}

function applyFilter() {
  const q = (document.getElementById("search").value || "").toLowerCase().trim();
  const cat = document.querySelector("#article-filters .filter-btn.active")?.dataset.cat || "Semua";
  const grid = document.getElementById("article-grid");

  let list = [...ARTICLES].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (cat !== "Semua") list = list.filter((a) => a.category === cat);
  if (q) list = list.filter((a) =>
    (a.title + " " + a.excerpt + " " + (a.tags || []).join(" ")).toLowerCase().includes(q)
  );

  grid.innerHTML = list.length
    ? list.map(articleCardHTML).join("")
    : `<p class="empty-state">Tidak ada artikel yang cocok. Coba kata kunci lain.</p>`;
}

async function initArticles() {
  try {
    const [profile, articles] = await Promise.all([
      loadJSON("data/profile.json"),
      loadJSON("articles/index.json")
    ]);
    ARTICLES = articles;
    renderFooter(profile);

    const cats = ["Semua", ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))];
    const filterBar = document.getElementById("article-filters");
    filterBar.innerHTML = cats.map((c, i) =>
      `<button class="filter-btn ${i === 0 ? "active" : ""}" data-cat="${escapeHTML(c)}">${escapeHTML(c)}</button>`
    ).join("");
    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter();
    });

    document.getElementById("search").addEventListener("input", applyFilter);
    applyFilter();
  } catch (err) {
    document.getElementById("article-grid").innerHTML =
      `<p class="empty-state">${escapeHTML(err.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", initArticles);
