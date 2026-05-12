import re

# Read SDS file
with open('page_ptk_mutasi_sds.html', 'r') as f:
    sds_html = f.read()

# Extract the modal
modal_match = re.search(r'<!-- MODAL MUTASI \[NEW\] -->(.*?)<script>', sds_html, re.DOTALL)
if not modal_match:
    print("Could not find SDS mutasi modal")
    exit(1)

modal_html = '<!-- MODAL MUTASI [NEW] -->' + modal_match.group(1).strip()
modal_html = modal_html.replace('ptksds_', 'ptkpaud_')

# Extract the JS functions
js_match = re.search(r'function ptksds_bukaModalMutasi\(\) \{.*?function ptksds_initDataTablesUsulan', sds_html, re.DOTALL)
if not js_match:
    print("Could not find SDS mutasi JS")
    exit(1)

js_funcs = js_match.group(0).replace('function ptksds_initDataTablesUsulan', '').strip()
js_funcs = js_funcs.replace('ptksds_', 'ptkpaud_')
js_funcs = js_funcs.replace('PTKSDS_', 'PTKPAUD_')
js_funcs = js_funcs.replace('updateUsulanMutasiPTKSDS', 'ajukanMutasiPTKPAUD') # Actually SDS has ajukanMutasiPTKSDS and updateUsulanMutasiPTKSDS
js_funcs = js_funcs.replace('ajukanMutasiPTKSDS', 'ajukanMutasiPTKPAUD')

# In PAUD we don't have updateUsulanMutasiPTKPAUD, we just use ajukanMutasiPTKPAUD for everything?
# Or maybe the edit action should just be removed? Yes, we removed the Edit action from SDS so it shouldn't be in PAUD either.

# Read PAUD file
with open('page_ptk_mutasi_paud.html', 'r') as f:
    paud_html = f.read()

# Replace button
paud_html = paud_html.replace(
    '<button type="button" id="ptkpaud_btnSync" class="sultan-btn-refresh" title="Segarkan Data Server">\n        <i class="fas fa-sync-alt"></i>\n    </button>',
    '<button type="button" id="ptkpaud_btnSync" class="sultan-btn-refresh" title="Segarkan Data Server">\n        <i class="fas fa-sync-alt"></i>\n    </button>\n\n    <button type="button" id="ptkpaud_btnMutasiGlobal" class="sultan-btn-tambah ml-2">\n        <i class="fas fa-exchange-alt"></i> AJUKAN MUTASI\n    </button>'
)

# Update table header
paud_html = paud_html.replace(
    '<th class="text-center align-middle">JENIS MUTASI</th>\n                 <th class="text-left align-middle">TUJUAN/ALASAN</th>',
    '<th class="text-center align-middle">JENIS MUTASI</th>\n                 <th class="text-center align-middle">TMT/TANGGAL</th>\n                 <th class="text-left align-middle">TUJUAN/ALASAN</th>'
)

# Insert modal before <script>
paud_html = paud_html.replace('<script>', modal_html + '\n\n<script>')

# Insert JS bindings in $(document).ready
ready_bindings = """
    // Event handler untuk tombol Ajukan Mutasi
    $('#ptkpaud_btnMutasiGlobal').on('click', function() {
        ptkpaud_bukaModalMutasi();
    });

    // Event handler untuk perubahan Unit Kerja di modal
    $(document).on('change', '#ptkpaud_mutasiUnitKerja', function() {
        var selectedUnit = $(this).val();
        ptkpaud_populatePtkDropdown(selectedUnit);
    });

    // Event handler untuk perubahan Jenis Mutasi di modal
    $(document).on('change', '#ptkpaud_mutasiJenis', function() {
        var jenis = $(this).val();
        ptkpaud_toggleMutasiFields(jenis);
    });

    // Event handler untuk input file mutasi
    $(document).on('change', '#ptkpaud_mutasiFile', function() {
        var fileName = $(this).val().split('\\\\').pop();
        $(this).next('.custom-file-label').html(fileName || 'Pilih file...');
    });

    // Event handler untuk submit form mutasi
    $(document).off('submit', '#ptkpaud_formMutasi').on('submit', '#ptkpaud_formMutasi', function(e) {
        e.preventDefault();
        ptkpaud_submitFormMutasi();
    });
"""

paud_html = paud_html.replace(
    "ptkpaud_initDataTablesUsulan();\n    ptkpaud_inisialisasiHalaman();",
    "ptkpaud_initDataTablesUsulan();\n    ptkpaud_inisialisasiHalaman();\n" + ready_bindings
)

# Insert JS functions
paud_html = paud_html.replace('function ptkpaud_initDataTablesUsulan()', js_funcs + '\n\nfunction ptkpaud_initDataTablesUsulan()')

# Also, we need to update the dtArray.push in ptkpaud_renderTabelUsulan
# to include the TMT/TANGGAL column
# Find Column 4 and Column 5
#         // Column 4: Jenis Mutasi
#         var uiJenis = '<div class="text-center">' + ptkpaud_escapeHtml(row.jenis_mutasi || '-') + '</div>';
#         
#         // Column 5: Tujuan/Alasan
ui_tmt_tanggal = """
        // Column 4.5: TMT/Tanggal
        var uiTanggal = '<div class="text-center font-weight-bold text-maroon">' + ptkpaud_escapeHtml(row.tmt_tanggal || '-') + '</div>';
"""
paud_html = paud_html.replace(
    "// Column 5: Tujuan/Alasan",
    ui_tmt_tanggal + "\n        // Column 5: Tujuan/Alasan"
)

paud_html = paud_html.replace(
    "dtArray.push([\n            aksiHtml, uiNama, uiJenjang, uiJenis, uiTujuan, uiFileSk, statusBadge, uiDiinput, uiDiubah, uiVerifikasi\n        ]);",
    "dtArray.push([\n            aksiHtml, uiNama, uiJenjang, uiJenis, uiTanggal, uiTujuan, uiFileSk, statusBadge, uiDiinput, uiDiubah, uiVerifikasi\n        ]);"
)

# And remove the edit button action entirely since it is no longer used for Mutasi
paud_html = paud_html.replace(
    "aksiHtml += ' <button type=\"button\" class=\"sultan-btn-aksi sultan-btn-aksi-warning\" onclick=\"ptkpaud_editUsulan(\\'' + row.id_usulan + '\\')\" title=\"Edit\"><i class=\"fas fa-pencil-alt\"></i></button>';",
    ""
)
paud_html = paud_html.replace(
    "aksiHtml += ' <button type=\"button\" class=\"sultan-btn-aksi sultan-btn-aksi-warning\" disabled style=\"opacity: 0.4; cursor: not-allowed;\" title=\"Sudah disetujui\"><i class=\"fas fa-pencil-alt\"></i></button>';",
    ""
)

with open('page_ptk_mutasi_paud.html', 'w') as f:
    f.write(paud_html)

print("Migration completed.")
