#!/bin/bash
cd "$(dirname "$0")"

echo "=================================================="
echo "    MEMULAI SINKRONISASI (GAS & GITHUB)           "
echo "=================================================="
echo ""

# 1. Push ke Google Apps Script (GAS)
echo "--> Mengunggah kode terbaru ke Google Apps Script (GAS)..."
npx @google/clasp push

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Gagal mengunggah ke GAS. Sinkronisasi dibatalkan."
    echo ""
    read -p "Tekan [Enter] untuk menutup..."
    exit 1
fi

echo "--> BERHASIL mengunggah ke GAS!"
echo ""

# 2. Push ke GitHub
echo "--> Mengunggah kode terbaru ke GitHub (Backup)..."
if [ -z "$(git status --porcelain)" ]; then
    echo "Tidak ada perubahan baru untuk disimpan di GitHub (Workspace bersih)."
else
    git add .
    git commit -m "Auto-sync update"
    git push
    echo "--> BERHASIL mencadangkan ke GitHub!"
fi

echo ""
echo "=================================================="
echo "      SINKRONISASI SELESAI DENGAN SUKSES!         "
echo "=================================================="
echo ""
read -p "Tekan [Enter] untuk menutup jendela ini..."
