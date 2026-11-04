import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import type { Task, ProjectCalendar, FontSizeOption, ZoomTier, DependencyType, ColorTheme, FontFamilyChoice } from '../types/project';
import { formatDate, addWorkingDays, isWorkingDay } from '../engine/scheduler';
import { getTheme, type ThemeDefinition } from '../theme/themeConfig';
import { FileText } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface GanttTimelineRef {
  scrollToToday: () => void;
  scrollToTask: (taskId?: string) => { scrollTop: number; scrollLeft: number } | null;
}

interface GanttTimelineProps {
  tasks: Task[];
  allTasks?: Task[];
  calendar: ProjectCalendar;
  showBaseline: boolean;
  showCriticalPath?: boolean;
  showTaskLabels?: boolean;
  onUpdateTask: (taskId: string, updates: Partial<Task>, recordHistory?: boolean) => void;
  onAddDependency: (fromTaskId: string, toTaskId: string, type: DependencyType) => void;
  onSelectTask: (taskId: string, modifiers?: { isShift?: boolean; isCtrl?: boolean }) => void;
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onOpenPredecessorModal?: (task: Task) => void;
  onOpenTaskInfo?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onDragStart?: () => void;
  fontSize?: FontSizeOption;
  zoom: ZoomTier;
  dayWidth: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onVerticalScroll?: (scrollTop: number) => void;
  colorTheme?: ColorTheme;
  fontFamilyChoice?: FontFamilyChoice;
  customTheme?: Partial<ThemeDefinition>;
  timelineApiRef?: React.MutableRefObject<GanttTimelineRef | null>;
}

/**
 * Standard, professional WBS-level color palette powered by customizable theme profiles.
 */
