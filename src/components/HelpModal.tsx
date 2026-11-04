import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  Keyboard,
  Calendar,
  Layers,
  Palette,
  FileSpreadsheet,
  FileDown,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpCategory =
  | 'quickstart'
  | 'grid-excel'
  | 'gantt-cpm'
  | 'calendar-weights'
  | 'themes-typography'
  | 'import-export'
  | 'shortcuts'
  | 'architecture';

interface CategoryItem {
  id: HelpCategory;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'quickstart', label: 'Quick Start Guide', icon: BookOpen },
  { id: 'grid-excel', label: 'Spreadsheet Grid & Excel Paste', icon: FileSpreadsheet, badge: 'Popular' },
  { id: 'gantt-cpm', label: 'Gantt Chart & CPM Scheduling', icon: Layers },
  { id: 'calendar-weights', label: 'Calendar, Weights & Baselines', icon: Calendar },
  { id: 'themes-typography', label: 'Themes & Custom Palette Studio', icon: Palette, badge: 'New' },
  { id: 'import-export', label: 'Import, Native WBS & PDF Export', icon: FileDown },
  { id: 'shortcuts', label: 'Keyboard Shortcuts Sheet', icon: Keyboard },
  { id: 'architecture', label: 'Client-Side Privacy & Offline', icon: ShieldCheck }
];

