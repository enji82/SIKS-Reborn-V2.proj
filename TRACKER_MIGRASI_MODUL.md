# Tracker Migrasi & Pengujian Modul SIKS Reborn

Dokumen ini mencatat status pengerjaan, pemetaan database, dan hasil pengujian untuk seluruh **16 modul** di SIKS Reborn. Tujuannya agar siapa pun yang melanjutkan proyek ini tahu persis bagian mana yang sudah selesai, sedang berjalan, atau belum dikerjakan.

**Keterangan Status:**
- `[x]` **Selesai & Teruji** (Data tersinkronisasi + saklar kode sudah diuji di *testing*)
- `[~]` **Sebagian / Persiapan** (Struktur/script sinkronisasi sudah ada, kode modul belum diarahkan penuh)
- `[ ]` **Belum Dikerjakan**

---

## Ringkasan 3 Spreadsheet Terpusat
1. **`SIKS_DB_MASTER`** (`1o_CpA5GbOI0IYuE9gscSEpk7eEUIeg-wJ_dl6vR_VqU`) — Trigger harian `01:00` (`syncAllMaster`)
2. **`SIKS_DB_SIABA`** (`1WmQMlHWk-H5lr5fDvK_WhT7UtW7iGj4NnzrU1waYj5U`) — Trigger harian `01:30` (`syncSiabaAll`)
3. **`SIKS_DB_LAYANAN`** (`1D_i4CH23wtXWWS9jhtKDRxeQkebqsw8jGT4Lqi_120U`) — Trigger harian `02:00` (`syncLayananAll`)

---

## Daftar Status 16 Modul

| No | Modul | File `.gs` Terkait | Target Database & Sheet | Status Migrasi Data | Status Kode & Saklar | Hasil Pengujian (*Testing*) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Laporan Bulan (Lapbul)** | `Lapbul.gs` | `SIKS_DB_LAYANAN` (`tbl_lapbul_sd`, `tbl_lapbul_paud`) | `[x]` SD (1.251 baris) & PAUD (531 baris) | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, Kelola Data, Status Data normal) |
| 2 | **SK Pembagian Tugas** | `SK.gs` | `SIKS_DB_LAYANAN` (`tbl_sk`) | `[x]` 324 baris | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, Kelola Data, Status Data normal) |
| 3 | **Administrasi Sekolah** | `AdmSekolah.gs` | `SIKS_DB_MASTER` (`tbl_sekolah`) & `SIKS_DB_LAYANAN` (`tbl_adm_sekolah`) | `[x]` 65 sekolah & `Database_Dokumen` | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Administrasi Sekolah normal) |
| 4 | **Data PTK** | `PTK.gs` | `SIKS_DB_MASTER` (`tbl_ptk`) | `[x]` 486 baris (SDN 253 + SDS/PAUD 233) | `[~]` `USE_CENTRAL_PTK_DB` aktif untuk filter unit & status | **Berhasil** (filter & daftar PTK tampil normal) |
| 5 | **E-File PTK** | `Efile.gs` | `SIKS_DB_LAYANAN` (`tbl_efile`) | `[x]` 3.370 baris | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, Kelola Berkas, Viewer, Master Kategori normal) |
| 6 | **SIABA** (Presensi, Cuti, Dinas, Lupa, Salah, TA/PA) | `Siaba_*.gs` | `SIKS_DB_SIABA` (`tbl_siaba_*`) | `[x]` Cuti (234), Dinas (234), Lupa (234), Salah (232), Data Atasan, Sisa CT | `[~]` `USE_CENTRAL_SIABA_DB` aktif untuk `Sisa CT` & `Data Atasan` di `Siaba_cuti.gs` | **Berhasil** (uji Sisa Cuti & Pengajuan Cuti normal) |
| 7 | **TPG** | `TPG_Perbaikan.gs` | `SIKS_DB_LAYANAN` (`tbl_tpg_perbaikan`) | `[x]` 101 baris | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, Perbaikan Gaji, Peraturan normal) |
| 8 | **PPPK PW** | `PPPK_PW.gs` | `SIKS_DB_MASTER` (`tbl_ptk`) & `SIKS_DB_LAYANAN` (dokumen PK) | `[x]` Data pegawai sudah di `tbl_ptk` | `[ ]` Belum (dokumen PK) | - |
| 9 | **Jumlah Murid** | `Murid.gs` | `SIKS_DB_LAYANAN` (`tbl_lapbul_sd`, `tbl_lapbul_paud`) | `[x]` Ikut tersalin di data Lapbul | `[ ]` Belum | - |
| 10 | **Administrasi Murid** | `AdmMurid.gs` | `SIKS_DB_LAYANAN` (`tbl_adm_murid`) | `[x]` 12 baris (`Database_SPMB`) | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, SPMB, Ijazah, TKA, Seragam Gratis normal) |
| 11 | **Administrasi PTK** | `AdmPTK.gs` | `SIKS_DB_LAYANAN` (`tbl_adm_ptk`) | `[x]` 63 baris | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Dashboard, Kelola, Lihat, Master Kategori normal) |
| 12 | **Komunitas Belajar** | `KomBel.gs` | `SIKS_DB_LAYANAN` (`tbl_kombel`) | `[~]` Script ada (`syncLayananAll`) | `[ ]` Belum | - |
| 13 | **Tata Naskah Dinas** | `TataNaskahDinas.gs` | `SIKS_DB_LAYANAN` (`tbl_tnd`) | `[x]` 27 baris | `[x]` `USE_CENTRAL_LAYANAN_DB` | **Berhasil** (Pedoman, Kode SD, Klasifikasi Arsip, Template normal) |
| 14 | **Kemitraan & Kerja Sama** | `Kemitraan.gs` | `SIKS_DB_LAYANAN` (`tbl_kemitraan`) | `[~]` Script ada (`syncLayananAll`) | `[ ]` Belum | - |
| 15 | **Pengaturan (Login & User)** | `code.gs` | `SIKS_DB_MASTER` (`tbl_users`) | `[x]` Tersinkronisasi | `[x]` `USE_CENTRAL_USERS_DB` | **Berhasil** (uji login normal) |
| 16 | **Monitoring Aktivitas** | `code.gs` / `NotifikasiHome.gs` | `SIKS_DB_MASTER` / `SIKS_DB_LAYANAN` | `[ ]` Belum dipetakan | `[ ]` Belum | - |

