import React, { useState, useEffect, useRef } from 'react';
import type { Task, WeightMode, FontSizeOption, ColorTheme, FontFamilyChoice } from '../types/project';
import { getTheme } from '../theme/themeConfig';
import { Flag, GitCommit, GripVertical, FileText } from 'lucide-react';
import { parsePredecessors, formatPredecessors } from '../engine/scheduler';
import { useVirtualizer } from '@tanstack/react-virtual';

interface SpreadsheetGridProps {
  tasks: Task[];
  allTasks: Task[];
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onSelectTask: (taskId: string, modifiers?: { isShift?: boolean; isCtrl?: boolean }) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (afterTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onOpenPredecessorModal: (task: Task) => void;
  onOpenTaskInfo?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onToggleCollapse: (taskId: string) => void;
  weightMode: WeightMode;
  fontSize?: FontSizeOption;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onVerticalScroll?: (scrollTop: number) => void;
  colorTheme?: ColorTheme;
  fontFamilyChoice?: FontFamilyChoice;
  onPasteRows?: (startRowIdx: number, startColIdx: number, matrix: string[][]) => void;
}

type ColumnField = 
  | 'wbs'
  | 'name'
  | 'duration'
  | 'startDate'
  | 'endDate'
  | 'progress'
  | 'weight'
  | 'predecessors'
  | 'totalFloat'
  | 'plannedManHours'
  | 'actualManHours'
  | 'remainingManHours'
  | 'earnedManHours'
  | 'baselineStart'
  | 'baselineEnd'
  | 'variance'
  | 'notes';

const COLUMNS: { field: ColumnField; label: string; width: number; readonly?: boolean }[] = [
  { field: 'wbs', label: 'WBS', width: 65, readonly: true },
  { field: 'name', label: 'Task Name', width: 250 },
  { field: 'duration', label: 'Duration (d)', width: 95 },
  { field: 'startDate', label: 'Start Date', width: 110 },
  { field: 'endDate', label: 'End Date', width: 110 },
  { field: 'progress', label: '% Complete', width: 95 },
  { field: 'weight', label: 'Weight %', width: 85, readonly: true },
  { field: 'predecessors', label: 'Predecessors', width: 140 },
  { field: 'totalFloat', label: 'Total Float', width: 90, readonly: true },
  { field: 'plannedManHours', label: 'Plan MH', width: 85 },
  { field: 'actualManHours', label: 'Act MH', width: 85 },
  { field: 'remainingManHours', label: 'Rem MH', width: 85, readonly: true },
  { field: 'earnedManHours', label: 'Earn MH', width: 85, readonly: true },
  { field: 'baselineStart', label: 'Base Start', width: 105, readonly: true },
  { field: 'baselineEnd', label: 'Base End', width: 105, readonly: true },
  { field: 'variance', label: 'Variance (d)', width: 95, readonly: true },
  { field: 'notes', label: 'Notes', width: 160 }
];

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  tasks,
  allTasks,
  selectedTaskId,
  selectedTaskIds,
  onSelectTask,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onOpenPredecessorModal,
  onOpenTaskInfo,
  onContextMenu,
  onToggleCollapse,
  fontSize = 'normal',
  scrollContainerRef,
  onVerticalScroll,
  colorTheme = 'classic',
  fontFamilyChoice,
  onPasteRows
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = scrollContainerRef || internalScrollRef;
  const theme = getTheme(colorTheme, fontFamilyChoice);

  // Keep activeCell synchronized with selectedTaskId
  useEffect(() => {
    if (selectedTaskId) {
      const idx = tasks.findIndex((t) => t.id === selectedTaskId);
      if (idx !== -1) {
        setActiveCell((prev) => ({
          rowIdx: idx,
          colIdx: prev?.colIdx ?? 1
        }));
      }
    }
  }, [selectedTaskId, tasks]);

  // Height and font sizing based on fontSize prop
  const rowHeight = fontSize === 'small' ? 30 : fontSize === 'large' ? 44 : 36;

