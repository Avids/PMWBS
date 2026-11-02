import React, { useState } from 'react';
import type { ProjectSettings } from '../types/project';
import { Settings, X, Plus, Check } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProjectSettings;
  onUpdateSettings: (newSettings: Partial<ProjectSettings>) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [newHoliday, setNewHoliday] = useState('');

  if (!isOpen) return null;

  const calendar = settings.calendar || {
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    hoursPerDay: 8
  };

  const toggleDay = (dayIndex: number) => {
    const current = calendar.workingDays || [1, 2, 3, 4, 5];
    const next = current.includes(dayIndex)
      ? current.filter(d => d !== dayIndex)
      : [...current, dayIndex].sort((a, b) => a - b);
    
    // Prevent unchecking all days
    if (next.length === 0) return;

    onUpdateSettings({
      calendar: { ...calendar, workingDays: next }
    });
  };

  const addHoliday = () => {
    if (!newHoliday || calendar.holidays.includes(newHoliday)) return;
    onUpdateSettings({
      calendar: {
        ...calendar,
        holidays: [...calendar.holidays, newHoliday].sort()
      }
    });
    setNewHoliday('');
  };

  const removeHoliday = (dateStr: string) => {
    onUpdateSettings({
      calendar: {
        ...calendar,
        holidays: calendar.holidays.filter(h => h !== dateStr)
      }
    });
  };

  const dayNames = [
    { idx: 1, name: 'Monday' },
    { idx: 2, name: 'Tuesday' },
    { idx: 3, name: 'Wednesday' },
    { idx: 4, name: 'Thursday' },
    { idx: 5, name: 'Friday' },
    { idx: 6, name: 'Saturday' },
    { idx: 0, name: 'Sunday' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base">Project Calendar & Weight Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Working Days */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">Working Days (Work Week)</label>
              <span className="text-[11px] text-slate-500 font-medium">
                {calendar.workingDays.length} working days selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {dayNames.map(d => {
                const isSelected = calendar.workingDays.includes(d.idx);
                return (
                  <label
                    key={d.idx}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      isSelected ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDay(d.idx)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{d.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Work Hours / Day</label>
              <input
                type="number"
                min="1"
                max="24"
                value={calendar.hoursPerDay || 8}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateSettings({
                    calendar: { ...calendar, hoursPerDay: isNaN(val) ? 8 : Math.min(24, Math.max(1, val)) }
                  });
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency || '$'}
                onChange={(e) => onUpdateSettings({ currency: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Activity Weight Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Activity Weight Computation Method</label>
            <div className="space-y-2 text-xs">
              <label className="flex items-start space-x-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="weightMode"
                  value="duration"
                  checked={settings.weightMode === 'duration'}
                  onChange={() => onUpdateSettings({ weightMode: 'duration' })}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <span className="font-semibold text-slate-800">Time-based (Duration)</span>
                  <p className="text-[11px] text-slate-500">Each task weight is proportional to its working duration in days.</p>
                </div>
              </label>

              <label className="flex items-start space-x-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="weightMode"
                  value="manhour"
                  checked={settings.weightMode === 'manhour'}
                  onChange={() => onUpdateSettings({ weightMode: 'manhour' })}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <span className="font-semibold text-slate-800">Man-Hour based (Primavera P6 Standard)</span>
                  <p className="text-[11px] text-slate-500">Each task weight is proportional to its planned budgeted man-hours.</p>
                </div>
              </label>

              <label className="flex items-start space-x-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="weightMode"
                  value="equal"
                  checked={settings.weightMode === 'equal'}
                  onChange={() => onUpdateSettings({ weightMode: 'equal' })}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <span className="font-semibold text-slate-800">Equal Weight</span>
                  <p className="text-[11px] text-slate-500">Every activity in the summary branch has equal weight (1 / N).</p>
                </div>
              </label>
            </div>
          </div>

          {/* Holidays */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Project Holidays & Shutdowns</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addHoliday}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {calendar.holidays.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {calendar.holidays.map(h => (
                  <span key={h} className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200">
                    <span>{h}</span>
                    <button onClick={() => removeHoliday(h)} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 italic">
            Calendar settings are saved with project (.wbs & Excel)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
