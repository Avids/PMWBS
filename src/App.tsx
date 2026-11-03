import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Task, ProjectSettings, ProjectFile, BaselineData, TaskDependency, ZoomTier, ProjectCalendar } from './types/project';
import { getTheme, getFontFamilyCss } from './theme/themeConfig';
import { recalculateSchedule, formatDate, addWorkingDays, sanitizeCalendar, detectDependencyCycle, computeIndentParentId, computeOutdentParentId, parsePredecessors } from './engine/scheduler';
import { loadNativeWBSFile, exportToExcel, parseMicrosoftProjectXML, parseExcelProject } from './engine/importers';
import { saveProjectWithDialog } from './services/platform';
import { CheckCircle2, AlertTriangle, CircleAlert, Info, X, Flag, FileText } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { ActionBar } from './components/ActionBar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { GanttTimeline } from './components/GanttTimeline';
import { BaselineModal } from './components/BaselineModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ProjectInfoModal } from './components/ProjectInfoModal';
import { PredecessorModal } from './components/PredecessorModal';
import { ExportModal } from './components/ExportModal';
import { TaskInformationModal } from './components/TaskInformationModal';
import { TaskContextMenu } from './components/TaskContextMenu';

const DEFAULT_CALENDAR: ProjectCalendar = {
  workingDays: [1, 2, 3, 4, 5], // Mon - Fri
  holidays: [],
  hoursPerDay: 8
};

