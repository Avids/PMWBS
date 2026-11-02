import React, { useState } from 'react';
import type { Task, ProjectSettings } from '../types/project';
import { exportProjectDocument, DEFAULT_EXPORT_SETTINGS } from '../engine/pdfExport';
import type { ExportSettings } from '../engine/pdfExport';
import { FileDown, X, Loader2, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  settings: ProjectSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  settings
}) => {
  const [config, setConfig] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportComplete(false);
      setStatusMessage('Preparing document...');

      await exportProjectDocument(tasks, settings, config, (status) => {
        setStatusMessage(status);
      });

      setExportComplete(true);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(`Export error: ${err.message || err}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Export</h3>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle & Info Notice */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs text-slate-500">
            Exporting large files may take several minutes...
          </p>

          <div className="mt-3 bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-900">
            <p className="font-medium text-sky-950">Using high-resolution vector export settings</p>
            <p className="text-[11px] text-sky-700 mt-0.5">
              Exports the entire schedule with WBS hierarchy and full Gantt chart timeline.
            </p>
          </div>
        </div>

        {/* Options Form matching OnlineGantt */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Format Selector */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Format</label>
            <select
              value={config.format}
              onChange={(e) => setConfig(c => ({ ...c, format: e.target.value as any }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="png">PNG Image (.png)</option>
            </select>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Header</label>
            <select
              value={config.header}
              onChange={(e) => setConfig(c => ({ ...c, header: e.target.value as any }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="project_name_date">Project Name & Date</option>
              <option value="project_name">Project Name Only</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Footer</label>
            <select
              value={config.footer}
              onChange={(e) => setConfig(c => ({ ...c, footer: e.target.value as any }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="summary">Schedule Summary & Total Duration</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Task Range (Scope) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <label className="w-32 font-medium text-slate-700">Task Scope</label>
              <select
                value={config.taskRangeMode || 'all'}
                onChange={(e) => setConfig(c => ({
                  ...c,
                  taskRangeMode: e.target.value as any,
                  taskFromId: c.taskFromId || 1,
                  taskToId: c.taskToId || tasks.length
                }))}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="all">All Activities (1 to {tasks.length})</option>
                <option value="custom">Custom Task Range (From - To)</option>
              </select>
            </div>

            {config.taskRangeMode === 'custom' && (
              <div className="flex items-center justify-end space-x-2 pt-1 pl-36">
                <span className="text-slate-500">From ID:</span>
                <input
                  type="number"
                  min="1"
                  max={tasks.length}
                  value={config.taskFromId || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setConfig(c => ({ ...c, taskFromId: Math.max(1, Math.min(val, tasks.length)) }));
                  }}
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-center"
                />
                <span className="text-slate-500">To ID:</span>
                <input
                  type="number"
                  min="1"
                  max={tasks.length}
                  value={config.taskToId || tasks.length}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || tasks.length;
                    setConfig(c => ({ ...c, taskToId: Math.max(1, Math.min(val, tasks.length)) }));
                  }}
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-center"
                />
                <span className="text-[11px] text-slate-400">
                  ({Math.max(0, (config.taskToId || tasks.length) - (config.taskFromId || 1) + 1)} tasks)
                </span>
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Columns</label>
            <select
              value={config.columns}
              onChange={(e) => setConfig(c => ({ ...c, columns: e.target.value as any }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="all">All Columns (Full 18: WBS, Dates, Floats, All MH, Baselines, Notes)</option>
              <option value="core">Core Columns (WBS, Name, Duration, Dates, %, Predecessors)</option>
              <option value="name_only">WBS and Task Name Only</option>
            </select>
          </div>

          {/* Gantt Timeline Scale / Option to turn off Gantt */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Gantt Chart</label>
            <select
              value={config.timelineScale}
              onChange={(e) => setConfig(c => ({ ...c, timelineScale: e.target.value as any }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="weeks">Weeks (Recommended for Schedules)</option>
              <option value="months">Months (Summary / Long Duration)</option>
              <option value="days">Days (Detailed Lookahead)</option>
              <option value="none">Off (Spreadsheet Table Only)</option>
            </select>
          </div>

          {/* Paper Size & Orientation (if PDF) */}
          {config.format === 'pdf' && (
            <>
              <div className="flex items-center justify-between gap-4">
                <label className="w-32 font-medium text-slate-700">Paper Size</label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <select
                    value={config.paperSize}
                    onChange={(e) => setConfig(c => ({ ...c, paperSize: e.target.value as any }))}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="letter">Letter (8.5" x 11")</option>
                    <option value="tabloid">11x17 / Tabloid (11" x 17")</option>
                    <option value="legal">Legal (8.5" x 14")</option>
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="a3">A3 (297 x 420 mm)</option>
                  </select>
                  <select
                    value={config.orientation}
                    onChange={(e) => setConfig(c => ({ ...c, orientation: e.target.value as any }))}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              {/* Page Fit / Multi-page Pagination */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-32 font-medium text-slate-700">Pagination</label>
                <select
                  value={config.pageFit}
                  onChange={(e) => setConfig(c => ({ ...c, pageFit: e.target.value as any }))}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="auto">Multi-Page (Auto-paginate rows)</option>
                  <option value="single">Fit all on 1 Page</option>
                </select>
              </div>
            </>
          )}

          {/* Image Resolution */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-32 font-medium text-slate-700">Resolution</label>
            <select
              value={config.resolution}
              onChange={(e) => setConfig(c => ({ ...c, resolution: parseInt(e.target.value, 10) }))}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="1">1x (Standard)</option>
              <option value="2">2x (High-Res Print Quality)</option>
              <option value="3">3x (Ultra Sharp)</option>
            </select>
          </div>

          {/* Progress / Status display while exporting */}
          {isExporting && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-2 text-xs text-slate-700">
              {exportComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
              ) : (
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
              )}
              <span>{exportComplete ? 'Export Complete! Downloading file...' : statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
