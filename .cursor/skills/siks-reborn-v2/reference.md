# SIKS Reborn V2 — Reference

## Include chain (client boot)

`index.html` → `include('css_sultan')`, `include('page_login')`, sidebar, then script includes for `javascript.html`, `ui_helpers.html`, `dropdown_data.html` (verify in `index.html` tail).

## SultanUI API (`ui_helpers.html`)

| Method | Purpose |
|--------|---------|
| `emptyState(judul, deskripsi, icon)` | Empty data placeholder |
| `showLoading(targetId, text)` | Spinner in `#..._loadingState` |
| `hideLoading(targetId)` | Clear loading container |
| `autoDetectLastUpdate(rows, txtId, areaId)` | Last-update badge from row timestamps |
| `renderHeader(title, subtitle, icon)` | Used by router; avoid duplicating in pages |
| `renderFilterBar(filtersConfig, extraButtons)` | Standard filter row |

## SPREADSHEET_IDS keys (code.gs)

Common keys: `USER_DB`, `SK_DATA_DB`, `PAUD_DATA`, `SD_DATA`, `PTK_PAUD_DB`, `PTK_SD_DB`, `EFILE_DB`, `SIABA_DB`, `ARSIP_SIABA_DB`, `SIABA_CUTI_DB`, `SIABA_DINAS_DB`, `SIABA_LUPA_DB`, `SIABA_SALAH_DB`, `LAPBUL_GABUNGAN`, `FORM_OPTIONS_DB`, `DROPDOWN_DATA`.

Always use `getDB('KEY')` / `getSheet('KEY', 'Sheet Name')` rather than duplicating IDs.

## Siaba presensi page family

Routes sharing presensi patterns (filters: tahun, bulan, unit):

- `siaba_presensi_harian`, `terlambat`, `tidak`, `pulang`, `apel`, `salah`, `arsip`, `unduh`
- Backend: `Siaba_presensi.gs` (and `Siaba_salah.gs` / `Siaba_arsip.gs` where split)

## Siaba cuti page family

- `siaba_cuti_data`, `informasi`, `sisa`, `unggah`, `rekap`
- Backend: `Siaba_cuti.gs`

## PTK page family

- `ptk_dashboard`, `kelola_sdn` / `kelola_sds` / `kelola_paud`, `mutasi_*`, `keadaan_*`, `kebutuhan_*`, `validasi_*`
- Backend: `PTK.gs`

## claspignore (not deployed)

`.md`, most `.json` except `appsscript.json`, dev scripts, `architectural_blueprint.md`, Python tooling, `.git`, `.cursor`.

## Extending blueprint work

Target files per blueprint section:

| Goal | Primary files |
|------|----------------|
| Global modals | `index.html` |
| Sultan namespace / SPA cache | `javascript.html`, `index.html` |
| Responsive tables/forms | `css_sultan.html`, `page_*.html` |
| Password hash / CacheService | `code.gs`, `Siaba_helper.gs` |
