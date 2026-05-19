import os

# Read css_sultan.html
with open("css_sultan.html", "r", encoding="utf-8") as f:
    css_content = f.read()

# Read page_setting.html
with open("page_setting.html", "r", encoding="utf-8") as f:
    setting_html = f.read()

# Extract only the CSS content inside <style>...</style> from css_sultan
css_clean = css_content.replace("<style>", "").replace("</style>", "")

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
    label: "SK Pembagian Tugas",
    icon: "fas fa-file-signature text-maroon",
    children: [
      { id: "sk_dashboard", label: "Dashboard", icon: "far fa-circle" },
      { id: "sk_data", label: "Kelola Data", icon: "far fa-circle" },
      { id: "sk_status", label: "Status Data", icon: "far fa-circle" }
    ]
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

# Also mock google.script.run
mock_script = """
<script>
""" + menu_config_mock + """

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
      getVisitorStats: function() {
        if (this.successCb) this.successCb({info: "Info Rapat Hari Senin | Server Maintenance"});
      },
      initSheetHakAkses: function() {},
      getDaftarUser: function() {
        var users = [
          {username: "admin", nama: "Sultan Administrator", role: "admin"},
          {username: "20343653", nama: "TK An-Nur", role: "user"},
          {username: "69968606", nama: "SDN 1 Sultan", role: "user"}
        ];
        if (this.successCb) this.successCb(JSON.stringify(users));
      },
      getDetailUser: function(username) {
        var detail = {
          username: username,
          nama: username === "admin" ? "Sultan Administrator" : (username === "20343653" ? "TK An-Nur" : "SDN 1 Sultan"),
          role: username === "admin" ? "admin" : "user",
          unit: username === "admin" ? "Dinas Pendidikan" : (username === "20343653" ? "TK An-Nur" : "SDN 1 Sultan"),
          aksesMenu: ["beranda", "sk_dashboard", "lapbul_dashboard"]
        };
        if (this.successCb) this.successCb(JSON.stringify(detail));
      },
      simpanRunningText: function(text) {
        alert("Simpan running text: " + text);
      },
      simpanWA: function(wa) {
        alert("Simpan WA: " + wa);
      }
    }
  }
};

// Mock other Apps Script includes
function include(x) {
  return "";
}
</script>
"""

# HTML template combining everything
html_template = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SIKS - SETTINGS PREVIEW</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
  <style>
""" + css_clean + """
  </style>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
""" + mock_script + """
</head>
<body class="hold-transition sidebar-mini layout-fixed p-4 bg-light">
  <div class="wrapper">
    <div class="content-wrapper" style="margin-left: 0; padding: 20px; background: transparent;">
""" + setting_html + """
    </div>
  </div>
</body>
</html>
"""

# Write combined HTML file
os.makedirs("scratch", exist_ok=True)
with open("scratch/preview.html", "w", encoding="utf-8") as f:
    f.write(html_template)
print("Compiled scratch/preview.html successfully.")
