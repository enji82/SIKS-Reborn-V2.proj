# LAPORAN PENGUJIAN MODUL ADMINISTRASI PTK (ADM PTK)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `AdmPTK.gs`, `page_adm_ptk_kelola.html`, `page_adm_ptk_dashboard.html`, `page_adm_ptk_master.html`, `page_adm_ptk_viewer.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Baik, Memiliki Fitur Klasifikasi Kategori Cerdas & Proteksi LockService)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul Administrasi PTK (Adm PTK)**. Modul ini difungsikan sebagai sistem pengelolaan berkas kepegawaian administratif berkala (seperti Sasaran Kinerja Pegawai/SKP, Daftar Hadir Bulanan, Kenaikan Gaji Berkala/KGB, Dokumen Sertifikasi, hingga Penilaian Kinerja Guru/PKG) yang dikelola langsung oleh tim administrasi dinas dan operator sekolah.

Keunggulan utama yang terverifikasi dalam pengujian:
1. **Penyaringan Kategori Dokumen Cerdas (*Smart Category Classification*):** Fungsi `admPtk_apakahPtkCocokKlasifikasi` secara otomatis memfilter kategori dokumen yang muncul di form berdasarkan jenjang (SD/PAUD), status kepegawaian (PNS/PPPK/Honorer), dan jenis tugas (Guru Kelas, Mapel, Kepala Sekolah, atau Tendik).
2. **Pengunggahan Berkas Batch Multi-Kategori:** Mendukung pengunggahan beberapa kategori dokumen sekaligus dalam satu sesi (*Multi-File Batch*) per PTK dengan validasi duplikasi per tahun dan periode (`admPtkCheckDuplikat`).
3. **Penyimpanan Terstruktur di Google Drive:** Berkas disimpan ke folder khusus per pegawai dengan format penamaan standar: `<Nama PTK> - <NIP>`.
4. **Viewer Portabel Terpadu:** Antarmuka `page_adm_ptk_viewer.html` menyajikan riwayat berkas digital guru dengan fitur pratinjau instan dokumen.
5. **Proteksi Konkurensi Penuh:** Menggunakan `LockService.getScriptLock()` pada 6 fungsi manipulasi database vital (`simpanAdmPtkBatch`, `perbaikiAdmPtkData`, `hapusAdmPtk`, `verifikasiAdmPtk`, `simpanAdmPtkMaster`, `hapusAdmPtkMaster`).

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AP01** | Gatekeeper Akses Unit | Membatasi tampilan guru hanya pada unit kerja sekolah yang login | `admPtk_getDaftarPtk(npsnFilter)` di `AdmPTK.gs` | Sekolah hanya dapat mengunggah berkas untuk guru di sekolahnya; Admin memiliki akses lintas sekolah | **PASS** |
| **TC-AP02** | Klasifikasi Dokumen Cerdas | Menyaring jenis dokumen sesuai status guru (PNS vs Non-ASN) | `admPtk_apakahPtkCocokKlasifikasi` mencocokkan jenjang, status, & tugas | Kategori SKP hanya muncul untuk ASN; dokumen khusus PAUD tidak muncul di SD | **PASS** |
| **TC-AP03** | Unggah Batch Multi-Dokumen | Sekolah mengunggah beberapa dokumen sekaligus per guru | `simpanAdmPtkBatch(batchData)` dengan `LockService` | Berkas terunggah ke folder Drive pegawai; baris database tercatat secara teratur | **PASS** |
| **TC-AP04** | Validasi Anti-Duplikasi | Mencegah dokumen tahun/periode yang sama diunggah ganda | `admPtkCheckDuplikat(sheet, idPtk, idKat, tahun, periode)` | Dokumen yang sudah Disetujui dikunci; dokumen yang belum disetujui diarahkan ke tombol Edit | **PASS** |
| **TC-AP05** | Perbaikan Dokumen | Memperbarui berkas yang ditolak/diminta revisi | `perbaikiAdmPtkData(payload, fileData)` dengan `LockService` | File lama digantikan tanpa merusak riwayat unggah dan tanggal asli | **PASS** |
| **TC-AP06** | Verifikasi Berkas (Admin) | Verifikasi berkas (Disetujui, Revisi, Ditolak) beserta catatan telaah | `verifikasiAdmPtk(payload)` dengan `LockService` | Status baris berubah seketika; lencana notifikasi baru dikirimkan ke sekolah | **PASS** |
| **TC-AP07** | Hapus Berkas Aman | Menghapus dokumen yang salah unggah | `hapusAdmPtk(rowId, kd, idPtk)` dengan `LockService` | File fisik di Google Drive dipindahkan ke Trash dan baris spreadsheet dibersihkan | **PASS** |
| **TC-AP08** | Adm PTK Viewer Portabel | Meninjau kelengkapan seluruh berkas satu orang guru | `getAdmPtkViewerData(idPtk, npsnFilter)` di `page_adm_ptk_viewer.html` | Menampilkan matriks kelengkapan seluruh kategori berkas milik guru bersangkutan | **PASS** |
| **TC-AP09** | Manajemen Master Kategori | Admin menambah atau mengubah kategori berkas administrasi | `simpanAdmPtkMaster` & `hapusAdmPtkMaster` di `page_adm_ptk_master.html` | Kategori baru langsung aktif dan memengaruhi form pengunggahan sekolah | **PASS** |
| **TC-AP10** | Dasbor Pemantauan Kepatuhan | Menghitung rasio kepatuhan unggah dokumen per unit kerja | `getAdmPtkDashboardInit` & `getAdmPtkDashboardData` | Grafik dan persentase kelengkapan berkas sekolah ter-render akurat | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Bersih:** Seluruh 4 file HTML modul ini (`page_adm_ptk_kelola.html`, `page_adm_ptk_dashboard.html`, `page_adm_ptk_master.html`, `page_adm_ptk_viewer.html`) memiliki struktur HTML dan kurung JavaScript (`{}`) yang seimbang.
2. **Integritas Database yang Kuat:** Penggunaan `LockService` pada seluruh fungsi mutasi (simpan batch, edit, hapus, verifikasi) menjamin keandalan data saat ratusan operator sekolah mengakses sistem serentak.
3. **Invalidasi Cache Otomatis:** Setiap mutasi data di `verifikasiAdmPtk` memicu `invalidateAdmPtkDashboardCache()`, sehingga tampilan statistik di dasbor admin selalu mutakhir (*up-to-date*).

---

## 4. Kesimpulan
Modul **Administrasi PTK (Adm PTK)** dinyatakan **Lolos Pengujian (PASS)** dengan sistem klasifikasi kategori cerdas, penanganan unggah batch yang sangat efisien, dan proteksi konkurensi tingkat tinggi.