const SEARCH_DOCS = [
  {
    category: 'grid-excel' as HelpCategory,
    title: 'Copy & Paste from Microsoft Excel / Google Sheets',
    snippet: 'Copy multi-column ranges (Name, Duration, Start, End, Progress, Man-Hours) from Excel and paste directly with Ctrl+V. Automatically inserts new task rows if needed.',
    keywords: 'excel copy paste clipboard google sheets columns import rows ctrl+v'
  },
  {
    category: 'gantt-cpm' as HelpCategory,
    title: 'CPM Dependency Shorthand & Lag Syntax',
    snippet: 'Enter dependencies directly: 2FS, 3SS+2d, 4FF-1d, 1FS, 2SS+1d. Supports FS, SS, FF, SF relationships with positive lag and negative lead.',
    keywords: 'cpm lag lead dependency predecessor relationships fs ss ff sf syntax'
  },
  {
    category: 'gantt-cpm' as HelpCategory,
    title: 'Zero-Duration Milestones & Same-Day Scheduling',
    snippet: 'Tasks with 0 d duration render as milestone diamonds (◆). Finish-to-Start successors start on the exact same date with zero lag.',
    keywords: 'milestone diamond zero duration 0d same day schedule'
  },
  {
    category: 'gantt-cpm' as HelpCategory,
    title: 'Downward-Bracket Summary Bars',
    snippet: 'Summary tasks feature roof bars with classic downward triangular brackets at start and finish dates, clearly distinguishing rollups from standard activities.',
    keywords: 'summary downward bracket roof triangle rollup wbs'
  },
  {
    category: 'gantt-cpm' as HelpCategory,
    title: 'Critical Path Method & Alerts',
    snippet: 'Toggle Critical Path in ribbon to highlight zero float tasks and delay chains in vivid red.',
    keywords: 'critical path red float late alert delay'
  },
  {
    category: 'grid-excel' as HelpCategory,
    title: 'Column Width Resizing & Smart Auto-Fit',
    snippet: 'Drag column dividers to resize, double-click divider to auto-fit to content, double-click # to auto-fit all columns, or click Auto-Fit in ribbon.',
    keywords: 'autofit auto-fit column resize width header divider double-click'
  },
  {
    category: 'grid-excel' as HelpCategory,
    title: 'Task Notes Indicator & Instant Tooltip',
    snippet: 'Any task with notes shows a memo icon (📝). Hover your cursor over the icon to view an instant formatted preview tooltip.',
    keywords: 'notes memo tooltip preview icon hover'
  },
  {
    category: 'calendar-weights' as HelpCategory,
    title: 'Working Days Calendar & Holiday Exceptions',
    snippet: 'Configure 4-day, 5-day, or 6-day work weeks in Settings. Add project holidays and shutdowns to skip non-working days.',
    keywords: 'calendar working days hours work week holidays shutdown'
  },
  {
    category: 'calendar-weights' as HelpCategory,
    title: 'Activity Weight Engine (Duration vs Man-Hour P6 Standard)',
    snippet: 'Choose between Time-Based Duration, Primavera P6 Man-Hour Based, or Equal Weight for rolling up progress % to parent summaries.',
    keywords: 'weight manhour duration p6 earned value progress rollup formula'
  },
  {
    category: 'calendar-weights' as HelpCategory,
    title: 'Project Baselines & Slippage Variance',
    snippet: 'Freeze baseline snapshots (Contract Award, Baseline 1). Toggle dual-bar display on Gantt to track schedule variance in days.',
    keywords: 'baseline snapshot dual-bar variance delay slippage'
  },
  {
    category: 'themes-typography' as HelpCategory,
    title: 'Custom Palette Studio & Live Visualizer',
    snippet: 'Create your own color palette with live visualizer. Customize task bars, summaries, milestones, critical paths, headers, and surfaces.',
    keywords: 'theme custom palette studio color live visualizer clone hex'
  },
  {
    category: 'import-export' as HelpCategory,
    title: 'Vector PDF Export with Intact Dependencies',
    snippet: 'Export multi-page, multi-scale PDF drawings (Letter, Tabloid 11x17, Legal, A4, A3) with unbroken orthogonal CPM lines and vector summary brackets.',
    keywords: 'pdf export print tabloid letter landscape vector orthogonal'
  },
  {
    category: 'shortcuts' as HelpCategory,
    title: 'Keyboard Shortcuts Reference Sheet',
    snippet: 'Full lookup table for Arrow Keys, Enter, F2, Insert, Delete, Alt+Right (Indent), Alt+Left (Outdent), Ctrl+Z (Undo), Ctrl+Y (Redo), F1 (Help).',
    keywords: 'shortcuts hotkeys keys indent outdent undo redo insert delete f1'
  },
  {
    category: 'architecture' as HelpCategory,
    title: 'Client-Side Privacy & Offline Architecture',
    snippet: '100% client-side in the browser. Zero server dependency. Your schedule data never leaves your computer and works completely offline.',
    keywords: 'privacy offline client server local security standalone'
  }
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return SEARCH_DOCS.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.snippet.toLowerCase().includes(q) ||
        doc.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">PathMaster Help & Documentation</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 font-semibold">
                  v1.0 • P6 & MSP Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete user guide, scheduling engine reference, and shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Help (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Strip */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-3 shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search documentation (e.g., 'Excel paste', 'Lag syntax', 'Milestones', 'Critical path', 'Shortcuts')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Press F1 anytime</span>
        </div>

        {/* Main Content Splitter */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-60 sm:w-64 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0 hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
              Documentation Topics
            </span>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{cat.label}</span>
                  </div>
                  {cat.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Documentation Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-700 text-xs leading-relaxed">
            
            {searchQuery.trim() ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Search Results for "{searchQuery}" ({searchResults.length})
                  </h4>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Clear search & return
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-2.5">
                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveCategory(item.category);
                          setSearchQuery('');
                        }}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-700">{item.title}</span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                            {CATEGORIES.find(c => c.id === item.category)?.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{item.snippet}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Info className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">No documentation matches found for "{searchQuery}".</p>
                    <p className="text-[11px] text-slate-400">Try searching for broader terms like "excel", "dates", "predecessor", "milestone", or "pdf".</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 1. QUICK START */}
                {activeCategory === 'quickstart' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Welcome to PathMaster</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        PathMaster is a professional project scheduling and WBS management suite engineered to deliver the analytical discipline of <strong>Oracle Primavera P6</strong> and <strong>Microsoft Project</strong> with the responsiveness of modern web software.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">1</span>
                          <span>Left: Spreadsheet Grid</span>
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Dense data table for managing WBS codes, activity names, durations, dates, progress, dependencies, and man-hours. Supports direct in-cell editing and full Excel clipboard pasting.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">2</span>
                          <span>Right: Interactive SVG Gantt</span>
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          High-performance timeline with drag-and-drop bar movement, duration resize handles, dependency connection lines, 0-day milestone diamonds, and downward bracket summary bars.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Essential Workflow in 4 Steps:</h5>
                      <ol className="list-decimal list-inside space-y-2 text-slate-600">
                        <li><strong className="text-slate-900">Add Tasks:</strong> Click <strong>+ Add</strong> in the ribbon or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Insert</kbd> to add new activities.</li>
                        <li><strong className="text-slate-900">Build Your WBS Hierarchy:</strong> Select a task and press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Alt + →</kbd> to Indent or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Alt + ←</kbd> to Outdent. Summary tasks automatically roll up duration, dates, and man-hours.</li>
                        <li><strong className="text-slate-900">Link Predecessors:</strong> Type dependencies like <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700 font-semibold">2FS</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700 font-semibold">3SS+2d</code> directly into the Predecessors column, or drag links between bars on the Gantt chart.</li>
                        <li><strong className="text-slate-900">Save Your Work:</strong> Click the standalone <strong>Save</strong> button or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Ctrl + S</kbd> to save your project as a native human-readable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.wbs</code> file.</li>
                      </ol>
                    </div>

                    <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-start space-x-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-indigo-900">
                        <strong>Tip:</strong> Double-click any column divider in the table header or click the <strong>Auto-Fit</strong> button in the ribbon to automatically size columns to their widest content!
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. SPREADSHEET GRID & EXCEL PASTE */}
                {activeCategory === 'grid-excel' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Spreadsheet Grid & Direct Excel Copy-Paste</h4>
                      <p className="text-slate-600 text-xs">
                        PathMaster features a high-density keyboard-driven data grid supporting multi-column pasting from Microsoft Excel and Google Sheets.
                      </p>
                    </div>

                    {/* Excel Clipboard Feature */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                      <span className="font-bold text-emerald-950 text-xs flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Copy-Pasting from Excel or Google Sheets</span>
                      </span>
                      <p className="text-[11px] text-emerald-900 leading-relaxed">
                        You can copy tabular data directly from Microsoft Excel or Google Sheets and paste it into PathMaster (<kbd className="px-1.5 py-0.5 rounded bg-white border border-emerald-300 font-mono text-[10px]">Ctrl + V</kbd>):
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-900 pl-1">
                        <li><strong>Multi-Column Support:</strong> Copy columns like Task Name, Duration, Start Date, End Date, Progress, and Planned Man-Hours in one operation.</li>
                        <li><strong>Automatic Row Expansion:</strong> If your pasted table contains more rows than currently exist in PathMaster, the engine automatically creates and inserts the necessary task rows.</li>
                        <li><strong>Smart Predecessor Parsing:</strong> Pasting dependency shorthand (e.g. <code className="bg-white px-1 rounded font-mono">2FS, 3SS+2d</code>) validates logic, checks for cycles, and recalculates the schedule instantly.</li>
                      </ul>
                    </div>

                    {/* Multi-Task Selection */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Multi-Task Selection & Batch Operations</h5>
                      <p className="text-slate-600 text-xs">
                        Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Shift</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Ctrl</kbd> while clicking tasks to select multiple rows simultaneously:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                        <li><strong>Batch Indent / Outdent:</strong> Move an entire group of tasks deeper or shallower in the WBS hierarchy at once.</li>
                        <li><strong>Batch Paste:</strong> Select multiple tasks and paste a single value (e.g. duration or progress %) across all selected rows.</li>
                        <li><strong>Batch Delete:</strong> Delete multiple tasks and their subtrees in one stroke.</li>
                      </ul>
                    </div>

                    {/* Column Resizing and Auto-Fit */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Column Resizing & Smart Auto-Fit</h5>
                      <ul className="space-y-1.5 text-slate-600">
                        <li><strong>Drag Divider:</strong> Hover between column headers and drag to resize custom widths. Widths persist automatically in LocalStorage.</li>
                        <li><strong>Double-Click Divider:</strong> Instantly auto-fits that specific column to match its widest content.</li>
                        <li><strong>Double-Click Row Header (<code className="font-mono">#</code>):</strong> Auto-fits all grid columns simultaneously.</li>
                        <li><strong>Context Menu:</strong> Right-click any column header to access <em>Auto-fit Column</em>, <em>Auto-fit All</em>, or <em>Reset to Default Widths</em>.</li>
                      </ul>
                    </div>

                    {/* Task Notes Indicator */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                      <span className="text-base">📝</span>
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">Task Notes Indicator & Instant Tooltip</span>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          Any task with notes displays a memo icon (<code className="font-mono">📝</code>) beside its name. Hover your cursor over the icon to view an instant formatted preview tooltip without opening any modal dialog!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. GANTT CHART & CPM SCHEDULING */}
                {activeCategory === 'gantt-cpm' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Gantt Chart & Critical Path Method (CPM)</h4>
                      <p className="text-slate-600 text-xs">
                        PathMaster includes a rigorous forward-pass CPM scheduling engine compliant with Oracle Primavera P6 standards.
                      </p>
                    </div>

                    {/* CPM Relationship Shorthand Table */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Dependency Shorthand & Lag Syntax</h5>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2">Syntax</th>
                              <th className="px-3 py-2">Relationship Type</th>
                              <th className="px-3 py-2">Description & Example</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-600">
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">2 or 2FS</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">Finish-to-Start</td>
                              <td className="px-3 py-2">Successor starts after Row 2 finishes (Standard default).</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">2FS+5d</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">FS with Positive Lag</td>
                              <td className="px-3 py-2">Successor starts 5 working days after Row 2 finishes.</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">3SS+2d</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">Start-to-Start</td>
                              <td className="px-3 py-2">Successor starts 2 working days after Row 3 starts.</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">4FF</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">Finish-to-Finish</td>
                              <td className="px-3 py-2">Successor finishes on the same day as Row 4.</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">4FF-2d</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">FF with Negative Lead</td>
                              <td className="px-3 py-2">Successor finishes 2 working days before Row 4 finishes.</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">1FS, 2SS+1d</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">Multiple Predecessors</td>
                              <td className="px-3 py-2">Comma-separated list (supports up to 10 dependencies per task).</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Milestones and Summary Bars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rotate-45 bg-slate-800 inline-block"></span>
                          <span>Zero-Duration Milestones</span>
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Tasks with <code className="font-mono">0 d</code> duration render as diamonds (<code className="font-mono">◆</code>). FS successors of a milestone start on the <em>exact same date</em> (with 0 lag), adhering to strict CPM standards.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <span className="text-slate-700">▼</span>
                          <span>Downward-Bracket Summary Bars</span>
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Summary tasks feature roof bars with classic MSP/P6 downward triangular brackets at start and finish dates, clearly distinguishing rollups from standard activities.
                        </p>
                      </div>
                    </div>

                    {/* Critical Path and Halo Masks */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Critical Path & Visual Aids</h5>
                      <ul className="space-y-1.5 text-slate-600">
                        <li><strong>Critical Path Toggle:</strong> Click <strong>Critical Path: ON/OFF</strong> in the top ribbon to highlight activities with zero float in vivid red.</li>
                        <li><strong>Collision-Free Label Halo Mask:</strong> Task labels next to timeline bars feature dynamic background pill masks preventing overlap with CPM dependency lines.</li>
                        <li><strong>Interactive Connection Badges:</strong> Click any connection line on the Gantt chart to edit relationship types and lag values.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 4. CALENDAR, WEIGHTS & BASELINES */}
                {activeCategory === 'calendar-weights' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Calendar, Working Days, Weights & Baselines</h4>
                      <p className="text-slate-600 text-xs">
                        Configure schedule calculation rules, project working days, and progress rollups in the <strong>Settings</strong> dialog.
                      </p>
                    </div>

                    {/* Working Days & Holidays */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Calendar & Work Week</h5>
                      <p className="text-slate-600 text-xs">
                        Located in <strong>Settings → Calendar & Work Week</strong>:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                        <li><strong>Flexible Work Weeks:</strong> Check/uncheck individual days (Monday–Sunday) to configure 4-day, 5-day, or 6-day jobsite calendars. Non-working days are automatically shaded on the Gantt chart.</li>
                        <li><strong>Work Hours / Day:</strong> Set daily working hours (default 8) used for man-hour rollups.</li>
                        <li><strong>Holidays & Shutdowns:</strong> Add specific statutory holiday dates. Durations automatically skip these non-working days.</li>
                      </ul>
                    </div>

                    {/* Activity Weight Engine */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Activity Weight Computation Method</h5>
                      <p className="text-slate-600 text-xs">
                        Choose how individual activities contribute to parent summary progress:
                      </p>
                      <div className="space-y-2 pt-1">
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 text-xs">1. Time-Based (Duration)</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Weights are proportional to working day duration: <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">Wi = (Duration / Total Duration) × 100</code>.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 text-xs">2. Man-Hour Based (Primavera P6 Standard)</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Weights are computed from Planned Man-Hours: <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">Wi = (PlannedMH / Total PlannedMH) × 100</code>.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 text-xs">3. Equal Weight</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Every activity carries equal weight (<code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">1 / N</code>).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Baselines */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Baselines & Dual-Bar Variance Tracking</h5>
                      <ul className="space-y-1.5 text-slate-600">
                        <li><strong>Snapshot Baselines:</strong> Click <strong>Baselines...</strong> in the ribbon to freeze and name contract baselines (e.g., <em>Baseline 1</em>, <em>Contract Award</em>).</li>
                        <li><strong>Dual-Bar Gantt Display:</strong> Toggle <strong>Baseline: ON/OFF</strong> to display underlying baseline bars below current schedule bars.</li>
                        <li><strong>Variance Calculation:</strong> Automatically calculates schedule slippage in days (<code className="font-mono text-[10px]">EndDate - BaselineEndDate</code>), highlighted in red for delays.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 5. THEMES & CUSTOM PALETTE STUDIO */}
                {activeCategory === 'themes-typography' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Themes & Custom Palette Studio</h4>
                      <p className="text-slate-600 text-xs">
                        PathMaster includes 5 built-in engineering color palettes and a fully customizable <strong>Custom Palette Studio</strong> with a live visualizer.
                      </p>
                    </div>

                    {/* Built-in Palettes */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">5 Pre-Configured Palettes</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 block">Modern Enterprise</span>
                          <span className="text-[10px] text-slate-500">SaaS standard with deep navy ribbon and royal blue bars.</span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 block">Construction & Engineering</span>
                          <span className="text-[10px] text-slate-500">Industrial concrete grays, structural blue-grey bars, and safety orange signals.</span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 block">High-Contrast Data</span>
                          <span className="text-[10px] text-slate-500">Primavera P6 inspired forest green bars with crimson critical path.</span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                          <span className="font-bold text-slate-900 block">Industrial Steel & Amber</span>
                          <span className="text-[10px] text-slate-500">Dark graphite header, steel summary bars, and construction amber alerts.</span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                          <span className="font-bold text-slate-900 block">Precision Dark Mode</span>
                          <span className="text-[10px] text-slate-500">Low-glare deep obsidian surfaces engineered for site trailers and night shifts.</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Palette Studio */}
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                      <span className="font-bold text-indigo-950 text-xs flex items-center space-x-1.5">
                        <Palette className="w-4 h-4 text-indigo-600" />
                        <span>Create Your Own Color Palette</span>
                      </span>
                      <p className="text-[11px] text-indigo-900 leading-relaxed">
                        Open <strong>Settings → Appearance & Themes</strong> and click <strong>Edit Colors</strong> on the Custom Palette card:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-900 pl-1">
                        <li><strong>Live Visualizer:</strong> See changes reflected immediately on summary bars, progress bars, milestone diamonds, and data tables.</li>
                        <li><strong>1-Click Preset Cloner:</strong> Copy any existing theme into your custom palette and fine-tune just the colors you want.</li>
                        <li><strong>Full Color Freedom:</strong> Customize task bars, progress fills, milestones, headers, borders, and surfaces with hex inputs and OS color pickers.</li>
                        <li><strong>Persistence:</strong> Custom palettes are auto-saved to your project file and carried into PDF exports.</li>
                      </ul>
                    </div>

                    {/* Typography */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Enterprise Typography</h5>
                      <p className="text-slate-600 text-xs">
                        Switch fonts instantly using the <strong>Font dropdown in the Action Bar</strong> or in <strong>Settings → Appearance</strong>:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <span className="p-2 rounded border bg-white font-semibold">Segoe UI</span>
                        <span className="p-2 rounded border bg-white font-semibold">Calibri</span>
                        <span className="p-2 rounded border bg-white font-semibold">Verdana</span>
                        <span className="p-2 rounded border bg-white font-semibold">Inter</span>
                        <span className="p-2 rounded border bg-white font-semibold">Barlow (DIN)</span>
                        <span className="p-2 rounded border bg-white font-semibold">Arial / System</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. IMPORT, EXPORT & PDF */}
                {activeCategory === 'import-export' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Import, Native WBS & Vector PDF Export</h4>
                      <p className="text-slate-600 text-xs">
                        PathMaster provides comprehensive interoperability with Excel, Microsoft Project, and vector print publishing.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs">💾 Native .wbs Project Files</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Saves your entire project schedule—including tasks, WBS hierarchy, calendars, custom working days, baselines, activity weights, and custom palettes—as a clean, human-readable JSON file.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs">📊 Excel Import & Export (.xlsx)</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Export structured spreadsheets with automated hierarchy styling, or import existing schedules from Excel spreadsheets with automatic column mapping.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs">📁 Microsoft Project XML (.xml)</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Open schedules exported from Microsoft Project XML format with full predecessor dependencies, durations, and calendars preserved.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1.5">
                        <span className="font-bold text-indigo-950 text-xs flex items-center space-x-1.5">
                          <FileDown className="w-4 h-4 text-indigo-600" />
                          <span>Advanced Vector PDF Export Engine</span>
                        </span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Click <strong>File → Export PDF...</strong> to produce executive-grade schedule drawings:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                          <li><strong>Paper Sizes:</strong> Letter (8.5x11"), 11x17 Tabloid, Legal, A4, and A3.</li>
                          <li><strong>Timescale Grouping:</strong> Export by Days, Weeks, or Months.</li>
                          <li><strong>Exact Orthogonal Lines:</strong> Vector SVG CPM dependency lines snap to exact task edges without broken joints.</li>
                          <li><strong>Vector Summary Brackets:</strong> Summary tasks render crisp downward triangles (<code className="font-mono">▼</code>).</li>
                          <li><strong>Scope Filtering:</strong> Filter by Task ID range (e.g. 1 to 25) or export all activities.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. KEYBOARD SHORTCUTS */}
                {activeCategory === 'shortcuts' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Keyboard Shortcuts Reference</h4>
                      <p className="text-slate-600 text-xs">
                        Modeled after standard Microsoft Project and Excel keybindings for rapid data entry.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">Key Binding</th>
                            <th className="px-3.5 py-2.5">Action</th>
                            <th className="px-3.5 py-2.5">Context</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-600">
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Arrow Keys (↑ ↓ ← →)</td>
                            <td className="px-3.5 py-2">Navigate between cells in the spreadsheet grid</td>
                            <td className="px-3.5 py-2 text-slate-400">Grid Navigation</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Enter</td>
                            <td className="px-3.5 py-2">Enter in-cell edit mode / Commit edit and move to next row</td>
                            <td className="px-3.5 py-2 text-slate-400">Cell Editing</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">F2 or Double-Click</td>
                            <td className="px-3.5 py-2">Edit selected cell without overwriting existing content</td>
                            <td className="px-3.5 py-2 text-slate-400">Cell Editing</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Tab / Shift + Tab</td>
                            <td className="px-3.5 py-2">Move to next / previous column in row</td>
                            <td className="px-3.5 py-2 text-slate-400">Grid Navigation</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Ctrl + C</td>
                            <td className="px-3.5 py-2">Copy active cell value to clipboard</td>
                            <td className="px-3.5 py-2 text-slate-400">Clipboard</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Ctrl + V</td>
                            <td className="px-3.5 py-2">Paste tabular data from clipboard (supports Excel & Google Sheets)</td>
                            <td className="px-3.5 py-2 text-slate-400">Clipboard</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Ctrl + Z</td>
                            <td className="px-3.5 py-2">Undo last operation (up to 50 history steps)</td>
                            <td className="px-3.5 py-2 text-slate-400">History</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Ctrl + Y / Ctrl + Shift + Z</td>
                            <td className="px-3.5 py-2">Redo undone operation</td>
                            <td className="px-3.5 py-2 text-slate-400">History</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Alt + →</td>
                            <td className="px-3.5 py-2"><strong>Indent</strong> selected task(s) into child level</td>
                            <td className="px-3.5 py-2 text-slate-400">WBS Structure</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Alt + ←</td>
                            <td className="px-3.5 py-2"><strong>Outdent</strong> selected task(s) into parent level</td>
                            <td className="px-3.5 py-2 text-slate-400">WBS Structure</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Alt + T</td>
                            <td className="px-3.5 py-2"><strong>Focus Today</strong>: scroll Gantt timeline to today's date</td>
                            <td className="px-3.5 py-2 text-slate-400">Gantt Navigation</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Alt + F (or Ctrl + Shift + F5)</td>
                            <td className="px-3.5 py-2"><strong>Focus Task</strong>: scroll timeline to selected task bar and row</td>
                            <td className="px-3.5 py-2 text-slate-400">Gantt Navigation</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Insert</td>
                            <td className="px-3.5 py-2">Insert a new task directly below current selection</td>
                            <td className="px-3.5 py-2 text-slate-400">Task Management</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Delete</td>
                            <td className="px-3.5 py-2">Delete selected task(s) and their subtasks</td>
                            <td className="px-3.5 py-2 text-slate-400">Task Management</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Ctrl + S</td>
                            <td className="px-3.5 py-2">Save project as native .wbs file</td>
                            <td className="px-3.5 py-2 text-slate-400">File</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">F1</td>
                            <td className="px-3.5 py-2">Open Help & Documentation dialog</td>
                            <td className="px-3.5 py-2 text-slate-400">Help</td>
                          </tr>
                          <tr>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">Escape</td>
                            <td className="px-3.5 py-2">Cancel in-cell edit or close open modal dialog</td>
                            <td className="px-3.5 py-2 text-slate-400">General</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. CLIENT-SIDE ARCHITECTURE & PRIVACY */}
                {activeCategory === 'architecture' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">Client-Side Privacy & Offline Architecture</h4>
                      <p className="text-slate-600 text-xs">
                        How PathMaster ensures enterprise-grade security, zero server dependencies, and offline reliability.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                        <span className="font-bold text-emerald-950 text-xs flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>100% Client-Side Execution — Zero Server Dependency</span>
                        </span>
                        <p className="text-emerald-900 text-[11px] leading-relaxed">
                          PathMaster runs entirely within your web browser or desktop container. All forward-pass scheduling math, calendar holiday skipping, WBS rollups, Excel parsing, and vector PDF rendering occur locally on your device in pure client-side JavaScript.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                          <span className="font-bold text-slate-900 text-xs">🔒 100% Data Privacy</span>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Your project schedules, employee names, costs, and man-hours are never transmitted across the network to external servers or cloud databases.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                          <span className="font-bold text-slate-900 text-xs">⚡ 60 FPS Virtual Scrolling</span>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Powered by DOM virtual windowing, PathMaster renders only active viewport rows, scaling smoothly to <strong>10,000+ tasks</strong> with zero UI lag.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 text-xs">✈️ Fully Offline Capable</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Once loaded in your browser or packaged as a desktop app via Electron, you can create, edit, calculate, and print schedules on remote jobsites or site trailers without an internet connection.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>PathMaster Professional Scheduling Suite</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
