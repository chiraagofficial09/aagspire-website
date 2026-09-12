import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Coins,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatCard } from '../../components/work/StatCard';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';

export const AdminEmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [employee, setEmployee] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'workLogs' | 'payouts' | 'bank'>('projects');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pay Employee Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    designation: '',
    department: '',
    defaultCommissionPercent: 40,
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: '',
      panNumber: '',
    },
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [empRes, earnRes, logsRes, payoutsRes] = await Promise.all([
        api.get(`/admin/employees/${id}`),
        api.get(`/admin/employees/${id}/earnings`),
        api.get(`/admin/work-logs?employeeId=${id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/admin/employees/${id}/payouts`).catch(() => ({ data: { data: [] } })),
      ]);
      const emp = empRes.data.data || empRes.data.employee;
      const earnData = earnRes.data.data || earnRes.data;
      const logs =
        logsRes?.data?.data ||
        logsRes?.data?.workLogs ||
        emp?.workLogs ||
        empRes.data?.workLogs ||
        [];

      setEmployee(emp);
      setEarnings(earnData);

      // Extract real projects from earnings service (which has full calculations) or emp response
      const projectList =
        (earnData?.projects && earnData.projects.length > 0 ? earnData.projects : null) ||
        (emp?.projects && emp.projects.length > 0 ? emp.projects : null) ||
        empRes.data?.projects ||
        [];

      setProjects(projectList);
      setWorkLogs(logs);
      setPayouts(payoutsRes?.data?.data || payoutsRes?.data?.payouts || []);

      if (emp) {
        setEditForm({
          fullName: emp.fullName || emp.name || '',
          phone: emp.phone || '',
          designation: emp.designation || '',
          department: emp.department || '',
          defaultCommissionPercent: emp.defaultCommissionPercent ?? 40,
          bankDetails: {
            accountNumber: emp.bankDetails?.accountNumber || '',
            ifscCode: emp.bankDetails?.ifscCode || '',
            bankName: emp.bankDetails?.bankName || '',
            upiId: emp.bankDetails?.upiId || emp.upiId || '',
            panNumber: emp.bankDetails?.panNumber || '',
          },
        });
      }
    } catch (err) {
      console.error('Error fetching employee details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/admin/employees/${id}`, {
        ...editForm,
        name: editForm.fullName,
      });
      toast.success('Employee profile updated successfully');
      setIsEditModalOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${employee.fullName || employee.name}"? This removes their user account and history.`)) {
      return;
    }
    try {
      await api.delete(`/admin/employees/${id}`);
      toast.success('Employee deleted successfully');
      navigate('/admin/employees');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = Number(payAmount);
    if (!entered || isNaN(entered) || entered <= 0) {
      toast.error('Please enter a valid payout amount.');
      return;
    }

    try {
      setSubmittingPayment(true);
      const methodMap: Record<string, string> = {
        bank_transfer: 'Bank Transfer',
        upi: 'UPI',
        cheque: 'Cheque',
        cash: 'Cash',
      };
      await api.post(`/admin/employees/${id}/pay`, {
        amount: entered,
        paymentMethod: methodMap[payMethod] || payMethod,
        paymentReference: payRef,
        notes: payNotes,
        paymentDate: payDate,
      });
      toast.success('Payment recorded successfully for employee.');
      setIsPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payout');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePayout = async (payoutId: string) => {
    if (!window.confirm('Are you sure you want to delete this payout record? The employee remaining balance will be restored.')) {
      return;
    }
    try {
      await api.delete(`/admin/employees/${id}/payouts/${payoutId}`);
      toast.success('Payout record deleted successfully.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-white/50 font-mono">
        Employee record not found.
      </div>
    );
  }

  const bank = employee.bankDetails || {};
  const totalCommission = Number(
    earnings?.totalExpectedCommission ??
    earnings?.totalExpected ??
    earnings?.totalEarnedCommission ??
    earnings?.totalEarned ??
    0
  );
  const totalPaid = Number(earnings?.totalPaid ?? 0);
  const remainingBalance = Math.max(0, totalCommission - totalPaid);
  const earnedCommission = Number(earnings?.totalEarnedCommission ?? earnings?.totalEarned ?? 0);
  const payableNow = Number(earnings?.totalPayable ?? Math.max(0, earnedCommission - totalPaid));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/employees"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{employee.fullName || employee.name}</h1>
            <p className="text-xs text-white/50 font-mono">
              {employee.designation || 'Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPayAmount('');
              setPayRef('');
              setPayNotes('');
              setPayDate(new Date().toISOString().slice(0, 10));
              setPayMethod('bank_transfer');
              setIsPayModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ember hover:bg-ember-deep text-white font-medium text-xs transition-colors shadow-lg shadow-ember/20 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Pay Employee</span>
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <StatusBadge status={employee.isActive || employee.status === 'active' ? 'approved' : 'rejected'} />
        </div>
      </div>

      {/* Financial Stat Cards - Total, Paid, Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL"
          value={formatINR(totalCommission)}
          change={
            earnedCommission > 0 && earnedCommission !== totalCommission
              ? `Earned: ${formatINR(earnedCommission)}`
              : 'Contracted pool share'
          }
          changeType="positive"
          icon={Coins}
          variant="ember"
        />
        <StatCard
          title="PAID"
          value={formatINR(totalPaid)}
          change="Disbursed payouts"
          changeType="neutral"
          icon={CheckCircle2}
        />
        <StatCard
          title="PENDING"
          value={formatINR(remainingBalance)}
          change={
            payableNow > 0
              ? `Ready to settle: ${formatINR(payableNow)}`
              : 'Pending balance'
          }
          changeType="warning"
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex items-center gap-6 text-xs font-mono">
        {[
          { key: 'projects', label: `Projects (${projects.length})` },
          { key: 'workLogs', label: `Work Logs (${workLogs.length})` },
          { key: 'payouts', label: `Payout History (${payouts.length})` },
          { key: 'bank', label: 'Payout Banking Details' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-ember text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Projects */}
      {activeTab === 'projects' && (
        <div className="premium-table-wrap">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Pool Share %</th>
                <th className="py-3 px-4">Earned</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.length > 0 ? (
                projects.map((p: any) => {
                  const prjId = p.projectId || p._id || p.id;
                  const prjName = p.projectName || p.title || 'Project';
                  const role = p.roleInProject || p.role || 'Team Member';
                  const share = p.sharePercent ?? p.sharePercentage ?? p.employeeSharePercent ?? 100;
                  const earned = p.earnedAmount ?? p.earnedCommission ?? p.totalCommission ?? 0;
                  const status = p.status || 'in_progress';

                  return (
                    <tr key={prjId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <Link
                          to={`/admin/projects/${prjId}`}
                          className="hover:text-ember transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{prjName}</span>
                          <ExternalLink className="w-3 h-3 text-white/40 hover:text-ember shrink-0" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-white/70">{role}</td>
                      <td className="py-3 px-4 font-mono text-ember font-bold">{share}%</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        ₹{Number(earned).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={status} type="project" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40 font-mono">
                    No assigned projects on record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Work Logs */}
      {activeTab === 'workLogs' && (
        <div className="premium-table-wrap">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Task / Project</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {workLogs.length > 0 ? (
                workLogs.map((log: any) => {
                  const logId = log._id || log.id;
                  const dateStr = log.workDate || log.logDate || log.createdAt;
                  const duration = log.totalMinutes || (log.hoursWorked ? Math.round(log.hoursWorked * 60) : 0);
                  const projectName = log.projectId?.projectName || log.projectName;

                  return (
                    <tr key={logId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-white/60">
                        {dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-white block">{log.taskName}</span>
                        {projectName && (
                          <span className="text-[10px] font-mono text-white/40 mt-0.5 block">{projectName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-white/70">
                        {duration} mins {duration >= 60 ? `(${(duration / 60).toFixed(1)}h)` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={log.status || 'submitted'} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/40 font-mono">
                    No recorded work logs for this employee.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Payout History */}
      {activeTab === 'payouts' && (
        <div className="premium-table-wrap">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Settlement Code</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference / UTR</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.length > 0 ? (
                payouts.map((p: any) => {
                  const pId = p._id || p.id;
                  const dateStr = p.paymentDate || p.createdAt;
                  return (
                    <tr key={pId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-white/60">
                        {dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white/80">
                        {p.settlementCode || 'SETTLEMENT'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ember">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/80 border border-white/10">
                          {p.paymentMethod || 'Bank Transfer'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-white/60">
                        {p.paymentReference || '—'}
                      </td>
                      <td className="py-3 px-4 text-white/50 max-w-[200px] truncate">
                        {p.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeletePayout(pId)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Payout Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40 font-mono">
                    No payout history recorded yet. Click "Pay Employee" to record a payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Banking */}
      {activeTab === 'bank' && (
        <div className="premium-card p-6 rounded-2xl max-w-xl space-y-4 text-xs font-mono">
          <h3 className="font-bold text-sm text-white font-sans">Payout & Banking Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px]">Bank Name</span>
              <span className="text-white font-semibold">{bank.bankName || 'Not configured'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px]">Account Number</span>
              <span className="text-white font-semibold">{bank.accountNumber || 'Not configured'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px]">IFSC Code</span>
              <span className="text-white font-semibold">{bank.ifscCode || 'Not configured'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px]">UPI ID</span>
              <span className="text-ember font-semibold">{bank.upiId || employee.upiId || 'Not configured'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="premium-modal animate-modal-scale relative w-full max-w-xl p-6 space-y-4 text-white my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Edit Employee Profile</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded bg-white/5 text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-ember uppercase tracking-wider block">
                  Banking & Payout Credentials
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Bank Account Number"
                    value={editForm.bankDetails.accountNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bankDetails: { ...editForm.bankDetails, accountNumber: e.target.value },
                      })
                    }
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={editForm.bankDetails.ifscCode}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bankDetails: { ...editForm.bankDetails, ifscCode: e.target.value },
                      })
                    }
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={editForm.bankDetails.bankName}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bankDetails: { ...editForm.bankDetails, bankName: e.target.value },
                      })
                    }
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="UPI ID"
                    value={editForm.bankDetails.upiId}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bankDetails: { ...editForm.bankDetails, upiId: e.target.value },
                      })
                    }
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-ember text-white hover:bg-ember-deep font-medium cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Employee Modal */}
      {isPayModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-6 space-y-4 text-white text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Pay Employee</h3>
                <p className="text-[11px] text-white/40 font-mono">
                  {employee.fullName || employee.name} • {employee.employeeCode || 'AAG-EMP'}
                </p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded bg-white/5 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commission Summary Box */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/50">TOTAL:</span>
                <span className="font-mono font-semibold text-white">{formatINR(totalCommission)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/50">PAID:</span>
                <span className="font-mono text-white font-semibold">{formatINR(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-white/70 font-medium">PENDING:</span>
                <span className="font-mono font-bold text-ember">{formatINR(remainingBalance)}</span>
              </div>
              {totalCommission > 0 && remainingBalance <= 0 && (
                <div className="text-[11px] text-emerald-400 font-medium pt-1">
                  ✓ All commissions for this employee are fully settled.
                </div>
              )}
            </div>

            {/* Bank details preview in modal */}
            {(bank.accountNumber || bank.upiId || employee.upiId) && (
              <div className="px-3 py-2 rounded-xl bg-ember/5 border border-ember/20 text-[11px] space-y-1 font-mono">
                <div className="text-ember font-semibold text-[10px] uppercase tracking-wider">Payment Destination</div>
                {bank.bankName && <div className="text-white/70">Bank: {bank.bankName}</div>}
                {bank.accountNumber && <div className="text-white/70">A/C: {bank.accountNumber} {bank.ifscCode ? `(${bank.ifscCode})` : ''}</div>}
                {(bank.upiId || employee.upiId) && (
                  <div className="text-ember">UPI: {bank.upiId || employee.upiId}</div>
                )}
              </div>
            )}

            <form onSubmit={handleRecordPayout} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-white/60 block">Amount (₹) *</label>
                  {remainingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(remainingBalance))}
                      className="text-[10px] text-ember hover:underline font-mono cursor-pointer"
                    >
                      Fill Max ({formatINR(remainingBalance)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="Enter payout amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-ember focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Payment Date</label>
                  <CustomDatePicker
                    value={payDate}
                    onChange={(val) => setPayDate(val)}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Payment Method</label>
                  <CustomSelect
                    value={payMethod}
                    onChange={(val) => setPayMethod(val)}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Transaction Ref / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR202609081234"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Advance, Monthly Payout, Commission, etc."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || Number(payAmount) <= 0 || !payAmount}
                  className="px-4 py-1.5 rounded-lg bg-ember text-white hover:bg-ember-deep font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingPayment ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
