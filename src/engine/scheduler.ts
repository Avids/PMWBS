import type { Task, ProjectCalendar, TaskDependency, DependencyType, WeightMode } from '../types/project';

/**
 * Validates, repairs, and sanitizes a ProjectCalendar object.
 * Ensures workingDays contains valid days (0-6), holidays is an array of strings,
 * and hoursPerDay is a positive number.
 */
export function sanitizeCalendar(cal?: Partial<ProjectCalendar> | null): ProjectCalendar {
  const defaultWorkingDays = [1, 2, 3, 4, 5]; // Mon - Fri
  if (!cal || typeof cal !== 'object') {
    return {
      workingDays: defaultWorkingDays,
      holidays: [],
      hoursPerDay: 8
    };
  }

  const rawDays = Array.isArray(cal.workingDays) ? cal.workingDays : defaultWorkingDays;
  const validDays = rawDays
    .map(Number)
    .filter(d => !isNaN(d) && d >= 0 && d <= 6);

  const cleanWorkingDays = validDays.length > 0
    ? Array.from(new Set(validDays)).sort((a, b) => a - b)
    : defaultWorkingDays;

  const cleanHolidays = Array.isArray(cal.holidays)
    ? cal.holidays
        .map(h => String(h || '').trim())
        .filter(h => /^\d{4}-\d{2}-\d{2}$/.test(h))
        .sort()
    : [];

  const cleanHours = typeof cal.hoursPerDay === 'number' && cal.hoursPerDay > 0 && cal.hoursPerDay <= 24
    ? cal.hoursPerDay
    : 8;

  return {
    workingDays: cleanWorkingDays,
    holidays: cleanHolidays,
    hoursPerDay: cleanHours
  };
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a working day.
 */
export function isWorkingDay(dateStr: string, calendar: ProjectCalendar): boolean {
  if (!dateStr) return false;
  const holidays = calendar?.holidays || [];
  if (holidays.includes(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const workingDays = calendar?.workingDays && calendar.workingDays.length > 0
    ? calendar.workingDays
    : [1, 2, 3, 4, 5];
  return workingDays.includes(day);
}

/**
 * Converts a Date object to YYYY-MM-DD format in local timezone.
 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Counts the number of working days between start and end date (inclusive).
 */
export function countWorkingDays(startDateStr: string, endDateStr: string, calendar: ProjectCalendar): number {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  if (start > end) return 0;
  
  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const ds = formatDate(curr);
    if (isWorkingDay(ds, calendar)) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

/**
 * Moves forward or backward by N working days.
 * If offset === 0, returns the date (or nearest working day).
 */
export function addWorkingDaysOffset(dateStr: string, offset: number, calendar: ProjectCalendar): string {
  if (!dateStr) return formatDate(new Date());
  const curr = new Date(dateStr + 'T00:00:00');

  // Align to working day first with infinite loop guard
  let guard = 3650;
  while (!isWorkingDay(formatDate(curr), calendar) && guard-- > 0) {
    curr.setDate(curr.getDate() + (offset >= 0 ? 1 : -1));
  }

  if (offset === 0) return formatDate(curr);

  const step = offset > 0 ? 1 : -1;
  let remaining = Math.abs(offset);
  guard = 36500;

  while (remaining > 0 && guard-- > 0) {
    curr.setDate(curr.getDate() + step);
    if (isWorkingDay(formatDate(curr), calendar)) {
      remaining--;
    }
  }

  return formatDate(curr);
}

/**
 * Adds duration (in working days) to a start date.
 * If days === 0 (milestone), returns startDateStr.
 * If days === 1, returns startDateStr (if working day).
 * If days > 1, counts startDateStr as day 1 and finds the end date.
 */
export function addWorkingDays(startDateStr: string, days: number, calendar: ProjectCalendar): string {
  if (!startDateStr) return formatDate(new Date());
  if (days <= 0) return startDateStr;

  const curr = new Date(startDateStr + 'T00:00:00');

  // If start is non-working, move forward to first working day
  let guard = 3650;
  while (!isWorkingDay(formatDate(curr), calendar) && guard-- > 0) {
    curr.setDate(curr.getDate() + 1);
  }

  if (days === 1) return formatDate(curr);

  return addWorkingDaysOffset(formatDate(curr), days - 1, calendar);
}

/**
 * Finds the next working day after a given date.
 */
export function getNextWorkingDay(dateStr: string, calendar: ProjectCalendar): string {
  const curr = new Date(dateStr + 'T00:00:00');
  curr.setDate(curr.getDate() + 1);
  let guard = 3650;
  while (!isWorkingDay(formatDate(curr), calendar) && guard-- > 0) {
    curr.setDate(curr.getDate() + 1);
  }
  return formatDate(curr);
}

/**
 * Finds the previous working day before a given date.
 */
export function getPrevWorkingDay(dateStr: string, calendar: ProjectCalendar): string {
  const curr = new Date(dateStr + 'T00:00:00');
  curr.setDate(curr.getDate() - 1);
  let guard = 3650;
  while (!isWorkingDay(formatDate(curr), calendar) && guard-- > 0) {
    curr.setDate(curr.getDate() - 1);
  }
  return formatDate(curr);
}

/**
 * Subtracts duration (in working days) from an end date to get the required start date.
 */
export function subtractWorkingDays(endDateStr: string, days: number, calendar: ProjectCalendar): string {
  if (!endDateStr) return formatDate(new Date());
  if (days <= 0) return endDateStr;

  const curr = new Date(endDateStr + 'T00:00:00');
  let guard = 3650;
  while (!isWorkingDay(formatDate(curr), calendar) && guard-- > 0) {
    curr.setDate(curr.getDate() - 1);
  }
  if (days === 1) return formatDate(curr);

  return addWorkingDaysOffset(formatDate(curr), -(days - 1), calendar);
}

/**
 * Formats dependencies into MSP/Primavera string using human-friendly row numbers.
 * e.g. "2FS+5d, 3SS-1d"
 */
export function formatPredecessors(deps: TaskDependency[], taskList?: Task[]): string {
  if (!deps || deps.length === 0) return '';
  
  // Build a lookup from task ID to row number (1-based index)
  const idToRowMap = new Map<string, number>();
  if (taskList) {
    taskList.forEach((t, i) => {
      idToRowMap.set(t.id, i + 1);
    });
  }

  return deps.map(d => {
    const rowNum = idToRowMap.get(d.taskId);
    const displayRef = rowNum !== undefined ? String(rowNum) : d.taskId;

    let lagStr = '';
    if (d.lag > 0) lagStr = `+${d.lag}d`;
    else if (d.lag < 0) lagStr = `${d.lag}d`;
    
    return `${displayRef}${d.type}${lagStr}`;
  }).join(', ');
}

/**
 * Parses predecessor string e.g. "2, 2FS, 2FS+5d, 3SS-2d, 4FF+1, 5SF" up to 10 dependencies.
 * Resolves row numbers (e.g. '2') to task IDs if taskList is provided.
 */
export function parsePredecessors(text: string, taskList?: Task[]): TaskDependency[] {
  if (!text || typeof text !== 'string') return [];
  const parts = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const result: TaskDependency[] = [];

  // Build row number (1-based) to taskId mapping
  const rowToIdMap = new Map<number, string>();
  const idSet = new Set<string>();
  if (taskList) {
    taskList.forEach((t, i) => {
      rowToIdMap.set(i + 1, t.id);
      idSet.add(t.id);
    });
  }

  for (const part of parts.slice(0, 10)) {
    // Robust 2-pass regex matching:
    // Pass 1: Explicit relationship type (FS, SS, FF, SF) e.g. "2SS-1d", "t-1FS+3d", "1.2FF"
    // Pass 2: Implicit default relationship (FS) e.g. "2", "2+5d", "1.1-2d"
    let rawRef = '';
    let type: DependencyType = 'FS';
    let lag = 0;

    const relMatch = part.match(/^(.+?)\s*(FS|SS|FF|SF)\s*([+-]\s*\d+)?\s*d?$/i);
    if (relMatch) {
      rawRef = relMatch[1].trim();
      type = (relMatch[2]?.toUpperCase() as DependencyType) || 'FS';
      lag = relMatch[3] ? parseInt(relMatch[3].replace(/\s+/g, ''), 10) : 0;
    } else {
      const simpleMatch = part.match(/^(.+?)\s*([+-]\s*\d+)?\s*d?$/i);
      if (simpleMatch) {
        rawRef = simpleMatch[1].trim();
        type = 'FS';
        lag = simpleMatch[2] ? parseInt(simpleMatch[2].replace(/\s+/g, ''), 10) : 0;
      }
    }

    if (rawRef) {
      // Determine actual taskId
      let resolvedId = rawRef;
      const parsedRowNum = parseInt(rawRef, 10);
      if (!isNaN(parsedRowNum) && rowToIdMap.has(parsedRowNum)) {
        resolvedId = rowToIdMap.get(parsedRowNum)!;
      } else if (!idSet.has(rawRef) && taskList) {
        // Check if rawRef matches wbsCode
        const matchedWBS = taskList.find(t => t.wbsCode === rawRef);
        if (matchedWBS) resolvedId = matchedWBS.id;
      }

      result.push({ taskId: resolvedId, type, lag });
    }
  }

  return result;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycleTaskIds: string[];
  cyclePathFormatted: string[];
  message: string;
}

/**
 * Validates whether proposed dependencies would create a circular dependency loop,
 * a self-dependency, or an invalid parent-child hierarchy loop.
 */
export function detectDependencyCycle(
  tasks: Task[],
  proposedChange?: {
    taskId: string;
    newPredecessors: TaskDependency[];
  }
): CycleDetectionResult {
  if (!tasks || tasks.length === 0) {
    return { hasCycle: false, cycleTaskIds: [], cyclePathFormatted: [], message: '' };
  }

  const taskMap = new Map<string, Task>();
  tasks.forEach(t => taskMap.set(t.id, t));

  // Helper to format task label
  const formatTaskLabel = (id: string): string => {
    const t = taskMap.get(id);
    if (!t) return `[${id}]`;
    const wbs = t.wbsCode ? `[${t.wbsCode}] ` : '';
    return `${wbs}"${t.name || 'Unnamed'}"`;
  };

  // Helper to check ancestor/descendant relationships
  const isAncestor = (ancestorId: string, childId: string): boolean => {
    let curr: string | null = childId;
    let guard = 500;
    while (curr && guard-- > 0) {
      const parentTask = taskMap.get(curr);
      if (!parentTask || !parentTask.parentId) break;
      if (parentTask.parentId === ancestorId) return true;
      curr = parentTask.parentId;
    }
    return false;
  };

  // 1. Check direct self-loop & hierarchy violations in proposed change
  if (proposedChange) {
    const { taskId, newPredecessors } = proposedChange;

    for (const dep of newPredecessors) {
      if (dep.taskId === taskId) {
        const label = formatTaskLabel(taskId);
        return {
          hasCycle: true,
          cycleTaskIds: [taskId, taskId],
          cyclePathFormatted: [label, label],
          message: `Self-dependency error: Task ${label} cannot depend on itself.`
        };
      }

      if (isAncestor(dep.taskId, taskId)) {
        const parentLabel = formatTaskLabel(dep.taskId);
        const childLabel = formatTaskLabel(taskId);
        return {
          hasCycle: true,
          cycleTaskIds: [dep.taskId, taskId],
          cyclePathFormatted: [parentLabel, childLabel],
          message: `Hierarchy loop: Subtask ${childLabel} cannot depend on its own parent summary task ${parentLabel}.`
        };
      }

      if (isAncestor(taskId, dep.taskId)) {
        const parentLabel = formatTaskLabel(taskId);
        const childLabel = formatTaskLabel(dep.taskId);
        return {
          hasCycle: true,
          cycleTaskIds: [taskId, dep.taskId],
          cyclePathFormatted: [parentLabel, childLabel],
          message: `Hierarchy loop: Summary task ${parentLabel} cannot depend on its own child subtask ${childLabel}.`
        };
      }
    }
  }

  // 2. Build graph: Predecessor -> Successor edges
  // If task B has predecessor A, edge goes A -> B (A precedes B).
  const graph = new Map<string, Set<string>>();
  tasks.forEach(t => graph.set(t.id, new Set<string>()));

  tasks.forEach(t => {
    const deps = (proposedChange && t.id === proposedChange.taskId)
      ? proposedChange.newPredecessors
      : (t.predecessors || []);

    deps.forEach(dep => {
      if (taskMap.has(dep.taskId)) {
        if (!graph.has(dep.taskId)) graph.set(dep.taskId, new Set());
        graph.get(dep.taskId)!.add(t.id);
      }
    });
  });

  // 3. DFS 3-color cycle detection
  // 0 = unvisited, 1 = visiting (in current stack), 2 = visited
  const state = new Map<string, number>();
  const stack: string[] = [];
  let detectedCycleIds: string[] = [];

  function dfs(u: string): boolean {
    state.set(u, 1); // visiting
    stack.push(u);

    const neighbors = graph.get(u) || new Set();
    for (const v of neighbors) {
      if (state.get(v) === 1) {
        // Cycle found! Extract cycle from stack
        const cycleStartIndex = stack.indexOf(v);
        if (cycleStartIndex !== -1) {
          detectedCycleIds = stack.slice(cycleStartIndex);
          detectedCycleIds.push(v); // close the loop
        } else {
          detectedCycleIds = [v, u, v];
        }
        return true;
      }

      if (!state.get(v)) {
        if (dfs(v)) return true;
      }
    }

    stack.pop();
    state.set(u, 2); // visited
    return false;
  }

  // If proposedChange is given, start DFS at proposed predecessor(s) or task first
  const startOrder: string[] = [];
  if (proposedChange) {
    proposedChange.newPredecessors.forEach(d => {
      if (taskMap.has(d.taskId) && !startOrder.includes(d.taskId)) {
        startOrder.push(d.taskId);
      }
    });
    if (!startOrder.includes(proposedChange.taskId)) {
      startOrder.push(proposedChange.taskId);
    }
  }
  tasks.forEach(t => {
    if (!startOrder.includes(t.id)) {
      startOrder.push(t.id);
    }
  });

  for (const nodeId of startOrder) {
    if (!state.get(nodeId)) {
      if (dfs(nodeId)) break;
    }
  }

  if (detectedCycleIds.length > 0) {
    const formattedPath = detectedCycleIds.map(id => formatTaskLabel(id));
    const pathString = formattedPath.join(' ➔ ');
    return {
      hasCycle: true,
      cycleTaskIds: detectedCycleIds,
      cyclePathFormatted: formattedPath,
      message: `Circular dependency loop detected: ${pathString}. This relationship was prevented to avoid an infinite loop.`
    };
  }

  return {
    hasCycle: false,
    cycleTaskIds: [],
    cyclePathFormatted: [],
    message: ''
  };
}

/**
 * Recalculates the entire project schedule (WBS numbering, hierarchy,
 * CPM dependency scheduling with exact lag/duration support, activity weights, and summary rollups).
 */
export function recalculateSchedule(tasks: Task[], calendar: ProjectCalendar, defaultWeightMode: WeightMode = 'duration'): Task[] {
  if (!tasks || tasks.length === 0) return [];

  // Deep clone to avoid mutating input during multi-pass resolution
  const cloned: Task[] = JSON.parse(JSON.stringify(tasks));
  const taskMap = new Map<string, Task>();
  cloned.forEach(t => taskMap.set(t.id, t));

  // 1. Build parent-child relationships and calculate WBS Codes
  const childrenMap = new Map<string | null, Task[]>();
  cloned.forEach(t => {
    const pId = t.parentId || null;
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId)!.push(t);
  });

  // Assign WBS codes recursively
  function assignWBS(parentId: string | null, prefix: string) {
    const list = childrenMap.get(parentId) || [];
    list.forEach((t, index) => {
      const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      t.wbsCode = code;
      const isParent = (childrenMap.get(t.id) || []).length > 0;
      t.isSummary = isParent;
      if (isParent) {
        assignWBS(t.id, code);
      }
    });
  }
  assignWBS(null, '');

  // 2. Schedule Forward Pass for Leaf Tasks based on Predecessors & Lags
  // Forward pass runs topologically / iteratively up to 25 passes
  const maxIterations = 25;
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    cloned.forEach(task => {
      // Summary tasks dates are computed from their children in the bottom-up step
      if (task.isSummary) return;

      let minStart = '';

      if (task.predecessors && task.predecessors.length > 0) {
        task.predecessors.forEach(dep => {
          const pred = taskMap.get(dep.taskId);
          if (!pred) return;

          let targetStart = '';

          if (dep.type === 'FS') {
            // Finish-to-Start:
            // For milestones (duration === 0 or isMilestone), they occupy 0 working days (a point in time).
            // Therefore, any linked task starts on the SAME date as the milestone unless there is a defined lag.
            // For tasks with duration > 0, base start is the next working day after the predecessor ends.
            const isPredMilestone = pred.isMilestone || pred.duration === 0;
            const baseDate = isPredMilestone ? pred.endDate : getNextWorkingDay(pred.endDate, calendar);
            targetStart = addWorkingDaysOffset(baseDate, dep.lag, calendar);
          } else if (dep.type === 'SS') {
            // Start-to-Start: Base start is the predecessor start date + lag
            targetStart = addWorkingDaysOffset(pred.startDate, dep.lag, calendar);
          } else if (dep.type === 'FF') {
            // Finish-to-Finish: Task finishes when predecessor finishes + lag
            const targetFinish = addWorkingDaysOffset(pred.endDate, dep.lag, calendar);
            // Deduct duration to find required start date
            targetStart = (task.isMilestone || task.duration === 0)
              ? targetFinish
              : addWorkingDaysOffset(targetFinish, -Math.max(0, task.duration - 1), calendar);
          } else if (dep.type === 'SF') {
            // Start-to-Finish: Task finishes when predecessor starts + lag
            const targetFinish = addWorkingDaysOffset(pred.startDate, dep.lag, calendar);
            targetStart = (task.isMilestone || task.duration === 0)
              ? targetFinish
              : addWorkingDaysOffset(targetFinish, -Math.max(0, task.duration - 1), calendar);
          }

          if (targetStart && (!minStart || targetStart > minStart)) {
            minStart = targetStart;
          }
        });
      }

      if (!minStart) minStart = task.startDate;
      if (minStart !== task.startDate) {
        task.startDate = minStart;
        if (task.isMilestone || task.duration === 0) {
          task.endDate = minStart;
        } else {
          task.endDate = addWorkingDays(minStart, task.duration, calendar);
        }
        changed = true;
      } else {
        // Ensure duration & endDate consistency
        if (task.isMilestone || task.duration === 0) {
          task.endDate = task.startDate;
        } else {
          task.endDate = addWorkingDays(task.startDate, task.duration, calendar);
        }
      }
    });

    if (!changed) break;
  }

  // 3. Bottom-Up Summary Task Rollup (Start, End, Duration, Man-Hours, Progress)
  const sortedByDepthDesc = [...cloned].sort((a, b) => {
    const depthA = a.wbsCode.split('.').length;
    const depthB = b.wbsCode.split('.').length;
    return depthB - depthA;
  });

  sortedByDepthDesc.forEach(task => {
    if (!task.isSummary) {
      task.earnedManHours = ((task.plannedManHours || 0) * (task.progress || 0)) / 100;
      task.remainingManHours = Math.max(0, (task.plannedManHours || 0) - (task.actualManHours || 0));
      return;
    }

    const children = childrenMap.get(task.id) || [];
    if (children.length === 0) return;

    let earliestStart = children[0].startDate;
    let latestEnd = children[0].endDate;

    let totalPlannedMH = 0;
    let totalActualMH = 0;
    let totalRemainingMH = 0;
    let totalEarnedMH = 0;

    children.forEach(c => {
      if (c.startDate < earliestStart) earliestStart = c.startDate;
      if (c.endDate > latestEnd) latestEnd = c.endDate;

      totalPlannedMH += c.plannedManHours || 0;
      totalActualMH += c.actualManHours || 0;
      totalRemainingMH += c.remainingManHours || 0;
      totalEarnedMH += c.earnedManHours || 0;
    });

    task.startDate = earliestStart;
    task.endDate = latestEnd;
    task.duration = countWorkingDays(earliestStart, latestEnd, calendar);

    task.plannedManHours = totalPlannedMH;
    task.actualManHours = totalActualMH;
    task.remainingManHours = totalRemainingMH;
    task.earnedManHours = totalEarnedMH;

    // 4. Activity Weight Calculation (Equal vs Duration vs Man-Hour)
    const mode = task.weightMode || defaultWeightMode;
    let baseSum = 0;

    children.forEach(c => {
      if (mode === 'equal') {
        baseSum += 1;
      } else if (mode === 'duration') {
        baseSum += Math.max(1, c.duration || 1);
      } else if (mode === 'manhour') {
        baseSum += Math.max(1, c.plannedManHours || 1);
      } else if (mode === 'manual') {
        baseSum += c.customWeight || 0;
      }
    });

    let weightedProgressSum = 0;
    children.forEach(c => {
      let w = 0;
      if (baseSum > 0) {
        if (mode === 'equal') w = (1 / baseSum) * 100;
        else if (mode === 'duration') w = (Math.max(1, c.duration || 1) / baseSum) * 100;
        else if (mode === 'manhour') w = (Math.max(1, c.plannedManHours || 1) / baseSum) * 100;
        else if (mode === 'manual') w = c.customWeight || 0;
      }
      c.weight = Math.round(w * 10) / 10;
      weightedProgressSum += (c.progress || 0) * (c.weight / 100);
    });

    task.progress = Math.min(100, Math.round(weightedProgressSum));
  });

  // 5. Critical Path Method (CPM) Backward Pass: Late Dates, Total Float, Free Float, & Critical Path
  const leafTasks = cloned.filter(t => !t.isSummary);

  // Find project finish date (max finish across leaf tasks)
  let maxProjectFinish = '';
  leafTasks.forEach(t => {
    if (!maxProjectFinish || t.endDate > maxProjectFinish) {
      maxProjectFinish = t.endDate;
    }
  });

  if (!maxProjectFinish && leafTasks.length > 0) {
    maxProjectFinish = leafTasks[0].endDate;
  }

  // Build successor map: predecessorTaskId -> list of { succId, type, lag }
  const successorsMap = new Map<string, { succId: string; type: DependencyType; lag: number }[]>();
  leafTasks.forEach(t => {
    (t.predecessors || []).forEach(dep => {
      if (!successorsMap.has(dep.taskId)) {
        successorsMap.set(dep.taskId, []);
      }
      successorsMap.get(dep.taskId)!.push({ succId: t.id, type: dep.type, lag: dep.lag });
    });
  });

  // Initialize Late Dates for leaf tasks
  leafTasks.forEach(t => {
    t.earlyStart = t.startDate;
    t.earlyFinish = t.endDate;
    t.lateFinish = maxProjectFinish;
    if (t.isMilestone || t.duration === 0) {
      t.lateStart = t.lateFinish;
    } else {
      t.lateStart = subtractWorkingDays(t.lateFinish, t.duration, calendar);
    }
  });

  // Iteratively propagate backward constraints (up to 25 iterations)
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    leafTasks.forEach(task => {
      const succList = successorsMap.get(task.id) || [];
      if (succList.length === 0) return; // Terminal tasks remain bounded by project finish

      let maxAllowedLF = maxProjectFinish;

      succList.forEach(rel => {
        const succ = taskMap.get(rel.succId);
        if (!succ || !succ.lateStart || !succ.lateFinish) return;

        let constraintLF = maxProjectFinish;

        if (rel.type === 'FS') {
          // succ.lateStart is when successor must start
          const requiredFinish = addWorkingDaysOffset(succ.lateStart, -rel.lag, calendar);
          const isTaskMilestone = task.isMilestone || task.duration === 0;
          constraintLF = isTaskMilestone ? requiredFinish : getPrevWorkingDay(requiredFinish, calendar);
        } else if (rel.type === 'SS') {
          // succ.lateStart >= pred.lateStart + lag => pred.lateStart <= succ.lateStart - lag
          const requiredLS = addWorkingDaysOffset(succ.lateStart, -rel.lag, calendar);
          constraintLF = (task.isMilestone || task.duration === 0)
            ? requiredLS
            : addWorkingDays(requiredLS, task.duration, calendar);
        } else if (rel.type === 'FF') {
          // succ.lateFinish >= pred.lateFinish + lag => pred.lateFinish <= succ.lateFinish - lag
          constraintLF = addWorkingDaysOffset(succ.lateFinish, -rel.lag, calendar);
        } else if (rel.type === 'SF') {
          // succ.lateFinish >= pred.lateStart + lag => pred.lateStart <= succ.lateFinish - lag
          const requiredLS = addWorkingDaysOffset(succ.lateFinish, -rel.lag, calendar);
          constraintLF = (task.isMilestone || task.duration === 0)
            ? requiredLS
            : addWorkingDays(requiredLS, task.duration, calendar);
        }

        if (constraintLF && constraintLF < maxAllowedLF) {
          maxAllowedLF = constraintLF;
        }
      });

      if (maxAllowedLF !== task.lateFinish) {
        task.lateFinish = maxAllowedLF;
        if (task.isMilestone || task.duration === 0) {
          task.lateStart = maxAllowedLF;
        } else {
          task.lateStart = subtractWorkingDays(maxAllowedLF, task.duration, calendar);
        }
        changed = true;
      }
    });

    if (!changed) break;
  }

  // Calculate Total Float & Free Float for leaf tasks
  let minFloat = Infinity;
  leafTasks.forEach(task => {
    if (task.lateStart && task.startDate) {
      if (task.lateStart >= task.startDate) {
        task.totalFloat = countWorkingDays(task.startDate, task.lateStart, calendar) - 1;
      } else {
        task.totalFloat = -(countWorkingDays(task.lateStart, task.startDate, calendar) - 1);
      }
    } else {
      task.totalFloat = 0;
    }

    if (task.totalFloat !== undefined && task.totalFloat < minFloat) {
      minFloat = task.totalFloat;
    }
  });

  if (minFloat === Infinity) minFloat = 0;

  // Identify Critical Path: Tasks with least / zero float
  const criticalThreshold = Math.max(0, minFloat);
  leafTasks.forEach(t => {
    t.isCritical = (t.totalFloat ?? 0) <= criticalThreshold;
  });

  // Roll up critical path and float to Summary Tasks
  sortedByDepthDesc.forEach(t => {
    if (t.isSummary) {
      const children = childrenMap.get(t.id) || [];
      t.isCritical = children.some(c => c.isCritical);
      const childFloats = children.map(c => c.totalFloat ?? 0);
      t.totalFloat = childFloats.length > 0 ? Math.min(...childFloats) : 0;
      t.earlyStart = t.startDate;
      t.earlyFinish = t.endDate;
    }
  });

  // 6. Baseline Variances & Formatted Predecessor Text
  cloned.forEach(t => {
    if (t.baselineEndDate) {
      t.baselineVarianceDays = countWorkingDays(t.baselineEndDate, t.endDate, calendar) - 1;
      if (t.endDate < t.baselineEndDate) {
        t.baselineVarianceDays = -countWorkingDays(t.endDate, t.baselineEndDate, calendar) + 1;
      }
    }
    t.predecessorText = formatPredecessors(t.predecessors, cloned);
  });

  return cloned;
}

/**
 * Calculates the depth of a task within the WBS parent-child tree.
 * Root tasks (parentId = null) have depth 0.
 */
export function getTaskDepth(task: Task, taskMap: Map<string, Task>): number {
  let depth = 0;
  let curr = task;
  const visited = new Set<string>([task.id]);
  while (curr.parentId && taskMap.has(curr.parentId)) {
    const parent = taskMap.get(curr.parentId)!;
    if (visited.has(parent.id)) break;
    visited.add(parent.id);
    depth++;
    curr = parent;
  }
  return depth;
}

/**
 * Computes the new parentId when a task is indented.
 * Standard Gantt/WBS rules (MSP / Primavera P6):
 * - A task moves 1 level deeper (+1 depth).
 * - Cannot indent if task is at index 0 or already the first child of the preceding task.
 * - If preceding task has the same depth, new parent is preceding task.
 * - If preceding task is in a deeper sub-tree, find preceding task's ancestor at current task's depth.
 *   The current task becomes a child of that ancestor (incrementing depth by exactly 1 without skipping levels).
 * Returns undefined if indentation cannot be performed.
 */
export function computeIndentParentId(tasks: Task[], taskId: string): string | null | undefined {
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx <= 0) return undefined;

  const taskMap = new Map<string, Task>();
  tasks.forEach(t => taskMap.set(t.id, t));

  const current = tasks[idx];
  const prevTask = tasks[idx - 1];

  // If prevTask is already the parent of current, current is the first child and cannot be indented further
  if (current.parentId === prevTask.id) {
    return undefined;
  }

  const currentDepth = getTaskDepth(current, taskMap);
  const prevDepth = getTaskDepth(prevTask, taskMap);

  if (prevDepth === currentDepth) {
    // Sibling: indent directly under the preceding task
    return prevTask.id;
  } else if (prevDepth > currentDepth) {
    // Preceding task is deeper in a sub-tree:
    // Move up the parent chain to find the ancestor at currentDepth
    let ancestor: Task | undefined = prevTask;
    while (ancestor && getTaskDepth(ancestor, taskMap) > currentDepth) {
      ancestor = ancestor.parentId ? taskMap.get(ancestor.parentId) : undefined;
    }
    if (ancestor) {
      return ancestor.id;
    }
    return prevTask.id;
  }

  return undefined;
}

/**
 * Computes the new parentId when a task is outdented.
 * Outdents a task to its grandparent (1 level shallower).
 * If parent is root, the task becomes a root task (parentId = null).
 * Returns undefined if task cannot be outdented (already at root level).
 */
export function computeOutdentParentId(tasks: Task[], taskId: string): string | null | undefined {
  const taskMap = new Map<string, Task>();
  tasks.forEach(t => taskMap.set(t.id, t));

  const current = taskMap.get(taskId);
  if (!current || !current.parentId) return undefined;

  const parent = taskMap.get(current.parentId);
  return parent ? (parent.parentId || null) : null;
}
