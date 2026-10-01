import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Clock, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in max-w-5xl">
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
              <h1 className="page-title text-2xl font-extrabold text-white tracking-tight">
                {project.projectName || project.title}
              </h1>
              
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

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Your Commission Pool */}
        <div className="premium-card p-5 rounded-2xl space-y-1 border-[#FF5A1F]/20">
          <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">YOUR COMMISSION</span>
          <p className="text-2xl font-extrabold font-mono text-[#FF5A1F] tracking-tight">
            {formatINR(poolTotal)}
          </p>
          <span className="text-[10px] text-zinc-500 block">Total allocated share</span>
        </div>

        {/* Start Date */}
        <div className="premium-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">START DATE</span>
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="text-base font-semibold text-white">
            {project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN') : 'Not set'}
          </p>
          <span className="text-[10px] text-zinc-500 block">Production launch</span>
        </div>

        {/* Delivery Deadline */}
        <div className="premium-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">DELIVERY DEADLINE</span>
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="text-base font-semibold text-white">
            {project.deadline || project.endDate ? new Date(project.deadline || project.endDate).toLocaleDateString('en-IN') : 'Ongoing'}
          </p>
          <span className="text-[10px] text-zinc-500 block">Target completion</span>
        </div>

        {/* Current Status */}
        <div className="premium-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">CURRENT PHASE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="text-base font-semibold text-white capitalize">
            {(project.status || 'start_process').replace('_', ' ')}
          </p>
          <span className="text-[10px] text-zinc-500 block">Workflow status</span>
        </div>
      </div>

      {/* Project Description Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF5A1F]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Project Description & Brief
            </h2>
          </div>
          {project.description && (
            <span className="text-[11px] text-zinc-500 font-mono">
              Brief details
            </span>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-[#08090d] border border-white/[0.08] shadow-sm">
          {project.description ? (
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
              {project.description}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-zinc-500 italic font-mono">
                No description or brief provided for this project.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
