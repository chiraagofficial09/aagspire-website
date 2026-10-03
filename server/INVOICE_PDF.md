Invoice preview and PDF
=======================

Both outputs use `renderInvoiceHtml`. The preview endpoint saves an admin-owned,
one-hour snapshot. Downloads render that saved HTML, so subsequent database changes
cannot change an invoice already being previewed. Refresh the preview to use newer data.

The document is 595.2801 PDF points wide (about 793.71 CSS pixels) and uses a continuous page matching the preview.
Long text wraps naturally. Extremely long documents above 19,000 pixels must be split.

Production setup:

1. Run `npm ci` in `server`.
2. Run `npm run install:browser` during image/server provisioning to install Chromium
   and its Linux dependencies (system package installation may require root).
3. Run `npm run build`. This copies fonts, icons and the reference logo into `dist/assets`.
4. Run `npm start`.

Alternatively, set `CHROMIUM_EXECUTABLE_PATH` to an installed compatible Chromium.
On Windows development machines, installed Chrome or Edge is detected automatically.
Google Sheets settings and credentials are unrelated to invoice rendering.

Validation: after building, run `node --test tests/invoiceParity.test.mjs`.
The visual check uses the workspace's `pdf-to-img` and `sharp` development dependencies.
Sample screenshots and PDF are written beneath `server/node_modules/.cache/invoice-parity`.

Reference design
----------------

The layout follows the supplied "Sanatan Navratri Post Invoice Oct 26.pdf".
Measurements use PDF points: 51.8 pt content left edge; table text starts at
57.8, 79.8, 315.8, 399.8 and 483.8 pt; ordinary rows are 32 pt high.
Amount headers and values stay left-aligned. Long descriptions expand their rows.
The main text uses embedded Plus Jakarta Sans Regular and Bold.
The two-stop orange gradient is #ff5a1f to #ffa05c; bullets reverse those stops.
The total outline is SVG so fractional stroke widths survive Chromium printing.

invoice-reference-logo.png preserves the original PDF logo and Engravers Gothic
tagline at 432 dpi. It was rendered from the rectangle x=51.8, y=48, width=146,
height=56 pt (top-left coordinates), without resampling the lettering.

The 36-row fixture in tests/fixtures/invoice-reference.json verifies reference
column positions, text baselines, font sizes and document dimensions. Chromium
quantizes page dimensions slightly; geometry checks allow sub-point differences.
Preview/PDF checks also cover large amounts and long content.

Invoice balances subtract actual payments and ordinary deductions only. Stored client
bad debts are internal write-offs and are excluded from invoice rows and totals.
Run the bad-debt regression with: node --test tests/invoiceBadDebt.test.mjs

