# AGENTS.md - Repository Guidelines & Strict Rules

## 🔒 STRICT RULE: INVOICE & RECEIPT PDF DESIGN IS FROZEN

The invoice and receipt PDF generation templates, fonts, styling, spacing, and layout are **100% APPROVED, FINAL, AND STRICTLY LOCKED**.

### 🚫 DO NOT MODIFY OR REFACTOR THE FOLLOWING FILES:
1. `server/src/services/invoiceHtml.service.ts`
2. `server/src/services/receipt.service.ts`
3. `server/src/services/invoiceBrowser.service.ts`
4. `server/src/assets/fonts/*` (PlusJakartaSans TTF files)
5. `server/src/assets/images/*` (Logo, icons, etc.)

### ⛔ STRICT CONSTRAINTS FOR ALL AI AGENTS & CONTRIBUTORS:
- **NO CHANGES TO CSS/STYLING**: Do NOT touch font families, font sizes, line heights, letter-spacing, paddings, margins, borders, or colors.
- **NO CHANGES TO SVG / BORDERS**: The SVG total outline (`viewBox="-1 -1 236 36"` with `overflow: visible`), logo dimensions, bullet points, and gradient defs MUST NOT be altered.
- **NO CHANGES TO FONTS**: The embedded Plus Jakarta Sans font files and Base64 loading mechanism MUST NOT be modified or replaced.
- **ZERO SPACING LOCK**: Letter spacing on headers, terms and conditions, contact information, client details, and footers MUST stay at `0` (and `0.02em` on deliverables).
- **PRESERVATION RULE**: Even if performing broad refactoring, upgrades, linting, or formatting across the server codebase, **COMPLETELY EXCLUDE AND PRESERVE** these files intact.
