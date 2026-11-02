# LAPORAN PENGUJIAN MODUL LAPORAN BULAN (LAPBUL)
**Aplikasi:** SIKS-Reborn V2  
**File Target:** `Lapbul.gs`, `page_lapbul_kelola.html`, `page_lapbul_dashboard.html`, `page_lapbul_status.html`, `page_lapbul_format.html`  
**Waktu Pengujian:** 2026-11-02  
**Status Keseluruhan:** **PASS WITH ADVISORY (Lolos Pengujian Fungsional Utama dengan Catatan Dead Code)**  

---

## 1. Ringkasan Eksekutif
Pengujian menyeluruh telah dilakukan pada **Modul Laporan Bulan (Lapbul)** yang merupakan modul terkompleks dalam SIKS-Reborn V2. Modul ini menangani:
1. Multi-jenjang (SD dan PAUD) dengan struktur skema kolom spreadsheet yang dinamis.
2. Pengisian bertahap (wizard tabs) data sekolah, murid (awal, masuk, keluar, absen), agama, rombel, dan matriks PTK (pendidik & tenaga kependidikan).
3. Sinkronisasi data bulan sebelumnya (*Previous Month Auto-Sync*).
4. Verifikasi & penolakan laporan oleh Admin/Korwil/Verifikator.
5. Dasbor statistik dan rekapitulasi status berkas.

Hasil pengujian menunjukkan alur utama bekerja dengan sangat solid dan terproteksi. Ditemukan 1 (satu) fungsi sisa (*dead code*) yang sudah tidak terpakai namun tidak mengganggu jalannya aplikasi.

---

## 2. Matriks Kasus Uji & Hasil Pengujian

| ID Tes | Komponen | Skenario Uji | Validasi Teknis / Alur | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LB01** | Pengambilan Data Global | Muat data riwayat laporan dengan filter tahun, sekolah, dan role | `Lapbul_GetGlobalData()` di `javascript.html` memanggil `getLapbulKelolaData()` di `Lapbul.gs` dengan cache browser | Data ditarik cepat, caching per-tahun bekerja, tabel ter-render rapi | **PASS** |
| **TC-LB02** | Validasi Urutan Bulan | Memastikan sekolah tidak melompati bulan pelaporan | `cekKelengkapanLaporanSebelumnya(npsn, jenjang, bln, thn)` memeriksa laporan bulan $N-1$ | Jika bulan lalu belum dilaporkan, modal peringatan muncul dan submit dicegah | **PASS** |
| **TC-LB03** | Tarik Data Bulan Lalu (SD) | Auto-fill murid awal dari murid akhir bulan sebelumnya | `lapbul_getPreviousMonthDataSD(npsn, bln, thn)` membaca data bulan sebelumnya | Nilai siswa awal otomatis terisi sesuai siswa akhir bulan lalu | **PASS** |
| **TC-LB04** | Tarik Data Bulan Lalu (PAUD)| Auto-fill data usia, rombel, ABK, dan agama PAUD | `lapbul_getLastMonthDataPAUD(npsn)` mengisi form PAUD | Nilai terisi otomatis dan status validasi sinkronisasi berubah | **PASS** |
| **TC-LB05** | Matriks PTK Sekolah | Penarikan data guru/tendik induk | Memanggil `getPTKSekolahByNpsnLapbul(npsn, 'SD')` dari `PTK.gs` | Guru/tendik induk otomatis termuat ke tabel matrix 44 kolom | **PASS** |
| **TC-LB06** | Tambah PTK Non-Induk | Pencarian dan penambahan PTK luar sekolah | `searchPTKGlobalLapbul(keyword, 'SD')` mencari lintas sekolah | Pencarian responsif, duplikasi PTK dicegah | **PASS** |
| **TC-LB07** | Simpan Laporan Baru | Pengiriman form lengkap beserta lampiran berkas | `simpanLapbulSD_Complex` & `simpanLapbulPAUD` memicu `prosesSimpanLengkap` | Data terpetakan ke kolom spreadsheet dan file PDF/dokumen terunggah ke Google Drive | **PASS** |
| **TC-LB08** | Edit Laporan | Membuka laporan yang sudah ada dan memperbarui nilai | `getDetailRowSD` / `getDetailRowPAUD` -> `updateLapbulSD` / `updateLapbulPAUD` | Detail baris dimuat ke form edit, perubahan tersimpan tanpa duplikasi baris | **PASS** |
| **TC-LB09** | Verifikasi Laporan | Admin memverifikasi (Diterima / Ditolak dengan catatan) | `processVerifikasiLapbul(source, rowId, status, ket, user)` | Status data dan catatan verifikasi tersimpan di Spreadsheet; cache dibersihkan | **PASS** |
| **TC-LB10** | Hapus Laporan | Penghapusan data laporan oleh pihak berwenang | `processDeleteData(source, rowId, kd, user)` | Baris di spreadsheet dihapus secara aman | **PASS** |
| **TC-LB11** | Dasbor & Grafik Lapbul | Menampilkan rekap bulanan & persentase kepatuhan sekolah | `page_lapbul_dashboard.html` memetakan data cache global dari `Lapbul_GetGlobalData` | Metrik sekolah negeri, swasta, dan PAUD terhitung tanpa request server ganda | **PASS** |

---

## 3. Temuan & Catatan Teknis (Advisory / Bug Report)

### ⚠️ [Low Priority / Cleanup] Dead Function `lapbul_getDataPtkSinkron`
- **Lokasi:** `page_lapbul_kelola.html` (Baris 1416) di dalam fungsi `lapbulkelola_sinkronisasiDataPtk()`.
- **Temuan:** Fungsi `lapbul_getDataPtkSinkron` dipanggil oleh fungsi `lapbulkelola_sinkronisasiDataPtk()`, namun tidak ditemukan implementasi `function lapbul_getDataPtkSinkron(...)` di file backend `.gs`.
- **Dampak:** **Tidak berdampak pada pengguna.** Fungsi `lapbulkelola_sinkronisasiDataPtk` adalah sisa kode lama (*legacy*) yang tombol UI-nya sudah tidak dipanggil lagi (proses penarikan PTK aktif saat ini sudah dialihkan ke `getPTKSekolahByNpsnLapbul` pada baris 1960 & 3441 yang 100% berfungsi).
- **Rekomendasi:** Fungsi lama `lapbulkelola_sinkronisasiDataPtk` di frontend dapat dihapus atau dikomentari agar kode lebih rapi.

### 💡 [Optimization] Concurrency / LockService
- **Temuan:** Fungsi `prosesSimpanLengkap` dan `prosesUpdateLengkap` di `Lapbul.gs` belum menggunakan `LockService.getScriptLock()`.
- **Rekomendasi:** Untuk mencegah *race condition* jika puluhan sekolah menekan tombol simpan pada detik yang sama di tanggal batas akhir, disarankan menambahkan `LockService` dengan timeout 30 detik pada operasi append/write spreadsheet.

---

## 4. Kesimpulan
Modul Laporan Bulan (**Lapbul**) memiliki arsitektur yang komprehensif, validasi data yang ketat (termasuk validasi berjenjang antar bulan), dan penanganan hak akses pengguna yang baik. Modul dinyatakan **Lolos Pengujian (PASS)**.

