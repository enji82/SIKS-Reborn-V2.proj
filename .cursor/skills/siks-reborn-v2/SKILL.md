---
name: siks-reborn-v2
description: Develops and refactors SIKS Reborn V2 (Google Apps Script SPA, Sultan UI, Google Sheets backends). Use when working in this repo on .gs server code, page_*.html views, index/javascript routing, Siaba/PTK/SK/Lapbul/Efile modules, clasp deploy, or architectural_blueprint goals.
disable-model-invocation: true
---

# SIKS Reborn V2

Google Apps Script web app (SPA) for kepegawaian/sekolah data. Stack: **clasp** → Apps Script project, **HtmlService** templates, **jQuery + AdminLTE + DataTables**, **Google Sheets** as databases.

## Before coding

1. Read [architectural_blueprint.md](../../architectural_blueprint.md) for DRY, mobile, cache, and security targets.
2. For module/file lookup, see [reference.md](reference.md).

## File layout

| Kind | Pattern | Notes |
|------|---------|-------|
| Shell | `index.html` | SPA router, `SPA_VIEW_CACHE`, global modals, `SULTAN_PAGE_CONFIG`, `loadContent()` |
| Global client | `javascript.html`, `ui_helpers.html`, `css_sultan.html` | Shared logic; `SultanUI` in `ui_helpers.html` |
| Pages | `page_<area>_<feature>.html` | Fragment only (no full `<html>`); loaded via `getHalaman()` |
| Server | `<Module>.gs` | One domain per file; use `SPREADSHEET_IDS` / `FOLDER_CONFIG` from `code.gs` |
| Config | `code.gs` | `SPREADSHEET_IDS`, `FOLDER_CONFIG`, `doGet`, login, `getHalaman` |
| Siaba shared | `Siaba_helper.gs` | `getDB`, `getSheet`, `getCachedData`, `apiResponse` |
| Deploy | `.clasp.json`, `appsscript.json` | `clasp push`; markdown excluded via `.claspignore` |

**Page route name** = filename without `page_` prefix (e.g. `page_siaba_presensi_harian.html` → `siaba_presensi_harian`). Sidebar links use `data-page="<route>"`.

## Core principles (from blueprint)

- **DRY:** No duplicate modals/helpers across pages — use `index.html`, `SultanUI`, `javascript.html`.
- **Consistent UI:** Prefer `SultanUI.renderHeader`, `SultanUI.renderFilterBar`, `SultanUI.showLoading` / `hideLoading`, `emptyState`; page-specific CSS belongs in `css_sultan.html` when reused.
- **SPA performance:** `loadContent` caches HTML in `SPA_VIEW_CACHE`; destroy DataTables on navigation (handled in `index.html`).
- **Mobile:** `.table-responsive` / `.sultan-scroll`, `col-12 col-md-*`, hide non-critical columns on small screens; min 44px tap targets.
- **Server performance:** Use `getCachedData(cacheKey, fetchFn, ttlSeconds)` for heavy reads; respect ~100KB cache item limit.
- **Security:** Passwords via `verifyPassword` / `hashPassword` in `code.gs`; use `validateInput` / `sanitizeInput` for user input.

## Adding or changing a page

1. Create `page_<route>.html` following an existing page in the same module (info card, filter bar, `#<prefix>_loadingState`, table state).
2. Register route in `index.html` → `SULTAN_PAGE_CONFIG` (title, subtitle, icon).
3. Add sidebar entry in `sidebar.html` with `data-page="<route>"` if needed.
4. Expose server functions in the correct `.gs` file; call from page with `google.script.run`.
5. Do **not** add a second page header in the HTML file — `#app-page-header` is filled by the router.

## Client conventions

```javascript
// Standard server call
google.script.run
  .withSuccessHandler(function (jsonStr) { /* parse JSON if needed */ })
  .withFailureHandler(function (err) { /* SweetAlert / alert */ })
  .someServerFunction(arg1, arg2);

SultanUI.showLoading('#mypage_loadingState', 'Memuat...');
// ... on success:
SultanUI.hideLoading('#mypage_loadingState');
```

- Prefix DOM ids with a page slug (`harian_filterTahun`, `harian_tabelUtama`) to avoid collisions when SPA swaps HTML.
- Parse server JSON with `JSON.parse` when functions return `apiResponse()` strings.
- Reuse `sultan-info-card`, `sultan-filter-pill-container`, `card-sultan`, `table-sultan-compact` patterns from sibling pages.

## Server conventions

```javascript
// Prefer helpers in Siaba_helper.gs
const sheet = getSheet('SIABA_DB', 'Nama Sheet');
const rows = getCachedData('unique_key_' + unit, function () {
  return sheet.getDataRange().getValues();
}, 300);

return apiResponse('success', payload, '');
```

- Add new spreadsheet IDs only to `SPREADSHEET_IDS` / `FOLDER_CONFIG` in `code.gs`, then reference by key in module `.gs` files.
- Keep `doGet` / `include` / `getHalaman` in `code.gs`; domain logic stays in module files.
- Timezone: `Asia/Jakarta` (`appsscript.json`).

## Module ownership

| Domain | Backend | Example routes |
|--------|---------|----------------|
| Auth / users / monitoring | `code.gs` | login, `page_setting`, `page_monitoring` |
| Siaba presensi | `Siaba_presensi.gs` | `siaba_presensi_*` |
| Siaba cuti | `Siaba_cuti.gs` | `siaba_cuti_*` |
| Siaba perjadin / dinas | `Siaba_perjadin.gs` | `siaba_perjalanan_dinas`, `siaba_dinas_*` |
| Siaba lupa / salah / arsip | `Siaba_lupa.gs`, `Siaba_salah.gs`, `Siaba_arsip.gs` | matching `page_siaba_*` |
| Siaba dashboard | `Siaba_dashboard.gs` | `siaba_dashboard`, `siaba_menu` |
| PTK | `PTK.gs` | `ptk_*` |
| Murid | `Murid.gs` | `murid_*` |
| SK | `SK.gs` | `sk_*` |
| Lapbul | `Lapbul.gs` | `lapbul_*` |
| E-File | `Efile.gs` | `efile_*` |

## Deploy & repo hygiene

```bash
clasp push    # from repo root; respects .claspignore
```

- Do not commit secrets; IDs in `code.gs` are project config, not user credentials.
- `architectural_blueprint.md` and `README.md` are local/docs only (not pushed to GAS).

## Anti-patterns

- Duplicating preview/delete modals on individual pages.
- Inline `page-header` blocks that fight `#app-page-header`.
- New global functions in `page_*.html` without a namespaced prefix (pollutes SPA after navigation).
- Raw `SpreadsheetApp.openById` with hardcoded IDs outside `SPREADSHEET_IDS`.
- Removing plain-text password branch in `verifyPassword` before sheet migration is complete.
- Pushing large dev scripts (`validate_combined.js`, `**/*.py`) — listed in `.claspignore`.

## Verification checklist

- [ ] Route in `SULTAN_PAGE_CONFIG` and sidebar (if user-facing)
- [ ] Loading state uses `SultanUI.showLoading` / `hideLoading`
- [ ] Tables wrapped for mobile; DataTables destroyed on leave (router handles destroy)
- [ ] Server errors surfaced via `withFailureHandler`
- [ ] Heavy reads use `getCachedData` where appropriate
