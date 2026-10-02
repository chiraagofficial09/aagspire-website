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
  Check,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TEXT_COLORS = [
  { name: 'Default Dark', color: '#18181B' },
  { name: 'Ember Orange', color: '#FF5A1F' },
  { name: 'Royal Blue', color: '#2563EB' },
  { name: 'Emerald Green', color: '#059669' },
  { name: 'Amber Gold', color: '#D97706' },
  { name: 'Rose Red', color: '#E11D48' },
  { name: 'Muted Gray', color: '#6B7280' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', color: 'transparent' },
  { name: 'Yellow Tint', color: '#FEF08A' },
  { name: 'Ember Tint', color: '#FED7AA' },
  { name: 'Green Tint', color: '#BBF7D0' },
  { name: 'Blue Tint', color: '#BFDBFE' },
  { name: 'Rose Tint', color: '#FECDD3' },
];

export interface BlockFormatOption {
  value: string;
  label: string;
  tag: string;
  description: string;
}

export const BLOCK_FORMAT_OPTIONS: BlockFormatOption[] = [
  { value: 'p', label: 'Paragraph', tag: 'P', description: 'Regular body text' },
  { value: 'h1', label: 'Main Title (H1)', tag: 'H1', description: 'Main heading' },
  { value: 'h2', label: 'Section Heading (H2)', tag: 'H2', description: 'Section heading' },
  { value: 'h3', label: 'Subheading (H3)', tag: 'H3', description: 'Small subheading' },
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
  const [currentBlock, setCurrentBlock] = useState<string>('p');
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState<boolean>(false);

  const blockMenuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (blockMenuRef.current && !blockMenuRef.current.contains(target)) {
        setIsBlockMenuOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
        setShowHighlightPicker(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBlockMenuOpen(false);
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const detectActiveBlock = () => {
    if (!editorRef.current || isSourceMode) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3'].includes(tag)) {
          setCurrentBlock(tag);
          return;
        }
      }
      node = node.parentNode;
    }
    setCurrentBlock('p');
  };

  const handleFormatBlock = (tag: string) => {
    if (isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const cleanTag = tag.toLowerCase().replace(/[<>]/g, '');
    try {
      document.execCommand('formatBlock', false, `<${cleanTag}>`);
    } catch {
      document.execCommand('formatBlock', false, cleanTag);
    }
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceHtml(html);
    }
    setCurrentBlock(cleanTag);
    setIsBlockMenuOpen(false);
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
        {/* Headings / Block Type Custom Dropdown */}
        <div className="relative inline-block mr-1" ref={blockMenuRef}>
          <button
            type="button"
            disabled={isSourceMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setIsBlockMenuOpen(!isBlockMenuOpen);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            title="Text Style / Heading Level"
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer select-none disabled:opacity-40 min-w-[155px] border ${
              isBlockMenuOpen
                ? 'bg-[#151620] border-[#FF5A1F] shadow-[0_0_12px_rgba(255,90,31,0.25)] text-white'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {(() => {
                const active = BLOCK_FORMAT_OPTIONS.find((b) => b.value === currentBlock) || BLOCK_FORMAT_OPTIONS[0];
                return (
                  <>
                    <span
                      className={`w-5 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center shrink-0 ${
                        active.value === 'h2'
                          ? 'bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30'
                          : active.value === 'h1'
                          ? 'bg-white/10 text-white border border-white/15'
                          : active.value === 'h3'
                          ? 'bg-white/5 text-zinc-300 border border-white/10'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {active.tag}
                    </span>
                    <span
                      className={`truncate text-xs ${
                        active.value === 'h2'
                          ? 'text-[#FF5A1F] font-bold'
                          : active.value === 'h1'
                          ? 'text-white font-bold'
                          : active.value === 'h3'
                          ? 'text-zinc-100 font-semibold'
                          : 'text-zinc-300 font-normal'
                      }`}
                    >
                      {active.label}
                    </span>
                  </>
                );
              })()}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                isBlockMenuOpen ? 'rotate-180 text-[#FF5A1F]' : ''
              }`}
            />
          </button>

          {isBlockMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-40 min-w-[210px] p-1.5 rounded-xl bg-[#101118]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Block Style
              </div>
              {BLOCK_FORMAT_OPTIONS.map((opt) => {
                const isSelected = currentBlock === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSourceMode}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFormatBlock(opt.value)}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left group ${
                      isSelected
                        ? 'bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-white'
                        : 'hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                          opt.value === 'h2'
                            ? 'bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30'
                            : opt.value === 'h1'
                            ? 'bg-white/10 text-white border border-white/15'
                            : opt.value === 'h3'
                            ? 'bg-white/5 text-zinc-300 border border-white/10'
                            : 'bg-white/5 text-zinc-400 border border-white/10'
                        }`}
                      >
                        {opt.tag}
                      </span>
                      <span
                        className={`text-xs ${
                          opt.value === 'h2'
                            ? 'text-[#FF5A1F] font-bold'
                            : opt.value === 'h1'
                            ? 'text-white font-bold'
                            : opt.value === 'h3'
                            ? 'text-zinc-100 font-semibold'
                            : 'text-zinc-300 font-normal'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            disabled={isSourceMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
              setIsBlockMenuOpen(false);
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

        <div className="relative" ref={highlightPickerRef}>
          <button
            type="button"
            disabled={isSourceMode}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setIsBlockMenuOpen(false);
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
          onClick={() => {
            executeCommand('removeFormat');
            handleFormatBlock('p');
          }}
          title="Clear Formatting & Remove Heading (Ctrl+\)"
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

      {/* Editor Content Area (White Canvas) */}
      <div className="relative p-3 sm:p-5 bg-[#090a0f]">
        {isSourceMode ? (
          <textarea
            value={sourceHtml}
            onChange={handleSourceChange}
            placeholder="Edit raw HTML code..."
            style={{ minHeight }}
            className="w-full bg-white font-mono text-xs text-zinc-900 leading-relaxed p-6 rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 custom-scrollbar resize-y shadow-sm"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={() => {
              handleInput();
              detectActiveBlock();
            }}
            onBlur={handleInput}
            onKeyUp={detectActiveBlock}
            onMouseUp={detectActiveBlock}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="outline-none text-sm text-zinc-900 leading-relaxed p-6 sm:p-8 rounded-xl bg-white border border-zinc-200 shadow-md rich-text-content rich-text-content-light focus:ring-2 focus:ring-[#FF5A1F]/30 focus:border-[#FF5A1F] transition-all empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none"
          />
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 bg-[#0d0e14]/70 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{isSourceMode ? 'Mode: HTML Source Editor' : 'Mode: Visual'}</span>
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
