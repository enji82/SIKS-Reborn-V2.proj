
    // Konfigurasi AdminLTE untuk SPA (Mencegah iframe menyedot RAM)
    localStorage.setItem('AdminLTE:IFrame:Options', JSON.stringify({autoIframeMode:false}));
  

  console.log("🔥 Login Page Loaded v3 (In-Card).");

  function togglePassword() {
    var x = document.getElementById("password");
    var icon = document.getElementById("togglePass");
    if (x.type === "password") {
      x.type = "text"; icon.classList.remove("fa-eye"); icon.classList.add("fa-eye-slash"); icon.style.color = "#800000";
    } else {
      x.type = "password"; icon.classList.remove("fa-eye-slash"); icon.classList.add("fa-eye"); icon.style.color = "#999";
    }
  }

  function runFireworks() {
    if(typeof confetti !== 'undefined'){
       var duration = 3000; var animationEnd = Date.now() + duration;
       var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2147483647 };
       var interval = setInterval(function() {
         var timeLeft = animationEnd - Date.now();
         if (timeLeft <= 0) { return clearInterval(interval); }
         var particleCount = 50 * (timeLeft / duration);
         confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 }, colors: ['#FFD700', '#800000'] }));
       }, 250);
    }
  }

  function handleLoginExec(e) {
    e.preventDefault(); 
    var u = $('#username').val();
    var p = $('#password').val();
    var btn = $('#tombolLogin');
    var box = $('.login-box');

    // UI Loading Button
    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> MEMERIKSA...');
    
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.status === 'success') {
          // --- SUKSES: JANGAN PAKAI ALERT, GANTI TAMPILAN KARTU ---
          console.log("✅ Login Sukses");
          
          // 1. Simpan Session
          var fullName = "User";
          if (res.userData) {
             fullName = res.userData.nama_lengkap || res.userData.username;
             if(!res.userData.nama_lengkap) res.userData.nama_lengkap = res.userData.username;
             localStorage.setItem("siksUser", JSON.stringify(res.userData));
          }

          // 2. Jalankan Kembang Api
          runFireworks();

          // 3. TRANSISI UI (FADE OUT FORM -> FADE IN SUCCESS)
          // Siapkan data tampilan sukses
          $('#welcomeName').text(fullName);
          var avatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(fullName) + "&background=800000&color=fff&bold=true";
          if(res.userData.photo && res.userData.photo.startsWith("http")) avatarUrl = res.userData.photo;
          else if(res.userData.photo) avatarUrl = "https://drive.google.com/thumbnail?id=" + res.userData.photo + "&sz=200";
          $('#userAvatar').attr('src', avatarUrl);

          // Animasi Header (Menyusut sedikit biar elegan)
          $('#logoBox').css('transform', 'scale(0.8)');
          $('#headerText').slideUp(300); // Sembunyikan teks judul biar fokus ke user
          $('.card-header-premium').css('padding-bottom', '20px');

          // Ganti Konten Body
          $('#viewForm').fadeOut(300, function() {
              $('#viewSuccess').fadeIn(500);
          });

          // 4. TRANSISI KE DASHBOARD (Setelah 2 detik menikmati animasi)
          setTimeout(function(){
            // Gunakan updateNavbarUI global jika ada
            if(typeof updateNavbarUI === 'function' && res.userData) {
                updateNavbarUI(res.userData);
            }
            
            // Fade Out Login Screen
            $('.login-screen-wrapper').fadeOut(600, function(){
                $('#konten-aplikasi').fadeIn(600); // Tampilkan Dashboard
                if(typeof loadContent === 'function') {
                    loadContent('home'); 
                }
                $(window).trigger('resize');
            });
          }, 2000);

        } else {
          // --- GAGAL (TETAP PAKAI TOAST) ---
          console.log("⛔ Login Gagal: " + res.message);
          btn.prop('disabled', false).html('<i class="fas fa-sign-in-alt mr-2"></i> MASUK APLIKASI');
          
          box.addClass('shake-effect');
          setTimeout(() => box.removeClass('shake-effect'), 500);
          
          if(typeof Swal !== 'undefined'){
              const isDark = $('body').hasClass('dark-mode');
              const theme = {
                bg: isDark ? '#1a1c1e' : '#fff',
                color: isDark ? '#333' : '#333' // Login card is light, so toast should be light? 
              };
              // Sebenarnya kartu login putih, jadi toast putih sudah benar. 
              // Tapi user minta adaptif.
              const Toast = Swal.mixin({
                toast: true, position: 'top', showConfirmButton: false, timer: 3000,
                timerProgressBar: true, background: theme.bg, color: isDark ? '#f1f3f5' : '#333', iconColor: '#dc3545',
                didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
              });
              Toast.fire({ icon: 'error', title: 'Login Gagal', text: res.message || "Periksa kembali data Anda." });
          } else {
              alert("LOGIN GAGAL: " + (res.message || "Username/Password Salah"));
          }
        }
      })
      .withFailureHandler(function(err) {
        btn.prop('disabled', false).html('<i class="fas fa-sign-in-alt mr-2"></i> MASUK APLIKASI');
        alert("Koneksi Server Terputus!");
      })
      .processLogin({username: u, password: p});
  }


// Ini adalah "kulkas" data kita
const DROPDOWN_STATIS = {
  
  "Agama": [
    "Islam", 
    "Kristen", 
    "Katolik", 
    "Hindu", 
    "Buddha", 
    "Konghucu", 
    "Kepercayaan"
  ],
  
  "Pendidikan": [
    "S2", "S1", "D4", "D3", "D2", "D1", 
    "SMA", "SMK", "MA", "Paket C", 
    "SMP", "MTs", "Paket B", 
    "SD", "MI", "Paket A"
  ],

  "StatusKepegawaian": [
    "PNS",
    "PPPK",
    "PPPK PW",
    "Tenaga Non ASN"
  ],

  "StatusKepegawaianSwasta": [
    "GTY",
    "PTY",
    "GTT",
    "PTT"
  ],

  "TugasJabatan": [
    "Kepala Sekolah", "Guru Kelas", "Guru PAI", "Guru PJOK", 
    "Guru PA Kristen", "Guru PA Katolik", "Guru Bhs. Inggris", 
    "Guru TIK", "Guru Inklusi", "Guru Mapel Lainnya", 
    "Operator Layanan Operasional", "Pengelola Umum Operasional", 
    "Pengelola Layanan Operasional", "Penata Layanan Operasional", 
    "Pengadministrasi Perkantoran", "Penjaga", "Tenaga Administrasi", 
    "Pustakawan", "Tendik Lainnya"
  ],

  "TugasTambahan": [
    "Bendahara BOS", "Operator Dapodik", "Pengelola Aset", 
    "Administrasi Sekolah", "Pembina Ekstrakurikuler", 
    "Petugas Perpustakaan", "Tugas Lainnya", "Tidak Ada Tugas Tambahan"
  ],
  
  "NamaSD": ["SDN SECANG 1", "SDN SECANG 2", "SDN SECANG 3", "SDN KRINCING", 
    "SDN KUWALUHAN", "SDN MADUSARI", "SDN NGABEAN", "SDN MADYOCONDRO", 
    "SDN NGADIROJO", "SDN KALIJOSO", "SDN PAYAMAN 1", "SDN JAMBEWANGI", 
    "SDN PANCURANMAS", "SDN PUCANG", "SDN PIRIKAN", "SDN SETAN",
    "SDN CANDISARI", "SDN SIDOMULYO", "SDN DONOMULYO", "SDN PURWOSARI", 
    "SDN KARANGKAJEN", "SDN GIRIKULON", "SD MUHAMMADIYAH PAYAMAN", 
    "SD MUHAMMADIYAH DONOREJO", "SDIT AR RISALAH", "SDIT ALAM AL HIKMAH", 
    "SDQ ANWARUL MUKHLASIN"
  ],

    "UnitKerja": ["SDN SECANG 1", "SDN SECANG 2", "SDN SECANG 3", "SDN KRINCING", 
    "SDN KUWALUHAN", "SDN MADUSARI", "SDN NGABEAN", "SDN MADYOCONDRO", 
    "SDN NGADIROJO", "SDN KALIJOSO", "SDN PAYAMAN 1", "SDN JAMBEWANGI", 
    "SDN PANCURANMAS", "SDN PUCANG", "SDN PIRIKAN", "SDN SETAN",
    "SDN CANDISARI", "SDN SIDOMULYO", "SDN DONOMULYO", "SDN PURWOSARI", 
    "SDN KARANGKAJEN", "SDN GIRIKULON"
  ],

      "UnitKerjaSiaba": ["SDN SECANG 1", "SDN SECANG 2", "SDN SECANG 3", "SDN KRINCING", 
    "SDN KUWALUHAN", "SDN MADUSARI", "SDN NGABEAN", "SDN MADYOCONDRO", 
    "SDN NGADIROJO", "SDN KALIJOSO", "SDN PAYAMAN 1", "SDN JAMBEWANGI", 
    "SDN PANCURANMAS", "SDN PUCANG", "SDN PIRIKAN", "SDN SETAN",
    "SDN CANDISARI", "SDN SIDOMULYO", "SDN DONOMULYO", "SDN PURWOSARI", 
    "SDN KARANGKAJEN", "SDN GIRIKULON", "TKN PEMBINA"
  ],

  "TahunAjaran": ["2025/2026", "2024/2025", "2023/2024", "2022/2023"],
  "Semester": ["Semester 1", "Semester 2"],
  "KriteriaSK": [
    "Awal Semester", "Perubahan ke 1", "Perubahan ke 2", "Perubahan ke 3", "Perubahan ke 4", "Perubahan ke 5"
  ],
};