  // Virtualizer for high-performance rendering (supports 10,000+ tasks at 60 FPS)
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  // Auto-scroll virtualizer when activeCell changes (e.g. keyboard navigation)
  useEffect(() => {
    if (activeCell && activeCell.rowIdx >= 0 && activeCell.rowIdx < tasks.length) {
      rowVirtualizer.scrollToIndex(activeCell.rowIdx, { align: 'auto' });
    }
  }, [activeCell?.rowIdx, rowVirtualizer, tasks.length]);
  const textSizeClass = fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-[15px]' : 'text-[13px]';
  const headerSizeClass = fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-[14px]' : 'text-xs';

  const commitEdit = () => {
    if (!editingCell) return;
    const task = tasks[editingCell.rowIdx];
    if (!task) return;
    const col = COLUMNS[editingCell.colIdx];
    if (col.readonly) return;

    const updates: Partial<Task> = {};
    if (col.field === 'name') updates.name = editValue;
    else if (col.field === 'duration') updates.duration = Math.max(0, parseInt(editValue, 10) || 0);
    else if (col.field === 'startDate') updates.startDate = editValue;
    else if (col.field === 'endDate') updates.endDate = editValue;
    else if (col.field === 'progress') updates.progress = Math.min(100, Math.max(0, parseInt(editValue, 10) || 0));
    else if (col.field === 'predecessors') {
      updates.predecessorText = editValue;
      // Resolve against allTasks for valid references
      updates.predecessors = parsePredecessors(editValue, allTasks);
    } else if (col.field === 'plannedManHours') updates.plannedManHours = Math.max(0, parseFloat(editValue) || 0);
    else if (col.field === 'actualManHours') updates.actualManHours = Math.max(0, parseFloat(editValue) || 0);
    else if (col.field === 'notes') updates.notes = editValue;

    onUpdateTask(task.id, updates);
    setEditingCell(null);
    gridContainerRef.current?.focus();
  };

