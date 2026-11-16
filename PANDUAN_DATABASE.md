# Panduan & Rencana Sentralisasi Database SIKS Reborn

Dokumen ini adalah **panduan resmi dan kesepakatan kerja** untuk proyek perapihan dan sentralisasi database SIKS Reborn. Disusun dengan bahasa sederhana agar dapat dipahami dan dilanjutkan oleh siapa pun (baik pemilik proyek maupun tim teknis/AI) kapan saja.

---

## 1. Kesepakatan & Aturan Main Proyek

1. **Bahasa Sederhana & Terdokumentasi**
   Setiap perubahan struktur sheet atau kolom wajib dicatat di dokumen ini agar siapa pun yang meneruskan proyek langsung paham tanpa harus membaca kode program.
2. **Satu Sumber Kebenaran (*Single Source of Truth*)**
   Data utama (**Sekolah, PTK, Murid, User**) hanya boleh disimpan di **satu tempat** (`SIKS_DB_MASTER`). Modul lain dilarang menyimpan salinan identitas; cukup merujuk menggunakan ID unik.
3. **Wajib Pakai ID Unik, Bukan Nama**
   Penghubung antar data wajib menggunakan kode unik:
   * Sekolah: `npsn` (atau `id_sekolah`)
   * PTK / Pegawai: `nip` / `nik` (atau `id_ptk`)
   * Murid: `nisn` (atau `id_murid`)
   * User: `id_user`
4. **Migrasi Otomatis & Data Lama Tetap Aman**
   Pemindahan data dilakukan oleh sistem (*script migrasi*), bukan copy-paste manual. Spreadsheet lama **tidak boleh dihapus** dan tetap berstatus cadangan (*read-only*) sampai sistem baru terbukti 100% akurat.
5. **Lingkungan Terpisah (*Testing* vs *Production*)**
   Pengerjaan dan uji coba dilakukan di versi *testing* dan spreadsheet baru. Website yang sedang berjalan tidak boleh terganggu selama proses pengerjaan.

---

## 2. Arsitektur Target: 3 Spreadsheet Terpusat

Dari sebelumnya ~40 spreadsheet terpisah di `code.gs` (`SPREADSHEET_IDS`), seluruh data akan dikelompokkan menjadi **3 Spreadsheet Utama** (tanpa biaya tambahan):

| No | Nama Spreadsheet Target | Spreadsheet ID | Isi / Cakupan Data | Sumber Lama (`SPREADSHEET_IDS` di `code.gs`) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **`SIKS_DB_MASTER`** | `1o_CpA5GbOI0IYuE9gscSEpk7eEUIeg-wJ_dl6vR_VqU` | Sekolah, PTK (PAUD, SD, PPPK), Murid, User/Login, Referensi/Dropdown | `USER_DB`, `DROPDOWN_DATA`, `SIABA_PNS_DB`, `SIABA_LOOKUP_DB`, `SIABA_REKAP_HELPER`, `FORM_OPTIONS_DB`, `DATA_SEKOLAH`, `PTK_PAUD_DB`, `PTK_SD_DB` (`PTK_DB`), `PPPK_PW_DB`, `ADM_MURID_DB` (data induk murid) |
| 2 | **`SIKS_DB_SIABA`** | `1WmQMlHWk-H5lr5fDvK_WhT7UtW7iGj4NnzrU1waYj5U` | Presensi Harian, Arsip Presensi, Cuti, Perjalanan Dinas, Koreksi (Lupa/Salah/TA-PA), Lokasi Upacara, SKP, PAK, Konfigurasi Jadwal | `SIABA_DB`, `ARSIP_SIABA_DB`, `SIABA_KONFIG_DB`, `SIABA_CUTI_DB`, `SIABA_DINAS_DB`, `SIABA_LUPA_DB`, `SIABA_SALAH_DB`, `SIABA_TA_PA`, `SIABA_LOKASI_UPACARA_DB`, `SIABA_SKP_SOURCE`, `SIABA_SKP_DB`, `SIABA_PAK_DB` |
| 3 | **`SIKS_DB_LAYANAN`** | `1D_i4CH23wtXWWS9jhtKDRxeQkebqsw8jGT4Lqi_120U` | Lapbul (PAUD, SD, Gabungan), SK, E-File, TPG Perbaikan, Adm Sekolah/PTK/Murid, Tata Naskah Dinas, Seragam Gratis, Aduan, E-Mading, KomBel, Kemitraan | `PAUD_DATA` (`LAPBUL_PAUD_DB`), `SD_DATA` (`LAPBUL_SD_DB`), `LAPBUL_GABUNGAN`, `SK_DATA_DB`, `EFILE_DB`, `TPG_PERBAIKAN_DB`, `ADM_SEKOLAH_DB`, `ADM_PTK_DB`, `ADM_MURID_DB` (layanan), `TATA_NASKAH_DINAS_DB`, `SERAGAM_GRATIS_DB`, `ADUAN_DB`, `EMADING_DB`, `KOMBEL_DB`, `KEMITRAAN_DB` |

---

## 3. Tahapan Pengerjaan (Roadmap)

- [x] **Fase 0: Persiapan & Dokumen Aturan**
  - Menyepakati aturan main dan membuat `PANDUAN_DATABASE.md`.
  - *Selanjutnya:* Menyiapkan 3 Google Spreadsheet kosong sesuai arsitektur target.
- [x] **Fase 1: Sentralisasi `SIKS_DB_MASTER`**
  - Memetakan kolom standar untuk `tbl_sekolah`, `tbl_ptk`, `tbl_murid`, `tbl_users`, dan `tbl_referensi`.
  - Membuat script migrasi otomatis + sinkronisasi berkala dari spreadsheet lama (`Migrasi_Master.gs`).
  - Membuat lapisan akses data terpusat (`Database.gs`).
- [x] **Fase 2: Migrasi Modul Prioritas (`SIKS_DB_SIABA`)**
  - Memindahkan data Cuti, Dinas, Lupa, Salah, dan TA/PA ke `SIKS_DB_SIABA` (`Migrasi_Siaba.gs`) beserta trigger sinkronisasi harian otomatis.
- [ ] **Fase 3: Migrasi Modul Pendukung (`SIKS_DB_LAYANAN`)**
  - Memindahkan modul SK, E-File, TPG, Seragam, Aduan, E-Mading, KomBel, dan Kemitraan secara bertahap.
- [ ] **Fase 4: Peralihan Resmi (*Cutover*)**
  - Sinkronisasi data terakhir (jeda ~15–30 menit).
  - Mengarahkan web utama ke 3 spreadsheet baru dan mengunci spreadsheet lama sebagai arsip (*read-only*).