function renderDropdown(elementId, kategori) {
    const d = $('#' + elementId);
    if (!d.length) return;
    
    d.empty().append('<option value="">-- Pilih --</option>');
    
    // Pastikan memanggil DROPDOWN_STATIS sesuai nama objek di atas
    if (DROPDOWN_STATIS[kategori]) {
      DROPDOWN_STATIS[kategori].forEach(item => {
        d.append('<option value="' + item + '">' + item + '</option>');
      });
    } else {
      console.warn("Kategori dropdown tidak ditemukan: " + kategori);
    }
}


var SultanUI = {
    /**
     * Menghasilkan HTML Empty State yang Cantik
     * @param {string} judul - Judul pesan
     * @param {string} deskripsi - Deskripsi pesan
     * @param {string} icon - FontAwesome icon class
     */
    emptyState: function(judul = "Data Kosong", deskripsi = "Belum ada data untuk ditampilkan.", icon = "fa-folder-open") {
        return `
            <div class="d-flex flex-column align-items-center justify-content-center p-5 text-center sultan-page-transition">
                <div class="icon-circle mb-4" style="width: 100px; height: 100px; font-size: 40px; line-height: 100px; border-radius: 30px; background: linear-gradient(135deg, #fff5f5 0%, #fff 100%); box-shadow: var(--shadow-md); border: 1px solid rgba(128,0,0,0.05);">
                    <i class="fas ${icon} text-maroon" style="opacity: 0.3;"></i>
                </div>
                <h5 class="font-weight-bold text-dark mb-2" style="letter-spacing: -0.5px;">${judul}</h5>
                <p class="text-muted small mb-0" style="max-width: 280px; line-height: 1.6;">${deskripsi}</p>
            </div>
        `;
    },

    /**
     * Menampilkan Spinner Loading Terpusat
     * @param {string} targetId - ID elemen target (misal: '#lapbulkelola_loadingState')
     * @param {string} text - Teks indikator proses
     */
    showLoading: function(targetId, text = "Memuat Data...") {
        var $target = $(targetId);
        
        if ($target.find('.sultan-loading-text').length > 0) {
            $target.find('.sultan-loading-text').text(text);
            $target.show();
            return;
        }

        const html = `
            <div class="sultan-loading-box sultan-page-transition">
                <div class="sultan-spinner-icon">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <h6 class="text-dark font-weight-bold sultan-loading-text mb-0" style="letter-spacing: 0.5px; text-transform: uppercase; font-size: 11px;">${text}</h6>
            </div>
        `;
        $target.html(html).show();
    },

    /**
     * Menyembunyikan Spinner Loading Terpusat
     * @param {string} targetId - ID elemen target
     */
    hideLoading: function(targetId) {
        $(targetId).empty().hide();
    },

    /**
     * Otomatis deteksi waktu terakhir dari data log (Global Standard)
     * @param {Array} rows - Data baris dari server
     * @param {string} txtId - ID penampung teks (default: '#statussk_txtLastUpdate')
     * @param {string} areaId - ID penampung area (default: '#statussk_lastUpdateArea')
     */
    autoDetectLastUpdate: function(rows, txtId, areaId) {
        var tglTerakhir = null;
        if (rows && rows.length > 0) {
            rows.forEach(function(row) {
                var searchArea = Array.isArray(row) ? row : Object.values(row);
                searchArea.forEach(function(val) {
                    var sVal = String(val || "");
                    if (sVal.includes('|')) {
                        var parts = sVal.split('|');
                        parts.forEach(function(p) {
                            p = p.trim();
                            if (p.match(/\d{2,4}[-/]\d{2}[-/]\d{2,4}/) || p.match(/\d{2}:\d{2}/)) {
                                if (!tglTerakhir || p > tglTerakhir) tglTerakhir = p;
                            }
                        });
                    }
                });
            });
        }
        if (!tglTerakhir) {
            var now = new Date();
            tglTerakhir = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (Sinkron)';
        }
        $(txtId).text(tglTerakhir);
        $(areaId).show();
    }
};


/* =============================================================
   1. GLOBAL HELPER: NOTIFIKASI SULTAN (THEME FIX)
   ============================================================= */
var NotifSultan = {
  config: { warnaMaroon: '#800000', warnaHitam: '#343a40', warnaSukses: '#28a745', warnaGagal: '#dc3545', warnaWarning: '#ffc107', warnaBatal: '#6c757d' },
  getTheme: () => {
    const isDark = $('body').hasClass('dark-mode');
    return {
      bg: isDark ? '#1a1c1e' : '#fff',
      color: isDark ? '#f1f3f5' : '#343a40'
    };
  },
  toast: (tipe, pesan) => {
    const theme = NotifSultan.getTheme();
    Swal.mixin({ 
      toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
      timerProgressBar: true, background: theme.bg, color: theme.color 
    })
    .fire({ icon: tipe, title: `<span style="font-weight:600">${pesan}</span>` });
  },
  alert: (tipe, judul, pesan) => {
    const theme = NotifSultan.getTheme();
    let btnColor = (tipe === 'success') ? NotifSultan.config.warnaMaroon : NotifSultan.config.warnaGagal;
    return Swal.fire({ 
        icon: tipe, 
        title: `<h5 class="font-weight-bold" style="margin-top:10px; color:${NotifSultan.config.warnaMaroon}">${judul}</h5>`, 
        html: `<div class="text-muted">${pesan}</div>`, 
        width: '350px', 
        confirmButtonColor: btnColor, 
        background: theme.bg,
        color: theme.color,
        padding: '1.2rem', 
        customClass: { popup: 'card-sultan' } 
    });
  },
  loading: (pesan) => {
    const theme = NotifSultan.getTheme();
    Swal.fire({ 
        width: '300px', title: '', 
        background: theme.bg,
        color: theme.color,
        html: `<div class="text-center p-3"><div class="spinner-border text-maroon" style="width: 3rem; height: 3rem;"></div><p class="mt-3 mb-0 font-weight-bold text-secondary">${pesan || 'Memproses...'}</p></div>`, 
        showConfirmButton: false, allowOutsideClick: false,
        customClass: { popup: 'card-sultan' }
    });
  }
};

/* =============================================================
   1.B GABUNGAN CORE SULTAN
   ============================================================= */
var Sultan = {
    notif: {
        sukses: (pesan) => NotifSultan.toast('success', pesan),
        gagal: (pesan) => NotifSultan.toast('error', pesan),
        info: (pesan) => NotifSultan.toast('info', pesan),
        loading: (judul) => NotifSultan.loading(judul),
        tutup: () => Swal.close(),
        crud: {
            sukses: (msg) => NotifSultan.toast('success', msg || 'Operasi berhasil!'),
            simpan: (isUpdate) => NotifSultan.toast('success', isUpdate ? 'Perubahan data berhasil disimpan!' : 'Data baru berhasil ditambahkan!'),
            hapus: () => NotifSultan.toast('success', 'Data telah berhasil dihapus dari sistem.'),
            gagal: (err) => NotifSultan.alert('error', 'Gagal Memproses Data', err || 'Terjadi kendala teknis, silakan coba lagi.')
        }
    },
    alert: NotifSultan.alert,
    konfirmasi: function(opsi, callbackYa) {
        const theme = NotifSultan.getTheme();
        return Swal.fire({
            title: `<h5 class="font-weight-bold text-maroon">${opsi.judul || 'Konfirmasi'}</h5>`,
            text: opsi.teks || "Apakah Anda yakin?",
            icon: opsi.icon || 'warning', 
            showCancelButton: true, 
            confirmButtonColor: opsi.confirmButtonColor || '#800000', 
            cancelButtonColor: opsi.cancelButtonColor || '#6c757d',  
            confirmButtonText: opsi.btnYa || 'Ya, Lanjutkan', 
            cancelButtonText: opsi.btnBatal || 'Batal',
            background: theme.bg,
            color: theme.color,
            customClass: { popup: 'card-sultan' }
        }).then((result) => {
            if (result.isConfirmed && callbackYa) callbackYa();
        });
    },
    format: {
        strip: function(val) { return (!val || val == "0" || val == "") ? "-" : val; },
        rupiah: function(angka) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka); },
        tanggal: function(dateStr) {
            if(!dateStr) return "-";
            var d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
};

function toast(pesan, tipe) { NotifSultan.toast(tipe, pesan); }
function tampilkanNotif(pesan, tipe) { NotifSultan.toast(tipe, pesan); }

/* =============================================================
   2. SISTEM MANAJEMEN SESI & ROLE
   ============================================================= */
