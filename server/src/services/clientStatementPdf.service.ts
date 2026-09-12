import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { numberToIndianWords } from '../utils/numberToWords.js';
import fs from 'fs';
import path from 'path';

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
  subtotal?: number;
  taxPercent?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalRevenue: number;
  totalPaid: number;
  pendingBalance: number;
  notes?: string;
  projects: ClientStatementProjectItem[];
}

export function generateClientStatementPdfStream(data: ClientStatementPdfData, res: Response): void {
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });

  // Stream PDF directly to HTTP response
  doc.pipe(res);

  const pageWidth = doc.page.width; // 595.28 for A4
  const pageHeight = doc.page.height; // 841.89 for A4

  // Register TrueType fonts that support Unicode Indian Rupee symbol (₹)
  const fontRegularCandidates = [
    path.resolve(process.cwd(), 'server/src/assets/fonts/segoeui.ttf'),
    path.resolve(process.cwd(), 'server/dist/assets/fonts/segoeui.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/segoeui.ttf'),
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
  ];
  const fontBoldCandidates = [
    path.resolve(process.cwd(), 'server/src/assets/fonts/segoeuib.ttf'),
    path.resolve(process.cwd(), 'server/dist/assets/fonts/segoeuib.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/segoeuib.ttf'),
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
  ];

  const regularFontFile = fontRegularCandidates.find((p) => fs.existsSync(p));
  const boldFontFile = fontBoldCandidates.find((p) => fs.existsSync(p));

  const regularFont = regularFontFile ? 'App-Regular' : 'Helvetica';
  const boldFont = boldFontFile ? 'App-Bold' : 'Helvetica-Bold';

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

  const formatINRVal = (val: any): string => {
    const num = typeof val === 'number' ? val : Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // 1. Full Page Deep Dark Background (#080808)
  doc.rect(0, 0, pageWidth, pageHeight).fill('#080808');

  // Outer Container Card with sleek rounded border matching preview UI
  const marginX = 24;
  const marginY = 24;
  const cardW = pageWidth - marginX * 2;
  const cardH = pageHeight - marginY * 2;

  doc.roundedRect(marginX, marginY, cardW, cardH, 16).fill('#0B0B0B');
  doc.roundedRect(marginX, marginY, cardW, cardH, 16).strokeColor('#1F1F1F').lineWidth(1.2).stroke();

  const contentX = marginX + 28;
  const contentW = cardW - 56; // 491.28 pt

  // 2. Invoice Header
  let cursorY = marginY + 28;

  // Left: Brand Identity Logo (White spire text on dark background)
  const candidateLogos = [
    path.resolve(process.cwd(), 'server/src/assets/Aagspire_Logo.png'),
    path.resolve(process.cwd(), 'public/Aagspire_Logo.png'),
    path.resolve(process.cwd(), 'server/src/assets/Aagspire_1.png'),
    path.resolve(process.cwd(), 'public/Aagspire_1.png'),
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

  // Right: Document Title ("Invoice" in bright Orange #FF5A1F)
  const rightColW = 200;
  const rightColX = contentX + contentW - rightColW;

  doc.fillColor('#FF5A1F').fontSize(38).font(boldFont).text('Invoice', rightColX, cursorY - 4, {
    align: 'right',
    width: rightColW,
  });

  // Divider Line below header
  cursorY += 56;
  doc.strokeColor('#1E1E1E').lineWidth(1).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();

  // 3. Billed To & Invoice Details Card
  cursorY += 16;
  const billedCardH = 66;

  doc.roundedRect(contentX, cursorY, contentW, billedCardH, 8).fill('#111111');
  doc.roundedRect(contentX, cursorY, contentW, billedCardH, 8).strokeColor('#202020').lineWidth(0.8).stroke();

  // Left side: Billed To / Client
  const col1X = contentX + 18;
  doc.fillColor('#666666').fontSize(7.5).font(boldFont).text('BILLED TO / CLIENT', col1X, cursorY + 12, { characterSpacing: 0.6 });
  doc.fillColor('#FFFFFF').fontSize(11.5).font(boldFont).text(data.companyName || data.clientName, col1X, cursorY + 26, { width: 240, ellipsis: true });
  if (data.contactPerson) {
    doc.fillColor('#888888').fontSize(8.5).font(regularFont).text(`Attn: ${data.contactPerson}`, col1X, cursorY + 43, { width: 240, ellipsis: true });
  }

  // Right side: Invoice Info & Tax Details
  const col2W = 180;
  const col2X = contentX + contentW - col2W - 18;
  const digits = data.clientCode?.match(/\d+/g);
  const defaultNum = digits && digits.length > 0
    ? (digits[digits.length - 1].length === 4 && digits[digits.length - 1].startsWith('0') ? digits[digits.length - 1].substring(1) : digits[digits.length - 1])
    : '001';
  const displayInvoiceNo = data.invoiceNumber || defaultNum;

  // Invoice No
  doc.fillColor('#777777').fontSize(8.5).font(regularFont).text('Invoice No:', col2X, cursorY + 14);
  doc.fillColor('#FFFFFF').fontSize(9).font(boldFont).text(displayInvoiceNo, col2X, cursorY + 14, { align: 'right', width: col2W });

  // Date
  doc.fillColor('#777777').fontSize(8.5).font(regularFont).text('Date:', col2X, cursorY + 30);
  doc.fillColor('#FFFFFF').fontSize(8.5).font(regularFont).text(data.statementDate, col2X, cursorY + 30, { align: 'right', width: col2W });

  // GSTIN (if applicable)
  if (data.gstNumber) {
    doc.fillColor('#777777').fontSize(8.5).font(regularFont).text('GSTIN:', col2X, cursorY + 45);
    doc.fillColor('#FF5A1F').fontSize(8.5).font(boldFont).text(data.gstNumber, col2X, cursorY + 45, { align: 'right', width: col2W });
  }

  // 4. Deliverables Table
  cursorY += billedCardH + 20;

  const colW_No = 35;
  const colW_Project = 210;
  const colW_Price = 85;
  const colW_Disc = 80;
  const colW_Total = contentW - (colW_No + colW_Project + colW_Price + colW_Disc); // ~81.28 pt

  // Table Header (NO., PROJECT, PRICE (₹), DISCOUNT (₹), TOTAL (₹))
  const tableHeaderH = 20;
  doc.fillColor('#71717A').fontSize(7.5).font(boldFont);
  doc.text('NO.', contentX + 4, cursorY + 4, { width: colW_No - 4 });
  doc.text('PROJECT', contentX + colW_No, cursorY + 4, { width: colW_Project - 4 });
  doc.text('PRICE (₹)', contentX + colW_No + colW_Project, cursorY + 4, { width: colW_Price - 6, align: 'right' });
  doc.text('DISCOUNT (₹)', contentX + colW_No + colW_Project + colW_Price, cursorY + 4, { width: colW_Disc - 6, align: 'right' });
  doc.text('TOTAL (₹)', contentX + colW_No + colW_Project + colW_Price + colW_Disc, cursorY + 4, { width: colW_Total - 4, align: 'right' });

  cursorY += tableHeaderH;

  // Header bottom divider line
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, cursorY).lineTo(contentX + contentW, cursorY).stroke();

  // Table Rows
  const items = data.projects && data.projects.length > 0 ? data.projects : [];
  const maxRows = 12;
  const displayItems = items.slice(0, maxRows);

  displayItems.forEach((proj, idx) => {
    cursorY += 10;
    const rowH = 26;

    // Row bottom separator line
    doc.strokeColor('#161616').lineWidth(0.5).moveTo(contentX, cursorY + rowH - 4).lineTo(contentX + contentW, cursorY + rowH - 4).stroke();

    // NO.
    doc.fillColor('#71717A').fontSize(8.5).font(regularFont);
    doc.text(String(idx + 1), contentX + 4, cursorY + 3, { width: colW_No - 4 });

    // Project Name
    doc.font(boldFont).fillColor('#FFFFFF').fontSize(8.5);
    doc.text(proj.projectName || proj.projectCode, contentX + colW_No, cursorY + 3, { width: colW_Project - 10, ellipsis: true });

    // Price (₹)
    const pVal = proj.grossProjectValue ?? proj.projectValue;
    doc.fillColor('#FFFFFF').font(boldFont).fontSize(8.5);
    doc.text(formatINRVal(pVal), contentX + colW_No + colW_Project, cursorY + 3, {
      width: colW_Price - 6,
      align: 'right',
    });

    // Discount (₹)
    const pDiscount = proj.discountAmount || 0;
    doc.font(regularFont).fillColor('#D4D4D8').fontSize(8.5);
    doc.text(
      pDiscount > 0 ? `-${formatINRVal(pDiscount)}` : '₹0',
      contentX + colW_No + colW_Project + colW_Price,
      cursorY + 3,
      {
        width: colW_Disc - 6,
        align: 'right',
      }
    );

    // Total (₹)
    const pTotal = proj.balance ?? Math.max(0, pVal - pDiscount);
    doc.fillColor('#FFFFFF').font(boldFont).fontSize(8.5);
    doc.text(formatINRVal(pTotal), contentX + colW_No + colW_Project + colW_Price + colW_Disc, cursorY + 3, {
      width: colW_Total - 4,
      align: 'right',
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
  cursorY += 18;

  // 5. Summary Totals Section (Right-aligned matching screenshot)
  const summaryBlockTop = cursorY;
  const summaryW = 250;
  const summaryRightX = contentX + contentW - summaryW;
  const sumLabelW = 135;
  const sumValW = summaryW - sumLabelW;

  let sY = summaryBlockTop;
  const rowStep = 18;

  // Combined Subtotal
  const subtotalVal = data.subtotal ?? data.totalRevenue;
  doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Combined Subtotal:', summaryRightX, sY, { width: sumLabelW });
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(formatINRVal(subtotalVal), summaryRightX + sumLabelW, sY, {
    width: sumValW,
    align: 'right',
  });
  sY += rowStep;

  // GST (if applicable)
  if (data.taxAmount && data.taxAmount > 0) {
    doc.font(regularFont).fontSize(8.5).fillColor('#888888').text(`GST (${data.taxPercent || 0}%):`, summaryRightX, sY, { width: sumLabelW });
    doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(`+${formatINRVal(data.taxAmount)}`, summaryRightX + sumLabelW, sY, {
      width: sumValW,
      align: 'right',
    });
    sY += rowStep;
  }

  // Extra Special Discount (if applicable)
  if (data.discountAmount && data.discountAmount > 0) {
    doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Extra Special Discount:', summaryRightX, sY, { width: sumLabelW });
    doc.fillColor('#D4D4D8').font(boldFont).fontSize(9.5).text(`-${formatINRVal(data.discountAmount)}`, summaryRightX + sumLabelW, sY, {
      width: sumValW,
      align: 'right',
    });
    sY += rowStep;
  }

  // Paid Money
  doc.font(regularFont).fontSize(8.5).fillColor('#888888').text('Paid Money:', summaryRightX, sY, { width: sumLabelW });
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(9.5).text(`-${formatINRVal(data.totalPaid)}`, summaryRightX + sumLabelW, sY, {
    width: sumValW,
    align: 'right',
  });
  sY += rowStep + 6;

  // Balance Due Highlighted Container (Dark Brown/Orange Glow)
  const balanceCardH = 34;
  doc.roundedRect(summaryRightX - 8, sY - 4, summaryW + 8, balanceCardH, 6).fill('#1A0D07');
  doc.roundedRect(summaryRightX - 8, sY - 4, summaryW + 8, balanceCardH, 6).strokeColor('#4D1E0B').lineWidth(1).stroke();

  doc.font(boldFont).fontSize(10.5).fillColor('#FFFFFF').text('Balance Due:', summaryRightX + 4, sY + 6, { width: sumLabelW });
  doc.fillColor('#FF5A1F').fontSize(13.5).font(boldFont).text(
    formatINRVal(data.pendingBalance),
    summaryRightX + sumLabelW,
    sY + 4,
    { width: sumValW, align: 'right' }
  );

  // 6. Terms & Notes (Below summary with divider line above, exactly like preview)
  const notesText = (data.notes && data.notes.trim()) || 'Includes all approved deliverables and production revisions.';
  const notesY = Math.max(sY + balanceCardH + 22, summaryBlockTop + 96);

  // Divider above notes
  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, notesY - 8).lineTo(contentX + contentW, notesY - 8).stroke();

  doc.fillColor('#A1A1AA').fontSize(8).font(boldFont).text('Terms & Notes: ', contentX, notesY + 4, { continued: true });
  doc.fillColor('#71717A').fontSize(8).font(regularFont).text(notesText, { lineGap: 2 });

  // 7. Formal Sign-off and "Amount in Words" Footer (Clean bottom bar)
  const footerY = pageHeight - marginY - 76;

  doc.strokeColor('#1E1E1E').lineWidth(0.8).moveTo(contentX, footerY).lineTo(contentX + contentW, footerY).stroke();

  // Amount in Words
  const amountForWords = data.pendingBalance > 0 ? data.pendingBalance : (data.totalRevenue || 0);
  const words = numberToIndianWords(Math.round(amountForWords));
  doc.fillColor('#71717A').fontSize(7).font(boldFont).text(
    data.pendingBalance > 0 ? 'NET BALANCE DUE IN WORDS:' : 'TOTAL INVOICE AMOUNT IN WORDS:',
    contentX,
    footerY + 10
  );
  doc.fillColor('#E4E4E7').fontSize(7.5).font(boldFont).text(words, contentX, footerY + 21, { width: 280 });

  // Authorized Signatory Block
  const sigX = contentX + contentW - 140;
  doc.strokeColor('#333333').lineWidth(0.75).moveTo(sigX, footerY + 36).lineTo(contentX + contentW, footerY + 36).stroke();
  doc.fillColor('#FFFFFF').fontSize(7.5).font(boldFont).text('Authorized Signatory', sigX, footerY + 40, { align: 'center', width: 140 });
  doc.fillColor('#71717A').fontSize(6.5).font(regularFont).text('Aagspire Creative Media Pvt. Ltd.', sigX, footerY + 50, { align: 'center', width: 140 });

  // Final Bottom Disclaimer
  doc.fillColor('#52525B').fontSize(6).font(regularFont).text(
    'This is an official computer-generated invoice issued under the authority of Aagspire Creative Media. No physical signature required.',
    contentX,
    footerY + 62,
    { align: 'center', width: contentW }
  );

  doc.end();
}
