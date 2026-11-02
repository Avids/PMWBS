import React, { useState, useEffect, useMemo } from 'react';
import type { Task, TaskDependency, DependencyType } from '../types/project';
import { GitCommit, Plus, Trash2, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { detectDependencyCycle } from '../engine/scheduler';

interface PredecessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  allTasks: Task[];
  onSaveDependencies: (taskId: string, dependencies: TaskDependency[]) => void;
}

export const PredecessorModal: React.FC<PredecessorModalProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  onSaveDependencies
}) => {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);

  useEffect(() => {
    if (task) {
      setDependencies(task.predecessors ? [...task.predecessors] : []);
    }
  }, [task]);

  const cycleCheck = useMemo(() => {
    if (!task) return { hasCycle: false, cycleTaskIds: [], cyclePathFormatted: [], message: '' };
    return detectDependencyCycle(allTasks, { taskId: task.id, newPredecessors: dependencies });
  }, [allTasks, task, dependencies]);

  if (!isOpen || !task) return null;

  // Available candidate predecessors (excluding self and summary tasks that enclose it)
  const availableTasks = allTasks.filter(t => t.id !== task.id && !t.isSummary);

  const handleAddDependency = () => {
    if (dependencies.length >= 10) {
      alert('Maximum of 10 predecessors allowed per activity.');
      return;
    }
    // Find the first task that isn't already a predecessor
    const existingIds = new Set(dependencies.map(d => d.taskId));
    const candidate = availableTasks.find(t => !existingIds.has(t.id));
    if (!candidate) return;

    setDependencies(prev => [...prev, { taskId: candidate.id, type: 'FS', lag: 0 }]);
  };

  const handleUpdate = (index: number, updates: Partial<TaskDependency>) => {
    setDependencies(prev => prev.map((dep, i) => i === index ? { ...dep, ...updates } : dep));
  };

  const handleRemove = (index: number) => {
    setDependencies(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (cycleCheck.hasCycle) {
      alert(cycleCheck.message);
      return;
    }
    onSaveDependencies(task.id, dependencies);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitCommit className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-base">Task Relationships & Predecessors</h3>
              <p className="text-xs text-slate-300">
                Configuring predecessors for: <strong className="text-white">[{task.wbsCode}] {task.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Quick Help Callout */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 leading-relaxed flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Relationship Types & Gap Duration (Lag):</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-indigo-800">
                <li><strong>FS (Finish-to-Start):</strong> Task starts after predecessor finishes. A <strong>+5d</strong> gap creates a 5 working days gap before starting.</li>
                <li><strong>SS (Start-to-Start):</strong> Task starts at the same time as predecessor (or +N days after).</li>
                <li><strong>FF (Finish-to-Finish):</strong> Task finishes when predecessor finishes (or +N days later).</li>
                <li><strong>SF (Start-to-Finish):</strong> Task finishes after predecessor starts.</li>
              </ul>
            </div>
          </div>

          {/* Predecessors List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Active Predecessors ({dependencies.length} / 10 max)
              </label>
              {dependencies.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddDependency}
                  className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-md border border-indigo-200 flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Predecessor</span>
                </button>
              )}
            </div>

            {dependencies.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                No predecessors configured. This task will start at its earliest manual date.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dependencies.map((dep, index) => {
                  const predRow = allTasks.findIndex(t => t.id === dep.taskId) + 1;

                  return (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      {/* Predecessor Activity Selector */}
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-1">
                          Predecessor Task
                        </label>
                        <select
                          value={dep.taskId}
                          onChange={(e) => handleUpdate(index, { taskId: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          {availableTasks.map((t) => {
                            const row = allTasks.findIndex(item => item.id === t.id) + 1;
                            return (
                              <option key={t.id} value={t.id}>
                                Row {row}: [{t.wbsCode}] {t.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Relationship Type */}
                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-1">
                          Relationship
                        </label>
                        <select
                          value={dep.type}
                          onChange={(e) => handleUpdate(index, { type: e.target.value as DependencyType })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="FS">FS (Finish-to-Start)</option>
                          <option value="SS">SS (Start-to-Start)</option>
                          <option value="FF">FF (Finish-to-Finish)</option>
                          <option value="SF">SF (Start-to-Finish)</option>
                        </select>
                      </div>

                      {/* Lag / Gap Days */}
                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-1">
                          Gap / Lag (Days)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={dep.lag}
                            onChange={(e) => handleUpdate(index, { lag: parseInt(e.target.value, 10) || 0 })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 pointer-events-none">d</span>
                        </div>
                      </div>

                      {/* Summary Tag & Delete */}
                      <div className="flex items-center space-x-2 pt-4 sm:pt-4">
                        <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md border border-indigo-200">
                          {predRow}{dep.type}{dep.lag > 0 ? `+${dep.lag}d` : dep.lag < 0 ? `${dep.lag}d` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-200 transition-colors"
                          title="Remove dependency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cycle Warning Banner */}
        {cycleCheck.hasCycle && (
          <div className="mx-5 mb-2 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start space-x-2.5 text-xs text-red-800 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Circular Dependency Loop Detected!</p>
              <p className="mt-0.5 text-red-700 leading-snug">{cycleCheck.message}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={cycleCheck.hasCycle}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-xs ${
              cycleCheck.hasCycle
                ? 'bg-red-400 text-white cursor-not-allowed opacity-70'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {cycleCheck.hasCycle ? 'Resolve Loop to Apply' : 'Apply Relationships'}
          </button>
        </div>
      </div>
    </div>
  );
};