function getSesiUser() {
    var raw = localStorage.getItem("siksUser");
    if (!raw || raw === "null" || raw === "undefined") return null;
    try { 
        var parsed = JSON.parse(raw); 
        if (typeof parsed === 'string') parsed = JSON.parse(parsed); 
        return parsed;
    } catch (e) { return null; }
}

function checkUserRoleIsAdmin() {
    try {
        var user = getSesiUser();
        if (!user) return false;
        var role = String(user.role || "").toLowerCase();
        
        // VAKSIN 1: Gunakan .includes() agar "Administrator", "Admin Korwil", dll bisa lolos
        if (role.includes('admin') || role.includes('verifikator') || role.includes('korwil')) return true;
        return false;
    } catch (e) { return false; }
}

/* =============================================================
   3. CORE APP SCRIPT (INISIALISASI & ROUTING)
   ============================================================= */
$(document).ready(function() {
  console.log("SIKS-REBORN: Engine Started.");
  $(document).on('show.bs.modal', '.modal', function () { $(this).appendTo('body'); });
  inisialisasiAplikasi();

  $(document).on('click', '.nav-sidebar .nav-link', function(e) {
      var pageName = $(this).data('page'); 
      if (pageName) {
          e.preventDefault(); loadContent(pageName); 
          if ($(window).width() < 768) { $('body').removeClass('sidebar-open').addClass('sidebar-closed sidebar-collapse'); }
      }
  });

  $(document).on('click', '.btn-home-crumb', function(e) {
      e.preventDefault(); loadContent('home');
  });

  sultan_initDarkMode();
  $(document).on('change', '#sultan_darkModeToggle', sultan_toggleDarkMode);
});

function inisialisasiAplikasi() {
  var preloader = $('.preloader');
  try {
      var user = getSesiUser();
      if (!user) {
        $('#konten-aplikasi').hide(); $('#gerbang-login').fadeIn('fast'); 
        if (preloader.length) preloader.fadeOut('fast');
        return;
      }
      $('#gerbang-login').hide(); $('#konten-aplikasi').fadeIn('fast');

      // Render sidebar dari MENU_CONFIG (SSOT)
      renderSidebar();

      updateUI(user); 
      tampilkanMenuAdmin(user); 
      
      // Filter sidebar sesuai hak akses user
      filterSidebarByAkses(user.aksesMenu || []);

      loadContent('home'); 
      if (preloader.length) preloader.fadeOut('fast');

      var isInvalidName = !user.nama_lengkap || user.nama_lengkap === "User Web" || user.nama_lengkap === user.username;
      if (isInvalidName && user.username) {
          google.script.run.withSuccessHandler(function(res){
              if(res.found && res.nama_lengkap) {
                  user.nama_lengkap = res.nama_lengkap; user.nama = res.nama_lengkap; 
                  user.role = res.role; user.unit = res.unit;
                  localStorage.setItem("siksUser", JSON.stringify(user));
                  updateUI(user);
              }
          }).getUserProfileByName(user.username);
      }
  } catch(fatalError) {
      $('#gerbang-login').hide(); $('#konten-aplikasi').show();
      loadContent('home');
      if (preloader.length) preloader.fadeOut('fast');
  }
}

/* =============================================================
   4. ENGINE ROUTING ANTI-BLINK
   ============================================================= */
var SPA_IS_NAVIGATING = false;  // GUARD: Mencegah loadContent dipanggil ganda
var SPA_CURRENT_PAGE = '';      // Tracking halaman aktif

function loadContent(pageName) {
  if (!pageName) return;

  // GUARD 1: Tolak navigasi ke halaman yang sama jika sudah aktif
  if (SPA_CURRENT_PAGE === pageName && SPA_IS_NAVIGATING) return;

  // GUARD 2: Tolak jika sedang dalam proses navigasi halaman lain
  if (SPA_IS_NAVIGATING) return;

  SPA_IS_NAVIGATING = true;
  SPA_CURRENT_PAGE = pageName;

  const $content = $('#app-content');
  $content.removeClass('sultan-page-transition');

  $('body > .modal').remove(); $('.modal-backdrop').remove(); $('body').removeClass('modal-open').css('padding-right', '');
  highlightSidebar(pageName); updateBreadcrumb(pageName);

  if (typeof NProgress !== 'undefined') { NProgress.configure({ showSpinner: false, speed: 400 }); NProgress.start(); }

  $content.css('min-height', $content.height() + 'px');
  $content.css({'transition': 'opacity 0.2s ease', 'opacity': '0'});

  google.script.run
    .withSuccessHandler(function(html) {
      if (typeof NProgress !== 'undefined') NProgress.done();
      setTimeout(function() {
          $content.html(html).addClass('sultan-page-transition');
          void $content[0].offsetWidth; $content.css('opacity', '1');
          setTimeout(function() { $content.css('min-height', ''); }, 300);
          SPA_IS_NAVIGATING = false; // BUKA KUNCI setelah halaman berhasil dimuat
      }, 200);
    })
    .withFailureHandler(function(err) {
      if (typeof NProgress !== 'undefined') NProgress.done();
      setTimeout(function() {
          $content.html('<div class="alert alert-danger m-3">Gagal memuat halaman: ' + err.message + '</div>').css('opacity', '1');
          $content.css('min-height', '');
      }, 200);
      Sultan.notif.gagal('Gagal Memuat Halaman');
      SPA_IS_NAVIGATING = false; // BUKA KUNCI juga jika gagal agar user bisa coba lagi
    })
    .loadPage(pageName);
}


/* =============================================================
   5. FUNGSI LOGIN & LOGOUT (FIX BLANK SCREEN)
   ============================================================= */
function handleLoginV2(event) {
  event.preventDefault();
  var btn = document.getElementById("tombolLogin");
  var form = document.getElementById("formLogin");
  
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Memproses...';
  btn.disabled = true;

    // LOGIKA KHUSUS SURAT CUTI: JANGAN TANDAI DIBACA JIKA MASIH BUTUH AKSI
    if (source === "SuratCuti") {
        var s = String(status || "").toLowerCase();
        var butuhAksi = (s.includes("proses") || s.includes("revisi") || s.includes("tolak") || s.includes("belum"));
        if (butuhAksi) {
            console.log("Notifikasi Surat Cuti tetap Unread sampai aksi dilakukan.");
            return; // STOP: Jangan tandai dibaca
        }
    }

    google.script.run
        .withSuccessHandler(function() { sultan_refreshNotifBadge(); })

  google.script.run
    .withSuccessHandler(function(response) {
      if (response.status === "success") {
        var userBersih = response.userData ? response.userData : response;
        localStorage.setItem("siksUser", JSON.stringify(userBersih));
        Sultan.notif.sukses('Login Berhasil!');
        setTimeout(function() { 
            btn.innerText = "MASUK"; btn.disabled = false;
            inisialisasiAplikasi(); 
        }, 500); 
      } else {
        btn.innerText = "MASUK"; btn.disabled = false;
        Sultan.alert('error', 'Login Gagal', response.message || "Username/Password salah.");
      }
    })
    .withFailureHandler(function(err) {
      btn.innerText = "MASUK"; btn.disabled = false;
      Sultan.alert('error', 'Koneksi Gagal', err.message);
    })
    .processLogin(form);
}

function handleLogout() {
    const theme = NotifSultan.getTheme();
    Swal.fire({
        title: '<h5 class="text-maroon font-weight-bold mb-0">Keluar Aplikasi?</h5>',
        text: 'Sesi Anda akan diakhiri.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Logout',
        background: theme.bg,
        color: theme.color,
        customClass: { popup: 'card-sultan' }
    }).then((result) => {
        if (result.isConfirmed) {
            
            // 1. Hapus memori user dari Local Storage
            localStorage.removeItem("siksUser");
            
            // 2. Sembunyikan Dashboard dan bersihkan sisa konten
            $('#konten-aplikasi').hide();
            $('#app-content').empty();
            $('body').removeClass('sidebar-open modal-open').css('padding-right', '0');
            
            // 3. MUNCULKAN KEMBALI GERBANG LOGIN (DOM Asli Buatan Anda)
            $('#gerbang-login').fadeIn('fast');
            $('.login-screen-wrapper').show();
            $('#viewSuccess').hide();
            $('#viewForm').show();
            $('#logoBox').css('transform', 'scale(1)');
            $('#headerText').show();
            $('.card-header-premium').css('padding-bottom', '50px');
            
            // 4. PELINDUNG ANTI-CRASH: Cek apakah form ada sebelum di-reset
            // Ini menyelesaikan masalah awal tombol tidak bereaksi tanpa perlu me-reload halaman
            if ($('#formLogin').length > 0) {
                $('#formLogin')[0].reset();
            }
            
            if ($('#tombolLogin').length > 0) {
                $('#tombolLogin').prop('disabled', false).html('<i class="fas fa-sign-in-alt mr-2"></i> MASUK APLIKASI');
            }
            
            // 5. Kembalikan posisi scroll ke puncak layar
            window.scrollTo(0, 0);
        }
    });
}

/* =============================================================
   6. MANAJEMEN UI (Sidebar & Navigation)
   ============================================================= */
