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
- [x] **2.3** Kelompokkan pembersihan berdasarkan modul:
  - [x] Modul Autentikasi & Beranda (`page_login.html`, `page_home.html`, `sidebar.html`, `index.html` — *catatan: `page_landing.html` sudah memakai prefix `--lp-*`*)
  - [x] Modul PTK (`page_ptk_dashboard.html` — duplikasi `.sultan-alert` dihapus)
  - [x] Modul Murid (`page_murid_dashboard.html` — `<style>` digabung & di-scope)
  - [x] Modul Siaba (`page_siaba_dashboard.html` — bersih dari `<style>` lokal)
  - [x] Modul SK, TPG, PPPK (`page_sk_dashboard.html`, `page_tpg_dashboard.html`, `page_pppkpw_dashboard.html`)
  - [x] Modul Lainnya (`page_setting.html`, `page_tata_naskah_dinas.html` — bersih dari `<style>` lokal)

---

### Fase 3: Pengurangan `!important` di `css_sultan.html`
> **Tujuan**: Menghentikan "perang spesifisitas" agar CSS lebih ringan, mudah ditimpa secara natural, dan tidak mudah pecah.

- [x] **3.1** Terapkan *parent selector* (misal `body.sultan-theme ...` atau `body ...`) untuk menggantikan `!important` pada komponen utama.
- [x] **3.2** Bersihkan `!important` secara bertahap per kategori komponen:
  - [x] Tombol (*Buttons*)
  - [x] Kartu (*Cards & Containers*)
  - [x] Tabel & DataTables (*Tables & Data Grid*)
  - [x] Form & Input
  - [x] Modal & Alert
  - [x] Sidebar & Navbar

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

### Fase 5: Audit & Penyempurnaan Per Komponen & Halaman
> **Tujuan**: Memastikan setiap komponen global dan setiap halaman modul tampil konsisten, rapi, dan bebas bug visual di Light Mode & Dark Mode.

- **Komponen Global (`css_sultan.html`)**:
  - [x] Sidebar & Mini Sidebar (*SIDEBAR V3* — Light/Dark Mode, Normal/Open/Mini/Hover)
  - [x] Navbar / Header (`.main-header` — terverifikasi kontras & frosted glass di Light/Dark Mode)
  - [ ] Card & Metric Card (`.card-sultan`, `.sultan-metric-card`)
  - [ ] Tabel & DataTables (`.table`, `.dataTables_wrapper`)
  - [ ] Modal & Form (`.modal-content`, `.form-control-sultan`)
  - [ ] Tombol & Badge (`.btn-sultan-*`, `.badge-sultan-*`)
