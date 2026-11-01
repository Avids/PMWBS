import React, { useState, useEffect, useRef } from 'react';
import type { Task, WeightMode } from '../types/project';
import { ChevronDown, Flag, Plus, Trash2, ArrowRight, ArrowLeft, GitCommit } from 'lucide-react';
import { parsePredecessors } from '../engine/scheduler';

interface SpreadsheetGridProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (afterTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onOpenPredecessorModal: (task: Task) => void;
  weightMode: WeightMode;
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
  | 'plannedManHours'
  | 'actualManHours'
  | 'remainingManHours'
  | 'earnedManHours'
  | 'baselineStart'
  | 'baselineEnd'
  | 'variance';

const COLUMNS: { field: ColumnField; label: string; width: number; readonly?: boolean }[] = [
  { field: 'wbs', label: 'WBS', width: 65, readonly: true },
  { field: 'name', label: 'Task Name', width: 230 },
  { field: 'duration', label: 'Duration (d)', width: 90 },
  { field: 'startDate', label: 'Start Date', width: 110 },
  { field: 'endDate', label: 'End Date', width: 110 },
  { field: 'progress', label: '% Complete', width: 85 },
  { field: 'weight', label: 'Weight %', width: 80, readonly: true },
  { field: 'predecessors', label: 'Predecessors', width: 140 },
  { field: 'plannedManHours', label: 'Plan MH', width: 80 },
  { field: 'actualManHours', label: 'Act MH', width: 80 },
  { field: 'remainingManHours', label: 'Rem MH', width: 80, readonly: true },
  { field: 'earnedManHours', label: 'Earn MH', width: 80, readonly: true },
  { field: 'baselineStart', label: 'Base Start', width: 100, readonly: true },
  { field: 'baselineEnd', label: 'Base End', width: 100, readonly: true },
  { field: 'variance', label: 'Variance (d)', width: 90, readonly: true }
];

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onOpenPredecessorModal,
  weightMode
}) => {
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Resolve row numbers (e.g. 2FS+5d) against tasks
      updates.predecessors = parsePredecessors(editValue, tasks);
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

    if (!activeCell) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(tasks.length - 1, activeCell.rowIdx + 1);
      setActiveCell({ rowIdx: nextRow, colIdx: activeCell.colIdx });
      onSelectTask(tasks[nextRow].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, activeCell.rowIdx - 1);
      setActiveCell({ rowIdx: prevRow, colIdx: activeCell.colIdx });
      onSelectTask(tasks[prevRow].id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = Math.min(COLUMNS.length - 1, activeCell.colIdx + 1);
      setActiveCell({ rowIdx: activeCell.rowIdx, colIdx: nextCol });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = Math.max(0, activeCell.colIdx - 1);
      setActiveCell({ rowIdx: activeCell.rowIdx, colIdx: prevCol });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startEdit(activeCell.rowIdx, activeCell.colIdx);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey ? Math.max(0, activeCell.colIdx - 1) : Math.min(COLUMNS.length - 1, activeCell.colIdx + 1);
      setActiveCell({ rowIdx: activeCell.rowIdx, colIdx: nextCol });
    } else if (e.key === 'Insert') {
      e.preventDefault();
      onAddTask(tasks[activeCell.rowIdx].id);
    } else if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onDeleteTask(tasks[activeCell.rowIdx].id);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      onIndentTask(tasks[activeCell.rowIdx].id);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      onOutdentTask(tasks[activeCell.rowIdx].id);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full bg-white select-none overflow-hidden focus:outline-none"
    >
      {/* Grid Sub-Header Actions */}
      <div className="h-10 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => selectedTaskId && onIndentTask(selectedTaskId)}
            title="Indent Task (Alt+Right)"
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center space-x-1"
          >
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Indent</span>
          </button>
          <button
            onClick={() => selectedTaskId && onOutdentTask(selectedTaskId)}
            title="Outdent Task (Alt+Left)"
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Outdent</span>
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1"></div>
          <button
            onClick={() => onAddTask(selectedTaskId || undefined)}
            title="Add Task Below (Insert)"
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
          <button
            onClick={() => {
              const currentTask = tasks.find(t => t.id === selectedTaskId);
              if (currentTask && !currentTask.isSummary) {
                onOpenPredecessorModal(currentTask);
              }
            }}
            disabled={!selectedTaskId || tasks.find(t => t.id === selectedTaskId)?.isSummary}
            title="Edit Task Relationships & Lag (FS, SS, FF, SF)"
            className="p-1.5 hover:bg-slate-200 text-indigo-600 rounded-md transition-colors flex items-center space-x-1 disabled:opacity-40"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Relationships</span>
          </button>
          <button
            onClick={() => selectedTaskId && onDeleteTask(selectedTaskId)}
            title="Delete Selected Task (Ctrl+Delete)"
            className="p-1.5 hover:bg-slate-200 text-red-600 rounded-md transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          Weight Basis: <span className="font-semibold text-slate-700 uppercase">{weightMode}</span>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 shadow-xs">
            <tr>
              <th className="w-8 px-1 py-2 text-center text-slate-400 font-normal border-r border-slate-200">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.field}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-2 text-left font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap"
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
                  onClick={() => {
                    onSelectTask(task.id);
                    setActiveCell({ rowIdx, colIdx: 1 });
                  }}
                  className={`h-9 border-b border-slate-200 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/70' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {/* Row Index */}
                  <td className="px-1 text-center text-slate-400 font-mono text-[10px] border-r border-slate-200 select-none">
                    {rowIdx + 1}
                  </td>

                  {/* Columns */}
                  {COLUMNS.map((col, colIdx) => {
                    const isCellActive = activeCell?.rowIdx === rowIdx && activeCell?.colIdx === colIdx;
                    const isCellEditing = editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx;

                    let displayVal: React.ReactNode = '';
                    if (col.field === 'wbs') {
                      displayVal = <span className="font-mono text-slate-500 font-medium">{task.wbsCode}</span>;
                    } else if (col.field === 'name') {
                      displayVal = (
                        <div
                          style={{ paddingLeft: `${depth * 16}px` }}
                          className="flex items-center space-x-1.5 overflow-hidden"
                        >
                          {task.isSummary ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          ) : task.isMilestone || task.duration === 0 ? (
                            <Flag className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-1"></div>
                          )}
                          <span
                            className={`truncate ${
                              task.isSummary ? 'font-bold text-slate-900' : 'text-slate-800'
                            }`}
                          >
                            {task.name}
                          </span>
                        </div>
                      );
                    } else if (col.field === 'duration') {
                      displayVal = task.duration === 0 ? '0 d (Milestone)' : `${task.duration} d`;
                    } else if (col.field === 'startDate') {
                      displayVal = task.startDate;
                    } else if (col.field === 'endDate') {
                      displayVal = task.endDate;
                    } else if (col.field === 'progress') {
                      displayVal = (
                        <div className="flex items-center space-x-1">
                          <span className="font-mono">{task.progress}%</span>
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${task.progress}%` }}
                              className="h-full bg-indigo-600 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    } else if (col.field === 'weight') {
                      displayVal = <span className="font-mono text-slate-600">{task.weight}%</span>;
                    } else if (col.field === 'predecessors') {
                      displayVal = (
                        <div className="flex items-center justify-between group/pred">
                          <span className="font-mono text-slate-700 font-medium">
                            {task.predecessorText || '-'}
                          </span>
                          {!task.isSummary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPredecessorModal(task);
                              }}
                              className="opacity-0 group-hover/pred:opacity-100 p-0.5 hover:bg-indigo-100 text-indigo-600 rounded transition-opacity"
                              title="Open Relationship Dialog"
                            >
                              <GitCommit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    } else if (col.field === 'plannedManHours') {
                      displayVal = <span className="font-mono">{task.plannedManHours || 0}</span>;
                    } else if (col.field === 'actualManHours') {
                      displayVal = <span className="font-mono">{task.actualManHours || 0}</span>;
                    } else if (col.field === 'remainingManHours') {
                      displayVal = <span className="font-mono text-slate-500">{task.remainingManHours || 0}</span>;
                    } else if (col.field === 'earnedManHours') {
                      displayVal = <span className="font-mono text-emerald-700 font-semibold">{task.earnedManHours || 0}</span>;
                    } else if (col.field === 'baselineStart') {
                      displayVal = <span className="text-slate-500">{task.baselineStartDate || '-'}</span>;
                    } else if (col.field === 'baselineEnd') {
                      displayVal = <span className="text-slate-500">{task.baselineEndDate || '-'}</span>;
                    } else if (col.field === 'variance') {
                      if (task.baselineVarianceDays !== undefined) {
                        const isLate = task.baselineVarianceDays > 0;
                        const isEarly = task.baselineVarianceDays < 0;
                        displayVal = (
                          <span
                            className={`font-semibold ${
                              isLate ? 'text-red-600' : isEarly ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {task.baselineVarianceDays > 0 ? `+${task.baselineVarianceDays} d` : `${task.baselineVarianceDays} d`}
                          </span>
                        );
                      } else {
                        displayVal = '-';
                      }
                    }

                    return (
                      <td
                        key={col.field}
                        onDoubleClick={() => startEdit(rowIdx, colIdx)}
                        onClick={() => setActiveCell({ rowIdx, colIdx })}
                        className={`px-2 py-1 border-r border-slate-200 relative whitespace-nowrap overflow-hidden text-ellipsis ${
                          isCellActive ? 'ring-2 ring-indigo-500 z-5' : ''
                        }`}
                      >
                        {isCellEditing ? (
                          <input
                            ref={inputRef}
                            type={col.field === 'startDate' || col.field === 'endDate' ? 'date' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            placeholder={col.field === 'predecessors' ? 'e.g. 2FS+5d' : ''}
                            className="w-full h-full p-0 m-0 border-none outline-none bg-white text-xs text-slate-900"
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
