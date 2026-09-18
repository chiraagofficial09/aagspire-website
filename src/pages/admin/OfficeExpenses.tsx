import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  WalletCards,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { EmptyState } from '../../components/work/EmptyState';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';

interface ExpenseItem {
  _id: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  notes?: string;
  createdAt: string;
}

interface MonthBreakdownItem {
  monthKey: string;
  totalAmount: number;
  count: number;
}

export const AdminOfficeExpenses: React.FC = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [overallTotal, setOverallTotal] = useState<number>(0);
  const [thisMonthTotal, setThisMonthTotal] = useState<number>(0);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const previousMonthKey = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [now]);

  const currentMonthLabel = useMemo(() => {
    return now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [now]);

  const previousMonthLabel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [now]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const availableMonths: MonthOption[] = useMemo(() => {
    const monthsSet = new Set<string>();
    // Include last 24 months for extensive historical and month-wise viewing
    for (let i = 0; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        return {
          key,
          label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        };
      });
  }, [now]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const d = new Date(yr, mo - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  const fetchExpenses = async (monthVal = selectedMonth, searchVal = search) => {
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
      if (res.data.success) {
        setExpenses(res.data.data || []);
        setOverallTotal(res.data.overallTotal || 0);
        setThisMonthTotal(res.data.thisMonthTotal || 0);
        setFilteredTotal(res.data.filteredTotal || 0);
        setMonthlyBreakdown(res.data.monthlyBreakdown || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch office expenses', err);
      toast.error('Failed to load office expenses');
    } finally {
      setLoading(false);
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
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingExpense(item);
    const dateStr = item.expenseDate
      ? new Date(item.expenseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setFormData({
      title: item.title,
      amount: String(item.amount),
      expenseDate: dateStr,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete expense "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/expenses/${id}`);
      toast.success('Office expense deleted successfully');
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
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) {
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
        });
        toast.success('Office expense updated');
      } else {
        await api.post('/admin/expenses', {
          title: formData.title.trim(),
          amount: num,
          expenseDate: formData.expenseDate,
        });
        toast.success('Office expense added');
      }
      setIsModalOpen(false);
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
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Office Expenses</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track, record, and calculate operational and office expenses.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Simple Month Filter at the Top */}
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-full sm:w-48"
          />
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* SUMMARY METRIC (Strictly Orange, White & Dark Palette) */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {selectedMonth === 'all'
              ? 'All Months Office Expense'
              : selectedMonth === currentMonthKey
              ? 'This Month Office Expense'
              : selectedMonth === previousMonthKey
              ? 'Previous Month Office Expense'
              : `${selectedMonthLabel} Office Expense`}
          </span>
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatINR(selectedMonth === 'all' ? overallTotal : filteredTotal)}
          </div>
        </div>
      
      </div>

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

      {/* Active Month Filter Notification Banner */}
      {selectedMonth !== 'all' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#111218] border border-[#FF5A1F]/20 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-zinc-300">
              Showing expenses for <span className="font-semibold text-white">{selectedMonthLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className="text-xs text-[#FF5A1F] hover:text-[#ff7847] hover:underline font-medium cursor-pointer"
          >
            Show All Months
          </button>
        </div>
      )}

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
                <th className="py-4 px-6 text-right" style={{width:'80px'}}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading office expenses...
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
                  <td colSpan={5} className="py-8">
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
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#13151f] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                />
              </div>

           

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
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-[#13151f] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 font-mono font-semibold focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                  />
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
