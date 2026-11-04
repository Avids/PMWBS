import React from 'react';
import type { FontSizeOption, FontFamilyChoice, ZoomTier, ColorTheme } from '../types/project';
import { getTheme, getFontFamilyCss, type ThemeDefinition } from '../theme/themeConfig';
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
  Columns3,
  Calendar,
  LocateFixed,
  Info,
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  FileText,
  Users
} from 'lucide-react';

export interface MSPProgressIconProps {
  progress: 0 | 25 | 50 | 75 | 100;
  barColor?: string;
  fillLineColor?: string;
  width?: number;
  height?: number;
}

export const MSPProgressIcon: React.FC<MSPProgressIconProps> = ({
  progress,
  barColor = '#3B82F6',
  fillLineColor = '#0F172A',
  width = 24,
  height = 9
}) => {
  const fillWidth = (width * progress) / 100;
  const lineY = 3.5;
  const lineHeight = 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-hidden"
    >
      {/* Background Task Bar */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="2"
        fill={barColor}
      />
      {/* Centered Progress Fill Line */}
      {progress > 0 && (
        <rect
          x="0"
          y={lineY}
          width={fillWidth}
          height={lineHeight}
          fill={fillLineColor}
          rx={progress === 100 ? 1 : 0}
        />
      )}
    </svg>
  );
};

export interface ActionBarProps {
  colorTheme?: ColorTheme;
  customTheme?: Partial<ThemeDefinition>;
  onAddTask: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onIndentTask: () => void;
  onOutdentTask: () => void;
  onOpenRelationships: () => void;
  onOpenTaskInfo?: () => void;
  onOpenNotes?: () => void;
  onOpenResources?: () => void;
  onDeleteTask: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
  selectedTaskId: string | null;
  selectedCount?: number;
  isSummarySelected: boolean;
  selectedTaskProgress?: number;
  onUpdateProgress?: (progress: number) => void;
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

  // Auto-fit Columns
  onAutoFitColumns?: () => void;

  // Chart View Focus Controls
  onFocusToday?: () => void;
  onFocusTask?: () => void;

