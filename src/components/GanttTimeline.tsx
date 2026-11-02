import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { Task, ProjectCalendar, FontSizeOption, ZoomTier, DependencyType, ColorTheme } from '../types/project';
import { formatDate, addWorkingDays, isWorkingDay } from '../engine/scheduler';

interface GanttTimelineProps {
  tasks: Task[];
  allTasks?: Task[];
  calendar: ProjectCalendar;
  showBaseline: boolean;
  showCriticalPath?: boolean;
  showTaskLabels?: boolean;
  onUpdateTask: (taskId: string, updates: Partial<Task>, recordHistory?: boolean) => void;
  onAddDependency: (fromTaskId: string, toTaskId: string, type: DependencyType) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
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
}

/**
 * Standard, professional WBS-level color palette (supporting Classic and Site Drawing profiles).
 */
export function getTaskLevelStyle(task: Task, isCritical: boolean = false, colorTheme: ColorTheme = 'classic') {
  if (colorTheme === 'site-drawing') {
    if (isCritical) {
      return {
        bg: '#C62828', // Critical or late
        border: '#9E1C1C',
        progress: '#7E1515'
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
        bg: '#37434D', // Steel summary bar
        border: '#242C33',
        progress: '#1B2228'
      };
    }

    // Work tasks: structural blue-grey with progress fill #26465E
    return {
      bg: '#4F7A99',
      border: '#3D5E76',
      progress: '#26465E'
    };
  }

  // Classic Theme (MSP / Primavera style)
  if (isCritical) {
    return {
      bg: '#dc2626',
      border: '#b91c1c',
      progress: '#991b1b'
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
    const depth = (task.wbsCode.match(/\./g) || []).length;
    if (depth === 0) {
      return {
        bg: '#1e293b',
        border: '#0f172a',
        progress: '#0f172a'
      };
    } else {
      return {
        bg: '#334155',
        border: '#1e293b',
        progress: '#1e293b'
      };
    }
  }

  const depth = (task.wbsCode.match(/\./g) || []).length;
  if (depth <= 1) {
    return {
      bg: '#2563eb',
      border: '#1d4ed8',
      progress: '#1e40af'
    };
  } else if (depth === 2) {
    return {
      bg: '#0284c7',
      border: '#0369a1',
      progress: '#075985'
    };
  } else if (depth === 3) {
    return {
      bg: '#4f46e5',
      border: '#4338ca',
      progress: '#3730a3'
    };
  } else {
    return {
      bg: '#64748b',
      border: '#475569',
      progress: '#334155'
    };
  }
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
  onOpenPredecessorModal,
  onOpenTaskInfo,
  onContextMenu,
  onDragStart,
  fontSize = 'normal',
  zoom,
  dayWidth,
  scrollContainerRef,
  onVerticalScroll,
  colorTheme = 'classic'
}) => {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollContainerRef || internalContainerRef;
  const isSiteDrawing = colorTheme === 'site-drawing';
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
  const barHeight = fontSize === 'small' ? 18 : fontSize === 'large' ? 26 : 22;
  const headerHeight = 56;

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

    let min = tasks[0].startDate || formatDate(new Date());
    let max = tasks[0].endDate || formatDate(new Date());

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

  // Convert date string to X coordinate
  const dateToX = (dateStr: string): number => {
    if (!dateStr) return 0;
    const t = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = (t - minDateTime) / (1000 * 3600 * 24);
    return Math.max(0, diffDays * dayWidth);
  };

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

  const todayStr = formatDate(new Date());
  const todayX = dateToX(todayStr);

  return (
    <div className={`flex flex-col h-full select-none overflow-hidden border-l-2 ${
      isSiteDrawing
        ? "bg-[#FAFAF8] border-[#C9CED2] font-['Barlow_Semi_Condensed','Barlow',sans-serif]"
        : "bg-white border-slate-300"
    }`}>
      {/* Main Gantt Canvas Area */}
      <div
        ref={containerRef}
        onScroll={(e) => onVerticalScroll?.((e.target as HTMLElement).scrollTop)}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        className={`flex-1 overflow-auto relative select-none ${isSiteDrawing ? 'bg-[#FAFAF8]' : 'bg-white'}`}
      >
        <div
          style={{ width: `${totalDays * dayWidth}px`, height: `${headerHeight + tasks.length * rowHeight}px` }}
          className="relative"
        >
          {/* Header Tier 1 (Weeks/Months) & Tier 2 (Days) */}
          <div className={`sticky top-0 z-20 flex flex-col shadow-2xs ${
            isSiteDrawing ? 'bg-[#37434D] border-b border-[#C9CED2]' : 'bg-slate-100 border-b-2 border-slate-300'
          }`}>
            {/* Tier 1: Weeks or Months */}
            <div className={`flex h-7 border-b ${isSiteDrawing ? 'border-[#C9CED2] bg-[#37434D]' : 'border-slate-300 bg-slate-100'}`}>
              {topHeaderSpans.map((span) => (
                <div
                  key={span.key}
                  style={{ width: `${span.width}px` }}
                  className={`flex-shrink-0 flex items-center justify-center border-r text-xs font-bold tracking-wide px-2 ${
                    isSiteDrawing ? 'border-[#C9CED2] text-white bg-[#37434D]' : 'border-r-2 border-slate-300 text-slate-900 bg-slate-100'
                  }`}
                >
                  <span className="truncate">{span.label}</span>
                </div>
              ))}
            </div>

            {/* Tier 2: Days Header with High Contrast (or Months in Month View) */}
            <div className={`flex h-7 ${isSiteDrawing ? 'bg-[#FAFAF8]' : 'bg-slate-100'}`}>
              {zoom === 'month' && subHeaderSpans ? (
                subHeaderSpans.map((span) => (
                  <div
                    key={span.key}
                    style={{ width: `${span.width}px` }}
                    className={`flex-shrink-0 flex items-center justify-center text-xs font-bold border-r tracking-wide select-none overflow-hidden px-1 ${
                      isSiteDrawing ? 'border-[#C9CED2] bg-[#FAFAF8] text-[#37434D]' : 'border-slate-300 bg-white text-slate-800'
                    }`}
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
                      style={{ width: `${dayWidth}px` }}
                      className={`flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-r ${
                        isSiteDrawing ? 'border-[#C9CED2]' : 'border-slate-200'
                      } ${
                        isToday
                          ? isSiteDrawing ? 'bg-[#E8590C]/20 text-[#E8590C] font-black' : 'bg-indigo-100 text-indigo-900 font-black'
                          : isNonWorking
                          ? isSiteDrawing ? 'bg-[#E9ECEE] text-slate-500' : 'bg-slate-200/90 text-slate-500'
                          : isSiteDrawing ? 'text-[#37434D] bg-[#FAFAF8]' : 'text-slate-900 bg-white'
                      }`}
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
                  style={{ width: `${dayWidth}px` }}
                  className={`flex-shrink-0 h-full border-r ${
                    isSiteDrawing
                      ? isNonWorking ? 'bg-[#E9ECEE] border-[#C9CED2]/80' : 'bg-[#FAFAF8] border-[#C9CED2]/40'
                      : isNonWorking ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Today Indicator Line (Safety Orange in Site Drawing, Indigo in Classic) */}
          {todayX > 0 && todayX < totalDays * dayWidth && (
            <div
              style={{ left: `${todayX + dayWidth / 2}px` }}
              className={`absolute top-[56px] bottom-0 w-0.5 z-10 pointer-events-none ${
                isSiteDrawing ? 'bg-[#E8590C]' : 'bg-indigo-600'
              }`}
            >
              <div className={`${
                isSiteDrawing ? 'bg-[#E8590C]' : 'bg-indigo-600'
              } text-white text-[9px] px-1 rounded-sm -ml-4 font-bold shadow-xs`}>
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
            {dependencyLines.map((line) => (
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
          <div className="absolute top-[56px] left-0 right-0 z-20">
            {tasks.map((task, idx) => {
              const startX = dateToX(task.startDate);
              const endX = dateToX(task.endDate) + dayWidth;
              const barWidth = Math.max(dayWidth, endX - startX);
              const topY = idx * rowHeight;
              const isSelected = selectedTaskId === task.id;

              const hasBaseline = showBaseline && task.baselineStartDate && task.baselineEndDate;
              const bStartX = hasBaseline ? dateToX(task.baselineStartDate!) : 0;
              const bEndX = hasBaseline ? dateToX(task.baselineEndDate!) + dayWidth : 0;
              const bWidth = Math.max(dayWidth, bEndX - bStartX);

              const isTaskCrit = !!(showCriticalPath && task.isCritical);
              // Standard WBS-Level style (or Critical Red if Critical Path active)
              const style = getTaskLevelStyle(task, isTaskCrit, colorTheme);

              return (
                <div
                  key={task.id}
                  style={{ top: `${topY}px`, height: `${rowHeight}px`, maxHeight: `${rowHeight}px`, boxSizing: 'border-box' }}
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
                  className={`absolute left-0 right-0 flex items-center border-b transition-colors ${
                    isSiteDrawing
                      ? (isSelected ? 'bg-[#E8590C]/10 border-l-4 border-[#E8590C] border-b-[#C9CED2]' : 'hover:bg-[#E9ECEE]/40 border-b-[#C9CED2]')
                      : (isSelected ? 'bg-sky-100/50 border-b-slate-200' : 'hover:bg-slate-100/50 border-b-slate-200')
                  }`}
                >
                  {/* Baseline Bar (Rendered underneath) */}
                  {hasBaseline && (
                    <div
                      style={{
                        left: `${bStartX}px`,
                        width: `${bWidth}px`,
                        top: `${rowHeight - 6}px`
                      }}
                      className={`absolute h-1.5 rounded-2xs opacity-90 pointer-events-none ${
                        isSiteDrawing ? 'bg-[#9BA5AD] border border-[#7E8890]' : 'bg-amber-400 border border-amber-600'
                      }`}
                      title={`Baseline: ${task.baselineStartDate} to ${task.baselineEndDate}`}
                    />
                  )}

                  {/* Summary Task Bar (Unified Dark Slate / Charcoal Bar) */}
                  {task.isSummary ? (
                    <div
                      style={{
                        left: `${startX}px`,
                        width: `${barWidth}px`,
                        height: `${barHeight - 2}px`,
                        backgroundColor: style.bg,
                        borderColor: style.border
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenTaskInfo?.(task);
                      }}
                      className="absolute border rounded-[4px] flex items-center shadow-xs cursor-pointer group"
                    >
                      {/* Interior Progress fill */}
                      <div
                        style={{ width: `${task.progress}%`, backgroundColor: style.progress }}
                        className="h-full rounded-l-[4px]"
                      />
                      
                      {showTaskLabels && (
                        <span
                          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded shadow-2xs tabular-nums ${
                            isSiteDrawing
                              ? isTaskCrit
                                ? 'text-[#C62828] bg-[#FAFAF8] border border-[#C62828]/50'
                                : 'text-[#1E293B] bg-[#FAFAF8] border border-[#C9CED2]'
                              : isTaskCrit
                              ? 'text-red-700 bg-white border border-red-200 shadow-xs'
                              : 'text-slate-900 bg-white border border-slate-200/90 shadow-xs'
                          }`}
                        >
                          {task.name} ({task.progress}%)
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
                        className={`w-4 h-4 ${
                          isTaskCrit ? (isSiteDrawing ? 'bg-[#C62828]' : 'bg-red-600') : (isSiteDrawing ? 'bg-[#37434D]' : 'bg-slate-900')
                        } rotate-45 border-2 border-white shadow-md hover:scale-110 transition-transform relative shrink-0`}
                      >
                        {/* Milestone Connect Handles on Both Ends */}
                        <div
                          onMouseDown={(e) => handleConnectStart(e, task.id, 'start')}
                          onMouseUp={(e) => handleConnectEnd(e, task.id, 'start')}
                          className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 ${
                            isSiteDrawing ? 'border-[#E8590C]' : 'border-indigo-600'
                          } opacity-0 group-hover:opacity-100 cursor-crosshair z-20`}
                          title="Connect from Milestone (Start)"
                        />
                        <div
                          onMouseDown={(e) => handleConnectStart(e, task.id, 'finish')}
                          onMouseUp={(e) => handleConnectEnd(e, task.id, 'finish')}
                          className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 ${
                            isSiteDrawing ? 'border-[#E8590C]' : 'border-indigo-600'
                          } opacity-0 group-hover:opacity-100 cursor-crosshair z-20`}
                          title="Connect from Milestone (Finish)"
                        />
                      </div>

                      {/* Milestone Label on the Right Side (Unrotated, aligned with task bars) */}
                      {showTaskLabels && (
                        <span
                          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded shadow-2xs tabular-nums ${
                            isSiteDrawing
                              ? isTaskCrit
                                ? 'text-[#C62828] bg-[#FAFAF8] border border-[#C62828]/50'
                                : 'text-[#1E293B] bg-[#FAFAF8] border border-[#C9CED2]'
                              : isTaskCrit
                              ? 'text-red-700 bg-white border border-red-200 shadow-xs'
                              : 'text-slate-900 bg-white border border-slate-200/90 shadow-xs'
                          }`}
                        >
                          {task.name}
                          {task.baselineVarianceDays !== undefined && task.baselineVarianceDays !== 0 && (
                            <span className={`ml-1 text-[11px] font-bold ${task.baselineVarianceDays > 0 ? (isSiteDrawing ? 'text-[#C62828]' : 'text-red-600') : 'text-emerald-600'}`}>
                              {task.baselineVarianceDays > 0 ? `+${task.baselineVarianceDays}d` : `${task.baselineVarianceDays}d`}
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

                      {/* Text Label next to bar (High contrast dark or Critical Red) */}
                      {showTaskLabels && (
                        <span
                          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 text-xs font-semibold whitespace-nowrap select-none pointer-events-none z-20 px-1.5 py-0.5 rounded shadow-2xs tabular-nums ${
                            isSiteDrawing
                              ? isTaskCrit
                                ? 'text-[#C62828] font-bold bg-[#FAFAF8] border border-[#C62828]/50'
                                : 'text-[#1E293B] bg-[#FAFAF8] border border-[#C9CED2]'
                              : isTaskCrit
                              ? 'text-red-700 font-bold bg-white border border-red-200 shadow-xs'
                              : 'text-slate-900 bg-white border border-slate-200/90 shadow-xs'
                          }`}
                        >
                          {task.name} ({task.progress}%)
                          {task.baselineVarianceDays !== undefined && task.baselineVarianceDays > 0 && (
                            <span className={`ml-1 font-bold ${isSiteDrawing ? 'text-[#C62828]' : 'text-red-600'}`}>
                              +{task.baselineVarianceDays}d
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
