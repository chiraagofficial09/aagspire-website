import { FinanceSummary } from '../../components/work/FinanceSummary';
import { financeToday } from '../../utils/financeDate';
import { CustomSelect } from '../../components/work/CustomSelect';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { EmptyState } from '../../components/work/EmptyState';
import { FinanceMonthSelect } from '../../components/work/FinanceMonthSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';
import { useAlert } from '../../context/AlertContext';

interface ExpenseItem {
  _id: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  notes?: string;
  createdAt: string;
}

export const AdminOfficeExpenses: React.FC = () => {
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summaryRevision, setSummaryRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const requestSequence = useRef(0);

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => financeToday().slice(0, 7),
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    paymentMethod: '',
    expenseDate: financeToday(),
  });

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const d = new Date(yr, mo - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  const fetchExpenses = async (monthVal = selectedMonth, searchVal = search) => {
    const request = ++requestSequence.current;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (monthVal && monthVal !== 'all') {
        params.append('month', monthVal);
      }
      if (searchVal.trim()) {
        params.append('search', searchVal.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/expenses${qs}`);
      if (request !== requestSequence.current) return;
      if (res.data.success) {
        setExpenses(res.data.data || []);
      }
    } catch (err: any) {
      if (request !== requestSequence.current) return;
      setExpenses([]);
      console.error('Failed to fetch office expenses', err);
      toast.error('Failed to load office expenses');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(selectedMonth, search);
  }, [selectedMonth, search]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      paymentMethod: '',
      expenseDate: financeToday(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingExpense(item);
    const dateStr = item.expenseDate
      ? financeToday(new Date(item.expenseDate))
      : financeToday();
    setFormData({
      title: item.title,
      amount: String(item.amount),
      paymentMethod: item.paymentMethod || '',
      expenseDate: dateStr,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete expense "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/expenses/${id}`);
      toast.success('Office expense deleted successfully');
      setSummaryRevision(value => value + 1);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter expense name');
      return;
    }
    if (submitting) return;
    if (!formData.paymentMethod) { toast.error('Please select Bank or Cash'); return; }
    const num = parseFloat(formData.amount);
    if (!Number.isFinite(num) || num <= 0 || !/^\d+(\.\d{1,2})?$/.test(formData.amount)) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      if (editingExpense) {
        await api.patch(`/admin/expenses/${editingExpense._id}`, {
          title: formData.title.trim(),
          amount: num,
          expenseDate: formData.expenseDate,
          paymentMethod: formData.paymentMethod,
        });
        toast.success('Office expense updated');
      } else {
        await api.post('/admin/expenses', {
          title: formData.title.trim(),
          amount: num,
          expenseDate: formData.expenseDate,
          paymentMethod: formData.paymentMethod,
        });
        toast.success('Office expense added');
      }
      setIsModalOpen(false);
      setSummaryRevision(value => value + 1);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Undated';
    return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Office Expenses</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track, record, and calculate operational and office expenses.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Simple Month Filter at the Top */}
          <FinanceMonthSelect value={selectedMonth} onChange={setSelectedMonth} />
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <FinanceSummary kind="expenses" revision={summaryRevision} month={selectedMonth} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search expenses by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Expenses Table (Strictly Orange, White, and Black) */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase" style={{width:'60px'}}>
                  NO.
                </th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  EXPENSE NAME
                </th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  DATE
                </th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                  MONEY
                </th>
                <th className="py-4 px-6 text-[11px] font-semibold text-zinc-500 uppercase">Status / Paid From</th>
                <th className="py-4 px-6 text-right" style={{width:'80px'}}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
                      <span>Loading office expenses...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map((exp, idx) => {
                  return (
                    <tr key={exp._id} className="hover:bg-white/[0.015] transition-colors">
                      {/* NO. */}
                      <td className="py-4 px-6 font-mono text-xs text-zinc-500 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-semibold text-white text-sm truncate">
                          {exp.title}
                        </div>
                      </td>
                      {/* DATE */}
                      <td className="py-4 px-6 whitespace-nowrap font-medium text-xs text-zinc-300">
                        {formatDate(exp.expenseDate)}
                      </td>

                     

                      {/* MONEY (Bold Orange) */}
                      <td className="py-4 px-6 font-mono text-sm font-bold text-[#FF5A1F] whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </td>

                      <td className="py-4 px-6 text-xs text-zinc-300"><span className="rounded-lg bg-white/[0.05] px-2.5 py-1.5">{exp.paymentMethod === 'cash' ? 'Cash' : ['bank_transfer', 'upi', 'cheque'].includes(exp.paymentMethod) ? 'Bank' : 'Unclassified'}</span></td>
                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp._id, exp.title)}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-[#FF5A1F] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      type="payments"
                      title={selectedMonth !== 'all' ? `No expenses in ${selectedMonthLabel}` : 'No office expenses recorded'}
                      description="Click '+ Add Expense' to record office rent, bills, supplies, and utilities."
                      actionLabel="Add Expense"
                      onAction={openAddModal}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL (Strictly Orange, White & Dark Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0d0e14] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center">
                  <WalletCards className="w-4 h-4 text-[#FF5A1F]" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingExpense ? 'Edit Office Expense' : 'Add Office Expense'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form - ONLY Date, Expense Name, and Money */}
            <form onSubmit={handleSubmit} className="space-y-4">
                 
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Expense Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent, Electricity, Tea, Snacks"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#13151f] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                />
              </div>
              {/* 1. Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <CustomDatePicker
                  value={formData.expenseDate}
                  onChange={(val) => setFormData({ ...formData, expenseDate: val })}
                  placeholder="Select date"
                  required
                />
              </div>

           

              <div className="grid grid-cols-2 gap-3">
              {/* 3. Money (₹) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Money (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#FF5A1F]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-[#13151f] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 font-mono font-semibold focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Paid From *</label>
                <CustomSelect value={formData.paymentMethod} onChange={(value) => setFormData({ ...formData, paymentMethod: value })} placeholder="Select Bank / Cash" options={[
                  { value: 'bank_transfer', label: 'Bank' }, { value: 'cash', label: 'Cash' },
                  ...(['upi', 'cheque', 'other'].includes(editingExpense?.paymentMethod || '') ? [{ value: editingExpense!.paymentMethod, label: editingExpense!.paymentMethod === 'other' ? 'Other (unclassified)' : 'Bank (' + editingExpense!.paymentMethod.toUpperCase() + ')' }] : []),
                ]} />
              </div>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF5A1F] hover:bg-[#e04810] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
