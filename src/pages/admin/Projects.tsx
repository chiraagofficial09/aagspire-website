import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Square,
  X,
  Users,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  IndianRupee,
  PieChart,
  FileText,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { useAlert } from '../../context/AlertContext';
import { CustomSelect } from '../../components/work/CustomSelect';
import { ProjectModal } from '../../components/work/ProjectModal';
import { BulkCreateProjectsModal } from '../../components/work/BulkCreateProjectsModal';
import { EmptyState } from '../../components/work/EmptyState';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';

export const AdminProjects: React.FC = () => {
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── Multi-select state ──────────────────────────────────────────
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkSelectedStaff, setBulkSelectedStaff] = useState<Set<string>>(new Set());
  const [bulkStaffFilter, setBulkStaffFilter] = useState('');
  const [bulkClientOpen, setBulkClientOpen] = useState(false);

  const [bulkStartDateOpen, setBulkStartDateOpen] = useState(false);
  const [bulkStartCalMonth, setBulkStartCalMonth] = useState(() => now.getMonth());
  const [bulkStartCalYear, setBulkStartCalYear] = useState(() => now.getFullYear());
  const bulkStartDateRef = useRef<HTMLDivElement>(null);

  const [bulkDeadlineOpen, setBulkDeadlineOpen] = useState(false);
  const [bulkCalMonth, setBulkCalMonth] = useState(() => now.getMonth());
  const [bulkCalYear, setBulkCalYear] = useState(() => now.getFullYear());
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkStatusRef = useRef<HTMLDivElement>(null);
  const bulkAssignRef = useRef<HTMLDivElement>(null);
  const bulkClientRef = useRef<HTMLDivElement>(null);
  const bulkDeadlineRef = useRef<HTMLDivElement>(null);

  const [bulkValueOpen, setBulkValueOpen] = useState(false);
  const [bulkValueInput, setBulkValueInput] = useState('');
  const bulkValueRef = useRef<HTMLDivElement>(null);

  const [bulkSplitOpen, setBulkSplitOpen] = useState(false);
  const [bulkSplit, setBulkSplit] = useState({
    brokerPercent: 10,
    employeePercent: 40,
    officePercent: 10,
    adminPercent: 35,
    settlementPercent: 5,
  });
  const bulkSplitRef = useRef<HTMLDivElement>(null);

  const [bulkDescOpen, setBulkDescOpen] = useState(false);
  const [bulkDescInput, setBulkDescInput] = useState('');
  const bulkDescRef = useRef<HTMLDivElement>(null);

  const splitTotal = useMemo(() => {
    return (
      Number(bulkSplit.brokerPercent || 0) +
      Number(bulkSplit.employeePercent || 0) +
      Number(bulkSplit.officePercent || 0) +
      Number(bulkSplit.adminPercent || 0) +
      Number(bulkSplit.settlementPercent || 0)
    );
  }, [bulkSplit]);

  const filteredEmployeesForBulk = useMemo(() => {
    if (!bulkStaffFilter.trim()) return employees;
    const q = bulkStaffFilter.toLowerCase();
    return employees.filter((e) => {
      const name = (e.fullName || e.name || '').toLowerCase();
      const code = (e.employeeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [employees, bulkStaffFilter]);

  const bulkTodayYMD = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const bulkTomorrowYMD = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const bulkNextWeekYMD = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const calendarMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const calendarWeekdayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const buildCalendarCells = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      ymd: string;
    }> = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        ymd: `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        ymd: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Next month leading days
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          dayNumber: d,
          isCurrentMonth: false,
          ymd: `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        });
      }
    }

    return cells;
  };

  const bulkCalendarCells = useMemo(() => {
    return buildCalendarCells(bulkCalYear, bulkCalMonth);
  }, [bulkCalYear, bulkCalMonth]);

  const bulkStartCalendarCells = useMemo(() => {
    return buildCalendarCells(bulkStartCalYear, bulkStartCalMonth);
  }, [bulkStartCalYear, bulkStartCalMonth]);

  const availableMonths: MonthOption[] = useMemo(() => {
    const monthsSet = new Set<string>();
    for (let i = 0; i <= 6; i++) {
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

  const fetchAll = async (monthVal = selectedMonth) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (monthVal && monthVal !== 'all') {
        params.append('month', monthVal);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [prjRes, cliRes, empRes] = await Promise.all([
        api.get(`/admin/projects${qs}`),
        api.get('/admin/clients'),
        api.get('/admin/employees'),
      ]);
      setProjects(prjRes.data.data || prjRes.data.projects || []);
      setClients(cliRes.data.data || cliRes.data.clients || []);
      setEmployees(empRes.data.data || empRes.data.employees || []);
    } catch (err) {
      console.error('Error loading projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(selectedMonth);
  }, [selectedMonth]);

  // Close popup menu on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
      if (bulkStatusRef.current && !bulkStatusRef.current.contains(e.target as Node)) {
        setBulkStatusOpen(false);
      }
      if (bulkAssignRef.current && !bulkAssignRef.current.contains(e.target as Node)) {
        setBulkAssignOpen(false);
      }
      if (bulkClientRef.current && !bulkClientRef.current.contains(e.target as Node)) {
        setBulkClientOpen(false);
      }
      if (bulkStartDateRef.current && !bulkStartDateRef.current.contains(e.target as Node)) {
        setBulkStartDateOpen(false);
      }
      if (bulkDeadlineRef.current && !bulkDeadlineRef.current.contains(e.target as Node)) {
        setBulkDeadlineOpen(false);
      }
      if (bulkValueRef.current && !bulkValueRef.current.contains(e.target as Node)) {
        setBulkValueOpen(false);
      }
      if (bulkSplitRef.current && !bulkSplitRef.current.contains(e.target as Node)) {
        setBulkSplitOpen(false);
      }
      if (bulkDescRef.current && !bulkDescRef.current.contains(e.target as Node)) {
        setBulkDescOpen(false);
      }
    };
    const handleScroll = () => {
      setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prj: any) => {
    setEditingProject(prj);
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    setActiveMenuId(null);
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${name}"? All associated commissions, payments, and team links will be removed.`,
      confirmText: 'Okay',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await api.delete(`/admin/projects/${id}`);
      toast.success('Project deleted successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    // Optimistic UI update
    const nowIso = new Date().toISOString();
    const isFinished = newStatus === 'delivered';
    const deliveredAtVal = isFinished ? nowIso : undefined;
    setProjects((prev) =>
      prev.map((p) =>
        p._id === projectId
          ? {
            ...p,
            status: newStatus,
            updatedAt: nowIso,
            deliveredAt: deliveredAtVal,
          }
          : p
      )
    );
    try {
      await api.patch(`/admin/projects/${projectId}`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
      fetchAll();
    }
  };

  const filtered = projects.filter((p) => {
    const term = search.toLowerCase();
    const title = p.projectName || p.title || '';
    const clientName = p.clientId?.companyName || p.clientId?.name || '';
    const employeeMatch = (p.assignedEmployees || []).some((emp: any) => {
      const name = emp?.fullName || emp?.name || '';
      const code = emp?.employeeCode || '';
      return name.toLowerCase().includes(term) || code.toLowerCase().includes(term);
    });
    const matchesSearch =
      title.toLowerCase().includes(term) ||
      p.projectCode?.toLowerCase().includes(term) ||
      clientName.toLowerCase().includes(term) ||
      employeeMatch;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isDelivered = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'delivered';
  };

  // 1. Pending & In Progress Projects (shown at the very top)
  const pendingProjects = useMemo(() => {
    return filtered
      .filter((p) => !isDelivered(p.status))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [filtered]);

  // 2. Completed Projects grouped into Date Boxes (latest day on top, older below)
  const completedGroups = useMemo(() => {
    const completed = filtered.filter((p) => isDelivered(p.status));
    const groups = new Map<string, any[]>();

    completed.forEach((prj) => {
      const raw = prj.deliveredAt || prj.updatedAt || prj.createdAt;
      let dateKey = 'Unknown Date';
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(prj);
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return b.localeCompare(a); // Latest date first
    });

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    return sortedKeys.map((key) => {
      let label = key;
      if (key !== 'Unknown Date') {
        const [y, m, d] = key.split('-').map(Number);
        const formattedStr = `${d} ${months[m - 1]} ${y}`;
        if (key === todayKey) {
          label = `Today · ${formattedStr}`;
        } else if (key === yesterdayKey) {
          label = `Yesterday · ${formattedStr}`;
        } else {
          label = formattedStr;
        }
      }
      const list = groups.get(key)!;
      list.sort((a, b) => {
        const timeA = new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      return {
        dateKey: key,
        dateLabel: label,
        projects: list,
      };
    });
  }, [filtered]);

  const completedTotalCount = useMemo(
    () => completedGroups.reduce((acc, g) => acc + g.projects.length, 0),
    [completedGroups]
  );

  const shouldShowPendingSection = statusFilter === 'all' || !isDelivered(statusFilter);
  const shouldShowCompletedSection = statusFilter === 'all' || isDelivered(statusFilter);

  // ── Multi-select helpers ────────────────────────────────────────
  const allFilteredIds = useMemo(() => filtered.map((p) => p._id as string), [filtered]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkSelectedStaff(new Set());
    setBulkStaffFilter('');
    setIsSelectMode(false);
  };

  const closeAllBulkDropdowns = () => {
    setBulkStatusOpen(false);
    setBulkClientOpen(false);
    setBulkAssignOpen(false);
    setBulkStartDateOpen(false);
    setBulkDeadlineOpen(false);
    setBulkValueOpen(false);
    setBulkSplitOpen(false);
    setBulkDescOpen(false);
  };

  // Bulk status change
  const handleBulkStatus = async (newStatus: string) => {
    setBulkStatusOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', { ids: Array.from(selectedIds), status: newStatus });
      toast.success(`${selectedIds.size} project(s) updated to "${newStatus.replace('_', ' ')}"`);
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk assign employees (multiple or unassign)
  const handleBulkAssignEmployees = async (empIds: string[]) => {
    setBulkAssignOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', { ids: Array.from(selectedIds), assignedEmployees: empIds });
      if (empIds.length > 0) {
        toast.success(`${selectedIds.size} project(s) assigned to ${empIds.length} staff member${empIds.length > 1 ? 's' : ''}`);
      } else {
        toast.success(`${selectedIds.size} project(s) unassigned`);
      }
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk assign failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk change client
  const handleBulkClient = async (clientId: string) => {
    setBulkClientOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', { ids: Array.from(selectedIds), clientId });
      const client = clients.find((c) => c._id === clientId);
      toast.success(`${selectedIds.size} project(s) reassigned to ${client?.companyName || client?.name || 'client'}`);
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk client change failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set start date
  const handleBulkStartDate = async (dateStr: string) => {
    setBulkStartDateOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', {
        ids: Array.from(selectedIds),
        startDate: dateStr ? dateStr : null,
      });
      toast.success(
        dateStr
          ? `${selectedIds.size} project(s) start date set to ${dateStr}`
          : `${selectedIds.size} project(s) start date cleared`
      );
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk start date update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set deadline
  const handleBulkDeadline = async (dateStr: string) => {
    setBulkDeadlineOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', {
        ids: Array.from(selectedIds),
        deadline: dateStr ? dateStr : null,
      });
      toast.success(
        dateStr
          ? `${selectedIds.size} project(s) deadline set to ${dateStr}`
          : `${selectedIds.size} project(s) deadline cleared`
      );
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk deadline update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set contract value
  const handleBulkValue = async () => {
    const val = Number(bulkValueInput);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid contract value');
      return;
    }
    setBulkValueOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', {
        ids: Array.from(selectedIds),
        projectValue: val,
        resetDiscount: true,
      });
      toast.success(`${selectedIds.size} project(s) value updated to ${formatINR(val)}`);
      setBulkValueInput('');
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk value update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set commission split
  const handleBulkSplit = async () => {
    if (splitTotal !== 100) {
      toast.error(`Commission split must total 100% (currently ${splitTotal}%)`);
      return;
    }
    setBulkSplitOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', {
        ids: Array.from(selectedIds),
        commissionSplit: bulkSplit,
      });
      toast.success(`${selectedIds.size} project(s) commission split updated successfully`);
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk commission split failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set description
  const handleBulkDescription = async (descText: string) => {
    setBulkDescOpen(false);
    setBulkLoading(true);
    try {
      await api.patch('/admin/projects/bulk', {
        ids: Array.from(selectedIds),
        description: descText,
      });
      toast.success(
        descText
          ? `${selectedIds.size} project(s) description updated`
          : `${selectedIds.size} project(s) description cleared`
      );
      setBulkDescInput('');
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk description update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const confirmed = await showConfirm({
      title: `Delete ${count} Project${count > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete ${count} selected project${count > 1 ? 's' : ''}? All associated commissions, payments, and team links will be removed. This cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      await api.delete('/admin/projects/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${count} project${count > 1 ? 's' : ''} deleted successfully`);
      clearSelection();
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Helper to render a project table row
  const renderProjectRow = (prj: any, rowNumber: number) => {
    const clientObj =
      typeof prj.clientId === 'object' && prj.clientId !== null
        ? prj.clientId
        : clients.find((c) => c._id === prj.clientId || c.id === prj.clientId);
    const clientName = clientObj?.companyName || clientObj?.name || 'Client Production';
    const projectVal = prj.grossProjectValue ?? prj.projectValue ?? prj.totalAmount ?? 0;
    const delivered = isDelivered(prj.status);
    const isSelected = selectedIds.has(prj._id);

    return (
      <tr
        key={prj._id}
        className={`transition-all duration-150 ${
          isSelected
            ? 'bg-[#FF5A1F]/[0.06] border-l-2 border-[#FF5A1F]'
            : delivered
            ? 'bg-zinc-900/25 hover:bg-zinc-900/45 opacity-65 hover:opacity-100 text-zinc-400'
            : 'hover:bg-white/[0.015]'
        }`}
      >
        {/* Checkbox cell */}
        {isSelectMode && (
          <td className="py-3.5 px-3 w-10">
            <button
              onClick={() => toggleSelect(prj._id)}
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isSelected ? 'text-[#FF5A1F]' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          </td>
        )}
        <td className={`py-3.5 px-5 font-mono text-xs w-12 ${delivered ? 'text-zinc-600' : 'text-zinc-500'}`}>
          {rowNumber}
        </td>
        <td className="py-3.5 px-5">
          <span className={`font-semibold text-sm ${delivered ? 'text-zinc-400' : 'text-white'}`}>
            {prj.projectName || prj.title}
          </span>
        </td>
        <td className="py-3.5 px-5">
          <span className={`text-sm ${delivered ? 'text-zinc-500' : 'text-zinc-300'}`}>{clientName}</span>
        </td>
        <td className="py-3.5 px-5">
          <div className={`font-mono text-sm font-semibold ${delivered ? 'text-zinc-400' : 'text-[#FF5A1F]'}`}>
            {formatINR(projectVal)}
          </div>
          {prj.productionCost && Number(prj.productionCost) > 0 ? (
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5" title={prj.productionCostNotes || 'Production / Material Cost'}>
              <span className="text-zinc-500">Design:</span>
              <span className={delivered ? 'text-zinc-400 font-medium' : 'text-[#FF5A1F] font-medium'}>
                {formatINR(prj.designPrice ?? Math.max(0, projectVal - Number(prj.productionCost)))}
              </span>
            </div>
          ) : null}
        </td>
        <td className="py-3.5 px-5">
          <div className="w-36">
            <CustomSelect
              value={prj.status || 'start_process'}
              onChange={(val) => handleStatusChange(prj._id, val)}
              triggerClassName={delivered ? '!border-white/[0.04] !bg-white/[0.02]' : ''}
              options={[
                { value: 'start_process', label: 'Start Process' },
                { value: 'in_process', label: 'In Process' },
                { value: 'in_changes', label: 'In Changes' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </td>
        <td className="py-3.5 px-5">
          {prj.assignedEmployees && prj.assignedEmployees.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 max-w-[240px]">
              {prj.assignedEmployees.map((rawEmp: any) => {
                if (!rawEmp) return null;
                const empId = typeof rawEmp === 'object' ? (rawEmp._id || rawEmp.id) : rawEmp;
                const resolvedEmp = (typeof rawEmp === 'object' && (rawEmp.fullName || rawEmp.name))
                  ? rawEmp
                  : employees.find((e) => (e._id || e.id) === empId);
                const displayName = resolvedEmp?.fullName || resolvedEmp?.name || (typeof rawEmp === 'string' ? `Staff` : 'Staff');
                const empCode = resolvedEmp?.employeeCode || '';

                return (
                  <span
                    key={empId}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs ${
                      delivered
                        ? 'bg-white/[0.02] border-white/[0.05] text-zinc-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-200'
                    }`}
                    title={`${displayName} ${empCode ? `(${empCode})` : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${delivered ? 'bg-zinc-500' : 'bg-[#FF5A1F]'}`} />
                    <span className="truncate max-w-[110px]">{displayName}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-zinc-500 italic">Unassigned</span>
          )}
        </td>
        <td className="py-3.5 px-5 text-right w-28">
          <div className="flex items-center justify-end gap-2 relative">
            <Link
              to={`/admin/projects/${prj._id}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                delivered
                  ? 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06]'
                  : 'bg-[#FF5A1F] hover:bg-[#e04810] text-white'
              }`}
            >
              <span>View</span>
              <span className={delivered ? 'text-zinc-500' : 'text-white/90'}>→</span>
            </Link>

            <div className="relative">
              <button
                onClick={(e) => {
                  if (activeMenuId === prj._id) {
                    setActiveMenuId(null);
                  } else {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const menuHeight = 85;
                    const menuWidth = 168;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const shouldFlipUp = spaceBelow < menuHeight && rect.top >= menuHeight;
                    const topPos = shouldFlipUp
                      ? Math.max(8, rect.top - menuHeight - 4)
                      : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 4);
                    const leftPos = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));

                    setMenuPos({
                      top: topPos,
                      left: leftPos,
                    });
                    setActiveMenuId(prj._id);
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
  };

  // Table header with select-all checkbox
  const renderTableHead = (compact = false) => (
    <thead>
      <tr className="border-b border-white/[0.06] bg-white/[0.01]">
        {isSelectMode && (
          <th className={`${compact ? 'py-3' : 'py-3.5'} px-3 w-10`}>
            <button
              onClick={toggleSelectAll}
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer ${
                allSelected ? 'text-[#FF5A1F]' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          </th>
        )}
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase w-12`}>NO.</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase`}>PROJECT</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase`}>CLIENT</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase`}>CONTRACT VALUE</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase`}>STATUS</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase`}>STAFF</th>
        <th className={`${compact ? 'py-3' : 'py-3.5'} px-5 text-right w-28`}></th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">
            Projects
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage creative production, client assignments, team allocations, and project statuses.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-full sm:w-44"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'start_process', label: 'Start Process' },
              { value: 'in_process', label: 'In Process' },
              { value: 'in_changes', label: 'In Changes' },
              { value: 'delivered', label: 'Delivered' },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              if (isSelectMode) {
                clearSelection();
              } else {
                setIsSelectMode(true);
              }
            }}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 border ${
              isSelectMode
                ? 'bg-[#FF5A1F]/15 border-[#FF5A1F]/40 text-[#FF5A1F] hover:bg-[#FF5A1F]/25 shadow-sm'
                : 'bg-[#0d0e14] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20'
            }`}
          >
            <CheckSquare className={`w-3.5 h-3.5 ${isSelectMode ? 'text-[#FF5A1F]' : 'text-zinc-400'}`} />
            <span>{isSelectMode ? 'Cancel' : 'Select'}</span>
          </button>
        </div>
      </div>

      {/* ── Bulk Action Toolbar (appears when items are selected) ── */}
      {isSelectMode && someSelected && (
        <div className="sticky top-4 z-40 flex flex-wrap items-center gap-2 px-3.5 py-2.5 bg-[#12131a]/95 backdrop-blur-md border border-[#FF5A1F]/30 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150 shadow-2xl">
          {/* Selection count */}
          <div className="flex items-center gap-2 mr-1">
            <CheckSquare className="w-4 h-4 text-[#FF5A1F]" />
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="hidden sm:block w-px h-4 bg-white/10 mx-0.5" />

          {/* 1. Bulk Change Client */}
          <div className="relative" ref={bulkClientRef}>
            <button
              onClick={() => {
                const next = !bulkClientOpen;
                closeAllBulkDropdowns();
                setBulkClientOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Building2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Client</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkClientOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkClientOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-40 w-56 bg-[#12131a] border border-white/10 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                {clients.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-zinc-500">No clients found</div>
                ) : clients.map((cli) => (
                  <button
                    key={cli._id}
                    onClick={() => handleBulkClient(cli._id)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                    <span className="truncate">{cli.companyName || cli.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Bulk Contract Value */}
          <div className="relative" ref={bulkValueRef}>
            <button
              onClick={() => {
                const next = !bulkValueOpen;
                closeAllBulkDropdowns();
                if (next && selectedIds.size === 1) {
                  const prj = projects.find((p) => selectedIds.has(p._id));
                  if (prj) {
                    const val = prj.grossProjectValue ?? prj.projectValue ?? prj.totalAmount ?? '';
                    setBulkValueInput(val ? String(val) : '');
                  }
                }
                setBulkValueOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <IndianRupee className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Contract Value</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkValueOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkValueOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3.5 animate-in fade-in zoom-in-95 duration-100 select-none space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-white">
                    Set Contract Value ({selectedIds.size})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Gross Amount</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[5000, 10000, 15000, 20000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBulkValueInput(String(amt))}
                      className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[10px] font-mono font-medium transition-all cursor-pointer text-center"
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Enter contract amount"
                    value={bulkValueInput}
                    onChange={(e) => setBulkValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleBulkValue();
                      }
                    }}
                    className="w-full pl-7 pr-3 py-1.5 bg-[#12131a] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50 font-mono"
                  />
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleBulkValue}
                  disabled={bulkLoading || !bulkValueInput || Number(bulkValueInput) < 0}
                  className="w-full py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Apply Value</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Bulk Status Change */}
          <div className="relative" ref={bulkStatusRef}>
            <button
              onClick={() => {
                const next = !bulkStatusOpen;
                closeAllBulkDropdowns();
                setBulkStatusOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Status</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkStatusOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkStatusOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-40 w-44 bg-[#12131a] border border-white/10 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100">
                {[
                  { value: 'start_process', label: 'Start Process' },
                  { value: 'in_process', label: 'In Process' },
                  { value: 'in_changes', label: 'In Changes' },
                  { value: 'delivered', label: 'Delivered' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleBulkStatus(opt.value)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Bulk Assign Staff (Multi-Select) */}
          <div className="relative" ref={bulkAssignRef}>
            <button
              onClick={() => {
                const next = !bulkAssignOpen;
                closeAllBulkDropdowns();
                if (next) {
                  // Pre-populate with currently assigned staff of selected project(s)
                  const currentStaffSet = new Set<string>();
                  for (const id of selectedIds) {
                    const prj = projects.find((p) => p._id === id);
                    if (prj && Array.isArray(prj.assignedEmployees)) {
                      for (const emp of prj.assignedEmployees) {
                        const empId = typeof emp === 'object' ? (emp?._id || emp?.id) : emp;
                        if (empId) currentStaffSet.add(String(empId));
                      }
                    }
                  }
                  setBulkSelectedStaff(currentStaffSet);
                }
                setBulkAssignOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Staff</span>
              {bulkSelectedStaff.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold">
                  {bulkSelectedStaff.size}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkAssignOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkAssignOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3 animate-in fade-in zoom-in-95 duration-100 select-none space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-white">Assign Staff</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({selectedIds.size} prj)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBulkAssignEmployees([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                    title="Unassign all staff from selected projects"
                  >
                    Unassign All
                  </button>
                </div>

                {/* Quick search filter */}
                {employees.length > 5 && (
                  <div className="relative">
                    <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter staff..."
                      value={bulkStaffFilter}
                      onChange={(e) => setBulkStaffFilter(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 bg-[#12131a] border border-white/10 rounded-lg text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50"
                    />
                  </div>
                )}

                {/* Employee Multi-Select List */}
                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                  {filteredEmployeesForBulk.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-zinc-500">No staff found</div>
                  ) : (
                    filteredEmployeesForBulk.map((emp) => {
                      const isEmpSelected = bulkSelectedStaff.has(emp._id);
                      return (
                        <button
                          key={emp._id}
                          type="button"
                          onClick={() => {
                            setBulkSelectedStaff((prev) => {
                              const next = new Set(prev);
                              if (next.has(emp._id)) {
                                next.delete(emp._id);
                              } else {
                                next.add(emp._id);
                              }
                              return next;
                            });
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                            isEmpSelected
                              ? 'bg-[#FF5A1F]/15 text-white font-medium'
                              : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                              isEmpSelected ? 'text-[#FF5A1F]' : 'text-zinc-600'
                            }`}>
                              {isEmpSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </div>
                            <span className="truncate">{emp.fullName || emp.name}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => handleBulkAssignEmployees(Array.from(bulkSelectedStaff))}
                  disabled={bulkLoading || bulkSelectedStaff.size === 0}
                  className="w-full py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Assign {bulkSelectedStaff.size > 0 ? `${bulkSelectedStaff.size} Member${bulkSelectedStaff.size > 1 ? 's' : ''}` : 'Staff'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Bulk Start Date */}
          <div className="relative" ref={bulkStartDateRef}>
            <button
              onClick={() => {
                const next = !bulkStartDateOpen;
                closeAllBulkDropdowns();
                setBulkStartDateOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Start Date</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkStartDateOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkStartDateOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3.5 animate-in fade-in zoom-in-95 duration-100 select-none space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-white">
                    Set Start Date ({selectedIds.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkStartDate('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Clear Date
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkStartDate(bulkTodayYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStartDate(bulkTomorrowYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStartDate(bulkNextWeekYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    +7 Days
                  </button>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (bulkStartCalMonth === 0) {
                        setBulkStartCalMonth(11);
                        setBulkStartCalYear((y) => y - 1);
                      } else {
                        setBulkStartCalMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-white tracking-wide">
                    {calendarMonthNames[bulkStartCalMonth]} {bulkStartCalYear}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (bulkStartCalMonth === 11) {
                        setBulkStartCalMonth(0);
                        setBulkStartCalYear((y) => y + 1);
                      } else {
                        setBulkStartCalMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekday Row */}
                <div className="grid grid-cols-7 gap-1 text-center py-1 border-b border-white/[0.04]">
                  {calendarWeekdayNames.map((d) => (
                    <span key={d} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {bulkStartCalendarCells.map((cell) => {
                    const isToday = cell.ymd === bulkTodayYMD;
                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        onClick={() => handleBulkStartDate(cell.ymd)}
                        className={`h-7 w-full rounded-lg text-xs flex items-center justify-center transition-all font-medium select-none cursor-pointer ${
                          cell.isCurrentMonth
                            ? 'text-zinc-200 hover:bg-[#FF5A1F] hover:text-white hover:font-bold hover:shadow-md'
                            : 'text-zinc-600 opacity-30 hover:opacity-80'
                        } ${isToday ? 'ring-1 ring-[#FF5A1F]/60 text-white font-semibold' : ''}`}
                      >
                        {cell.dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Bulk Deadline */}
          <div className="relative" ref={bulkDeadlineRef}>
            <button
              onClick={() => {
                const next = !bulkDeadlineOpen;
                closeAllBulkDropdowns();
                setBulkDeadlineOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Deadline</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkDeadlineOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkDeadlineOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3.5 animate-in fade-in zoom-in-95 duration-100 select-none space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-white">
                    Set Deadline ({selectedIds.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkDeadline('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Clear Date
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkDeadline(bulkTodayYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkDeadline(bulkTomorrowYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkDeadline(bulkNextWeekYMD)}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[11px] font-medium transition-all cursor-pointer text-center"
                  >
                    +7 Days
                  </button>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (bulkCalMonth === 0) {
                        setBulkCalMonth(11);
                        setBulkCalYear((y) => y - 1);
                      } else {
                        setBulkCalMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-white tracking-wide">
                    {calendarMonthNames[bulkCalMonth]} {bulkCalYear}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (bulkCalMonth === 11) {
                        setBulkCalMonth(0);
                        setBulkCalYear((y) => y + 1);
                      } else {
                        setBulkCalMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekday Row */}
                <div className="grid grid-cols-7 gap-1 text-center py-1 border-b border-white/[0.04]">
                  {calendarWeekdayNames.map((d) => (
                    <span key={d} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {bulkCalendarCells.map((cell) => {
                    const isToday = cell.ymd === bulkTodayYMD;
                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        onClick={() => handleBulkDeadline(cell.ymd)}
                        className={`h-7 w-full rounded-lg text-xs flex items-center justify-center transition-all font-medium select-none cursor-pointer ${
                          cell.isCurrentMonth
                            ? 'text-zinc-200 hover:bg-[#FF5A1F] hover:text-white hover:font-bold hover:shadow-md'
                            : 'text-zinc-600 opacity-30 hover:opacity-80'
                        } ${isToday ? 'ring-1 ring-[#FF5A1F]/60 text-white font-semibold' : ''}`}
                        title={cell.ymd}
                      >
                        {cell.dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 7. Bulk Commission Split */}
          <div className="relative" ref={bulkSplitRef}>
            <button
              onClick={() => {
                const next = !bulkSplitOpen;
                closeAllBulkDropdowns();
                setBulkSplitOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <PieChart className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Split</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkSplitOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkSplitOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3.5 animate-in fade-in zoom-in-95 duration-100 select-none space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-white">
                    Commission Split ({selectedIds.size})
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${splitTotal === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Total: {splitTotal}%
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBulkSplit({ brokerPercent: 10, employeePercent: 40, officePercent: 10, adminPercent: 35, settlementPercent: 5 })}
                    className="px-1.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[10px] font-medium transition-all cursor-pointer text-center"
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSplit({ brokerPercent: 0, employeePercent: 50, officePercent: 10, adminPercent: 35, settlementPercent: 5 })}
                    className="px-1.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[10px] font-medium transition-all cursor-pointer text-center"
                  >
                    In-House
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSplit({ brokerPercent: 0, employeePercent: 0, officePercent: 0, adminPercent: 100, settlementPercent: 0 })}
                    className="px-1.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#FF5A1F]/20 text-zinc-300 hover:text-[#FF5A1F] text-[10px] font-medium transition-all cursor-pointer text-center"
                  >
                    100% Admin
                  </button>
                </div>

                {/* Inputs for percentages */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">Broker</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bulkSplit.brokerPercent}
                        onChange={(e) => setBulkSplit({ ...bulkSplit, brokerPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="w-14 py-0.5 px-1.5 text-right font-mono text-xs bg-[#12131a] border border-white/10 rounded-md text-white focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">Employee Pool</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bulkSplit.employeePercent}
                        onChange={(e) => setBulkSplit({ ...bulkSplit, employeePercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="w-14 py-0.5 px-1.5 text-right font-mono text-xs bg-[#12131a] border border-white/10 rounded-md text-white focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">Office Expense</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bulkSplit.officePercent}
                        onChange={(e) => setBulkSplit({ ...bulkSplit, officePercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="w-14 py-0.5 px-1.5 text-right font-mono text-xs bg-[#12131a] border border-white/10 rounded-md text-white focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">Admin Share</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bulkSplit.adminPercent}
                        onChange={(e) => setBulkSplit({ ...bulkSplit, adminPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="w-14 py-0.5 px-1.5 text-right font-mono text-xs bg-[#12131a] border border-white/10 rounded-md text-white focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">Settlement Reserve</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bulkSplit.settlementPercent}
                        onChange={(e) => setBulkSplit({ ...bulkSplit, settlementPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="w-14 py-0.5 px-1.5 text-right font-mono text-xs bg-[#12131a] border border-white/10 rounded-md text-white focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">%</span>
                    </div>
                  </div>
                </div>

                {splitTotal !== 100 && (
                  <div className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg text-center">
                    Percentages must sum to 100% (currently {splitTotal}%)
                  </div>
                )}

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleBulkSplit}
                  disabled={bulkLoading || splitTotal !== 100}
                  className="w-full py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Apply Split</span>
                </button>
              </div>
            )}
          </div>

          {/* 8. Bulk Description */}
          <div className="relative" ref={bulkDescRef}>
            <button
              onClick={() => {
                const next = !bulkDescOpen;
                closeAllBulkDropdowns();
                if (next && selectedIds.size === 1) {
                  const prj = projects.find((p) => selectedIds.has(p._id));
                  if (prj) {
                    setBulkDescInput(prj.description || '');
                  }
                }
                setBulkDescOpen(next);
              }}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Description</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${bulkDescOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
            {bulkDescOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-[#0c0d12] border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.98)] p-3.5 animate-in fade-in zoom-in-95 duration-100 select-none space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-white">
                    Set Description ({selectedIds.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkDescription('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Clear Text
                  </button>
                </div>

                <textarea
                  rows={3}
                  placeholder="Enter project notes or description..."
                  value={bulkDescInput}
                  onChange={(e) => setBulkDescInput(e.target.value)}
                  className="w-full p-2 bg-[#12131a] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50 resize-none font-normal"
                />

                <button
                  type="button"
                  onClick={() => handleBulkDescription(bulkDescInput)}
                  disabled={bulkLoading || !bulkDescInput.trim()}
                  className="w-full py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:hover:bg-[#FF5A1F] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Apply Description</span>
                </button>
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-4 bg-white/10 mx-0.5" />

          {/* Delete Selected */}
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <span>Delete</span>
          </button>

          <div className="flex-1" />

          {/* Clear / Exit Select Mode */}
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-12 text-center text-zinc-500 font-mono text-xs">
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl py-8">
          <EmptyState
            type="projects"
            title={selectedMonth !== 'all' ? `No projects in ${selectedMonthLabel}` : undefined}
            description={
              selectedMonth !== 'all'
                ? "Try selecting another month or 'All Months' to view projects."
                : undefined
            }
            actionLabel={selectedMonth === 'all' ? 'Create First Project' : undefined}
            onAction={selectedMonth === 'all' ? openCreateModal : undefined}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Pending & In Progress Projects (Always Top) */}
          {shouldShowPendingSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F] animate-pulse" />
                  <h2 className="text-sm font-semibold text-white">Pending & In Process Projects</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]">
                    {pendingProjects.length}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Active production</span>
              </div>

              {pendingProjects.length > 0 ? (
                <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[800px]">
                      {renderTableHead(false)}
                      <tbody className="divide-y divide-white/[0.04]">
                        {pendingProjects.map((prj, idx) => renderProjectRow(prj, idx + 1))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No pending or in-process projects in this filter.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Completed Projects Grouped by Date Boxes */}
          {shouldShowCompletedSection && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-zinc-300">Delivered Projects</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                    {completedTotalCount}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Grouped by completion date</span>
              </div>

              {completedGroups.length > 0 ? (
                <div className="space-y-4">
                  {completedGroups.map((group) => (
                    <div
                      key={group.dateKey}
                      className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm"
                    >
                      {/* Date Box Header (Neutral grey styling) */}
                      <div className="bg-[#0b0c10] border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-medium text-xs flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{group.dateLabel}</span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">
                          {group.projects.length} {group.projects.length === 1 ? 'project delivered' : 'projects delivered'}
                        </span>
                      </div>

                      {/* Projects inside the Date Box */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs min-w-[800px]">
                          {renderTableHead(true)}
                          <tbody className="divide-y divide-white/[0.04]">
                            {group.projects.map((prj, idx) => renderProjectRow(prj, idx + 1))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No completed projects found in this filter.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fixed-position Dropdown Action Menu */}
      {activeMenuId && (() => {
        const activePrj =
          filtered.find((p) => (p._id || p.id) === activeMenuId) ||
          projects.find((p) => (p._id || p.id) === activeMenuId);
        if (!activePrj) return null;
        return (
          <div
            ref={menuRef}
            className="fixed w-44 bg-[#12131a] border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => openEditModal(activePrj)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Edit Project</span>
            </button>
            <button
              onClick={() => handleDelete(activePrj._id || activePrj.id, activePrj.projectName || activePrj.title)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Delete</span>
            </button>
          </div>
        );
      })()}

      {/* Row count indicator */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>{filtered.length} {filtered.length === 1 ? 'project total' : 'projects total'}</span>
        {someSelected && (
          <span className="text-[#FF5A1F] font-medium">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Reusable Project Modal for Creating & Editing */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={editingProject}
        clients={clients}
        employees={employees}
        onSuccess={() => fetchAll()}
        onClientAdded={(newClient) => setClients((prev) => [newClient, ...prev])}
        onSwitchToBulk={() => {
          setIsModalOpen(false);
          setIsBulkCreateOpen(true);
        }}
      />

      {/* Bulk / Multi-Project Creation Modal */}
      {isBulkCreateOpen && (
        <BulkCreateProjectsModal
          isOpen={isBulkCreateOpen}
          onClose={() => setIsBulkCreateOpen(false)}
          clients={clients}
          employees={employees}
          onSuccess={() => fetchAll()}
          onSwitchToSingle={() => {
            setIsBulkCreateOpen(false);
            openCreateModal();
          }}
        />
      )}

    </div>
  );
};
