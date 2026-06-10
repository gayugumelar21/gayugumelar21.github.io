# Gayu Gumelar — Portfolio & Blog

Website portfolio statis dengan fitur sertifikat/prestasi dinamis dan blog artikel berbasis Markdown.
100% jalan di **GitHub Pages** (tanpa server/database).

## Struktur

```
index.html            Halaman utama (hero, portfolio, artikel terbaru, about, kontak)
articles.html         Daftar semua artikel + pencarian & filter
article.html          Pembaca artikel (?slug=...) — render Markdown
admin.html            Editor di browser untuk membuat artikel/sertifikat baru
css/style.css         Tema (light + aksen biru)
js/site.js            Helper bersama (navbar, footer, util)
js/main.js            Logika halaman utama
js/articles.js        Logika daftar artikel
js/article.js         Logika pembaca artikel
js/admin.js           Logika editor
data/profile.json     Data profil (nama, about, kontak, sosial media)
data/certificates.json  Data sertifikat & prestasi
articles/index.json   Daftar metadata artikel
articles/*.md         Isi artikel (Markdown)
assets/img/portfolio/ Gambar sertifikat
```

## Menjalankan secara lokal

Harus lewat HTTP (bukan `file://`) karena memuat data via `fetch`.

- **Laragon**: buka `http://localhost/gayugumelar21/`
- **Atau**: `python -m http.server 8000` lalu buka `http://localhost:8000`

## Menambah artikel baru

1. Buka `admin.html`, tab **Artikel**, isi form, klik **Generate**.
2. Simpan file `.md` ke folder `articles/`.
3. Tempel entri JSON yang dihasilkan ke **paling atas** array di `articles/index.json`.
4. Commit & push.

## Menambah sertifikat baru

1. Letakkan gambar di `assets/img/portfolio/`.
2. Buka `admin.html`, tab **Sertifikat**, isi form, klik **Generate**.
3. Tempel entri JSON ke **paling atas** array di `data/certificates.json`.
4. Commit & push.

## Deploy ke GitHub Pages

Push ke repo `gayugumelar21.github.io` (branch `main`). Situs otomatis tayang di
`https://gayugumelar21.github.io`.