  const startEdit = (rowIdx: number, colIdx: number) => {
    const col = COLUMNS[colIdx];
    if (!col || col.readonly) return;
    const task = tasks[rowIdx];
    if (!task) return;
    // For summary tasks, calculated rollup fields cannot be edited directly; only task name and notes are editable
    if (task.isSummary && col.field !== 'name' && col.field !== 'notes') return;

    let val = '';
    if (col.field === 'name') val = task.name;
    else if (col.field === 'duration') val = String(task.duration);
    else if (col.field === 'startDate') val = task.startDate;
    else if (col.field === 'endDate') val = task.endDate;
    else if (col.field === 'progress') val = String(task.progress);
    else if (col.field === 'predecessors') val = task.predecessorText || '';
    else if (col.field === 'plannedManHours') val = String(task.plannedManHours || 0);
    else if (col.field === 'actualManHours') val = String(task.actualManHours || 0);
    else if (col.field === 'notes') val = task.notes || '';

    setEditValue(val);
    setEditingCell({ rowIdx, colIdx });
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      try {
        inputRef.current.select();
      } catch {
        // Some input types (e.g. date) do not support text selection
      }
    }
  }, [editingCell]);

  // Global ArrowUp / ArrowDown / Enter navigation (prevents window scrolling and navigates tasks)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input, textarea, or select is focused or cell is editing
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (editingCell) return;

      // If event originated inside grid container or grid container is focused, onKeyDown handles it (prevent double-jump)
      const isInsideGrid =
        gridContainerRef.current &&
        (document.activeElement === gridContainerRef.current ||
          gridContainerRef.current.contains(document.activeElement) ||
          e.target === gridContainerRef.current ||
          gridContainerRef.current.contains(e.target as Node));
      if (isInsideGrid) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        let currentRowIdx = activeCell?.rowIdx ?? -1;
        const currentColIdx = activeCell?.colIdx ?? 1;

        if (currentRowIdx === -1 && selectedTaskId) {
          currentRowIdx = tasks.findIndex((t) => t.id === selectedTaskId);
        }
        if (currentRowIdx === -1 && tasks.length > 0) {
          currentRowIdx = 0;
        }
        if (currentRowIdx === -1) return;
    // Ctrl+C / Cmd+C: Copy active cell value to clipboard
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !editingCell) {
      if (activeCell) {
        const task = tasks[activeCell.rowIdx];
        const col = COLUMNS[activeCell.colIdx];
        if (task && col) {
          const textToCopy = getCellValueAsString(task, col.field);
          navigator.clipboard?.writeText(textToCopy).catch(() => {});
        }
      }
    }

    // Shift+ArrowDown: Expand selection downwards
    if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(tasks.length - 1, currentRowIdx + 1);
      setActiveCell({ rowIdx: nextRow, colIdx: currentColIdx });
      onSelectTask(tasks[nextRow].id, { isShift: true });
      document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
      return;
    } else if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, currentRowIdx - 1);
      setActiveCell({ rowIdx: prevRow, colIdx: currentColIdx });
      onSelectTask(tasks[prevRow].id, { isShift: true });
      document.getElementById(`grid-row-${tasks[prevRow].id}`)?.scrollIntoView({ block: 'nearest' });
      return;
    }


        if (e.key === 'ArrowDown' && !e.shiftKey) {
          const nextRow = Math.min(tasks.length - 1, currentRowIdx + 1);
          setActiveCell({ rowIdx: nextRow, colIdx: currentColIdx });
          onSelectTask(tasks[nextRow].id);
          document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp' && !e.shiftKey) {
          const prevRow = Math.max(0, currentRowIdx - 1);
          setActiveCell({ rowIdx: prevRow, colIdx: currentColIdx });
          onSelectTask(tasks[prevRow].id);
          document.getElementById(`grid-row-${tasks[prevRow].id}`)?.scrollIntoView({ block: 'nearest' });
        }
        gridContainerRef.current?.focus();
      } else if (e.key === 'Enter' || e.key === 'F2') {
        let currentRowIdx = activeCell?.rowIdx ?? -1;
        const currentColIdx = activeCell?.colIdx ?? 1;

        if (currentRowIdx === -1 && selectedTaskId) {
          currentRowIdx = tasks.findIndex((t) => t.id === selectedTaskId);
        }
        if (currentRowIdx === -1 && tasks.length > 0) {
          currentRowIdx = 0;
        }
        if (currentRowIdx === -1) return;

        const col = COLUMNS[currentColIdx];
        if (col && !col.readonly) {
          const task = tasks[currentRowIdx];
          if (task && (!task.isSummary || col.field === 'name')) {
            e.preventDefault();
            gridContainerRef.current?.focus();
            startEdit(currentRowIdx, currentColIdx);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeCell, selectedTaskId, tasks, editingCell, onSelectTask, allTasks]);

  // Keyboard Navigation Handler (Spreadsheet Excel/MSP Style)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        if (editingCell.rowIdx < tasks.length - 1) {
          setActiveCell({ rowIdx: editingCell.rowIdx + 1, colIdx: editingCell.colIdx });
          onSelectTask(tasks[editingCell.rowIdx + 1].id);
        } else {
          onAddTask(tasks[editingCell.rowIdx].id);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        const nextCol = e.shiftKey ? Math.max(0, editingCell.colIdx - 1) : Math.min(COLUMNS.length - 1, editingCell.colIdx + 1);
        setActiveCell({ rowIdx: editingCell.rowIdx, colIdx: nextCol });
        startEdit(editingCell.rowIdx, nextCol);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingCell(null);
        gridContainerRef.current?.focus();
      }
      return;
    }

    let currentRowIdx = activeCell?.rowIdx ?? -1;
    let currentColIdx = activeCell?.colIdx ?? 1;

    if (currentRowIdx === -1 && selectedTaskId) {
      currentRowIdx = tasks.findIndex((t) => t.id === selectedTaskId);
    }
    if (currentRowIdx === -1 && tasks.length > 0) {
      currentRowIdx = 0;
    }

    if (currentRowIdx === -1) return;

    // Alt+Arrow keys MUST be evaluated before plain Arrow keys
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'Right')) {
      e.preventDefault();
      e.stopPropagation();
      onIndentTask(tasks[currentRowIdx].id);
      return;
    } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left')) {
      e.preventDefault();
      e.stopPropagation();
      onOutdentTask(tasks[currentRowIdx].id);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      const nextRow = Math.min(tasks.length - 1, currentRowIdx + 1);
      setActiveCell({ rowIdx: nextRow, colIdx: currentColIdx });
      onSelectTask(tasks[nextRow].id);
      document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      const prevRow = Math.max(0, currentRowIdx - 1);
      setActiveCell({ rowIdx: prevRow, colIdx: currentColIdx });
      onSelectTask(tasks[prevRow].id);
      document.getElementById(`grid-row-${tasks[prevRow].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowRight' && !e.altKey) {
      e.preventDefault();
      const nextCol = Math.min(COLUMNS.length - 1, currentColIdx + 1);
      setActiveCell({ rowIdx: currentRowIdx, colIdx: nextCol });
    } else if (e.key === 'ArrowLeft' && !e.altKey) {
      e.preventDefault();
      const prevCol = Math.max(0, currentColIdx - 1);
      setActiveCell({ rowIdx: currentRowIdx, colIdx: prevCol });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      startEdit(currentRowIdx, currentColIdx);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (selectedTaskId) onDeleteTask(selectedTaskId);
    } else if (e.key === 'Insert') {
      e.preventDefault();
      onAddTask(tasks[currentRowIdx]?.id);
    }
  };

  // Format cell value to plain text for copy-paste operations
  const getCellValueAsString = (task: Task, field: ColumnField): string => {
    switch (field) {
      case 'wbs':
        return task.wbsCode;
      case 'name':
        return task.name;
      case 'duration':
        return String(task.duration);
      case 'startDate':
        return task.startDate;
      case 'endDate':
        return task.endDate;
      case 'progress':
        return `${task.progress}%`;
      case 'weight':
        return task.weight !== undefined ? `${task.weight}%` : '';
      case 'predecessors':
        return task.predecessorText || (allTasks ? formatPredecessors(task.predecessors, allTasks) : '');
      case 'totalFloat':
        return task.totalFloat !== undefined ? `${task.totalFloat}d` : '';
      case 'plannedManHours':
        return String(task.plannedManHours || 0);
      case 'actualManHours':
        return String(task.actualManHours || 0);
      case 'remainingManHours':
        return String(task.remainingManHours || 0);
      case 'earnedManHours':
        return String(task.earnedManHours || 0);
      case 'baselineStart':
        return task.baselineStartDate || '';
      case 'baselineEnd':
        return task.baselineEndDate || '';
      case 'variance':
        return task.baselineVarianceDays !== undefined ? `${task.baselineVarianceDays}d` : '';
      case 'notes':
        return task.notes || '';
      default:
        return '';
    }
  };

  // Clipboard Copy Handler for Active Cell
  const handleCopy = (e: React.ClipboardEvent) => {
    if (editingCell) return;
    if (!activeCell) return;
    const task = tasks[activeCell.rowIdx];
    const col = COLUMNS[activeCell.colIdx];
    if (!task || !col) return;

    const textToCopy = getCellValueAsString(task, col.field);
    e.preventDefault();
    e.clipboardData.setData('text/plain', textToCopy);
  };

  // Clipboard Paste Handler (Supports copying columns/rows from Excel/Google Sheets)
  const handlePaste = (e: React.ClipboardEvent) => {
    // If user is currently editing inside an active input, let native text input paste work
    if (editingCell) return;

    const clipText = e.clipboardData.getData('text/plain');
    if (!clipText || !clipText.trim()) return;

    e.preventDefault();

    // Split text into rows (handles CRLF and LF)
    const rawLines = clipText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    // Filter out trailing empty line often appended by Excel
    const lines = rawLines.filter((l, idx) => idx < rawLines.length - 1 || l.trim().length > 0);
    if (lines.length === 0) return;

    const matrix = lines.map((line) => line.split('\t'));
    const startRow = activeCell?.rowIdx ?? (selectedTaskId ? Math.max(0, tasks.findIndex((t) => t.id === selectedTaskId)) : 0);
    const startCol = activeCell?.colIdx ?? 1; // Default to Column 1 (Task Name)

    onPasteRows?.(startRow, startCol, matrix);
  };

  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      onPaste={handlePaste}
      style={{ backgroundColor: theme.surfaceBg, fontFamily: theme.fontFamily }}
      className="flex flex-col h-full select-none overflow-hidden focus:outline-none"
    >
      {/* Spreadsheet Table View */}
      <div
        ref={tableScrollRef}
        onScroll={(e) => onVerticalScroll?.((e.target as HTMLElement).scrollTop)}
        style={{ backgroundColor: theme.surfaceBg }}
        className="flex-1 overflow-auto"
      >
        <table style={{ tableLayout: 'fixed' }} className={`w-full border-collapse ${textSizeClass}`}>
          <thead
            style={{ backgroundColor: theme.headerBg, borderBottomColor: theme.border }}
            className="sticky top-0 z-30 shadow-2xs border-b"
          >
            <tr style={{ height: '56px' }}>
              <th
                style={{ height: '56px', backgroundColor: theme.headerBg, borderRightColor: theme.border, color: theme.headerText }}
                className="w-10 px-1 py-2 text-center font-bold select-none border-r"
              >
                #
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.field}
                  style={{ width: `${col.width}px`, height: '56px', backgroundColor: theme.headerBg, borderRightColor: theme.border, color: theme.headerText }}
                  className={`px-2.5 py-2 text-left font-bold border-r whitespace-nowrap tracking-tight ${headerSizeClass}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={COLUMNS.length + 1} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const task = tasks[virtualRow.index];
              const rowIdx = virtualRow.index;
              if (!task) return null;
              const isSelected = selectedTaskIds ? selectedTaskIds.includes(task.id) : selectedTaskId === task.id;
              const depth = (task.wbsCode.match(/\./g) || []).length;

              return (
                <tr
                  key={task.id}
                  id={`grid-row-${task.id}`}
                  style={{
                    height: `${rowHeight}px`,
                    maxHeight: `${rowHeight}px`,
                    minHeight: `${rowHeight}px`,
                    boxSizing: 'border-box',
                    borderBottomColor: theme.border,
                    backgroundColor: isSelected
                      ? theme.rowSelectedBg
                      : rowIdx % 2 === 0
                      ? theme.surfaceBg
                      : theme.rowAltBg,
                    borderLeftColor: isSelected ? theme.signal : undefined,
                    borderLeftWidth: isSelected ? '4px' : undefined
                  }}
                  onClick={() => {
                    onSelectTask(task.id);
                    setActiveCell((prev) => ({ rowIdx, colIdx: prev?.colIdx ?? 1 }));
                    gridContainerRef.current?.focus();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectTask(task.id);
                    onContextMenu?.(e, task);
                  }}
                  className="border-b cursor-pointer transition-colors"
                >
                  {/* Row Index with OnlineGantt-style Grip Handle */}
                  <td
                    style={{
                      height: `${rowHeight}px`,
                      maxHeight: `${rowHeight}px`,
                      boxSizing: 'border-box',
                      borderRightColor: theme.border,
                      backgroundColor: rowIdx % 2 === 0 ? theme.surfaceBg : theme.rowAltBg,
                      color: theme.textSecondary
                    }}
                    className="px-1 text-center border-r select-none cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task.id, { isShift: e.shiftKey, isCtrl: e.ctrlKey || e.metaKey });
                      setActiveCell((prev) => ({ rowIdx, colIdx: prev?.colIdx ?? 1 }));
                      gridContainerRef.current?.focus();
                    }}
                    title="Double-click to view Task Information"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task.id);
                      onOpenTaskInfo?.(task);
                    }}
                  >
                    <div className="flex items-center justify-center space-x-0.5" style={{ color: theme.textSecondary }}>
                      <GripVertical className="w-3 h-3 opacity-60" />
                      <span className="font-mono font-bold text-[11px]">{rowIdx + 1}</span>
                    </div>
                  </td>

                  {/* Columns */}
                  {COLUMNS.map((col, colIdx) => {
                    const isCellActive = activeCell?.rowIdx === rowIdx && activeCell?.colIdx === colIdx;
                    const isCellEditing = editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx;

                    let displayVal: React.ReactNode = null;

                    if (col.field === 'wbs') {
                      displayVal = (
                        <span className="font-mono font-bold" style={{ color: theme.textSecondary }}>
                          {task.wbsCode}
                        </span>
                      );
                    } else if (col.field === 'name') {
                      displayVal = (
                        <div
                          style={{ paddingLeft: `${depth * 18}px` }}
                          className="flex items-center space-x-1.5 overflow-hidden"
                        >
                          {task.isSummary ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCollapse(task.id);
                              }}
                              style={{ color: theme.textPrimary }}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 font-black cursor-pointer select-none transition-colors"
                              title={task.isCollapsed ? 'Expand Task' : 'Collapse Task'}
                            >
                              {task.isCollapsed ? '▶' : '▼'}
                            </button>
                          ) : task.isMilestone || task.duration === 0 ? (
                            <Flag className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : null}
                          <span
                            style={{ color: theme.textPrimary }}
                            className={`truncate ${
                              task.isSummary ? 'font-bold text-sm' : 'font-medium'
                            }`}
                          >
                            {task.name}
                          </span>
                          {task.notes && task.notes.trim() && (
                            <span
                              className="inline-flex items-center shrink-0 cursor-help ml-1 p-0.5 rounded hover:bg-amber-100/30 transition-colors"
                              title={`Note:\n${task.notes}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTaskInfo?.(task);
                              }}
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-500 hover:text-amber-400" />
                            </span>
                          )}
                        </div>
                      );
                    } else if (col.field === 'duration') {
                      displayVal = (
                        <span className="font-bold tabular-nums" style={{ color: theme.textPrimary }}>
                          {`${task.duration} d`}
                        </span>
                      );
                    } else if (col.field === 'startDate') {
                      displayVal = <span className="font-mono font-semibold tabular-nums" style={{ color: theme.textPrimary }}>{task.startDate}</span>;
                    } else if (col.field === 'endDate') {
                      displayVal = <span className="font-mono font-semibold tabular-nums" style={{ color: theme.textPrimary }}>{task.endDate}</span>;
                    } else if (col.field === 'progress') {
                      displayVal = (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold w-9 text-right tabular-nums" style={{ color: theme.textPrimary }}>{task.progress}%</span>
                          <div
                            style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#374151' : '#E2E8F0' }}
                            className="flex-1 h-2 rounded-full overflow-hidden border"
                          >
                            <div
                              style={{ width: `${task.progress}%`, backgroundColor: theme.taskProgressFill || theme.signal }}
                              className="h-full rounded-full transition-all"
                            />
                          </div>
                        </div>
                      );
                    } else if (col.field === 'weight') {
                      displayVal = <span className="font-mono font-bold tabular-nums" style={{ color: theme.textSecondary }}>{task.weight}%</span>;
                    } else if (col.field === 'predecessors') {
                      displayVal = (
                        <div className="flex items-center justify-between group/pred">
                          <span
                            className="font-mono font-bold"
                            style={{ color: theme.isDark ? '#93C5FD' : '#1E3A8A' }}
                          >
                            {task.predecessorText || '-'}
                          </span>
                          {!task.isSummary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPredecessorModal(task);
                              }}
                              className="opacity-0 group-hover/pred:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-opacity"
                              style={{ color: theme.signal }}
                              title="Edit Relationships"
                            >
                              <GitCommit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    } else if (col.field === 'totalFloat') {
                      const tf = task.totalFloat ?? 0;
                      displayVal = (
                        <span
                          style={{
                            color: task.isCritical ? theme.critical : theme.textSecondary,
                            backgroundColor: task.isCritical ? `${theme.critical}20` : undefined,
                            borderColor: task.isCritical ? `${theme.critical}60` : undefined
                          }}
                          className={`font-mono font-bold tabular-nums ${task.isCritical ? 'border px-1.5 py-0.5 rounded text-[11px]' : ''}`}
                        >
                          {tf}d
                        </span>
                      );
                    } else if (col.field === 'plannedManHours') {
                      displayVal = <span className="font-mono font-bold tabular-nums" style={{ color: theme.textPrimary }}>{task.plannedManHours || 0}</span>;
                    } else if (col.field === 'actualManHours') {
                      displayVal = <span className="font-mono font-bold tabular-nums" style={{ color: theme.textPrimary }}>{task.actualManHours || 0}</span>;
                    } else if (col.field === 'remainingManHours') {
                      displayVal = <span className="font-mono font-bold tabular-nums" style={{ color: theme.textSecondary }}>{task.remainingManHours || 0}</span>;
                    } else if (col.field === 'earnedManHours') {
                      displayVal = <span className="font-mono font-bold tabular-nums" style={{ color: '#10B981' }}>{task.earnedManHours || 0}</span>;
                    } else if (col.field === 'baselineStart') {
                      displayVal = <span className="font-mono tabular-nums" style={{ color: theme.textSecondary }}>{task.baselineStartDate || '-'}</span>;
                    } else if (col.field === 'baselineEnd') {
                      displayVal = <span className="font-mono tabular-nums" style={{ color: theme.textSecondary }}>{task.baselineEndDate || '-'}</span>;
                    } else if (col.field === 'variance') {
                      if (task.baselineVarianceDays !== undefined) {
                        const isLate = task.baselineVarianceDays > 0;
                        const isEarly = task.baselineVarianceDays < 0;
                        displayVal = (
                          <span
                            style={{ color: isLate ? theme.critical : isEarly ? '#10B981' : theme.textSecondary }}
                            className="font-bold font-mono tabular-nums"
                          >
                            {isLate ? `+${task.baselineVarianceDays}d` : `${task.baselineVarianceDays}d`}
                          </span>
                        );
                      } else {
                        displayVal = <span style={{ color: theme.textSecondary }}>-</span>;
                      }
                    } else if (col.field === 'notes') {
                      displayVal = task.notes ? (
                        <span className="truncate block text-[11px]" style={{ color: theme.textSecondary }} title={task.notes}>
                          {task.notes}
                        </span>
                      ) : (
                        <span className="italic text-[11px] opacity-40">Click to add note</span>
                      );
                    }

                    return (
                      <td
                        key={col.field}
                        style={{
                          height: `${rowHeight}px`,
                          maxHeight: `${rowHeight}px`,
                          boxSizing: 'border-box',
                          borderRightColor: theme.border,
                          color: theme.textPrimary
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(task.id);
                          setActiveCell({ rowIdx, colIdx });
                          gridContainerRef.current?.focus();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(task.id);
                          setActiveCell({ rowIdx, colIdx });
                          gridContainerRef.current?.focus();
                          if (col.field === 'wbs') {
                            onOpenTaskInfo?.(task);
                          } else {
                            startEdit(rowIdx, colIdx);
                          }
                        }}
                        className={`px-2.5 py-1 border-r relative whitespace-nowrap overflow-hidden text-ellipsis ${
                          isCellActive ? 'ring-2 ring-indigo-600 ring-inset z-10' : ''
                        }`}
                      >
                        {isCellEditing ? (
                          <input
                            ref={inputRef}
                            type={
                              col.field === 'startDate' || col.field === 'endDate'
                                ? 'date'
                                : col.field === 'duration' || col.field === 'progress' || col.field === 'plannedManHours' || col.field === 'actualManHours'
                                ? 'number'
                                : 'text'
                            }
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                commitEdit();
                                if (editingCell.rowIdx < tasks.length - 1) {
                                  const nextRow = editingCell.rowIdx + 1;
                                  setActiveCell({ rowIdx: nextRow, colIdx: editingCell.colIdx });
                                  onSelectTask(tasks[nextRow].id);
                                  document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
                                } else {
                                  onAddTask(tasks[editingCell.rowIdx].id);
                                }
                                gridContainerRef.current?.focus();
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                e.stopPropagation();
                                commitEdit();
                                const nextCol = e.shiftKey
                                  ? Math.max(0, editingCell.colIdx - 1)
                                  : Math.min(COLUMNS.length - 1, editingCell.colIdx + 1);
                                setActiveCell({ rowIdx: editingCell.rowIdx, colIdx: nextCol });
                                startEdit(editingCell.rowIdx, nextCol);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingCell(null);
                                gridContainerRef.current?.focus();
                              }
                            }}
                            style={{
                              backgroundColor: theme.surfaceBg,
                              color: theme.textPrimary,
                              borderColor: theme.signal
                            }}
                            className="w-full h-full border px-1 py-0.5 text-xs font-bold outline-none rounded shadow-xs"
                          />
                        ) : (
                          displayVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={COLUMNS.length + 1} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
