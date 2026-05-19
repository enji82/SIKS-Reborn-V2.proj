import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html') or f.endswith('.js')]

for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
    
    # We want to find success callbacks. 
    # Usually they look like:
    # if (res === 'Sukses') { ... }
    # Let's just find Swal.fire('Berhasil' or Swal.fire("Berhasil"
    # and insert sultan_fetchNotifikasi() after it if not present.
    
    # Regex to find Swal.fire(..., ..., 'success') or similar and append sultan_fetchNotifikasi
    # A safer way: just add a global interval? The system already fetches on interval?
    # Wait, the user specifically asked for "menghitung ulang otomatis jika melakukan perubahan Status"
    pass
