# LAPORAN PENGUJIAN MODUL PENGATURAN & MONITORING AKTIVITAS
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `code.gs`, `page_setting.html`, `page_monitoring.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Baik, Terintegrasi Otentikasi, Log Realtime & Visualisasi Analytics)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada dua modul penopang operasional sistem:
1. **Modul Pengaturan Sistem (`page_setting.html`):** Pengelolaan akun pengguna (User Management), penetapan Role & Hak Akses (Admin, Korwil, Verifikator, Sekolah SDN/SDS/PAUD), serta pengaturan pengumuman/running text global portal.
2. **Modul Monitoring Aktivitas (`page_monitoring.html`):** Audit trail penggunaan aplikasi, analisis tren login harian/bulanan (hari kerja vs hari libur), ranking pengguna paling aktif (*Top Active Users*), serta pelacakan sekolah pasif yang belum pernah login (*Passive Users*).

Seluruh fungsi pendukung di `code.gs` terbukti lengkap dan terhubung dengan aman.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Modul | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ST01** | Pengaturan User | Mengambil daftar pengguna terdaftar | `getDaftarUser()` di `code.gs` membaca sheet `USER_DB -> USERS` | Menampilkan username, nama lengkap, role, unit kerja, status aktif/blokir | **PASS** |
| **TC-ST02** | Tambah & Edit User | Menyimpan akun baru atau memperbarui password dan role | `simpanUser(payload)` di `code.gs` | Menambah/memperbarui baris spreadsheet secara atomik; hashing/proteksi password | **PASS** |
| **TC-ST03** | Hapus Pengguna | Menghapus akun pengguna dari sistem | `hapusUser(username)` di `code.gs` | Menghapus baris akun pengguna setelah konfirmasi modal | **PASS** |
| **TC-ST04** | Running Text Pengumuman | Mengatur teks berita berjalan dan status aktif/non-aktif | `saveRunningText(txt, status)` & `getPengumumanSetting()` | Teks pengumuman di sheet `SETTING` terbarui dan langsung muncul di Beranda | **PASS** |
| **TC-MO01** | Perekaman Log Kunjungan | Setiap pengguna membuka beranda, kunjungan tercatat | `logUserVisit(userData)` di `code.gs` | Tercatat di `LOG_ACCESS`: Timestamp, Nama User, Role, Jenis Hari (Efektif/Libur) | **PASS** |
| **TC-MO02** | Deteksi Hari Libur Otomatis | Mengidentifikasi apakah kunjungan terjadi di hari libur | Pengecekan `now.getDay()` (Sabtu/Minggu) dan sheet `DATA_LIBUR` | Otomatis melabeli "Hari Libur" jika jatuh pada akhir pekan atau tanggal merah | **PASS** |
| **TC-MO03** | Visualisasi Grafik Aktivitas | Menampilkan grafik batang & garis tren kunjungan | `getMonitoring_Charts()` di `page_monitoring.html` (Chart.js) | Grafik tren harian, proporsi hari kerja vs libur, dan perbandingan role ter-render | **PASS** |
| **TC-MO04** | Analisis Top Active Users | Mengetahui pengguna/operator yang paling aktif mengakses sistem | `getMonitoring_Users()` menghitung frekuensi log | Menampilkan 10 pengguna teratas dengan medali emas, perak, perunggu | **PASS** |
| **TC-MO05** | Deteksi Pengguna Pasif | Membandingkan seluruh akun terdaftar dengan log akses | `getMonitoring_Users()` melakukan `diff` dengan master user | Menampilkan daftar sekolah yang belum pernah login untuk tindak lanjut pembinaan | **PASS** |
| **TC-MO06** | Status Online Realtime | Mengetahui siapa saja yang sedang aktif saat ini | `updateOnlineStatus()` di `code.gs` membaca timestamp < 5 menit | Indikator pengguna online bekerja secara responsif | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Bersih:** File `page_setting.html` dan `page_monitoring.html` memiliki kurung kurawal script (`{}`) dan tag HTML yang seimbang.
2. **Kinerja Arsitektur Jalur Ganda (Dual-Thread Client):** Halaman monitoring memisahkan pemanggilan data menjadi 2 alur asinkron:
   - Jalur 1: `monitoring_loadChartsAndStats()` untuk grafik analitik.
   - Jalur 2: `monitoring_loadUserTables()` untuk data tabel pengguna aktif dan pasif.
   Pemisahan ini membuat antarmuka terasa sangat cepat karena grafik langsung muncul tanpa harus menunggu perhitungan pemetaan ratusan user selesai.
3. **Penyembuhan Mandiri Sheet Log (*Auto-Create Sheet*):** Jika sheet `LOG_ACCESS` belum ada atau terhapus, fungsi `logUserVisit` secara otomatis membuatnya kembali lengkap dengan header kolom.

---

## 4. Kesimpulan
Modul **Pengaturan** dan **Monitoring Aktivitas** dinyatakan **Lolos Pengujian (PASS)** dan berfungsi optimal sebagai pusat kendali keamanan akun serta audit analitik pemanfaatan portal SIKS-Reborn V2.

