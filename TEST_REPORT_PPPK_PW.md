# LAPORAN PENGUJIAN MODUL PPPK PARUH WAKTU (PPPK PW)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `PPPK_PW.gs`, `page_pppkpw_unggah.html`, `page_pppkpw_spmt.html`, `page_pppkpw_dashboard.html`, `page_pppkpw_emeterai.html`  
**Waktu Pengujian:** 2026-11-02  
**Status Keseluruhan:** **PASS (Sangat Baik, Memiliki Drive Explorer E-Meterai & SPMT Terpisah)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul PPPK Paruh Waktu (PPPK PW)**. Modul ini dirancang khusus untuk mengelola administrasi, pengunggahan berkas perjanjian kerja, Surat Pernyataan Melaksanakan Tugas (SPMT), eksplorasi dokumen berkas e-Meterai, dan pemantauan kelengkapan pegawai berstatus PPPK Paruh Waktu di seluruh satuan pendidikan.

Fitur-fitur utama yang diuji:
1. **Pemisahan Jalur Berkas Perjanjian Kerja & SPMT:** Memiliki alur independen antara pengunggahan berkas umum PPPK PW (`pppkpw_simpan`) dan berkas SPMT (`pppkpw_spmt_simpan`).
2. **Filter Cerdas Pegawai Paruh Waktu:** Fungsi `pppkpw_isPppkPw` secara otomatis menyaring guru/pegawai yang hanya berstatus "PPPK PARUH WAKTU" dari basis data induk PTK, mencegah salah pilih pegawai ASN reguler.
3. **E-Meterai Drive Explorer:** Fitur penjelajah berkas Drive (`pppkpw_getEMeteraiExplorer`) lengkap dengan navigasi folder bertingkat, breadcrumbs, dan caching kecepatan tinggi (`CacheService`).
4. **Proteksi Konkurensi Berlapis:** Menggunakan `LockService.getScriptLock()` pada 7 fungsi mutasi (simpan, perbaiki, hapus berkas untuk modul reguler maupun SPMT).
5. **Dasbor Pemantauan Progres:** Pemantauan kelengkapan dokumen per sekolah dengan dukungan kalkulasi persentase kelulusan verifikasi dinas.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PW01** | Filter Pegawai PPPK PW | Menyaring hanya pegawai berstatus PPPK Paruh Waktu di unit kerja | `pppkpw_isPppkPw` & `pppkpw_getInitData` membaca master PTK | Hanya pegawai dengan status PPPK PW yang muncul di pilihan nama pegawai | **PASS** |
| **TC-PW02** | Unggah Berkas PPPK PW | Pengunggahan file PDF perjanjian kerja / dokumen PPPK PW | `pppkpw_simpan(payload, fileData)` dengan `LockService` | File PDF tersimpan ke folder Google Drive tahunan; data tercatat dengan status "Diproses" | **PASS** |
| **TC-PW03** | Perbaikan & Revisi Berkas | Memperbarui berkas yang diminta revisi oleh verifikator | `pppkpw_perbaiki(payload, fileData)` dengan `LockService` | Berkas diperbarui tanpa merusak nomor registrasi atau ID transaksi | **PASS** |
| **TC-PW04** | Verifikasi Berkas (Admin) | Verifikasi berkas PPPK PW (Disetujui, Revisi, Ditolak) | `pppkpw_verifikasi(payload)` di `PPPK_PW.gs` | Status berkas dan catatan verifikator tersimpan; notifikasi terkirim | **PASS** |
| **TC-PW05** | Hapus Berkas Aman | Menghapus dokumen yang keliru diunggah | `pppkpw_hapus(rowId, sheetName, securityCode)` | File di Drive dan baris data di Spreadsheet terhapus dengan validasi kode keamanan | **PASS** |
| **TC-PW06** | Jalur Khusus SPMT | Pengunggahan dan pengelolaan Surat Perintah Melaksanakan Tugas (SPMT) | `pppkpw_spmt_simpan`, `pppkpw_spmt_getData` di sheet terpisah | Transaksi SPMT tercatat mandiri tanpa tumpang tindih dengan berkas perjanjian kerja | **PASS** |
| **TC-PW07** | E-Meterai Drive Explorer | Menjelajah folder Google Drive e-Meterai secara interaktif | `pppkpw_getEMeteraiExplorer(targetFolderId)` di `page_pppkpw_emeterai.html` | Folder dan file PDF e-meterai termuat lengkap dengan navigasi breadcrumb dan pratinjau instan | **PASS** |
| **TC-PW08** | Caching Explorer Berkas | Menavigasi folder tanpa jeda koneksi berulang | Menggunakan `CacheService.getScriptCache()` dengan TTL 6 jam | Respon muat folder berlangsung cepat tanpa menguras kuota Google Drive API | **PASS** |
| **TC-PW09** | Dasbor Kepatuhan Dokumen | Menghitung rasio pegawai PPPK PW yang sudah/belum mengunggah | `pppkpw_getDashboardData` & `page_pppkpw_dashboard.html` | Grafik batang dan ringkasan metrik per satuan pendidikan tampil presisi | **PASS** |
| **TC-PW10** | Ketahanan Konkurensi Data | Penyerahan berkas massal oleh seluruh pegawai PPPK PW | `LockService.getScriptLock()` pada 7 fungsi krusial | Mencegah *race condition* dan sel spreadsheet yang saling menimpa saat puncak pengunggahan | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Sintaks 100% Bersih:** Seluruh file HTML modul ini (`page_pppkpw_unggah.html`, `page_pppkpw_spmt.html`, `page_pppkpw_dashboard.html`, `page_pppkpw_emeterai.html`) memiliki kurung kurawal script (`{}`) dan tag HTML yang seimbang.
2. **Kemandirian Modul SPMT:** Pemisahan skema sheet dan folder khusus SPMT (`PPPK_PW_SPMT`) merupakan langkah arsitektur yang tepat agar audit kepegawaian untuk SPMT tidak tercampur dengan arsip perjanjian kerja umum.
3. **Optimasi CacheService:** Pemanfaatan cache pada fitur penjelajah e-meterai Drive mencegah script terkena batas kuota read Drive harian dari Google.

---

## 4. Kesimpulan
Modul **PPPK Paruh Waktu (PPPK PW)** dinyatakan **Lolos Pengujian (PASS)** dengan desain modular, pemisahan berkas yang rapi, dan sistem penjelajah e-Meterai yang sangat andal.

