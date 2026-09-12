export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  employeeCode?: string;
}

export interface EmployeeProfile {
  _id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  joiningDate: string;
  defaultCommissionPercent?: number;
  profileImage?: string;
  address?: string;
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  upiId?: string;
  status: 'active' | 'inactive';
}

export interface ClientProfile {
  _id: string;
  clientCode: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  industry?: string;
  source?: string;
  notes?: string;
  lastInvoiceNumber?: string;
  status: 'active' | 'inactive';
  totalProjects?: number;
  activeProjects?: number;
  totalBusinessValue?: number;
  totalPaid?: number;
  pendingPayment?: number;
}

export type ProjectStatus =
  | 'lead'
  | 'confirmed'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export interface ProjectItem {
  _id: string;
  projectCode: string;
  clientId: { _id: string; name: string; companyName?: string; clientCode?: string } | string;
  projectName: string;
  description?: string;
  projectValue: number;
  startDate?: string;
  deadline?: string;
  status: ProjectStatus;
  assignedEmployees: Array<{
    _id: string;
    fullName: string;
    employeeCode: string;
    designation?: string;
  }>;
  paymentsReceived?: number;
  outstanding?: number;
  paymentProgressPercent?: number;
  createdAt: string;
}

export interface ProjectCommissionData {
  _id?: string;
  projectId: string;
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
  brokerAmount: number;
  employeeAmount: number;
  officeAmount: number;
  adminAmount: number;
  settlementAmount: number;
}

export interface ProjectEmployeeAllocation {
  _id?: string;
  projectId: string;
  employeeId: { _id: string; fullName: string; employeeCode: string } | string;
  sharePercent: number;
  allocatedCommission: number;
}

export interface CommissionPresetItem {
  _id: string;
  name: string;
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
  isDefault: boolean;
}

export interface ClientPaymentRecord {
  _id: string;
  projectId: { _id: string; projectName: string; projectCode: string; projectValue?: any } | string;
  clientId: { _id: string; name: string; companyName?: string; clientCode?: string } | string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other';
  transactionReference?: string;
  notes?: string;
}

export type WorkLogStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';

export interface WorkLogEntry {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode: string } | string;
  projectId: { _id: string; projectName: string; projectCode: string } | string;
  workDate: string;
  taskName: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  totalMinutes: number;
  status: WorkLogStatus;
  adminComment?: string;
  reviewedBy?: { _id: string; name: string };
  reviewedAt?: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

export interface AttendanceRecord {
  _id: string;
  employeeId: { _id: string; fullName: string; employeeCode: string; designation?: string } | string;
  date: string;
  clockInAt?: string;
  clockOutAt?: string;
  totalMinutes: number;
  status: AttendanceStatus;
  notes?: string;
}

export type SettlementStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface SettlementRecord {
  _id: string;
  settlementCode: string;
  employeeId: { _id: string; fullName: string; employeeCode: string; designation?: string };
  periodStart: string;
  periodEnd: string;
  grossEarned: number;
  adjustments: number;
  previouslyPaid: number;
  finalPayable: number;
  status: SettlementStatus;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ReceiptRecord {
  _id: string;
  receiptCode: string;
  settlementId: {
    _id: string;
    settlementCode: string;
    periodStart: string;
    periodEnd: string;
    paymentMethod?: string;
  };
  employeeId: {
    _id: string;
    fullName: string;
    employeeCode: string;
    designation?: string;
  };
  receiptData: {
    receiptCode: string;
    settlementCode: string;
    employeeName: string;
    employeeCode: string;
    periodStart: string;
    periodEnd: string;
    grossEarned: number;
    adjustments: number;
    previouslyPaid: number;
    finalPayable: number;
    paymentMethod: string;
    paymentReference?: string;
    paymentDate: string;
    items: Array<{
      projectName: string;
      earnedAmount: number;
      description?: string;
    }>;
  };
  pdfUrl?: string;
  issuedAt: string;
}

export interface EmployeeEarningsBreakdown {
  totalExpected: number;
  totalEarned: number;
  totalPaid: number;
  totalPayable: number;
  totalPending: number;
  projects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    projectValue: number;
    paymentsReceived: number;
    employeeCategoryPercent: number;
    employeeSharePercent: number;
    expectedCommission: number;
    earnedCommission: number;
    paidCommission: number;
    payableBalance: number;
    pendingCommission: number;
  }>;
}

export interface AdminDashboardData {
  kpis: {
    totalProjectValue: number;
    totalReceived: number;
    outstandingAmount: number;
    totalEmployeeAllocation: number;
    totalOfficeAllocation: number;
    totalAdminShare: number;
    totalSettlementReserve: number;
    totalProjectsCount: number;
    pendingWorkLogsCount: number;
    pendingSettlementsCount: number;
    clockedInToday: number;
  };
  monthlyTrends: Array<{
    month: string;
    projectValue: number;
    paymentsReceived: number;
    adminShare: number;
    employeeCommission: number;
  }>;
  statusDistribution: Record<string, number>;
  todayAttendance: AttendanceRecord[];
}
