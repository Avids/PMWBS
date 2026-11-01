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
 * Adds working days to a start date. If days is 0 (milestone), returns startDateStr.
 */
export function addWorkingDays(startDateStr: string, days: number, calendar: ProjectCalendar): string {
  if (!startDateStr) return formatDate(new Date());
  if (days <= 0) return startDateStr;

  const curr = new Date(startDateStr + 'T00:00:00');
  let added = 0;

  // If start is non-working, move forward to first working day
  while (!isWorkingDay(formatDate(curr), calendar)) {
    curr.setDate(curr.getDate() + 1);
  }

  // Count start date as day 1
  added = 1;

  while (added < days) {
    curr.setDate(curr.getDate() + 1);
    if (isWorkingDay(formatDate(curr), calendar)) {
      added++;
    }
  }

  return formatDate(curr);
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
 * Formats dependencies into MSP/Primavera string e.g. "2FS, 3SS+2d"
 */
export function formatPredecessors(deps: TaskDependency[]): string {
  if (!deps || deps.length === 0) return '';
  return deps.map(d => {
    let lagStr = '';
    if (d.lag > 0) lagStr = `+${d.lag}d`;
    else if (d.lag < 0) lagStr = `${d.lag}d`;
    return `${d.taskId}${d.type}${lagStr}`;
  }).join(', ');
}

/**
 * Parses predecessor string e.g. "2, 3FS, 4SS+2d, 5FF-1" up to 10 dependencies.
 */
export function parsePredecessors(text: string): TaskDependency[] {
  if (!text || typeof text !== 'string') return [];
  const parts = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const result: TaskDependency[] = [];

  for (const part of parts.slice(0, 10)) {
    // Regex matches: (ID)(FS|SS|FF|SF optional)(+lag | -lag optional)
    const match = part.match(/^([A-Za-z0-9_-]+)(FS|SS|FF|SF)?([+-]\d+)?d?$/i);
    if (match) {
      const taskId = match[1];
      const type = (match[2]?.toUpperCase() as DependencyType) || 'FS';
      const lag = match[3] ? parseInt(match[3], 10) : 0;
      result.push({ taskId, type, lag });
    }
  }

  return result;
}

/**
 * Recalculates the entire project schedule (WBS numbering, hierarchy,
 * CPM dependency scheduling, activity weights, and summary rollups).
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

  // 2. Schedule Forward Pass for Leaf Tasks based on Predecessors
  // Perform multiple passes (topological / relaxed) to resolve chain dependencies
  const maxIterations = 20;
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

          let targetDate = '';
          if (dep.type === 'FS') {
            const nextDay = getNextWorkingDay(pred.endDate, calendar);
            targetDate = dep.lag !== 0 ? addWorkingDays(nextDay, Math.max(1, 1 + dep.lag), calendar) : nextDay;
          } else if (dep.type === 'SS') {
            targetDate = dep.lag !== 0 ? addWorkingDays(pred.startDate, Math.max(1, 1 + dep.lag), calendar) : pred.startDate;
          } else if (dep.type === 'FF') {
            // Target end date, back-calculate start
            const targetEnd = dep.lag !== 0 ? addWorkingDays(pred.endDate, Math.max(1, 1 + dep.lag), calendar) : pred.endDate;
            if (targetEnd > task.endDate) {
              const diffDays = countWorkingDays(task.startDate, targetEnd, calendar);
              targetDate = addWorkingDays(task.startDate, Math.max(0, diffDays - task.duration), calendar);
            }
          }

          if (targetDate && targetDate > minStart) {
            minStart = targetDate;
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
  // Process deepest nodes first by sorting descending by WBS depth
  const sortedByDepthDesc = [...cloned].sort((a, b) => {
    const depthA = a.wbsCode.split('.').length;
    const depthB = b.wbsCode.split('.').length;
    return depthB - depthA;
  });

  sortedByDepthDesc.forEach(task => {
    if (!task.isSummary) {
      // Calculate earned man-hours for leaf tasks
      task.earnedManHours = ((task.plannedManHours || 0) * (task.progress || 0)) / 100;
      task.remainingManHours = Math.max(0, (task.plannedManHours || 0) - (task.actualManHours || 0));
      return;
    }

    const children = childrenMap.get(task.id) || [];
    if (children.length === 0) return;

    // Rollup Dates
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

  // 5. Baseline Variances & Float
  cloned.forEach(t => {
    if (t.baselineEndDate) {
      t.baselineVarianceDays = countWorkingDays(t.baselineEndDate, t.endDate, calendar) - 1;
      if (t.endDate < t.baselineEndDate) {
        t.baselineVarianceDays = -countWorkingDays(t.endDate, t.baselineEndDate, calendar) + 1;
      }
    }
    t.predecessorText = formatPredecessors(t.predecessors);
  });

  return cloned;
}
