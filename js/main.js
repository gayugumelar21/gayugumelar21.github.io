/* =========================================================
   main.js — home page (hero, about, certificates, articles)
   ========================================================= */

let ALL_CERTS = [];

function renderHero(p) {
  const el = document.getElementById("hero");
  if (!el) return;
  const social = (p.social || []).map((s) =>
    `<a href="${escapeHTML(s.url)}" title="${escapeHTML(s.label)}" target="_blank" rel="noopener"><i class="${escapeHTML(s.icon)}"></i></a>`
  ).join("");
  const stats = (p.stats || []).map((s) =>
    `<div class="stat"><div class="num">${escapeHTML(s.value)}</div><div class="lbl">${escapeHTML(s.label)}</div></div>`
  ).join("");
  el.innerHTML = `
    <div class="container reveal">
      <img class="hero-avatar" src="${escapeHTML(p.avatar)}" alt="${escapeHTML(p.name)}">
      <div class="role">${escapeHTML(p.role)}</div>
      <h1>${escapeHTML(p.name)}</h1>
      <p class="lead">${escapeHTML(p.about[0] || "")}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#portfolio"><i class="fa-solid fa-award"></i> Lihat Portfolio</a>
        <a class="btn btn-outline" href="articles.html"><i class="fa-solid fa-newspaper"></i> Baca Artikel</a>
      </div>
      <div class="hero-social">${social}</div>
      <div class="stats" style="max-width:560px;width:100%">${stats}</div>
    </div>`;
}

function renderAbout(p) {
  const el = document.getElementById("about-content");
  if (!el) return;
  const paras = (p.about || []).map((t) => `<p>${escapeHTML(t)}</p>`).join("");
  el.innerHTML = `
    <div class="about-grid reveal">
      <div>
        ${paras}
        <a class="btn btn-primary" href="${escapeHTML(p.cv)}" download>
          <i class="fa-solid fa-download"></i> Download CV
        </a>
      </div>
      <div class="about-card">
        <h3 style="margin-bottom:14px">Kontak Cepat</h3>
        <p><i class="fa-solid fa-envelope" style="color:var(--primary)"></i>
          <a href="mailto:${escapeHTML(p.email)}">${escapeHTML(p.email)}</a></p>
        <p><i class="fa-solid fa-location-dot" style="color:var(--primary)"></i> ${escapeHTML(p.location)}</p>
        <p style="margin-top:10px;color:var(--muted)">${escapeHTML(p.tagline)}</p>
      </div>
    </div>`;
}

function certCardHTML(c, i) {
  return `
    <article class="card cert-card reveal" data-index="${i}" data-category="${escapeHTML(c.category || "")}">
      <div class="cert-thumb"><img loading="lazy" src="${escapeHTML(c.image)}" alt="${escapeHTML(c.title)}"></div>
      <div class="cert-body">
        <span class="badge">${escapeHTML(c.category || "Sertifikat")}</span>
        <h3>${escapeHTML(c.title)}</h3>
        <div class="year"><i class="fa-regular fa-calendar"></i> ${escapeHTML(c.year || "")}</div>
      </div>
    </article>`;
}

function renderCertificates(certs) {
  ALL_CERTS = certs;
  const grid = document.getElementById("cert-grid");
  const filterBar = document.getElementById("cert-filters");
  if (!grid) return;

  grid.innerHTML = certs.map(certCardHTML).join("");

  const cats = ["Semua", ...Array.from(new Set(certs.map((c) => c.category).filter(Boolean)))];
  filterBar.innerHTML = cats.map((cat, i) =>
    `<button class="filter-btn ${i === 0 ? "active" : ""}" data-cat="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`
  ).join("");

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    filterBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    grid.querySelectorAll(".cert-card").forEach((card) => {
      const show = cat === "Semua" || card.dataset.category === cat;
      card.style.display = show ? "" : "none";
    });
  });

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".cert-card");
    if (card) openLightbox(ALL_CERTS[+card.dataset.index]);
  });

  initReveal();
}

/* Lightbox */
function openLightbox(c) {
  const lb = document.getElementById("lightbox");
  document.getElementById("lb-img").src = c.image;
  document.getElementById("lb-img").alt = c.title;
  document.getElementById("lb-title").textContent = c.title;
  document.getElementById("lb-badge").textContent = c.category || "Sertifikat";
  document.getElementById("lb-desc").textContent = c.description || "";
  lb.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}

function articleCardHTML(a) {
  const tags = (a.tags || []).slice(0, 3).map((t) => `<span class="tag">#${escapeHTML(t)}</span>`).join("");
  return `
    <article class="card article-card reveal" onclick="location.href='article.html?slug=${encodeURIComponent(a.slug)}'">
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

function renderLatestArticles(list) {
  const grid = document.getElementById("latest-articles");
  if (!grid) return;
  const latest = [...list].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  if (!latest.length) {
    grid.innerHTML = `<p class="empty-state">Belum ada artikel.</p>`;
    return;
  }
  grid.innerHTML = latest.map(articleCardHTML).join("");
  initReveal();
}

async function initHome() {
  try {
    const [profile, certs, articles] = await Promise.all([
      loadJSON("data/profile.json"),
      loadJSON("data/certificates.json"),
      loadJSON("articles/index.json").catch(() => [])
    ]);
    document.title = `${profile.name} — Portfolio & Blog`;
    renderHero(profile);
    renderAbout(profile);
    renderCertificates(certs);
    renderLatestArticles(articles);
    renderFooter(profile);
    initReveal();

    // lightbox events
    document.getElementById("lb-close").addEventListener("click", closeLightbox);
    document.getElementById("lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
  } catch (err) {
    console.error(err);
    document.getElementById("hero").innerHTML =
      `<div class="container"><p class="empty-state">${escapeHTML(err.message)}<br>Pastikan situs dibuka lewat server (http://localhost), bukan file://</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", initHome);
