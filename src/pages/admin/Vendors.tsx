import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, X, MoreVertical, Layers, Clock, Wallet, Hourglass, Link2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { useAlert } from '../../context/AlertContext';
import { formatINR } from '../../utils/formatters';
import { EmptyState } from '../../components/work/EmptyState';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';
import { CustomSelect } from '../../components/work/CustomSelect';

const emptyForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  notes: '',
};

export const vendorDisplayName = (v: any) => v?.companyName || v?.name || '';

export const AdminVendors: React.FC = () => {
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [vendors, setVendors] = useState<any[]>([]);
  const [totals, setTotals] = useState({ total: 0, previousPending: 0, paid: 0, pending: 0 });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 'client' = pick one of our existing clients, 'new' = someone who is not our client
  const [source, setSource] = useState<'client' | 'new'>('new');
  const [linkClientId, setLinkClientId] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const availableMonths: MonthOption[] = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys.map((key) => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }) };
    });
  }, [now]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const [yr, mo] = selectedMonth.split('-').map(Number);
    return new Date(yr, mo - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  const fetchVendors = async (monthVal = selectedMonth) => {
    try {
      setLoading(true);
      const qs = monthVal && monthVal !== 'all' ? `?month=${monthVal}` : '';
      const res = await api.get(`/admin/vendors${qs}`);
      setVendors(res.data.data || res.data.vendors || []);
      setTotals(res.data.totals || { total: 0, previousPending: 0, paid: 0, pending: 0 });
    } catch (err) {
      console.error('Error loading vendors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    api
      .get('/admin/clients')
      .then((res) => setClients(res.data.data || res.data.clients || []))
      .catch(() => {});
  }, []);

  // Close popup menu on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    const handleScroll = () => setActiveMenuId(null);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const linkedClientIds = useMemo(
    () => new Set(vendors.map((v) => String(v.clientId || '')).filter(Boolean)),
    [vendors]
  );

  const clientOptions = (allowId?: string) =>
    clients
      .filter((c) => !linkedClientIds.has(String(c._id)) || String(c._id) === allowId)
      .map((c) => ({ value: String(c._id), label: c.companyName || c.name, sublabel: c.clientCode }));

  const openCreateModal = () => {
    setEditingVendor(null);
    setSource('new');
    setLinkClientId('');
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (v: any) => {
    setEditingVendor(v);
    setLinkClientId(v.clientId ? String(v.clientId) : '');
    setFormData({
      name: vendorDisplayName(v),
      contactPerson: v.contactPerson || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      taxId: v.gstNumber || '',
      notes: v.notes || '',
    });
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingVendor) {
        await api.patch(`/admin/vendors/${editingVendor._id}`, {
          ...formData,
          companyName: formData.name,
          gstNumber: formData.taxId,
          clientId: linkClientId || null,
        });
        toast.success('Vendor updated successfully');
      } else if (source === 'client') {
        if (!linkClientId) {
          toast.error('Please select a client');
          return;
        }
        await api.post('/admin/vendors', { clientId: linkClientId, notes: formData.notes });
        toast.success('Client added as vendor');
      } else {
        await api.post('/admin/vendors', { ...formData, companyName: formData.name, gstNumber: formData.taxId });
        toast.success('Vendor created successfully');
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v: any) => {
    setActiveMenuId(null);
    const confirmed = await showConfirm({
      title: 'Delete Vendor',
      message: `Are you sure you want to delete "${vendorDisplayName(v)}"? All its projects and payments will be removed${
        v.clientId ? ', and its adjustments will be removed from the client bill' : ''
      }.`,
      confirmText: 'Okay',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/vendors/${v._id}`);
      toast.success('Vendor deleted successfully');
      fetchVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const filtered = vendors.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      v.companyName?.toLowerCase().includes(term) ||
      v.vendorCode?.toLowerCase().includes(term) ||
      v.contactPerson?.toLowerCase().includes(term) ||
      v.phone?.toLowerCase().includes(term)
    );
  });

  const columnLabel = (base: string) =>
    selectedMonth === 'all'
      ? `TOTAL ${base}`.replace('TOTAL TOTAL', 'TOTAL')
      : selectedMonth === currentMonthKey
      ? `THIS MONTH ${base}`
      : `${selectedMonthLabel.toUpperCase()} ${base}`;

  const cards = [
    { label: 'Total', value: totals.total, icon: Layers },
    { label: 'Previous Month Pending', value: totals.previousPending, icon: Clock },
    { label: 'Paid', value: totals.paid, icon: Wallet },
    { label: 'Pending (To Pay)', value: totals.pending, icon: Hourglass },
  ];

  const inputClass =
    'w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Vendors</h1>
          <p className="text-xs text-zinc-400 mt-1">Track work done for us by vendors and what we still have to pay them.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Vendor</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl border border-white/5 bg-[#0c0d12] flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-white/50">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-[#FF5A1F] break-words">
              {loading ? '...' : formatINR(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="flex items-center w-full sm:w-auto">
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-full sm:w-44"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 pl-6 pr-4 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase min-w-[240px]">VENDOR</th>
                <th className="py-4 pl-8 pr-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase min-w-[200px]">CONTACT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase whitespace-nowrap">{columnLabel('TOTAL')}</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase whitespace-nowrap">{columnLabel('PAID')}</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase whitespace-nowrap">PENDING</th>
                <th className="py-4 pl-4 pr-6 text-right w-[110px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading vendors...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 pl-6 pr-4 min-w-[240px] max-w-[300px]">
                      <div className="font-semibold text-white text-sm line-clamp-2 leading-snug break-words" title={vendorDisplayName(v)}>
                        {vendorDisplayName(v)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 font-mono">{v.vendorCode}</span>
                        {v.clientId && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30"
                            title="Also our client: payable is auto-deducted in their bill"
                          >
                            <Link2 className="w-2.5 h-2.5" /> CLIENT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pl-8 pr-6 min-w-[200px]">
                      {v.contactPerson || v.phone || v.email ? (
                        <>
                          <div className="text-sm text-zinc-300 font-medium">{v.contactPerson || v.phone || v.email}</div>
                          {v.contactPerson && v.phone && <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{v.phone}</div>}
                        </>
                      ) : (
                        <div className="text-sm text-zinc-500 font-mono">-</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold font-mono text-[#FF5A1F]">{formatINR(v.summary?.total || 0)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold font-mono text-white/80">{formatINR(v.summary?.paid || 0)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold font-mono text-white">{formatINR(v.summary?.pending || 0)}</span>
                    </td>
                    <td className="py-4 pl-4 pr-6 text-right w-[110px]">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/vendors/${v._id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <span>View</span>
                          <span className="text-white/90">→</span>
                        </Link>
                        <button
                          onClick={(e) => {
                            if (activeMenuId === v._id) {
                              setActiveMenuId(null);
                              return;
                            }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const menuHeight = 90;
                            const menuWidth = 144;
                            const flipUp = window.innerHeight - rect.bottom < menuHeight && rect.top >= menuHeight;
                            setMenuPos({
                              top: flipUp
                                ? Math.max(8, rect.top - menuHeight - 4)
                                : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 4),
                              left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)),
                            });
                            setActiveMenuId(v._id);
                          }}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="No vendors yet"
                      description="Add the vendors you get work done from (printing, banners, frames...) to track what you owe them."
                      actionLabel="Add First Vendor"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed-position Dropdown Action Menu */}
      {activeMenuId && (() => {
        const active = filtered.find((v) => v._id === activeMenuId);
        if (!active) return null;
        return (
          <div
            ref={menuRef}
            className="fixed w-36 bg-[#12131a] border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => openEditModal(active)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-zinc-400" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleDelete(active)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        );
      })()}

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-8 space-y-5 text-white text-xs my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-bold text-base tracking-tight text-white">{editingVendor ? 'Edit Vendor' : 'New Vendor'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingVendor && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#12131a] border border-white/[0.06]">
                {([
                  ['new', 'New Vendor'],
                  ['client', 'From Existing Client'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSource(key)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      source === key ? 'bg-[#FF5A1F] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {!editingVendor && source === 'client' ? (
                <>
                  <div>
                    <label className="text-zinc-400 block mb-1.5 font-medium">Select Client *</label>
                    <CustomSelect
                      value={linkClientId}
                      onChange={(val) => setLinkClientId(String(val))}
                      options={clientOptions()}
                      placeholder="Choose a client"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Client details are copied to the vendor. Whatever we owe this vendor is automatically deducted in their client bill.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-zinc-400 block mb-1.5 font-medium">Vendor / Business Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shree Printers"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1.5 font-medium">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1.5 font-medium">Phone</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 00000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1.5 font-medium">Email</label>
                      <input
                        type="email"
                        placeholder="contact@vendor.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1.5 font-medium">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      placeholder="27ABCDE1234F1Z5"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1.5 font-medium">Address</label>
                    <textarea
                      rows={2}
                      placeholder="Address, City, PIN..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  {editingVendor && (
                    <div>
                      <label className="text-zinc-400 block mb-1.5 font-medium">Linked Client</label>
                      <CustomSelect
                        value={linkClientId}
                        onChange={(val) => setLinkClientId(String(val))}
                        options={[
                          { value: '', label: 'Not our client' },
                          ...clientOptions(editingVendor.clientId ? String(editingVendor.clientId) : undefined),
                        ]}
                      />
                      <p className="text-[11px] text-zinc-500 mt-1.5">
                        When linked, unpaid amounts are automatically deducted in that client's bill.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Notes</label>
                <textarea
                  rows={2}
                  placeholder="What do we get from this vendor?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
