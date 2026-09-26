import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PHONE_ICON_BUF, EMAIL_ICON_BUF } from '../assets/contactIconsBase64.js';

export interface ClientStatementProjectItem {
  projectCode: string;
  projectName: string;
  status: string;
  projectValue: number;
  grossProjectValue?: number;
  discountPercent?: number;
  discountAmount?: number;
  paidAmount: number;
  balance: number;
  startDate?: string;
  deadline?: string;
  subProjects?: string[];
}

export interface ClientStatementDeductionItem {
  projectName?: string;
  label?: string;
  date?: string;
  amount: number;
}

export interface ClientStatementPdfData {
  invoiceNumber?: string;
  clientCode: string;
  clientName: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  statementDate: string;
  billingMonth?: string;
  billingPeriod?: string;
  subtotal?: number;
  taxPercent?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalRevenue: number;
  totalPaid: number;
  pendingBalance: number;
  notes?: string;
  projects: ClientStatementProjectItem[];
  deductions?: ClientStatementDeductionItem[];
}

const allTerms: string[] = [
  'All prices listed are average estimates and may vary based on project complexity, scope of work, and client requirements.',
  '2 revisions are included in the base price. Additional revisions will be chargeable.',
  'A 50% deposit is required to initiate the project.',
  'The final payment is due upon project completion and client approval.',
  'Late payments may incur interest charges.',
  'Clients are responsible for providing all necessary content for the project.',
  'We offer custom packages tailored to specific client needs and budgets.',
  'If the project is canceled by the client before completion, the client will be responsible for paying fees incurred up to the date of cancellation.',
  'Upon full payment, clients will receive ownership of the final project deliverables.',
  'Project delivery timeline will be discussed and finalized before project start. Delays caused by client-side (late content, feedback) may extend the timeline.',
  'Urgent or priority projects may incur an additional 25%–50% charge depending on the deadline.',
  'All printing designs (banner, visiting card, brochure, etc.) will be delivered in print-ready formats only.',
  'In digital designs, open/editable source files (such as PSD, AI, CDR, etc.) will not be provided.',
  'Final deliverables are for intended use only. Resale or redistribution without permission is not allowed.',
  'We reserve the right to showcase completed work in our portfolio and social media unless agreed otherwise.',
  'Final files will be delivered only after 100% payment clearance.',
];

function calculateStatementHeight(
  data: ClientStatementPdfData,
  contentW: number,
  regularFontFile?: string
): number {
  const measureDoc = new PDFDocument({ margin: 0 });
  const regularFont = regularFontFile ? 'App-Regular' : 'Helvetica';
  if (regularFontFile) {
    try { measureDoc.registerFont('App-Regular', regularFontFile); } catch {}
  }

  const marginY = 24;
  let y = marginY + 28; // Card top inner padding
  const logoH = 48.6;
  const headerGap = 22; // Equal spacing above and below divider border
  y += logoH + headerGap; // Logo bottom to divider line
  y += headerGap; // Divider line to Billed To card

  const hasContact = Boolean(data.contactPerson);
  const hasGstin = Boolean(data.gstNumber);
  const billedCardH = (hasContact && hasGstin) ? 72 : (hasContact || hasGstin) ? 68 : 64;
  y += billedCardH + 20;

  y += 22; // Table header
  const items = data.projects && data.projects.length > 0 ? data.projects : [];
  items.forEach((proj) => {
    const subCount = proj.subProjects?.length || 0;
    y += 32 + (subCount * 13);
  });
  if (items.length === 0) y += 34;
  y += 12 + 16;

  const summaryW = 300;
  const amountColW = 95;
  const labelMaxW = summaryW - amountColW - 10;

  let sY = y;
  sY += 18; // Subtotal
  if (data.taxAmount && data.taxAmount > 0) sY += 18;
  if (data.discountAmount && data.discountAmount > 0) sY += 18;
  sY += 18; // Paid Money
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach((d) => {
      const dName = d.projectName || d.label || 'Project';
      const labelText = dName.endsWith(':') ? dName : `${dName}:`;
      const labelH = measureDoc.font(regularFont).fontSize(8.5).heightOfString(labelText, {
        width: labelMaxW,
        lineGap: 2,
      });
      sY += Math.max(18, Math.ceil(labelH) + 6);
    });
  }
  sY += 6;
  sY += 34; // Balance Due Card
  sY += 4 + 10; // *T&C apply.
  y = sY + 18;

  // Section divider between Deliverables & Terms
  y += 16;
  y += 24;

  // Terms and Conditions header
  y += 24; // Title
  y += 14; // Space to first term

  // All Clauses
  for (const term of allTerms) {
    const termH = measureDoc.font(regularFont).fontSize(9.2).heightOfString(term, { width: contentW - 48, lineGap: 3.5 });
    y += termH + 8.5;
  }

  // Contact cards
  y += 22;
  y += 48; // Card height

  // Bottom footer & outer bottom margin
  y += 22;
  y += 24;
  y += marginY;

  return Math.ceil(y);
}

