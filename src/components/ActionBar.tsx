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
  Type
} from 'lucide-react';

interface ActionBarProps {
  onAddTask: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onIndentTask: () => void;
  onOutdentTask: () => void;
  onOpenRelationships: () => void;
  onDeleteTask: () => void;
  selectedTaskId: string | null;
  isSummarySelected: boolean;
  
  // Font Size
  fontSize: FontSizeOption;
  onChangeFontSize: (size: FontSizeOption) => void;

  // Zoom Controls
  zoom: ZoomTier;
  onChangeZoom: (z: ZoomTier) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  showBaseline: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onAddTask,
  onExpandAll,
  onCollapseAll,
  onIndentTask,
  onOutdentTask,
  onOpenRelationships,
  onDeleteTask,
  selectedTaskId,
  isSummarySelected,
  fontSize,
  onChangeFontSize,
  zoom,
  onChangeZoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  showBaseline
}) => {
  return (
    <div className="h-11 px-3 bg-white border-b-2 border-slate-300 flex items-center justify-between text-xs text-slate-900 shadow-xs select-none z-20">
      {/* Left Action Buttons (OnlineGantt Style) */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onAddTask}
          title="Add New Task Below (Insert)"
          className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-900 font-semibold rounded transition-colors flex items-center space-x-1.5 border border-slate-300 bg-slate-50 hover:border-slate-400"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-700 font-bold" />
          <span>Add</span>
        </button>

        <button
          onClick={onExpandAll}
          title="Expand All Summary Tasks"
          className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-800 font-semibold rounded transition-colors flex items-center space-x-1 border border-slate-300 bg-white"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden sm:inline">Expand all</span>
        </button>

        <button
          onClick={onCollapseAll}
          title="Collapse All Summary Tasks"
          className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-800 font-semibold rounded transition-colors flex items-center space-x-1 border border-slate-300 bg-white"
        >
          <Minimize2 className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden sm:inline">Collapse all</span>
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1"></div>

        {/* Indent / Outdent / Relationships / Delete */}
        <button
          onClick={onIndentTask}
          disabled={!selectedTaskId}
          title="Indent Task (Alt+Right)"
          className="p-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Indent</span>
        </button>

        <button
          onClick={onOutdentTask}
          disabled={!selectedTaskId}
          title="Outdent Task (Alt+Left)"
          className="p-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Outdent</span>
        </button>

        <button
          onClick={onOpenRelationships}
          disabled={!selectedTaskId || isSummarySelected}
          title="Edit Task Predecessors & Lag (FS, SS, FF, SF)"
          className="p-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-medium">Relationships</span>
        </button>

        <button
          onClick={onDeleteTask}
          disabled={!selectedTaskId}
          title="Delete Selected Task (Delete)"
          className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden md:inline font-medium">Delete</span>
        </button>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Font Size Selector: 8pt (small), 10pt (normal), 12pt (large) */}
        <div className="flex items-center space-x-1 bg-slate-100 border border-slate-300 rounded-md p-0.5 shadow-2xs">
          <div className="flex items-center px-1 text-slate-600">
            <Type className="w-3.5 h-3.5 text-slate-500 mr-1" />
            <span className="text-[11px] font-bold text-slate-800 select-none">Font:</span>
          </div>
          <button
            onClick={() => onChangeFontSize('small')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              fontSize === 'small'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Small Font (8pt / 11px)"
          >
            8 Small
          </button>
          <button
            onClick={() => onChangeFontSize('normal')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              fontSize === 'normal' || !fontSize
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Normal Font (10pt / 13px)"
          >
            10 Normal
          </button>
          <button
            onClick={() => onChangeFontSize('large')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              fontSize === 'large'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Large Font (12pt / 15px)"
          >
            12 Large
          </button>
        </div>

        <div className="h-5 w-px bg-slate-300"></div>

        {/* Zoom Controls: Zoom In, Zoom Out, Zoom to Fit */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onZoomIn}
            className="p-1.5 hover:bg-slate-100 text-slate-800 rounded font-semibold transition-colors flex items-center space-x-1"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden xl:inline">Zoom in</span>
          </button>

          <button
            onClick={onZoomOut}
            className="p-1.5 hover:bg-slate-100 text-slate-800 rounded font-semibold transition-colors flex items-center space-x-1"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden xl:inline">Zoom out</span>
          </button>

          <button
            onClick={onZoomFit}
            className="p-1.5 hover:bg-slate-100 text-slate-800 rounded font-semibold transition-colors flex items-center space-x-1"
            title="Zoom To Fit Entire Schedule"
          >
            <Scan className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden xl:inline">Zoom to fit</span>
          </button>

          {/* Preset Zoom Tiers: Days, Weeks, Months */}
          <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden bg-white ml-1">
            <button
              onClick={() => onChangeZoom('day')}
              className={`px-2.5 py-1 text-[11px] ${
                zoom === 'day' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => onChangeZoom('week')}
              className={`px-2.5 py-1 text-[11px] border-l border-slate-300 ${
                zoom === 'week' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => onChangeZoom('month')}
              className={`px-2.5 py-1 text-[11px] border-l border-slate-300 ${
                zoom === 'month' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              Months
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden 2xl:flex items-center space-x-3 text-[11px] font-semibold text-slate-700 pl-2 border-l border-slate-300">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></div>
            <span>Task</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-xs"></div>
            <span>Summary</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-slate-800 rotate-45"></div>
            <span>Milestone</span>
          </div>
          {showBaseline && (
            <div className="flex items-center space-x-1">
              <div className="w-2.5 h-1.5 bg-amber-400 border border-amber-600"></div>
              <span>Baseline</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
