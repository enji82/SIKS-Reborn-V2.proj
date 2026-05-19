import os
import re

# Read css_sultan.html
with open("css_sultan.html", "r", encoding="utf-8") as f:
    css_content = f.read()

# Extract only the CSS content inside <style>...</style> from css_sultan
css_clean = css_content.replace("<style>", "").replace("</style>", "")

# Read ui_helpers.html
with open("ui_helpers.html", "r", encoding="utf-8") as f:
    ui_helpers_content = f.read()

# Read all_scripts.js
with open("all_scripts.js", "r", encoding="utf-8") as f:
    all_scripts_content = f.read()

# Read page_lapbul_kelola.html
with open("page_lapbul_kelola.html", "r", encoding="utf-8") as f:
    lapbul_html = f.read()

# Prepare MENU_CONFIG mock
menu_config_mock = """
var MENU_CONFIG = [
  {
    id: "home",
    label: "Beranda",
    icon: "fas fa-home text-maroon",
    alwaysVisible: true
  },
  {
    label: "Laporan Bulan",
    icon: "fas fa-file-invoice text-maroon",
    children: [
      { id: "lapbul_dashboard", label: "Dashboard", icon: "far fa-circle" },
      { id: "lapbul_kelola", label: "Kelola Data", icon: "fas fa-calendar-alt text-maroon" },
      { id: "lapbul_status", label: "Status Data", icon: "far fa-circle" }
    ]
  }
];
"""

# Mock google.script.run
mock_script = """
<script>
""" + menu_config_mock + """

// Mock user session
function getSesiUser() {
  return {
    username: "admin",
    nama_lengkap: "Sultan Administrator",
    role: "admin",
    npsn: "12345678"
  };
}

var google = {
  script: {
    run: {
      withSuccessHandler: function(cb) {
        var self = this;
        self.successCb = cb;
        return self;
      },
      withFailureHandler: function(cb) {
        var self = this;
        self.failureCb = cb;
        return self;
      },
      getAllSchoolsList: function() {
        var schools = [
          {nama: "SDN 1 Sultan", jenjang: "SD", npsn: "69968606"},
          {nama: "TK An-Nur", jenjang: "TK", npsn: "20343653"}
        ];
        if (this.successCb) {
          var cb = this.successCb;
          setTimeout(function() { cb(schools); }, 200);
        }
        return this;
      },
      getUnitKerjaByNpsnPTK: function(npsn) {
        var res = JSON.stringify({
          unitKerja: "SDN 1 Sultan"
        });
        if (this.successCb) {
          var cb = this.successCb;
          setTimeout(function() { cb(res); }, 200);
        }
        return this;
      },
      getLapbulKelolaData: function(a, b, tahun, c, keyword) {
        var data = [
          {
            rowId: "1",
            source: "SDN 1 Sultan",
            namaSekolah: "SDN 1 Sultan",
            npsn: "69968606",
            bulan: "Januari",
            tahun: tahun,
            rombel: "6",
            fileUrl: "https://example.com/test.pdf",
            statusData: "Setuju",
            keterangan: "Laporan Valid",
            tglKirim: "10 Jan 2024 | 08:30",
            userKirim: "SDN 1 Sultan Admin",
            tglEdit: "10 Jan 2024 | 09:00",
            userEdit: "SDN 1 Sultan Admin",
            tglVerif: "11 Jan 2024 | 14:00",
            verifikator: "Admin Dinas"
          },
          {
            rowId: "2",
            source: "TK An-Nur",
            namaSekolah: "TK An-Nur",
            npsn: "20343653",
            bulan: "Februari",
            tahun: tahun,
            rombel: "2",
            fileUrl: "https://example.com/test2.pdf",
            statusData: "Diproses",
            keterangan: "",
            tglKirim: "05 Feb 2024 | 10:15",
            userKirim: "TK An-Nur Admin",
            tglEdit: "",
            userEdit: "",
            tglVerif: "",
            verifikator: ""
          }
        ];
        if (this.successCb) {
          var cb = this.successCb;
          setTimeout(function() { cb(data); }, 1000); // 1s delay to see loading spinner
        }
        return this;
      }
    }
  }
};

// Mock other Apps Script includes
function include(x) {
  return "";
}

var Sultan = {
  notif: {
    info: function(msg) { console.log("INFO:", msg); },
    gagal: function(msg) { console.log("FAILED:", msg); },
    sukses: function(msg) { console.log("SUCCESS:", msg); }
  }
};
</script>
"""

# HTML template combining everything
html_template = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SIKS - KELOLA LAPBUL PREVIEW</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
  <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css">
  <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.2.9/css/responsive.bootstrap4.min.css">
  <style>
""" + css_clean + """
  </style>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>
  <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
""" + ui_helpers_content + """
<script>
""" + all_scripts_content + """
</script>
""" + mock_script + """
</head>
<body class="hold-transition sidebar-mini layout-fixed p-4 bg-light">
  <div class="wrapper">
    <div class="content-wrapper" style="margin-left: 0; padding: 20px; background: transparent;">
""" + lapbul_html + """
    </div>
  </div>
</body>
</html>
"""

# Write combined HTML file
os.makedirs("scratch", exist_ok=True)
with open("scratch/preview_lapbul.html", "w", encoding="utf-8") as f:
    f.write(html_template)
print("Compiled scratch/preview_lapbul.html successfully.")
