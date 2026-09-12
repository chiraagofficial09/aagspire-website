import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';

export const EmployeeProjects: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Error fetching employee projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await api.patch(`/employee/projects/${projectId}/status`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    }
  };

  const filtered = projects.filter((item) => {
    const term = search.toLowerCase();
    const prj = item.projectId || item;
    return (
      (prj.title || prj.projectName)?.toLowerCase().includes(term) ||
      prj.projectCode?.toLowerCase().includes(term) ||
      (prj.clientId?.name || prj.clientId?.companyName)?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Projects</h1>
        <p className="text-xs text-zinc-400 mt-1">Creative productions and briefs where you are an authorized contributor.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
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
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PAID</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PENDING</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading assigned projects...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => {
                  const prj = item.projectId || item;
                  const pool = item.employeeCommission || {};
                  const poolTotal = pool.totalCommission ?? pool.expectedCommission ?? 0;
                  const poolPaid = pool.paidCommission ?? 0;
                  const poolPending = pool.pendingCommission ?? Math.max(0, poolTotal - poolPaid);

                  return (
                    <tr key={item._id || prj._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white text-sm block">{prj.title || prj.projectName}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-zinc-300">
                        {prj.clientId?.companyName || prj.clientId?.name || 'Client Production'}
                      </td>
                      <td className="py-4 px-6 font-mono text-sm font-semibold text-white">
                        {formatINR(poolTotal)}
                      </td>
                      <td className="py-4 px-6 font-mono text-sm font-semibold text-white">
                        {formatINR(poolPaid)}
                      </td>
                      <td className="py-4 px-6 font-mono text-sm font-semibold text-[#FF5A1F]">
                        {formatINR(poolPending)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-36">
                          <CustomSelect
                            value={prj.status}
                            onChange={(val) => handleStatusChange(prj._id, val)}
                            options={[
                              { value: 'confirmed', label: 'Confirmed' },
                              { value: 'in_progress', label: 'In Progress' },
                              { value: 'review', label: 'In Review' },
                              { value: 'completed', label: 'Completed' },
                              { value: 'delivered', label: 'Delivered' },
                            ]}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/employee/projects/${prj._id}`}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
                        >
                          <span>View</span>
                          <span className="text-zinc-400">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No assigned projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
      </div>
    </div>
  );
};
