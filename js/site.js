/* =========================================================
   site.js — shared helpers (navbar, reveal, footer, profile)
   ========================================================= */

/* Fetch JSON helper with a friendly error if opened via file:// */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Gagal memuat ${path} (${res.status})`);
  return res.json();
}

/* Format a YYYY-MM-DD date into Indonesian readable form */
function formatDate(iso) {
  const months = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"];
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* Navbar: shrink shadow on scroll + mobile toggle */
function initNavbar() {
  const nav = document.getElementById("navbar");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    onScroll();
  }
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }
}

/* Reveal-on-scroll animation */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

/* Render shared footer using profile data */
function renderFooter(profile) {
  const el = document.getElementById("footer");
  if (!el) return;
  const social = (profile.social || []).map((s) =>
    `<a href="${escapeHTML(s.url)}" title="${escapeHTML(s.label)}" target="_blank" rel="noopener"><i class="${escapeHTML(s.icon)}"></i></a>`
  ).join("");
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="container">
      <a class="brand" href="index.html">${escapeHTML(profile.name.split(" ")[0])}<span>${escapeHTML(profile.name.split(" ").slice(1).join(" "))}</span></a>
      <p>${escapeHTML(profile.role)}</p>
      <div class="footer-social">${social}</div>
      <p><i class="fa-solid fa-location-dot"></i> ${escapeHTML(profile.location)}</p>
      <div class="copyright">&copy; ${escapeHTML(profile.name)} ${year}. All rights reserved.</div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initReveal();
});
