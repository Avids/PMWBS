import React, { useState, useEffect, useRef } from 'react';
import type { Task, WeightMode, FontSizeOption } from '../types/project';
import { Flag, GitCommit, GripVertical } from 'lucide-react';
import { parsePredecessors } from '../engine/scheduler';

interface SpreadsheetGridProps {
  tasks: Task[];
  allTasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (afterTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onOpenPredecessorModal: (task: Task) => void;
  onToggleCollapse: (taskId: string) => void;
  weightMode: WeightMode;
  fontSize?: FontSizeOption;
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
  | 'variance';

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
  { field: 'variance', label: 'Variance (d)', width: 95, readonly: true }
];

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  tasks,
  allTasks,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onOpenPredecessorModal,
  onToggleCollapse,
  fontSize = 'normal'
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

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

  // Global ArrowUp / ArrowDown navigation (prevents window scrolling and navigates tasks)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input, textarea, or select is focused or cell is editing
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (editingCell) return;

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

        if (e.key === 'ArrowDown') {
          const nextRow = Math.min(tasks.length - 1, currentRowIdx + 1);
          setActiveCell({ rowIdx: nextRow, colIdx: currentColIdx });
          onSelectTask(tasks[nextRow].id);
          document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          const prevRow = Math.max(0, currentRowIdx - 1);
          setActiveCell({ rowIdx: prevRow, colIdx: currentColIdx });
          onSelectTask(tasks[prevRow].id);
          document.getElementById(`grid-row-${tasks[prevRow].id}`)?.scrollIntoView({ block: 'nearest' });
        }
        gridContainerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeCell, selectedTaskId, tasks, editingCell, onSelectTask]);

  // Height and font sizing based on fontSize prop
  const rowHeight = fontSize === 'small' ? 30 : fontSize === 'large' ? 44 : 36;
  const textSizeClass = fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-[15px]' : 'text-[13px]';
  const headerSizeClass = fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-[14px]' : 'text-xs';

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

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

    onUpdateTask(task.id, updates);
    setEditingCell(null);
  };

  const startEdit = (rowIdx: number, colIdx: number) => {
    const col = COLUMNS[colIdx];
    if (col.readonly) return;
    const task = tasks[rowIdx];
    if (!task) return;

    let val = '';
    if (col.field === 'name') val = task.name;
    else if (col.field === 'duration') val = String(task.duration);
    else if (col.field === 'startDate') val = task.startDate;
    else if (col.field === 'endDate') val = task.endDate;
    else if (col.field === 'progress') val = String(task.progress);
    else if (col.field === 'predecessors') val = task.predecessorText || '';
    else if (col.field === 'plannedManHours') val = String(task.plannedManHours || 0);
    else if (col.field === 'actualManHours') val = String(task.actualManHours || 0);

    setEditValue(val);
    setEditingCell({ rowIdx, colIdx });
  };

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
        setEditingCell(null);
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

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(tasks.length - 1, currentRowIdx + 1);
      setActiveCell({ rowIdx: nextRow, colIdx: currentColIdx });
      onSelectTask(tasks[nextRow].id);
      document.getElementById(`grid-row-${tasks[nextRow].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, currentRowIdx - 1);
      setActiveCell({ rowIdx: prevRow, colIdx: currentColIdx });
      onSelectTask(tasks[prevRow].id);
      document.getElementById(`grid-row-${tasks[prevRow].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = Math.min(COLUMNS.length - 1, currentColIdx + 1);
      setActiveCell({ rowIdx: currentRowIdx, colIdx: nextCol });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = Math.max(0, currentColIdx - 1);
      setActiveCell({ rowIdx: currentRowIdx, colIdx: prevCol });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEdit(currentRowIdx, currentColIdx);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (selectedTaskId) onDeleteTask(selectedTaskId);
    } else if (e.key === 'Insert') {
      e.preventDefault();
      onAddTask(tasks[currentRowIdx]?.id);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      onIndentTask(tasks[currentRowIdx].id);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      onOutdentTask(tasks[currentRowIdx].id);
    }
  };

  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full bg-white select-none overflow-hidden focus:outline-none"
    >
      {/* Spreadsheet Table View */}
      <div className="flex-1 overflow-auto bg-white">
        <table className={`w-full border-collapse ${textSizeClass}`}>
          <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-300 shadow-2xs">
            <tr className="h-10">
              <th className="w-10 px-1 py-2 text-center text-slate-800 font-bold border-r border-slate-300 bg-slate-100 select-none">
                #
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.field}
                  style={{ width: `${col.width}px` }}
                  className={`px-2.5 py-2 text-left font-bold text-slate-900 border-r border-slate-300 bg-slate-100 whitespace-nowrap tracking-tight ${headerSizeClass}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, rowIdx) => {
              const isSelected = selectedTaskId === task.id;
              const depth = (task.wbsCode.match(/\./g) || []).length;

              return (
                <tr
                  key={task.id}
                  id={`grid-row-${task.id}`}
                  style={{ height: `${rowHeight}px` }}
                  onClick={() => {
                    onSelectTask(task.id);
                    setActiveCell({ rowIdx, colIdx: 1 });
                  }}
                  className={`border-b border-slate-200 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-100/70 border-l-4 border-l-indigo-600'
                      : rowIdx % 2 === 0
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Row Index with OnlineGantt-style Grip Handle */}
                  <td className="px-1 text-center border-r border-slate-200 select-none bg-slate-50/50">
                    <div className="flex items-center justify-center space-x-0.5 text-slate-700">
                      <GripVertical className="w-3 h-3 text-slate-400" />
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
                        <span className="font-mono font-bold text-slate-800">
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
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 text-slate-900 font-black cursor-pointer select-none transition-colors"
                              title={task.isCollapsed ? 'Expand Task' : 'Collapse Task'}
                            >
                              {task.isCollapsed ? '▶' : '▼'}
                            </button>
                          ) : task.isMilestone || task.duration === 0 ? (
                            <Flag className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : null}
                          <span
                            className={`truncate ${
                              task.isSummary ? 'font-bold text-slate-950 text-sm' : 'font-medium text-slate-900'
                            }`}
                          >
                            {task.name}
                          </span>
                        </div>
                      );
                    } else if (col.field === 'duration') {
                      displayVal = (
                        <span className="font-bold text-slate-900">
                          {task.duration === 0 ? '0 d (Milestone)' : `${task.duration} d`}
                        </span>
                      );
                    } else if (col.field === 'startDate') {
                      displayVal = <span className="font-mono font-semibold text-slate-900">{task.startDate}</span>;
                    } else if (col.field === 'endDate') {
                      displayVal = <span className="font-mono font-semibold text-slate-900">{task.endDate}</span>;
                    } else if (col.field === 'progress') {
                      displayVal = (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900 w-9 text-right">{task.progress}%</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                            <div
                              style={{ width: `${task.progress}%` }}
                              className="h-full bg-indigo-600 rounded-full transition-all"
                            />
                          </div>
                        </div>
                      );
                    } else if (col.field === 'weight') {
                      displayVal = <span className="font-mono font-bold text-slate-800">{task.weight}%</span>;
                    } else if (col.field === 'predecessors') {
                      displayVal = (
                        <div className="flex items-center justify-between group/pred">
                          <span className="font-mono font-bold text-indigo-950">
                            {task.predecessorText || '-'}
                          </span>
                          {!task.isSummary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPredecessorModal(task);
                              }}
                              className="opacity-0 group-hover/pred:opacity-100 p-0.5 hover:bg-indigo-100 text-indigo-700 rounded transition-opacity"
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
                          className={`font-mono font-bold ${
                            task.isCritical
                              ? 'text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[11px]'
                              : 'text-slate-700'
                          }`}
                        >
                          {tf}d
                        </span>
                      );
                    } else if (col.field === 'plannedManHours') {
                      displayVal = <span className="font-mono font-bold text-slate-900">{task.plannedManHours || 0}</span>;
                    } else if (col.field === 'actualManHours') {
                      displayVal = <span className="font-mono font-bold text-slate-900">{task.actualManHours || 0}</span>;
                    } else if (col.field === 'remainingManHours') {
                      displayVal = <span className="font-mono font-bold text-slate-800">{task.remainingManHours || 0}</span>;
                    } else if (col.field === 'earnedManHours') {
                      displayVal = <span className="font-mono font-bold text-emerald-800">{task.earnedManHours || 0}</span>;
                    } else if (col.field === 'baselineStart') {
                      displayVal = <span className="font-mono text-slate-700">{task.baselineStartDate || '-'}</span>;
                    } else if (col.field === 'baselineEnd') {
                      displayVal = <span className="font-mono text-slate-700">{task.baselineEndDate || '-'}</span>;
                    } else if (col.field === 'variance') {
                      if (task.baselineVarianceDays !== undefined) {
                        const isLate = task.baselineVarianceDays > 0;
                        const isEarly = task.baselineVarianceDays < 0;
                        displayVal = (
                          <span
                            className={`font-bold font-mono ${
                              isLate ? 'text-red-700' : isEarly ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                          >
                            {isLate ? `+${task.baselineVarianceDays}d` : `${task.baselineVarianceDays}d`}
                          </span>
                        );
                      } else {
                        displayVal = <span className="text-slate-400">-</span>;
                      }
                    }

                    return (
                      <td
                        key={col.field}
                        onDoubleClick={() => startEdit(rowIdx, colIdx)}
                        className={`px-2.5 py-1 border-r border-slate-200 relative whitespace-nowrap overflow-hidden text-ellipsis ${
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
                            className="w-full h-full bg-white border border-indigo-600 px-1 py-0.5 text-xs text-slate-900 font-bold outline-none rounded shadow-xs"
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
          </tbody>
        </table>
      </div>
    </div>
  );
};