const DEFAULT_SETTINGS: ProjectSettings = {
  name: 'PROJECT EQUINIX TR06-2',
  projectNumber: 'TR06-2',
  company: 'Equinix Infrastructure Corp',
  projectAddress: '500 Data Center Way, Ashburn, VA 20147',
  author: 'Lead Project Scheduler',
  startDate: formatDate(new Date()),
  weightMode: 'duration',
  calendar: DEFAULT_CALENDAR,
  currency: '$',
  showBaseline: false,
  showCriticalPath: false,
  showTaskLabels: true,
  fontSize: 'normal',
  fontFamilyChoice: 'segoe'
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
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title?: string;
  } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', title?: string) => {
    setToast({ message: msg, type, title });
    setTimeout(() => {
      setToast(prev => prev && prev.message === msg ? null : prev);
    }, 6000);
  }, []);

  const [settings, setSettings] = useState<ProjectSettings>(() => {
    const saved = localStorage.getItem('wbs_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Critical path and baseline are OFF by default; user can turn them on
          showBaseline: false,
          showCriticalPath: false,
          calendar: sanitizeCalendar(parsed.calendar)
        };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const handleUpdateSettings = useCallback((updates: Partial<ProjectSettings>) => {
    setSettings(prev => {
      const prevCal = prev.calendar || DEFAULT_CALENDAR;
      const nextCal = updates.calendar ? { ...prevCal, ...updates.calendar } : prevCal;
      return {
        ...prev,
        ...updates,
        calendar: nextCal
      };
    });
  }, []);

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

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() => rawTasks[0] ? [rawTasks[0].id] : []);
  const selectedTaskId = selectedTaskIds[0] || null;
  const setSelectedTaskId = useCallback((idOrUpdater: string | null | ((prev: string | null) => string | null)) => {
    if (typeof idOrUpdater === 'function') {
      setSelectedTaskIds(prev => {
        const currentFirst = prev[0] || null;
        const next = idOrUpdater(currentFirst);
        return next ? [next] : [];
      });
    } else {
      setSelectedTaskIds(idOrUpdater ? [idOrUpdater] : []);
    }
  }, []);
  const [splitterWidth, setSplitterWidth] = useState<number>(640);
  const [autoFitTrigger, setAutoFitTrigger] = useState<number>(0);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  // Zoom & DayWidth state
  const [zoomTier, setZoomTier] = useState<ZoomTier>('day');
  const [dayWidth, setDayWidth] = useState<number>(36);

  // Modals state
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProjectInfoModalOpen, setIsProjectInfoModalOpen] = useState(false);
  const [isPredecessorModalOpen, setIsPredecessorModalOpen] = useState(false);
  const [predecessorModalTask, setPredecessorModalTask] = useState<Task | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTaskInfoModalOpen, setIsTaskInfoModalOpen] = useState(false);
  const [taskInfoModalTask, setTaskInfoModalTask] = useState<Task | null>(null);

  // Task Selection Handler with Shift (Range) & Ctrl/Cmd (Toggle) Multi-Select
  const handleSelectTask = useCallback((taskId: string, modifiers?: { isShift?: boolean; isCtrl?: boolean }) => {
    if (modifiers?.isCtrl) {
      setSelectedTaskIds(prev => {
        if (prev.includes(taskId)) {
          return prev.length > 1 ? prev.filter(id => id !== taskId) : prev;
        } else {
          return [...prev, taskId];
        }
      });
    } else if (modifiers?.isShift) {
      setSelectedTaskIds(prev => {
        const anchorId = prev[0] || taskId;
        const anchorIdx = rawTasks.findIndex(t => t.id === anchorId);
        const targetIdx = rawTasks.findIndex(t => t.id === taskId);
        if (anchorIdx === -1 || targetIdx === -1) return [taskId];

        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        return rawTasks.slice(start, end + 1).map(t => t.id);
      });
    } else {
      setSelectedTaskIds([taskId]);
    }
  }, [rawTasks]);

  const handleOpenTaskInfo = useCallback((task: Task) => {
    setTaskInfoModalTask(task);
    setIsTaskInfoModalOpen(true);
  }, []);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    task: Task | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    task: null
  });

  const handleOpenContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    setSelectedTaskId(task.id);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      task
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false, task: null }));
  }, []);

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

  // Undo / Redo History Stack (up to 50 operations)
  const [history, setHistory] = useState<{
    past: Task[][];
    future: Task[][];
  }>({
    past: [],
    future: []
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Central updater that records history for discrete mutations
  const updateRawTasks = useCallback((updater: (prev: Task[]) => Task[], recordHistory = true) => {
    setRawTasks(prev => {
      const next = updater(prev);
      if (next === prev) return prev;
      if (recordHistory) {
        setHistory(h => ({
          past: [...h.past.slice(-49), prev],
          future: []
        }));
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback(() => {
    setRawTasks(current => {
      setHistory(h => ({
        past: [...h.past.slice(-49), current],
        future: []
      }));
      return current;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setRawTasks(current => {
      let target: Task[] | null = null;
      setHistory(h => {
        if (h.past.length === 0) return h;
        target = h.past[h.past.length - 1];
        return {
          past: h.past.slice(0, -1),
          future: [current, ...h.future].slice(0, 50)
        };
      });
      return target || current;
    });
    showToast('Action undone (Ctrl+Z)', 'info');
  }, [showToast]);

  const handleRedo = useCallback(() => {
    setRawTasks(current => {
      let target: Task[] | null = null;
      setHistory(h => {
        if (h.future.length === 0) return h;
        target = h.future[0];
        return {
          past: [...h.past, current].slice(-50),
          future: h.future.slice(1)
        };
      });
      return target || current;
    });
    showToast('Action redone (Ctrl+Y)', 'info');
  }, [showToast]);



  // Task CRUD operations
  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>, recordHistory = true) => {
    if (updates.predecessors) {
      const cycleCheck = detectDependencyCycle(rawTasks, {
        taskId,
        newPredecessors: updates.predecessors
      });
      if (cycleCheck.hasCycle) {
        showToast(cycleCheck.message, 'warning', 'Circular Relationship Blocked');
        const { predecessors: _, predecessorText: __, ...safeUpdates } = updates;
        if (Object.keys(safeUpdates).length === 0) return;
        updates = safeUpdates;
      }
    }

    updateRawTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t), recordHistory);
  }, [rawTasks, updateRawTasks, showToast]);

  const handleAddTask = useCallback((afterTaskId?: string, asChild?: boolean) => {
    const newId = `t-${Date.now().toString(36)}`;
    const today = formatDate(new Date());

    let parentId: string | null = null;
    let insertIndex = rawTasks.length;

    if (afterTaskId) {
      const idx = rawTasks.findIndex(t => t.id === afterTaskId);
      if (idx !== -1) {
        const selectedTask = rawTasks[idx];
        if (asChild === true) {
          parentId = selectedTask.id;
          insertIndex = idx + 1;
        } else if (asChild === false) {
          parentId = selectedTask.parentId;
          insertIndex = idx + 1;
        } else {
          const isSummary = !!(selectedTask.isSummary || rawTasks.some(t => t.parentId === selectedTask.id));
          if (isSummary) {
            parentId = selectedTask.id;
            insertIndex = idx + 1;
          } else {
            parentId = selectedTask.parentId;
            insertIndex = idx + 1;
          }
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
      plannedManHours: 0,
      actualManHours: 0,
      remainingManHours: 0,
      earnedManHours: 0,
      weight: 0
    };

    updateRawTasks(prev => {
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
  }, [rawTasks, settings.calendar, updateRawTasks]);

  const handleAddSubtask = useCallback((parentTaskId: string) => {
    handleAddTask(parentTaskId, true);
  }, [handleAddTask]);

  const handleDuplicateTask = useCallback((taskId: string) => {
    const idx = rawTasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const original = rawTasks[idx];
    const newId = `t-${Date.now().toString(36)}`;
    const duplicatedTask: Task = {
      ...original,
      id: newId,
      wbsCode: '',
      name: `${original.name} (Copy)`,
      progress: 0,
      actualManHours: 0,
      remainingManHours: original.plannedManHours || 0,
      earnedManHours: 0,
      predecessors: (original.predecessors || []).map(p => ({ ...p }))
    };

    updateRawTasks(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, duplicatedTask);
      return copy;
    });

    setSelectedTaskId(newId);
  }, [rawTasks, updateRawTasks]);

  // Direct Clipboard Paste Handler (Cell, Row, Multi-row paste)
  const handlePasteRows = useCallback((startRowIdx: number, startColIdx: number, matrix: string[][]) => {
    if (!matrix || matrix.length === 0) return;

    const columnFields = [
      'wbs',
      'name',
      'duration',
      'startDate',
      'endDate',
      'progress',
      'weight',
      'predecessors',
      'totalFloat',
      'plannedManHours',
      'actualManHours',
      'remainingManHours',
      'earnedManHours',
      'baselineStart',
      'baselineEnd',
      'variance',
      'notes'
    ];

    const today = formatDate(new Date());
    let pastedCount = 0;
    let cycleWarning: string | null = null;

    updateRawTasks(prev => {
      const copy = [...prev];

      let targetRows = matrix;
      let targetRowIndices: number[] = [];

      // Case 1: Single cell pasted into multiple selected rows
      if (matrix.length === 1 && matrix[0].length === 1 && selectedTaskIds.length > 1) {
        targetRowIndices = selectedTaskIds
          .map(id => copy.findIndex(t => t.id === id))
          .filter(idx => idx >= 0)
          .sort((a, b) => a - b);
        targetRows = targetRowIndices.map(() => matrix[0]);
      } else {
        // Map visible row index to raw task index
        targetRows = matrix;
        targetRowIndices = matrix.map((_, rIdx) => {
          const vIdx = startRowIdx + rIdx;
          if (vIdx >= 0 && vIdx < visibleTasks.length) {
            const vTask = visibleTasks[vIdx];
            const rawIdx = copy.findIndex(t => t.id === vTask.id);
            if (rawIdx >= 0) return rawIdx;
          }
          return startRowIdx + rIdx;
        });
      }

      let parentId: string | null = null;
      if (targetRowIndices.length > 0 && targetRowIndices[0] >= 0 && targetRowIndices[0] < copy.length) {
        parentId = copy[targetRowIndices[0]].parentId;
      }

      targetRows.forEach((rowValues, rIdx) => {
        const targetRowIdx = targetRowIndices[rIdx];
        const isExisting = targetRowIdx >= 0 && targetRowIdx < copy.length;
        const currentTask = isExisting ? copy[targetRowIdx] : null;

        const updates: Partial<Task> = {};

        rowValues.forEach((cellRaw, cOffset) => {
          const colField = columnFields[startColIdx + cOffset];
          if (!colField) return;
          const trimmed = cellRaw.trim();

          // Readonly columns cannot be modified via paste
          if (
            colField === 'wbs' ||
            colField === 'weight' ||
            colField === 'totalFloat' ||
            colField === 'remainingManHours' ||
            colField === 'earnedManHours' ||
            colField === 'baselineStart' ||
            colField === 'baselineEnd' ||
            colField === 'variance'
          ) {
            return;
          }

          // Summary tasks cannot have duration, dates, progress, predecessors, or man-hours overwritten
          if (currentTask?.isSummary && colField !== 'name' && colField !== 'notes') {
            return;
          }

          if (!trimmed && colField !== 'notes' && colField !== 'predecessors') return;

          if (colField === 'name') {
            if (trimmed) updates.name = trimmed;
          } else if (colField === 'duration') {
            const num = parseFloat(trimmed.replace(/[^\d.]/g, ''));
            if (!isNaN(num) && num >= 0) {
              updates.duration = num;
              updates.isMilestone = num === 0;
            }
          } else if (colField === 'startDate') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
              updates.startDate = trimmed;
            } else {
              const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (mdy) {
                updates.startDate = `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
              }
            }
          } else if (colField === 'endDate') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
              updates.endDate = trimmed;
            } else {
              const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (mdy) {
                updates.endDate = `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
              }
            }
          } else if (colField === 'progress') {
            let p = parseFloat(trimmed.replace('%', ''));
            if (!isNaN(p)) {
              if (p <= 1 && p > 0 && !trimmed.includes('%')) p = Math.round(p * 100);
              updates.progress = Math.min(100, Math.max(0, p));
            }
          } else if (colField === 'predecessors') {
            if (!currentTask || !currentTask.isSummary) {
              if (!trimmed || trimmed === '-') {
                updates.predecessors = [];
                updates.predecessorText = '';
              } else {
                const parsed = parsePredecessors(trimmed, tasks.length > 0 ? tasks : copy);
                const currentId = currentTask?.id;
                const valid = parsed.filter(d => !currentId || d.taskId !== currentId);

                if (currentId) {
                  const cycleCheck = detectDependencyCycle(copy, {
                    taskId: currentId,
                    newPredecessors: valid
                  });
                  if (cycleCheck.hasCycle) {
                    cycleWarning = cycleCheck.message;
                  } else {
                    updates.predecessors = valid;
                    updates.predecessorText = trimmed;
                  }
                } else {
                  updates.predecessors = valid;
                  updates.predecessorText = trimmed;
                }
              }
            }
          } else if (colField === 'plannedManHours') {
            const mh = parseFloat(trimmed.replace(/[^\d.]/g, ''));
            if (!isNaN(mh) && mh >= 0) updates.plannedManHours = mh;
          } else if (colField === 'actualManHours') {
            const mh = parseFloat(trimmed.replace(/[^\d.]/g, ''));
            if (!isNaN(mh) && mh >= 0) updates.actualManHours = mh;
          } else if (colField === 'notes') {
            updates.notes = trimmed;
          }
        });

        if (Object.keys(updates).length > 0) {
          pastedCount++;
        }

        if (isExisting) {
          copy[targetRowIdx] = { ...copy[targetRowIdx], ...updates };
        } else {
          const newId = `t-${Date.now().toString(36)}-${rIdx}`;
          const duration = updates.duration ?? 5;
          const startDate = updates.startDate ?? today;
          copy.push({
            id: newId,
            wbsCode: '',
            name: updates.name || `Activity ${copy.length + 1}`,
            parentId,
            isSummary: false,
            isMilestone: duration === 0,
            startDate,
            endDate: updates.endDate ?? addWorkingDays(startDate, duration, settings.calendar),
            duration,
            progress: updates.progress ?? 0,
            predecessors: updates.predecessors || [],
            predecessorText: updates.predecessorText,
            plannedManHours: updates.plannedManHours ?? 0,
            actualManHours: updates.actualManHours ?? 0,
            remainingManHours: 0,
            earnedManHours: 0,
            weight: 0,
            notes: updates.notes
          });
        }
      });

      return copy;
    }, true);

    if (cycleWarning) {
      showToast(cycleWarning, 'warning', 'Circular Relationship Blocked');
    }

    if (pastedCount > 0) {
      if (matrix.length === 1 && matrix[0].length === 1) {
        if (selectedTaskIds.length > 1) {
          showToast(`Pasted cell into ${pastedCount} tasks`, 'success', 'Paste');
        } else {
          showToast('Cell pasted successfully', 'success', 'Paste');
        }
      } else {
        showToast(`Successfully pasted ${matrix.length} row(s)`, 'success', 'Paste');
      }
    }
  }, [settings.calendar, showToast, updateRawTasks, visibleTasks, tasks, selectedTaskIds]);

  const handleClearDependencies = useCallback((taskId: string) => {
    updateRawTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, predecessors: [] };
      }
      return {
        ...t,
        predecessors: (t.predecessors || []).filter(p => p.taskId !== taskId)
      };
    }));
  }, [updateRawTasks]);

  const handleToggleMilestone = useCallback((taskId: string) => {
    const task = rawTasks.find(t => t.id === taskId);
    if (!task) return;
    const isNowMilestone = !task.isMilestone && task.duration > 0;
    handleUpdateTask(taskId, {
      isMilestone: isNowMilestone,
      duration: isNowMilestone ? 0 : 5,
      endDate: isNowMilestone ? task.startDate : addWorkingDays(task.startDate, 5, settings.calendar)
    });
  }, [rawTasks, handleUpdateTask, settings.calendar]);

  const handleDeleteTasks = useCallback((taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    const idsToDelete = new Set<string>(taskIds);
    const findDescendants = (parentId: string) => {
      rawTasks.filter(t => t.parentId === parentId).forEach(child => {
        idsToDelete.add(child.id);
        findDescendants(child.id);
      });
    };
    taskIds.forEach(id => findDescendants(id));

    updateRawTasks(prev => {
      return prev
        .filter(t => !idsToDelete.has(t.id))
        .map(t => ({
          ...t,
          predecessors: (t.predecessors || []).filter(dep => !idsToDelete.has(dep.taskId))
        }));
    });

    setSelectedTaskIds(prev => prev.filter(id => !idsToDelete.has(id)));
  }, [rawTasks, updateRawTasks]);

  const handleIndentTasks = useCallback((taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    updateRawTasks(prev => {
      let currentList = [...prev];
      const idSet = new Set(taskIds);
      const orderedIds = currentList.filter(t => idSet.has(t.id)).map(t => t.id);

      for (const id of orderedIds) {
        const newParentId = computeIndentParentId(currentList, id);
        if (newParentId !== undefined) {
          currentList = currentList.map(t => (t.id === id ? { ...t, parentId: newParentId } : t));
        }
      }
      return currentList;
    });
  }, [updateRawTasks]);

  const handleOutdentTasks = useCallback((taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    updateRawTasks(prev => {
      let currentList = [...prev];
      const idSet = new Set(taskIds);
      const orderedIds = currentList.filter(t => idSet.has(t.id)).map(t => t.id);

      for (const id of orderedIds) {
        const newParentId = computeOutdentParentId(currentList, id);
        if (newParentId !== undefined) {
          currentList = currentList.map(t => (t.id === id ? { ...t, parentId: newParentId } : t));
        }
      }
      return currentList;
    });
  }, [updateRawTasks]);

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

    updateRawTasks(prev => {
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
  }, [rawTasks, updateRawTasks]);

  const handleIndentTask = useCallback((taskId: string) => {
    updateRawTasks(prev => {
      const newParentId = computeIndentParentId(prev, taskId);
      if (newParentId === undefined) return prev;

      return prev.map(t => (t.id === taskId ? { ...t, parentId: newParentId } : t));
    });
  }, [updateRawTasks]);


  const handleOutdentTask = useCallback((taskId: string) => {
    updateRawTasks(prev => {
      const newParentId = computeOutdentParentId(prev, taskId);
      if (newParentId === undefined) return prev;

      return prev.map(t => (t.id === taskId ? { ...t, parentId: newParentId } : t));
    });
  }, [updateRawTasks]);

  // Global Keyboard listener for Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), Indent (Alt+Right), Outdent (Alt+Left)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'Right')) {
        if (selectedTaskId) {
          e.preventDefault();
          handleIndentTasks(selectedTaskIds);
        }
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left')) {
        if (selectedTaskId) {
          e.preventDefault();
          handleOutdentTasks(selectedTaskIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedTaskId, handleIndentTasks, handleOutdentTasks, selectedTaskIds]);

  const handleAddDependency = useCallback((fromTaskId: string, toTaskId: string, type: TaskDependency['type'] = 'FS') => {
    if (fromTaskId === toTaskId) {
      showToast('Task cannot depend on itself.', 'warning', 'Invalid Dependency');
      return;
    }

    const target = rawTasks.find(t => t.id === toTaskId);
    if (!target) return;
    const existing = target.predecessors || [];
    if (existing.some(d => d.taskId === fromTaskId)) return;

    const proposedDeps = [...existing, { taskId: fromTaskId, type, lag: 0 }].slice(0, 10);
    const cycleCheck = detectDependencyCycle(rawTasks, {
      taskId: toTaskId,
      newPredecessors: proposedDeps
    });

    if (cycleCheck.hasCycle) {
      showToast(cycleCheck.message, 'warning', 'Circular Relationship Blocked');
      return;
    }

    updateRawTasks(prev => prev.map(t => {
      if (t.id === toTaskId) {
        return { ...t, predecessors: proposedDeps };
      }
      return t;
    }));
    showToast('Dependency created', 'success');
  }, [rawTasks, updateRawTasks, showToast]);

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
    const cycleCheck = detectDependencyCycle(rawTasks, {
      taskId,
      newPredecessors: dependencies
    });

    if (cycleCheck.hasCycle) {
      showToast(cycleCheck.message, 'warning', 'Circular Relationship Blocked');
      return;
    }

    updateRawTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, predecessors: dependencies };
      }
      return t;
    }));
    showToast('Relationships updated', 'success');
  }, [rawTasks, updateRawTasks, showToast]);

  // Helper to safely restore a loaded project with complete calendar settings
  const applyLoadedProject = useCallback((projectFile: any, sourceName: string = 'project') => {
    if (!projectFile || typeof projectFile !== 'object') return;

    const rawMeta = projectFile.meta || {};
    const rawCalendar = projectFile.calendar || rawMeta.calendar;
    const sanitizedCal = sanitizeCalendar(rawCalendar);

    const mergedSettings: ProjectSettings = {
      ...DEFAULT_SETTINGS,
      ...rawMeta,
      calendar: sanitizedCal,
      weightMode: rawMeta.weightMode || 'duration',
      currency: rawMeta.currency || '$',
      showBaseline: rawMeta.showBaseline ?? false,
      showCriticalPath: rawMeta.showCriticalPath ?? false,
      showTaskLabels: rawMeta.showTaskLabels ?? true,
      fontSize: rawMeta.fontSize || 'normal'
    };

    setSettings(mergedSettings);

    if (Array.isArray(projectFile.tasks)) {
      setRawTasks(projectFile.tasks);
      setHistory({ past: [], future: [] });
      if (projectFile.tasks.length > 0) {
        setSelectedTaskId(projectFile.tasks[0].id);
      }
    }

    if (Array.isArray(projectFile.baselines)) {
      setBaselines(projectFile.baselines);
    }

    showToast(`Loaded ${sourceName} "${mergedSettings.name}" with calendar settings (${sanitizedCal.workingDays.length} work days/wk, ${sanitizedCal.hoursPerDay}h/day, ${sanitizedCal.holidays.length} holiday${sanitizedCal.holidays.length === 1 ? '' : 's'}).`);
  }, [showToast]);

  // Native WBS File Save & Load (Supports Electron Native Save Dialog & Web Fallback)
  const handleSaveWBS = useCallback(async () => {
    const calendarSnapshot: ProjectCalendar = sanitizeCalendar(settings.calendar);

    const fileData: ProjectFile = {
      version: '1.0',
      meta: {
        ...settings,
        calendar: calendarSnapshot
      },
      calendar: calendarSnapshot,
      baselines,
      tasks
    };

    const fileName = `${settings.name.replace(/\s+/g, '_')}.wbs`;
    const res = await saveProjectWithDialog(fileData, fileName);
    if (res.success) {
      showToast(
        `Project saved successfully with calendar settings! (${calendarSnapshot.workingDays.length} work days/wk, ${calendarSnapshot.hoursPerDay}h/day, ${calendarSnapshot.holidays.length} holiday${calendarSnapshot.holidays.length === 1 ? '' : 's'})`
      );
    }
  }, [settings, baselines, tasks, showToast]);

  // Keyboard shortcut Ctrl+S / Cmd+S to save project
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveWBS();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveWBS]);

  // Listen for initial file or file-open events in Electron desktop mode (.wbs double-click)
  useEffect(() => {
    if (window.electronAPI?.getInitialFile) {
      window.electronAPI.getInitialFile().then(initialFile => {
        if (initialFile?.content) {
          try {
            const projectFile: ProjectFile = JSON.parse(initialFile.content);
            applyLoadedProject(projectFile, initialFile.name || 'file');
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
            applyLoadedProject(projectFile, data.name || 'opened file');
          } catch (e) {
            console.error('Failed to load opened file:', e);
          }
        }
      });
      return unsub;
    }
  }, [applyLoadedProject]);

  const handleLoadWBS = async (file: File) => {
    try {
      const projectFile = await loadNativeWBSFile(file);
      applyLoadedProject(projectFile, file.name);
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
      showToast(`Successfully imported "${result.projectTitle}" (${result.tasks.length} tasks) from Microsoft Project!`);
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
        startDate: result.startDate || prev.startDate,
        ...(result.calendar ? { calendar: result.calendar } : {}),
        ...(result.currency ? { currency: result.currency } : {}),
        ...(result.weightMode ? { weightMode: result.weightMode } : {})
      }));
      setRawTasks(result.tasks);
      if (result.tasks.length > 0) {
        setSelectedTaskId(result.tasks[0].id);
      }
      const calInfo = result.calendar
        ? ` with calendar (${result.calendar.workingDays.length} work days/wk, ${result.calendar.hoursPerDay}h/day, ${result.calendar.holidays.length} holiday${result.calendar.holidays.length === 1 ? '' : 's'})`
        : '';
      showToast(`Successfully imported "${result.projectTitle}" (${result.tasks.length} activities)${calInfo}!`);
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
      setHistory({ past: [], future: [] });
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

  const baseTheme = getTheme(settings.colorTheme, settings.fontFamilyChoice, settings.customTheme);
  const activeFontCss = getFontFamilyCss(settings.fontFamilyChoice);
  const theme = {
    ...baseTheme,
    fontFamily: activeFontCss
  };
  const isSiteDrawing = theme.id === 'construction';

  return (
    <div
      style={{ backgroundColor: theme.appBg, fontFamily: activeFontCss }}
      className="flex flex-col h-screen w-screen overflow-hidden p-2 sm:p-3 transition-colors"
    >
      {/* Framed Application Container Floating with Calm Margins/Space Around */}
      <div
        style={{ backgroundColor: theme.surfaceBg, borderColor: theme.border }}
        className="flex-1 flex flex-col overflow-hidden rounded-xl border shadow-md"
      >
        {/* Top Ribbon Toolbar */}
        <Toolbar
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onNewProject={handleNewProject}
          onSaveWBS={handleSaveWBS}
          onLoadWBS={handleLoadWBS}
          onImportMSP={handleImportMSP}
          onImportExcel={handleImportExcel}
          onExportExcel={handleExportExcel}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenProjectInfoModal={() => setIsProjectInfoModalOpen(true)}
          totalTasks={tasks.length}
          overallProgress={overallProgress}
          totalPlannedMH={totalPlannedMH}
          totalActualMH={totalActualMH}
          finishDate={finishDate}
        />

        {/* OnlineGantt-Style Unified Action & Navigation Bar */}
        <ActionBar
          colorTheme={settings.colorTheme}
          customTheme={settings.customTheme}
          onAddTask={() => handleAddTask(selectedTaskId || undefined)}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onIndentTask={() => selectedTaskIds.length > 0 && handleIndentTasks(selectedTaskIds)}
          onOutdentTask={() => selectedTaskIds.length > 0 && handleOutdentTasks(selectedTaskIds)}
          onOpenRelationships={() => {
            const t = tasks.find(x => x.id === selectedTaskId);
            if (t && !t.isSummary) handleOpenPredecessorModal(t);
          }}
          onOpenTaskInfo={() => {
            const t = tasks.find(x => x.id === selectedTaskId);
            if (t) handleOpenTaskInfo(t);
          }}
          onDeleteTask={() => selectedTaskIds.length > 0 && handleDeleteTasks(selectedTaskIds)}
          selectedTaskId={selectedTaskId}
          selectedCount={selectedTaskIds.length}
          isSummarySelected={!!tasks.find(x => x.id === selectedTaskId)?.isSummary}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          fontSize={settings.fontSize || 'normal'}
          onChangeFontSize={(size) => setSettings(s => ({ ...s, fontSize: size }))}
          fontFamilyChoice={settings.fontFamilyChoice}
          onChangeFontFamily={(font) => setSettings(s => ({ ...s, fontFamilyChoice: font }))}
          showTaskLabels={settings.showTaskLabels ?? true}
          onToggleTaskLabels={() => setSettings(s => ({ ...s, showTaskLabels: !(s.showTaskLabels ?? true) }))}
          onAutoFitColumns={() => {
            setAutoFitTrigger(c => c + 1);
            showToast('Columns auto-fitted to content width', 'info', 'Auto-Fit');
          }}
          zoom={zoomTier}
          onChangeZoom={handleZoomChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomFit={handleZoomFit}
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
              onSelectTask={handleSelectTask}
              selectedTaskIds={selectedTaskIds}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onIndentTask={(id) => selectedTaskIds.includes(id) && selectedTaskIds.length > 1 ? handleIndentTasks(selectedTaskIds) : handleIndentTask(id)}
              onOutdentTask={(id) => selectedTaskIds.includes(id) && selectedTaskIds.length > 1 ? handleOutdentTasks(selectedTaskIds) : handleOutdentTask(id)}
              onOpenPredecessorModal={handleOpenPredecessorModal}
              onOpenTaskInfo={handleOpenTaskInfo}
              onContextMenu={handleOpenContextMenu}
              onToggleCollapse={handleToggleCollapse}
              weightMode={settings.weightMode}
              fontSize={settings.fontSize || 'normal'}
              scrollContainerRef={gridScrollRef}
              onVerticalScroll={handleGridScroll}
              colorTheme={settings.colorTheme}
              customTheme={settings.customTheme}
              fontFamilyChoice={settings.fontFamilyChoice}
              onPasteRows={handlePasteRows}
              autoFitTrigger={autoFitTrigger}
            />
          </div>

          {/* Resizable Splitter Divider Bar */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className={`w-2 cursor-col-resize z-30 transition-colors flex items-center justify-center select-none shadow-xs ${
              isSiteDrawing
                ? 'bg-[#C9CED2] hover:bg-[#E8590C] active:bg-[#E8590C]'
                : 'bg-slate-300 hover:bg-indigo-600 active:bg-indigo-700'
            }`}
          >
            <div className={`h-8 w-1 rounded-full ${isSiteDrawing ? 'bg-[#37434D]' : 'bg-slate-500'}`}></div>
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
              selectedTaskIds={selectedTaskIds}
              onOpenPredecessorModal={handleOpenPredecessorModal}
              onOpenTaskInfo={handleOpenTaskInfo}
              onContextMenu={handleOpenContextMenu}
              onDragStart={handleDragStart}
              fontSize={settings.fontSize || 'normal'}
              zoom={zoomTier}
              dayWidth={dayWidth}
              scrollContainerRef={timelineScrollRef}
              onVerticalScroll={handleTimelineScroll}
              colorTheme={settings.colorTheme}
              customTheme={settings.customTheme}
              fontFamilyChoice={settings.fontFamilyChoice}
            />
          </div>
        </div>

        {/* Bottom View Legend & Schedule Status Bar */}
        <div
          style={{
            backgroundColor: theme.headerSubBg === '#FFFFFF' ? '#F8FAFC' : theme.headerSubBg,
            borderColor: theme.border,
            color: theme.textSecondary
          }}
          className="h-8 px-4 flex items-center justify-between text-[11px] select-none z-20 shrink-0 border-t"
        >
          {/* Status info */}
          <div className="flex items-center space-x-2 font-medium" style={{ color: theme.textSecondary }}>
            <span><strong style={{ color: theme.textPrimary }}>{tasks.length}</strong> tasks</span>
            <span>•</span>
            <span><strong style={{ color: theme.textPrimary }}>{visibleTasks.length}</strong> visible</span>
            {finishDate && (
              <>
                <span>•</span>
                <span>Target Finish: <strong style={{ color: theme.textPrimary }}>{finishDate}</strong></span>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 font-semibold">
            <span style={{ color: theme.textSecondary }} className="font-medium">Legend:</span>
            <div className="flex items-center space-x-1.5">
              <svg width="14" height="10" viewBox="0 0 14 10" className="shrink-0">
                <rect x="0" y="0" width="14" height="4" rx="1" fill={theme.summaryBar} />
                <polygon points="0,4 4,4 2,9" fill={theme.summaryBar} />
                <polygon points="10,4 14,4 12,9" fill={theme.summaryBar} />
              </svg>
              <span>Summary</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: theme.taskBar }} />
              <span>Task</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="flex items-center space-x-1">
                <Flag className="w-3 h-3 text-emerald-600 shrink-0" />
                <div
                  className="w-2.5 h-2.5 rotate-45 border"
                  style={{ backgroundColor: theme.milestone, borderColor: theme.milestoneBorder || '#FFFFFF' }}
                />
              </div>
              <span>Milestone</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Note</span>
            </div>
            {settings.showCriticalPath && (
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: theme.critical }} />
                <span style={{ color: theme.critical }}>Critical Path</span>
              </div>
            )}
            {settings.showBaseline && (
              <div className="flex items-center space-x-1.5">
                <div
                  className="w-2.5 h-1.5 border"
                  style={{ backgroundColor: theme.baseline, borderColor: theme.baselineBorder || theme.baseline }}
                />
                <span style={{ color: theme.textSecondary }}>Baseline</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2 rounded-2xs" style={{ backgroundColor: theme.signal }} />
              <span style={{ color: theme.signal }}>Signal / Today</span>
            </div>
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

      <ProjectInfoModal
        isOpen={isProjectInfoModalOpen}
        onClose={() => setIsProjectInfoModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        totalTasks={tasks.length}
        overallProgress={overallProgress}
        totalPlannedMH={totalPlannedMH}
        totalActualMH={totalActualMH}
        finishDate={finishDate}
      />

      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {isPredecessorModalOpen && predecessorModalTask && (
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
      )}

      {isTaskInfoModalOpen && taskInfoModalTask && (
        <TaskInformationModal
          isOpen={isTaskInfoModalOpen}
          onClose={() => {
            setIsTaskInfoModalOpen(false);
            setTaskInfoModalTask(null);
          }}
          task={taskInfoModalTask}
          allTasks={tasks}
          calendar={settings.calendar}
          onSaveTask={handleUpdateTask}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tasks={tasks}
        settings={settings}
      />

      <TaskContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        task={contextMenu.task}
        onClose={handleCloseContextMenu}
        onOpenTaskInfo={(task) => {
          setTaskInfoModalTask(task);
          setIsTaskInfoModalOpen(true);
        }}
        onDeleteTask={handleDeleteTask}
        onAddTaskBelow={(afterId) => handleAddTask(afterId, false)}
        onAddSubtask={handleAddSubtask}
        onDuplicateTask={handleDuplicateTask}
        onClearDependencies={handleClearDependencies}
        onOpenPredecessors={(task) => {
          setPredecessorModalTask(task);
          setIsPredecessorModalOpen(true);
        }}
        onToggleMilestone={handleToggleMilestone}
      />

      {/* Floating Save/Status/Warning Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-start space-x-3 text-xs font-medium backdrop-blur-md animate-fade-in max-w-lg transition-all ${
            toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-100 border-amber-500/60 shadow-amber-950/50'
              : toast.type === 'error'
              ? 'bg-red-950/95 text-red-100 border-red-500/60 shadow-red-950/50'
              : toast.type === 'info'
              ? 'bg-sky-950/95 text-sky-100 border-sky-500/60'
              : 'bg-slate-900/95 text-white border-indigo-500/40 shadow-slate-950/50'
          }`}
        >
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <CircleAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          <div className="flex-1 pr-1">
            {toast.title && <p className="font-semibold text-[13px] mb-0.5">{toast.title}</p>}
            <p className="leading-snug whitespace-pre-wrap">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
