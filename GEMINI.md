# GEMINI.md - Rules & Invariant Constraints

## 🔒 CRITICAL DIRECTIVE: INVOICE & RECEIPT PDF DESIGN IS FROZEN

The invoice and receipt PDF generation design, typography, spacing, lining, layout, and colors have been finalized and **PERMANENTLY FROZEN**.

### 🚫 PROTECTED FILES (DO NOT EDIT):
- `server/src/services/invoiceHtml.service.ts`
- `server/src/services/receipt.service.ts`
- `server/src/services/invoiceBrowser.service.ts`
- `server/src/assets/fonts/` (All font files)
- `server/src/assets/images/` (All assets)

### ⛔ RULES ENFORCED ON ALL AI INTERACTIONS:
1. **Zero Style Alterations**: Never alter CSS styles, `letter-spacing`, `line-height`, `font-size`, `margin`, `padding`, or color codes in the invoice template.
2. **Frozen Geometry & Borders**: Do not change SVG outlines, border definitions, corner radiuses (`rx`), or viewBox properties.
3. **No Font Substitutions**: The embedded Plus Jakarta Sans fonts and kerning settings must remain untouched.
4. **Preserve During Refactors**: Exclude invoice and receipt PDF services from automated code cleanups, style lints, or broad server refactoring.
