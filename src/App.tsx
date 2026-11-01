import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Task, ProjectSettings, ProjectFile, BaselineData, TaskDependency } from './types/project';
import { recalculateSchedule, formatDate, addWorkingDays } from './engine/scheduler';
import { saveNativeWBSFile, loadNativeWBSFile, exportToExcel } from './engine/importers';
import { Toolbar } from './components/Toolbar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { GanttTimeline } from './components/GanttTimeline';
import { BaselineModal } from './components/BaselineModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { PredecessorModal } from './components/PredecessorModal';

const DEFAULT_CALENDAR = {
  workingDays: [1, 2, 3, 4, 5], // Mon - Fri
  holidays: [],
  hoursPerDay: 8
};

const DEFAULT_SETTINGS: ProjectSettings = {
  name: 'New Commercial Facility Project',
  author: 'Lead Project Scheduler',
  startDate: formatDate(new Date()),
  weightMode: 'duration',
  calendar: DEFAULT_CALENDAR,
  currency: '$',
  showBaseline: true,
  showCriticalPath: true
};

const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    wbsCode: '1',
    name: '1.0 Engineering & Design',
    parentId: null,
    isSummary: true,
    isMilestone: false,
    startDate: '2026-11-02',
    endDate: '2026-11-20',
    duration: 15,
    progress: 75,
    predecessors: [],
    plannedManHours: 200,
    actualManHours: 150,
    remainingManHours: 50,
    earnedManHours: 150,
    weight: 20
  },
  {
    id: 't-2',
    wbsCode: '1.1',
    name: 'Architectural Concept Review',
    parentId: 't-1',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-11-02',
    endDate: '2026-11-06',
    duration: 5,
    progress: 100,
    predecessors: [],
    plannedManHours: 80,
    actualManHours: 80,
    remainingManHours: 0,
    earnedManHours: 80,
    baselineStartDate: '2026-11-02',
    baselineEndDate: '2026-11-06',
    baselineDuration: 5,
    weight: 33.3
  },
  {
    id: 't-3',
    wbsCode: '1.2',
    name: 'Structural Calculations & Spec',
    parentId: 't-1',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-11-09',
    endDate: '2026-11-20',
    duration: 10,
    progress: 60,
    predecessors: [{ taskId: 't-2', type: 'FS', lag: 0 }],
    plannedManHours: 120,
    actualManHours: 70,
    remainingManHours: 50,
    earnedManHours: 72,
    baselineStartDate: '2026-11-09',
    baselineEndDate: '2026-11-20',
    baselineDuration: 10,
    weight: 66.7
  },
  {
    id: 't-4',
    wbsCode: '1.3',
    name: 'Design Approval Milestone',
    parentId: 't-1',
    isSummary: false,
    isMilestone: true,
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    duration: 0,
    progress: 0,
    predecessors: [{ taskId: 't-3', type: 'FS', lag: 0 }],
    plannedManHours: 0,
    actualManHours: 0,
    remainingManHours: 0,
    earnedManHours: 0,
    baselineStartDate: '2026-11-20',
    baselineEndDate: '2026-11-20',
    baselineDuration: 0,
    weight: 0
  },
  {
    id: 't-5',
    wbsCode: '2',
    name: '2.0 Procurement & Packages',
    parentId: null,
    isSummary: true,
    isMilestone: false,
    startDate: '2026-11-23',
    endDate: '2026-12-11',
    duration: 15,
    progress: 25,
    predecessors: [],
    plannedManHours: 180,
    actualManHours: 40,
    remainingManHours: 140,
    earnedManHours: 45,
    weight: 25
  },
  {
    id: 't-6',
    wbsCode: '2.1',
    name: 'Material Requisition Release',
    parentId: 't-5',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-11-23',
    endDate: '2026-11-27',
    duration: 5,
    progress: 50,
    predecessors: [{ taskId: 't-4', type: 'FS', lag: 0 }],
    plannedManHours: 60,
    actualManHours: 30,
    remainingManHours: 30,
    earnedManHours: 30,
    baselineStartDate: '2026-11-23',
    baselineEndDate: '2026-11-27',
    baselineDuration: 5,
    weight: 33.3
  },
  {
    id: 't-7',
    wbsCode: '2.2',
    name: 'Vendor Evaluation & Award',
    parentId: 't-5',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-11-25',
    endDate: '2026-12-08',
    duration: 10,
    progress: 10,
    predecessors: [{ taskId: 't-6', type: 'SS', lag: 2 }],
    plannedManHours: 120,
    actualManHours: 10,
    remainingManHours: 110,
    earnedManHours: 12,
    baselineStartDate: '2026-11-25',
    baselineEndDate: '2026-12-08',
    baselineDuration: 10,
    weight: 66.7
  },
  {
    id: 't-8',
    wbsCode: '3',
    name: '3.0 Site Construction',
    parentId: null,
    isSummary: true,
    isMilestone: false,
    startDate: '2026-12-15',
    endDate: '2027-01-25',
    duration: 30,
    progress: 0,
    predecessors: [],
    plannedManHours: 850,
    actualManHours: 0,
    remainingManHours: 850,
    earnedManHours: 0,
    weight: 55
  },
  {
    id: 't-9',
    wbsCode: '3.1',
    name: 'Site Mobilization & Fencing',
    parentId: 't-8',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-12-15',
    endDate: '2026-12-28',
    duration: 10,
    progress: 0,
    // Demonstrating FS + 5d gap!
    predecessors: [{ taskId: 't-7', type: 'FS', lag: 5 }],
    plannedManHours: 150,
    actualManHours: 0,
    remainingManHours: 150,
    earnedManHours: 0,
    baselineStartDate: '2026-12-15',
    baselineEndDate: '2026-12-28',
    baselineDuration: 10,
    weight: 20
  },
  {
    id: 't-10',
    wbsCode: '3.2',
    name: 'Foundation Excavation & Pouring',
    parentId: 't-8',
    isSummary: false,
    isMilestone: false,
    startDate: '2026-12-29',
    endDate: '2027-01-25',
    duration: 20,
    progress: 0,
    predecessors: [{ taskId: 't-9', type: 'FS', lag: 0 }],
    plannedManHours: 700,
    actualManHours: 0,
    remainingManHours: 700,
    earnedManHours: 0,
    baselineStartDate: '2026-12-29',
    baselineEndDate: '2027-01-25',
    baselineDuration: 20,
    weight: 80
  },
  {
    id: 't-11',
    wbsCode: '3.3',
    name: 'Civil Works Complete Milestone',
    parentId: 't-8',
    isSummary: false,
    isMilestone: true,
    startDate: '2027-01-25',
    endDate: '2027-01-25',
    duration: 0,
    progress: 0,
    predecessors: [{ taskId: 't-10', type: 'FS', lag: 0 }],
    plannedManHours: 0,
    actualManHours: 0,
    remainingManHours: 0,
    earnedManHours: 0,
    baselineStartDate: '2027-01-25',
    baselineEndDate: '2027-01-25',
    baselineDuration: 0,
    weight: 0
  }
];

