import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  MoreVertical,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';

export const AdminEmployees: React.FC = () => {
  const toast = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: 'Creative Producer',
    joiningDate: new Date().toISOString().slice(0, 10),
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: '',
      panNumber: '',
    },
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/employees');
      setEmployees(res.data.data || []);
    } catch (err: any) {
      console.error('Error fetching employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Close popup menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      designation: 'Creative Producer',
      joiningDate: new Date().toISOString().slice(0, 10),
      bankDetails: {
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        upiId: '',
        panNumber: '',
      },
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    const dateStr = emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : '';
    setFormData({
      name: emp.fullName || emp.name || '',
      email: emp.email || '',
      password: '',
      phone: emp.phone || '',
      designation: emp.designation || 'Creative Producer',
      joiningDate: dateStr,
      bankDetails: {
        accountNumber: emp.bankDetails?.accountNumber || '',
        ifscCode: emp.bankDetails?.ifscCode || '',
        bankName: emp.bankDetails?.bankName || '',
        upiId: emp.bankDetails?.upiId || emp.upiId || '',
        panNumber: emp.bankDetails?.panNumber || '',
      },
    });
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload: any = {
        ...formData,
        fullName: formData.name,
      };
      if (editingEmployee && !payload.password) {
        delete payload.password;
      }

      if (editingEmployee) {
        await api.patch(`/admin/employees/${editingEmployee._id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/admin/employees', payload);
        toast.success('Employee created successfully');
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to delete "${name}"? This removes their account and assignments.`)) {
      return;
    }
    try {
      await api.delete(`/admin/employees/${id}`);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const filtered = employees.filter((emp) => {
    const term = search.toLowerCase();
    const displayName = emp.fullName || emp.name || '';
    return (
      displayName.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term) ||
      emp.employeeCode?.toLowerCase().includes(term) ||
      emp.designation?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employees</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage your team members and roles.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">EMPLOYEE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ROLE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">EMAIL</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">EARNED</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading employees...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((emp) => {
                  const displayName = emp.fullName || emp.name;
                  const earned = emp.earnings?.totalEarned || 0;
                  return (
                    <tr key={emp._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-200">
                            {displayName ? displayName[0].toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{displayName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-zinc-300">{emp.designation || 'Staff'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-zinc-400">{emp.email}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-white">{formatINR(earned)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-ember/10 text-ember border-ember/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <Link
                            to={`/admin/employees/${emp._id}`}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
                          >
                            <span>View</span>
                            <span className="text-zinc-400">→</span>
                          </Link>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                if (activeMenuId === emp._id) {
                                  setActiveMenuId(null);
                                } else {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
                                  setActiveMenuId(emp._id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed-position Dropdown Action Menu */}
      {activeMenuId && (() => {
        const activeEmp = filtered.find((e) => e._id === activeMenuId);
        if (!activeEmp) return null;
        const displayName = activeEmp.fullName || activeEmp.name;
        return (
          <div
            ref={menuRef}
            className="fixed w-32 bg-[#12131a] border border-white/[0.08] rounded-xl shadow-xl py-1 z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => openEditModal(activeEmp)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-zinc-400" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleDelete(activeEmp._id, displayName)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        );
      })()}

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'employee' : 'employees'}
      </div>

      {/* Modal with all features intact */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-bold text-base tracking-tight text-white">
                {editingEmployee ? 'Edit Employee' : 'New Employee'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@aagspire.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">
                    {editingEmployee ? 'Password (leave blank to keep)' : 'Initial Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Role / Designation</label>
                  <input
                    type="text"
                    placeholder="Creative Producer"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Bank details */}
              <div className="p-3.5 rounded-xl bg-[#0e0f16] border border-white/[0.06] space-y-3">
                <span className="font-medium text-white block text-xs">Disbursement Bank & UPI</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                    className="px-3 py-2 bg-[#141520] border border-white/[0.08] rounded-lg text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value } })}
                    className="px-3 py-2 bg-[#141520] border border-white/[0.08] rounded-lg text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="UPI ID (e.g. name@okhdfcbank)"
                    value={formData.bankDetails.upiId}
                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, upiId: e.target.value } })}
                    className="px-3 py-2 bg-[#141520] border border-white/[0.08] rounded-lg text-white focus:border-[#FF5A1F] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.bankDetails.bankName}
                    onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                    className="px-3 py-2 bg-[#141520] border border-white/[0.08] rounded-lg text-white focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
