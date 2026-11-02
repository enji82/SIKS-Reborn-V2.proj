# LAPORAN PENGUJIAN MODUL JUMLAH MURID
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `Murid.gs`, `AdmMurid.gs`, `page_murid_dashboard.html`, `page_murid_sd_kelas.html`, `page_murid_sd_rombel.html`, `page_murid_sd_agama.html`, `page_murid_paud_rombel.html`, `page_murid_paud_jenis_kelamin.html`, `page_murid_peraturan.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Baik & Matang / Analytics Ready)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul Jumlah Murid**. Modul ini berfungsi sebagai pusat rekapitulasi data demografi peserta didik yang dihimpun secara otomatis dari instrumen Laporan Bulanan (Lapbul) sekolah.

Modul ini mencakup dimensi agregasi data yang sangat rinci:
1. **Rekapitulasi SD Multi-Dimensi:**
   - Rekap Murid per Kelas (Kelas 1 s.d. 6 + Gender L/P) dengan matriks 27 kolom.
   - Rekap Murid per Rombel (67 kolom data).
   - Rekap Murid per Pemeluk Agama (Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu per tingkat kelas) hingga 132 kolom data (`Murid SD per Agama`).
2. **Rekapitulasi PAUD / TK / KB / SPS:**
   - Rekap Murid PAUD per Rombel.
   - Rekap Murid PAUD berdasarkan Jenis Kelamin (L/P) dan kelompok usia.
3. **Dasbor Analitik Eksekutif:**
   - Metrik komparasi sekolah negeri vs swasta.
   - Grafik tren pertumbuhan siswa 12 bulan kalender (`Chart.js`).
   - Mode Rekapitulasi Wilayah (Kecamatan/Korwil) vs Mode Unit Sekolah Mandiri.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MR01** | Rekap Murid SD per Kelas | Mengambil matriks siswa per kelas 1–6 (L/P) | `getDataMuridSDKelas()` di `Murid.gs` membaca range A3:AA | Data tabel ter-render presisi lengkap dengan baris total akumulatif per kolom | **PASS** |
| **TC-MR02** | Rekap Murid SD per Rombel | Mengambil rincian rombongan belajar tiap sekolah | `getDataMuridSDRombel()` di `Murid.gs` membaca range A4:BO (67 kolom) | Matriks rombel dan rasio siswa per kelas tampil tanpa pergeseran kolom | **PASS** |
| **TC-MR03** | Rekap Murid SD per Agama | Agregasi siswa menurut 6 agama resmi per tingkat kelas | `getDataMuridSDAgama()` di `Murid.gs` membaca 132 kolom data | Agregasi pemeluk agama Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu sinkron | **PASS** |
| **TC-MR04** | Rekap PAUD per Rombel | Mengambil rombel TK-A, TK-B, KB, dan SPS | `getDataMuridPAUDRombel()` di `Murid.gs` | Data rombel PAUD terpetakan sesuai entitas satuan pendidikan | **PASS** |
| **TC-MR05** | Rekap PAUD Jenis Kelamin | Proporsi siswa laki-laki vs perempuan PAUD | `getDataMuridPAUDJK()` di `Murid.gs` | Gender siswa PAUD terhitung akurat untuk perencanaan bantuan operasional (BOSP) | **PASS** |
| **TC-MR06** | Dasbor Murid Terpadu | Visualisasi kartu ringkasan dan grafik tren | `getDashboardMuridData(thn, bln, npsn, unit)` di `page_murid_dashboard.html` | Kartu angka ringkasan dan grafik garis 12 bulan (Chart.js) ter-render mulus | **PASS** |
| **TC-MR07** | Filter Fleksibel Dasbor | Beralih antara mode Rekapitulasi Wilayah dan Mode Unit Sekolah | `muriddash_updateViewTab()` & filter dinamis sekolah | Mode rekap menampilkan total satu kecamatan; mode unit menyaring satu sekolah terpilih | **PASS** |
| **TC-MR08** | Regulasi & Juknis Rombel | Menampilkan dasar hukum batas maksimal rombel & murid | `murid_getPeraturanFiles()` di `page_murid_peraturan.html` | Dokumen Permendikbud terkait standar sarpras rombel termuat informatif | **PASS** |
| **TC-MR09** | Integrasi Administrasi Murid (SPMB & Ijazah) | Modul adm murid pelengkap di backend | Didukung oleh fungsi-fungsi di `AdmMurid.gs` | Pelacakan ijazah, arsip TKA, dan SPMB terintegrasi tanpa redundansi | **PASS** |
| **TC-MR10** | Ketahanan Render Tabel Lebar | Menampilkan tabel hingga 132 kolom data | Dukungan DataTables + Sticky Column di `page_murid_sd_*.html` | Kolom nama sekolah tetap terkunci (*sticky-left*) saat digulir horizontal | **PASS** |

---

## 3. Catatan Kualitas Kode & Analisis
1. **Perhitungan Kolom Sangat Rapi:** Pada `getDataMuridSDAgama()`, pemetaan kolom hingga 132 kolom (`A4:EB`) telah diperhitungkan secara eksak (6 kolom statis + 7 kelompok tingkat $\times$ 18 kolom agama), sehingga tidak ada risiko *out-of-bounds array*.
2. **Kinerja Client-Side Responsive:** Halaman tabel telah dilengkapi pembungkus `.table-responsive` dan sticky column, memungkinkan pengguna menganalisis puluhan kolom langsung dari browser tanpa tabel terpotong.
3. **Skeleton Loading:** Dasbor murid telah dilengkapi efek skeleton loading (*SultanUI Lottery*), memberikan *feedback* visual yang nyaman bagi pengguna saat menunggu rekapitulasi data dari Google Cloud.

---

## 4. Kesimpulan
Modul **Jumlah Murid** dinyatakan **Lolos Pengujian (PASS)** dengan keandalan analitik yang sangat tinggi, visualisasi grafik yang interaktif, dan akurasi pemetaan demografi siswa yang presisi.

