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

export const allTerms: string[] = [
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
