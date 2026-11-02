import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Task, ProjectSettings, ProjectFile, BaselineData, TaskDependency, ZoomTier } from './types/project';
import { recalculateSchedule, formatDate, addWorkingDays } from './engine/scheduler';
import { loadNativeWBSFile, exportToExcel, parseMicrosoftProjectXML, parseExcelProject } from './engine/importers';
import { saveProjectWithDialog } from './services/platform';
import { Toolbar } from './components/Toolbar';
import { ActionBar } from './components/ActionBar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { GanttTimeline } from './components/GanttTimeline';
import { BaselineModal } from './components/BaselineModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { PredecessorModal } from './components/PredecessorModal';
import { ExportModal } from './components/ExportModal';

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
  showCriticalPath: true,
  showTaskLabels: true,
  fontSize: 'normal'
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
    endDate: '2026-12-08',
    duration: 12,
    progress: 25,
    predecessors: [{ taskId: 't-4', type: 'FS', lag: 0 }],
    plannedManHours: 180,
    actualManHours: 45,
    remainingManHours: 135,
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
    predecessors: [{ taskId: 't-4', type: 'FS', lag: 1 }],
    plannedManHours: 60,
    actualManHours: 35,
    remainingManHours: 25,
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
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [rawTasks, setRawTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('wbs_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Strip legacy random colors so unified WBS-level colors apply
        return parsed.map((t: Task) => {
          const { color: _c, ...rest } = t;
          return rest;
        });
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_TASKS;
  });

  const [baselines, setBaselines] = useState<BaselineData[]>(() => {
    const saved = localStorage.getItem('wbs_baselines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(rawTasks[0]?.id || null);
  const [splitterWidth, setSplitterWidth] = useState<number>(640);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  // Zoom & DayWidth state
  const [zoomTier, setZoomTier] = useState<ZoomTier>('day');
  const [dayWidth, setDayWidth] = useState<number>(36);

  // Modals state
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPredecessorModalOpen, setIsPredecessorModalOpen] = useState(false);
  const [predecessorModalTask, setPredecessorModalTask] = useState<Task | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Auto recalculate schedule whenever tasks, calendar, or weightMode change
  const tasks = useMemo(() => {
    return recalculateSchedule(rawTasks, settings.calendar, settings.weightMode);
  }, [rawTasks, settings.calendar, settings.weightMode]);

  // Hierarchical collapse filtering
  const visibleTasks = useMemo(() => {
    const collapsedSet = new Set<string>();
    tasks.forEach(t => {
      if (t.isCollapsed) collapsedSet.add(t.id);
    });

    if (collapsedSet.size === 0) return tasks;

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    return tasks.filter(task => {
      let curr = task.parentId;
      while (curr) {
        if (collapsedSet.has(curr)) return false;
        const parent = taskMap.get(curr);
        curr = parent ? parent.parentId : null;
      }
      return true;
    });
  }, [tasks]);

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

  // Alert confirmation dialog before closing the window/tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Trigger native browser confirmation modal ("Leave site? Changes you made may not be saved.")
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Splitter Resizing
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter) return;
      const newWidth = Math.max(340, Math.min(window.innerWidth - 300, e.clientX));
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
        const selectedTask = rawTasks[idx];
        const isSummary = !!(selectedTask.isSummary || rawTasks.some(t => t.parentId === selectedTask.id));

        if (isSummary) {
          // When adding under a summary task, it MUST be added as a child of that summary task
          parentId = selectedTask.id;
          insertIndex = idx + 1;
        } else {
          // When adding under a regular leaf task, add as a sibling under the same parent
          parentId = selectedTask.parentId;
          insertIndex = idx + 1;
        }
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
      // Auto-expand parent if it was collapsed so the new child task is immediately visible
      const copy = prev.map(t => {
        if (parentId && t.id === parentId && t.isCollapsed) {
          return { ...t, isCollapsed: false };
        }
        return t;
      });
      copy.splice(insertIndex, 0, newTask);
      return copy;
    });

    setSelectedTaskId(newId);
  }, [rawTasks, settings.calendar]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const taskToDelete = rawTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // Check if task is a summary task or has child tasks
    const hasChildren = rawTasks.some(t => t.parentId === taskId);
    const confirmMessage = hasChildren
      ? `Are you sure you want to delete "${taskToDelete.name}" and all of its subtasks?\n\nThis action cannot be undone.`
      : `Are you sure you want to delete task "${taskToDelete.name}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

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

      // Filter out deleted tasks and clean up any dependencies pointing to deleted tasks
      return prev
        .filter(t => !idsToDelete.has(t.id))
        .map(t => ({
          ...t,
          predecessors: (t.predecessors || []).filter(dep => !idsToDelete.has(dep.taskId))
        }));
    });

    setSelectedTaskId(prevSelected => (prevSelected === taskId ? null : prevSelected));
  }, [rawTasks]);

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

  const handleAddDependency = useCallback((fromTaskId: string, toTaskId: string, type: TaskDependency['type'] = 'FS') => {
    if (fromTaskId === toTaskId) return;

    setRawTasks(prev => prev.map(t => {
      if (t.id === toTaskId) {
        const existing = t.predecessors || [];
        if (existing.some(d => d.taskId === fromTaskId)) return t;
        const newDeps = [...existing, { taskId: fromTaskId, type, lag: 0 }].slice(0, 10);
        return { ...t, predecessors: newDeps };
      }
      return t;
    }));
  }, []);

  // Collapse / Expand All
  const handleToggleCollapse = useCallback((taskId: string) => {
    setRawTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCollapsed: !t.isCollapsed } : t));
  }, []);

  const handleExpandAll = useCallback(() => {
    setRawTasks(prev => prev.map(t => t.isSummary ? { ...t, isCollapsed: false } : t));
  }, []);

  const handleCollapseAll = useCallback(() => {
    setRawTasks(prev => prev.map(t => t.isSummary ? { ...t, isCollapsed: true } : t));
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setDayWidth(prev => Math.min(100, Math.round(prev * 1.25)));
  };

  const handleZoomOut = () => {
    setDayWidth(prev => Math.max(10, Math.round(prev * 0.8)));
  };

  const handleZoomFit = () => {
    const containerW = window.innerWidth - splitterWidth - 50;
    if (tasks.length > 0 && containerW > 200) {
      const minD = new Date(tasks[0].startDate + 'T00:00:00').getTime();
      let maxD = minD;
      tasks.forEach(t => {
        const et = new Date(t.endDate + 'T00:00:00').getTime();
        if (et > maxD) maxD = et;
      });
      const totalDaysCount = Math.max(14, (maxD - minD) / (1000 * 3600 * 24) + 14);
      const fitWidth = Math.max(10, Math.floor(containerW / totalDaysCount));
      setDayWidth(fitWidth);
    }
  };

  const handleZoomChange = (tier: ZoomTier) => {
    setZoomTier(tier);
    if (tier === 'day') setDayWidth(36);
    else if (tier === 'week') setDayWidth(18);
    else if (tier === 'month') setDayWidth(6);
  };

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

  // Native WBS File Save & Load (Supports Electron Native Save Dialog & Web Fallback)
  const handleSaveWBS = async () => {
    const fileData: ProjectFile = {
      version: '1.0',
      meta: settings,
      baselines,
      tasks
    };
    await saveProjectWithDialog(fileData, `${settings.name.replace(/\s+/g, '_')}.wbs`);
  };

  // Listen for initial file or file-open events in Electron desktop mode (.wbs double-click)
  useEffect(() => {
    if (window.electronAPI?.getInitialFile) {
      window.electronAPI.getInitialFile().then(initialFile => {
        if (initialFile?.content) {
          try {
            const projectFile: ProjectFile = JSON.parse(initialFile.content);
            if (projectFile.meta && projectFile.tasks) {
              setSettings(projectFile.meta);
              setRawTasks(projectFile.tasks);
              if (projectFile.baselines) setBaselines(projectFile.baselines);
              if (projectFile.tasks.length > 0) setSelectedTaskId(projectFile.tasks[0].id);
            }
          } catch (e) {
            console.error('Failed to load initial file:', e);
          }
        }
      });
    }

    if (window.electronAPI?.onFileOpened) {
      const unsub = window.electronAPI.onFileOpened(data => {
        if (data?.content) {
          try {
            const projectFile: ProjectFile = JSON.parse(data.content);
            if (projectFile.meta && projectFile.tasks) {
              setSettings(projectFile.meta);
              setRawTasks(projectFile.tasks);
              if (projectFile.baselines) setBaselines(projectFile.baselines);
              if (projectFile.tasks.length > 0) setSelectedTaskId(projectFile.tasks[0].id);
            }
          } catch (e) {
            console.error('Failed to load opened file:', e);
          }
        }
      });
      return unsub;
    }
  }, []);

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

  // Import MS Project (.xml or .mpp)
  const handleImportMSP = async (file: File) => {
    try {
      const result = await parseMicrosoftProjectXML(file);
      setSettings(prev => ({
        ...prev,
        name: result.projectTitle || prev.name,
        startDate: result.startDate || prev.startDate
      }));
      setRawTasks(result.tasks);
      if (result.tasks.length > 0) {
        setSelectedTaskId(result.tasks[0].id);
      }
      alert(`Successfully imported "${result.projectTitle}" (${result.tasks.length} tasks) from Microsoft Project!`);
    } catch (err: any) {
      alert(err.message || 'Error importing MS Project file');
    }
  };

  // Import Excel (.xlsx, .xls, .csv)
  const handleImportExcel = async (file: File) => {
    try {
      const result = await parseExcelProject(file, settings.calendar);
      setSettings(prev => ({
        ...prev,
        name: result.projectTitle || prev.name,
        startDate: result.startDate || prev.startDate
      }));
      setRawTasks(result.tasks);
      if (result.tasks.length > 0) {
        setSelectedTaskId(result.tasks[0].id);
      }
      alert(`Successfully imported "${result.projectTitle}" (${result.tasks.length} activities) from Excel!`);
    } catch (err: any) {
      alert(err.message || 'Error importing Excel file');
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

  // Synchronized Vertical Scrolling between Spreadsheet Grid & Gantt Timeline
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleGridScroll = useCallback((scrollTop: number) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleTimelineScroll = useCallback((scrollTop: number) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 p-2 sm:p-3 font-sans">
      {/* Framed Application Container Floating with Calm Margins/Space Around */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-slate-300 shadow-md bg-white">
        {/* Top Ribbon Toolbar */}
        <Toolbar
          settings={settings}
          onUpdateSettings={(u) => setSettings(s => ({ ...s, ...u }))}
          onNewProject={handleNewProject}
          onSaveWBS={handleSaveWBS}
          onLoadWBS={handleLoadWBS}
          onImportMSP={handleImportMSP}
          onImportExcel={handleImportExcel}
          onExportExcel={handleExportExcel}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          totalTasks={tasks.length}
          overallProgress={overallProgress}
          totalPlannedMH={totalPlannedMH}
          totalActualMH={totalActualMH}
          finishDate={finishDate}
        />

        {/* OnlineGantt-Style Unified Action & Navigation Bar */}
        <ActionBar
          onAddTask={() => handleAddTask(selectedTaskId || undefined)}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onIndentTask={() => selectedTaskId && handleIndentTask(selectedTaskId)}
          onOutdentTask={() => selectedTaskId && handleOutdentTask(selectedTaskId)}
          onOpenRelationships={() => {
            const t = tasks.find(x => x.id === selectedTaskId);
            if (t && !t.isSummary) handleOpenPredecessorModal(t);
          }}
          onDeleteTask={() => selectedTaskId && handleDeleteTask(selectedTaskId)}
          selectedTaskId={selectedTaskId}
          isSummarySelected={!!tasks.find(x => x.id === selectedTaskId)?.isSummary}
          fontSize={settings.fontSize || 'normal'}
          onChangeFontSize={(size) => setSettings(s => ({ ...s, fontSize: size }))}
          showTaskLabels={settings.showTaskLabels ?? true}
          onToggleTaskLabels={() => setSettings(s => ({ ...s, showTaskLabels: !(s.showTaskLabels ?? true) }))}
          zoom={zoomTier}
          onChangeZoom={handleZoomChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomFit={handleZoomFit}
          showBaseline={settings.showBaseline}
        />

        {/* Main Splitter Work Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Pane: Spreadsheet Grid (MSP / Excel table) */}
          <div
            style={{ width: `${splitterWidth}px` }}
            className="h-full flex-shrink-0 flex flex-col overflow-hidden"
          >
            <SpreadsheetGrid
              tasks={visibleTasks}
              allTasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onIndentTask={handleIndentTask}
              onOutdentTask={handleOutdentTask}
              onOpenPredecessorModal={handleOpenPredecessorModal}
              onToggleCollapse={handleToggleCollapse}
              weightMode={settings.weightMode}
              fontSize={settings.fontSize || 'normal'}
              scrollContainerRef={gridScrollRef}
              onVerticalScroll={handleGridScroll}
            />
          </div>

          {/* Resizable Splitter Divider Bar */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className="w-2 bg-slate-300 hover:bg-indigo-600 active:bg-indigo-700 cursor-col-resize z-30 transition-colors flex items-center justify-center select-none shadow-xs"
          >
            <div className="h-8 w-1 bg-slate-500 rounded-full"></div>
          </div>

          {/* Right Pane: Gantt Timeline */}
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            <GanttTimeline
              tasks={visibleTasks}
              allTasks={tasks}
              calendar={settings.calendar}
              showBaseline={settings.showBaseline}
              showCriticalPath={settings.showCriticalPath}
              showTaskLabels={settings.showTaskLabels ?? true}
              onUpdateTask={handleUpdateTask}
              onAddDependency={handleAddDependency}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
              onOpenPredecessorModal={handleOpenPredecessorModal}
              fontSize={settings.fontSize || 'normal'}
              zoom={zoomTier}
              dayWidth={dayWidth}
              scrollContainerRef={timelineScrollRef}
              onVerticalScroll={handleTimelineScroll}
            />
          </div>
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

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tasks={tasks}
        settings={settings}
      />
    </div>
  );
}

export default App;
