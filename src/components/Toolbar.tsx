import React, { useRef, useState, useEffect } from 'react';
import type { ProjectSettings, WeightMode } from '../types/project';
import { getTheme, SELECTABLE_THEMES, getFontFamilyCss } from '../theme/themeConfig';
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
  Check,
  Info
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
  onOpenProjectInfoModal: () => void;
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
  onOpenProjectInfoModal,
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

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const [themeMenuPos, setThemeMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const currentTheme = getTheme(settings.colorTheme, undefined, settings.customTheme);
  const isSiteDrawing = currentTheme.id === 'construction';

  const toggleFileMenu = () => {
    if (!isFileMenuOpen && fileButtonRef.current) {
      const rect = fileButtonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsFileMenuOpen((prev) => !prev);
    setIsThemeMenuOpen(false);
  };

  const toggleThemeMenu = () => {
    if (!isThemeMenuOpen && themeButtonRef.current) {
      const rect = themeButtonRef.current.getBoundingClientRect();
      setThemeMenuPos({ top: rect.bottom + 4, right: Math.max(10, window.innerWidth - rect.right) });
    }
    setIsThemeMenuOpen((prev) => !prev);
    setIsFileMenuOpen(false);
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
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(target) &&
        themeButtonRef.current &&
        !themeButtonRef.current.contains(target)
      ) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFileMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };
    const handleRepositionOrClose = () => {
      setIsFileMenuOpen(false);
      setIsThemeMenuOpen(false);
    };

    if (isFileMenuOpen || isThemeMenuOpen) {
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
  }, [isFileMenuOpen, isThemeMenuOpen]);

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
    <header
      style={{
        backgroundColor: currentTheme.headerBg,
        borderColor: currentTheme.border,
        fontFamily: getFontFamilyCss(settings.fontFamilyChoice)
      }}
      className="text-white shadow-xs no-print select-none border-b transition-colors"
    >
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
      <div className="min-h-12 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-black/20">
        {/* Brand & Project Name Input */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            style={{ backgroundColor: currentTheme.signal }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-md font-bold text-white text-sm sm:text-base shrink-0 tracking-tight"
          >
            P
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-white truncate">PathMaster</span>
              <button
                type="button"
                onClick={onOpenProjectInfoModal}
                className="text-[10px] font-semibold px-2 py-0.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded border border-white/15 flex items-center space-x-1 transition-colors cursor-pointer"
                title="Open Project Information (Name, Number, Company, Address)"
              >
                <Info className="w-3 h-3 text-cyan-300" />
                <span>Project Info</span>
              </button>
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <input
                type="text"
                value={settings.name}
                onChange={(e) => onUpdateSettings({ name: e.target.value })}
                className="text-[11px] sm:text-xs text-slate-200 bg-transparent hover:bg-black/20 focus:bg-black/30 px-1 py-0.5 rounded outline-none border border-transparent focus:border-slate-500 transition-colors w-36 sm:w-56 md:w-72 font-semibold truncate"
                placeholder="Project Name..."
                title="Project Name (Click to edit or open Project Info)"
              />
              {settings.projectNumber && (
                <span className="text-[10px] font-mono text-slate-300 bg-black/30 px-1.5 py-0.2 rounded border border-white/10 hidden sm:inline" title="Project Number">
                  #{settings.projectNumber}
                </span>
              )}
            </div>
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
      <div
        style={{
          backgroundColor: currentTheme.headerBg,
          borderColor: 'rgba(255, 255, 255, 0.12)'
        }}
        className="h-10 px-3 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2 transition-colors border-t"
      >
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Unified File & Project Dropdown */}
          <div className="relative">
            <button
              ref={fileButtonRef}
              onClick={toggleFileMenu}
              className={`px-2.5 py-1 rounded text-white font-medium flex items-center space-x-1.5 transition-colors border border-white/20 ${
                isFileMenuOpen ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20'
              }`}
              title="File & Project Management Menu"
            >
              <FolderOpen className="w-3.5 h-3.5 text-white/90" />
              <span className="font-semibold">File</span>
              <ChevronDown className="w-3 h-3 text-white/80 ml-0.5" />
            </button>

            {isFileMenuOpen && (
              <div
                ref={fileMenuRef}
                style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
                className="fixed w-60 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg shadow-2xl py-1.5 z-50 text-xs"
              >
                {/* Project File Actions */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Project
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenProjectInfoModal();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Project Information...</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onNewProject();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open (.wbs)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onSaveWBS();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <Save className={`w-3.5 h-3.5 ${isSiteDrawing ? 'text-[#E8590C]' : 'text-indigo-400'}`} />
                  <span className="font-semibold text-white">Save Project (.wbs)</span>
                </button>

                <div className="h-px bg-slate-700 my-1"></div>

                {/* Import Options */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Import Schedule
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    mspFileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  <span>Microsoft Project (.xml, .mpp)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    excelFileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Excel / CSV (.xlsx, .csv)</span>
                </button>

                <div className="h-px bg-slate-700 my-1"></div>

                {/* Export Options */}
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Export
                </div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onExportExcel();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-700 text-left transition-colors"
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
            style={{ backgroundColor: currentTheme.signal }}
            className="px-3 py-1 rounded font-bold flex items-center space-x-1.5 text-white transition-all shadow-xs hover:brightness-110 active:scale-95"
            title="Save Project as Native .wbs File (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-white" />
            <span>Save</span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-1"></div>

          {/* Baseline Actions */}
          <button
            onClick={onOpenBaselineModal}
            className="px-2.5 py-1 rounded text-white/90 hover:text-white hover:bg-white/10 font-medium flex items-center space-x-1.5 transition-colors border border-white/15 bg-white/5"
            title="Manage Baseline Snapshots"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-white/80" />
            <span>Baselines...</span>
          </button>

          {/* Baseline Display Toggle (Consistent ON/OFF styling) */}
          <button
            onClick={() => onUpdateSettings({ showBaseline: !settings.showBaseline })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
              settings.showBaseline
                ? 'bg-amber-500/25 border-amber-400/90 text-amber-200 shadow-2xs'
                : 'bg-black/25 border-white/20 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Baseline Bars on Gantt Chart"
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${
              settings.showBaseline ? 'text-amber-300' : 'text-white/60'
            }`} />
            <span>
              Baseline: <strong className={settings.showBaseline ? 'text-amber-200' : 'text-white/95'}>
                {settings.showBaseline ? 'ON' : 'OFF'}
              </strong>
            </span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-1"></div>

          {/* Critical Path Toggle */}
          <button
            onClick={() => onUpdateSettings({ showCriticalPath: !settings.showCriticalPath })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
              settings.showCriticalPath
                ? 'bg-rose-500/30 border-rose-400/90 text-rose-200 shadow-2xs'
                : 'bg-black/25 border-white/20 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Highlight Critical Path (tasks and dependencies with zero float)"
          >
            <Flame className={`w-3.5 h-3.5 ${settings.showCriticalPath ? 'text-rose-400' : 'text-white/60'}`} />
            <span>
              Critical Path: <strong className={settings.showCriticalPath ? 'text-rose-200' : 'text-white/95'}>
                {settings.showCriticalPath ? 'ON' : 'OFF'}
              </strong>
            </span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-1"></div>

          {/* Activity Weight Mode Picker */}
          <div className="flex items-center space-x-1.5 bg-black/30 px-2.5 py-0.5 rounded border border-white/20 text-white">
            <Scale className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] text-white/70 font-medium">Weight:</span>
            <select
              value={settings.weightMode}
              onChange={(e) => onUpdateSettings({ weightMode: e.target.value as WeightMode })}
              className="bg-transparent text-white text-xs outline-none cursor-pointer font-medium"
            >
              <option value="duration" className="bg-slate-800 text-white">Time (Duration)</option>
              <option value="manhour" className="bg-slate-800 text-white">Man-Hour</option>
              <option value="equal" className="bg-slate-800 text-white">Equal</option>
            </select>
          </div>
        </div>

        {/* Right Settings & Color Theme Toggle */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Theme Switcher Popover */}
          <div className="relative">
            <button
              ref={themeButtonRef}
              onClick={toggleThemeMenu}
              className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 transition-colors border border-white/20 ${
                isThemeMenuOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-black/20 text-white/90 hover:text-white hover:bg-white/10'
              }`}
              title={`Active Palette: ${currentTheme.name}. Click to change palette.`}
            >
              <div className="flex space-x-0.5 items-center mr-0.5">
                {currentTheme.swatches.slice(0, 3).map((c, i) => (
                  <span key={i} className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="hidden sm:inline">Theme: <strong>{currentTheme.name}</strong></span>
              <ChevronDown className="w-3 h-3 text-white/70 ml-0.5" />
            </button>

            {isThemeMenuOpen && (
              <div
                ref={themeMenuRef}
                style={{ top: `${themeMenuPos.top}px`, right: `${themeMenuPos.right}px` }}
                className="fixed w-80 border rounded-xl shadow-2xl py-2 z-50 text-xs bg-slate-900 border-slate-700 text-slate-200"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                  <span>Color Theme Palettes</span>
                  <span className="text-[10px] text-slate-400 font-normal">6 Profiles</span>
                </div>
                {SELECTABLE_THEMES.map((theme) => {
                  const isSelected = (settings.colorTheme || 'construction') === theme.id ||
                    (theme.id === 'construction' && settings.colorTheme === 'site-drawing') ||
                    (theme.id === 'modern-enterprise' && settings.colorTheme === 'classic');
                  const swatches = theme.id === 'custom'
                    ? (settings.customTheme?.swatches || [
                        settings.customTheme?.headerBg || theme.swatches[0],
                        settings.customTheme?.taskBar || theme.swatches[1],
                        settings.customTheme?.summaryBar || theme.swatches[2],
                        settings.customTheme?.critical || theme.swatches[3],
                      ])
                    : theme.swatches;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onUpdateSettings({ colorTheme: theme.id });
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start space-x-2.5 transition-colors ${
                        isSelected ? 'bg-indigo-600/25 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col items-center mt-0.5 space-y-1 shrink-0">
                        <div className="grid grid-cols-2 gap-0.5 p-1 rounded bg-black/40 border border-slate-700">
                          {swatches.map((color, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-2xs" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {theme.name}
                          </span>
                          {theme.id === 'custom' && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsThemeMenuOpen(false);
                                onOpenSettingsModal();
                              }}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-700/60 cursor-pointer"
                              title="Customize Custom Palette Colors in Settings"
                            >
                              Edit Colors
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-indigo-400 block font-medium truncate">
                          {theme.subtitle}
                        </span>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {theme.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
                <div className="pt-1.5 mt-1 border-t border-slate-800 px-2">
                  <button
                    onClick={() => {
                      setIsThemeMenuOpen(false);
                      onOpenSettingsModal();
                    }}
                    className="w-full py-1 text-center text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    🎨 Open Palette Editor & Settings...
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenProjectInfoModal}
            className="px-2.5 py-1 rounded text-white/90 hover:text-white hover:bg-white/10 font-medium flex items-center space-x-1.5 transition-colors border border-white/20 bg-black/20"
            title="Project Information (Name, Number, Company, Address)"
          >
            <Info className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Project Info</span>
          </button>
          <button
            onClick={onOpenSettingsModal}
            className="px-2.5 py-1 rounded text-white/90 hover:text-white hover:bg-white/10 font-medium flex items-center space-x-1.5 transition-colors border border-white/20 bg-black/20"
            title="Project Calendar, Weight & Typography Settings"
          >
            <Settings className="w-3.5 h-3.5 text-white/80" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