  // Zoom Controls
  zoom: ZoomTier;
  onChangeZoom: (z: ZoomTier) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

const PROGRESS_STEPS: Array<0 | 25 | 50 | 75 | 100> = [0, 25, 50, 75, 100];

export const ActionBar: React.FC<ActionBarProps> = ({
  colorTheme,
  customTheme,
  onAddTask,
  onExpandAll,
  onCollapseAll,
  onIndentTask,
  onOutdentTask,
  onOpenRelationships,
  onOpenTaskInfo,
  onOpenNotes,
  onOpenResources,
  onDeleteTask,
  onCopy,
  onPaste,
  canPaste = true,
  selectedTaskId,
  selectedCount = 1,
  isSummarySelected,
  selectedTaskProgress,
  onUpdateProgress,
  fontSize,
  onChangeFontSize,
  fontFamilyChoice,
  onChangeFontFamily,
  showTaskLabels,
  onAutoFitColumns,
  onToggleTaskLabels,
  onFocusToday,
  onFocusTask,
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
  const theme = getTheme(colorTheme, undefined, customTheme);
  const hoverBtnClass = theme.isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100';

  return (
    <div
      style={{
        backgroundColor: theme.isDark ? theme.surfaceBg : '#FFFFFF',
        borderBottomColor: theme.border,
        color: theme.textPrimary,
        fontFamily: getFontFamilyCss(fontFamilyChoice)
      }}
      className="border-b shadow-2xs select-none z-20 flex flex-col shrink-0"
    >
      {/* TIER 1: Primary Task Actions, Clipboard, Hierarchy & Inspection */}
      <div
        style={{ borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
        className="h-8 px-3 border-b flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-2"
      >
        <div className="flex items-center space-x-1 shrink-0">
          {/* Add Activity */}
          <button
            onClick={onAddTask}
            title="Add New Activity Below (Insert)"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              color: theme.textPrimary
            }}
            className={`h-6 px-2 ${hoverBtnClass} font-semibold rounded text-[11px] transition-colors flex items-center space-x-1 border`}
          >
            <Plus className="w-3.5 h-3.5 font-bold" style={{ color: theme.isDark ? '#818CF8' : '#4338CA' }} />
            <span>Add</span>
          </button>

          {/* Clipboard Group: Copy & Paste */}
          <button
            onClick={onCopy}
            disabled={!selectedTaskId}
            title={selectedCount > 1 ? `Copy ${selectedCount} Activities (Ctrl+C)` : "Copy Activity (Ctrl+C)"}
            style={{ color: theme.textSecondary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Copy className="w-3 h-3 text-slate-500" />
            <span className="font-medium">Copy</span>
          </button>

          <button
            onClick={onPaste}
            disabled={!canPaste}
            title="Paste Activities Below Selected (Ctrl+V)"
            style={{ color: theme.textSecondary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Paste</span>
          </button>

          <div className="h-3.5 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo Last Action (Ctrl+Z)"
            style={{ color: theme.textSecondary }}
            className={`h-6 px-1.5 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Undo2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            <span className="hidden sm:inline font-medium">Undo</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo Action (Ctrl+Y)"
            style={{ color: theme.textSecondary }}
            className={`h-6 px-1.5 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Redo2 className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            <span className="hidden sm:inline font-medium">Redo</span>
          </button>

          <div className="h-3.5 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

          {/* Indent / Outdent */}
          <button
            onClick={onIndentTask}
            disabled={!selectedTaskId}
            title={selectedCount > 1 ? `Indent ${selectedCount} Activities (Alt+Right)` : "Indent Activity (Alt+Right)"}
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ArrowRight className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
            <span className="font-medium">{selectedCount > 1 ? `Indent (${selectedCount})` : "Indent"}</span>
          </button>

          <button
            onClick={onOutdentTask}
            disabled={!selectedTaskId}
            title={selectedCount > 1 ? `Outdent ${selectedCount} Activities (Alt+Left)` : "Outdent Activity (Alt+Left)"}
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
            <span className="font-medium">{selectedCount > 1 ? `Outdent (${selectedCount})` : "Outdent"}</span>
          </button>

          <div className="h-3.5 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

          {/* Expand / Collapse All */}
          <button
            onClick={onExpandAll}
            title="Expand All Summary Activities"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-1.5 ${hoverBtnClass} font-medium rounded text-[11px] transition-colors flex items-center space-x-1`}
          >
            <Maximize2 className="w-3 h-3" style={{ color: theme.textSecondary }} />
            <span className="hidden md:inline">Expand</span>
          </button>

          <button
            onClick={onCollapseAll}
            title="Collapse All Summary Activities"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-1.5 ${hoverBtnClass} font-medium rounded text-[11px] transition-colors flex items-center space-x-1`}
          >
            <Minimize2 className="w-3 h-3" style={{ color: theme.textSecondary }} />
            <span className="hidden md:inline">Collapse</span>
          </button>
        </div>

        {/* Right side of Tier 1: Task Inspection & Delete */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Task Info Dialog */}
          <button
            onClick={onOpenTaskInfo}
            disabled={!selectedTaskId}
            title="Task Information & General Settings (Double-click WBS cell)"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Info className="w-3.5 h-3.5 text-sky-500" />
            <span className="font-medium">Task Info</span>
          </button>

          {/* Task Notes Shortcut */}
          <button
            onClick={onOpenNotes}
            disabled={!selectedTaskId}
            title="Open Task Notes & Documentation dialog"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium">Notes</span>
          </button>

          {/* Task Resources Shortcut */}
          <button
            onClick={onOpenResources}
            disabled={!selectedTaskId}
            title="Open Task Resources & Man-Hours dialog"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">Resources</span>
          </button>

          {/* Relationships Dialog */}
          <button
            onClick={onOpenRelationships}
            disabled={!selectedTaskId || isSummarySelected}
            title="Edit Activity Predecessors & Lag (FS, SS, FF, SF)"
            style={{ color: theme.textPrimary }}
            className={`h-6 px-2 ${hoverBtnClass} rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <GitCommit className="w-3.5 h-3.5" style={{ color: theme.isDark ? '#818CF8' : '#4F46E5' }} />
            <span className="hidden sm:inline font-medium">Relationships</span>
          </button>

          <div className="h-3.5 w-px mx-0.5" style={{ backgroundColor: theme.border }}></div>

          {/* Delete Activity */}
          <button
            onClick={onDeleteTask}
            disabled={!selectedTaskId}
            title="Delete Selected Activity (Delete)"
            style={{ color: theme.critical }}
            className={`h-6 px-2 hover:bg-red-500/10 rounded text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none`}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: theme.critical }} />
            <span className="font-medium">Delete</span>
          </button>
        </div>
      </div>

      {/* TIER 2: MSP Quick Progress, Font Controls, Labels, Auto-Fit & Zoom */}
      <div
        style={{
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : '#F8FAFC'
        }}
        className="h-9 px-3 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-3"
      >
        {/* Left: MSP-Style Quick Progress Update Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <span
            style={{ color: theme.textSecondary }}
            className="text-[10px] font-bold uppercase tracking-wider mr-1 select-none"
          >
            Progress:
          </span>

          <div className="flex items-center space-x-1">
            {PROGRESS_STEPS.map((pct) => {
              const isCurrent = !isSummarySelected && selectedTaskProgress === pct;
              return (
                <button
                  key={pct}
                  onClick={() => onUpdateProgress?.(pct)}
                  disabled={!selectedTaskId || isSummarySelected}
                  title={
                    isSummarySelected
                      ? 'Progress for summary tasks is calculated from child activities'
                      : selectedCount > 1
                      ? `Set Progress to ${pct}% for ${selectedCount} selected activities`
                      : `Set Activity Progress to ${pct}%`
                  }
                  style={{
                    borderColor: isCurrent ? (theme.isDark ? '#818CF8' : '#3B82F6') : (theme.isDark ? '#334155' : '#E2E8F0'),
                    backgroundColor: isCurrent
                      ? (theme.isDark ? 'rgba(99, 102, 241, 0.25)' : '#EFF6FF')
                      : (theme.isDark ? '#1E293B' : '#FFFFFF')
                  }}
                  className={`flex flex-col items-center justify-center px-1.5 py-0.5 rounded border transition-all ${
                    isCurrent ? 'ring-1 ring-blue-500/40 shadow-2xs font-bold' : hoverBtnClass
                  } disabled:opacity-30 disabled:pointer-events-none`}
                >
                  <MSPProgressIcon
                    progress={pct}
                    barColor={theme.isDark ? '#60A5FA' : '#3B82F6'}
                    fillLineColor={theme.isDark ? '#020617' : '#0F172A'}
                  />
                  <span
                    style={{
                      color: isCurrent
                        ? (theme.isDark ? '#93C5FD' : '#1D4ED8')
                        : theme.textSecondary
                    }}
                    className="text-[9px] font-semibold leading-tight mt-0.5"
                  >
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px mx-1.5" style={{ backgroundColor: theme.border }}></div>

          {/* Font Family Picker */}
          <div
            style={{
              backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
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
              backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
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
        </div>

        {/* Right: Grid Labels, Auto-fit & Zoom Controls */}
        <div className="flex items-center space-x-2 shrink-0">
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
            className="h-6 px-2 text-[11px] font-semibold rounded flex items-center space-x-1 border transition-all"
            title="Toggle Activity Text Labels On/Off on Gantt Chart"
          >
            <Tag className="w-3 h-3" />
            <span>Labels: <strong style={{ color: showTaskLabels ? (theme.isDark ? '#818CF8' : '#3730A3') : theme.textSecondary }}>{showTaskLabels ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* Auto-Fit Grid Columns */}
          {onAutoFitColumns && (
            <button
              onClick={onAutoFitColumns}
              style={{
                borderColor: theme.border,
                backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                color: theme.textSecondary
              }}
              className={`h-6 px-2 text-[11px] font-semibold rounded flex items-center space-x-1 border transition-all ${hoverBtnClass}`}
              title="Auto-Fit Grid Columns to Content Width"
            >
              <Columns3 className="w-3 h-3" style={{ color: theme.signal }} />
              <span className="hidden sm:inline">Auto-Fit</span>
            </button>
          )}

          <div className="h-3.5 w-px" style={{ backgroundColor: theme.border }}></div>

          {/* Chart View Focus Controls: Today & Current Task */}
          <div className="flex items-center space-x-1">
            {onFocusToday && (
              <button
                onClick={onFocusToday}
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                  color: theme.textPrimary
                }}
                className={`h-6 px-2 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all cursor-pointer ${hoverBtnClass}`}
                title="Focus Chart View to Today (Alt+T) - Scrolls timeline to today's date"
              >
                <Calendar className="w-3 h-3" style={{ color: theme.signal }} />
                <span>Today</span>
              </button>
            )}

            {onFocusTask && (
              <button
                onClick={onFocusTask}
                disabled={!selectedTaskId}
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                  color: theme.textPrimary
                }}
                className={`h-6 px-2 text-[11px] font-semibold rounded flex items-center space-x-1.5 border transition-all cursor-pointer ${hoverBtnClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                title={
                  selectedTaskId
                    ? "Focus Chart View to Current Task (Alt+F or Ctrl+Shift+F5) - Scrolls to selected activity bar and row"
                    : "Select an activity first to focus on the chart"
                }
              >
                <LocateFixed className="w-3 h-3" style={{ color: theme.signal }} />
                <span>Task</span>
              </button>
            )}
          </div>

          <div className="h-3.5 w-px" style={{ backgroundColor: theme.border }}></div>

          {/* Zoom Controls: Zoom In, Zoom Out, Zoom to Fit */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={onZoomIn}
              style={{ color: theme.textPrimary }}
              className={`h-6 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-0.5`}
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3 h-3" style={{ color: theme.textSecondary }} />
              <span className="text-[11px] font-medium">In</span>
            </button>

            <button
              onClick={onZoomOut}
              style={{ color: theme.textPrimary }}
              className={`h-6 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-0.5`}
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3 h-3" style={{ color: theme.textSecondary }} />
              <span className="text-[11px] font-medium">Out</span>
            </button>

            <button
              onClick={onZoomFit}
              style={{ color: theme.textPrimary }}
              className={`h-6 px-1.5 ${hoverBtnClass} rounded transition-colors flex items-center space-x-0.5`}
              title="Zoom To Fit Entire Schedule"
            >
              <Scan className="w-3 h-3" style={{ color: theme.textSecondary }} />
              <span className="text-[11px] font-medium">Fit</span>
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
                className={`px-1.5 py-0.5 text-[10px] ${
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
                className={`px-1.5 py-0.5 text-[10px] border-l ${
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
                className={`px-1.5 py-0.5 text-[10px] border-l ${
                  zoom === 'month' ? 'font-bold' : `${hoverBtnClass} font-medium`
                }`}
              >
                Months
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
