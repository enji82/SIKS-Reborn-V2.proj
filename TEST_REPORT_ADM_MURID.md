# LAPORAN PENGUJIAN MODUL ADMINISTRASI MURID (SPMB, IJAZAH, ARSIP TKA)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `AdmMurid.gs`, `page_adm_murid_dashboard.html`, `page_adm_murid_spmb.html`, `page_adm_murid_ijazah.html`, `page_adm_murid_arsip_ijazah.html`, `page_adm_murid_arsip_tka.html`  
**Waktu Pengujian:** 2026-11-03  
**Status Keseluruhan:** **PASS (Sangat Lengkap, Terproteksi LockService & Audit Trail Terpadu)**  

---

## 1. Ringkasan Eksekutif
Pengujian komprehensif telah dilakukan pada **Modul Administrasi Murid (Adm Murid)** yang mencakup pengelolaan:
1. **Sistem Penerimaan Murid Baru (SPMB):** Rekap kuota jalur afirmasi/zonasi/online tahap 1 & 2, offline, tinggal kelas, serta berkas surat pertanggungjawaban mutlak.
2. **Manajemen Blanko & Pencetakan Ijazah:** Pengajuan cetak ijazah, pengunggahan draft PDF, transkrip nilai Word (KOP sekolah), transkrip kolektif, alur pengajuan koreksi/ralat ijazah, cetak ulang teknis, dan verifikasi dinas.
3. **Arsip Digital Ijazah & TKA:** Penyimpanan fisik berkas scan ijazah lulusan dan Tes Kemampuan Akademik (TKA) secara terstruktur per sekolah di Google Drive.
4. **Dasbor Eksekutif SPMB & Ijazah:** Pemantauan real-time status pengajuan tiap sekolah lengkap dengan kartu ringkasan dan persentase kelulusan verifikasi.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AM01** | Input Rekap SPMB | Pengisian jumlah siswa baru jalur online, offline, tinggal kelas | `admMurid_simpanSpmb(payload)` di `AdmMurid.gs` dengan `LockService` | Total siswa L/P dihitung otomatis di backend; file PDF lampiran tersimpan ke Drive folder SPMB | **PASS** |
| **TC-AM02** | Pengajuan Cetak Ijazah | Upload berkas PDF Ijazah, Docx Transkrip KOP, dan Transkrip Kolektif | `admMurid_simpanIjazah(payload)` membagi berkas ke folder Drive masing-masing | File tersimpan di folder sekolah yang sesuai; baris tercatat dengan status awal "Diproses" | **PASS** |
| **TC-AM03** | Pengajuan Koreksi Ijazah | Sekolah menemukan kesalahan penulisan nama/NISN/nilai | `admMurid_ajukanKoreksiIjazah` / `admMurid_ajukanKoreksiDenganFile` | Catatan riwayat tersusun kronologis `[Tanggal Sekolah]: Alasan`; reset read_by admin memicu notifikasi | **PASS** |
| **TC-AM04** | Catat Cetak Ulang Teknis | Pencatatan kerusakan teknis lembar blanko ijazah (rusak/salah cetak) | `admMurid_catatCetakUlangTeknis` di `AdmMurid.gs` | Status berubah menjadi "Cetak Ulang Teknis"; admin menerima pengajuan penggantian nomor seri | **PASS** |
| **TC-AM05** | Verifikasi Ijazah (Admin) | Admin menyetujui, meminta revisi, atau menolak usulan cetak | `admMurid_verifikasiIjazah(rowId, status, catatan, admin)` | Status baris berubah seketika; catatan telaah admin dicatat dengan timestamp | **PASS** |
| **TC-AM06** | Arsip Digital Ijazah | Pengunggahan scan ijazah resmi yang telah ditandatangani | `admMurid_simpanArsipIjazah(payload)` di `page_adm_murid_arsip_ijazah.html` | Berkas PDF ijazah terarsip permanen di Google Drive terstruktur per satuan pendidikan | **PASS** |
| **TC-AM07** | Arsip Berkas TKA Murid | Pengunggahan lembar penilaian / sertifikat Tes Kemampuan Akademik | `admMurid_simpanArsipTka(payload)` di `page_adm_murid_arsip_tka.html` | Arsip TKA tersimpan rapi dan dapat ditinjau ulang kapan saja | **PASS** |
| **TC-AM08** | Penghapusan Berkas Aman | Menghapus pengajuan keliru dengan pembersihan Google Drive | `admMurid_hapusSpmb`, `admMurid_hapusIjazah`, `admMurid_hapusArsip*` | File lama dipindahkan ke sampah (*trashed*) dan baris spreadsheet dibersihkan | **PASS** |
| **TC-AM09** | Dasbor Administrasi Murid | Menampilkan rekapitulasi SPMB dan status ijazah se-wilayah | `admMurid_getDashboardData()` di `page_adm_murid_dashboard.html` | Metrik sekolah lengkap, belum lengkap, dan progres verifikasi ijazah terhitung akurat | **PASS** |
| **TC-AM10** | Ketahanan Konkurensi (*LockService*) | Beban unggah massal saat musim kelulusan dan SPMB | `LockService.getScriptLock()` dengan batas tunggu 30 detik | Tidak terjadi tabrakan baris atau nomor registrasi ganda antar sekolah | **PASS** |

---

## 3. Catatan Kualitas Kode & Arsitektur
1. **Pembersihan Berkas Drive Otomatis:** Saat sekolah melakukan pengeditan atau penggantian berkas lampiran, fungsi `admMurid_simpanSpmb` dan `admMurid_simpanIjazah` secara cerdas memindahkan berkas fisik lama ke *Trash* (`DriveApp.getFileById(oldId).setTrashed(true)`), mencegah penumpukan sampah file di Google Drive.
2. **Pencatatan Riwayat Berantai (*Audit Log*):** Fitur pengajuan koreksi ijazah menyimpan riwayat komunikasi bertingkat dengan separator garis putus-putus (`--------------------------------------------------`), sehingga kronologi usulan sekolah dan tanggapan admin tidak pernah tertimpa.
3. **Notifikasi Sinkron:** Mekanisme kolom `read_by` secara otomatis menghapus penanda "Admin" saat ada ajuan koreksi baru dari sekolah, memastikan admin dinas langsung menerima lencana notifikasi baru di sistem.

---

## 4. Kesimpulan
Modul **Administrasi Murid (SPMB, Ijazah, Arsip TKA)** dinyatakan **Lolos Pengujian (PASS)** dengan sistem arsip digital yang rapi, perlindungan konkurensi data yang kuat, dan manajemen riwayat koreksi yang sangat transparan.

