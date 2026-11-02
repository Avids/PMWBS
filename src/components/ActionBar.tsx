import React from 'react';
import type { FontSizeOption, FontFamilyChoice, ZoomTier, ColorTheme } from '../types/project';
import { getTheme, getFontFamilyCss } from '../theme/themeConfig';
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
  colorTheme?: ColorTheme;
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
  
  // Font Size & Family
  fontSize: FontSizeOption;
  onChangeFontSize: (size: FontSizeOption) => void;
  fontFamilyChoice?: FontFamilyChoice;
  onChangeFontFamily?: (font: FontFamilyChoice) => void;

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
  colorTheme,
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
  fontFamilyChoice,
  onChangeFontFamily,
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
  const theme = getTheme(colorTheme);
  const hoverBtnClass = theme.isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100';

  return (
    <div
      style={{
        backgroundColor: theme.isDark ? theme.surfaceBg : '#FFFFFF',
        borderBottomColor: theme.border,
        color: theme.textPrimary,
        fontFamily: getFontFamilyCss(fontFamilyChoice)
      }}
      className="h-10 px-3 border-b flex items-center justify-between text-xs shadow-2xs select-none z-20 overflow-x-auto no-scrollbar gap-2"
    >
      {/* Left Action Buttons (Unified height and rhythm) */}
      <div className="flex items-center space-x-1 shrink-0">
        {/* Add Task */}
        <button
          onClick={onAddTask}
          title="Add New Task Below (Insert)"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
            color: theme.textPrimary
          }}
          className={`h-7 px-2.5 ${hoverBtnClass} font-semibold rounded transition-colors flex items-center space-x-1 border`}
        >
          <Plus className="w-3.5 h-3.5 font-bold" style={{ color: theme.isDark ? '#818CF8' : '#4338CA' }} />
          <span>Add</span>
        </button>

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Last Action (Ctrl+Z)"
          style={{ color: theme.textSecondary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <Undo2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
          <span className="hidden lg:inline font-medium">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Action (Ctrl+Y)"
          style={{ color: theme.textSecondary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <Redo2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
          <span className="hidden lg:inline font-medium">Redo</span>
        </button>

        <div className="h-4 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

        {/* Expand / Collapse All (Consistent sleek rhythm) */}
        <button
          onClick={onExpandAll}
          title="Expand All Summary Tasks"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} font-medium rounded transition-colors flex items-center space-x-1`}
        >
          <Maximize2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
          <span className="hidden sm:inline">Expand all</span>
        </button>

        <button
          onClick={onCollapseAll}
          title="Collapse All Summary Tasks"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} font-medium rounded transition-colors flex items-center space-x-1`}
        >
          <Minimize2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
          <span className="hidden sm:inline">Collapse all</span>
        </button>

        <div className="h-4 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

        {/* Hierarchy Structure: Indent / Outdent */}
        <button
          onClick={onIndentTask}
          disabled={!selectedTaskId}
          title="Indent Task (Alt+Right)"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ArrowRight className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
          <span className="hidden md:inline font-medium">Indent</span>
        </button>

        <button
          onClick={onOutdentTask}
          disabled={!selectedTaskId}
          title="Outdent Task (Alt+Left)"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ArrowLeft className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
          <span className="hidden md:inline font-medium">Outdent</span>
        </button>

        <div className="h-4 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

        {/* Task Properties: Relationships & Task Info */}
        <button
          onClick={onOpenRelationships}
          disabled={!selectedTaskId || isSummarySelected}
          title="Edit Task Predecessors & Lag (FS, SS, FF, SF)"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <GitCommit className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
          <span className="hidden md:inline font-medium">Relationships</span>
        </button>

        <button
          onClick={onOpenTaskInfo}
          disabled={!selectedTaskId}
          title="Task Information & Properties (Double-click WBS cell)"
          style={{ color: theme.textPrimary }}
          className={`h-7 px-2 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <Info className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden md:inline font-medium">Task Info</span>
        </button>

        <div className="h-4 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

        {/* Destructive Action: Delete (Safely separated by dividers from Indent/Outdent) */}
        <button
          onClick={onDeleteTask}
          disabled={!selectedTaskId}
          title="Delete Selected Task (Delete)"
          style={{ color: theme.critical }}
          className={`h-7 px-2 hover:bg-red-500/10 rounded transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: theme.critical }} />
          <span className="hidden sm:inline font-medium">Delete</span>
        </button>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Font Family Picker */}
        <div
          style={{
            backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9',
            borderColor: theme.border
          }}
          className="flex items-center space-x-1 border rounded px-1.5 py-0.5"
          title="Choose Font Family: Segoe UI, Calibri, Verdana, Inter, etc."
        >
          <Type className="w-3 h-3 text-slate-400 shrink-0" />
          <select
            value={fontFamilyChoice || 'segoe'}
            onChange={(e) => onChangeFontFamily?.(e.target.value as FontFamilyChoice)}
            style={{
              backgroundColor: 'transparent',
              color: theme.textPrimary
            }}
            className="text-[11px] font-semibold outline-none cursor-pointer bg-transparent border-none py-0.5"
          >
            <option value="segoe" className="bg-slate-800 text-white">Segoe UI</option>
            <option value="calibri" className="bg-slate-800 text-white">Calibri</option>
            <option value="verdana" className="bg-slate-800 text-white">Verdana</option>
            <option value="inter" className="bg-slate-800 text-white">Inter</option>
            <option value="barlow" className="bg-slate-800 text-white">Barlow (DIN)</option>
            <option value="system" className="bg-slate-800 text-white">Arial / System</option>
          </select>
        </div>

        {/* Font Size Selector: 8pt (small), 10pt (normal), 12pt (large) */}
        <div
          style={{
            backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9',
            borderColor: theme.border
          }}
          className="flex items-center space-x-0.5 border rounded p-0.5"
        >
          <button
            onClick={() => onChangeFontSize('small')}
            style={fontSize === 'small' ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              fontSize === 'small'
                ? 'shadow-2xs'
                : hoverBtnClass
            }`}
            title="Small Font (8pt)"
          >
            8
          </button>
          <button
            onClick={() => onChangeFontSize('normal')}
            style={(fontSize === 'normal' || !fontSize) ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              (fontSize === 'normal' || !fontSize)
                ? 'shadow-2xs'
                : hoverBtnClass
            }`}
            title="Normal Font (10pt)"
          >
            10
          </button>
          <button
            onClick={() => onChangeFontSize('large')}
            style={fontSize === 'large' ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              fontSize === 'large'
                ? 'shadow-2xs'
                : hoverBtnClass
            }`}
            title="Large Font (12pt)"
          >
            12
          </button>
        </div>

        <div className="h-4 w-px" style={{ backgroundColor: theme.border }}></div>

        {/* Chart Text Labels Toggle */}
        <button
          onClick={onToggleTaskLabels}
          style={{
            borderColor: showTaskLabels ? (theme.isDark ? '#6366F1' : '#A5B4FC') : theme.border,
            backgroundColor: showTaskLabels
              ? (theme.isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF')
              : (theme.isDark ? '#1E293B' : '#FFFFFF'),
            color: showTaskLabels
              ? (theme.isDark ? '#A5B4FC' : '#4338CA')
              : theme.textSecondary
          }}
          className="h-7 px-2.5 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all"
          title="Toggle Activity Text Labels On/Off on Gantt Chart"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Labels: <strong style={{ color: showTaskLabels ? (theme.isDark ? '#818CF8' : '#3730A3') : theme.textSecondary }}>{showTaskLabels ? 'ON' : 'OFF'}</strong></span>
        </button>

        <div className="h-4 w-px" style={{ backgroundColor: theme.border }}></div>

        {/* Zoom Controls: Zoom In, Zoom Out, Zoom to Fit */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onZoomIn}
            style={{ color: theme.textPrimary }}
            className={`h-7 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1`}
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            <span className="hidden xl:inline text-xs font-medium">In</span>
          </button>

          <button
            onClick={onZoomOut}
            style={{ color: theme.textPrimary }}
            className={`h-7 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1`}
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            <span className="hidden xl:inline text-xs font-medium">Out</span>
          </button>

          <button
            onClick={onZoomFit}
            style={{ color: theme.textPrimary }}
            className={`h-7 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-1`}
            title="Zoom To Fit Entire Schedule"
          >
            <Scan className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            <span className="hidden xl:inline text-xs font-medium">Fit</span>
          </button>

          {/* Preset Zoom Tiers: Days, Weeks, Months */}
          <div
            style={{
              borderColor: theme.border,
              backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF'
            }}
            className="inline-flex rounded border overflow-hidden ml-1"
          >
            <button
              onClick={() => onChangeZoom('day')}
              style={zoom === 'day' ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary }}
              className={`px-2 py-1 text-[11px] ${
                zoom === 'day' ? 'font-bold' : `${hoverBtnClass} font-medium`
              }`}
            >
              Days
            </button>
            <button
              onClick={() => onChangeZoom('week')}
              style={{
                borderLeftColor: theme.border,
                ...(zoom === 'week' ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary })
              }}
              className={`px-2 py-1 text-[11px] border-l ${
                zoom === 'week' ? 'font-bold' : `${hoverBtnClass} font-medium`
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => onChangeZoom('month')}
              style={{
                borderLeftColor: theme.border,
                ...(zoom === 'month' ? { backgroundColor: theme.signal, color: '#FFFFFF' } : { color: theme.textPrimary })
              }}
              className={`px-2 py-1 text-[11px] border-l ${
                zoom === 'month' ? 'font-bold' : `${hoverBtnClass} font-medium`
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
