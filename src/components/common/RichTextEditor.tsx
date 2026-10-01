import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Minus,
  RotateCcw,
  RotateCw,
  Code,
  Eye,
  RemoveFormatting,
  Palette,
  Highlighter,
  ChevronDown,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TEXT_COLORS = [
  { name: 'Default White', color: '#FFFFFF' },
  { name: 'Ember Orange', color: '#FF5A1F' },
  { name: 'Warm Amber', color: '#F59E0B' },
  { name: 'Emerald Green', color: '#10B981' },
  { name: 'Electric Cyan', color: '#06B6D4' },
  { name: 'Rose Red', color: '#F43F5E' },
  { name: 'Muted Gray', color: '#9CA3AF' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', color: 'transparent' },
  { name: 'Ember Glow', color: 'rgba(255, 90, 31, 0.2)' },
  { name: 'Amber Glow', color: 'rgba(245, 158, 11, 0.2)' },
  { name: 'Emerald Tint', color: 'rgba(16, 185, 129, 0.2)' },
  { name: 'Cyan Tint', color: 'rgba(6, 182, 212, 0.2)' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write policy terms and guidelines here. Use the toolbar for bullet points, headings, colors, etc...',
  minHeight = '320px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState<boolean>(false);
  const [sourceHtml, setSourceHtml] = useState<string>(value || '');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);

  // Sync internal content only when value changes externally and editor is not focused
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setSourceHtml(value || '');
  }, [value, isSourceMode]);

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceHtml(html);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceHtml(html);
    }
  };

  const handleFormatBlock = (tag: string) => {
    executeCommand('formatBlock', tag);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter web link URL (https://...):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleInsertQuote = () => {
    if (isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    const text = selection && selection.rangeCount > 0 && selection.toString().trim()
      ? selection.toString().trim()
      : 'Important notice or policy guideline';
    const quoteHtml = `<blockquote style="border-left: 4px solid #FF5A1F; padding: 10px 16px; margin: 12px 0; background: rgba(255, 90, 31, 0.08); border-radius: 0 12px 12px 0; color: #f4f4f5; font-style: italic;"><b>Notice:</b> ${text}</blockquote><p><br></p>`;
    executeCommand('insertHTML', quoteHtml);
  };

  const handleInsertDivider = () => {
    executeCommand('insertHorizontalRule');
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setSourceHtml(newHtml);
    onChange(newHtml);
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching back to visual editor
      setIsSourceMode(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = sourceHtml;
        }
      }, 0);
    } else {
      // Switching to HTML code mode
      if (editorRef.current) {
        setSourceHtml(editorRef.current.innerHTML);
      }
      setIsSourceMode(true);
    }
  };

  return (
    <div className="border border-white/[0.08] rounded-2xl bg-[#090a0f] overflow-hidden shadow-xl flex flex-col focus-within:border-[#FF5A1F]/50 transition-colors">
      {/* Formatting Toolbar */}
      <div className="p-2 bg-[#0d0e14] border-b border-white/[0.06] flex flex-wrap items-center gap-1 text-xs select-none">
        {/* Headings / Block Type Dropdown */}
        <div className="relative inline-block mr-1">
          <select
            disabled={isSourceMode}
            onChange={(e) => handleFormatBlock(e.target.value)}
            defaultValue="p"
            className="h-8 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus:border-[#FF5A1F] transition-colors disabled:opacity-40"
          >
            <option value="p" className="bg-[#0f1016] text-white">Paragraph</option>
            <option value="h1" className="bg-[#0f1016] text-white font-bold">Main Title (H1)</option>
            <option value="h2" className="bg-[#0f1016] text-[#FF5A1F] font-bold">Section Heading (H2)</option>
            <option value="h3" className="bg-[#0f1016] text-white font-semibold">Subheading (H3)</option>
          </select>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Text Styling: Bold, Italic, Underline, Strike */}
        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('bold')}
          title="Bold (Ctrl+B)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('italic')}
          title="Italic (Ctrl+I)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('underline')}
          title="Underline (Ctrl+U)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('strikeThrough')}
          title="Strikethrough"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Color Pickers */}
        <div className="relative">
          <button
            type="button"
            disabled={isSourceMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            title="Text Color"
            className="h-8 px-2 rounded-lg flex items-center gap-1.5 text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Palette className="w-4 h-4 text-[#FF5A1F]" />
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showColorPicker && (
            <div className="absolute top-10 left-0 z-30 p-2 rounded-xl bg-[#12131a] border border-white/10 shadow-2xl space-y-1 w-40">
              <span className="text-[10px] text-zinc-400 px-2 font-semibold uppercase tracking-wider block">
                Text Color
              </span>
              {TEXT_COLORS.map((tc) => (
                <button
                  key={tc.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    executeCommand('foreColor', tc.color);
                    setShowColorPicker(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: tc.color }}
                  />
                  <span className="text-zinc-300 font-medium text-[11px]">{tc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            disabled={isSourceMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            title="Highlight Background"
            className="h-8 px-2 rounded-lg flex items-center gap-1.5 text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Highlighter className="w-4 h-4 text-amber-400" />
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-10 left-0 z-30 p-2 rounded-xl bg-[#12131a] border border-white/10 shadow-2xl space-y-1 w-40">
              <span className="text-[10px] text-zinc-400 px-2 font-semibold uppercase tracking-wider block">
                Highlight
              </span>
              {HIGHLIGHT_COLORS.map((hc) => (
                <button
                  key={hc.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    executeCommand('hiliteColor', hc.color);
                    setShowHighlightPicker(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-md border border-white/20 shrink-0"
                    style={{ backgroundColor: hc.color }}
                  />
                  <span className="text-zinc-300 font-medium text-[11px]">{hc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Lists: Bullet List & Numbered List */}
        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertUnorderedList')}
          title="Bullet List (•)"
          className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <List className="w-4 h-4 text-[#FF5A1F]" />
          <span className="text-[11px] font-medium hidden sm:inline">Bullets</span>
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertOrderedList')}
          title="Numbered List (1, 2, 3)"
          className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ListOrdered className="w-4 h-4 text-[#FF5A1F]" />
          <span className="text-[11px] font-medium hidden sm:inline">Numbered</span>
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertQuote}
          title="Insert Highlight Notice Box"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-[#FF5A1F] hover:bg-white/[0.06] active:bg-[#FF5A1F]/20 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertDivider}
          title="Horizontal Rule"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyLeft')}
          title="Align Left"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyCenter')}
          title="Align Center"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyRight')}
          title="Align Right"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('justifyFull')}
          title="Justify"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Link / Unlink */}
        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertLink}
          title="Insert Link"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-[#FF5A1F] hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('unlink')}
          title="Remove Link"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Unlink className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('removeFormat')}
          title="Clear Formatting"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-rose-400 hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('undo')}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={isSourceMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('redo')}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Mode Switcher: HTML vs Visual Editor */}
        <button
          type="button"
          onClick={toggleSourceMode}
          title={isSourceMode ? 'Switch to Visual Editor' : 'Edit HTML Source Code'}
          className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 font-mono text-[11px] transition-all duration-150 cursor-pointer ${
            isSourceMode
              ? 'bg-[#FF5A1F] text-white font-bold'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          {isSourceMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          <span>{isSourceMode ? 'Visual' : 'HTML'}</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="relative p-4">
        {isSourceMode ? (
          <textarea
            value={sourceHtml}
            onChange={handleSourceChange}
            placeholder="Edit raw HTML code..."
            style={{ minHeight }}
            className="w-full bg-[#07080c] font-mono text-xs text-amber-300/90 leading-relaxed p-4 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5A1F] custom-scrollbar resize-y"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="outline-none text-sm text-zinc-200 leading-relaxed custom-scrollbar rich-text-content focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none"
          />
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 bg-[#0d0e14]/70 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{isSourceMode ? 'Mode: HTML Source Editor' : 'Mode: Visual WYSIWYG'}</span>
          <span>•</span>
          <span>{sourceHtml.replace(/<[^>]*>/g, '').trim().length} Characters</span>
        </div>
        <div className="text-[10px] text-zinc-400">
          Aagspire Rich Design Engine
        </div>
      </div>
    </div>
  );
};