- **Halaman Utama & Modul**:
  - [ ] Login (`page_login.html`)
  - [ ] Landing (`page_landing.html`)
  - [ ] Beranda (`page_home.html`)
  - [ ] Modul (`Lapbul`, `SK`, `PTK`, `Siaba`, `TPG`, `PPPK PW`, `Murid`, `Setting`)

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
| 2026-11-25 | Fase 3.2 (Buttons) | `css_sultan.html` | Hapus 21 `!important` pada `.btn-sultan-del-row` (Light & Dark Mode) menggunakan `body .btn-sultan-del-row`, `var(--radius-sm)`, dan `var(--control-height)` | Selesai |
| 2026-11-25 | Fase 3.2 (Buttons) | `css_sultan.html` | Hapus 5 `!important` pada `.btn-sultan-navy-gold` menggunakan `body .btn-sultan-navy-gold` dan pakai `var(--radius-pill)` | Selesai |
| 2026-11-25 | Fase 3.2 (Buttons) | `css_sultan.html` | Hapus 5 `!important` pada `.dark-mode .sultan-btn-tambah-row` menggunakan `body.dark-mode .sultan-btn-tambah-row` | Selesai |
| 2026-11-25 | Fase 3.2 (Alerts) | `css_sultan.html` | Hapus 25 `!important` pada `.sultan-alert` & variannya menggunakan `body .sultan-alert*` dan pakai `var(--radius-md)` | Selesai |
| 2026-11-25 | Fase 3.2 (Alerts Dark Mode) | `css_sultan.html` | Hapus 9 `!important` pada `.dark-mode .sultan-alert-*` menggunakan `body.dark-mode .sultan-alert-*` | Selesai |
| 2026-11-25 | Fase 3.2 (Alerts) | `css_sultan.html` | Hapus 6 `!important` pada `.alert-soft-danger` & `.alert-soft-warning` menggunakan `body .alert-soft-*` dan pakai `var(--radius-md)` | Selesai |
| 2026-11-25 | Fase 3.2 (Cards) | `css_sultan.html` | Hapus 10 `!important` pada `.card-sultan` & `.card-sultan-terpusat` (Light & Dark Mode) menggunakan `body .card-sultan*` | Selesai |
| 2026-11-25 | Fase 3.2 (Modals) | `css_sultan.html` | Hapus 12 `!important` pada `.modal-header-sultan-*` (`primary`, `warning`, `danger`, `success`, `info`, `dark`) menggunakan `body .modal-header-sultan-*` | Selesai |
| 2026-11-25 | Fase 3.2 (Form & Input) | `css_sultan.html` | Hapus 11 `!important` pada `.form-control-sultan` & `.sultan-upload-area` menggunakan `body .form-control-sultan` dan `var(--radius-sm)` / `var(--radius-md)` | Selesai |
| 2026-11-25 | Fase 3.2 (Form Dark Mode) | `css_sultan.html` | Hapus 13 `!important` pada `.dark-mode .form-control-sultan` & `.form-label-sultan` menggunakan `body.dark-mode ...` | Selesai |
| 2026-11-25 | Fase 3.2 (Tabel) | `css_sultan.html` | Hapus 3 `!important` pada `.sultan-status-text-*` menggunakan `body .sultan-status-text-*` | Selesai |
| 2026-11-25 | Fase 3.2 (Sidebar) | `css_sultan.html` | Hapus 8 `!important` pada `.main-sidebar`, `.sidebar-custom`, dan `.brand-link` menggunakan `body ...` / `body.dark-mode ...` | Selesai |
| 2026-11-25 | Fase 3.2 (Navbar) | `css_sultan.html` | Hapus 14 `!important` pada `.main-header` (Light & Dark Mode) menggunakan `body .main-header` & `body.dark-mode .main-header` | Selesai |
| 2026-11-25 | Fase 2.3 (Murid) | `page_murid_dashboard.html` | Gabungkan 2 blok `<style>`, hapus 5 `!important` pada skeleton, scope ke `#muriddash_loadingState`, dan pakai `var(--radius-md)` | Selesai |
| 2026-11-25 | Fase 2.3 (SK) | `page_sk_dashboard.html` | Verifikasi prefix `.dashsk-*` sudah aman, hapus `!important` & pakai `var(--radius-md)` pada `.dashsk-semester-box` | Selesai |
| 2026-11-25 | Fase 2.3 (TPG) | `page_tpg_dashboard.html` | Verifikasi `<style>` lokal sudah ter-scope ke `#tpgdash_viewRekap` & `#tpgdash_viewUnit` | Selesai |
| 2026-11-25 | Fase 2.3 (PPPK PW) | `page_pppkpw_dashboard.html` | Verifikasi `<style>` lokal sudah ter-scope ke `#pppkpwdash_viewRekap` & `#pppkpwdash_viewUnit` | Selesai |
| 2026-11-25 | Fase 2.3 (Siaba) | `page_siaba_dashboard.html` | Verifikasi `page_siaba_dashboard.html` bersih dari `<style>` lokal | Selesai |
| 2026-11-25 | Fase 2.3 (Lainnya) | `page_setting.html`, `page_tata_naskah_dinas.html` | Verifikasi halaman utama Setting & Tata Naskah Dinas bersih dari `<style>` lokal; Fase 2 selesai | Selesai |
| 2026-11-25 | Fase 4.2 (Hotfix Light Mode) | `css_sultan.html` | Perbaiki `.brand-link` di Light Mode agar background tetap transparan dan teks "SIKS-REBORN" putih terlihat jelas | Selesai |
| 2026-11-25 | Fase 4.2 (Redesign Sidebar) | `css_sultan.html` | Ubah sidebar Light Mode menjadi putih bersih dengan pill aktif maroon, parent terbuka soft-pink, dan garis vertikal submenu | Selesai |
| 2026-11-26 | Fase 4.2 (Sidebar V3) | `css_sultan.html` | Konsolidasi desain sidebar modern (SIDEBAR V3) di akhir file: tombol presisi tanpa terpotong, hierarki warna Level 1/2/3 jelas di Light & Dark Mode, dan animasi hover halus | Selesai |
| 2026-11-26 | Fase 5 (Navbar) | `css_sultan.html`, `index.html` | Audit `.main-header` & ikon navbar di Light/Dark Mode terverifikasi kontras & konsisten | Selesai |
| | | | | |
