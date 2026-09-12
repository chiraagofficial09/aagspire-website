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

export const AdminClients: React.FC = () => {
  const toast = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/clients');
      setClients(res.data.data || res.data.clients || []);
    } catch (err) {
      console.error('Error loading clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

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
    setEditingClient(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingClient(c);
    setFormData({
      name: c.companyName || c.name || '',
      contactPerson: c.contactPerson || c.contactName || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      taxId: c.gstNumber || c.taxId || '',
    });
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        companyName: formData.name,
        gstNumber: formData.taxId,
      };

      if (editingClient) {
        await api.patch(`/admin/clients/${editingClient._id}`, payload);
        toast.success('Client updated successfully');
      } else {
        await api.post('/admin/clients', payload);
        toast.success('Client created successfully');
      }

      setIsModalOpen(false);
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    }
  };

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.companyName?.toLowerCase().includes(term) ||
      c.clientCode?.toLowerCase().includes(term) ||
      c.contactPerson?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Clients</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage client accounts, contract values, and payment balances.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search clients..."
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
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CONTACT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECTS</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PAID</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PENDING</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading clients...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((client) => {
                  const displayName = client.companyName || client.name;
                  const count = client.projectsCount || client.projects?.length || 0;
                  const totalContract = Number(
                    client.totalContractValue ??
                    client.totalBusinessValue ??
                    client.financials?.totalContractValue ??
                    0
                  );
                  const balanceDue = Number(
                    client.outstanding ??
                    client.pendingPayment ??
                    client.financials?.outstanding ??
                    0
                  );
                  const totalPaid = Number(
                    client.totalPaid ??
                    client.paymentsReceived ??
                    client.financials?.totalPaid ??
                    Math.max(0, totalContract - balanceDue)
                  );

                  return (
                    <tr key={client._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white text-sm">{displayName}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="text-sm text-zinc-300 font-medium">{client.contactPerson || '-'}</div>
                          {client.phone && (
                            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{client.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                          {count} {count === 1 ? 'deal' : 'deals'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold font-mono text-white">
                          {formatINR(totalContract)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold font-mono text-white/80">
                          {formatINR(totalPaid)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-sm font-semibold font-mono ${balanceDue > 0 ? 'text-[#FF5A1F]' : 'text-emerald-400'}`}>
                          {formatINR(balanceDue)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <Link
                            to={`/admin/clients/${client._id}`}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
                          >
                            <span>View</span>
                            <span className="text-zinc-400">→</span>
                          </Link>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                if (activeMenuId === client._id) {
                                  setActiveMenuId(null);
                                } else {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
                                  setActiveMenuId(client._id);
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
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed-position Dropdown Action Menu */}
      {activeMenuId && (() => {
        const activeClient = filtered.find((c) => c._id === activeMenuId);
        if (!activeClient) return null;
        const displayName = activeClient.companyName || activeClient.name;
        return (
          <div
            ref={menuRef}
            className="fixed w-32 bg-[#12131a] border border-white/[0.08] rounded-xl shadow-xl py-1 z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => openEditModal(activeClient)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-zinc-400" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleDelete(activeClient._id, displayName)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        );
      })()}

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
      </div>

      {/* Modal with all features preserved */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="font-bold text-base tracking-tight text-white">
                  {editingClient ? 'Edit Client' : 'New Client'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jyotnar Natural Foods"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Malhotra"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@brand.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Office Address</label>
                <textarea
                  rows={2}
                  placeholder="Office address, City, PIN..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
