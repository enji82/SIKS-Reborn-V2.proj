import os
import re

files = [
    'Lapbul.gs',
    'Siaba_lupa.gs',
    'Siaba_salah.gs',
    'Siaba_cuti.gs',
    'Siaba_perjadin.gs',
    'PTK.gs',
    'Efile.gs',
    'SK.gs'
]

replacement = """
            var stLower = String(status || "").toLowerCase();
            var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");
            
            if (isAdmin) {
                unreadCount++;
            } else {
                if (isDisetujui && isRead) {
                    // Hilang hitungannya
                } else {
                    unreadCount++;
                }
            }"""

for file in files:
    if not os.path.exists(file): continue
    with open(file, 'r') as f:
        content = f.read()
    
    # Replace single line
    content = re.sub(r'if\s*\(!isRead\)\s*unreadCount\+\+;', replacement, content)
    # Replace multiline
    content = re.sub(r'if\s*\(!isRead\)\s*\{\s*unreadCount\+\+;\s*\}', replacement, content)
    
    with open(file, 'w') as f:
        f.write(content)

print("Done")
