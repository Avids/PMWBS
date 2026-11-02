import React, { useState } from 'react';
import type { ProjectSettings, FontFamilyChoice } from '../types/project';
import { SELECTABLE_THEMES, FONT_OPTIONS } from '../theme/themeConfig';
import { Settings, X, Plus, Check, Calendar, Palette, Scale } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProjectSettings;
  onUpdateSettings: (newSettings: Partial<ProjectSettings>) => void;
}

type SettingsTab = 'calendar' | 'appearance' | 'calculations';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('calendar');
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
      ? current.filter((d) => d !== dayIndex)
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
        holidays: calendar.holidays.filter((h) => h !== dateStr)
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Calendar & Work Week</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'appearance'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Appearance & Themes</span>
          </button>

          <button
            onClick={() => setActiveTab('calculations')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'calculations'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Calculations & Weights</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CALENDAR & WORK WEEK */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              {/* Working Days */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Working Days (Work Week)</label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {calendar.workingDays.length} working days selected
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {dayNames.map((d) => {
                    const isSelected = calendar.workingDays.includes(d.idx);
                    return (
                      <label
                        key={d.idx}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-medium shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
              <div className="space-y-1.5 max-w-xs">
                <label className="text-xs font-bold text-slate-800">Work Hours / Day</label>
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
                <p className="text-[10px] text-slate-500">Standard work hours applied when scheduling and rolling up MH.</p>
              </div>

              {/* Holidays & Shutdowns */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Project Holidays & Shutdowns</label>
                  <span className="text-[11px] text-slate-500">{calendar.holidays.length} holiday(s) configured</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addHoliday}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Holiday</span>
                  </button>
                </div>

                {calendar.holidays.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {calendar.holidays.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs rounded-md border border-slate-200"
                      >
                        <span className="font-mono">{h}</span>
                        <button
                          onClick={() => removeHoliday(h)}
                          className="hover:text-red-600 text-slate-400"
                          title="Remove holiday"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No holidays added yet. Days added here are excluded from task working durations.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEMES */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Visual Color Theme Profile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Visual Theme Profile</label>
                  <span className="text-[11px] text-slate-500 font-medium">5 Industrial & SaaS Palettes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SELECTABLE_THEMES.map((theme) => {
                    const isSelected =
                      (settings.colorTheme || 'construction') === theme.id ||
                      (theme.id === 'construction' && settings.colorTheme === 'site-drawing') ||
                      (theme.id === 'modern-enterprise' && settings.colorTheme === 'classic');
                    return (
                      <div
                        key={theme.id}
                        onClick={() => onUpdateSettings({ colorTheme: theme.id })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">{theme.name}</span>
                            <div className="flex space-x-1">
                              {theme.swatches.map((color, i) => (
                                <span
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full border border-black/10"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-indigo-700 block mb-1">
                            {theme.subtitle}
                          </span>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {theme.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Typography & Font Family */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Typography & Font Family</label>
                  <span className="text-[11px] text-slate-500 font-medium">Applied to grid tables & Gantt chart</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {FONT_OPTIONS.map((font) => {
                    const isSelected = (settings.fontFamilyChoice || 'segoe') === font.id;
                    return (
                      <div
                        key={font.id}
                        onClick={() => onUpdateSettings({ fontFamilyChoice: font.id as FontFamilyChoice })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900" style={{ fontFamily: font.css }}>
                            {font.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {font.description}
                        </p>
                        <div
                          className="mt-2 px-2 py-1 bg-white rounded border border-slate-200 text-xs text-slate-700 font-medium truncate"
                          style={{ fontFamily: font.css }}
                        >
                          1.0 Engineering & Design — 13 d
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CALCULATIONS & WEIGHTS */}
          {activeTab === 'calculations' && (
            <div className="space-y-5">
              {/* Activity Weight Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">Activity Weight Computation Method</label>
                <div className="space-y-2 text-xs">
                  <label className={`flex items-start space-x-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.weightMode === 'duration' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="weightMode"
                      value="duration"
                      checked={settings.weightMode === 'duration'}
                      onChange={() => onUpdateSettings({ weightMode: 'duration' })}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900">Time-based (Duration)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Each task weight is proportional to its working duration in days. Summary % progress is rolled up based on active days completed.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start space-x-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.weightMode === 'manhour' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="weightMode"
                      value="manhour"
                      checked={settings.weightMode === 'manhour'}
                      onChange={() => onUpdateSettings({ weightMode: 'manhour' })}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900">Man-Hour based (Primavera P6 Standard)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Each task weight is proportional to its planned budgeted man-hours. Progress reflects actual labor earned value (Earned MH / Total Planned MH).
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start space-x-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.weightMode === 'equal' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="weightMode"
                      value="equal"
                      checked={settings.weightMode === 'equal'}
                      onChange={() => onUpdateSettings({ weightMode: 'equal' })}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900">Equal Weight</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Every activity in the summary branch has equal weight (1 / N). Ideal for simple milestone or checklist-style schedules.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Currency Symbol */}
              <div className="space-y-1.5 max-w-xs pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-800">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currency || '$'}
                  onChange={(e) => onUpdateSettings({ currency: e.target.value })}
                  placeholder="$"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">Displayed in cost and financial export fields (e.g. $, €, £, AED).</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 italic">
            All settings are auto-saved with your project (.wbs)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
