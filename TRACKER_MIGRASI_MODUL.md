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
| 1 | **Laporan Bulan (Lapbul)** | `Lapbul.gs` | `SIKS_DB_LAYANAN` (`tbl_lapbul_*`) | `[ ]` Belum dipetakan | `[ ]` Belum | - |
| 2 | **SK Pembagian Tugas** | `SK.gs` | `SIKS_DB_LAYANAN` (`tbl_sk`) | `[~]` Script ada (`syncLayananAll`, hasil 0 — perlu cek nama sheet/header) | `[ ]` Belum | - |
| 3 | **Administrasi Sekolah** | `AdmSekolah.gs` | `SIKS_DB_MASTER` (`tbl_sekolah`) & `SIKS_DB_LAYANAN` | `[~]` `tbl_sekolah` terisi 65 baris | `[ ]` Belum | - |
| 4 | **Data PTK** | `PTK.gs` | `SIKS_DB_MASTER` (`tbl_ptk`) | `[x]` 486 baris (SDN 253 + SDS/PAUD 233) | `[~]` `USE_CENTRAL_PTK_DB` aktif untuk filter unit & status | **Berhasil** (filter & daftar PTK tampil normal) |
| 5 | **E-File PTK** | `Efile.gs` | `SIKS_DB_LAYANAN` (`tbl_efile`) | `[ ]` Belum dipetakan | `[ ]` Belum | - |
| 6 | **SIABA** (Presensi, Cuti, Dinas, Lupa, Salah, TA/PA) | `Siaba_*.gs` | `SIKS_DB_SIABA` (`tbl_siaba_*`) | `[x]` Cuti (234), Dinas (234), Lupa (234), Salah (232), Data Atasan, Sisa CT | `[~]` `USE_CENTRAL_SIABA_DB` aktif untuk `Sisa CT` & `Data Atasan` di `Siaba_cuti.gs` | **Berhasil** (uji Sisa Cuti & Pengajuan Cuti normal) |
| 7 | **TPG** | `TPG_Perbaikan.gs` | `SIKS_DB_LAYANAN` (`tbl_tpg_perbaikan`) | `[~]` Sheet siap | `[ ]` Belum | - |
| 8 | **PPPK PW** | `PPPK_PW.gs` | `SIKS_DB_MASTER` (`tbl_ptk`) / `SIKS_DB_LAYANAN` | `[ ]` Belum digabung ke `tbl_ptk` | `[ ]` Belum | - |
| 9 | **Jumlah Murid** | `Murid.gs` | `SIKS_DB_LAYANAN` (`tbl_rekap_murid`) | `[ ]` Belum dipetakan (berupa rekapitulasi) | `[ ]` Belum | - |
| 10 | **Administrasi Murid** | `AdmMurid.gs` | `SIKS_DB_LAYANAN` (`tbl_adm_murid`) | `[ ]` Belum dipetakan (`Database_SPMB` berupa rekap) | `[ ]` Belum | - |
| 11 | **Administrasi PTK** | `AdmPTK.gs` | `SIKS_DB_LAYANAN` (`tbl_adm_ptk`) | `[ ]` Belum dipetakan | `[ ]` Belum | - |
| 12 | **Komunitas Belajar** | `KomBel.gs` | `SIKS_DB_LAYANAN` (`tbl_kombel`) | `[~]` Script ada (`syncLayananAll`) | `[ ]` Belum | - |
| 13 | **Tata Naskah Dinas** | `TataNaskahDinas.gs` | `SIKS_DB_LAYANAN` (`tbl_tnd`) | `[ ]` Belum dipetakan | `[ ]` Belum | - |
| 14 | **Kemitraan & Kerja Sama** | `Kemitraan.gs` | `SIKS_DB_LAYANAN` (`tbl_kemitraan`) | `[~]` Script ada (`syncLayananAll`) | `[ ]` Belum | - |
| 15 | **Pengaturan (Login & User)** | `code.gs` | `SIKS_DB_MASTER` (`tbl_users`) | `[x]` Tersinkronisasi | `[x]` `USE_CENTRAL_USERS_DB` | **Berhasil** (uji login normal) |
| 16 | **Monitoring Aktivitas** | `code.gs` / `NotifikasiHome.gs` | `SIKS_DB_MASTER` / `SIKS_DB_LAYANAN` | `[ ]` Belum dipetakan | `[ ]` Belum | - |

---

## Catatan Penting untuk Penerus Proyek
1. **Jangan hapus spreadsheet lama** sebelum seluruh status di tabel atas bertanda `[x]`.
2. Setiap kali menambah/mengubah modul, perbarui kolom **Status Migrasi Data**, **Status Kode & Saklar**, dan **Hasil Pengujian** di tabel ini.
3. Selalu gunakan **`Database.gs`** sebagai jembatan pembacaan data agar kode UI tidak bergantung langsung pada ID spreadsheet.
