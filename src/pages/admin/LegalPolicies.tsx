import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';

interface LegalSection {
  _id?: string;
  heading: string;
  description: string;
  order: number;
}

interface LegalDocData {
  _id?: string;
  type: 'terms_and_conditions' | 'privacy_policy';
  title: string;
  subtitle: string;
  sections: LegalSection[];
  lastUpdated?: string;
}

export const LegalPolicies: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'terms_and_conditions' | 'privacy_policy'>('terms_and_conditions');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Original snapshot to detect changes or reset
  const [originalData, setOriginalData] = useState<LegalDocData | null>(null);

  // Fetch document for active tab
  const fetchDoc = async (type: 'terms_and_conditions' | 'privacy_policy') => {
    setLoading(true);
    try {
      const res = await api.get(`/legal/admin/${type}`);
      if (res.data?.success && res.data?.data) {
        const data: LegalDocData = res.data.data;
        setTitle(data.title || (type === 'terms_and_conditions' ? 'Terms & Conditions' : 'Privacy Policy'));
        setSubtitle(data.subtitle || '');
        setSections(
          (data.sections || []).map((sec, idx) => ({
            ...sec,
            order: typeof sec.order === 'number' ? sec.order : idx + 1,
          }))
        );
        setLastUpdated(data.lastUpdated || null);
        setOriginalData(data);
      }
    } catch (err: any) {
      console.error('Error fetching legal document:', err);
      toast.error(err.response?.data?.message || 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc(activeTab);
  }, [activeTab]);

  // Section Handlers
  const handleAddSection = () => {
    const newOrder = sections.length + 1;
    setSections([
      ...sections,
      {
        heading: `${newOrder}. New Clause Heading`,
        description: '',
        order: newOrder,
      },
    ]);
  };

  const handleUpdateSection = (index: number, field: 'heading' | 'description', value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleRemoveSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    // Reassign order
    const reordered = updated.map((sec, i) => ({ ...sec, order: i + 1 }));
    setSections(reordered);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sections];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((sec, i) => ({ ...sec, order: i + 1 }));
    setSections(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((sec, i) => ({ ...sec, order: i + 1 }));
    setSections(reordered);
  };

  const handleReset = () => {
    if (!originalData) return;
    setTitle(originalData.title);
    setSubtitle(originalData.subtitle);
    setSections(originalData.sections || []);
    toast.info('Changes reset to last saved state');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.warning('Document title is required');
      return;
    }

    // Check for empty headings
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].heading.trim()) {
        toast.warning(`Clause #${i + 1} has an empty heading`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await api.put(`/legal/admin/${activeTab}`, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        sections,
      });

      if (res.data?.success) {
        toast.success(`${title} saved and published to main website!`);
        setLastUpdated(res.data.data.lastUpdated || new Date().toISOString());
        setOriginalData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error saving policy:', err);
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = activeTab === 'terms_and_conditions' ? '/terms' : '/privacy';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Terms & Policies</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
              Main Website CMS
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage public Terms & Conditions and Privacy Policy displayed on the Aagspire main website.
          </p>
        </div>

        {/* Live Public Link */}
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all duration-200 self-start sm:self-auto"
        >
          <span>View on Website</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#FF5A1F]" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        <button
          onClick={() => setActiveTab('terms_and_conditions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            activeTab === 'terms_and_conditions'
              ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20'
              : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Terms & Conditions</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy_policy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            activeTab === 'privacy_policy'
              ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20'
              : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy Policy</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-[#08090d] border border-white/[0.06] rounded-2xl p-8">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F]/20 border-t-[#FF5A1F] animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Loading policy content...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Document Details Card */}
          <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#FF5A1F]" />
                <h2 className="text-sm font-bold text-white tracking-tight">Document Overview</h2>
              </div>
              {lastUpdated && (
                <div className="text-[11px] text-zinc-400">
                  Last updated:{' '}
                  <span className="text-zinc-300 font-medium">
                    {new Date(lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium text-xs">
                  Page Title <span className="text-[#FF5A1F]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Terms & Conditions"
                  className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] focus:border-[#FF5A1F] focus:outline-none rounded-xl text-white text-xs font-medium transition-colors"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Subtitle / Summary</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Official service guidelines and agreement for clients."
                  className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] focus:border-[#FF5A1F] focus:outline-none rounded-xl text-white text-xs font-medium transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Policy Sections ({sections.length})
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Each clause includes a prominent Heading and detailed Description for clear reading.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSection}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] hover:bg-[#FF5A1F] hover:text-white border border-[#FF5A1F]/20 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clause / Heading</span>
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="bg-[#08090d] border border-dashed border-white/10 rounded-2xl p-10 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">No clauses added yet for this document.</p>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] text-white hover:bg-[#FF7A45] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Section</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="bg-[#08090d] border border-white/[0.06] hover:border-white/10 rounded-2xl p-5 space-y-4 transition-all duration-200 group"
                  >
                    {/* Clause Header Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                          CLAUSE #{index + 1}
                        </span>
                      </div>

                      {/* Controls: Move Up, Move Down, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sections.length - 1}
                          title="Move Down"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-[1px] h-3.5 bg-white/10 mx-1" />

                        <button
                          type="button"
                          onClick={() => handleRemoveSection(index)}
                          title="Delete Clause"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Heading Input */}
                    <div>
                      <label className="text-zinc-400 block mb-1.5 font-medium text-xs">
                        Section Heading <span className="text-[#FF5A1F]">*</span>
                      </label>
                      <input
                        type="text"
                        value={section.heading}
                        onChange={(e) => handleUpdateSection(index, 'heading', e.target.value)}
                        placeholder="e.g. 1. Intellectual Property & Ownership"
                        className="w-full px-3.5 py-2 bg-[#0d0e14] border border-white/[0.08] focus:border-[#FF5A1F] focus:outline-none rounded-xl text-white text-xs font-semibold transition-colors"
                      />
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <label className="text-zinc-400 block mb-1.5 font-medium text-xs">
                        Section Description / Clause Terms <span className="text-[#FF5A1F]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={section.description}
                        onChange={(e) => handleUpdateSection(index, 'description', e.target.value)}
                        placeholder="Write detailed terms or policy explanation for this clause..."
                        className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] focus:border-[#FF5A1F] focus:outline-none rounded-xl text-zinc-300 text-xs leading-relaxed transition-colors custom-scrollbar resize-y min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-4 z-20 bg-[#08090d]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                Changes save directly to MongoDB and display in real-time on the main website.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#FF7A45] text-white shadow-lg shadow-[#FF5A1F]/25 hover:shadow-[#FF5A1F]/40 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
