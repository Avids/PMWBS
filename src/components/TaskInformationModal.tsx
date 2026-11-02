import React, { useState, useEffect } from 'react';
import type { Task, TaskDependency, DependencyType, WeightMode, ProjectCalendar } from '../types/project';
import { X, Plus, Trash2 } from 'lucide-react';
import { addWorkingDays, countWorkingDays } from '../engine/scheduler';

interface TaskInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  allTasks: Task[];
  calendar: ProjectCalendar;
  onSaveTask: (taskId: string, updates: Partial<Task>) => void;
}

type TabKey = 'general' | 'dependency' | 'resources' | 'notes';

const COLOR_PRESETS = [
  { name: 'Default Level Color', value: '' },
  { name: 'Magenta / Pink', value: '#d946ef' },
  { name: 'Rose / Crimson', value: '#e11d48' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Sky Blue', value: '#0284c7' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Emerald Green', value: '#10b981' },
  { name: 'Amber / Orange', value: '#f59e0b' },
  { name: 'Deep Purple', value: '#7c3aed' },
  { name: 'Slate Gray', value: '#475569' }
];

export const TaskInformationModal: React.FC<TaskInformationModalProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  calendar,
  onSaveTask
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [plannedManHours, setPlannedManHours] = useState(0);
  const [actualManHours, setActualManHours] = useState(0);
  const [remainingManHours, setRemainingManHours] = useState(0);
  const [weightMode, setWeightMode] = useState<WeightMode>('duration');
  const [customWeight, setCustomWeight] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);

  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setStartDate(task.startDate || '');
      setEndDate(task.endDate || '');
      setDuration(task.duration ?? 1);
      setProgress(task.progress ?? 0);
      setColor(task.color || '');
      setAssignedTo(task.assignedTo || '');
      setPlannedManHours(task.plannedManHours || 0);
      setActualManHours(task.actualManHours || 0);
      setRemainingManHours(task.remainingManHours ?? Math.max(0, (task.plannedManHours || 0) - (task.actualManHours || 0)));
      setWeightMode(task.weightMode || 'duration');
      setCustomWeight(task.customWeight);
      setNotes(task.notes || '');
      setDependencies(task.predecessors ? [...task.predecessors] : []);
      setActiveTab('general');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  // Find task index (1-based row ID)
  const taskIndex = allTasks.findIndex(t => t.id === task.id);
  const displayId = taskIndex >= 0 ? `${taskIndex + 1}.00` : task.id;

  // Candidate predecessors (excluding self and summary parent tasks)
  const availableTasks = allTasks.filter(t => t.id !== task.id && !t.isSummary);

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart && duration > 0) {
      const newEnd = addWorkingDays(newStart, duration, calendar);
      setEndDate(newEnd);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (startDate && newEnd && newEnd >= startDate) {
      const newDur = countWorkingDays(startDate, newEnd, calendar);
      setDuration(newDur);
    }
  };

  const handleDurationChange = (newDur: number) => {
    const validDur = Math.max(0, newDur);
    setDuration(validDur);
    if (startDate && validDur > 0) {
      const newEnd = addWorkingDays(startDate, validDur, calendar);
      setEndDate(newEnd);
    }
  };

  const handleAddDependency = () => {
    if (dependencies.length >= 10) {
      alert('Maximum of 10 predecessors allowed per activity.');
      return;
    }
    const existingIds = new Set(dependencies.map(d => d.taskId));
    const candidate = availableTasks.find(t => !existingIds.has(t.id));
    if (!candidate) return;

    setDependencies(prev => [...prev, { taskId: candidate.id, type: 'FS', lag: 0 }]);
  };

  const handleUpdateDependency = (index: number, updates: Partial<TaskDependency>) => {
    setDependencies(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const handleRemoveDependency = (index: number) => {
    setDependencies(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updates: Partial<Task> = {
      name,
      startDate,
      endDate,
      duration,
      progress: Math.min(100, Math.max(0, progress)),
      color: color || undefined,
      assignedTo: assignedTo || undefined,
      plannedManHours,
      actualManHours,
      remainingManHours,
      earnedManHours: Math.round((plannedManHours * progress) / 100),
      weightMode,
      customWeight,
      notes: notes || undefined,
      predecessors: dependencies
    };

    onSaveTask(task.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl border border-slate-300 overflow-hidden text-slate-800 font-sans">
        {/* Header Bar matching screenshot: Vibrant Blue Bar with White Text */}
        <div className="px-5 py-3.5 bg-[#0078d4] text-white flex items-center justify-between select-none">
          <h3 className="font-semibold text-base tracking-wide">Task Information</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 space-x-1 select-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x ${
              activeTab === 'general'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('dependency')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x ${
              activeTab === 'dependency'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Dependency {dependencies.length > 0 && `(${dependencies.length})`}
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x ${
              activeTab === 'resources'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Resources
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x ${
              activeTab === 'notes'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Notes {notes.trim() && '•'}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 bg-white min-h-[310px] max-h-[65vh] overflow-y-auto">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs">
              {/* Row 1: ID and Task Name */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 space-y-1">
                  <label className="text-slate-700 font-medium">ID</label>
                  <input
                    type="text"
                    readOnly
                    value={displayId}
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono font-medium outline-none cursor-not-allowed"
                  />
                </div>
                <div className="col-span-8 space-y-1">
                  <label className="text-slate-700 font-medium">Task Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-medium"
                    placeholder="Task description..."
                  />
                </div>
              </div>

              {/* Row 2: Start and End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Start</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      disabled={task.isSummary}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">End</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      disabled={task.isSummary}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Duration and Progress % */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">
                    Duration <span className="text-[11px] text-slate-500 font-normal">(excludes non-working days)</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      value={duration}
                      disabled={task.isSummary}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-mono font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <span className="ml-2 text-slate-500 font-medium">days</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Progress %</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={progress}
                      onChange={(e) => setProgress(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-mono font-medium"
                    />
                    <span className="ml-2 text-slate-500 font-medium">%</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Color Picker matching the Pink swatch dropdown from screenshot */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-700 font-medium">Color</label>
                <div className="flex items-center space-x-3">
                  <div
                    style={{ backgroundColor: color || '#2563eb' }}
                    className="w-8 h-8 rounded border border-slate-400 shadow-xs flex-shrink-0"
                  />
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none bg-white font-medium"
                  >
                    {COLOR_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={color || '#2563eb'}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 p-0 border border-slate-300 rounded cursor-pointer"
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPENDENCY */}
          {activeTab === 'dependency' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">Predecessors</h4>
                  <p className="text-[11px] text-slate-500">Activities that must complete or start before this activity.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDependency}
                  className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#0060aa] text-white rounded font-medium flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Predecessor</span>
                </button>
              </div>

              {dependencies.length === 0 ? (
                <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <p>No predecessors assigned to this activity.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click "Add Predecessor" above to link activities.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Predecessor Activity</th>
                        <th className="py-2 px-3 w-32">Relationship</th>
                        <th className="py-2 px-3 w-24">Lag (d)</th>
                        <th className="py-2 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dependencies.map((dep, index) => {
                        return (
                          <tr key={index} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3">
                              <select
                                value={dep.taskId}
                                onChange={(e) => handleUpdateDependency(index, { taskId: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                              >
                                {availableTasks.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.wbsCode} - {t.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={dep.type}
                                onChange={(e) => handleUpdateDependency(index, { type: e.target.value as DependencyType })}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                              >
                                <option value="FS">Finish-to-Start (FS)</option>
                                <option value="SS">Start-to-Start (SS)</option>
                                <option value="FF">Finish-to-Finish (FF)</option>
                                <option value="SF">Start-to-Finish (SF)</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={dep.lag}
                                onChange={(e) => handleUpdateDependency(index, { lag: parseInt(e.target.value, 10) || 0 })}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDependency(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded"
                                title="Delete dependency"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Assigned Resource / Responsibility</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. Electrical Subcontractor, Jane Doe, Civil Team"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Planned Man-Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={plannedManHours}
                    onChange={(e) => setPlannedManHours(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-medium focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Actual Man-Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={actualManHours}
                    onChange={(e) => setActualManHours(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-medium focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Remaining Man-Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={remainingManHours}
                    onChange={(e) => setRemainingManHours(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-medium focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Earned Man-Hours (Calculated)</label>
                  <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-emerald-800">
                    {Math.round((plannedManHours * progress) / 100)} MH
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="text-slate-700 font-medium">Activity Weight Calculation</label>
                <select
                  value={weightMode}
                  onChange={(e) => setWeightMode(e.target.value as WeightMode)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                >
                  <option value="duration">Time-based (Proportional to Duration)</option>
                  <option value="manhour">Man-Hour based (Proportional to Planned MH)</option>
                  <option value="equal">Equal Weight (1 / N)</option>
                  <option value="manual">Manual Fixed Weight</option>
                </select>
                {weightMode === 'manual' && (
                  <div className="pt-2 flex items-center space-x-2">
                    <label className="text-slate-600 font-medium">Custom Weight %:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={customWeight ?? task.weight}
                      onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-center"
                    />
                    <span className="text-slate-500 font-semibold">%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800">Activity Notes & Documentation</label>
                <p className="text-[11px] text-slate-500">Record scope clarifications, execution logs, contractor notes, or handover remarks.</p>
              </div>
              <textarea
                rows={9}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes for this activity..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-800 font-sans leading-relaxed resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Notes are saved with the project file (.wbs) and exported to Excel and PDF.</span>
                <span>{notes.length} characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions matching screenshot: Blue [ OK ] and Gray [ Cancel ] buttons */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2.5 select-none">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] active:bg-[#005a9e] text-white text-xs font-semibold rounded transition-colors shadow-xs"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white text-xs font-semibold rounded transition-colors shadow-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