function updateUI(u) {
  if (!u) return; 
  var name = u.nama_lengkap || u.fullName || u.nama || u.username || "User";
  var photo = u.photo || u.foto || "";
  var role = u.role || "User";
  var f = photo ? 'https://drive.google.com/thumbnail?id=' + photo + '&sz=w200' : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=random';
  
  $('#nav-user-photo, #dropdown-user-photo').attr('src', f);
  $('#nav-user-name, #dropdown-user-name-big, .user-panel .info a').text(name);
  $('#dropdown-user-role').text(role);
  $('.user-capsule span, .user-menu .nav-link span, .dropdown-user .dropdown-toggle span').text(name);

  if($('#uniUserLogin').length) $('#uniUserLogin').val(name);
  
  // Panggil Notifikasi Global
  if (typeof sultan_fetchNotifikasi === "function") {
      sultan_fetchNotifikasi();
  }
  
  // Paksa update warna setiap kali dropdown notif dibuka
  $(document).on('show.bs.dropdown', '.nav-item.dropdown', function() {
      sultan_forceApplyColors();
  });
}

function tampilkanMenuAdmin(user) {
  if (!user) return;
  var isAdmin = checkUserRoleIsAdmin();
  // Tampilkan/sembunyikan menu khusus admin dari MENU_CONFIG
  MENU_CONFIG.forEach(function(item) {
    if (!item.adminOnly) return;
    var el = $('[data-page="' + item.id + '"]').closest('.nav-item');
    if (isAdmin) { el.removeClass('d-none').show(); }
    else { el.addClass('d-none').hide(); }
  });
  // Legacy: ID-based admin menu
  var daftarMenuAdmin = ["menuTrashSK", "menu-monitoring-admin"];
  daftarMenuAdmin.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (isAdmin) { el.classList.remove("d-none"); el.style.display = ""; }
      else { el.classList.add("d-none"); }
    }
  });
}

/* =============================================================
   MENU_CONFIG — SINGLE SOURCE OF TRUTH
   Semua perubahan menu cukup dilakukan di sini.
   Sidebar dan panel Pengaturan keduanya dibaca dari config ini.
   ============================================================= */
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
      { id: "sk_data",      label: "Kelola Data", icon: "far fa-circle", badge: "sidebar-notif-sk" },
      { id: "sk_status",   label: "Status Data",  icon: "far fa-circle" }
    ]
  },
  {
    label: "Laporan Bulanan",
    icon: "fas fa-file-invoice text-maroon",
    children: [
      { id: "lapbul_dashboard", label: "Dashboard",     icon: "far fa-circle" },
      { id: "lapbul_kelola",    label: "Kelola Data",   icon: "fas fa-calendar-alt text-maroon", badge: "sidebar-notif-lapbul" },
      { id: "lapbul_status",    label: "Status Data",   icon: "far fa-circle" },
      { id: "lapbul_format",    label: "Format Laporan",icon: "fas fa-file-excel" }
    ]
  },
  {
    label: "SIABA",
    icon: "fas fa-fingerprint text-maroon",
    children: [
      { id: "siaba_dashboard", label: "Dashboard", icon: "far fa-circle" },
      {
        label: "Presensi",
        icon: "far fa-circle",
        children: [
          { id: "siaba_presensi_harian",    label: "Harian",              icon: "far fa-dot-circle" },
          { id: "siaba_presensi_apel",      label: "Apel dan Upacara",    icon: "far fa-dot-circle" },
          { id: "siaba_presensi_tidak",     label: "Tidak Presensi",      icon: "far fa-dot-circle" },
          { id: "siaba_presensi_terlambat", label: "Terlambat",           icon: "far fa-dot-circle" },
          { id: "siaba_presensi_pulang",    label: "Pulang Awal",         icon: "far fa-dot-circle" },
          { id: "siaba_presensi_unduh",     label: "Unduh Rekap Bulanan", icon: "far fa-dot-circle" },
          { id: "siaba_presensi_arsip",     label: "Arsip Siaba",         icon: "far fa-dot-circle" }
        ]
      },
      { id: "siaba_presensi_lupa",    label: "Lupa Presensi",    icon: "far fa-circle", badge: "sidebar-notif-lupa" },
      { id: "siaba_presensi_salah",   label: "Salah Presensi",   icon: "far fa-circle", badge: "sidebar-notif-salah" },
      { id: "siaba_perjalanan_dinas", label: "Perjalanan Dinas", icon: "far fa-circle", badge: "sidebar-notif-perdin" },
      {
        label: "Cuti",
        icon: "far fa-circle",
        children: [
          { id: "siaba_cuti_data",      label: "Pengajuan",          icon: "far fa-dot-circle", badge: "sidebar-notif-cuti" },
          { id: "siaba_cuti_sisa",      label: "Sisa Cuti Tahunan",  icon: "far fa-dot-circle" },
          { id: "siaba_cuti_rekap",     label: "Rekapitulasi",       icon: "far fa-dot-circle" },
          { id: "siaba_cuti_unggah",    label: "Unggah Surat Cuti",  icon: "far fa-dot-circle", badge: "sidebar-notif-surat-cuti" },
          { id: "siaba_cuti_informasi", label: "Informasi",          icon: "far fa-dot-circle" }
        ]
      },
      { id: "siaba_format_panduan", label: "Format dan Panduan", icon: "far fa-circle" }
    ]
  },
  {
    id: "tata_naskah_dinas",
    label: "Tata Naskah Dinas",
    icon: "fas fa-file-signature text-maroon"
  },
  {
    label: "Data PTK",
    icon: "fas fa-users text-maroon",
    children: [
      { id: "ptk_dashboard", label: "Dashboard", icon: "far fa-circle" },
      {
        label: "PAUD",
        icon: "fas fa-child",
        children: [
          { id: "ptk_kelola_paud",  label: "Daftar Nama", icon: "far fa-circle" },
          { id: "ptk_mutasi_paud",  label: "Riwayat Mutasi", icon: "far fa-circle" },
          { id: "ptk_keadaan_paud", label: "Keadaan",     icon: "far fa-circle" }
        ]
      },
      {
        label: "SD Negeri",
        icon: "fas fa-school",
        children: [
          { id: "ptk_kelola_sdn",    label: "Daftar Nama",   icon: "far fa-circle" },
          { id: "ptk_mutasi_sdn",    label: "Riwayat Mutasi", icon: "far fa-circle" },
          { id: "ptk_keadaan_sdn",   label: "Keadaan",       icon: "far fa-circle" },
          { id: "ptk_kebutuhan_sdn", label: "Kebutuhan Guru",icon: "far fa-circle" }
        ]
      },
      {
        label: "SD Swasta",
        icon: "fas fa-school",
        children: [
          { id: "ptk_kelola_sds",    label: "Daftar Nama",   icon: "far fa-circle" },
          { id: "ptk_mutasi_sds",    label: "Riwayat Mutasi", icon: "far fa-circle" },
          { id: "ptk_keadaan_sds",   label: "Keadaan",       icon: "far fa-circle" },
          { id: "ptk_kebutuhan_sds", label: "Kebutuhan Guru",icon: "far fa-circle" }
        ]
      }
    ]
  },
  {
    label: "Data Murid",
    icon: "fas fa-user-graduate text-maroon",
    children: [
      { id: "murid_dashboard", label: "Dashboard", icon: "far fa-circle" },
      {
        label: "PAUD",
        icon: "fas fa-child",
        children: [
          { id: "murid_paud_rombel",        label: "Menurut Rombel",  icon: "far fa-circle" },
          { id: "murid_paud_jenis_kelamin", label: "Menurut Gender",  icon: "far fa-circle" }
        ]
      },
      {
        label: "SD",
        icon: "fas fa-school",
        children: [
          { id: "murid_sd_kelas",  label: "Menurut Kelas",  icon: "far fa-circle" },
          { id: "murid_sd_rombel", label: "Menurut Rombel", icon: "far fa-circle" },
          { id: "murid_sd_agama",  label: "Menurut Agama",  icon: "far fa-circle" }
        ]
      }
    ]
  },
  {
    label: "E-File Pegawai",
    icon: "fas fa-folder-open text-maroon",
    children: [
      { id: "efile_dashboard", label: "Dashboard",   icon: "far fa-circle" },
      { id: "efile_kelola",    label: "Kelola Berkas", icon: "far fa-circle", badge: "sidebar-notif-efile" },
      { id: "efile_viewer",    label: "E-File Viewer", icon: "far fa-circle" }
    ]
  },
  // --- Khusus Admin: tidak masuk ke checklist hak akses user ---
  { id: "page_setting",    label: "Pengaturan",          icon: "fas fa-cogs text-warning",  adminOnly: true },
  { id: "page_monitoring", label: "Monitoring Aktivitas", icon: "fas fa-chart-pie text-info", adminOnly: true }
];

/* =============================================================
   RENDER SIDEBAR DARI MENU_CONFIG
   Setiap item mendapat data-menu-id agar bisa ditarget saat filter
   ============================================================= */
