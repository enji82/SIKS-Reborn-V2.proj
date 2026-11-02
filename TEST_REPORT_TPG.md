# LAPORAN PENGUJIAN MODUL TPG (TUNJANGAN PROFESI GURU & PERBAIKAN GAJI)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `TPG_Perbaikan.gs`, `page_tpg_perbaikan_gaji.html`, `page_tpg_dashboard.html`, `page_tpg_peraturan.html`  
**Waktu Pengujian:** 2026-11-02  
**Status Keseluruhan:** **PASS (Sangat Baik, Memiliki Fitur Toggle Access Window & Proteksi LockService)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul TPG (Tunjangan Profesi Guru)** yang secara spesifik mengelola rekonsiliasi data usulan perbaikan gaji/SKTP guru sertifikasi, pengelolaan masa sanggah/jadwal pengusulan melalui fitur pembatasan akses (*Access Window Toggle*), pengunggahan berkas bukti (SK Kenaikan Pangkat, SK KGB, Amprah Gaji/BPE), verifikasi bertingkat, serta dasbor pemantauan kelengkapan pengusulan per sekolah.

Modul ini memiliki kontrol keamanan operasional yang sangat baik:
1. **Fitur Pengendali Akses Sekolah (*Window Access Control*):** Admin dinas dapat membuka atau menutup keran pengusulan tambah data maupun edit data untuk seluruh sekolah secara real-time (`tpgPg_toggleAccess`).
2. **Auto-Populate Data Guru:** Saat sekolah memilih nama guru, form secara otomatis mengunci NIP, NUPTK, dan menarik riwayat gaji pokok lama dari database referensi (`tpg_getGuruOptions`).
3. **Proteksi Konkurensi Database:** Fungsi `tpg_savePerbaikan` dan `tpg_updatePerbaikan` menggunakan `LockService.getScriptLock()` untuk menjamin integritas urutan nomor pengajuan dan sel spreadsheet.
4. **Alur Verifikasi Komprehensif:** Mendukung 4 status verifikasi resmi (Disetujui, Revisi, Ditolak, Menunggu) dengan catatan hasil telaah admin.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TPG01** | Gatekeeper Akses Sekolah | Sekolah mengunci unit kerja otomatis; Admin bebas memilih semua unit | `getUnitKerjaByNPSN` & `tpg_getDaftarUnit` | Dropdown unit kerja sekolah terkunci sesuai sesi; Admin dapat beralih ke unit manapun | **PASS** |
| **TC-TPG02** | Saklar Akses Tambah / Edit | Admin menutup akses pengusulan untuk sekolah menjelang cut-off | `tpgPg_toggleAccess(isAdmin, type, status)` di `TPG_Perbaikan.gs` | Tombol Tambah/Edit di sisi sekolah otomatis terkunci (*disabled*) dengan label "DITUTUP". Admin tetap memiliki bypass akses | **PASS** |
| **TC-TPG03** | Auto-Fill Guru & NUPTK | Memilih nama guru dari daftar dropdown | `tpg_getGuruOptions(unitKerja)` di `TPG_Perbaikan.gs` | NIP dan NUPTK otomatis terisi ke form; fallback aman jika guru pindahan | **PASS** |
| **TC-TPG04** | Pengajuan Usulan Baru | Mengajukan perbaikan gaji/SKTP dengan unggahan bukti fisik PDF | `tpg_savePerbaikan(formData)` dengan `LockService` | File PDF tersimpan rapi ke folder Drive TPG; baris baru ditambahkan dengan status awal "Diproses" | **PASS** |
| **TC-TPG05** | Perubahan / Revisi Usulan | Memperbarui nominal gaji atau mengganti berkas lampiran | `tpg_updatePerbaikan(formData)` dengan `LockService` | Sel baris spreadsheet diperbarui atomik tanpa memicu duplikasi baris | **PASS** |
| **TC-TPG06** | Verifikasi Usulan (Admin) | Admin menyetujui, meminta revisi, atau menolak usulan perbaikan | `tpg_verifikasiPerbaikan(id, status, catatan, admin)` | Status dan catatan verifikasi tersimpan; badge status di tabel berubah seketika (*Zero Blink*) | **PASS** |
| **TC-TPG07** | Hapus Usulan | Menghapus pengajuan perbaikan yang keliru | `tpg_deletePerbaikan(id)` | Baris usulan dihapus dari spreadsheet setelah konfirmasi modal | **PASS** |
| **TC-TPG08** | Dasbor & Metrik Kelengkapan | Menghitung rasio pengusulan TPG per jenjang/unit | `tpg_getDashboardData('SEMUA', forceRefresh)` | Kartu ringkasan total pegawai, sudah verifikasi, diproses, revisi, dan ditolak tampil akurat | **PASS** |
| **TC-TPG09** | Halaman Regulasi / Peraturan | Menampilkan panduan dan dasar hukum TPG | `page_tpg_peraturan.html` | Dokumen juknis dan regulasi resmi tampil informatif untuk panduan guru | **PASS** |
| **TC-TPG10** | Ketahanan Konkurensi Data | Multi-sekolah submit bersamaan saat periode pengusulan dibuka | `LockService.getScriptLock()` dengan timeout 15 detik | Seluruh transaksi antre tertib tanpa ada berkas yang hilang atau menimpa baris lain | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Valid:** Seluruh file HTML (`page_tpg_perbaikan_gaji.html`, `page_tpg_dashboard.html`, `page_tpg_peraturan.html`) memiliki kurung kurawal script (`{}`) yang seimbang dan tag HTML yang rapi.
2. **Kesiapan Menghadapi Deadline (*Cut-Off Ready*):** Fitur `tpgPg_toggleAccess` merupakan keunggulan penting yang memudahkan tim admin dinas mengunci sistem secara instan saat batas waktu rekonsiliasi gaji ditutup.
3. **Penyimpanan Drive Otomatis:** Folder Google Drive untuk bukti fisik berkas TPG otomatis dibuat berdasarkan struktur tahun anggaran sehingga tidak bercampur dengan berkas umum lainnya.

---

## 4. Kesimpulan
Modul **TPG (Perbaikan Gaji & SKTP)** dinyatakan **Lolos Pengujian (PASS)** dan memiliki tata kelola berkas serta kontrol batas waktu pengusulan yang sangat baik.