export function getTaskLevelStyle(task: Task, isCritical: boolean = false, colorTheme: ColorTheme = 'steel-amber', customTheme?: Partial<ThemeDefinition>) {
  const theme = getTheme(colorTheme, undefined, customTheme);

  if (isCritical) {
    return {
      bg: theme.critical,
      border: theme.criticalBorder || theme.critical,
      progress: theme.criticalBorder || 'rgba(0,0,0,0.3)'
    };
  }

  if (task.color && !task.isSummary) {
    return {
      bg: task.color,
      border: task.color,
      progress: 'rgba(0, 0, 0, 0.25)'
    };
  }

  if (task.isSummary) {
    return {
      bg: theme.summaryBar,
      border: theme.summaryBarBorder || theme.summaryBar,
      progress: theme.summaryBarProgress
    };
  }

  return {
    bg: theme.taskBar,
    border: theme.taskBarBorder || theme.taskBar,
    progress: theme.taskProgressFill
  };
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  tasks,
  calendar,
  showBaseline,
  showCriticalPath = false,
  showTaskLabels = true,
  onUpdateTask,
  onAddDependency,
  onSelectTask,
  selectedTaskId,
  selectedTaskIds,
  onOpenPredecessorModal,
  onOpenTaskInfo,
  onContextMenu,
  onDragStart,
  fontSize = 'normal',
  zoom,
  dayWidth,
  scrollContainerRef,
  onVerticalScroll,
  colorTheme = 'steel-amber',
  fontFamilyChoice,
  timelineApiRef,
  customTheme
}) => {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollContainerRef || internalContainerRef;
  const theme = getTheme(colorTheme, fontFamilyChoice, customTheme);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [originalStartDate, setOriginalStartDate] = useState<string>('');
  const [originalDuration, setOriginalDuration] = useState<number>(1);
  const [connectingFrom, setConnectingFrom] = useState<{ taskId: string; fromEnd: 'start' | 'finish' } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    hasMoved: boolean;
  } | null>(null);

  // Height sizing derived from selected font size
  const rowHeight = fontSize === 'small' ? 30 : fontSize === 'large' ? 44 : 36;
  const barHeight = fontSize === 'small' ? 8 : fontSize === 'large' ? 13 : 10;
  const headerHeight = 56;

  // Virtualizer for high-performance timeline rendering (supports 10,000+ tasks at 60 FPS)
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Calculate project timeline boundaries
  const { minDate, totalDays, datesList } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const min = formatDate(now);
      return {
        minDate: min,
        totalDays: 60,
        datesList: Array.from({ length: 60 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          return formatDate(d);
        })
      };
    }

    const today = formatDate(new Date());
    let min = tasks[0].startDate || today;
    let max = tasks[0].endDate || today;

    if (today < min) min = today;
    if (today > max) max = today;

    tasks.forEach((t) => {
      if (t.startDate && t.startDate < min) min = t.startDate;
      if (t.endDate && t.endDate > max) max = t.endDate;
    });

    // Add padding before and after
    const minD = new Date(min + 'T00:00:00');
    minD.setDate(minD.getDate() - 7);
    const maxD = new Date(max + 'T00:00:00');
    maxD.setDate(maxD.getDate() + 21);

    const dates: string[] = [];
    const curr = new Date(minD);
    const paddedMin = formatDate(minD);

    let daysCount = 0;
    while (curr <= maxD) {
      dates.push(formatDate(curr));
      daysCount++;
      curr.setDate(curr.getDate() + 1);
    }

    return { minDate: paddedMin, totalDays: daysCount, datesList: dates };
  }, [tasks]);

  const minDateTime = useMemo(() => new Date(minDate + 'T00:00:00').getTime(), [minDate]);

  // Top Header Spans:
  // - In Month View: Grouped by Year (only the year: 2026, 2027)
  // - In Week View: Grouped by 7-day period start date (e.g. 2026-10-25)
  // - In Day View: Grouped by Month & Year (e.g. November 2026)
  const topHeaderSpans = useMemo(() => {
    const spans: Array<{ key: string; label: string; width: number }> = [];
    if (datesList.length === 0) return spans;

    let currentKey = '';
    let currentLabel = '';
    let count = 0;

    datesList.forEach((d) => {
      const dObj = new Date(d + 'T00:00:00');
      let key = '';
      let label = '';

      if (zoom === 'month') {
        key = String(dObj.getFullYear());
        label = String(dObj.getFullYear()); // Show only the year in Month view
      } else if (zoom === 'day') {
        key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
        label = dObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else {
        // Week grouping: group by Sunday/Monday of the week (7-day period) matching OnlineGantt
        const dayOfWeek = dObj.getDay(); // 0 is Sunday
        const weekStart = new Date(dObj);
        weekStart.setDate(dObj.getDate() - dayOfWeek);
        key = formatDate(weekStart);
        label = key; // "2026-10-25", "2026-11-01"
      }

      if (key === currentKey) {
        count++;
      } else {
        if (currentKey) {
          spans.push({
            key: currentKey,
            label: currentLabel,
            width: count * dayWidth
          });
        }
        currentKey = key;
        currentLabel = label;
        count = 1;
      }
    });

    if (currentKey) {
      spans.push({
        key: currentKey,
        label: currentLabel,
        width: count * dayWidth
      });
    }

    return spans;
  }, [datesList, dayWidth, zoom]);

  // Sub Header Spans for Month View:
  // Shows months (e.g. "November", "December", "January"...) instead of crammed day numbers
  const subHeaderSpans = useMemo(() => {
    if (zoom !== 'month') return null;

    const spans: Array<{ key: string; label: string; shortLabel: string; width: number }> = [];
    if (datesList.length === 0) return spans;

    let currentKey = '';
    let currentLabel = '';
    let currentShort = '';
    let count = 0;

    datesList.forEach((d) => {
      const dObj = new Date(d + 'T00:00:00');
      const key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
      const label = dObj.toLocaleString('default', { month: 'long' });
      const shortLabel = dObj.toLocaleString('default', { month: 'short' });

      if (key === currentKey) {
        count++;
      } else {
        if (currentKey) {
          spans.push({
            key: currentKey,
            label: currentLabel,
            shortLabel: currentShort,
            width: count * dayWidth
          });
        }
        currentKey = key;
        currentLabel = label;
        currentShort = shortLabel;
        count = 1;
      }
    });

    if (currentKey) {
      spans.push({
        key: currentKey,
        label: currentLabel,
        shortLabel: currentShort,
        width: count * dayWidth
      });
    }

    return spans;
  }, [datesList, dayWidth, zoom]);

  // Day-cell alignment map: ensures each bar starts at the exact beginning of day cell and ends at the exact end
  const dateIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    datesList.forEach((d, idx) => map.set(d, idx));
    return map;
  }, [datesList]);

  // Convert date string to X coordinate (exact beginning pixel of the day cell)
  const dateToX = useCallback((dateStr: string): number => {
    if (!dateStr) return 0;
    const cleanDate = dateStr.split('T')[0].split(' ')[0];
    if (dateIndexMap.has(cleanDate)) {
      return dateIndexMap.get(cleanDate)! * dayWidth;
    }
    const t = new Date(cleanDate + 'T00:00:00').getTime();
    const diffDays = Math.round((t - minDateTime) / (1000 * 3600 * 24));
    return Math.max(0, diffDays * dayWidth);
  }, [dateIndexMap, dayWidth, minDateTime]);

  // Focus chart view to Today (centers today's vertical indicator in viewport)
  const scrollToToday = useCallback(() => {
    if (!containerRef.current) return;
    const todayStr = formatDate(new Date());
    const todayX = dateToX(todayStr);
    const viewportWidth = containerRef.current.clientWidth;
    const targetScrollLeft = Math.max(0, Math.round(todayX + dayWidth / 2 - viewportWidth / 2));
    containerRef.current.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
  }, [containerRef, dateToX, dayWidth]);

  // Focus chart view to current task (horizontal bar + vertical row centering)
  const scrollToTask = useCallback((taskId?: string) => {
    if (!containerRef.current) return null;
    const idToFind = taskId || selectedTaskId;
    if (!idToFind) return null;

    const taskIndex = tasks.findIndex((t) => t.id === idToFind);
    const task = tasks[taskIndex];
    if (!task) return null;

    let targetScrollLeft = containerRef.current.scrollLeft;
    if (task.startDate) {
      const startX = dateToX(task.startDate);
      const endX = (task.endDate ? dateToX(task.endDate) : startX) + dayWidth;
      const taskWidth = endX - startX;
      const viewportWidth = containerRef.current.clientWidth;

      if (taskWidth > viewportWidth) {
        // Wide activity: align start with 40px left padding
        targetScrollLeft = Math.max(0, Math.round(startX - 40));
      } else {
        // Center task bar horizontally
        targetScrollLeft = Math.max(0, Math.round((startX + endX) / 2 - viewportWidth / 2));
      }
    }

    let targetScrollTop = containerRef.current.scrollTop;
    if (taskIndex >= 0) {
      const topY = headerHeight + taskIndex * rowHeight;
      const viewportHeight = containerRef.current.clientHeight;
      targetScrollTop = Math.max(0, Math.round(topY + rowHeight / 2 - viewportHeight / 2));
    }

    containerRef.current.scrollTo({
      left: targetScrollLeft,
      top: targetScrollTop,
      behavior: 'smooth'
    });

    return { scrollTop: targetScrollTop, scrollLeft: targetScrollLeft };
  }, [containerRef, selectedTaskId, tasks, dateToX, dayWidth, headerHeight, rowHeight]);

  useEffect(() => {
    if (timelineApiRef) {
      timelineApiRef.current = {
        scrollToToday,
        scrollToTask
      };
    }
    return () => {
      if (timelineApiRef) {
        timelineApiRef.current = null;
      }
    };
  }, [timelineApiRef, scrollToToday, scrollToTask]);

  // Canvas Panning & Dragging event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only primary (left: 0) or auxiliary (middle: 1) button
    if (e.button !== 0 && e.button !== 1) return;
    if (connectingFrom || draggingTaskId) return;

    if (containerRef.current) {
      panStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
        hasMoved: false
      };
      setIsPanning(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize') => {
    if (task.isSummary) return;
    e.stopPropagation();
    if (onDragStart) onDragStart();
    setDraggingTaskId(task.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setOriginalStartDate(task.startDate);
    setOriginalDuration(task.duration);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectingFrom && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop
      });
      return;
    }

    if (panStateRef.current && containerRef.current) {
      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        panStateRef.current.hasMoved = true;
      }
      containerRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = panStateRef.current.scrollTop - dy;
      return;
    }

    if (!draggingTaskId || !dragType) return;
    const diffPx = e.clientX - dragStartX;
    const diffDays = Math.round(diffPx / dayWidth);

    if (diffDays === 0) return;

    if (dragType === 'move') {
      const orig = new Date(originalStartDate + 'T00:00:00');
      orig.setDate(orig.getDate() + diffDays);
      const newStart = formatDate(orig);
      const newEnd = addWorkingDays(newStart, originalDuration, calendar);
      onUpdateTask(draggingTaskId, { startDate: newStart, endDate: newEnd }, false);
    } else if (dragType === 'resize') {
      const newDuration = Math.max(1, originalDuration + diffDays);
      const newEnd = addWorkingDays(originalStartDate, newDuration, calendar);
      onUpdateTask(draggingTaskId, { duration: newDuration, endDate: newEnd }, false);
    }
  };

  const handleMouseUp = () => {
    panStateRef.current = null;
    setIsPanning(false);
    setDraggingTaskId(null);
    setDragType(null);
    setConnectingFrom(null);
    setMousePos(null);
  };

  // Global window listeners so dragging/panning continues smoothly even outside the container
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (panStateRef.current && containerRef.current) {
        const dx = e.clientX - panStateRef.current.startX;
        const dy = e.clientY - panStateRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          panStateRef.current.hasMoved = true;
        }
        containerRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
        containerRef.current.scrollTop = panStateRef.current.scrollTop - dy;
      }
    };

    const handleGlobalMouseUp = () => {
      if (panStateRef.current) {
        panStateRef.current = null;
        setIsPanning(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleConnectStart = (e: React.MouseEvent, taskId: string, fromEnd: 'start' | 'finish') => {
    e.stopPropagation();
    setConnectingFrom({ taskId, fromEnd });
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop
      });
    }
  };

  const handleConnectEnd = (e: React.MouseEvent, targetTaskId: string, toEnd: 'start' | 'finish') => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom.taskId !== targetTaskId) {
      let relType: DependencyType = 'FS';
      if (connectingFrom.fromEnd === 'finish' && toEnd === 'start') {
        relType = 'FS';
      } else if (connectingFrom.fromEnd === 'start' && toEnd === 'start') {
        relType = 'SS';
      } else if (connectingFrom.fromEnd === 'finish' && toEnd === 'finish') {
        relType = 'FF';
      } else if (connectingFrom.fromEnd === 'start' && toEnd === 'finish') {
        relType = 'SF';
      }
      onAddDependency(connectingFrom.taskId, targetTaskId, relType);
    }
    setConnectingFrom(null);
    setMousePos(null);
  };

  // Compute dependency arrow lines (Clean OnlineGantt Orthogonal Routes)
  const dependencyLines = useMemo(() => {
    const lines: Array<{
      id: string;
      fromTaskId: string;
      toTaskId: string;
      sourceIdx: number;
      targetIdx: number;
      targetTask: Task;
      label: string;
      labelX: number;
      labelY: number;
      d: string;
      isCritical: boolean;
    }> = [];

    const taskIndexMap = new Map<string, number>();
    tasks.forEach((t, i) => taskIndexMap.set(t.id, i));

    tasks.forEach((targetTask) => {
      const targetIdx = taskIndexMap.get(targetTask.id);
      if (targetIdx === undefined) return;

      targetTask.predecessors.forEach((dep) => {
        const sourceIdx = taskIndexMap.get(dep.taskId);
        if (sourceIdx === undefined) return;
        const sourceTask = tasks[sourceIdx];
        if (!sourceTask) return;

        let sourceX = 0;
        let targetX = 0;

        if (dep.type === 'FS') {
          sourceX = dateToX(sourceTask.endDate) + dayWidth;
          targetX = dateToX(targetTask.startDate);
        } else if (dep.type === 'SS') {
          sourceX = dateToX(sourceTask.startDate);
          targetX = dateToX(targetTask.startDate);
        } else if (dep.type === 'FF') {
          sourceX = dateToX(sourceTask.endDate) + dayWidth;
          targetX = dateToX(targetTask.endDate) + dayWidth;
        } else if (dep.type === 'SF') {
          sourceX = dateToX(sourceTask.startDate);
          targetX = dateToX(targetTask.endDate) + dayWidth;
        }

        const sourceY = headerHeight + sourceIdx * rowHeight + rowHeight / 2;
        const targetY = headerHeight + targetIdx * rowHeight + rowHeight / 2;

        let path = '';
        if (targetX >= sourceX + 12) {
          const midX = sourceX + (targetX - sourceX) / 2;
          path = `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
        } else {
          const detourY = sourceY < targetY ? sourceY + rowHeight / 2 : sourceY - rowHeight / 2;
          path = `M ${sourceX} ${sourceY} H ${sourceX + 8} V ${detourY} H ${targetX - 12} V ${targetY} H ${targetX}`;
        }

        const lagText = dep.lag > 0 ? `+${dep.lag}d` : dep.lag < 0 ? `${dep.lag}d` : '';
        const label = `${dep.type}${lagText}`;

        lines.push({
          id: `${sourceTask.id}-${targetTask.id}-${dep.type}`,
          fromTaskId: sourceTask.id,
          toTaskId: targetTask.id,
          sourceIdx,
          targetIdx,
          targetTask,
          label,
          labelX: (sourceX + targetX) / 2,
          labelY: (sourceY + targetY) / 2,
          d: path,
          isCritical: !!(showCriticalPath && sourceTask.isCritical && targetTask.isCritical)
        });
      });
    });

    return lines;
  }, [tasks, minDateTime, dayWidth, rowHeight, showCriticalPath]);

  // Only render dependency lines crossing or within the visible window
  const visibleDependencyLines = useMemo(() => {
    if (virtualRows.length === 0) return dependencyLines;
    const minRow = Math.max(0, virtualRows[0].index - 15);
    const maxRow = Math.min(tasks.length, virtualRows[virtualRows.length - 1].index + 15);

    return dependencyLines.filter((line) => {
      const minLineIdx = Math.min(line.sourceIdx, line.targetIdx);
      const maxLineIdx = Math.max(line.sourceIdx, line.targetIdx);
      return maxLineIdx >= minRow && minLineIdx <= maxRow;
    });
  }, [dependencyLines, virtualRows, tasks.length]);

  const todayStr = formatDate(new Date());
  const todayX = dateToX(todayStr);

  return (
    <div
      style={{
        backgroundColor: theme.surfaceBg,
        borderLeftColor: theme.border,
        fontFamily: theme.fontFamily
      }}
      className="flex flex-col h-full select-none overflow-hidden border-l-2"
    >
      {/* Main Gantt Canvas Area */}
      <div
        ref={containerRef}
        onScroll={(e) => onVerticalScroll?.((e.target as HTMLElement).scrollTop)}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', backgroundColor: theme.surfaceBg }}
        className="flex-1 overflow-auto relative select-none"
      >
        <div
          style={{ width: `${totalDays * dayWidth}px`, height: `${headerHeight + tasks.length * rowHeight}px` }}
          className="relative"
        >
          {/* Header Tier 1 (Weeks/Months) & Tier 2 (Days) */}
          <div
            style={{ backgroundColor: theme.headerBg, borderBottomColor: theme.border }}
            className="sticky top-0 z-30 flex flex-col shadow-2xs border-b"
          >
            {/* Tier 1: Weeks or Months */}
            <div
              style={{ backgroundColor: theme.headerBg, borderBottomColor: theme.border }}
              className="flex h-7 border-b"
            >
              {topHeaderSpans.map((span) => (
                <div
                  key={span.key}
                  style={{ width: `${span.width}px`, borderRightColor: theme.border, color: theme.headerText }}
                  className="flex-shrink-0 flex items-center justify-center border-r text-xs font-bold tracking-wide px-2"
                >
                  <span className="truncate">{span.label}</span>
                </div>
              ))}
            </div>

            {/* Tier 2: Days Header with High Contrast (or Months in Month View) */}
            <div
              style={{ backgroundColor: theme.headerSubBg }}
              className="flex h-7"
            >
              {zoom === 'month' && subHeaderSpans ? (
                subHeaderSpans.map((span) => (
                  <div
                    key={span.key}
                    style={{ width: `${span.width}px`, borderRightColor: theme.border, color: theme.headerSubText || theme.textPrimary }}
                    className="flex-shrink-0 flex items-center justify-center text-xs font-bold border-r tracking-wide select-none overflow-hidden px-1"
                    title={span.label}
                  >
                    <span className="truncate">{span.width >= 70 ? span.label : span.shortLabel}</span>
                  </div>
                ))
              ) : (
                datesList.map((d) => {
                  const dateObj = new Date(d + 'T00:00:00');
                  const isNonWorking = !isWorkingDay(d, calendar);
                  const isToday = d === todayStr;
                  return (
                    <div
                      key={d}
                      style={{
                        width: `${dayWidth}px`,
                        borderRightColor: theme.border,
                        backgroundColor: isToday
                          ? `${theme.signal}33`
                          : isNonWorking
                          ? theme.weekendBg
                          : theme.surfaceBg,
                        color: isToday
                          ? theme.signal
                          : isNonWorking
                          ? theme.textSecondary
                          : theme.textPrimary
                      }}
                      className="flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-r"
                      title={`${d} (${dateObj.toLocaleDateString(undefined, { weekday: 'short' })}) - ${isNonWorking ? 'Non-Working' : 'Working'}`}
                    >
                      <span>{dateObj.getDate()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Grid Background Columns */}
          <div className="absolute top-[56px] left-0 right-0 bottom-0 pointer-events-none flex">
            {datesList.map((d) => {
              const isNonWorking = !isWorkingDay(d, calendar);
              return (
                <div
                  key={`bg-${d}`}
                  style={{
                    width: `${dayWidth}px`,
                    backgroundColor: isNonWorking ? theme.weekendBg : theme.surfaceBg,
                    borderRightColor: `${theme.border}80`
                  }}
                  className="flex-shrink-0 h-full border-r"
                />
              );
            })}
          </div>

          {/* Today Indicator Line */}
          {todayX >= 0 && todayX < totalDays * dayWidth && (
            <div
              style={{ left: `${todayX + dayWidth / 2}px`, backgroundColor: theme.signal }}
              className="absolute top-[56px] bottom-0 w-0.5 z-10 pointer-events-none"
            >
              <div
                style={{ backgroundColor: theme.signal }}
                className="text-white text-[9px] px-1 rounded-sm -ml-4 font-bold shadow-xs"
              >
                Today
              </div>
            </div>
          )}

          {/* SVG Layer for Dependency Lines (High Contrast Electric Blue) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker
                id="arrowhead-blue"
                markerWidth="6"
                markerHeight="5"
                refX="5"
                refY="2.5"
                orient="auto"
              >
                <polygon points="0 0, 6 2.5, 0 5" fill="#0284c7" />
              </marker>
              <marker
                id="arrowhead-critical"
                markerWidth="6"
                markerHeight="5"
                refX="5"
                refY="2.5"
                orient="auto"
              >
                <polygon points="0 0, 6 2.5, 0 5" fill="#ef4444" />
              </marker>
            </defs>
            {visibleDependencyLines.map((line) => (
              <g key={line.id} className="pointer-events-auto cursor-pointer group">
                <path
                  d={line.d}
                  fill="none"
                  stroke={line.isCritical ? '#ef4444' : '#0284c7'}
                  strokeWidth={line.isCritical ? 1.75 : 1.25}
                  markerEnd={line.isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead-blue)'}
                  className="opacity-90 group-hover:opacity-100 transition-all"
                  onClick={() => onOpenPredecessorModal && onOpenPredecessorModal(line.targetTask)}
                />
                {/* Dependency Tag badge (e.g. FS+5d) */}
                <rect
                  x={line.labelX - 18}
                  y={line.labelY - 8}
                  width="36"
                  height="16"
                  rx="4"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                  onClick={() => onOpenPredecessorModal && onOpenPredecessorModal(line.targetTask)}
                />
                <text
                  x={line.labelX}
                  y={line.labelY + 4}
                  textAnchor="middle"
                  className="text-[9px] fill-sky-800 font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  {line.label}
                </text>
              </g>
            ))}
            {connectingFrom && mousePos && (() => {
              const sourceTask = tasks.find((t) => t.id === connectingFrom.taskId);
              if (!sourceTask) return null;
              const sourceIdx = tasks.findIndex((t) => t.id === connectingFrom.taskId);
              const startX = connectingFrom.fromEnd === 'start'
                ? dateToX(sourceTask.startDate)
                : dateToX(sourceTask.endDate) + dayWidth;
              const startY = headerHeight + sourceIdx * rowHeight + rowHeight / 2;

              return (
                <line
                  x1={startX}
                  y1={startY}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              );
            })()}
          </svg>

          {/* Task Bars Layer (OnlineGantt Style) */}
          <div className="absolute top-[56px] left-0 right-0 z-10">
            {virtualRows.map((virtualRow) => {
              const task = tasks[virtualRow.index];
              const idx = virtualRow.index;
              if (!task) return null;
              const startX = dateToX(task.startDate);
              const endX = dateToX(task.endDate) + dayWidth;
              const barWidth = Math.max(dayWidth, endX - startX);
              const topY = idx * rowHeight;
              const isSelected = selectedTaskIds ? selectedTaskIds.includes(task.id) : selectedTaskId === task.id;

              const hasBaseline = showBaseline && task.baselineStartDate && task.baselineEndDate;
              const bStartX = hasBaseline ? dateToX(task.baselineStartDate!) : 0;
              const bEndX = hasBaseline ? dateToX(task.baselineEndDate!) + dayWidth : 0;
              const bWidth = Math.max(dayWidth, bEndX - bStartX);

              const isTaskCrit = !!(showCriticalPath && task.isCritical);
              // Standard WBS-Level style (or Critical Red if Critical Path active)
              const style = getTaskLevelStyle(task, isTaskCrit, colorTheme, customTheme);

              return (
                <div
                  key={task.id}
                  style={{
                    top: `${topY}px`,
                    height: `${rowHeight}px`,
                    maxHeight: `${rowHeight}px`,
                    boxSizing: 'border-box',
                    borderBottomColor: theme.border,
                    backgroundColor: isSelected ? theme.rowSelectedBg : undefined,
                    boxShadow: isSelected ? `inset 4px 0 0 ${theme.signal}` : undefined
                  }}
                  onClick={() => {
                    if (panStateRef.current?.hasMoved) return;
                    onSelectTask(task.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectTask(task.id);
                    onContextMenu?.(e, task);
                  }}
                  onDoubleClick={() => onOpenTaskInfo?.(task)}
                  className="absolute left-0 right-0 flex items-center border-b transition-colors"
                >
                  {/* Baseline Bar (Rendered underneath) */}
                  {hasBaseline && (
                    <div
                      style={{
                        left: `${bStartX}px`,
                        width: `${bWidth}px`,
                        top: `${rowHeight - 6}px`,
                        backgroundColor: theme.baseline,
                        borderColor: theme.baselineBorder || theme.baseline
                      }}
                      className="absolute h-1.5 rounded-2xs opacity-90 pointer-events-none border"
                      title={`Baseline: ${task.baselineStartDate} to ${task.baselineEndDate}`}
                    />
                  )}

                  {/* Summary Task Bar (Unified Dark Slate / Charcoal Bar) */}
                  {task.isSummary ? (
                    <div
                      style={{
                        left: `${startX}px`,
                        width: `${barWidth}px`,
                        height: '14px'
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskInfo?.(task);
                      }}
                      className="absolute flex flex-col justify-start cursor-pointer group select-none"
                      title={`Summary: ${task.name} (${task.duration}d, ${task.progress}%)`}
                    >
                      {/* Top Horizontal Roof Bar */}
                      <div
                        style={{
                          height: '7px',
                          backgroundColor: style.bg,
                          borderColor: style.border
                        }}
                        className="w-full border rounded-t-[2px] overflow-hidden relative shadow-xs"
                      >
                        {/* Interior Progress fill */}
                        <div
                          style={{ width: `${task.progress}%`, backgroundColor: style.progress }}
                          className="h-full rounded-l-[1px]"
                        />
                      </div>

                      {/* Left and Right Downward Triangular Bracket End-Caps */}
                      {(() => {
                        const triW = Math.min(9, Math.max(4, Math.floor(barWidth / 2)));
                        return (
                          <>
                            <svg
                              style={{ left: 0, top: '6px' }}
                              width={triW}
                              height="7"
                              viewBox={`0 0 ${triW} 7`}
                              className="absolute pointer-events-none drop-shadow-xs"
                            >
                              <polygon points={`0,0 ${triW},0 ${triW / 2},7`} fill={style.bg} />
                            </svg>
                            <svg
                              style={{ right: 0, top: '6px' }}
                              width={triW}
                              height="7"
                              viewBox={`0 0 ${triW} 7`}
                              className="absolute pointer-events-none drop-shadow-xs"
                            >
                              <polygon points={`0,0 ${triW},0 ${triW / 2},7`} fill={style.bg} />
                            </svg>
                          </>
                        );
                      })()}
                      
                      {showTaskLabels && (
                        <span
                          style={{
                            backgroundColor: theme.labelHaloBg,
                            borderColor: isTaskCrit ? theme.critical : theme.labelHaloBorder,
                            color: isTaskCrit ? (theme.criticalText || theme.critical) : theme.labelHaloText
                          }}
                          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded border shadow-2xs tabular-nums flex items-center space-x-1"
                        >
                          <span>{task.name} ({task.progress}%)</span>
                          {task.notes && task.notes.trim() && (
                            <span title={`Note:\n${task.notes}`} className="inline-flex items-center">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : task.isMilestone || task.duration === 0 ? (
                    /* Milestone Diamond Wrapper & Symbol */
                    <div
                      style={{
                        left: `${startX + dayWidth / 2 - 8}px`,
                        width: '16px',
                        height: `${barHeight}px`
                      }}
                      className="absolute flex items-center group cursor-grab active:cursor-grabbing select-none"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskInfo?.(task);
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      onMouseUp={(e) => {
                        if (connectingFrom && connectingFrom.taskId !== task.id) {
                          handleConnectEnd(e, task.id, 'start');
                        }
                      }}
                      title={`Milestone: ${task.name} (${task.startDate})`}
                    >
                      {/* Rotated Diamond Symbol */}
                      <div
                        style={{
                          backgroundColor: isTaskCrit ? theme.critical : theme.milestone,
                          borderColor: theme.milestoneBorder || '#FFFFFF'
                        }}
                        className="w-3.5 h-3.5 rotate-45 border-2 shadow-md hover:scale-110 transition-transform relative shrink-0"
                      >
                        {/* Milestone Connect Handles on Both Ends */}
                        <div
                          onMouseDown={(e) => handleConnectStart(e, task.id, 'start')}
                          onMouseUp={(e) => handleConnectEnd(e, task.id, 'start')}
                          className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
                          title="Connect from Milestone (Start)"
                        />
                        <div
                          onMouseDown={(e) => handleConnectStart(e, task.id, 'finish')}
                          onMouseUp={(e) => handleConnectEnd(e, task.id, 'finish')}
                          className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
                          title="Connect from Milestone (Finish)"
                        />
                      </div>

                      {/* Milestone Label on the Right Side (Unrotated, aligned with task bars) */}
                      {showTaskLabels && (
                        <span
                          style={{
                            backgroundColor: theme.labelHaloBg,
                            borderColor: isTaskCrit ? theme.critical : theme.labelHaloBorder,
                            color: isTaskCrit ? (theme.criticalText || theme.critical) : theme.labelHaloText
                          }}
                          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded border shadow-2xs tabular-nums flex items-center space-x-1"
                        >
                          <span>{task.name}</span>
                          {task.baselineVarianceDays !== undefined && task.baselineVarianceDays !== 0 && (
                            <span
                              style={{ color: task.baselineVarianceDays > 0 ? theme.critical : '#059669' }}
                              className="ml-1 text-[11px] font-bold"
                            >
                              {task.baselineVarianceDays > 0 ? `+${task.baselineVarianceDays}d` : `${task.baselineVarianceDays}d`}
                            </span>
                          )}
                          {task.notes && task.notes.trim() && (
                            <span title={`Note:\n${task.notes}`} className="inline-flex items-center ml-1">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Normal Work Activity Bar (Standard Unified Color per WBS Level) */
                    <div
                      style={{
                        left: `${startX}px`,
                        width: `${barWidth}px`,
                        height: `${barHeight}px`,
                        backgroundColor: style.bg,
                        borderColor: style.border
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskInfo?.(task);
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      onMouseUp={(e) => {
                        if (connectingFrom && connectingFrom.taskId !== task.id) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
                          handleConnectEnd(e, task.id, isLeftHalf ? 'start' : 'finish');
                        }
                      }}
                      className="absolute rounded-[4px] shadow-xs border flex items-center overflow-visible cursor-grab active:cursor-grabbing group"
                    >
                      {/* Left Connection Point (Start: SS / SF) */}
                      <div
                        onMouseDown={(e) => handleConnectStart(e, task.id, 'start')}
                        onMouseUp={(e) => handleConnectEnd(e, task.id, 'start')}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-20"
                        title="Connect from Start (SS / SF)"
                      />

                      {/* Interior Progress fill */}
                      <div
                        style={{ width: `${task.progress}%`, backgroundColor: style.progress }}
                        className="h-full rounded-l-[4px] pointer-events-none"
                      />

                      {/* Text Label next to bar */}
                      {showTaskLabels && (
                        <span
                          style={{
                            backgroundColor: theme.labelHaloBg,
                            borderColor: isTaskCrit ? theme.critical : theme.labelHaloBorder,
                            color: isTaskCrit ? (theme.criticalText || theme.critical) : theme.labelHaloText
                          }}
                          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded border shadow-2xs tabular-nums flex items-center space-x-1 ${
                            isTaskCrit ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          <span>{task.name} ({task.progress}%)</span>
                          {task.baselineVarianceDays !== undefined && task.baselineVarianceDays > 0 && (
                            <span style={{ color: theme.critical }} className="ml-1 font-bold">
                              +{task.baselineVarianceDays}d
                            </span>
                          )}
                          {task.notes && task.notes.trim() && (
                            <span title={`Note:\n${task.notes}`} className="inline-flex items-center ml-1">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </span>
                      )}

                      {/* Right Edge: Duration Resize Handle */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize')}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Drag to resize duration"
                      />

                      {/* Right Connection Point (Finish: FS / FF) */}
                      <div
                        onMouseDown={(e) => handleConnectStart(e, task.id, 'finish')}
                        onMouseUp={(e) => handleConnectEnd(e, task.id, 'finish')}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-20"
                        title="Connect from Finish (FS / FF)"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