function renderSidebar() {
  var _counter = 0;
  function buildItem(item, level) {
    var iconClass = item.icon || (level === 0 ? 'fas fa-circle text-maroon' : level === 1 ? 'far fa-circle' : 'far fa-dot-circle');
    var badgeHtml = item.badge
      ? '<span id="' + item.badge + '" class="badge shadow-sm d-none" style="position:absolute;top:6px;right:15px;font-size:0.65rem;font-weight:bold;background-color:#ffc107!important;color:#dc3545!important;border-radius:4px;padding:2px 5px;min-width:18px;text-align:center;">0</span>'
      : '';

    if (item.children && item.children.length) {
      _counter++;
      var menuId = 'mgrp_' + _counter;
      // Simpan menu-id ke item config agar bisa direferensi saat filter
      item._menuId = menuId;
      var childrenHtml = item.children.map(function(c) { return buildItem(c, level + 1); }).join('');
      return '<li class="nav-item" data-menu-id="' + menuId + '">' +
        '<a href="#" class="nav-link">' +
          '<i class="nav-icon ' + iconClass + '"></i>' +
          '<p>' + item.label + '<i class="right fas fa-angle-left"></i></p>' +
        '</a>' +
        '<ul class="nav nav-treeview">' + childrenHtml + '</ul>' +
      '</li>';
    } else if (item.id) {
      var liId = item.adminOnly ? ' id="menu-' + item.id.replace('page_', '') + '-admin"' : '';
      return '<li class="nav-item position-relative"' + liId + ' data-menu-id="' + item.id + '">' +
        '<a href="#" class="nav-link" data-page="' + item.id + '">' +
          '<i class="nav-icon ' + iconClass + '"></i>' +
          '<p>' + item.label + '</p>' +
          badgeHtml +
        '</a>' +
      '</li>';
    }
    return '';
  }

  var html = MENU_CONFIG.map(function(item) { return buildItem(item, 0); }).join('');
  var $nav = $('#sidebar-container nav ul');
  if ($nav.length) { $nav.html(html); }
}

/* =============================================================
   FILTER SIDEBAR BERDASARKAN HAK AKSES USER
   Menggunakan MENU_CONFIG (bukan DOM :visible) untuk menentukan
   apakah sebuah grup punya child yang diizinkan.
   ============================================================= */
function filterSidebarByAkses(aksesMenu) {
  var isAdmin = checkUserRoleIsAdmin();
  if (isAdmin) return;

  var whitelist = aksesMenu || [];

  // Cek apakah sebuah item (atau salah satu descendant-nya) ada di whitelist
  function hasAllowedChild(item) {
    if (item.alwaysVisible) return true;
    if (item.adminOnly) return false;
    if (item.id) return whitelist.indexOf(item.id) !== -1;
    if (item.children) return item.children.some(function(c) { return hasAllowedChild(c); });
    return false;
  }

  // Proses setiap item secara rekursif
  function processItem(item) {
    if (item.alwaysVisible) return; // Selalu tampil
    if (item.adminOnly) return;     // Ditangani tampilkanMenuAdmin

    var allowed = hasAllowedChild(item);

    if (item.id) {
      // Leaf item: sembunyikan jika tidak diizinkan
      if (!allowed) {
        $('[data-menu-id="' + item.id + '"]').hide();
      }
    } else if (item.children) {
      // Group item: sembunyikan seluruh li jika tidak ada child yang diizinkan
      if (!allowed) {
        $('[data-menu-id="' + item._menuId + '"]').hide();
      } else {
        // Ada child yang diizinkan — proses child satu per satu
        item.children.forEach(function(c) { processItem(c); });
      }
    }
  }

  MENU_CONFIG.forEach(function(item) { processItem(item); });
}



// VAKSIN ROUTING: Penambahan Dictionary E-File di baris ini
var MENU_MAPPING = {
    'home': 'Beranda', 
    'sk_dashboard': 'Dashboard', 'sk_data': 'Kelola Data', 'sk_status': 'Status Data',
    'lapbul_dashboard': 'Dashboard', 'lapbul_kelola': 'Kelola Data', 'lapbul_status': 'Status Data',
    'lapbul_format': 'Format Laporan',
    'siaba_dashboard': 'Dashboard', 
    'siaba_presensi_harian': 'Harian', 'siaba_presensi_apel': 'Apel dan Upacara',
    'siaba_presensi_tidak': 'Tidak Presensi', 'siaba_presensi_terlambat': 'Terlambat', 'siaba_presensi_pulang': 'Pulang Awal',
    'siaba_presensi_unduh': 'Unduh Rekap Bulanan', 'siaba_presensi_arsip': 'Arsip Siaba',
    'siaba_presensi_lupa': 'Lupa Presensi', 'siaba_presensi_salah': 'Salah Presensi',
    'siaba_perjalanan_dinas': 'Perjalanan Dinas', 
    'siaba_cuti_data': 'Pengajuan', 'siaba_cuti_sisa': 'Sisa Cuti Tahunan',
    'siaba_cuti_rekap': 'Rekapitulasi', 'siaba_cuti_unggah': 'Unggah Surat Cuti', 'siaba_cuti_informasi': 'Informasi',
    'siaba_format_panduan': 'Format dan Panduan', 
    'tata_naskah_dinas': 'Tata Naskah Dinas',  
    'ptk_dashboard': 'Dashboard', 
    'ptk_kelola_paud': 'Daftar Nama', 'ptk_mutasi_paud': 'Riwayat Mutasi', 'ptk_keadaan_paud': 'Keadaan', 
    'ptk_kelola_sdn': 'Daftar Nama', 'ptk_keadaan_sdn': 'Keadaan', 'ptk_kebutuhan_sdn': 'Kebutuhan Guru', 'ptk_mutasi_sdn': 'Riwayat Mutasi', 
    'ptk_kelola_sds': 'Daftar Nama', 'ptk_mutasi_sds': 'Riwayat Mutasi', 'ptk_keadaan_sds': 'Keadaan', 'ptk_kebutuhan_sds': 'Kebutuhan Guru', 
    'murid_dashboard': 'Dashboard', 
    'murid_paud_rombel': 'Menurut Rombel', 'murid_paud_jenis_kelamin': 'Menurut Gender', 
    'murid_sd_kelas': 'Menurut Kelas', 'murid_sd_rombel': 'Menurut Rombel', 'murid_sd_agama': 'Menurut Agama', 
    'page_setting': 'Pengaturan', 'page_monitoring': 'Monitoring Aktivitas',
    'efile_dashboard': 'Dashboard','efile_kelola': 'Kelola Berkas', 'efile_viewer': 'E-File Viewer'
};

function highlightSidebar(pageName) {
    $('.nav-sidebar .nav-link').removeClass('active');
    var target = $('.nav-sidebar .nav-link[data-page="' + pageName + '"]');

    if (target.length > 0) {
        $('.nav-sidebar li.menu-open').not(target.parents('li')).removeClass('menu-open').children('.nav-treeview').slideUp(300);
        target.addClass('active');
        target.parents('.nav-item').each(function() {
            $(this).children('.nav-link').addClass('active');
            if (!$(this).hasClass('menu-open')) {
                $(this).addClass('menu-open');
                $(this).children('.nav-treeview').slideDown(300);
            }
        });
    }
}

function updateBreadcrumb(pageName) {
    var textMenu = MENU_MAPPING[pageName] || pageName;
    var $activeLink = $('a[data-page="' + pageName + '"]');
    var homeHtml = '<span style="cursor:pointer" class="btn-home-crumb"><i class="fas fa-home mr-1"></i> Beranda</span>';
    var separator = ' <i class="fas fa-angle-right mx-2 text-white-50" style="font-size: 0.8em;"></i> ';
    var breadHtml = homeHtml;

    if (pageName !== 'home' && $activeLink.length > 0) {
        var currentTitle = $activeLink.find('p').clone().children().remove().end().text().trim(); 
        var $parentTree = $activeLink.closest('.nav-treeview');
        
        if ($parentTree.length > 0) {
            var $parentLi = $parentTree.closest('.nav-item');
            var $parentLink = $parentLi.children('.nav-link');
            if ($parentLink.length > 0) {
                var parentTitle = $parentLink.find('p').clone().children().remove().end().text().trim();
                var $grandParentTree = $parentLi.closest('.nav-treeview');
                if ($grandParentTree.length > 0) {
                     var $grandParentLink = $grandParentTree.closest('.nav-item').children('.nav-link');
                     if ($grandParentLink.length > 0) {
                         breadHtml += separator + '<span class="text-white-50">' + $grandParentLink.find('p').clone().children().remove().end().text().trim() + '</span>';
                     }
                }
                breadHtml += separator + '<span class="text-white-50">' + parentTitle + '</span>';
            }
        }
        breadHtml += separator + '<span class="font-weight-bold text-white">' + (currentTitle || textMenu) + '</span>';
    }
    $('#page-breadcrumb').html(breadHtml);
}

/* =============================================================
   7. SUPER HELPER: RENDER TABEL (ANTI-BLINK SULTAN)
   ============================================================= */
