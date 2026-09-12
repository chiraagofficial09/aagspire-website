import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { MultiSelect } from './MultiSelect';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any | null;
  clients: any[];
  employees: any[];
  onSuccess: (project?: any) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project = null,
  clients,
  employees,
  onSuccess,
}) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    totalAmount: '',
    assignedEmployees: [] as string[],
    startDate: '',
    endDate: '',
    status: 'in_progress',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      const clientId =
        typeof project.clientId === 'object' && project.clientId?._id
          ? project.clientId._id
          : typeof project.clientId === 'string'
          ? project.clientId
          : '';

      const assignedEmployees = (project.assignedEmployees || []).map((e: any) =>
        typeof e === 'object' && e?._id ? e._id : String(e)
      );

      const startDate = project.startDate
        ? new Date(project.startDate).toISOString().slice(0, 10)
        : '';

      const endDate = project.deadline
        ? new Date(project.deadline).toISOString().slice(0, 10)
        : project.endDate
        ? new Date(project.endDate).toISOString().slice(0, 10)
        : '';

      const val = project.projectValue ?? project.totalAmount ?? '';

      setFormData({
        title: project.projectName || project.title || '',
        clientId,
        totalAmount: val !== '' && val !== null && val !== undefined ? String(val) : '',
        assignedEmployees,
        startDate,
        endDate,
        status: project.status || 'in_progress',
        description: project.description || '',
      });
    } else {
      setFormData({
        title: '',
        clientId: clients[0]?._id || '',
        totalAmount: '',
        assignedEmployees: [],
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        status: 'in_progress',
        description: '',
      });
    }
  }, [isOpen, project, clients]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!formData.clientId) {
      toast.error('Please select a client');
      return;
    }

    try {
      setSubmitting(true);
      const grossVal = Number(formData.totalAmount) || 0;

      const payload = {
        projectName: formData.title.trim(),
        title: formData.title.trim(),
        clientId: formData.clientId,
        totalAmount: grossVal,
        projectValue: grossVal,
        discountPercent: 0,
        discountAmount: 0,
        assignedEmployees: formData.assignedEmployees,
        startDate: formData.startDate || undefined,
        deadline: formData.endDate || undefined,
        endDate: formData.endDate || undefined,
        status: formData.status,
        description: formData.description.trim(),
      };

      if (project && project._id) {
        const res = await api.patch(`/admin/projects/${project._id}`, payload);
        toast.success('Project updated successfully');
        onSuccess(res.data.project || res.data.data || res.data);
      } else {
        const res = await api.post('/admin/projects', payload);
        toast.success('Project created and assigned successfully');
        onSuccess(res.data.project || res.data.data || res.data);
      }

      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="font-bold text-base tracking-tight text-white">
              {project ? 'Edit Project' : 'New Project'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jyotnar Brand Identity"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Client *</label>
              <CustomSelect
                value={formData.clientId}
                onChange={(val) => setFormData({ ...formData, clientId: val })}
                placeholder="Select client"
                options={clients.map((c) => ({
                  value: c._id,
                  label: c.name || c.companyName,
                }))}
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Contract Value (₹) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 100000"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
              />
            </div>
          </div>

          {/* Assigned Employees Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Assign Team / Staff</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                Select one or more employees
              </span>
            </div>
            <MultiSelect
              values={formData.assignedEmployees}
              onChange={(vals) => setFormData({ ...formData, assignedEmployees: vals })}
              placeholder="Select employees to assign..."
              options={employees.map((emp) => ({
                value: emp._id,
                label: emp.fullName || emp.name,
                sublabel: emp.employeeCode ? `(${emp.employeeCode})` : undefined,
              }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Start Date</label>
              <CustomDatePicker
                value={formData.startDate}
                onChange={(val) => setFormData({ ...formData, startDate: val })}
                placeholder="Select start date"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Target End Date</label>
              <CustomDatePicker
                value={formData.endDate}
                onChange={(val) => setFormData({ ...formData, endDate: val })}
                placeholder="Select end date"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                options={[
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'review', label: 'In Review' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'signed', label: 'Signed' },
                  { value: 'lead', label: 'Lead' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Description / Scope</label>
            <textarea
              rows={2}
              placeholder="Creative deliverables, production guidelines..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
            >
              {submitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
