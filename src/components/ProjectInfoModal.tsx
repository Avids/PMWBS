import React, { useState, useEffect } from 'react';
import type { ProjectSettings } from '../types/project';
import { X, Building2, Hash, MapPin, User, Calendar, DollarSign, FileText, BarChart3, Check } from 'lucide-react';

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProjectSettings;
  onUpdateSettings: (newSettings: Partial<ProjectSettings>) => void;
  totalTasks?: number;
  overallProgress?: number;
  totalPlannedMH?: number;
  totalActualMH?: number;
  finishDate?: string;
}

type TabKey = 'general' | 'notes' | 'summary';

export const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  totalTasks = 0,
  overallProgress = 0,
  totalPlannedMH = 0,
  totalActualMH = 0,
  finishDate = ''
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // Form local state
  const [name, setName] = useState(settings.name || '');
  const [projectNumber, setProjectNumber] = useState(settings.projectNumber || '');
  const [company, setCompany] = useState(settings.company || '');
  const [projectAddress, setProjectAddress] = useState(settings.projectAddress || '');
  const [author, setAuthor] = useState(settings.author || '');
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [notes, setNotes] = useState(settings.notes || '');

  // Synchronize when settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(settings.name || '');
      setProjectNumber(settings.projectNumber || '');
      setCompany(settings.company || '');
      setProjectAddress(settings.projectAddress || '');
      setAuthor(settings.author || '');
      setStartDate(settings.startDate || '');
      setCurrency(settings.currency || '$');
      setNotes(settings.notes || '');
      setActiveTab('general');
    }
  }, [isOpen, settings]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings({
      name: name.trim() || 'Untitled Project',
      projectNumber: projectNumber.trim() || undefined,
      company: company.trim() || undefined,
      projectAddress: projectAddress.trim() || undefined,
      author: author.trim() || undefined,
      startDate: startDate || settings.startDate,
      currency: currency.trim() || '$',
      notes: notes.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl border border-slate-300 overflow-hidden text-slate-800 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar matching standard Windows / Microsoft Project blue header */}
        <div className="px-5 py-3.5 bg-[#0078d4] text-white flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-white/90" />
            <h3 className="font-semibold text-base tracking-wide">Project Information</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 space-x-1 select-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x flex items-center space-x-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x flex items-center space-x-1.5 ${
              activeTab === 'notes'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scope & Notes {notes.trim() && '•'}</span>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-x flex items-center space-x-1.5 ${
              activeTab === 'summary'
                ? 'bg-white text-[#0078d4] border-slate-200 border-b-transparent shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Schedule Stats</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 bg-white min-h-[340px] max-h-[68vh] overflow-y-auto">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs">
              {/* Row 1: Project Name & Number */}
              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-8 space-y-1">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <span>Project Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none font-medium"
                    placeholder="e.g. PROJECT EQUINIX TR06-2"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span>Project Number</span>
                  </label>
                  <input
                    type="text"
                    value={projectNumber}
                    onChange={(e) => setProjectNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none font-mono"
                    placeholder="e.g. TR06-2"
                  />
                </div>
              </div>

              {/* Row 2: Company Name */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold flex items-center space-x-1">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span>Company / Organization Name</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none"
                  placeholder="e.g. Equinix Corporation, Turner Construction, Bechtel"
                />
              </div>

              {/* Row 3: Project Address */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Project Address / Jobsite Location</span>
                </label>
                <textarea
                  value={projectAddress}
                  onChange={(e) => setProjectAddress(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none resize-none"
                  placeholder="e.g. 500 Data Center Way, Building TR06, Ashburn, VA 20147"
                />
              </div>

              {/* Row 4: Author / Scheduler & Start Date & Currency */}
              <div className="grid grid-cols-12 gap-3.5 pt-1">
                <div className="col-span-5 space-y-1">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Project Manager / Author</span>
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none"
                    placeholder="e.g. Lead Project Scheduler"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Schedule Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none font-mono"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-slate-700 font-semibold flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-slate-500" />
                    <span>Currency</span>
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none text-center font-bold"
                    placeholder="$"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTES & SCOPE */}
          {activeTab === 'notes' && (
            <div className="space-y-3 text-xs">
              <label className="text-slate-700 font-semibold block">
                Project Scope, Contract Specifications & Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={9}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none leading-relaxed"
                placeholder="Enter executive project summary, site conditions, contract scope, client contact details, or notes..."
              />
              <p className="text-[11px] text-slate-500">
                Notes entered here are saved into the project file (.wbs) and accessible throughout your scheduling workflows.
              </p>
            </div>
          )}

          {/* TAB 3: SCHEDULE STATS */}
          {activeTab === 'summary' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2.5">
                  Schedule Health & Dimensions
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Activities</span>
                    <strong className="text-slate-800 text-sm font-bold font-mono">{totalTasks}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Overall Progress</span>
                    <strong className="text-emerald-600 text-sm font-bold font-mono">{overallProgress}%</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Planned Man-Hours</span>
                    <strong className="text-slate-800 text-sm font-bold font-mono">{totalPlannedMH} MH</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Actual Man-Hours</span>
                    <strong className="text-indigo-600 text-sm font-bold font-mono">{totalActualMH} MH</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Schedule Start</span>
                    <strong className="text-slate-800 text-xs font-semibold font-mono">{startDate || '-'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Target Finish</span>
                    <strong className="text-slate-800 text-xs font-semibold font-mono">{finishDate || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-blue-50 border border-blue-200 rounded p-3 text-blue-900 leading-normal">
                <strong>Schedule Tip:</strong> Project information (Name, Number, Company, and Jobsite Address) are included in all generated reports, PDF prints, and Excel workbooks.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end space-x-2 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded text-xs font-semibold transition-colors shadow-2xs flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>OK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