var SultanTable = {
    renderNative: function(targetId, columns, data, emptyText, onComplete) {
        var $tabel = $(targetId);
        if ($tabel.length === 0) return;

        if ($.fn.DataTable.isDataTable(targetId)) {
            $tabel.DataTable().destroy();
        }
        $tabel.empty();

        $tabel.DataTable({
            data: data || [],
            columns: columns || [{title: "Data"}],
            ordering: false,
            pageLength: 10,
            autoWidth: false,
            destroy: true,
            language: {
                url: "//cdn.datatables.net/plug-ins/1.10.25/i18n/Indonesian.json",
                emptyTable: emptyText || "Tidak ada data."
            },
            dom: "<'row mb-2'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                 "<'row'<'col-sm-12 table-responsive'tr>>" +
                 "<'row mt-2'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            initComplete: function() {
                var api = this.api();
                $('[data-toggle="tooltip"]').tooltip();
                if (typeof onComplete === 'function') {
                    setTimeout(function() { 
                        api.columns.adjust();
                        onComplete(); 
                    }, 50);
                }
            }
        });
    },
    
    /**
     * Factory Method untuk Inisialisasi DataTables dengan Standar Sultan
     * @param {string} targetId - ID tabel target
     * @param {object} options - Opsi spesifik DataTable (data, columnDefs, dll)
     * @returns {object} Instance DataTable
     */
    init: function(targetId, options = {}) {
        var $tabel = $(targetId);
        if ($tabel.length === 0) return null;

        if ($.fn.DataTable.isDataTable(targetId)) {
            $tabel.DataTable().clear().destroy();
        }
        
        // Memastikan class standar ada
        if (!$tabel.hasClass('table-sultan-compact')) {
            $tabel.addClass('table table-bordered table-premium table-sultan-compact w-100');
        }

        var defaultOptions = {
            "destroy": true, 
            "ordering": false, 
            "pageLength": 10, 
            "autoWidth": false,
            "deferRender": true,
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Indonesian.json",
                "emptyTable": "Tidak ada data yang ditemukan."
            },
            "dom": "<'row mb-2'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                   "<'row'<'col-sm-12'<'table-responsive'tr>>>" +
                   "<'row mt-2'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            "initComplete": function(settings, json) {
                var api = this.api();
                setTimeout(function() { api.columns.adjust(); }, 100);
                if (options.initComplete) {
                    options.initComplete.call(this, settings, json);
                }
            }
        };

        // Menggabungkan opsi default dengan opsi spesifik modul
        var finalOptions = $.extend(true, {}, defaultOptions, options);
        
        // Memastikan sultan-scroll selalu ada di dom (Vaksin Anti-Macet)
        if (!finalOptions.dom || finalOptions.dom === defaultOptions.dom) {
            finalOptions.dom = "<'row mb-2'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                               "<'row'<'col-sm-12'<'table-responsive sultan-scroll'tr>>>" +
                               "<'row mt-2'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>";
        }

        finalOptions.destroy = true;
        finalOptions.autoWidth = false;

        // Jika modul memiliki initComplete sendiri, kita sudah tangani di defaultOptions.
        if (options.initComplete) {
            finalOptions.initComplete = defaultOptions.initComplete;
        }

        return $tabel.DataTable(finalOptions);
    }
};

function getBadgeSultan(status) {
    if (!status || status === "-" || status === "") {
        return '<i class="fas fa-minus text-black-50 small" style="opacity:0.2"></i>';
    }
    var s = String(status).trim();
    var stLower = s.toLowerCase();
    
    if (stLower.includes('revisi') || stLower.includes('perbaiki')) {
         return `<div class="btn-icon-sultan btn-icon-sultan-warning" data-toggle="tooltip" title="${s}"><i class="fas fa-sync-alt"></i></div>`;
    } else if (stLower.includes('tolak') || stLower.includes('x') || stLower.includes('salah')) {
         return `<div class="btn-icon-sultan btn-icon-sultan-danger" data-toggle="tooltip" title="${s}"><i class="fas fa-times"></i></div>`;
    } else if (stLower.includes('verif') || stLower.includes('setuju') || stLower.includes('ok') || stLower.includes('valid')) {
         return `<div class="btn-icon-sultan btn-icon-sultan-success" data-toggle="tooltip" title="${s}"><i class="fas fa-check"></i></div>`;
    } else if (s.length > 5 && (stLower.includes('proses') || stLower.includes('tunggu'))) {
         return `<div class="btn-icon-sultan btn-icon-sultan-info" data-toggle="tooltip" title="${s}"><i class="fas fa-spinner fa-spin"></i></div>`;
    }
    
    var pillColor = 'secondary';
    if (stLower.includes('hadir') || stLower.includes('aktif') || stLower.includes('sudah')) pillColor = 'success';
    else if (stLower.includes('belum') || stLower.includes('absen')) pillColor = 'danger';
    else if (stLower.includes('izin') || stLower.includes('sakit')) pillColor = 'warning';
    
    return `<span class="badge badge-pill badge-${pillColor} shadow-sm px-3 py-1 font-weight-bold">${s}</span>`;
}

function renderBadgeSultan(text) { return getBadgeSultan(text); }
function previewPDF(u){ $('#framePreview').attr('src',u.replace('/view','/preview')); $('#modalPreviewSK').modal('show'); }
function formatDateForInput(s){ if(!s) return ""; if(typeof s==='string'&&s.match(/^\d{4}-\d{2}-\d{2}$/)) return s; var d=new Date(s); return isNaN(d)?s:d.toISOString().split('T')[0]; }

/* =============================================================
   8. SULTAN NOTIFIKASI ENGINE
   ============================================================= */
