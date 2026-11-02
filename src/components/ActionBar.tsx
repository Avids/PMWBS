import React from 'react';
import type { FontSizeOption, ZoomTier } from '../types/project';
import {
  Plus,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  GitCommit,
  Trash2,
  ZoomIn,
  ZoomOut,
  Scan,
  Type,
  Tag,
  Info,
  Undo2,
  Redo2
} from 'lucide-react';

interface ActionBarProps {
  onAddTask: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onIndentTask: () => void;
  onOutdentTask: () => void;
  onOpenRelationships: () => void;
  onOpenTaskInfo?: () => void;
  onDeleteTask: () => void;
  selectedTaskId: string | null;
  isSummarySelected: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  
  // Font Size
  fontSize: FontSizeOption;
  onChangeFontSize: (size: FontSizeOption) => void;

  // Chart Text Labels Toggle
  showTaskLabels: boolean;
  onToggleTaskLabels: () => void;

  // Zoom Controls
  zoom: ZoomTier;
  onChangeZoom: (z: ZoomTier) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onAddTask,
  onExpandAll,
  onCollapseAll,
  onIndentTask,
  onOutdentTask,
  onOpenRelationships,
  onOpenTaskInfo,
  onDeleteTask,
  selectedTaskId,
  isSummarySelected,
  fontSize,
  onChangeFontSize,
  showTaskLabels,
  onToggleTaskLabels,
  zoom,
  onChangeZoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  return (
    <div className="h-10 px-3 bg-white border-b border-slate-300 flex items-center justify-between text-xs text-slate-800 shadow-2xs select-none z-20 overflow-x-auto no-scrollbar gap-2">
      {/* Left Action Buttons (Unified height and rhythm) */}
      <div className="flex items-center space-x-1 shrink-0">
        {/* Add Task */}
        <button
          onClick={onAddTask}
          title="Add New Task Below (Insert)"
          className="h-7 px-2.5 hover:bg-slate-100 text-slate-900 font-semibold rounded transition-colors flex items-center space-x-1 border border-slate-300 bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-700 font-bold" />
          <span>Add</span>
        </button>

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Last Action (Ctrl+Z)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Undo2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden lg:inline font-medium">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Action (Ctrl+Y)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Redo2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden lg:inline font-medium">Redo</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

        {/* Expand / Collapse All (Consistent sleek rhythm) */}
        <button
          onClick={onExpandAll}
          title="Expand All Summary Tasks"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 font-medium rounded transition-colors flex items-center space-x-1"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Expand all</span>
        </button>

        <button
          onClick={onCollapseAll}
          title="Collapse All Summary Tasks"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 font-medium rounded transition-colors flex items-center space-x-1"
        >
          <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Collapse all</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

        {/* Hierarchy Structure: Indent / Outdent */}
        <button
          onClick={onIndentTask}
          disabled={!selectedTaskId}
          title="Indent Task (Alt+Right)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Indent</span>
        </button>

        <button
          onClick={onOutdentTask}
          disabled={!selectedTaskId}
          title="Outdent Task (Alt+Left)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Outdent</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

        {/* Task Properties: Relationships & Task Info */}
        <button
          onClick={onOpenRelationships}
          disabled={!selectedTaskId || isSummarySelected}
          title="Edit Task Predecessors & Lag (FS, SS, FF, SF)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Relationships</span>
        </button>

        <button
          onClick={onOpenTaskInfo}
          disabled={!selectedTaskId}
          title="Task Information & Properties (Double-click WBS cell)"
          className="h-7 px-2 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Info className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden md:inline font-medium">Task Info</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

        {/* Destructive Action: Delete (Safely separated by dividers from Indent/Outdent) */}
        <button
          onClick={onDeleteTask}
          disabled={!selectedTaskId}
          title="Delete Selected Task (Delete)"
          className="h-7 px-2 hover:bg-red-50 text-red-600 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden sm:inline font-medium">Delete</span>
        </button>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Font Size Selector: 8pt (small), 10pt (normal), 12pt (large) */}
        <div className="flex items-center space-x-0.5 bg-slate-100 border border-slate-300 rounded p-0.5">
          <div className="hidden sm:flex items-center px-1 text-slate-600">
            <Type className="w-3 h-3 text-slate-500 mr-1" />
            <span className="text-[10px] font-bold text-slate-700 select-none">Font:</span>
          </div>
          <button
            onClick={() => onChangeFontSize('small')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              fontSize === 'small'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Small Font (8pt)"
          >
            8
          </button>
          <button
            onClick={() => onChangeFontSize('normal')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              fontSize === 'normal' || !fontSize
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Normal Font (10pt)"
          >
            10
          </button>
          <button
            onClick={() => onChangeFontSize('large')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              fontSize === 'large'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Large Font (12pt)"
          >
            12
          </button>
        </div>

        <div className="h-4 w-px bg-slate-300"></div>

        {/* Chart Text Labels Toggle */}
        <button
          onClick={onToggleTaskLabels}
          className={`h-7 px-2.5 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all ${
            showTaskLabels
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
              : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
          }`}
          title="Toggle Activity Text Labels On/Off on Gantt Chart"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Labels: <strong className={showTaskLabels ? 'text-indigo-800' : 'text-slate-600'}>{showTaskLabels ? 'ON' : 'OFF'}</strong></span>
        </button>

        <div className="h-4 w-px bg-slate-300"></div>

        {/* Zoom Controls: Zoom In, Zoom Out, Zoom to Fit */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onZoomIn}
            className="h-7 px-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xl:inline text-xs font-medium">In</span>
          </button>

          <button
            onClick={onZoomOut}
            className="h-7 px-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xl:inline text-xs font-medium">Out</span>
          </button>

          <button
            onClick={onZoomFit}
            className="h-7 px-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors flex items-center space-x-1"
            title="Zoom To Fit Entire Schedule"
          >
            <Scan className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xl:inline text-xs font-medium">Fit</span>
          </button>

          {/* Preset Zoom Tiers: Days, Weeks, Months */}
          <div className="inline-flex rounded border border-slate-300 overflow-hidden bg-white ml-1">
            <button
              onClick={() => onChangeZoom('day')}
              className={`px-2 py-1 text-[11px] ${
                zoom === 'day' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => onChangeZoom('week')}
              className={`px-2 py-1 text-[11px] border-l border-slate-300 ${
                zoom === 'week' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => onChangeZoom('month')}
              className={`px-2 py-1 text-[11px] border-l border-slate-300 ${
                zoom === 'month' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Months
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
