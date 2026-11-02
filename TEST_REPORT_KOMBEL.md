# LAPORAN PENGUJIAN MODUL KOMUNITAS BELAJAR (KOMBEL)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `KomBel.gs`, `page_kombel_kelola.html`, `page_kombel_dashboard.html`, `page_kombel_master.html`, `page_kombel_info.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Baik, Terintegrasi PMM, LockService & Cache Invalidation)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul Komunitas Belajar (KomBel)**. Modul ini difungsikan untuk memfasilitasi dan memantau kegiatan komunitas belajar guru (intra-sekolah maupun antar-sekolah) dalam kerangka Implementasi Kurikulum Merdeka (IKM) dan integrasi Platform Merdeka Mengajar (PMM).

Komponen yang diuji meliputi:
1. **Pengelolaan Dokumen Bukti Karya / Kegiatan Kombel:** Pengunggahan laporan kegiatan, modul ajar bersama, dokumen refleksi, daftar hadir, dan sertifikat kegiatan kombel.
2. **Validasi Anti-Duplikasi:** Pengecekan data kombinasi NPSN, Kategori, Kelas/Tingkat, Tahun, dan Periode (`kombelCheckDuplikat`) agar tidak terjadi pengunggahan berkas ganda.
3. **Penyimpanan Terorganisasi di Google Drive:** Folder penyimpanan dokumen terpusat (`KONFIG_KOMBEL.FOLDER_ID`) dengan hak akses tautan otomatis.
4. **Alur Verifikasi Bertingkat & Notifikasi:** Admin memverifikasi keabsahan laporan kegiatan kombel (Disetujui, Revisi, Ditolak, Diproses) lengkap dengan pencatatan nama verifikator dan umpan balik catatan.
5. **Dasbor Pemantauan Progres:** Pemantauan keaktifan kombel per satuan pendidikan lengkap dengan visualisasi persentase sekolah yang telah melapor.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-KB01** | Gatekeeper NPSN | Sekolah mengunci unit kerja otomatis; Admin akses seluruh sekolah | `getKombelData(npsnFilter)` di `KomBel.gs` | Data dokumen terfilter sesuai NPSN sekolah pengunggah; Admin dapat memfilter unit manapun | **PASS** |
| **TC-KB02** | Master Kategori Kombel | Pengambilan daftar kategori kegiatan komunitas belajar | `getKombelMasterData()` membaca sheet `Master_Kategori` | Kategori kegiatan (Perencanaan, Refleksi, Berbagi Praktik Baik, dll.) termuat dinamis | **PASS** |
| **TC-KB03** | Unggah Dokumen Kegiatan | Sekolah mengunggah laporan kegiatan kombel beserta bukti PDF | `uploadKombelDokumen` dengan `LockService` (timeout 30s) | Berkas tersimpan ke Google Drive; baris tercatat dengan status awal "Diproses" | **PASS** |
| **TC-KB04** | Validasi Anti-Duplikasi | Mencegah dokumen kombel ganda pada periode yang sama | `kombelCheckDuplikat` memvalidasi npsn + kategori + kelas + tahun + periode | Sistem menolak pengajuan baru jika dokumen sebelumnya masih berstatus "Diproses" | **PASS** |
| **TC-KB05** | Perbaikan Dokumen | Memperbarui laporan yang diminta revisi oleh verifikator | `perbaikiKombelDokumen` dengan `LockService` | Berkas fisik lama otomatis dipindahkan ke Trash Drive, berkas baru tersimpan aman | **PASS** |
| **TC-KB06** | Verifikasi Laporan (Admin) | Verifikasi keabsahan kegiatan (Disetujui, Revisi, Ditolak) | `verifikasiKombelDokumen(rowId, status, catatan)` | Status baris berubah seketika, timestamp verifikasi tercatat, notifikasi terkirim | **PASS** |
| **TC-KB07** | Hapus Laporan Aman | Menghapus laporan kegiatan kombel yang keliru | `hapusKombelDokumen(rowId)` dengan `LockService` | File fisik di Google Drive dipindahkan ke Trash dan baris spreadsheet dibersihkan | **PASS** |
| **TC-KB08** | Dasbor Keaktifan Kombel | Menghitung persentase keaktifan kombel per jenjang/sekolah | `getKombelDashboardData()` di `page_kombel_dashboard.html` | Kartu ringkasan total sekolah, sudah lapor, belum lapor, dan diagram progres terhitung presisi | **PASS** |
| **TC-KB09** | Manajemen Master Kategori | Admin menambah atau menonaktifkan kategori kegiatan | `simpanKombelMaster` & `hapusKombelMaster` di `page_kombel_master.html` | Kategori baru langsung muncul di opsi form pengunggahan sekolah | **PASS** |
| **TC-KB10** | Ketahanan Konkurensi & Cache | Mengunggah dan memverifikasi saat server sibuk | `LockService` + `invalidateKombelDashboardCache` | Bebas dari *race condition*, dan data dasbor langsung ter-refresh secara atomik | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Bersih:** Seluruh 4 file HTML modul ini (`page_kombel_kelola.html`, `page_kombel_dashboard.html`, `page_kombel_master.html`, `page_kombel_info.html`) memiliki kurung kurawal script (`{}`) dan tag HTML yang seimbang.
2. **Pembersihan Otomatis Drive (*Trash Old File*):** Pada fungsi `perbaikiKombelDokumen`, file lama otomatis dibuang ke tong sampah Drive (`DriveApp.getFileById(oldId).setTrashed(true)`), mencegah pemborosan ruang penyimpanan cloud.
3. **Penyelarasan Notifikasi Pengguna:** Saat verifikator mengubah status, kolom `read by` disesuaikan sehingga pengguna sekolah yang bersangkutan langsung melihat badge notifikasi bahwa dokumennya telah ditinjau.

---

## 4. Kesimpulan
Modul **Komunitas Belajar (KomBel)** dinyatakan **Lolos Pengujian (PASS)** dengan sistem manajemen dokumen kegiatan yang rapi, proteksi konkurensi data yang andal, dan integrasi notifikasi real-time yang optimal.

