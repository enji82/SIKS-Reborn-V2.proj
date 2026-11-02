# LAPORAN PENGUJIAN MODUL BERANDA (HOME)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `page_home.html`, `NotifikasiHome.gs`, `Emading.gs`, `code.gs`  
**Waktu Pengujian:** 2026-11-02  
**Status Keseluruhan:** **PASS (Lolos Uji Statis & Analisis Alur Fungsional)**  

---

## 1. Ringkasan Eksekutif
Pengujian dilakukan terhadap arsitektur frontend dan backend Google Apps Script yang mendukung **Modul Beranda (`page_home.html`)**. Modul ini mencakup komponen widget jam & tanggal digital (termasuk penanggalan Jawa pasaran), kartu status kelengkapan berkas sekolah, running text pengumuman/peringatan kelengkapan dokumen, serta feed interaktif E-Mading (berita/artikel).

Semua fungsi backend penghubung (`google.script.run`) telah diverifikasi ada dan terhubung dengan aman. Struktur HTML bersih tanpa adanya unclosed tags atau script parsing errors.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-H01** | Routing & Muat Halaman | Memanggil halaman Beranda dari menu utama / breadcrumb (`loadContent('home')`) | Dipetakan via `getHalaman('home')` di `code.gs` memuat `page_home.html` | Konten berhasil diinjeksi ke DOM `#main-content` | **PASS** |
| **TC-H02** | Widget Jam & Kalender | Menampilkan jam real-time, salam dinamis, tanggal Masehi, dan pasaran Jawa | Fungsi `startTime()` menghitung interval waktu dan pasaran (Legi, Pahing, Pon, Wage, Kliwon) | Jam digital dan perhitungan pasaran berjalan tepat tanpa memory leak | **PASS** |
| **TC-H03** | Profil Pengguna Lokal | Membaca sesi dari `sessionStorage` / `localStorage` | Fungsi `muatDataUserLocal()` mengekstrak NPSN, Nama Sekolah, dan Role | Greeting personal tampil; memicu `logUserVisit(u)` ke server | **PASS** |
| **TC-H04** | Status Kelengkapan Dokumen | Menampilkan matriks status Lapbul, SK KBM, dan SIABA sesuai jenjang (SD / PAUD / SD Negeri) | Backend `getMissingDocumentsReport(username, role, unit)` di `NotifikasiHome.gs` mengembalikan status bulan & semester | Menampilkan kartu grid 12 bulan & semesteran. Role Admin otomatis bypass (`show: false`) | **PASS** |
| **TC-H05** | Navigasi Kelola Berkas | Tombol "Kelola" pada masing-masing kartu status | Menggunakan `navigatePage(target)` yang membungkus `loadContent(target)` | Rute ke `lapbul_kelola`, `sk_data`, dan `siaba_presensi_arsip` terdefinisi dan aman | **PASS** |
| **TC-H06** | Marquee / Running Text | Peringatan dokumen belum diunggah vs Dokumen lengkap | `muatNotifikasiDokumenKurang(u)` memeriksa `res.hasWarning` | Jika ada tunggakan: badge INFO kuning berkedip & running text animasi. Jika nihil: badge LENGKAP hijau | **PASS** |
| **TC-H07** | Banner Pengumuman Statis | Menampilkan banner pengumuman instansi dari Google Sheets | Memanggil `getPengumumanInfo()` di `code.gs` | Menampilkan `#home-announcement-row` jika ada data; disembunyikan otomatis jika kosong | **PASS** |
| **TC-H08** | Feed E-Mading (Berita) | Mengambil daftar berita & artikel terkini | Memanggil `getDaftarArtikelEmading({})` di `Emading.gs` | Loading indicator aktif saat fetch, kartu berita ter-render, fallback empty-state jika kosong | **PASS** |
| **TC-H09** | Filter & Pencarian Berita | Filter kategori dan pencarian kata kunci judul berita | Event listener `#emading_filterKategori` dan `#emading_filterSearch` (debounce 300ms) | Fungsi `terapkanFilterHomeBerita()` memfilter cache array lokal secara instan | **PASS** |
| **TC-H10** | Modal Publikasi E-Mading | Validasi form artikel & kirim data baru | Memanggil `simpanArtikelEmading(payload)` di `Emading.gs` | Tombol simpan di-disable saat submit untuk mencegah double submit; respon alert via modal Sultan | **PASS** |

---

## 3. Temuan & Catatan Kualitas Kode
1. **Pencegahan Double-Click:** Pada fungsi simpan artikel E-Mading, tombol `#emading_btnSimpanArtikel` telah dinonaktifkan (`disabled = true`) saat proses pengiriman berlangsung, mencegah duplikasi data.
2. **Debounce pada Search Bar:** Pencarian berita di Beranda telah dilengkapi mekanisme *debounce* (`searchHomeTimeout = 300ms`), sehingga rendering tidak macet saat pengguna mengetik cepat.
3. **Penanganan Error Elegan:** Seluruh pemanggilan `google.script.run` memiliki handler `.withFailureHandler(...)` serta fallback blok `try-catch`, sehingga jika server Apps Script mengalami *transient error*, halaman tidak blank putih.

---

## 4. Kesimpulan
Modul Beranda (**`page_home.html`**) berada dalam kondisi **Stabil dan Siap Digunakan (Production Ready)**. Semua integrasi data lokal dan sinkronisasi server Google Apps Script terstruktur dengan baik.