export function App() {
  const [settings, setSettings] = useState<ProjectSettings>(() => {
    const saved = localStorage.getItem('wbs_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [rawTasks, setRawTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('wbs_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [baselines, setBaselines] = useState<BaselineData[]>(() => {
    const saved = localStorage.getItem('wbs_baselines');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('t-1');
  const [splitterWidth, setSplitterWidth] = useState<number>(680);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPredecessorModalOpen, setIsPredecessorModalOpen] = useState(false);
  const [predecessorModalTask, setPredecessorModalTask] = useState<Task | null>(null);

  // Auto recalculate whenever tasks, calendar, or weightMode change
  const tasks = useMemo(() => {
    return recalculateSchedule(rawTasks, settings.calendar, settings.weightMode);
  }, [rawTasks, settings.calendar, settings.weightMode]);

  // Persist to LocalStorage
  useEffect(() => {
    localStorage.setItem('wbs_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('wbs_tasks', JSON.stringify(rawTasks));
  }, [rawTasks]);

  useEffect(() => {
    localStorage.setItem('wbs_baselines', JSON.stringify(baselines));
  }, [baselines]);

  // Splitter Resizing
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter) return;
      const newWidth = Math.max(320, Math.min(window.innerWidth - 300, e.clientX));
      setSplitterWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Project KPI rollups
  const { overallProgress, totalPlannedMH, totalActualMH, finishDate } = useMemo(() => {
    let plannedMH = 0;
    let actualMH = 0;
    let maxEnd = '';

    const rootTasks = tasks.filter(t => t.parentId === null);
    let totalWeightedProg = 0;
    let weightSum = 0;

    rootTasks.forEach(rt => {
      totalWeightedProg += (rt.progress || 0) * (rt.weight || 0);
      weightSum += (rt.weight || 0);
      plannedMH += rt.plannedManHours || 0;
      actualMH += rt.actualManHours || 0;
      if (!maxEnd || (rt.endDate && rt.endDate > maxEnd)) maxEnd = rt.endDate;
    });

    const prog = weightSum > 0 ? Math.round(totalWeightedProg / weightSum) : 0;
    return {
      overallProgress: prog,
      totalPlannedMH: plannedMH,
      totalActualMH: actualMH,
      finishDate: maxEnd
    };
  }, [tasks]);

  // Task CRUD operations
  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setRawTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  }, []);

  const handleAddTask = useCallback((afterTaskId?: string) => {
    const newId = `t-${Date.now().toString(36)}`;
    const today = formatDate(new Date());

    let parentId: string | null = null;
    let insertIndex = rawTasks.length;

    if (afterTaskId) {
      const idx = rawTasks.findIndex(t => t.id === afterTaskId);
      if (idx !== -1) {
        parentId = rawTasks[idx].parentId;
        insertIndex = idx + 1;
      }
    }

    const newTask: Task = {
      id: newId,
      wbsCode: '',
      name: 'New Activity',
      parentId,
      isSummary: false,
      isMilestone: false,
      startDate: today,
      endDate: addWorkingDays(today, 5, settings.calendar),
      duration: 5,
      progress: 0,
      predecessors: [],
      plannedManHours: 40,
      actualManHours: 0,
      remainingManHours: 40,
      earnedManHours: 0,
      weight: 0
    };

    setRawTasks(prev => {
      const copy = [...prev];
      copy.splice(insertIndex, 0, newTask);
      return copy;
    });

    setSelectedTaskId(newId);
  }, [rawTasks, settings.calendar]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setRawTasks(prev => {
      const idsToDelete = new Set<string>([taskId]);
      let added = true;
      while (added) {
        added = false;
        prev.forEach(t => {
          if (t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
            idsToDelete.add(t.id);
            added = true;
          }
        });
      }
      return prev.filter(t => !idsToDelete.has(t.id));
    });
  }, []);

  const handleIndentTask = useCallback((taskId: string) => {
    setRawTasks(prev => {
      const idx = prev.findIndex(t => t.id === taskId);
      if (idx <= 0) return prev;

      const prevTask = prev[idx - 1];
      return prev.map((t, i) => {
        if (i === idx) {
          return { ...t, parentId: prevTask.id };
        }
        return t;
      });
    });
  }, []);

  const handleOutdentTask = useCallback((taskId: string) => {
    setRawTasks(prev => {
      const current = prev.find(t => t.id === taskId);
      if (!current || !current.parentId) return prev;

      const parentTask = prev.find(t => t.id === current.parentId);
      const grandParentId = parentTask ? parentTask.parentId : null;

      return prev.map(t => {
        if (t.id === taskId) {
          return { ...t, parentId: grandParentId };
        }
        return t;
      });
    });
  }, []);

  const handleAddDependency = useCallback((fromTaskId: string, toTaskId: string) => {
    if (fromTaskId === toTaskId) return;

    setRawTasks(prev => prev.map(t => {
      if (t.id === toTaskId) {
        const existing = t.predecessors || [];
        if (existing.some(d => d.taskId === fromTaskId)) return t;
        const newDeps = [...existing, { taskId: fromTaskId, type: 'FS' as const, lag: 0 }].slice(0, 10);
        return { ...t, predecessors: newDeps };
      }
      return t;
    }));
  }, []);

  // Predecessor Modal Handlers
  const handleOpenPredecessorModal = useCallback((task: Task) => {
    setPredecessorModalTask(task);
    setIsPredecessorModalOpen(true);
  }, []);

  const handleSaveDependencies = useCallback((taskId: string, dependencies: TaskDependency[]) => {
    setRawTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, predecessors: dependencies };
      }
      return t;
    }));
  }, []);

  // Native WBS File Save & Load
  const handleSaveWBS = () => {
    const fileData: ProjectFile = {
      version: '1.0',
      meta: settings,
      baselines,
      tasks
    };
    saveNativeWBSFile(fileData, `${settings.name.replace(/\s+/g, '_')}.wbs`);
  };

  const handleLoadWBS = async (file: File) => {
    try {
      const projectFile = await loadNativeWBSFile(file);
      setSettings(projectFile.meta);
      setRawTasks(projectFile.tasks);
      if (projectFile.baselines) setBaselines(projectFile.baselines);
      if (projectFile.tasks.length > 0) setSelectedTaskId(projectFile.tasks[0].id);
    } catch (err: any) {
      alert(`Error loading .wbs file: ${err.message}`);
    }
  };

  const handleNewProject = () => {
    if (confirm('Create a new schedule? Any unsaved changes will be cleared.')) {
      setRawTasks([
        {
          id: 't-1',
          wbsCode: '1',
          name: 'Project Phase 1',
          parentId: null,
          isSummary: false,
          isMilestone: false,
          startDate: formatDate(new Date()),
          endDate: addWorkingDays(formatDate(new Date()), 10, settings.calendar),
          duration: 10,
          progress: 0,
          predecessors: [],
          plannedManHours: 80,
          actualManHours: 0,
          remainingManHours: 80,
          earnedManHours: 0,
          weight: 100
        }
      ]);
      setSettings({
        ...DEFAULT_SETTINGS,
        name: 'Untitled Project Schedule',
        startDate: formatDate(new Date())
      });
      setSelectedTaskId('t-1');
    }
  };

  const handleExportExcel = () => {
    exportToExcel(tasks, settings, `${settings.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Baseline Manager
  const handleSaveBaseline = (name: string) => {
    const taskSnapshots: BaselineData['tasks'] = {};
    rawTasks.forEach(t => {
      taskSnapshots[t.id] = {
        startDate: t.startDate,
        endDate: t.endDate,
        duration: t.duration,
        plannedManHours: t.plannedManHours || 0,
        weight: t.weight || 0
      };
    });

    const newBaseline: BaselineData = {
      id: `bl-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      tasks: taskSnapshots
    };

    setBaselines(prev => [...prev, newBaseline]);

    setRawTasks(prev => prev.map(t => ({
      ...t,
      baselineStartDate: t.startDate,
      baselineEndDate: t.endDate,
      baselineDuration: t.duration
    })));
  };

  const handleRestoreBaseline = (baselineId: string) => {
    const target = baselines.find(b => b.id === baselineId);
    if (!target) return;

    setRawTasks(prev => prev.map(t => {
      const snap = target.tasks[t.id];
      if (snap) {
        return {
          ...t,
          baselineStartDate: snap.startDate,
          baselineEndDate: snap.endDate,
          baselineDuration: snap.duration
        };
      }
      return t;
    }));
  };

  const handleDeleteBaseline = (baselineId: string) => {
    setBaselines(prev => prev.filter(b => b.id !== baselineId));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Application Ribbon */}
      <Toolbar
        settings={settings}
        onUpdateSettings={(u) => setSettings(s => ({ ...s, ...u }))}
        onNewProject={handleNewProject}
        onSaveWBS={handleSaveWBS}
        onLoadWBS={handleLoadWBS}
        onExportExcel={handleExportExcel}
        onPrintPDF={handlePrintPDF}
        onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        totalTasks={tasks.length}
        overallProgress={overallProgress}
        totalPlannedMH={totalPlannedMH}
        totalActualMH={totalActualMH}
        finishDate={finishDate}
      />

      {/* Main Splitter Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Spreadsheet Grid (MSP / Excel table) */}
        <div
          style={{ width: `${splitterWidth}px` }}
          className="h-full flex-shrink-0 flex flex-col overflow-hidden"
        >
          <SpreadsheetGrid
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onIndentTask={handleIndentTask}
            onOutdentTask={handleOutdentTask}
            onOpenPredecessorModal={handleOpenPredecessorModal}
            weightMode={settings.weightMode}
          />
        </div>

        {/* Resizable Splitter Divider Bar */}
        <div
          onMouseDown={handleSplitterMouseDown}
          className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize z-30 transition-colors flex items-center justify-center select-none"
        >
          <div className="h-6 w-0.5 bg-slate-400 rounded-full"></div>
        </div>

        {/* Right Pane: Gantt Timeline */}
        <div className="flex-1 h-full flex flex-col overflow-hidden">
          <GanttTimeline
            tasks={tasks}
            calendar={settings.calendar}
            showBaseline={settings.showBaseline}
            onUpdateTask={handleUpdateTask}
            onAddDependency={handleAddDependency}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            onOpenPredecessorModal={handleOpenPredecessorModal}
          />
        </div>
      </div>

      {/* Modals */}
      <BaselineModal
        isOpen={isBaselineModalOpen}
        onClose={() => setIsBaselineModalOpen(false)}
        baselines={baselines}
        onSaveBaseline={handleSaveBaseline}
        onRestoreBaseline={handleRestoreBaseline}
        onDeleteBaseline={handleDeleteBaseline}
      />

      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(u) => setSettings(s => ({ ...s, ...u }))}
      />

      <PredecessorModal
        isOpen={isPredecessorModalOpen}
        onClose={() => {
          setIsPredecessorModalOpen(false);
          setPredecessorModalTask(null);
        }}
        task={predecessorModalTask}
        allTasks={tasks}
        onSaveDependencies={handleSaveDependencies}
      />
    </div>
  );
}

export default App;
