import React, { useState, useEffect } from 'react';
import type { BaselineData } from '../types/project';
import { BookmarkCheck, Trash2, X, Plus } from 'lucide-react';

interface BaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselines: BaselineData[];
  onSaveBaseline: (name: string) => void;
  onRestoreBaseline: (baselineId: string) => void;
  onDeleteBaseline: (baselineId: string) => void;
}

export const BaselineModal: React.FC<BaselineModalProps> = ({
  isOpen,
  onClose,
  baselines,
  onSaveBaseline,
  onRestoreBaseline,
  onDeleteBaseline
}) => {
  const [baselineName, setBaselineName] = useState(`Baseline ${baselines.length + 1}`);

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

  const handleCreate = () => {
    if (!baselineName.trim()) return;
    onSaveBaseline(baselineName.trim());
    setBaselineName(`Baseline ${baselines.length + 2}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookmarkCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-base">Project Baseline Manager</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
            <strong>What is a Baseline?</strong> In Microsoft Project and Primavera P6, a baseline captures a frozen snapshot of your planned dates and man-hours. As the project progresses, you can compare actual performance against this baseline to track slippages and variances.
          </div>

          {/* Create New Baseline Form */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Set New Baseline</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={baselineName}
                onChange={(e) => setBaselineName(e.target.value)}
                placeholder="Baseline name (e.g. Initial Plan, Contract Revision 1)"
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Save Baseline</span>
              </button>
            </div>
          </div>

          {/* Saved Baselines List */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Saved Baselines ({baselines.length})</label>
            {baselines.length === 0 ? (
              <div className="text-xs text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-lg">
                No baselines saved yet. Set a baseline to track variances.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {baselines.map((b) => (
                  <div key={b.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">{b.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Saved: {new Date(b.savedAt).toLocaleString()} ({Object.keys(b.tasks).length} tasks captured)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onRestoreBaseline(b.id)}
                        className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 font-medium rounded-md transition-colors"
                      >
                        Set as Active
                      </button>
                      <button
                        onClick={() => onDeleteBaseline(b.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Delete Baseline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
