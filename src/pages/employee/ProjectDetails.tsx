import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';

export const EmployeeProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [project, setProject] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [employeeCommission, setEmployeeCommission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employee/projects/${id}`);
      const payload = res.data.data || res.data;
      setProject(payload?.project || payload);
      setAssignment(payload?.assignment || null);
      setEmployeeCommission(payload?.employeeCommission || null);
    } catch (err) {
      console.error('Error fetching project details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await api.patch(`/employee/projects/${id}/status`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      setProject((prev: any) => ({ ...prev, status: newStatus }));
      fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-white/50 font-mono">Project not found.</div>;

  const poolTotal =
    employeeCommission?.totalCommission ??
    employeeCommission?.expectedCommission ??
    assignment?.allocatedCommission ??
    0;
  const sharePercent = employeeCommission?.sharePercent ?? assignment?.sharePercent ?? assignment?.sharePercentage;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/employee/projects"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title text-2xl font-extrabold text-white tracking-tight">{project.projectName || project.title}</h1>
            </div>
            <p className="page-subtitle text-xs text-white/50 font-mono mt-0.5">
              Client: {project.clientId?.companyName || project.clientId?.name || 'Aagspire Partner'} &bull; Role: {employeeCommission?.roleInProject || assignment?.roleInProject || 'Creator'}
              {sharePercent != null && (
                <span> &bull; Your pool: {sharePercent}%</span>
              )}
            </p>
          </div>
        </div>

        {/* Project Status Selector for Employee */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-[#0d0e14] border border-white/[0.08] p-1.5 rounded-xl">
          <span className="text-[11px] font-mono uppercase text-zinc-400 pl-2">Status:</span>
          <div className="w-38">
            <CustomSelect
              value={project.status}
              onChange={handleStatusChange}
              disabled={updatingStatus}
              options={[
                { value: 'start_process', label: 'Start Process' },
                { value: 'in_process', label: 'In Process' },
                { value: 'in_changes', label: 'In Changes' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Your Commission Pool — Total only */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider font-mono">Your Commission Pool</h2>
        <div className="inline-block">
          <div className="premium-card p-5 rounded-2xl space-y-1 border-[#FF5A1F]/20 min-w-[180px]">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">TOTAL</span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FF5A1F] tracking-tight">
              {formatINR(poolTotal)}
            </p>
            <span className="text-[10px] text-zinc-500 block">Your total commission</span>
          </div>
        </div>
      </div>

    </div>
  );
};
