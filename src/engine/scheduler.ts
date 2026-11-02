import type { Task, ProjectCalendar, TaskDependency, DependencyType, WeightMode } from '../types/project';

/**
 * Checks if a given date string (YYYY-MM-DD) is a working day.
 */
export function isWorkingDay(dateStr: string, calendar: ProjectCalendar): boolean {
  if (calendar.holidays.includes(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return calendar.workingDays.includes(day);
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

  // Align to working day first
  while (!isWorkingDay(formatDate(curr), calendar)) {
    curr.setDate(curr.getDate() + (offset >= 0 ? 1 : -1));
  }

  if (offset === 0) return formatDate(curr);

  const step = offset > 0 ? 1 : -1;
  let remaining = Math.abs(offset);

  while (remaining > 0) {
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
  while (!isWorkingDay(formatDate(curr), calendar)) {
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
  while (!isWorkingDay(formatDate(curr), calendar)) {
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
  while (!isWorkingDay(formatDate(curr), calendar)) {
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
  while (!isWorkingDay(formatDate(curr), calendar)) {
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
    // Regex matches: (RowNumber or TaskID)(FS|SS|FF|SF optional)([+-]number optional)(d optional)
    // Examples: "2", "2FS", "2FS+5d", "2+5d", "2FS+5", "2SS-2d", "t-1FS+3d"
    const match = part.match(/^([A-Za-z0-9_-]+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*d?$/i);
    if (match) {
      const rawRef = match[1];
      const type = (match[2]?.toUpperCase() as DependencyType) || 'FS';
      const lag = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;

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

      let minStart = task.startDate;

      if (task.predecessors && task.predecessors.length > 0) {
        task.predecessors.forEach(dep => {
          const pred = taskMap.get(dep.taskId);
          if (!pred) return;

          let targetStart = '';

          if (dep.type === 'FS') {
            // Finish-to-Start: Base start is the next working day after predecessor ends
            const nextWorkingDay = getNextWorkingDay(pred.endDate, calendar);
            // Apply lag: dep.lag is gap in days (e.g. +5d gap)
            targetStart = addWorkingDaysOffset(nextWorkingDay, dep.lag, calendar);
          } else if (dep.type === 'SS') {
            // Start-to-Start: Base start is the predecessor start date + lag
            targetStart = addWorkingDaysOffset(pred.startDate, dep.lag, calendar);
          } else if (dep.type === 'FF') {
            // Finish-to-Finish: Task finishes when predecessor finishes + lag
            const targetFinish = addWorkingDaysOffset(pred.endDate, dep.lag, calendar);
            // Deduct duration to find required start date
            targetStart = addWorkingDaysOffset(targetFinish, -Math.max(0, task.duration - 1), calendar);
          } else if (dep.type === 'SF') {
            // Start-to-Finish: Task finishes when predecessor starts + lag
            const targetFinish = addWorkingDaysOffset(pred.startDate, dep.lag, calendar);
            targetStart = addWorkingDaysOffset(targetFinish, -Math.max(0, task.duration - 1), calendar);
          }

          if (targetStart && targetStart > minStart) {
            minStart = targetStart;
          }
        });
      }

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
          constraintLF = getPrevWorkingDay(requiredFinish, calendar);
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
