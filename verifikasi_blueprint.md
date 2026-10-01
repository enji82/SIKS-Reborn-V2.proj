# 📋 Verifikasi Blueprint (Standar Baku Modal Verifikasi SIKS-Reborn-V2)

Dokumen ini merupakan pedoman baku (*verifikasi_blueprint*) untuk seluruh tampilan dan logika **Modal Verifikasi** di aplikasi SIKS-Reborn-V2. Semua halaman yang memiliki fitur verifikasi admin wajib mematuhi standar ini agar menghasilkan pengalaman pengguna (UX) yang konsisten, cepat, dan presisi.

---

## 📌 1. Layout & Pembagian Panel (70% : 30%)

Modal Verifikasi menggunakan [index.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/index.html) (`#global_modalVerifikasi`) dengan pembagian 2 bagian terpisah:

- **Panel Kiri - Pratinjau Dokumen (70%)**:
  - Class: `.modal-verifikasi-preview`
  - Style: `flex: 1 1 70% !important; width: 70% !important;`
  - Fungsi: Menampilkan pratinjau berkas PDF/Gambar secara luas dengan indikator *loading spinner* dan *fallback anti-nyangkut*.
- **Panel Kanan - Detail Data & Form Verifikasi (30%)**:
  - Class: `.modal-verifikasi-data`
  - Style: `flex: 0 0 30% !important; width: 30% !important; min-width: 280px !important;`
  - Fungsi: Menampilkan ringkasan informasi data serta form penilaian verifikasi admin.

---

## 🏷️ 2. Standar Penamaan Label & Elemen Form

1. **"Hasil Verifikasi"** (sebelumnya *Keputusan Verifikasi*)
   - Label: `<label class="modal-verifikasi-form-label font-weight-bold">Hasil Verifikasi <span class="text-danger">*</span></label>`
2. **"Verifikasi Sebelumnya"** (sebelumnya *Keterangan Verifikasi Sebelumnya*)
   - Label: `<label class="modal-verifikasi-form-label text-muted"><i class="fas fa-history mr-1"></i>Verifikasi Sebelumnya</label>`
3. **"Catatan Admin"**
   - Label: `<label class="modal-verifikasi-form-label font-weight-bold">Catatan Admin <span id="[page]_reqCatatan" class="text-danger" style="display:none;">*</span></label>`

---

## 🔘 3. Pilihan Opsi Dropdown Status

Dropdown `Hasil Verifikasi` secara default berisi opsi:
```html
<select class="modal-verifikasi-select font-weight-bold w-100" id="[page]_selStatusVerif" required>
    <option value="">-- Pilih Hasil Verifikasi --</option>
    <option value="Diproses">Diproses</option>
    <option value="Disetujui">Disetujui</option>
    <option value="Revisi">Revisi</option>
    <option value="Ditolak">Ditolak</option>
</select>
```
*Catatan:* Halaman khusus dengan alur kerja tambahan (misalnya status `Diajukan`, `Dicetak`, dsb.) dapat menambahkan `<option>` sesuai kebutuhan bisnis halaman tersebut.

---

## ⚡ 4. Auto Pre-Select Status & Dynamic Validation

1. **Auto Pre-Select**: Saat modal dibuka, dropdown otomatis terisi (*pre-selected*) sesuai `statusData` saat ini milik item yang sedang diverifikasi (misal: `Disetujui`, `Revisi`, `Ditolak`, atau `Diproses`).
2. **Dynamic Requirement Indicator**:
   - Jika status = `Revisi` atau `Ditolak`: Bintang merah (`*`) pada Catatan Admin tampil, `textarea` diubah menjadi `required`, dan placeholder memberi instruksi wajib (`Wajib diisi alasan/catatan verifikasi (min 5 karakter)...`).
   - Jika status = `Disetujui` / `Diproses`: Bintang merah dikosongkan, `required` dilepas, dan placeholder diubah menjadi (`Catatan admin (opsional)...`).

---

## 📐 5. Dimensi & Ukuran Kontrol Seragam (Adaptif 30%)

Ketiga kontrol di panel kanan wajib memiliki gaya visual & ukuran yang identik (terpusat di [css_sultan.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/css_sultan.html)):
- **Lebar & Box Sizing**: `width: 100% !important; box-sizing: border-box !important;`
- **Padding & Border Radius**: `padding: 0.75rem 1rem !important; border-radius: 10px !important;`
- **Border**: `2px solid #e9ecef !important;` (Mode Terang) & `2px solid #3a4b5c !important;` (Mode Gelap).

---

## 🎨 6. Pewarnaan Tombol VERIFIKASI

- Tombol **VERIFIKASI** (`.modal-verifikasi-btn-verifikasi` / `button.sultan-btn-primary`) menggunakan gradasi warna biru senada dengan **Header Modal** (`.modal-header-verifikasi`):
  ```css
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
  color: white !important;
  border-radius: 50px !important;
  ```

---

## 🚀 7. Optimalisasi Kecepatan (In-Place Update Tanpa DB Reload)

- Setelah respon verifikasi sukses dari backend Apps Script:
  1. Perbarui objek cache lokal (`CACHE_DATA`) di memori klien secara langsung.
  2. Panggil fungsi filter lokal (`terapkanFilterLokal()`) untuk memicu redraw DataTables dengan mengunci halaman pagination & scroll (`draw(false)`).
  3. **TIDAK PERLU** melakukan fetch/query ulang seluruh database Apps Script.
  4. Jalankan `sultan_fetchNotifikasi()` untuk memperbarui badge notifikasi secara real-time.

---

## 🔓 8. Aksesibilitas Perubahan Status (Always Editable for Admin)

- **Aturan Baku**: Dalam status data apapun (termasuk status `Disetujui`, `OK`, `Valid`, `Revisi`, `Ditolak`, atau `Diproses`), admin **SELALU dapat mengubah status** dan menyimpan catatan baru di dalam Modal Verifikasi.
- **Pembedaan Kunci Akses**:
  - Tombol **Edit Data** dan **Hapus Data** pada tabel utama memang dikunci (`disabled`) ketika data berstatus `Disetujui` / `OK` untuk mencegah pengubahan data fisik secara tidak sengaja.
  - Namun **Modal Verifikasi** adalah hak akses penuh bagi Admin/Verifikator. Oleh karena itu, dropdown `Hasil Verifikasi`, textarea `Catatan Admin`, dan tombol **VERIFIKASI** (`#btnSimpanVerif`) **TIDAK BOLEH di-disable atau disembunyikan** meskipun status data sudah `Disetujui`. Admin senantiasa dapat mengoreksi atau mengubah kembali keputusan verifikasi sewaktu-waktu (misal mengubah dari `Disetujui` menjadi `Revisi` / `Ditolak`).


