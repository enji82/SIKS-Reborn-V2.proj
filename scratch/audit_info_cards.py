import os
import re

workspace_dir = "/Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj"
files = [
    "page_ptk_kelola_sds.html",
    "page_sk_data.html",
    "templates_sultan/tpl_sultan_kelola.html",
    "page_ptk_mutasi_sdn.html",
    "page_siaba_presensi_harian.html",
    "page_siaba_perjalanan_dinas.html",
    "page_ptk_mutasi_paud.html",
    "page_lapbul_kelola.html",
    "page_siaba_cuti_informasi.html",
    "page_siaba_cuti_sisa.html",
    "page_siaba_presensi_pulang.html",
    "page_siaba_presensi_salah.html",
    "page_siaba_presensi_unduh.html",
    "page_ptk_kebutuhan_sds.html",
    "page_siaba_cuti_data.html",
    "page_siaba_presensi_lupa.html",
    "page_ptk_kelola_paud.html",
    "page_ptk_keadaan_sds.html",
    "page_siaba_cuti_rekap.html",
    "page_ptk_kelola_sdn.html",
    "page_siaba_presensi_arsip.html",
    "page_ptk_mutasi_sds.html",
    "page_siaba_cuti_unggah.html",
    "page_siaba_presensi_tidak.html",
    "page_siaba_presensi_apel.html",
    "page_siaba_presensi_terlambat.html",
    "page_ptk_kebutuhan_sdn.html",
    "page_sk_status.html",
    "page_ptk_keadaan_sdn.html",
    "page_lapbul_status.html"
]

print(f"{'File Name':<45} | Icon Type | Chevron | Collapse Body Div Class/Style")
print("-" * 110)

for f in files:
    path = os.path.join(workspace_dir, f)
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
    
    # Extract the sultan-info-card block
    # Simple regex to get the block of text inside sultan-info-card up to collapse or early lines
    match = re.search(r'(<div class="sultan-info-card[^>]*>.*?<div[^>]*class="collapse"[^>]*>.*?<div[^>]*>)', content, re.DOTALL)
    if match:
        block = match.group(1)
        # Check icon
        icon_type = "Wrapped Circle" if "info-icon-circle" in block else "Raw Icon"
        if "fa-info-circle" in block:
            icon_type += " (fa-info-circle)"
        elif "fa-info" in block:
            icon_type += " (fa-info)"
        
        # Check chevron
        chevron = "UP" if "fa-chevron-up" in block else "DOWN" if "fa-chevron-down" in block else "None"
        
        # Check body inner div class/style
        inner_div_match = re.search(r'<div[^>]*class="collapse"[^>]*>\s*(<div[^>]*>)', block, re.DOTALL)
        inner_class = inner_div_match.group(1) if inner_div_match else "Unknown"
        
        print(f"{f:<45} | {icon_type:<20} | {chevron:<7} | {inner_class}")
    else:
        print(f"{f:<45} | NOT FOUND")
