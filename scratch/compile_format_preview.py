import os

# Read css_sultan.html
with open("css_sultan.html", "r", encoding="utf-8") as f:
    css_content = f.read()

# Extract only the CSS content inside <style>...</style> from css_sultan
css_clean = css_content.replace("<style>", "").replace("</style>", "")

# Read ui_helpers.html
with open("ui_helpers.html", "r", encoding="utf-8") as f:
    ui_helpers_content = f.read()

# Read page_lapbul_format.html
with open("page_lapbul_format.html", "r", encoding="utf-8") as f:
    format_html = f.read()

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
      { id: "lapbul_format", label: "Format Laporan", icon: "fas fa-file-excel text-maroon" }
    ]
  }
];
"""

# Mock google.script.run
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
  <title>SIKS - FORMAT LAPBUL PREVIEW</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
  <style>
""" + css_clean + """
  </style>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>
""" + ui_helpers_content + """
""" + mock_script + """
</head>
<body class="hold-transition sidebar-mini layout-fixed p-4 bg-light">
  <div class="wrapper">
    <div class="content-wrapper" style="margin-left: 0; padding: 20px; background: transparent;">
      <!-- Page Title Header Mock -->
      <div id="app-page-header"></div>
      <div id="app-content">
""" + format_html + """
      </div>
    </div>
  </div>
  <script>
    $(document).ready(function() {
      // Render the page header using ui_helpers.html
      $('#app-page-header').html(SultanUI.renderHeader('Format Laporan', 'Unduhan Berkas Format Laporan Bulanan', 'fas fa-file-excel'));
    });
  </script>
</body>
</html>
"""

# Write combined HTML file
os.makedirs("scratch", exist_ok=True)
with open("scratch/preview_format.html", "w", encoding="utf-8") as f:
    f.write(html_template)
print("Compiled scratch/preview_format.html successfully.")
