# Panduan & Kontrol Perbaikan Tampilan (UI/UX) SIKS Reborn V2

Dokumen ini berfungsi sebagai panduan urutan pengerjaan, daftar periksa (*checklist*), dan catatan pelacakan (*tracking*) untuk merapikan arsitektur CSS, konsistensi desain, serta keterbacaan antarmuka **SIKS Reborn V2**.

---

## Ringkasan Kondisi Awal (Baseline)
- **File CSS Utama**: `css_sultan.html` (10.428 baris, 3.335 deklarasi `!important`)
- **Halaman dengan `<style>` Lokal**: 67 file `page_*.html`
- **Layout Utama**: `index.html`, `sidebar.html`, `page_login.html`
- **Referensi Komponen**: `page_ui_kit.html`

---

## Urutan Langkah Pengerjaan

### Fase 1: Fondasi & Token Desain (`css_sultan.html` & `index.html`)
> **Tujuan**: Menetapkan standar warna, radius, dan kontras agar semua halaman mengacu pada satu sumber kebenaran (*Single Source of Truth*).

- [x] **1.1** Verifikasi urutan pemuatan CSS di `index.html` (`adminlte.min.css` harus dimuat sebelum `css_sultan.html`).
- [x] **1.2** Seragamkan skala *border-radius* di `:root` `css_sultan.html`:
  - `--radius-sm: 8px` (input, badge, tombol kotak)
  - `--radius-md: 12px` (card standar, modal)
  - `--radius-lg: 16px` (card utama/dashboard)
  - `--radius-pill: 50px` (tombol *pill* / *chip*)
- [x] **1.3** Perhalus warna aksen neon (`--warna-cyan`, `--warna-hijau`) menjadi warna yang lebih profesional dan nyaman di mata.
- [x] **1.4** Perbaiki kontras *glassmorphism* pada `--surface-card` (naikkan opasitas dari `0.45` ke `0.75`–`0.85` untuk *Light Mode*) agar teks di atas kartu tetap terbaca jelas.
- [x] **1.5** Audit kontras **Dark Mode** pada tabel, *header* tabel, teks *muted*, dan *input form*.

---

### Fase 2: Pembersihan `<style>` Lokal di Halaman (`page_*.html`)
> **Tujuan**: Menghilangkan konflik *style* antar-halaman di mode SPA dan mencegah duplikasi aturan CSS.

- [x] **2.1** Hapus deklarasi `:root` ulang di `page_login.html` dan halaman lain yang masih mendefinisikan ulang variabel warna global.
- [x] **2.2** Inventarisasi 67 file `page_*.html` yang memiliki blok `<style>` lokal:
  - Pindahkan *class* yang bersifat umum/berulang ke `css_sultan.html`.
  - Beri *prefix* khusus halaman pada *style* yang memang unik (contoh: `.login-page ...`, `.siaba-page ...`).
- [ ] **2.3** Kelompokkan pembersihan berdasarkan modul:
  - [x] Modul Autentikasi & Beranda (`page_login.html`, `page_home.html`, `sidebar.html`, `index.html` — *catatan: `page_landing.html` masih memiliki `<style>` lokal*)
  - [ ] Modul PTK (`page_ptk_*.html`)
  - [ ] Modul Murid (`page_murid_*.html`, `page_adm_murid_*.html`)
  - [ ] Modul Siaba (`page_siaba_*.html`)
  - [ ] Modul SK, TPG, PPPK (`page_sk_*.html`, `page_tpg_*.html`, `page_pppk_*.html`)
  - [ ] Modul Lainnya (E-File, Lapbul, Kemitraan, Kombel, Tata Naskah Dinas, Setting)

---

### Fase 3: Pengurangan `!important` di `css_sultan.html`
> **Tujuan**: Menghentikan "perang spesifisitas" agar CSS lebih ringan, mudah ditimpa secara natural, dan tidak mudah pecah.

- [ ] **3.1** Terapkan *parent selector* (misal `body.sultan-theme ...` atau `.sultan-ui ...`) untuk menggantikan `!important` pada komponen utama.
- [ ] **3.2** Bersihkan `!important` secara bertahap per kategori komponen:
  - [ ] Tombol (*Buttons*)
  - [ ] Kartu (*Cards & Containers*)
  - [ ] Tabel & DataTables (*Tables & Data Grid*)
  - [ ] Form & Input
  - [ ] Modal & Alert
  - [ ] Sidebar & Navbar

---

### Fase 4: Standardisasi Katalog Komponen (`page_ui_kit.html`)
> **Tujuan**: Menjadikan `page_ui_kit.html` sebagai patokan resmi pengembangan fitur baru.

- [x] **4.1** Lengkapi `page_ui_kit.html` dengan contoh standar:
  - Tombol (utama, sekunder, bahaya, *outline*, *pill*, ukuran kecil/sedang)
  - Form & Input (teks, *select*, *datepicker*, validasi error)
  - Card & Stat Pill
  - Tabel & Badge Status
  - Modal & Notifikasi
- [ ] **4.2** Pastikan semua komponen di `page_ui_kit.html` tampil baik di **Light Mode**, **Dark Mode**, serta layar **Desktop & Mobile**.

---

## Log Perubahan (Change Log)

Catat setiap perbaikan yang sudah selesai di tabel ini agar mudah ditelusuri:

| Tanggal | Fase / Langkah | File yang Diubah | Ringkasan Perubahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-11-25 | Inisiasi | `PANDUAN_PERBAIKAN_UI.md` | Pembuatan dokumen panduan & kontrol perbaikan UI | Selesai |
| 2026-11-25 | Fase 1 (1.1–1.4) | `css_sultan.html`, `index.html` | Verifikasi urutan CSS, seragamkan skala radius (`8/12/16/50px`), perhalus `--warna-cyan` & `--warna-hijau`, naikkan opasitas `--surface-card` ke `0.80` | Selesai |
| 2026-11-25 | Fase 2 (2.1) | `page_login.html` | Hapus `:root` duplikat, pindahkan variabel lokal ke `.login-screen-wrapper` | Selesai |
| 2026-11-25 | Fase 1.5 & 2.2 | `css_sultan.html`, `page_*.html` | Verifikasi kontras Dark Mode & inventarisasi 67 file `page_*.html` dengan `<style>` lokal; verifikasi `page_home.html` & `sidebar.html` bersih dari `<style>` lokal | Selesai |
| 2026-11-25 | Fase 2.1 (lanjutan) | `page_landing.html` | Verifikasi `:root` di `page_landing.html` sudah memakai prefix `--lp-*` sehingga aman dari bentrok variabel global | Selesai |
| 2026-11-25 | Fase 2.3 (PTK) | `page_ptk_dashboard.html` | Hapus duplikasi `.sultan-alert` & `.alert-soft-*` yang sudah ada di `css_sultan.html` | Selesai |
| 2026-11-25 | Fase 4.1 | `page_ui_kit.html` | Verifikasi katalog komponen standar (Badge, Control Bar, Tabel, Form, Modal, Utilitas) sudah tersedia | Selesai |
| 2026-11-25 | Fase 3.2 (Buttons) | `css_sultan.html` | Hapus 9 `!important` pada `.btn-sultan-download-xl` menggunakan selector `body .btn-sultan-download-xl` dan pakai `var(--radius-md)` | Selesai |
| | | | | |