---

## Urutan Prioritas Pengerjaan (Rekomendasi)

Agar pengerjaan aman dan saling mendukung, berikut urutan resmi yang kita gunakan:

1. **Gelombang 1 — Pondasi Data Induk**
   - Pengaturan & Login (`code.gs`) — *Sudah selesai*
   - Data PTK (`PTK.gs`) & PPPK PW (`PPPK_PW.gs`) → lengkapi `tbl_ptk`
   - Administrasi Sekolah (`AdmSekolah.gs`) → lengkapi `tbl_sekolah`
2. **Gelombang 2 — Modul Kepegawaian Harian (SIABA)**
   - Selesaikan integrasi penuh `Siaba_cuti.gs`, lalu `Siaba_perjadin.gs`, `Siaba_lupa.gs`, `Siaba_salah.gs`, dan `Siaba_presensi.gs` ke `SIKS_DB_SIABA`.
3. **Gelombang 3 — Modul Administrasi & Laporan Inti**
   - Laporan Bulan (`Lapbul.gs`), SK Pembagian Tugas (`SK.gs`), E-File PTK (`Efile.gs`), TPG (`TPG_Perbaikan.gs`), Administrasi PTK (`AdmPTK.gs`).
4. **Gelombang 4 — Modul Murid**
   - Jumlah Murid (`Murid.gs`) dan Administrasi Murid (`AdmMurid.gs`).
5. **Gelombang 5 — Modul Pendukung & Monitoring**
   - Komunitas Belajar (`KomBel.gs`), Tata Naskah Dinas (`TataNaskahDinas.gs`), Kemitraan (`Kemitraan.gs`), dan Monitoring Aktivitas (`NotifikasiHome.gs`).

---

## Catatan Penting untuk Penerus Proyek
1. **Jangan hapus spreadsheet lama** sebelum seluruh status di tabel atas bertanda `[x]`.
2. Setiap kali menambah/mengubah modul, perbarui kolom **Status Migrasi Data**, **Status Kode & Saklar**, dan **Hasil Pengujian** di tabel ini.
3. Selalu gunakan **`Database.gs`** sebagai jembatan pembacaan data agar kode UI tidak bergantung langsung pada ID spreadsheet.
