import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Save,
  Trash2,
  Eye,
  Edit3,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { RichTextEditor } from '../../components/common/RichTextEditor';

export const TermsManagement: React.FC = () => {
  const toast = useToast();
  const [content, setContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Load terms & conditions
  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/terms');
      if (res.data?.success && res.data?.data) {
        setContent(res.data.data.content || '');
        setLastUpdated(res.data.data.lastUpdated || null);
      }
    } catch (err: any) {
      console.error('Error fetching terms:', err);
      toast.error(err.response?.data?.message || 'Failed to load terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  // Save changes
  const handleSave = async () => {
    if (!content.trim()) {
      toast.warning('Terms & conditions content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/admin/terms', { content });
      if (res.data?.success) {
        toast.success('Terms & Conditions saved successfully!');
        setLastUpdated(res.data.data?.lastUpdated || new Date().toISOString());
      }
    } catch (err: any) {
      console.error('Error saving terms:', err);
      toast.error(err.response?.data?.message || 'Failed to save terms');
    } finally {
      setSaving(false);
    }
  };

  // Clear / Delete content
  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all terms & conditions content?')) return;

    try {
      const res = await api.delete('/admin/terms');
      if (res.data?.success) {
        setContent('');
        setLastUpdated(new Date().toISOString());
        toast.success('Terms & Conditions cleared');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear content');
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#08090d] border border-white/[0.06] p-5 sm:p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FF5A1F]">
              Staff Terms & Conditions
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
              Staff Portal
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Write and format company policies and employee guidelines directly using the text editor below.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Editor / Preview Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'editor'
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'preview'
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Staff Preview</span>
            </button>
          </div>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            title="Clear all terms content"
            className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#FF7A45] text-white shadow-lg shadow-[#FF5A1F]/20 hover:shadow-[#FF5A1F]/30 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">

          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Last saved:{' '}
              {new Date(lastUpdated).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#08090d] border border-white/[0.06] rounded-2xl p-8">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F]/20 border-t-[#FF5A1F] animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Loading terms & conditions...</p>
        </div>
      ) : activeTab === 'editor' ? (
        <div className="space-y-4">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Type and design your terms & conditions here. Use headings, bold text, bullet points, colors, quotes, etc..."
            minHeight="520px"
          />

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between p-4 bg-[#08090d] border border-white/[0.06] rounded-2xl">
            <span className="text-xs text-zinc-400">
              Click &quot;Save Changes&quot; to publish your updates to the staff portal.
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#FF7A45] text-white shadow-lg shadow-[#FF5A1F]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        /* Staff Preview */
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
            <Sparkles className="w-4 h-4 text-[#FF5A1F]" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Staff Portal Preview (How employees see this)
            </span>
          </div>

          {content ? (
            <div
              className="text-sm text-zinc-300 leading-relaxed bg-[#0d0e14] p-6 sm:p-8 rounded-2xl border border-white/[0.04] rich-text-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No content entered yet. Switch to Editor mode to write terms.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
