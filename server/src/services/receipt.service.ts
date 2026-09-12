import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { numberToIndianWords } from '../utils/numberToWords.js';

export interface ReceiptPdfData {
  receiptCode: string;
  settlementCode: string;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  periodStart: string | Date;
  periodEnd: string | Date;
  grossEarned: number;
  adjustments: number;
  previouslyPaid: number;
  finalPayable: number;
  finalPaid?: number;
  amount?: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentDate: string | Date;
  items: Array<{
    projectName: string;
    earnedAmount: number;
    description?: string;
    projectCode?: string;
    amount?: number;
  }>;
}

export function generateReceiptPdfStream(data: ReceiptPdfData, res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

  // Stream PDF to HTTP response
  doc.pipe(res);

  const pageWidth = doc.page.width; // 595.28 pt
  const contentWidth = pageWidth - 80; // 515.28 pt

  // Top Minimal Brand Accent Line
  doc.rect(40, 30, contentWidth, 3).fill('#EA580C');

  // 1. Header Section
  let cursorY = 46;

  // Left: Brand Identity
  doc.fillColor('#0F172A').fontSize(22).font('Helvetica-Bold').text('AAGSPIRE', 40, cursorY, { characterSpacing: 1 });
  doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text('CREATIVE PRODUCTION & STAFF MANAGEMENT', 40, cursorY + 26, { characterSpacing: 0.5 });
  doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text('Disbursement Authority: Aagspire Creative Media Pvt. Ltd.', 40, cursorY + 38);
  doc.fillColor('#64748B').fontSize(7.5).text('finance@aagspire.com  •  www.aagspire.com  •  Staff ID Portal', 40, cursorY + 49);

  // Right: Document Metadata
  const rightColX = 330;
  const rightColW = pageWidth - 40 - rightColX;

  doc.roundedRect(rightColX, cursorY - 2, rightColW, 20, 3).fill('#F8FAFC');
  doc.roundedRect(rightColX, cursorY - 2, rightColW, 20, 3).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text('COMMISSION SETTLEMENT VOUCHER', rightColX, cursorY + 4, {
    align: 'center',
    width: rightColW,
    characterSpacing: 0.5,
  });

  const voucherCode = data.receiptCode || 'RCP-VOUCHER';
  doc.fillColor('#EA580C').fontSize(10).font('Helvetica-Bold').text(`VOUCHER: ${voucherCode}`, rightColX, cursorY + 28, { align: 'right', width: rightColW });

  const payDateStr = data.paymentDate
    ? new Date(data.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');
  doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`Disbursement Date: ${payDateStr}`, rightColX, cursorY + 42, { align: 'right', width: rightColW });
  doc.fillColor('#059669').fontSize(7.5).font('Helvetica-Bold').text('Status: DISBURSED & VERIFIED', rightColX, cursorY + 54, { align: 'right', width: rightColW });

  // Divider Line
  cursorY = 115;
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, cursorY).lineTo(pageWidth - 40, cursorY).stroke();

  // 2. Beneficiary & Disbursement Metadata Box
  cursorY += 12;
  const cardHeight = 72;

  doc.roundedRect(40, cursorY, contentWidth, cardHeight, 4).fill('#F8FAFC');
  doc.roundedRect(40, cursorY, contentWidth, cardHeight, 4).strokeColor('#E2E8F0').lineWidth(1).stroke();

  // Left: Beneficiary Staff Profile
  const col1X = 54;
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('BENEFICIARY DETAILS', col1X, cursorY + 10, { characterSpacing: 0.5 });
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(data.employeeName || 'Staff Member', col1X, cursorY + 23);
  doc.fillColor('#334155').fontSize(8).font('Helvetica').text(
    `Employee ID: ${data.employeeCode || 'N/A'}${data.designation ? `  •  ${data.designation}` : ''}`,
    col1X,
    cursorY + 38
  );

  const startStr = data.periodStart ? new Date(data.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const endStr = data.periodEnd ? new Date(data.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  doc.fillColor('#64748B').fontSize(7.5).text(`Settlement Cycle: ${startStr} to ${endStr}`, col1X, cursorY + 51);

  // Right: Payment Channel & Banking
  const col2X = 330;
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('PAYMENT CHANNEL & SETTLEMENT', col2X, cursorY + 10, { characterSpacing: 0.5 });
  const methodStr = (data.paymentMethod || 'bank_transfer').toUpperCase().replace('_', ' ');
  doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`Method: ${methodStr}`, col2X, cursorY + 23);

  const refStr = data.paymentReference ? `UTR / Ref: ${data.paymentReference}` : 'Transaction: Processed / Automated';
  doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(refStr, col2X, cursorY + 37);

  if (data.bankDetails && (data.bankDetails.bankName || data.bankDetails.accountNumber)) {
    const bName = data.bankDetails.bankName || 'Bank';
    const bAcc = data.bankDetails.accountNumber || '';
    doc.fillColor('#64748B').fontSize(7.5).text(`Disbursed To: ${bName} ${bAcc}`, col2X, cursorY + 50);
  } else {
    doc.fillColor('#64748B').fontSize(7.5).text(`Cycle Settlement Code: ${data.settlementCode || 'SETTLEMENT'}`, col2X, cursorY + 50);
  }

  // 3. Project & Allocation Ledger Table
  cursorY += cardHeight + 16;
  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold').text('COMMISSION ALLOCATIONS & PROJECT MILESTONES', 40, cursorY);
  cursorY += 14;

  const tableLeft = 40;
  const colW_Index = 30;
  const colW_Proj = 165;
  const colW_Desc = 200;
  const colW_Amount = 120;

  // Header row
  doc.rect(tableLeft, cursorY, contentWidth, 22).fill('#F8FAFC');
  doc.rect(tableLeft, cursorY, contentWidth, 22).strokeColor('#CBD5E1').lineWidth(0.75).stroke();

  doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold');
  doc.text('#', tableLeft + 8, cursorY + 7, { width: colW_Index - 8 });
  doc.text('PROJECT / PRODUCTION', tableLeft + colW_Index, cursorY + 7, { width: colW_Proj - 8 });
  doc.text('ALLOCATION MILESTONE', tableLeft + colW_Index + colW_Proj, cursorY + 7, { width: colW_Desc - 8 });
  doc.text('SETTLED AMOUNT (INR)', tableLeft + colW_Index + colW_Proj + colW_Desc, cursorY + 7, { width: colW_Amount, align: 'right' });

  cursorY += 22;

  // Items
  const items = data.items && data.items.length > 0 ? data.items : [];
  const maxRows = 10;
  const displayItems = items.slice(0, maxRows);

  displayItems.forEach((item, idx) => {
    const rowH = 24;
    const isEven = idx % 2 === 1;

    if (isEven) {
      doc.rect(tableLeft, cursorY, contentWidth, rowH).fill('#FCFDFF');
    }
    doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(tableLeft, cursorY + rowH).lineTo(tableLeft + contentWidth, cursorY + rowH).stroke();

    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(String(idx + 1), tableLeft + 8, cursorY + 7, { width: colW_Index - 8 });

    const pName = item.projectName || item.description || 'Creative Production';
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(pName, tableLeft + colW_Index, cursorY + 7, { width: colW_Proj - 10, ellipsis: true });

    const desc = item.description || (item.projectCode ? `Code: ${item.projectCode}` : 'Commission Payout');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(desc, tableLeft + colW_Index + colW_Proj, cursorY + 7, { width: colW_Desc - 10, ellipsis: true });

    const itemAmount = Number(item.earnedAmount !== undefined ? item.earnedAmount : item.amount) || 0;
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(
      `₹ ${itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      tableLeft + colW_Index + colW_Proj + colW_Desc,
      cursorY + 6,
      { width: colW_Amount, align: 'right' }
    );

    cursorY += rowH;
  });

  if (items.length === 0) {
    const rowH = 24;
    doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(tableLeft, cursorY + rowH).lineTo(tableLeft + contentWidth, cursorY + rowH).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('1', tableLeft + 8, cursorY + 7, { width: colW_Index - 8 });
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text('Consolidated Monthly Settlement', tableLeft + colW_Index, cursorY + 7);
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text('Full settlement cycle payout', tableLeft + colW_Index + colW_Proj, cursorY + 7);
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(
      `₹ ${(data.grossEarned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      tableLeft + colW_Index + colW_Proj + colW_Desc,
      cursorY + 6,
      { width: colW_Amount, align: 'right' }
    );
    cursorY += rowH;
  }

  // Divider
  doc.strokeColor('#CBD5E1').lineWidth(0.75).moveTo(tableLeft, cursorY).lineTo(tableLeft + contentWidth, cursorY).stroke();
  cursorY += 12;

  // 4. Financial Ledger Breakdown Box
  const summaryTop = cursorY;
  const leftW = 240;
  const rightX = 310;
  const rightW = contentWidth - 270;
  const labelW = 125;
  const valW = rightW - labelW;

  // Left Note & Compliance
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text('COMPLIANCE & TAX NOTE', 40, summaryTop);
  doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(
    'This voucher records the official disbursement of verified creative milestone commissions. Statutory deductions, TDS, and company policy reconciliations have been applied in accordance with service agreements.',
    40,
    summaryTop + 13,
    { width: leftW, lineGap: 2 }
  );

  // Right Breakdown
  let sY = summaryTop;
  const rowStep = 16;

  const gross = Number(data.grossEarned) || 0;
  doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Gross Commission Earned:', rightX, sY, { width: labelW });
  doc.fillColor('#0F172A').font('Helvetica-Bold').text(`INR ${gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + labelW, sY, {
    width: valW,
    align: 'right',
  });
  sY += rowStep;

  if (data.adjustments && data.adjustments !== 0) {
    const isNeg = data.adjustments < 0;
    doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Cycle Adjustments / TDS:', rightX, sY, { width: labelW });
    doc.fillColor(isNeg ? '#C2410C' : '#059669').font('Helvetica-Bold').text(
      `${isNeg ? '-' : '+'} INR ${Math.abs(data.adjustments).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      rightX + labelW,
      sY,
      { width: valW, align: 'right' }
    );
    sY += rowStep;
  }

  if (data.previouslyPaid && data.previouslyPaid > 0) {
    doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Previously Disbursed:', rightX, sY, { width: labelW });
    doc.fillColor('#C2410C').font('Helvetica').text(
      `- INR ${data.previouslyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      rightX + labelW,
      sY,
      { width: valW, align: 'right' }
    );
    sY += rowStep;
  }

  // Net Disbursed Box
  const finalPaid = Number(data.finalPaid !== undefined ? data.finalPaid : (data.finalPayable !== undefined ? data.finalPayable : data.amount)) || 0;
  doc.roundedRect(rightX - 6, sY - 4, rightW + 12, 24, 3).fill('#F0FDF4');
  doc.roundedRect(rightX - 6, sY - 4, rightW + 12, 24, 3).strokeColor('#BBF7D0').lineWidth(1).stroke();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#15803D').text('NET DISBURSED:', rightX, sY + 3, { width: labelW });
  doc.fillColor('#15803D').fontSize(10).font('Helvetica-Bold').text(
    `INR ${finalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    rightX + labelW,
    sY + 2,
    { width: valW, align: 'right' }
  );

  // 5. Amount in Words & Authorized Signatory Footer
  const footerY = 720;
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, footerY).lineTo(pageWidth - 40, footerY).stroke();

  const words = numberToIndianWords(finalPaid);
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('NET PAYABLE IN WORDS:', 40, footerY + 10);
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(words, 40, footerY + 22, { width: 300 });

  const sigX = 400;
  doc.strokeColor('#94A3B8').lineWidth(0.75).moveTo(sigX, footerY + 44).lineTo(pageWidth - 40, footerY + 44).stroke();
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text('Finance Controller / Authorized', sigX, footerY + 48, { align: 'center', width: pageWidth - 40 - sigX });
  doc.fillColor('#64748B').fontSize(7).font('Helvetica').text('Aagspire Creative Media Pvt. Ltd.', sigX, footerY + 59, { align: 'center', width: pageWidth - 40 - sigX });

  // Final Bottom Disclaimer
  doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica').text(
    'This disbursement voucher has been digitally authenticated by Aagspire Work Core Financial Engine. Valid without physical stamp.',
    40,
    795,
    { align: 'center', width: contentWidth }
  );

  doc.end();
}
