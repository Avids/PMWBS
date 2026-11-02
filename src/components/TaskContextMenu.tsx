import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '../types/project';
import {
  Pencil,
  Trash2,
  Plus,
  Copy,
  ChevronRight,
  Flag,
  FileSpreadsheet,
  Unlink,
  GitCommit
} from 'lucide-react';

interface TaskContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  task: Task | null;
  onClose: () => void;
  onOpenTaskInfo: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskBelow: (afterTaskId: string) => void;
  onAddSubtask: (parentTaskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onClearDependencies?: (taskId: string) => void;
  onOpenPredecessors?: (task: Task) => void;
  onToggleMilestone?: (taskId: string) => void;
}

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
  const menuWidth = 190;
  const menuHeight = 240;
  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, posX)}px`, top: `${Math.max(10, posY)}px` }}
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 min-w-[190px] text-xs font-sans text-slate-800 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. Task Information */}
      <button
        onClick={() => {
          onOpenTaskInfo(task);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-700" />
        <span>Task Information</span>
      </button>

      {/* 2. Delete Task */}
      <button
        onClick={() => {
          onDeleteTask(task.id);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-left font-medium"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500" />
        <span>Delete Task</span>
      </button>

      <div className="h-px bg-slate-200 my-1 mx-1.5"></div>

      {/* 3. Add Task (with Submenu) */}
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
            <span>Add Task</span>
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
              <span>Add Task Below</span>
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

      {/* 4. Duplicate Task */}
      <button
        onClick={() => {
          onDuplicateTask(task.id);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-slate-100 transition-colors text-left font-medium"
      >
        <Copy className="w-3.5 h-3.5 text-slate-700" />
        <span>Duplicate Task</span>
      </button>

      <div className="h-px bg-slate-200 my-1 mx-1.5"></div>

      {/* 5. Delete Dependency (Predecessors) */}
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

      {/* 6. Convert (To Milestone / Task) */}
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
    </div>
  );
};
