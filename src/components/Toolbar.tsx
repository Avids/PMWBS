import React, { useRef, useState, useEffect } from 'react';
import type { ProjectSettings, WeightMode } from '../types/project';
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
  ChevronDown
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

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFileMenuOpen(false);
    };

    if (isFileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-xs no-print select-none">
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
      <div className="min-h-12 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80">
        {/* Brand & Project Name Input */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md font-bold text-white text-sm sm:text-base shrink-0">
            W
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-white truncate">PMWBS Master</span>
            </div>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => onUpdateSettings({ name: e.target.value })}
              className="text-[11px] sm:text-xs text-slate-200 bg-transparent hover:bg-slate-800/80 focus:bg-slate-800 px-1 py-0.5 rounded outline-none border border-transparent focus:border-slate-500 transition-colors w-36 sm:w-56 md:w-72 font-semibold truncate"
              placeholder="Project Name..."
            />
          </div>
        </div>

        {/* Project KPI Badges */}
        <div className="flex items-center space-x-3 sm:space-x-5 text-xs text-slate-300 overflow-x-auto">
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tasks</span>
            <span className="font-bold text-white font-mono text-xs sm:text-sm">{totalTasks}</span>
          </div>
          <div className="h-5 sm:h-6 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Progress</span>
            <span className="font-bold text-emerald-400 font-mono text-xs sm:text-sm">{overallProgress}%</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-slate-800"></div>
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Man-Hours</span>
            <span className="font-mono text-slate-200 text-xs">
              <strong className="text-cyan-400 font-bold">{totalActualMH}</strong> / {totalPlannedMH} MH
            </span>
          </div>
          <div className="h-5 sm:h-6 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Finish Date</span>
            <span className="font-bold text-white font-mono text-xs">{finishDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* Ribbon Action Tools: Clean, unified menu with Save as the primary button */}
      <div className="h-10 px-3 bg-slate-800/95 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Unified File & Project Dropdown */}
          <div className="relative" ref={fileMenuRef}>
            <button
              onClick={() => setIsFileMenuOpen((prev) => !prev)}
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
              <div className="absolute left-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50 text-slate-200 text-xs">
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
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Standalone 1-Click Primary Save Button */}
          <button
            onClick={onSaveWBS}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Save Project as Native .wbs File (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-indigo-100" />
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
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-2xs'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            title="Toggle Baseline Bars on Gantt Chart"
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${settings.showBaseline ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>
              Baseline: <strong className={settings.showBaseline ? 'text-amber-300' : 'text-slate-400'}>{settings.showBaseline ? 'ON' : 'OFF'}</strong>
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Critical Path Toggle (Styled explicitly with ON / OFF state like Labels ON) */}
          <button
            onClick={() => onUpdateSettings({ showCriticalPath: !settings.showCriticalPath })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
              settings.showCriticalPath
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-2xs'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            title="Highlight Critical Path (tasks and dependencies with zero float)"
          >
            <Flame className={`w-3.5 h-3.5 ${settings.showCriticalPath ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>
              Critical Path: <strong className={settings.showCriticalPath ? 'text-rose-300' : 'text-slate-400'}>{settings.showCriticalPath ? 'ON' : 'OFF'}</strong>
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Activity Weight Mode Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/80 text-slate-300">
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

        {/* Right Settings */}
        <div className="flex items-center space-x-2 shrink-0">
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
