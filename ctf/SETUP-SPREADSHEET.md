# 🚩 CTF Labs — Setup Database Google Spreadsheet

Panduan ini menghubungkan **CTF Labs** (frontend di GitHub Pages) ke **Google Sheets** sebagai database, lewat **Google Apps Script** sebagai backend. Semuanya **gratis** dan jalan di akun Google kamu.

Hasil akhir:
- ✅ Papan skor **global** (semua pemain melihat skor yang sama)
- ✅ Akun pemain (nama tim + password) — bisa login dari perangkat mana pun
- ✅ Flag **dicek di server** → flag asli tidak pernah dikirim ke browser (anti-cheat lebih kuat)

> Estimasi waktu: ~10 menit. Tidak perlu kartu kredit.

---

## Langkah 1 — Buat Spreadsheet
1. Buka <https://sheets.google.com> → **Blank / Kosong**.
2. Beri nama, misal **`CTF Labs DB`**.

## Langkah 2 — Buka editor Apps Script
1. Di spreadsheet itu: menu **Extensions / Ekstensi → Apps Script**.
2. Hapus semua kode contoh (`function myFunction() {}`).
3. Buka file [`apps-script/Code.gs`](apps-script/Code.gs) di repo ini, **salin SELURUH isinya**, tempel ke editor Apps Script.
4. Klik ikon **💾 Save** (Ctrl+S).

## Langkah 3 — Bikin tab & contoh soal otomatis
1. Di editor Apps Script, pada dropdown fungsi (atas), pilih **`setupSheets`**.
2. Klik **▶ Run**.
3. Pertama kali akan minta izin → **Review permissions** → pilih akun Google kamu →
   "Google hasn't verified this app" → **Advanced → Go to (nama proyek) → Allow**.
   (Wajar, karena ini script milikmu sendiri.)
4. Cek spreadsheet: sekarang ada 3 tab → **Challenges** (terisi 6 soal contoh), **Players**, **Solves**.

> Kalau mau bikin tab manual, strukturnya:
> - **Challenges**: `id | title | category | difficulty | points | description | hint | files | link | author | released | flag`
> - **Players**: `name | passhash | token | created`
> - **Solves**: `player | challengeId | points | timestamp`
> Kolom `files` diisi `[]` (atau JSON: `[{"name":"file.zip","url":"https://..."}]`).

## Langkah 4 — Deploy jadi Web App
1. Di editor Apps Script: tombol **Deploy → New deployment**.
2. Klik ikon ⚙️ di "Select type" → pilih **Web app**.
3. Isi:
   - **Description**: `CTF Labs API`
   - **Execute as**: **Me** (akun kamu)
   - **Who has access**: **Anyone**  ← penting! (bukan "Anyone with Google account")
4. Klik **Deploy** → **Authorize** kalau diminta.
5. **Salin "Web app URL"** — bentuknya:
   ```
   https://script.google.com/macros/s/AKfycb..................../exec
   ```

## Langkah 5 — Hubungkan ke frontend
1. Buka [`js/ctf-config.js`](../js/ctf-config.js).
2. Tempel URL tadi ke `API_URL`:
   ```js
   window.CTF = {
     API_URL: "https://script.google.com/macros/s/AKfycb..../exec",
     ...
   };
   ```
3. Simpan, lalu **commit & push** ke GitHub.

## Langkah 6 — Tes
1. Buka `https://gayugumelar.my.id/ctf` (atau lokal via Laragon).
2. Klik **Daftar**, buat tim + password → soal muncul.
3. Submit flag soal "Selamat Datang": `GGCTF{w3lc0m3_t0_gayu_ctf}` → harus **benar** & skor naik.
4. Buka **Papan Skor** → tim kamu muncul.

✅ Selesai!

---

## Menambah / mengedit soal
**Cara cepat (pakai admin):**
1. Buka `https://gayugumelar.my.id/ctf/admin.html` (password gate sama dgn editor artikel).
2. Isi form → **Generate** → **Salin baris**.
3. Di Google Sheet tab **Challenges**: klik sel kolom **id** pada baris kosong → **Ctrl+V**.

**Cara manual:** tambah baris di tab **Challenges**, isi tiap kolom. Kolom `flag` = flag asli. `released` = `TRUE`/`FALSE`.

> Perubahan soal langsung tampil tanpa deploy ulang — backend membaca sheet secara real-time.

---

## Pengaturan (opsional)
Di `Code.gs` bagian `CFG`:
```js
const CFG = {
  trimFlag: true,             // abaikan spasi depan/belakang flag
  caseInsensitiveFlag: false  // true = flag tidak peka huruf besar/kecil
};
```
Setelah ubah `Code.gs`, **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL tetap sama).

---

## Troubleshooting
| Masalah | Solusi |
|---|---|
| Halaman bilang "Backend belum dikonfigurasi" | `API_URL` di `ctf-config.js` masih kosong. |
| "Koneksi gagal" / CORS error | Pastikan **Who has access = Anyone**. Re-deploy versi baru. |
| Soal tidak muncul | Cek tab bernama persis **Challenges** & kolom `released` = `TRUE`. |
| Ganti `Code.gs` tapi tak ada efek | Harus **Deploy versi baru** (Manage deployments → Edit → New version). |
| Lupa password tim | Hapus baris tim di tab **Players** (atau ganti `passhash`-nya), daftar ulang. |

## Catatan keamanan (jujur)
- Endpoint **publik** → orang teknis bisa kirim request langsung / spam. Untuk CTF latihan ini wajar; jangan simpan data sensitif.
- Password disimpan sebagai **hash SHA-256 tanpa salt** — cukup untuk skor CTF, **bukan** untuk akun penting. Jangan pakai password yang sama dengan akun lain.
- Ada **kuota harian** Apps Script (cukup untuk puluhan–ratusan pemain, bukan ribuan serentak).
