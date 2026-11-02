import React, { useRef, useState, useEffect } from 'react';
import type { ProjectSettings, WeightMode, ColorTheme } from '../types/project';
import {
  FilePlus,
  FolderOpen,
  Save,
  FileSpreadsheet,
  FileDown,
  BookmarkCheck,
  Settings,
  Scale,
  UploadCloud,
  Flame,
  ChevronDown,
  Palette
} from 'lucide-react';

interface ToolbarProps {
  settings: ProjectSettings;
  onUpdateSettings: (updates: Partial<ProjectSettings>) => void;
  onNewProject: () => void;
  onSaveWBS: () => void;
  onLoadWBS: (file: File) => void;
  onImportMSP: (file: File) => void;
  onImportExcel: (file: File) => void;
  onExportExcel: () => void;
  onOpenExportModal: () => void;
  onOpenBaselineModal: () => void;
  onOpenSettingsModal: () => void;
  totalTasks: number;
  overallProgress: number;
  totalPlannedMH: number;
  totalActualMH: number;
  finishDate: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  onUpdateSettings,
  onNewProject,
  onSaveWBS,
  onLoadWBS,
  onImportMSP,
  onImportExcel,
  onExportExcel,
  onOpenExportModal,
  onOpenBaselineModal,
  onOpenSettingsModal,
  totalTasks,
  overallProgress,
  totalPlannedMH,
  totalActualMH,
  finishDate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mspFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const fileButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const isSiteDrawing = settings.colorTheme === 'site-drawing';

  const toggleFileMenu = () => {
    if (!isFileMenuOpen && fileButtonRef.current) {
      const rect = fileButtonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsFileMenuOpen((prev) => !prev);
  };

  // Close dropdown on click outside, Escape, resize or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        fileMenuRef.current &&
        !fileMenuRef.current.contains(target) &&
        fileButtonRef.current &&
        !fileButtonRef.current.contains(target)
      ) {
        setIsFileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFileMenuOpen(false);
    };
    const handleRepositionOrClose = () => {
      setIsFileMenuOpen(false);
    };

