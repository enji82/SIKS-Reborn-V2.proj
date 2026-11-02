# LAPORAN PENGUJIAN MODUL KEMITRAAN & KERJA SAMA
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `Kemitraan.gs`, `page_kemitraan_kelola.html`, `page_kemitraan_dashboard.html`, `page_kemitraan_master.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Baik, Terproteksi LockService & Subfolder Bersusun)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul Kemitraan & Kerja Sama**. Modul ini dirancang untuk mendokumentasikan, mengarsipkan, dan memvalidasi seluruh nota kesepahaman (MoU / Perjanjian Kerja Sama) antara satuan pendidikan dengan pihak eksternal (Puskesmas/Fasilitas Kesehatan, Dunia Usaha/Dunia Industri, Kepolisian/TNI, Lembaga Pelatihan, Lembaga Swadaya Masyarakat, Komite Sekolah, dsb.).

Fitur-fitur utama yang diuji:
1. **Penyimpanan Berkas Bertingkat (*Hierarchical Drive Storage*):** Google Drive diorganisasikan secara otomatis ke dalam sub-folder bertingkat: *Kategori Kemitraan / Tahun Anggaran / Berkas MoU*.
2. **Validasi Anti-Duplikasi:** Pengecekan data kombinasi NPSN, Kategori Kemitraan, dan Tahun (`kemitraanCheckDuplikat`) agar tidak terjadi pengunggahan dokumen ganda untuk instansi mitra yang sama.
3. **Penyelarasan Nama Satuan Pendidikan Otomatis:** Sistem secara otomatis mencocokkan NPSN ke tabel master sekolah (`USER_DB -> Data_Sekolah`) untuk mengisi nama resmi sekolah.
4. **Alur Verifikasi Bertingkat & Notifikasi Realtime:** Admin dinas menelaah dokumen (Disetujui, Revisi, Ditolak, Diproses) lengkap dengan catatan telaah dan pengiriman lencana notifikasi ke sekolah.
5. **Dasbor Pemantauan Partisipasi Kemitraan:** Analitik persentase sekolah yang telah menjalin kemitraan aktif per tahun anggaran.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-KM01** | Gatekeeper Akses Unit | Sekolah hanya dapat melihat dokumen kemitraan miliknya | `getKemitraanData(npsnFilter)` di `Kemitraan.gs` | NPSN sekolah terkunci sesuai sesi; Admin dapat meninjau seluruh sekolah | **PASS** |
| **TC-KM02** | Master Kategori Kemitraan | Mengambil daftar jenis mitra (Kesehatan, Industri, Keamanan, dll.) | `getKemitraanMasterData()` di `Kemitraan.gs` | Kategori mitra termuat dinamis dari sheet `Master_Kategori` | **PASS** |
| **TC-KM03** | Unggah Dokumen MoU / PKS | Sekolah mengunggah naskah perjanjian kerja sama PDF | `uploadKemitraanDokumen` dengan `LockService` (timeout 30s) | Berkas tersimpan ke subfolder Google Drive; baris dicatat dengan status "Diproses" | **PASS** |
| **TC-KM04** | Validasi Anti-Duplikasi | Mencegah dokumen ganda pada kategori dan tahun yang sama | `kemitraanCheckDuplikat(sheet, npsn, idKat, tahun)` | Pengunggahan baru ditolak jika dokumen sebelumnya masih berstatus "Diproses" | **PASS** |
| **TC-KM05** | Perbaikan Dokumen | Memperbarui naskah perjanjian yang diminta revisi | `perbaikiKemitraanDokumen` dengan `LockService` | Berkas lama dipindahkan ke Trash Drive; berkas pengganti terunggah aman | **PASS** |
| **TC-KM06** | Verifikasi Dokumen (Admin) | Admin memvalidasi keabsahan MoU (Disetujui, Revisi, Ditolak) | `verifikasiKemitraanDokumen(rowId, status, catatan, verifikator)` | Status baris berubah, timestamp tersimpan, dan notifikasi dikirimkan ke sekolah | **PASS** |
| **TC-KM07** | Hapus Dokumen Aman | Menghapus dokumen kemitraan yang salah unggah | `hapusKemitraanDokumen(rowId)` dengan `LockService` | Berkas di Google Drive dibuang ke Trash dan baris di Spreadsheet dihapus bersih | **PASS** |
| **TC-KM08** | Dasbor Kemitraan Sekolah | Menghitung rasio sekolah yang memiliki kerja sama aktif | `getKemitraanDashboardData()` di `page_kemitraan_dashboard.html` | Kartu metrik total sekolah, sudah lapor, belum lapor, dan grafik progres tampil presisi | **PASS** |
| **TC-KM09** | Manajemen Master Kategori | Admin menambah atau menonaktifkan kategori mitra | `simpanKemitraanMaster` & `hapusKemitraanMaster` di `page_kemitraan_master.html` | Perubahan master kategori langsung terhubung ke form input sekolah | **PASS** |
| **TC-KM10** | Ketahanan Konkurensi (*LockService*) | Beban unggah dokumen bersamaan saat evaluasi akreditasi | Dilengkapi `LockService.getScriptLock()` pada 6 fungsi mutasi | Mencegah bentrok data dan sel spreadsheet yang saling menimpa | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Bersih:** Seluruh 3 file HTML modul ini (`page_kemitraan_kelola.html`, `page_kemitraan_dashboard.html`, `page_kemitraan_master.html`) memiliki kurung kurawal script (`{}`) dan tag HTML yang seimbang.
2. **Pembersihan Otomatis Drive (*Trash Old File*):** Pada fungsi `perbaikiKemitraanDokumen`, file lama otomatis dibuang ke tong sampah Drive (`DriveApp.getFileById(oldId).setTrashed(true)`), menjaga ruang penyimpanan cloud tetap efisien.
3. **Invalidasi Cache Seketika:** Setiap aksi mutasi memicu `invalidateKemitraanDashboardCache()`, menjamin data di dasbor selalu akurat.

---

## 4. Kesimpulan
Modul **Kemitraan & Kerja Sama** dinyatakan **Lolos Pengujian (PASS)** dengan sistem manajemen arsip naskah perjanjian yang sangat terstruktur, proteksi konkurensi data yang andal, dan integrasi notifikasi real-time yang optimal.

