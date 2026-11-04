import React, { useState } from 'react';
import type { ProjectSettings, FontFamilyChoice, ColorTheme } from '../types/project';
import {
  SELECTABLE_THEMES,
  FONT_OPTIONS,
  DEFAULT_CUSTOM_THEME,
  cloneThemeToCustom,
  type ThemeDefinition
} from '../theme/themeConfig';
import {
  Settings,
  X,
  Plus,
  Check,
  Calendar,
  Palette,
  Scale,
  Paintbrush,
  RotateCcw,
  Sun,
  Moon,
  Copy,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProjectSettings;
  onUpdateSettings: (newSettings: Partial<ProjectSettings>) => void;
}

type SettingsTab = 'calendar' | 'appearance' | 'calculations';

const ColorPickerRow: React.FC<{
  label: string;
  description?: string;
  value: string;
  onChange: (hex: string) => void;
}> = ({ label, description, value, onChange }) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="min-w-0 pr-2">
        <span className="text-xs font-semibold text-slate-800 block truncate">{label}</span>
        {description && <span className="text-[10px] text-slate-400 block truncate">{description}</span>}
      </div>
      <div className="flex items-center space-x-1.5 shrink-0">
        <label className="relative cursor-pointer flex items-center">
          <input
            type="color"
            value={value && value.startsWith('#') && value.length >= 7 ? value.slice(0, 7) : '#2563EB'}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-1.5 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
        />
      </div>
    </div>
  );
};

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('calendar');
  const [newHoliday, setNewHoliday] = useState('');
  const [showCustomEditor, setShowCustomEditor] = useState<boolean>(settings.colorTheme === 'custom');

  if (!isOpen) return null;

  const calendar = settings.calendar || {
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    hoursPerDay: 8
  };

  const customTheme = {
    ...DEFAULT_CUSTOM_THEME,
    ...(settings.customTheme || {}),
    id: 'custom' as ColorTheme
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

  const handleUpdateCustomColor = (key: keyof ThemeDefinition, val: any) => {
    const updated: Partial<ThemeDefinition> = {
      ...customTheme,
      [key]: val,
      id: 'custom'
    };

    // Keep 4-color swatches aligned
    updated.swatches = [
      (key === 'headerBg' ? val : updated.headerBg) || DEFAULT_CUSTOM_THEME.headerBg,
      (key === 'taskBar' ? val : updated.taskBar) || DEFAULT_CUSTOM_THEME.taskBar,
      (key === 'summaryBar' ? val : updated.summaryBar) || DEFAULT_CUSTOM_THEME.summaryBar,
      (key === 'critical' ? val : updated.critical) || DEFAULT_CUSTOM_THEME.critical,
    ];

    if (key === 'taskBar') {
      updated.taskBarBorder = val;
    }
    if (key === 'summaryBar') {
      updated.summaryBarBorder = val;
      updated.summaryBarProgress = val;
    }
    if (key === 'critical') {
      updated.criticalBorder = val;
      updated.criticalText = val;
    }

    onUpdateSettings({
      colorTheme: 'custom',
      customTheme: updated
    });
  };

  const handleClonePreset = (presetId: ColorTheme) => {
    const cloned = cloneThemeToCustom(presetId);
    onUpdateSettings({
      colorTheme: 'custom',
      customTheme: cloned
    });
    setShowCustomEditor(true);
  };

  const handleResetCustom = () => {
    onUpdateSettings({
      colorTheme: 'custom',
      customTheme: { ...DEFAULT_CUSTOM_THEME }
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
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
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Calendar & Work Week</span>
          </button>

          <button
            onClick={() => setActiveTab('calculations')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'calculations'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Calculations & Weights</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-md'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Appearance & Themes</span>
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
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
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
                          className="hover:text-red-600 text-slate-400 cursor-pointer"
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

                    {/* TAB 2: CALCULATIONS & WEIGHTS */}
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
                      <span className="font-bold text-slate-900">Time-Based (Duration)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Activity weights are proportional to working day duration: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">Wi = Duration / Total Duration * 100</code>.
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
                      <span className="font-bold text-slate-900">Man-Hour Based (Primavera P6 Standard)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Activity weights are computed from Planned Man-Hours: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">Wi = PlannedMH / Total PlannedMH * 100</code>. If sum is 0, falls back to duration.
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

          {/* TAB 3: APPEARANCE & THEMES */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Visual Color Theme Profile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Visual Theme Profile</label>
                    <span className="text-[11px] text-slate-500">Choose a preset palette or customize your own colors</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">6 Color Palettes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {SELECTABLE_THEMES.map((theme) => {
                    const isSelected =
                      (settings.colorTheme || 'construction') === theme.id ||
                      (theme.id === 'construction' && settings.colorTheme === 'site-drawing') ||
                      (theme.id === 'modern-enterprise' && settings.colorTheme === 'classic');
                    
                    const swatches = theme.id === 'custom'
                      ? (settings.customTheme?.swatches || [
                          settings.customTheme?.headerBg || theme.swatches[0],
                          settings.customTheme?.taskBar || theme.swatches[1],
                          settings.customTheme?.summaryBar || theme.swatches[2],
                          settings.customTheme?.critical || theme.swatches[3],
                        ])
                      : theme.swatches;

                    return (
                      <div
                        key={theme.id}
                        onClick={() => {
                          onUpdateSettings({ colorTheme: theme.id });
                          if (theme.id === 'custom') {
                            setShowCustomEditor(true);
                          }
                        }}
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
                              {swatches.map((color, i) => (
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
                                                  </div>
                        {theme.id === 'custom' && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                            <span className="text-[10px] text-indigo-700 font-semibold flex items-center space-x-1">
                              <Paintbrush className="w-3 h-3 text-indigo-600" />
                              <span>Personalized</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateSettings({ colorTheme: 'custom' });
                                setShowCustomEditor((prev) => !prev);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs cursor-pointer flex items-center space-x-1"
                            >
                              <span>{showCustomEditor && isSelected ? 'Hide Colors' : 'Edit Colors'}</span>
                              {showCustomEditor && isSelected ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM PALETTE STUDIO / COLOR CUSTOMIZER */}
              {(settings.colorTheme === 'custom' || showCustomEditor) && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Custom Palette Studio</h4>
                        <p className="text-[11px] text-slate-500">Fine-tune exact hex colors for task bars, summaries, milestones, and surfaces</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleResetCustom}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Reset custom palette to standard corporate colors"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Live Interactive Preview Canvas */}
                  <div
                    className="p-3 rounded-xl border shadow-xs transition-colors"
                    style={{
                      backgroundColor: customTheme.appBg || '#F1F5F9',
                      borderColor: customTheme.border || '#CBD5E1'
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                      <span className="text-slate-700 flex items-center space-x-1">
                        <Palette className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Live Palette Visualizer</span>
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono border"
                        style={{
                          backgroundColor: customTheme.surfaceBg || '#FFFFFF',
                          color: customTheme.textSecondary || '#64748B',
                          borderColor: customTheme.border || '#CBD5E1'
                        }}
                      >
                        {customTheme.isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                      </span>
                    </div>

                    <div
                      className="rounded-lg border overflow-hidden shadow-xs"
                      style={{
                        backgroundColor: customTheme.surfaceBg || '#FFFFFF',
                        borderColor: customTheme.border || '#CBD5E1'
                      }}
                    >
                      {/* Mini Header Bar */}
                      <div
                        className="px-3 py-1.5 flex items-center justify-between text-xs border-b"
                        style={{
                          backgroundColor: customTheme.headerBg || '#1E293B',
                          color: customTheme.headerText || '#FFFFFF',
                          borderColor: customTheme.border || '#CBD5E1'
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: customTheme.signal || '#2563EB' }}
                          >
                            P
                          </span>
                          <span className="font-bold text-xs truncate">Commercial Facility Schedule</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] opacity-80 shrink-0">
                          <span>11 Tasks</span>
                          <span>•</span>
                          <span>75% Progress</span>
                        </div>
                      </div>

                      {/* Mini Gantt Rows */}
                      <div className="p-2.5 space-y-2 text-xs">
                        {/* Row 1: Summary Bar */}
                        <div className="flex items-center justify-between">
                          <span
                            className="font-bold text-[11px] truncate w-40"
                            style={{ color: customTheme.textPrimary || '#0F172A' }}
                          >
                            ▼ 1.0 Engineering & Design
                          </span>
                          <div className="flex-1 max-w-[200px] h-3 relative">
                            <div
                              className="h-1.5 w-full rounded-2xs"
                              style={{ backgroundColor: customTheme.summaryBar || '#334155' }}
                            />
                            <div
                              className="absolute left-0 top-1 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px]"
                              style={{ borderTopColor: customTheme.summaryBar || '#334155' }}
                            />
                            <div
                              className="absolute right-0 top-1 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px]"
                              style={{ borderTopColor: customTheme.summaryBar || '#334155' }}
                            />
                          </div>
                        </div>

                        {/* Row 2: Standard Task Bar */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] pl-3 truncate w-40 font-medium"
                            style={{ color: customTheme.textPrimary || '#0F172A' }}
                          >
                            Architectural Review
                          </span>
                          <div className="flex-1 max-w-[200px] relative">
                            <div
                              className="h-3 w-4/5 rounded-xs overflow-hidden shadow-2xs"
                              style={{ backgroundColor: customTheme.taskBar || '#2563EB' }}
                            >
                              <div
                                className="h-full w-3/5"
                                style={{ backgroundColor: customTheme.taskProgressFill || '#1D4ED8' }}
                              />
                            </div>
                            <div
                              className="h-1 w-3/4 rounded-xs mt-0.5 opacity-80"
                              style={{ backgroundColor: customTheme.baseline || '#94A3B8' }}
                              title="Baseline reference bar"
                            />
                          </div>
                        </div>

                        {/* Row 3: Milestone */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] pl-3 truncate w-40 font-medium"
                            style={{ color: customTheme.textPrimary || '#0F172A' }}
                          >
                            Design Approval
                          </span>
                          <div className="flex-1 max-w-[200px] flex items-center">
                            <span
                              className="w-2.5 h-2.5 rotate-45 inline-block shadow-2xs"
                              style={{ backgroundColor: customTheme.milestone || '#0F172A' }}
                            />
                            <span
                              className="ml-2 text-[10px] font-semibold"
                              style={{ color: customTheme.textSecondary || '#64748B' }}
                            >
                              Milestone (0 d)
                            </span>
                          </div>
                        </div>

                        {/* Row 4: Critical Path Task */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] pl-3 truncate w-40 font-semibold"
                            style={{ color: customTheme.critical || '#DC2626' }}
                          >
                            Structural Calculations
                          </span>
                          <div className="flex-1 max-w-[200px] relative">
                            <div
                              className="h-3 w-3/4 rounded-xs overflow-hidden shadow-2xs"
                              style={{ backgroundColor: customTheme.critical || '#DC2626' }}
                            >
                              <div className="h-full w-2/5 bg-black/25" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Base Preset Cloner */}
                  <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                        <Copy className="w-3 h-3 text-indigo-600" />
                        <span>Start from Base Preset (1-Click Copy):</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Clone into custom palette to customize further</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        { id: 'modern-enterprise', label: 'Enterprise Blue' },
                        { id: 'construction', label: 'Construction & Steel' },
                        { id: 'primavera', label: 'Primavera P6 Green' },
                        { id: 'steel-amber', label: 'Industrial Amber' },
                        { id: 'dark-mode', label: 'Precision Dark' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleClonePreset(preset.id as ColorTheme)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 border border-slate-200 transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Detailed Color Picker Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Gantt Chart Activities */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>Gantt Timeline & Activity Colors</span>
                      </span>
                      <div className="space-y-1.5">
                        <ColorPickerRow
                          label="Standard Task Bars"
                          description="Default activity timeline bar"
                          value={customTheme.taskBar || '#2563EB'}
                          onChange={(v) => handleUpdateCustomColor('taskBar', v)}
                        />
                        <ColorPickerRow
                          label="Task Progress Fill"
                          description="Inner fill for completed %"
                          value={customTheme.taskProgressFill || '#1D4ED8'}
                          onChange={(v) => handleUpdateCustomColor('taskProgressFill', v)}
                        />
                        <ColorPickerRow
                          label="Summary Bars & Brackets"
                          description="WBS summary phase roofs & brackets"
                          value={customTheme.summaryBar || '#334155'}
                          onChange={(v) => handleUpdateCustomColor('summaryBar', v)}
                        />
                        <ColorPickerRow
                          label="Milestone Diamonds"
                          description="Zero-duration milestone markers"
                          value={customTheme.milestone || '#0F172A'}
                          onChange={(v) => handleUpdateCustomColor('milestone', v)}
                        />
                        <ColorPickerRow
                          label="Critical Path / Late Alerts"
                          description="Critical activities and delay flags"
                          value={customTheme.critical || '#DC2626'}
                          onChange={(v) => handleUpdateCustomColor('critical', v)}
                        />
                        <ColorPickerRow
                          label="Today Line & Selection Signal"
                          description="Active row highlight & timeline marker"
                          value={customTheme.signal || '#2563EB'}
                          onChange={(v) => handleUpdateCustomColor('signal', v)}
                        />
                        <ColorPickerRow
                          label="Baseline Bars"
                          description="Underlying baseline comparison bars"
                          value={customTheme.baseline || '#94A3B8'}
                          onChange={(v) => handleUpdateCustomColor('baseline', v)}
                        />
                      </div>
                    </div>

                    {/* Right Column: Surface, Header & Theme Mode */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span>Interface, Surfaces & Typography</span>
                      </span>
                      <div className="space-y-1.5">
                        <ColorPickerRow
                          label="Header Ribbon Background"
                          description="Top navigation bar & toolbar background"
                          value={customTheme.headerBg || '#1E293B'}
                          onChange={(v) => handleUpdateCustomColor('headerBg', v)}
                        />
                        <ColorPickerRow
                          label="Header Text Color"
                          description="Text and symbols in top ribbon"
                          value={customTheme.headerText || '#FFFFFF'}
                          onChange={(v) => handleUpdateCustomColor('headerText', v)}
                        />
                        <ColorPickerRow
                          label="App Canvas Background"
                          description="Outer frame workspace canvas"
                          value={customTheme.appBg || '#F1F5F9'}
                          onChange={(v) => handleUpdateCustomColor('appBg', v)}
                        />
                        <ColorPickerRow
                          label="Table & Timeline Surface"
                          description="Main card & grid background"
                          value={customTheme.surfaceBg || '#FFFFFF'}
                          onChange={(v) => handleUpdateCustomColor('surfaceBg', v)}
                        />
                        <ColorPickerRow
                          label="Grid Lines & Borders"
                          description="Table column lines & panel boundaries"
                          value={customTheme.border || '#CBD5E1'}
                          onChange={(v) => handleUpdateCustomColor('border', v)}
                        />
                        <ColorPickerRow
                          label="Primary Text Color"
                          description="Task names and main table text"
                          value={customTheme.textPrimary || '#0F172A'}
                          onChange={(v) => handleUpdateCustomColor('textPrimary', v)}
                        />
                        <ColorPickerRow
                          label="Secondary / Muted Text"
                          description="Dates, durations, and WBS numbers"
                          value={customTheme.textSecondary || '#64748B'}
                          onChange={(v) => handleUpdateCustomColor('textSecondary', v)}
                        />

                        {/* Theme Contrast Mode Toggle */}
                        <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">Theme Contrast Mode</span>
                            <span className="text-[10px] text-slate-400 block">Optimizes text and hover contrast</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomColor('isDark', !customTheme.isDark)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                              customTheme.isDark
                                ? 'bg-slate-900 border-slate-700 text-white shadow-2xs'
                                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                            }`}
                          >
                            {customTheme.isDark ? (
                              <>
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Dark Mode</span>
                              </>
                            ) : (
                              <>
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                                <span>Light Mode</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Typography & Font Family */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Typography & Font Family</label>
                  <span className="text-[11px] text-slate-500 font-medium">Applied across all grid tables & charts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 italic">
            All settings are auto-saved with your project (.wbs)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
