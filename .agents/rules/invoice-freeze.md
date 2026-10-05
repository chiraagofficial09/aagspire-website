# Rule: Freeze Invoice & Receipt PDF Design

**Scope**: `server/src/services/invoiceHtml.service.ts`, `server/src/services/receipt.service.ts`, `server/src/assets/**`

## Invariant Directives:
1. **Design Lock**: The invoice HTML layout, receipt layout, styling, colors, and structure are completely finalized and must never be changed.
2. **Typography & Spacing**: 
   - `letter-spacing: 0` is strictly enforced on headers, client details, invoice numbers, dates, terms and conditions, contacts, and footers.
   - Deliverable titles maintain `letter-spacing: 0.02em`.
   - Plus Jakarta Sans embedded font files must never be swapped or removed.
3. **Border & SVG Outlines**:
   - Total outline SVG viewBox (`-1 -1 236 36`) and `overflow: visible` must remain intact to avoid any border clipping.
4. **Agent Action**: If a user request involves updating server endpoints or models, under no circumstances modify the visual CSS or layout of these templates.