    if (isFileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleRepositionOrClose);
      window.addEventListener('scroll', handleRepositionOrClose, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleRepositionOrClose);
      window.removeEventListener('scroll', handleRepositionOrClose, true);
    };
  }, [isFileMenuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadWBS(file);
      e.target.value = '';
    }
  };

  const handleMspFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportMSP(file);
      e.target.value = '';
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
      e.target.value = '';
    }
  };

  return (
    <header className={`text-white shadow-xs no-print select-none border-b ${
      isSiteDrawing
        ? "bg-[#37434D] border-[#29323A] font-['Barlow',sans-serif]"
        : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wbs,.json"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mspFileInputRef}
        type="file"
        accept=".xml,.mpp"
        onChange={handleMspFileChange}
        className="hidden"
      />
      <input
        ref={excelFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleExcelFileChange}
        className="hidden"
      />

      {/* Top Bar: Brand, Project Name, and KPI summary (Responsive) */}
      <div className={`min-h-12 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b ${
        isSiteDrawing ? 'border-[#29323A]/80' : 'border-slate-800/80'
      }`}>
        {/* Brand & Project Name Input */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-md font-bold text-white text-sm sm:text-base shrink-0 tracking-tight ${
            isSiteDrawing ? 'bg-[#E8590C]' : 'bg-indigo-600'
          }`}>
            P
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-white truncate">PathMaster</span>
              {isSiteDrawing && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-[#29323A] text-slate-300 rounded border border-slate-600/60">
                  Site Drawing
                </span>
              )}
            </div>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => onUpdateSettings({ name: e.target.value })}
              className="text-[11px] sm:text-xs text-slate-200 bg-transparent hover:bg-black/20 focus:bg-black/30 px-1 py-0.5 rounded outline-none border border-transparent focus:border-slate-500 transition-colors w-36 sm:w-56 md:w-72 font-semibold truncate"
              placeholder="Project Name..."
            />
          </div>
        </div>

        {/* Project KPI Badges */}
        <div className="flex items-center space-x-3 sm:space-x-5 text-xs text-slate-300 overflow-x-auto">
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {isSiteDrawing ? 'Tasks' : 'Tasks'}
            </span>
            <span className={`font-bold text-white text-xs sm:text-sm ${isSiteDrawing ? 'tabular-nums' : 'font-mono'}`}>
              {totalTasks}
            </span>
          </div>
          <div className={`h-5 sm:h-6 w-px ${isSiteDrawing ? 'bg-[#4A5864]' : 'bg-slate-800'}`}></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {isSiteDrawing ? 'Overall progress' : 'Progress'}
            </span>
            <span className={`font-bold text-xs sm:text-sm ${
              isSiteDrawing ? 'text-white tabular-nums' : 'text-emerald-400 font-mono'
            }`}>
              {overallProgress}%
            </span>
          </div>
          <div className={`hidden sm:block h-6 w-px ${isSiteDrawing ? 'bg-[#4A5864]' : 'bg-slate-800'}`}></div>
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {isSiteDrawing ? 'Man-hours' : 'Man-Hours'}
            </span>
            <span className={`text-slate-200 text-xs ${isSiteDrawing ? 'tabular-nums' : 'font-mono'}`}>
              <strong className={isSiteDrawing ? 'text-[#E8590C] font-bold' : 'text-cyan-400 font-bold'}>
                {totalActualMH}
              </strong> / {totalPlannedMH} MH
            </span>
          </div>
          <div className={`h-5 sm:h-6 w-px ${isSiteDrawing ? 'bg-[#4A5864]' : 'bg-slate-800'}`}></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {isSiteDrawing ? 'Finish date' : 'Finish Date'}
            </span>
            <span className={`font-bold text-white text-xs ${isSiteDrawing ? 'tabular-nums' : 'font-mono'}`}>
              {finishDate || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Ribbon Action Tools */}
      <div className={`h-10 px-3 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 ${
        isSiteDrawing ? 'bg-[#29323A]' : 'bg-slate-800/95'
      }`}>
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Unified File & Project Dropdown */}
          <div className="relative">
            <button
              ref={fileButtonRef}
              onClick={toggleFileMenu}
              className={`px-2.5 py-1 rounded text-slate-200 hover:bg-slate-700/80 font-medium flex items-center space-x-1 transition-colors ${
                isFileMenuOpen ? 'bg-slate-700 text-white' : ''
              }`}
              title="File & Project Management Menu"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>File</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {isFileMenuOpen && (
              <div
                ref={fileMenuRef}
                style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
                className={`fixed w-60 border rounded-lg shadow-2xl py-1.5 z-50 text-xs ${
                  isSiteDrawing
                    ? 'bg-[#2B353D] border-[#4A5864] text-slate-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {/* Project File Actions */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Project
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onNewProject();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open (.wbs)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onSaveWBS();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <Save className={`w-3.5 h-3.5 ${isSiteDrawing ? 'text-[#E8590C]' : 'text-indigo-400'}`} />
                  <span className="font-semibold text-white">Save Project (.wbs)</span>
                </button>

                <div className="h-px bg-slate-700/80 my-1"></div>

                {/* Import Options */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Import Schedule
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    mspFileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  <span>Microsoft Project (.xml, .mpp)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    excelFileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Excel / CSV (.xlsx, .csv)</span>
                </button>

                <div className="h-px bg-slate-700/80 my-1"></div>

                {/* Export Options */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Export
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onExportExcel();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700/80 text-left transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export PDF / PNG Image...</span>
                </button>
              </div>
            )}
          </div>

          {/* Standalone 1-Click Primary Save Button (Safety orange in Site Drawing, Indigo in Classic) */}
          <button
            onClick={onSaveWBS}
            className={`px-3 py-1 rounded font-semibold flex items-center space-x-1.5 transition-colors shadow-xs ${
              isSiteDrawing
                ? 'bg-[#E8590C] hover:bg-[#D04D09] text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title="Save Project as Native .wbs File (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-white/90" />
            <span>Save</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Baseline Actions */}
          <button
            onClick={onOpenBaselineModal}
            className="px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-700/80 font-medium flex items-center space-x-1.5 transition-colors"
            title="Manage Baseline Snapshots"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Baselines...</span>
          </button>

          {/* Baseline Display Toggle (Consistent ON/OFF styling) */}
          <button
            onClick={() => onUpdateSettings({ showBaseline: !settings.showBaseline })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
              settings.showBaseline
                ? isSiteDrawing
                  ? 'bg-[#9BA5AD]/25 border-[#9BA5AD] text-slate-100 shadow-2xs'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-2xs'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            title="Toggle Baseline Bars on Gantt Chart"
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${
              settings.showBaseline
                ? isSiteDrawing ? 'text-slate-200' : 'text-amber-400'
                : 'text-slate-500'
            }`} />
            <span>
              Baseline: <strong className={
                settings.showBaseline
                  ? isSiteDrawing ? 'text-slate-100' : 'text-amber-300'
                  : 'text-slate-400'
              }>{settings.showBaseline ? 'ON' : 'OFF'}</strong>
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Critical Path Toggle (Red #C62828 in Site Drawing) */}
          <button
            onClick={() => onUpdateSettings({ showCriticalPath: !settings.showCriticalPath })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
              settings.showCriticalPath
                ? isSiteDrawing
                  ? 'bg-[#C62828]/25 border-[#C62828] text-rose-200 shadow-2xs'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-2xs'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            title="Highlight Critical Path (tasks and dependencies with zero float)"
          >
            <Flame className={`w-3.5 h-3.5 ${settings.showCriticalPath ? (isSiteDrawing ? 'text-[#C62828]' : 'text-rose-400') : 'text-slate-500'}`} />
            <span>
              Critical Path: <strong className={settings.showCriticalPath ? (isSiteDrawing ? 'text-rose-200' : 'text-rose-300') : 'text-slate-400'}>
                {settings.showCriticalPath ? 'ON' : 'OFF'}
              </strong>
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Activity Weight Mode Picker */}
          <div className="flex items-center space-x-1.5 bg-black/25 px-2 py-0.5 rounded border border-slate-700/80 text-slate-300">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Weight:</span>
            <select
              value={settings.weightMode}
              onChange={(e) => onUpdateSettings({ weightMode: e.target.value as WeightMode })}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer font-medium"
            >
              <option value="duration" className="bg-slate-800 text-white">Time (Duration)</option>
              <option value="manhour" className="bg-slate-800 text-white">Man-Hour</option>
              <option value="equal" className="bg-slate-800 text-white">Equal</option>
            </select>
          </div>
        </div>

        {/* Right Settings & Color Theme Toggle */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Theme Switcher */}
          <button
            onClick={() => {
              const nextTheme: ColorTheme = isSiteDrawing ? 'classic' : 'site-drawing';
              onUpdateSettings({ colorTheme: nextTheme });
            }}
            className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 transition-colors border ${
              isSiteDrawing
                ? 'bg-[#E8590C]/20 border-[#E8590C]/60 text-orange-200 hover:bg-[#E8590C]/30'
                : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
            title={`Current Theme: ${isSiteDrawing ? 'Site Drawing' : 'Classic'}. Click to toggle.`}
          >
            <Palette className={`w-3.5 h-3.5 ${isSiteDrawing ? 'text-[#E8590C]' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Theme: <strong>{isSiteDrawing ? 'Site Drawing' : 'Classic'}</strong></span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            className="px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-700/80 font-medium flex items-center space-x-1.5 transition-colors"
            title="Project Calendar & Scheduling Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
