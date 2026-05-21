# Blueprint Arsitektur & Refaktorisasi SIKS-Reborn-V2

Dokumen ini berisi cetak biru (blueprint) taktis untuk mengoptimalkan performa, responsivitas, keterpusatan kode, dan keamanan sistem SIKS-Reborn-V2 yang berbasis Google Apps Script (GAS) dan Single Page Application (SPA). Anda dapat membaca, memodifikasi, dan memperbarui berkas ini sewaktu-waktu seiring berkembangnya kebutuhan sistem.

---

## 📌 1. Prinsip Utama Pengembangan (Core Principles)
1.  **Responsif:** Semua elemen filter dan tabel harus dapat diakses dengan nyaman di HP dan tablet tanpa adanya scrollbar horizontal.
2.  **Terpusat & Kering (DRY - Don't Repeat Yourself):** Tidak boleh ada deklarasi modal atau fungsi helper yang sama di beberapa file halaman. Jika elemen tersebut digunakan di lebih dari satu halaman, pindahkan ke file global.
3.  **Konsistensi Visual 100%:** Desain layout, ukuran font, margin, tombol aksi, bentuk header halaman, dan layout filter harus seragam di seluruh halaman menu.
4.  **Akses Cepat (Performa Tinggi):** Mengurangi waktu loading navigasi (SPA routing) ke level instan menggunakan caching lokal di sisi klien, serta mengurangi pembacaan API Google Sheets yang lambat dengan menggunakan caching di sisi server.
5.  **Bebas Sampah:** Bersihkan variabel global yang tidak terisolasi dan hancurkan instansi plugin (seperti DataTable) setelah halaman ditutup untuk mencegah kebocoran memori (Memory Leak).

---

## 🛠️ 2. Rencana Perubahan Arsitektur & File

### A. Shell Utama & Pengelolaan Modal Global
*   **File Target:** [index.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/index.html)
*   **Perubahan:** 
    *   Pindahkan modal pratinjau dokumen (`iframe` viewer), modal konfirmasi hapus permanen, dan modal detail catatan/pesan dari masing-masing halaman `page_*.html` ke dalam [index.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/index.html).
    *   Sediakan slot header dinamis `#app-page-header` di atas area konten `#app-content` agar pembuatan header halaman diserahkan kepada router global, bukan ditulis manual di tiap berkas halaman.

### B. Namespace Global, Templating Dinamis & SPA Caching
*   **File Target:** [javascript.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/javascript.html) & [ui_helpers.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/ui_helpers.html)
*   **Perubahan:**
    *   **Sultan Namespace:** Buat objek pembungkus tunggal untuk membagi tanggung jawab fungsional:
        ```javascript
        var Sultan = {
          notif: { ... }, // SweetAlert2, Toast, Spinner
          modal: {
            preview: function(url) { ... },
            hapus: function(id, callbackSuccess) { ... },
            detail: function(title, content) { ... }
          },
          utils: {
            escapeHtml: function(t) { ... },
            formatTanggal: function(d) { ... },
            rupiah: function(n) { ... }
          },
          store: {
            ptk: [],
            unit: [],
            kategori: []
          }
        };
        ```
    *   **SultanUI Component Generator:** Implementasikan fungsi generator komponen global di [ui_helpers.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/ui_helpers.html) untuk merender elemen UI yang seragam secara dinamis:
        *   `SultanUI.renderHeader(title, subtitle, iconClass)`: Memusatkan pembuatan layout header halaman agar seragam di semua menu.
        *   `SultanUI.renderFilterBar(filtersConfig)`: Merender filter bar dengan dropdown seleksi secara otomatis sesuai spesifikasi konfigurasi.
    *   **SPA View Cache:** Modifikasi fungsi `loadContent(pageName)` agar menyimpan output HTML halaman ke dalam variabel memori lokal klien `SPA_VIEW_CACHE` setelah tarikan pertama. Saat pengguna bernavigasi kembali ke halaman tersebut, tampilkan HTML dari cache lokal terlebih dahulu sebelum menyegarkan datanya secara asinkron.

### C. Desain & Grid Responsif (Mobile-Friendly Standards)
*   **File Target:** [css_sultan.html](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/css_sultan.html) & semua file halaman `page_*.html`
*   **Perubahan & Aturan Desain:**
    *   **Standar Breakpoint & Grid:**
        *   Gunakan grid fluid berbasis flexbox (`d-flex flex-column flex-md-row`) untuk layout dinamis yang bertumpuk secara vertikal pada layar HP (`< 768px`) dan melebar horizontal pada Desktop.
        *   Terapkan pembagian kelas grid Bootstrap secara tepat (misal: `<div class="col-12 col-md-6 col-lg-4">`) untuk memastikan kartu informasi/formulir terdistribusi dengan proporsional di semua lebar viewport.
    *   **Penanganan Tabel Lebar (Responsive Tables):**
        *   Bungkus seluruh elemen table dengan kelas `.table-responsive` atau `.sultan-scroll`. Tambahkan parameter `touch-action: pan-x` dan `overscroll-behavior-x: contain` pada CSS untuk kelancaran geser horizontal (horizontal swipe) tanpa memicu navigasi back/forward browser di Safari/Chrome mobile.
        *   Untuk tabel berukuran sangat besar, sembunyikan kolom-kolom non-prioritas di layar HP menggunakan kelas utility `.d-none .d-md-table-cell`, atau render data dalam bentuk list-card vertikal pada perangkat mobile menggunakan query `@media (max-width: 768px)`.
    *   **Optimasi Form & Filter Bar di Mobile:**
        *   Di layar HP, sembunyikan filter pencarian yang kompleks di dalam accordion collapsible (`.collapse`) atau sediakan tombol pemicu "Filter" yang membuka Modal / Bottom Sheet agar ruang kerja utama tidak tersumbang oleh input select.
        *   Pastikan tinggi tap target untuk semua tombol aksi, input form, dan item navigasi memiliki ukuran minimum `44px x 44px` untuk kenyamanan sentuhan jari (touch-friendly).
    *   **Spasi & Tipografi Adaptif:**
        *   Sesuaikan ukuran teks menggunakan satuan relatif atau batasi tinggi baris (`line-height: 1.3`). Perkecil ukuran font judul utama halaman dari `24px` di desktop menjadi `18px-20px` di mobile agar teks tidak terpotong (wrap) berantakan.
        *   Terapkan padding kontainer yang lebih kecil pada mobile (misal: `padding: 12px` untuk `.card-body` di HP, dibanding `20px` di monitor besar) untuk memaksimalkan efisiensi ruang baca.

### D. Keamanan Autentikasi & Cache Backend (Apps Script)
*   **File Target:** [code.gs](file:///Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/code.gs)
*   **Perubahan:**
    *   **Verifikasi Password Aman:** Hapus perbandingan password secara plain-text pada fungsi `processLogin` di baris 168. Ganti dengan pencocokan hash SHA-256 yang aman menggunakan fungsi `verifyPassword(inputPass, storedHash)`.
    *   **Apps Script CacheService:** Implementasikan penyimpanan cache data spreadsheet untuk fungsi penarikan data rekapitulasi dashboard. Jika data dalam 5 menit terakhir sudah pernah dibaca, kembalikan data dari cache server secara langsung untuk mempercepat respon.

---

## 🔍 3. Panduan Verifikasi (Uji Kelayakan)
1.  **Kecepatan Navigasi:** Berpindah antar menu setelah kunjungan pertama harus terjadi di bawah 100 milidetik (tanpa memicu progress bar merah NProgress).
2.  **Konsistensi Visual 100%:** Header halaman, spasi margin atas, separator garis, dan jenis filter di semua menu (misal: Kelola E-File, Kelola Lapbul) harus benar-benar identik karena dihasilkan oleh fungsi generator global `SultanUI`.
3.  **Keamanan Login:** Percobaan login menggunakan password mentah (plain-text) pada user yang sudah di-hash harus ditolak oleh sistem.
4.  **Bebas RAM Leak:** Memantau penggunaan tab memori pada Chrome Task Manager saat pengguna berpindah menu berulang kali; grafik memori harus tetap stabil dan tidak naik terus menerus.
5.  **Tampilan Mobile:** Halaman kelola data dan dashboard tidak boleh menampilkan scrollbar horizontal saat dibuka di resolusi layar 375px (iPhone SE) hingga 414px.