function sultan_fetchNotifikasi() {
    var user = getSesiUser();
    if (!user) return;
    var role = user.role || "User";
    var unit = user.unit || user.nama_lengkap;
    
    google.script.run.withSuccessHandler(function(res) {
        if (!res) return;
        
        // 1. Update Navbar Badge & Header
        var totalCount = parseInt(res.count || 0);
        if (totalCount > 0) {
            $('#nav-notif-count').text(totalCount).show();
            $('#nav-notif-count-header').html('<span class="font-weight-bold" style="font-size: 13px;">' + totalCount + ' Baru</span>');
        } else {
            $('#nav-notif-count').hide();
            $('#nav-notif-count-header').html('<span style="font-size: 13px; opacity: 0.6;">0 Baru</span>');
        }

        // 2. Update Sidebar Badges
        var badgeMapping = {
            'sk': '#sidebar-notif-sk', 'lapbul': '#sidebar-notif-lapbul', 'lupa': '#sidebar-notif-lupa',
            'salah': '#sidebar-notif-salah', 'perdin': '#sidebar-notif-perdin', 'cuti': '#sidebar-notif-cuti',
            'surat_cuti': '#sidebar-notif-surat-cuti', 'efile': '#sidebar-notif-efile'
        };

        for (var key in badgeMapping) {
            var count = (res.modules && res.modules[key]) ? res.modules[key].count : 0;
            var $b = $(badgeMapping[key]);
            if (count > 0) $b.text(count).removeClass('d-none');
            else $b.addClass('d-none');
        }

        // 3. Render List Dropdown
        var $list = $('#nav-notif-list');
        $list.empty();

        if (totalCount === 0) {
            $list.html('<div class="text-center p-4 text-muted"><i class="fas fa-bell-slash fa-2x mb-2" style="opacity:0.3"></i><br><small>Tidak ada notifikasi baru.</small></div>');
            return;
        }

        var html = '';
        var labels = {
            sk: 'SK Tugas', lapbul: 'Laporan Bulanan', lupa: 'Lupa Presensi', 
            salah: 'Salah Presensi', perdin: 'Perjadin', cuti: 'Pengajuan Cuti', 
            surat_cuti: 'Surat Cuti', efile: 'E-File'
        };

        for (var mKey in res.modules) {
            var mData = res.modules[mKey];
            if (mData.count > 0 || (mData.recent && mData.recent.length > 0)) {
                // Header Kelompok (Clickable)
                html += `<div class="dropdown-header notif-sultan-group d-flex justify-content-between align-items-center py-2 px-3 border-bottom" onclick="sultan_toggleNotifGroup(this)">
                            <div>
                                <i class="fas fa-chevron-down notif-chevron mr-2" style="font-size: 10px; opacity: 0.5;"></i>
                                <span class="notif-sultan-header font-weight-bold" style="font-size: 13px !important; letter-spacing: 0.5px;">${labels[mKey].toUpperCase()}</span>
                            </div>
                            <span class="notif-sultan-badge">${mData.count}</span>
                         </div>
                         <div class="notif-group-content">`; // Mulai pembungkus isi
                
                mData.recent.forEach(function(notif) {
                    var content = notif.nama || notif.namaSd || notif.nomor || 'Pemberitahuan';
                    var sub = notif.kriteria || notif.tujuan || notif.berkas || notif.jenis || '';
                    var tglRaw = notif.waktu || notif.tglVerif || notif.tglInput || notif.tglUnggah || "";
                    var tglDisplay = tglRaw ? String(tglRaw).split(' ')[0].replace(/'/g, "") : "-";

                    var statusStyle = '';
                    if (notif.status === 'Diproses') statusStyle = 'color: #f6c23e !important;'; 
                    else if (notif.status.toLowerCase().includes('setuju') || notif.status.toLowerCase().includes('ok')) statusStyle = 'color: #28a745 !important;'; 
                    else if (notif.status.toLowerCase().includes('tolak')) statusStyle = 'color: #dc3545 !important;'; 

                    html += `
                    <a href="#" class="dropdown-item notif-sultan-item py-2 border-bottom" onclick="sultan_handleNotifClick('${notif.rowId}', '${notif.source}', this)" style="background: transparent !important;">
                        <div class="media align-items-center">
                            <div class="media-body">
                                <div class="d-flex justify-content-between align-items-center mb-0">
                                    <h3 class="notif-sultan-name font-weight-bold" style="font-size: 12px !important; margin: 0 !important;">${content}</h3>
                                    <span class="notif-sultan-sub" style="font-size: 10px !important;"><i class="far fa-clock mr-1"></i>${tglDisplay}</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between">
                                    <span class="notif-sultan-sub" style="font-size: 10px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${sub}</span>
                                    <span class="font-weight-bold" style="font-size: 10px !important; letter-spacing: 0.5px !important; ${statusStyle}">${notif.status.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </a>`;
                });
                
                html += `</div>`; // Tutup pembungkus isi
            }
        }
        $list.append(html);
        $list.append('<a href="#" class="dropdown-item dropdown-footer text-center py-2 bg-transparent font-weight-bold notif-sultan-footer" onclick="sultan_markAllNotifRead(event)" style="font-size: 11px; border-top: 1px solid rgba(128,0,0,0.1);">' +
                     '<i class="fas fa-check-double mr-2"></i>TANDAI SEMUA SUDAH DIBACA</a>');
        
        // Jalankan paksa
        sultan_forceApplyColors();
    }).getNotifikasiGlobal(role, unit);
}

// Fungsi warna notifikasi: Super Agresif agar tidak bisa dikalahkan CSS/JS manapun
function sultan_applyNotifColors() {
    // Deteksi Mode Gelap (Multi-check)
    var isDark = document.body.classList.contains('dark-mode') || 
                 document.body.classList.contains('dark') ||
                 localStorage.getItem('theme') === 'dark' ||
                 (window.getComputedStyle(document.body).backgroundColor === 'rgb(69, 77, 85)'); // Warna standar AdminLTE DM

    var nameColor    = isDark ? '#ffffff' : '#1a1c1e';
    var headerColor  = isDark ? '#ff9999' : '#800000'; // Salmon cerah di DM
    var subColor     = isDark ? '#adb5bd' : '#6c757d';

    // 1. Judul utama "Notifikasi Baru (X Baru)" di Navbar
    var countEl = document.getElementById('nav-notif-count-header');
    if (countEl) {
        var parentEl = countEl.parentElement; // Ini adalah span yang punya teks "Notifikasi Baru"
        if (parentEl) {
            parentEl.style.setProperty('color', headerColor, 'important');
            // Jika di mode gelap, buang class text-maroon agar tidak menimpa warna kita
            if (isDark) {
                parentEl.classList.remove('text-maroon');
            } else {
                parentEl.classList.add('text-maroon');
            }
        }
        countEl.style.setProperty('color', headerColor, 'important');
    }

    // 2. Header Kategori (SURAT CUTI, PERJADIN, dll)
    document.querySelectorAll('.notif-sultan-header').forEach(function(el) {
        el.style.setProperty('color', headerColor, 'important');
    });

    // 3. Nama ASN (ISNI MASTUTI, dll)
    document.querySelectorAll('.notif-sultan-name').forEach(function(el) {
        el.style.setProperty('color', nameColor, 'important');
    });

    // 4. Teks Keterangan & Tanggal
    document.querySelectorAll('.notif-sultan-sub').forEach(function(el) {
        el.style.setProperty('color', subColor, 'important');
    });

    // 5. Footer "Tandai Semua"
    document.querySelectorAll('.notif-sultan-footer').forEach(function(el) {
        el.style.setProperty('color', headerColor, 'important');
    });
}

// Fungsi Toggle Accordion Notifikasi
function sultan_toggleNotifGroup(header) {
    var $content = $(header).next('.notif-group-content');
    var $chevron = $(header).find('.notif-chevron');
    
    // Tutup kelompok lain (Optional, agar lebih rapi)
    $('.notif-group-content').not($content).slideUp(200);
    $('.notif-chevron').not($chevron).removeClass('rotate');
    
    // Toggle kelompok ini
    $content.slideToggle(250);
    $chevron.toggleClass('rotate');
    
    // Stop propagation agar dropdown tidak tertutup
    event.stopPropagation();
}

// Jalankan paksa beberapa kali untuk melawan script tema lain
function sultan_forceApplyColors() {
    sultan_applyNotifColors();
    setTimeout(sultan_applyNotifColors, 100);
    setTimeout(sultan_applyNotifColors, 500);
    setTimeout(sultan_applyNotifColors, 1000);
}

function sultan_handleNotifClick(rowId, source, el) {
    if ($(el).hasClass('bg-light')) return; // Sudah dibaca
    
    // UI Feedback
    $(el).addClass('bg-light opacity-75');
    $(el).find('.dropdown-item-title').removeClass('font-weight-bold').addClass('font-weight-normal text-muted');
    
    // Panggil fungsi sinkronisasi (sudah ada di setiap modul)
    sultan_tandaiNotifDibaca(rowId, source);
}

function sultan_markAllNotifRead(e) {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    var user = getSesiUser();
    if (!user) return;
    
    // UI Feedback
    $('#nav-notif-count').hide();
    $('#sidebar-notif-sk, #sidebar-notif-lapbul, #sidebar-notif-lupa, #sidebar-notif-salah, #sidebar-notif-perdin, #sidebar-notif-cuti, #sidebar-notif-surat-cuti, #sidebar-notif-efile').addClass('d-none');
    $('#nav-notif-count-header').text('0 Baru');
    $('#nav-notif-list .dropdown-item').addClass('bg-light opacity-75').find('.dropdown-item-title').removeClass('font-weight-bold').addClass('font-weight-normal text-muted');
    
    google.script.run.tandaiSemuaNotifGlobalDibaca(user.role || "User", user.unit || user.nama_lengkap);
}

/* =============================================================
   9. SULTAN UI ENGINE (DARK MODE & UI HELPERS)
   ============================================================= */

function sultan_initDarkMode() {
    const isDark = localStorage.getItem('sultanDarkMode') === 'true';
    if (isDark) { 
        $('body').addClass('dark-mode'); 
        $('#sultan_darkModeToggle').prop('checked', true);
        sultan_applyDarkModeUI(true);
    }
}

function sultan_toggleDarkMode() {
    const isDark = $('body').hasClass('dark-mode');
    if (isDark) { 
        $('body').removeClass('dark-mode'); 
        localStorage.setItem('sultanDarkMode', 'false'); 
        sultan_applyDarkModeUI(false);
    } else { 
        $('body').addClass('dark-mode'); 
        localStorage.setItem('sultanDarkMode', 'true'); 
        sultan_applyDarkModeUI(true);
    }
}

function sultan_applyDarkModeUI(isDark) {
    const $nav = $('.main-header');
    const $sidebar = $('.main-sidebar');
    
    if (isDark) {
        $nav.removeClass('navbar-white navbar-light').addClass('navbar-dark');
        $sidebar.removeClass('sidebar-light-maroon').addClass('sidebar-dark-maroon');
    } else {
        $nav.removeClass('navbar-dark').addClass('navbar-white navbar-light');
        $sidebar.removeClass('sidebar-dark-maroon').addClass('sidebar-light-maroon');
    }
}

var SultanForm = {
    validate: function(input, isValid, message) {
        const $el = $(input);
        if (isValid) {
            $el.removeClass('is-invalid').addClass('is-valid');
            $el.next('.invalid-feedback').remove();
        } else {
            $el.removeClass('is-valid').addClass('is-invalid');
            if ($el.next('.invalid-feedback').length === 0) {
                $el.after(`<div class="invalid-feedback" style="font-size:11px;">${message}</div>`);
            } else {
                $el.next('.invalid-feedback').text(message);
            }
        }
    }
};


  // ============================================
  // UPDATE UI NAVBAR
  // ============================================
  function updateNavbarUI(user) {
      if (!user) return;
      var displayName = user.nama_lengkap || user.nama || user.username || "User";
      var photoUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=random&color=fff";
      if (user.photo && user.photo.trim() !== "") {
          if (user.photo.startsWith("http")) photoUrl = user.photo;
          else photoUrl = "https://drive.google.com/thumbnail?id=" + user.photo + "&sz=s200";
      }
      
      $('#nav-user-name').text(displayName);
      $('#nav-user-photo').attr('src', photoUrl);
      $('#dropdown-user-name-big').text(displayName);
      $('#dropdown-user-role').text(user.role || "Pengguna");
      $('#dropdown-user-photo').attr('src', photoUrl);
      $('.user-panel .info a').text(displayName);
      $('.user-panel .image img').attr('src', photoUrl);
      
      if(user.role !== 'Admin') { $('#menu-setting-admin').hide(); } 
      else { $('#menu-setting-admin').show(); }
  }

  // ============================================
  // BREADCRUMB
  // ============================================
  function updateBreadcrumb($activeLink, pageName) {
      var homeHtml = '<span style="cursor:pointer" class="btn-home-crumb"><i class="fas fa-home mr-1"></i> Beranda</span>';
      var separator = ' <i class="fas fa-angle-right mx-2 text-white-50" style="font-size: 0.8em; vertical-align: middle;"></i> ';
      var breadHtml = homeHtml;

      if (pageName !== 'home') {
          var currentTitle = $activeLink.find('p').clone().children().remove().end().text().trim(); 
          var $parentTree = $activeLink.closest('.nav-treeview');
          if ($parentTree.length > 0) {
              var $parentLi = $parentTree.closest('.nav-item');
              var $parentLink = $parentLi.children('.nav-link');
              if ($parentLink.length > 0) {
                  var parentTitle = $parentLink.find('p').clone().children().remove().end().text().trim();
                  var $grandParentTree = $parentLi.closest('.nav-treeview');
                  if ($grandParentTree.length > 0) {
                       var $grandParentLi = $grandParentTree.closest('.nav-item');
                       var $grandParentLink = $grandParentLi.children('.nav-link');
                       if ($grandParentLink.length > 0) {
                           var grandParentTitle = $grandParentLink.find('p').clone().children().remove().end().text().trim();
                           breadHtml += separator + '<span class="text-white-50">' + grandParentTitle + '</span>';
                       }
                  }
                  breadHtml += separator + '<span class="text-white-50">' + parentTitle + '</span>';
              }
          }
          breadHtml += separator + '<span class="font-weight-bold text-white">' + (currentTitle || pageName) + '</span>';
      }
      $('#page-breadcrumb').html(breadHtml);
  }

  // ============================================
  // ROUTER SPA: LOAD KONTEN (Anti-Memory Leak)
  // ============================================
  function loadContent(pageName) {
    if(!pageName) return;
    
    // --- 1. HIGHLIGHT MENU (Vaksin Recursive Parent) ---
    $('.nav-link').removeClass('active'); 
    var $activeLink = $('a[data-page="' + pageName + '"]');
    $activeLink.addClass('active');

    // Tutup accordion yang tidak aktif, biarkan yang aktif terbuka
    $('.nav-sidebar li.nav-item.menu-open').each(function() {
        if (!$(this).find('a[data-page="' + pageName + '"]').length) {
            $(this).removeClass('menu-open').children('.nav-treeview').slideUp(300);
        }
    });

    $activeLink.parents('.nav-item').addClass('menu-open');
    $activeLink.parents('.nav-treeview').show();
    $activeLink.parents('.nav-item').children('.nav-link').addClass('active');

    // --- 2. ENGINE ANTI-BLINK & MEMORY LEAK ---
    var $content = $('#app-content');

    // Kunci ukuran tinggi
    $content.css('min-height', $content.height() + 'px');

    if (typeof NProgress !== 'undefined') { NProgress.configure({ showSpinner: false, speed: 400 }); NProgress.start(); }
    
    $content.css({'transition': 'opacity 0.2s ease', 'opacity': '0'});

    google.script.run
      .withSuccessHandler(function(html) {
        if (typeof NProgress !== 'undefined') NProgress.done();

        setTimeout(function() {
            // VAKSIN MEMORY LEAK: Hancurkan semua instance DataTable yang tertinggal
            if ($.fn.DataTable) {
                var tables = $.fn.dataTable.fnTables(true);
                $(tables).each(function () { $(this).dataTable().fnDestroy(); });
            }
            
            // VAKSIN MEMORY LEAK: Kosongkan HTML lama secara total (melepas event bind jQuery)
            $content.empty();
            
            // Tulis HTML Baru
            $content.html(html); 

            // Paksa Reflow
            void $content[0].offsetWidth; 
            
            // Munculkan
            $content.css('opacity', '1');

            setTimeout(function() { 
                $content.css({
                    'min-height': '',
                    'opacity': '',
                    'transition': ''
                }); 
            }, 300);
            updateBreadcrumb($activeLink, pageName);

        }, 200);
      })
      .withFailureHandler(function(err) {
        if (typeof NProgress !== 'undefined') NProgress.done();
            setTimeout(function() {
                $content.html('<div class="alert alert-danger m-3 border-danger shadow-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Gagal memuat halaman: ' + err.message + '</div>').css('opacity', '1');
                setTimeout(function() {
                    $content.css({
                        'min-height': '',
                        'opacity': '',
                        'transition': ''
                    });
                }, 300);
            }, 200);
      })
      .loadPage(pageName);
  }

  // ============================================
  // INISIALISASI & GATEKEEPER
  // ============================================
  $(document).ready(function() {
    
    var userLocal = localStorage.getItem("siksUser");
    var user = null;
    try { user = userLocal ? JSON.parse(userLocal) : null; } catch(e){}

    if (user) {
        // VAKSIN KEAMANAN: Jangan langsung percaya localStorage!
        // Tampilkan dulu layarnya, tapi diam-diam verifikasi ke server
        $('#loading-awal').hide();
        $('#gerbang-login').hide(); 
        $('#konten-aplikasi').show(); 
        updateNavbarUI(user); 
        loadContent('home'); 
        
        // Pengecekan Profil ke Server (Berfungsi ganda sebagai validasi Token/Sesi)
        google.script.run
            .withSuccessHandler(function(res){
                if(res && res.found) {
                    user.nama_lengkap = res.nama_lengkap; user.nama = res.nama_lengkap;
                    user.role = res.role; user.unit = res.unit; 
                    if(res.photo) user.photo = res.photo; 
                    localStorage.setItem("siksUser", JSON.stringify(user));
                    updateNavbarUI(user);
                } else if(res && res.kicked) {
                    // Jika server bilang token mati/user dihapus, tendang keluar!
                    handleLogout();
                }
            })
            .withFailureHandler(function(){ /* Abaikan jika inet mati, percaya local dulu */ })
            .getUserProfileByName(user.username);
            
    } else {
        $('#loading-awal').hide();
        $('#konten-aplikasi').hide(); 
        $('#gerbang-login').show();
    }

    // Klik Sidebar
    $(document).on('click', '.nav-sidebar .nav-link', function(e) {
        var pageName = $(this).data('page'); 
        if (pageName) {
            e.preventDefault(); 
            loadContent(pageName);
            
            // VAKSIN SIDEBAR COLLAPSE: Gunakan Native AdminLTE
            if ($(window).width() < 992) {
                $('[data-widget="pushmenu"]').PushMenu('collapse');
            }
        }
    });

    // Klik Beranda Breadcrumb
    $(document).on('click', '.btn-home-crumb', function(e) {
        e.preventDefault();
        loadContent('home');
        $('.nav-sidebar .menu-open').removeClass('menu-open').children('.nav-treeview').slideUp();
        $('.nav-sidebar .nav-link').removeClass('active');
        $('a[data-page="home"]').addClass('active');
    });

  });
function sultan_tampilkanProfilUser() {
    var user = getSesiUser();
    if (!user) return;
    
    var photoId = user.photo || "";
    var photoUrl = photoId ? "https://drive.google.com/thumbnail?id=" + photoId + "&sz=s400" : "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.nama_lengkap || user.username) + "&background=800000&color=fff&size=128";

    Swal.fire({
        title: '<h5 class="font-weight-bold text-maroon mb-0">PROFIL PENGGUNA</h5>',
        html: `
            <div class="text-center mb-4">
                <div class="position-relative d-inline-block">
                    <img src="${photoUrl}" class="img-circle elevation-2 shadow-sm mb-3" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid #fff;">
                    <div class="badge badge-warning position-absolute" style="bottom: 15px; right: 0; border: 2px solid #fff; border-radius: 50px; padding: 5px 12px; font-size: 10px;">
                        <i class="fas fa-check-circle mr-1"></i> Terverifikasi
                    </div>
                </div>
                <h4 class="font-weight-bold text-dark mb-0">${user.nama_lengkap || user.username}</h4>
                <p class="text-muted text-uppercase mb-3" style="letter-spacing: 1px; font-size: 0.8rem;">${user.role || 'User'}</p>
            </div>
            <div class="text-left bg-light p-3 rounded-lg" style="border: 1px dashed #ddd;">
                <div class="row mb-2">
                    <div class="col-4 text-muted"><small>Username</small></div>
                    <div class="col-8 font-weight-bold text-maroon">${user.username || '-'}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-4 text-muted"><small>Unit Kerja</small></div>
                    <div class="col-8 font-weight-bold text-dark">${user.unit || '-'}</div>
                </div>
                <div class="row">
                    <div class="col-4 text-muted"><small>Hak Akses</small></div>
                    <div class="col-8"><span class="badge badge-maroon px-2 py-1" style="font-size: 10px;">${(user.role || 'User').toUpperCase()}</span></div>
                </div>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        padding: '2em',
        background: '#fff',
        customClass: {
            popup: 'rounded-xl',
            container: 'sultan-swal-container'
        }
    });
}
  
