import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '../types/project';
import {
  Pencil,
  Trash2,
  Plus,
  Copy,
  ClipboardPaste,
  ChevronRight,
  Flag,
  FileSpreadsheet,
  Unlink,
  GitCommit,
  FileText,
  Users
} from 'lucide-react';
import { MSPProgressIcon } from './ActionBar';

interface TaskContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  task: Task | null;
  onClose: () => void;
  onOpenTaskInfo: (task: Task, initialTab?: 'general' | 'dependency' | 'resources' | 'notes') => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskBelow: (afterTaskId: string) => void;
  onAddSubtask: (parentTaskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onCopyTask?: (task: Task) => void;
  onPasteTask?: () => void;
  canPaste?: boolean;
  onUpdateProgress?: (progress: number) => void;
  onClearDependencies?: (taskId: string) => void;
  onOpenPredecessors?: (task: Task) => void;
  onToggleMilestone?: (taskId: string) => void;
}

const PROGRESS_STEPS: Array<0 | 25 | 50 | 75 | 100> = [0, 25, 50, 75, 100];

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  isOpen,
  x,
  y,
  task,
  onClose,
  onOpenTaskInfo,
  onDeleteTask,
  onAddTaskBelow,
  onAddSubtask,
  onDuplicateTask,
  onCopyTask,
  onPasteTask,
  canPaste = true,
  onUpdateProgress,
  onClearDependencies,
  onOpenPredecessors,
  onToggleMilestone
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'add' | 'dependency' | 'convert' | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('scroll', onClose, true);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  // Viewport boundary clamping
  const menuWidth = 210;
  const menuHeight = 360;
  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, posX)}px`, top: `${Math.max(10, posY)}px` }}
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 min-w-[210px] text-xs font-sans text-slate-800 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. Quick Progress Row (MSP Style 0, 25, 50, 75, 100%) */}
      <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Progress
          </span>
          <span className="text-[10px] font-semibold text-blue-600">
            {task.isSummary ? 'Auto (Rollup)' : `${task.progress || 0}%`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {PROGRESS_STEPS.map((pct) => {
            const isCurrent = !task.isSummary && task.progress === pct;
            return (
              <button
                key={pct}
                disabled={task.isSummary}
                onClick={() => {
                  onUpdateProgress?.(pct);
                  onClose();
                }}
                title={
                  task.isSummary
                    ? 'Summary progress is calculated automatically'
                    : `Set progress to ${pct}%`
                }
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded border transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-100'
                } disabled:opacity-30 disabled:pointer-events-none`}
              >
                <MSPProgressIcon progress={pct} barColor="#3B82F6" fillLineColor="#0F172A" width={18} height={7} />
                <span className="text-[9px] font-medium text-slate-700 mt-0.5 leading-none">
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Task Information Modal Shortcuts */}
      <button
        onClick={() => {
          onOpenTaskInfo(task, 'general');
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-700" />
        <span>Task Information</span>
      </button>

      <button
        onClick={() => {
          onOpenTaskInfo(task, 'notes');
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <FileText className="w-3.5 h-3.5 text-amber-600" />
        <span>Task Notes...</span>
      </button>

      <button
        onClick={() => {
          onOpenTaskInfo(task, 'resources');
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <Users className="w-3.5 h-3.5 text-emerald-600" />
        <span>Resources & Man-Hours...</span>
      </button>

      <div className="h-px bg-slate-200 my-1 mx-1.5"></div>

      {/* 3. Clipboard Actions: Copy & Paste */}
      <button
        onClick={() => {
          if (onCopyTask) onCopyTask(task);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <div className="flex items-center space-x-2.5">
          <Copy className="w-3.5 h-3.5 text-slate-700" />
          <span>Copy Task</span>
        </div>
        <span className="text-[10px] text-slate-400">Ctrl+C</span>
      </button>

      <button
        disabled={!canPaste}
        onClick={() => {
          if (onPasteTask) onPasteTask();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors text-left font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2.5">
          <ClipboardPaste className="w-3.5 h-3.5 text-slate-700" />
          <span>Paste Task Below</span>
        </div>
        <span className="text-[10px] text-slate-400">Ctrl+V</span>
      </button>

      <button
        onClick={() => {
          onDuplicateTask(task.id);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <Copy className="w-3.5 h-3.5 text-slate-500" />
        <span>Duplicate Task</span>
      </button>

      <div className="h-px bg-slate-200 my-1 mx-1.5"></div>

      {/* 4. Add Task (with Submenu) */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('add')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          onClick={() => {
            onAddTaskBelow(task.id);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors text-left font-medium"
        >
          <div className="flex items-center space-x-2.5">
            <Plus className="w-3.5 h-3.5 text-slate-700" />
            <span>Add Activity</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {activeSubmenu === 'add' && (
          <div className="absolute left-full top-0 ml-0.5 bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[160px] text-xs z-50">
            <button
              onClick={() => {
                onAddTaskBelow(task.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 text-left font-medium"
            >
              <span>Add Activity Below</span>
            </button>
            <button
              onClick={() => {
                onAddSubtask(task.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 text-left font-medium"
            >
              <span>Add Subtask (Child)</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Dependencies (Predecessors) */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('dependency')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          onClick={() => {
            if (onOpenPredecessors) onOpenPredecessors(task);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors text-left font-medium"
        >
          <div className="flex items-center space-x-2.5">
            <GitCommit className="w-3.5 h-3.5 text-slate-700" />
            <span>Dependencies</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {activeSubmenu === 'dependency' && (
          <div className="absolute left-full top-0 ml-0.5 bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[170px] text-xs z-50">
            <button
              onClick={() => {
                if (onOpenPredecessors) onOpenPredecessors(task);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 text-left font-medium"
            >
              <GitCommit className="w-3 h-3 text-indigo-600" />
              <span>Edit Relationships</span>
            </button>
            <button
              disabled={!task.predecessors || task.predecessors.length === 0}
              onClick={() => {
                if (onClearDependencies) onClearDependencies(task.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left font-medium"
            >
              <Unlink className="w-3 h-3 text-red-500" />
              <span>Remove All Links</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Convert (To Milestone / Normal Task) */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('convert')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors text-left font-medium"
        >
          <div className="flex items-center space-x-2.5">
            <Flag className="w-3.5 h-3.5 text-slate-700" />
            <span>Convert</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {activeSubmenu === 'convert' && (
          <div className="absolute left-full top-0 ml-0.5 bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[170px] text-xs z-50">
            <button
              disabled={task.isSummary || task.isMilestone || task.duration === 0}
              onClick={() => {
                if (onToggleMilestone) onToggleMilestone(task.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 text-left font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flag className="w-3 h-3 text-emerald-600" />
              <span>Convert to Milestone (0d)</span>
            </button>
            <button
              disabled={!task.isMilestone && task.duration > 0}
              onClick={() => {
                if (onToggleMilestone) onToggleMilestone(task.id);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 text-left font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
              <span>Convert to Normal Task</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 my-1 mx-1.5"></div>

      {/* 7. Delete Task */}
      <button
        onClick={() => {
          onDeleteTask(task.id);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-left font-medium"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500" />
        <span>Delete Activity</span>
      </button>
    </div>
  );
};