export function generateClientStatementPdfStream(data: ClientStatementPdfData, res: Response): void {
  // Register TrueType fonts that support Unicode Indian Rupee symbol (₹) and match website invoice typography (Plus Jakarta Sans)
  const fontRegularCandidates = [
    path.resolve(process.cwd(), 'server/src/assets/fonts/PlusJakartaSans-Regular.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/PlusJakartaSans-Regular.ttf'),
    path.resolve(process.cwd(), 'server/dist/assets/fonts/PlusJakartaSans-Regular.ttf'),
    path.resolve(process.cwd(), 'dist/assets/fonts/PlusJakartaSans-Regular.ttf'),
    path.resolve(process.cwd(), 'server/src/assets/fonts/segoeui.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/segoeui.ttf'),
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
  ];
  const fontBoldCandidates = [
    path.resolve(process.cwd(), 'server/src/assets/fonts/PlusJakartaSans-Bold.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/PlusJakartaSans-Bold.ttf'),
    path.resolve(process.cwd(), 'server/dist/assets/fonts/PlusJakartaSans-Bold.ttf'),
    path.resolve(process.cwd(), 'dist/assets/fonts/PlusJakartaSans-Bold.ttf'),
    path.resolve(process.cwd(), 'server/src/assets/fonts/segoeuib.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/segoeuib.ttf'),
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
  ];

  const regularFontFile = fontRegularCandidates.find((p) => fs.existsSync(p));
  const boldFontFile = fontBoldCandidates.find((p) => fs.existsSync(p));

  const regularFont = regularFontFile ? 'App-Regular' : 'Helvetica';
  const boldFont = boldFontFile ? 'App-Bold' : 'Helvetica-Bold';

  const pageWidth = 595.28;
  const marginX = 24;
  const marginY = 24;
  const cardW = pageWidth - marginX * 2;
  const contentX = marginX + 28;
  const contentW = cardW - 56; // 491.28 pt

  // Dynamically calculate the single continuous page height to fit only the content length
  const pageHeight = calculateStatementHeight(data, contentW, regularFontFile);
  const cardH = pageHeight - marginY * 2;

  const doc = new PDFDocument({ margin: 0, size: [pageWidth, pageHeight], bufferPages: true });

  // Stream PDF directly to HTTP response
  doc.pipe(res);

  if (regularFontFile) {
    try {
      doc.registerFont('App-Regular', regularFontFile);
    } catch {
      // fallback to Helvetica
    }
  }
  if (boldFontFile) {
    try {
      doc.registerFont('App-Bold', boldFontFile);
    } catch {
      // fallback to Helvetica-Bold
    }
  }

  const formatINRVal = (val: number | string | undefined): string => {
    const num = typeof val === 'number' ? val : Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // 1. Full Page Deep Dark Background (#080808)
  doc.rect(0, 0, pageWidth, pageHeight).fill('#080808');

  // Outer Container Card with sleek rounded border matching preview UI
  doc.roundedRect(marginX, marginY, cardW, cardH, 16).fill('#0B0B0B');
  doc.roundedRect(marginX, marginY, cardW, cardH, 16).strokeColor('#1F1F1F').lineWidth(1.2).stroke();

  // 2. Invoice Header
  let cursorY = marginY + 28;

  // Left: Brand Identity Logo (White spire text on dark background)
  const candidateLogos = [
    path.resolve(process.cwd(), 'server/src/assets/Aagspire_Logo.png'),
    path.resolve(process.cwd(), 'server/dist/assets/Aagspire_Logo.png'),
    path.resolve(process.cwd(), 'src/assets/Aagspire_Logo.png'),
    path.resolve(process.cwd(), 'public/Aagspire_Logo.png'),
  ];
  const logoFile = candidateLogos.find((p) => fs.existsSync(p));
  if (logoFile) {
    try {
      doc.image(logoFile, contentX, cursorY, { width: 145 });
    } catch {
      doc.fillColor('#FF5A1F').fontSize(24).font(boldFont).text('Aag', contentX, cursorY + 2, { continued: true });
      doc.fillColor('#FFFFFF').fontSize(24).font(boldFont).text('spire');
    }
  } else {
    doc.fillColor('#FF5A1F').fontSize(24).font(boldFont).text('Aag', contentX, cursorY + 2, { continued: true });
    doc.fillColor('#FFFFFF').fontSize(24).font(boldFont).text('spire');
  }

  // Right: Document Title ("Invoice" with vibrant Orange Gradient, vertically centered with logo)
  const rightColW = 200;
  const rightColX = contentX + contentW - rightColW;

  const invoiceY = cursorY - 1;
  const invoiceGrad = doc.linearGradient(rightColX + 80, invoiceY, rightColX + rightColW, invoiceY);
  invoiceGrad.stop(0, '#FF5A1F');
  invoiceGrad.stop(1, '#FFA05C');

  doc.fillColor(invoiceGrad).fontSize(38).font(boldFont).text('Invoice', rightColX, invoiceY, {
    align: 'right',
    width: rightColW,
  });

  // Divider Line below header (Equal spacing between logo & border, and border & Billed To card)
  const logoH = 48.6;
  const headerGap = 22;
  cursorY += logoH + headerGap;
  doc.strokeColor('#1E1E1E').lineWidth(1).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();

  // 3. Billed To & Invoice Details Card (Same spacing as above divider)
  cursorY += headerGap;
  const hasContact = Boolean(data.contactPerson);
  const hasGstin = Boolean(data.gstNumber);
  const billedCardH = (hasContact && hasGstin) ? 72 : (hasContact || hasGstin) ? 68 : 64;

  doc.roundedRect(contentX, cursorY, contentW, billedCardH, 8).fill('#111111');
  doc.roundedRect(contentX, cursorY, contentW, billedCardH, 8).strokeColor('#202020').lineWidth(0.8).stroke();

  // Left side: Billed To/Client (Centered on Y-axis)
  const col1X = contentX + 18;
  if (hasContact) {
    const leftStartY = cursorY + 13;
    doc.fillColor('#666666').fontSize(7.5).font(boldFont).text('BILLED TO/CLIENT', col1X, leftStartY, { characterSpacing: 0.6 });
    doc.fillColor('#FFFFFF').fontSize(11).font(boldFont).text(data.companyName || data.clientName, col1X, leftStartY + 14, { width: 240, ellipsis: true });
    doc.fillColor('#888888').fontSize(8).font(regularFont).text(`Attn: ${data.contactPerson}`, col1X, leftStartY + 30, { width: 240, ellipsis: true });
  } else {
    const leftStartY = cursorY + Math.round((billedCardH - 26) / 2);
    doc.fillColor('#666666').fontSize(7.5).font(boldFont).text('BILLED TO/CLIENT', col1X, leftStartY, { characterSpacing: 0.6 });
    doc.fillColor('#FFFFFF').fontSize(11).font(boldFont).text(data.companyName || data.clientName, col1X, leftStartY + 14, { width: 240, ellipsis: true });
  }

  // Right side: Metadata (Invoice No, Date, GSTIN shifted right and vertically centered)
  const col2W = 195;
  const col2X = contentX + contentW - col2W - 18;
  const rightItemCount = 2 + (hasGstin ? 1 : 0);
  const rightRowGap = 15;
  const rightTotalH = (rightItemCount - 1) * rightRowGap + 10;
  let rowMetaY = cursorY + Math.round((billedCardH - rightTotalH) / 2);

  // Invoice No
  const digits = data.clientCode?.match(/\d+/g);
  const defaultNum = digits && digits.length > 0
    ? (digits[digits.length - 1].length === 4 && digits[digits.length - 1].startsWith('0') ? digits[digits.length - 1].substring(1) : digits[digits.length - 1])
    : '001';
  const displayInvoiceNo = data.invoiceNumber || defaultNum;

  doc.fillColor('#777777').fontSize(8).font(regularFont).text('Invoice No:', col2X, rowMetaY);
  doc.fillColor('#FFFFFF').fontSize(8.5).font(boldFont).text(displayInvoiceNo, col2X, rowMetaY, { align: 'right', width: col2W });
  rowMetaY += rightRowGap;

  // Date
  doc.fillColor('#777777').fontSize(8).font(regularFont).text('Invoice Date:', col2X, rowMetaY);
  doc.fillColor('#FFFFFF').fontSize(8.5).font(regularFont).text(data.statementDate, col2X, rowMetaY, { align: 'right', width: col2W });
  rowMetaY += rightRowGap;

  // GSTIN (if applicable with orange gradient)
  if (hasGstin) {
    const gstinGrad = doc.linearGradient(col2X + 50, rowMetaY, col2X + col2W, rowMetaY);
    gstinGrad.stop(0, '#FF5A1F');
    gstinGrad.stop(1, '#FFA05C');
    doc.fillColor('#777777').fontSize(8).font(regularFont).text('GSTIN:', col2X, rowMetaY);
    doc.fillColor(gstinGrad).fontSize(8.5).font(boldFont).text(data.gstNumber!, col2X, rowMetaY, { align: 'right', width: col2W });
  }

  // 4. Deliverables Table
  cursorY += billedCardH + 20;

  const colX_No = contentX + 6;
  const colX_Project = contentX + 28;
  const colX_Price = contentX + 264;
  const colX_Disc = contentX + 348;
  const colX_Total = contentX + 432;
  const colW_Block = 70;
  const colW_Total = contentX + contentW - colX_Total;

  // Table Header (NO., PROJECT / DELIVERABLE, PRICE (₹), DISCOUNT (₹), TOTAL (₹))
  const tableHeaderH = 22;
  doc.roundedRect(contentX, cursorY, contentW, tableHeaderH, 4).fill('#111111');
  doc.fillColor('#71717A').fontSize(7.5).font(boldFont);
  doc.text('NO.', colX_No, cursorY + 6, { width: 20 });
  doc.text('PROJECT / DELIVERABLE', colX_Project, cursorY + 6, { width: colX_Price - colX_Project - 10 });
  doc.text('PRICE (₹)', colX_Price, cursorY + 6, { width: colW_Block, align: 'left' });
  doc.text('DISCOUNT (₹)', colX_Disc, cursorY + 6, { width: colW_Block, align: 'left' });
  doc.text('TOTAL (₹)', colX_Total, cursorY + 6, { width: colW_Total, align: 'left' });

  cursorY += tableHeaderH;

  // Header bottom divider line
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();

  // Table Rows
  const items = data.projects && data.projects.length > 0 ? data.projects : [];

  items.forEach((proj, idx) => {
    cursorY += 10;
    const subList = proj.subProjects || [];
    const extraH = subList.length * 13;
    const rowH = 26 + extraH;

    // Row bottom separator line
    doc.strokeColor('#161616').lineWidth(0.5).moveTo(contentX, cursorY + rowH - 4).lineTo(contentX + contentW, cursorY + rowH - 4).stroke();

    // NO.
    doc.fillColor('#71717A').fontSize(8.5).font(regularFont);
    doc.text(String(idx + 1), colX_No, cursorY + 3, { width: 20 });

    // Project Name
    doc.font(boldFont).fillColor('#FFFFFF').fontSize(8.5);
    doc.text(proj.projectName || proj.projectCode, colX_Project, cursorY + 3, { width: colX_Price - colX_Project - 10, ellipsis: true });

    // Sub-projects with orange bullet points
    if (subList.length > 0) {
      let subY = cursorY + 16;
      subList.forEach((sub) => {
        doc.font(boldFont).fillColor('#FF5A1F').fontSize(9);
        doc.text('•', colX_Project + 2, subY - 0.5);
        doc.font(regularFont).fillColor('#D4D4D8').fontSize(7.5);
        doc.text(sub, colX_Project + 10, subY, { width: colX_Price - colX_Project - 20, ellipsis: true });
        subY += 13;
      });
    }

    // Price (₹) - Right side position, left aligned values
    const pVal = proj.grossProjectValue ?? proj.projectValue;
    doc.fillColor('#FFFFFF').font(boldFont).fontSize(8.5);
    doc.text(formatINRVal(pVal), colX_Price, cursorY + 3, {
      width: colW_Block,
      align: 'left',
    });

    // Discount (₹) - Right side position, left aligned values
    const pDiscount = proj.discountAmount || 0;
    doc.font(regularFont).fillColor('#D4D4D8').fontSize(8.5);
    doc.text(
      pDiscount > 0 ? `-${formatINRVal(pDiscount)}` : '₹0',
      colX_Disc,
      cursorY + 3,
      {
        width: colW_Block,
        align: 'left',
      }
    );

    // Total (₹) - Left aligned parallel to and exact below invoice date
    const pTotal = Math.max(0, pVal - pDiscount);
    doc.fillColor('#D4D4D8').font(boldFont).fontSize(8.5);
    doc.text(formatINRVal(pTotal), colX_Total, cursorY + 3, {
      width: colW_Total,
      align: 'left',
    });

    cursorY += rowH - 4;
  });

  if (items.length === 0) {
    cursorY += 12;
    doc.fillColor('#52525B').fontSize(8.5).font(regularFont).text('No deliverable items selected for this invoice.', contentX + 10, cursorY);
    cursorY += 22;
  }

  // Divider line below deliverables table (border-t before summary)
  cursorY += 12;
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();
  cursorY += 16;

  // 5. Summary Totals Section (Matching web preview modal: left-aligned labels, right-aligned values)
  const summaryW = 300;
  const summaryRightX = contentX + contentW - summaryW;
  const cardInnerPad = 12;
  const amountColW = 95;
  const labelMaxW = summaryW - amountColW - 10;

  let sY = cursorY;
  const rowStep = 18;

  // Combined Subtotal
  const subtotalVal = data.subtotal ?? data.totalRevenue;
  doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Combined Subtotal:', summaryRightX, sY, { width: labelMaxW, align: 'left' });
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(formatINRVal(subtotalVal), summaryRightX, sY, {
    width: summaryW,
    align: 'right',
  });
  sY += rowStep;

  // GST (if applicable)
  if (data.taxAmount && data.taxAmount > 0) {
    doc.font(regularFont).fontSize(8.5).fillColor('#888888').text(`GST (${data.taxPercent || 0}%):`, summaryRightX, sY, { width: labelMaxW, align: 'left' });
    doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(`+${formatINRVal(data.taxAmount)}`, summaryRightX, sY, {
      width: summaryW,
      align: 'right',
    });
    sY += rowStep;
  }

  // Extra Special Discount (if applicable)
  if (data.discountAmount && data.discountAmount > 0) {
    doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Extra Special Discount:', summaryRightX, sY, { width: labelMaxW, align: 'left' });
    doc.fillColor('#D4D4D8').font(boldFont).fontSize(9.5).text(`-${formatINRVal(data.discountAmount)}`, summaryRightX, sY, {
      width: summaryW,
      align: 'right',
    });
    sY += rowStep;
  }

  // Paid Money
  doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Paid Money:', summaryRightX, sY, { width: labelMaxW, align: 'left' });
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(`-${formatINRVal(data.totalPaid)}`, summaryRightX, sY, {
    width: summaryW,
    align: 'right',
  });
  sY += rowStep;

  // Deductions
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach((d) => {
      const dName = d.projectName || d.label || 'Project';
      const labelText = dName.endsWith(':') ? dName : `${dName}:`;
      const labelH = doc.font(regularFont).fontSize(8.5).heightOfString(labelText, {
        width: labelMaxW,
        lineGap: 2,
      });

      doc.font(regularFont).fontSize(8.5).fillColor('#888888').text(labelText, summaryRightX, sY, {
        width: labelMaxW,
        align: 'left',
        lineGap: 2,
      });
      doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(`-${formatINRVal(d.amount)}`, summaryRightX, sY, {
        width: summaryW,
        align: 'right',
      });
      const step = Math.max(rowStep, Math.ceil(labelH) + 6);
      sY += step;
    });
  }
  sY += 6;

  // Balance Due Highlighted Container
  const balanceCardH = 34;
  const balCardX = summaryRightX;
  const balCardW = summaryW;

  const balBorderGrad = doc.linearGradient(balCardX, sY, balCardX + balCardW, sY);
  balBorderGrad.stop(0, '#FF5A1F');
  balBorderGrad.stop(1, '#FFA05C');

  const balTextGrad = doc.linearGradient(balCardX + balCardW - 120, sY + 4, balCardX + balCardW - cardInnerPad, sY + 4);
  balTextGrad.stop(0, '#FF5A1F');
  balTextGrad.stop(1, '#FFA05C');

  doc.roundedRect(balCardX, sY, balCardW, balanceCardH, 8).fill('#1F1008');
  doc.roundedRect(balCardX, sY, balCardW, balanceCardH, 8).strokeColor(balBorderGrad).lineWidth(1.1).stroke();

  doc.font(boldFont).fontSize(9.5).fillColor('#FFFFFF').text('Total:', balCardX + cardInnerPad, sY + 11, { width: 120, align: 'left' });
  doc.fillColor(balTextGrad).fontSize(12.5).font(boldFont).text(
    formatINRVal(data.pendingBalance),
    balCardX,
    sY + 9,
    { width: balCardW - cardInnerPad, align: 'right' }
  );

  // *T&C apply. directly below Balance Due card
  const tncY = sY + balanceCardH + 4;
  doc.font(regularFont).fontSize(8).fillColor('#71717A').text('*T&C apply.', summaryRightX, tncY, {
    width: summaryW,
    align: 'right',
  });

  cursorY = tncY + 18;

  // 6. Section Divider between Deliverables & Terms
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();
  cursorY += 24;

  // 7. Terms and Conditions Header (with radiant Orange Gradient)
  const termsGrad = doc.linearGradient(contentX, cursorY, contentX + 280, cursorY);
  termsGrad.stop(0, '#FF5A1F');
  termsGrad.stop(1, '#FFA05C');
  doc.fillColor(termsGrad).fontSize(18).font(boldFont).text('TERMS AND CONDITIONS', contentX, cursorY);
  cursorY = doc.y + 14;

  // All Clauses in ONE SINGLE COLUMN (Indented cleanly, never touches or overflows boundary)
  const bulletX = contentX + 4;
  const bulletW = 14;
  const textX = contentX + 20;
  const textW = contentW - 48; // Safe 48pt margin from card right boundary

  allTerms.forEach((item) => {
    const bulletGrad = doc.linearGradient(bulletX, cursorY, bulletX + 8, cursorY + 8);
    bulletGrad.stop(0, '#FFA05C');
    bulletGrad.stop(1, '#FF5A1F');
    doc.fillColor(bulletGrad).fontSize(9.5).font(boldFont).text('•', bulletX, cursorY, { width: bulletW });
    doc.fillColor('#D4D4D8').font(regularFont).fontSize(9.2).text(item, textX, cursorY, { width: textW, lineGap: 3.5 });
    cursorY = doc.y + 8.5;
  });

  // 8. Contact Cards (2 Cards matching the invoice preview)
  cursorY = Math.max(cursorY + 16, doc.y + 16);
  const cCardY = cursorY;
  const contactGap = 12;
  const cCardW = (contentW - contactGap) / 2; // ~239.5pt
  const cCardH = 48;
  const iconSize = 28;
  const iconY = cCardY + (cCardH - iconSize) / 2;

  // Card 1: Phone / WhatsApp
  const c1X = contentX;
  doc.roundedRect(c1X, cCardY, cCardW, cCardH, 10).fill('#111111');
  doc.roundedRect(c1X, cCardY, cCardW, cCardH, 10).strokeColor('#202020').lineWidth(0.8).stroke();
  doc.image(PHONE_ICON_BUF, c1X + 12, iconY, { width: iconSize, height: iconSize });
  doc.fillColor('#71717A').fontSize(7).font(boldFont).text('PHONE / WHATSAPP', c1X + 50, cCardY + 11, { characterSpacing: 0.4 });
  doc.fillColor('#FFFFFF').fontSize(8.5).font(boldFont).text('+91 90812 50040', c1X + 50, cCardY + 24);

  // Card 2: Email
  const c2X = contentX + cCardW + contactGap;
  doc.roundedRect(c2X, cCardY, cCardW, cCardH, 10).fill('#111111');
  doc.roundedRect(c2X, cCardY, cCardW, cCardH, 10).strokeColor('#202020').lineWidth(0.8).stroke();
  doc.image(EMAIL_ICON_BUF, c2X + 12, iconY, { width: iconSize, height: iconSize });
  doc.fillColor('#71717A').fontSize(7).font(boldFont).text('EMAIL', c2X + 50, cCardY + 11, { characterSpacing: 0.4 });
  doc.fillColor('#FFFFFF').fontSize(8.5).font(boldFont).text('aagspire@gmail.com', c2X + 50, cCardY + 24);

  cursorY = cCardY + cCardH;

  // 9. Bottom Footer (Single Continuous Page Footer)
  const footerY = cursorY + 22;
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, footerY).lineTo(contentX + contentW, footerY).stroke();
  doc.fillColor('#71717A').fontSize(7.5).font(regularFont);
  doc.text('Aagspire', contentX, footerY + 8);
  doc.text('End of Agreement', contentX + contentW - 140, footerY + 8, { width: 140, align: 'right' });

  doc.end();
}
