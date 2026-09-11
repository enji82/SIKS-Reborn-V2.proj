# Rules: Auto Push to GAS and GitHub

Setelah menyelesaikan perubahan kode atau pengeditan file project (terutama file `.html` dan `.gs`):
1. **Push ke Google Apps Script (GAS)**:
   Selalu jalankan `npx @google/clasp push -f` di terminal agar kode langsung teraplikasi di GAS/Web App tanpa perlu tombol sync manual.
2. **Commit & Push ke GitHub**:
   Jalankan `git add .`, buat pesan commit yang relevan, lalu jalankan `git push` agar repositori GitHub tetap sinkron dan up-to-date.
