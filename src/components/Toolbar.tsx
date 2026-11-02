import React, { useRef } from 'react';
import type { ProjectSettings, WeightMode } from '../types/project';
import {
  FilePlus,
  FolderOpen,
  Save,
  FileSpreadsheet,
  FileDown,
  BookmarkCheck,
  Eye,
  EyeOff,
  Settings,
  Scale,
  UploadCloud,
  Flame
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
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print select-none">
      {/* Top Bar: Brand, Project Name, and KPI summary */}
      <div className="h-13 px-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md font-bold text-white text-base">
            W
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wide text-white">PMWBS Master</span>
            </div>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => onUpdateSettings({ name: e.target.value })}
              className="text-xs text-slate-200 bg-transparent hover:bg-slate-800/80 focus:bg-slate-800 px-1.5 py-0.5 rounded-sm outline-none border border-transparent focus:border-slate-500 transition-colors w-72 font-semibold"
              placeholder="Project Name..."
            />
          </div>
        </div>

        {/* Project KPI Badges */}
        <div className="flex items-center space-x-6 text-xs text-slate-300">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tasks</span>
            <span className="font-bold text-white font-mono text-sm">{totalTasks}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overall Progress</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{overallProgress}%</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Man-Hours</span>
            <span className="font-mono text-slate-200">
              <strong className="text-cyan-400 font-bold">{totalActualMH}</strong> / {totalPlannedMH} MH
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Finish Date</span>
            <span className="font-bold text-white font-mono">{finishDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* Ribbon Action Tools */}
      <div className="h-10 px-3 bg-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          {/* File Actions */}
          <button
            onClick={onNewProject}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Create New Project"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-400" />
            <span>New</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Open .wbs Project File"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Open</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wbs,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={onSaveWBS}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Save Project as Native .wbs File"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save (.wbs)</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Import MS Project Action */}
          <button
            onClick={() => mspFileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Import Microsoft Project schedule (*.xml or *.mpp)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-200" />
            <span>Import MSP</span>
          </button>
          <input
            ref={mspFileInputRef}
            type="file"
            accept=".xml,.mpp"
            onChange={handleMspFileChange}
            className="hidden"
          />

          {/* Import Excel Action */}
          <button
            onClick={() => excelFileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Import activities and schedule from Excel (*.xlsx, *.xls, *.csv)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-200" />
            <span>Import Excel</span>
          </button>
          <input
            ref={excelFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelFileChange}
            className="hidden"
          />

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Export Actions */}
          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Export to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Export Schedule to PDF or Image with Custom Settings"
          >
            <FileDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Export (PDF / Image)</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Baseline Actions */}
          <button
            onClick={onOpenBaselineModal}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Manage Project Baselines"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Baseline</span>
          </button>

          <button
            onClick={() => onUpdateSettings({ showBaseline: !settings.showBaseline })}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors ${
              settings.showBaseline ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Baseline Bars on Gantt Chart"
          >
            {settings.showBaseline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{settings.showBaseline ? 'Hide Baseline' : 'Show Baseline'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Critical Path Toggle */}
          <button
            onClick={() => onUpdateSettings({ showCriticalPath: !settings.showCriticalPath })}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors ${
              settings.showCriticalPath
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-xs'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="Highlight Critical Path (tasks and relationships with zero / least float)"
          >
            <Flame className={`w-3.5 h-3.5 ${settings.showCriticalPath ? 'text-red-400' : 'text-slate-400'}`} />
            <span>Critical Path</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Activity Weight Mode Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] text-slate-300 font-medium">Weight:</span>
            <select
              value={settings.weightMode}
              onChange={(e) => onUpdateSettings({ weightMode: e.target.value as WeightMode })}
              className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer font-semibold"
            >
              <option value="duration" className="bg-slate-800 text-white">Time (Duration)</option>
              <option value="manhour" className="bg-slate-800 text-white">Man-Hour</option>
              <option value="equal" className="bg-slate-800 text-white">Equal</option>
            </select>
          </div>
        </div>

        {/* Right Settings */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSettingsModal}
            className="px-2.5 py-1 rounded-md hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1.5 transition-colors"
            title="Project Calendar and Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Calendar & Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
