import React, { useRef, useState, useMemo } from 'react';
import type { Task, ProjectCalendar } from '../types/project';
import { formatDate, addWorkingDays } from '../engine/scheduler';

interface GanttTimelineProps {
  tasks: Task[];
  calendar: ProjectCalendar;
  showBaseline: boolean;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddDependency: (fromTaskId: string, toTaskId: string) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  onOpenPredecessorModal?: (task: Task) => void;
}

export type ZoomTier = 'day' | 'week' | 'month';

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  tasks,
  calendar,
  showBaseline,
  onUpdateTask,
  onAddDependency,
  onSelectTask,
  selectedTaskId,
  onOpenPredecessorModal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomTier>('day');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [originalStartDate, setOriginalStartDate] = useState<string>('');
  const [originalDuration, setOriginalDuration] = useState<number>(1);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Column width per day based on zoom tier
  const dayWidth = zoom === 'day' ? 36 : zoom === 'week' ? 14 : 5;
  const rowHeight = 36;
  const headerHeight = 56;

  // Calculate project timeline boundaries (min start date and max end date with padding)
  const { minDate, totalDays, datesList } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const min = formatDate(now);
      return { minDate: min, totalDays: 60, datesList: Array.from({ length: 60 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return formatDate(d);
      })};
    }

    let min = tasks[0].startDate || formatDate(new Date());
    let max = tasks[0].endDate || formatDate(new Date());

    tasks.forEach(t => {
      if (t.startDate && t.startDate < min) min = t.startDate;
      if (t.endDate && t.endDate > max) max = t.endDate;
      if (t.baselineStartDate && t.baselineStartDate < min) min = t.baselineStartDate;
      if (t.baselineEndDate && t.baselineEndDate > max) max = t.baselineEndDate;
    });

    // Add 7 days padding before and 28 days after
    const startDateObj = new Date(min + 'T00:00:00');
    startDateObj.setDate(startDateObj.getDate() - 7);
    const paddedMin = formatDate(startDateObj);

    const endDateObj = new Date(max + 'T00:00:00');
    endDateObj.setDate(endDateObj.getDate() + 28);
    
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const daysCount = Math.max(30, Math.ceil(diffTime / (1000 * 3600 * 24)));

    const dates: string[] = [];
    const curr = new Date(startDateObj);
    for (let i = 0; i < daysCount; i++) {
      dates.push(formatDate(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return { minDate: paddedMin, totalDays: daysCount, datesList: dates };
  }, [tasks]);

  const minDateTime = useMemo(() => new Date(minDate + 'T00:00:00').getTime(), [minDate]);

  // Continuous month / year header blocks spanning across all their days
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
        label = key;
      } else {
        key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
        label = dObj.toLocaleString('default', { month: 'long', year: 'numeric' });
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

  // Convert date to X coordinate
  const dateToX = (dateStr: string): number => {
    if (!dateStr) return 0;
    const t = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = (t - minDateTime) / (1000 * 3600 * 24);
    return Math.max(0, diffDays * dayWidth);
  };

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize') => {
    if (task.isSummary) return;
    e.stopPropagation();
    setDraggingTaskId(task.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setOriginalStartDate(task.startDate);
    setOriginalDuration(task.duration);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectingFromId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop
      });
    }

    if (!draggingTaskId || !dragType) return;
    const deltaX = e.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (deltaDays === 0) return;

    if (dragType === 'move') {
      const orig = new Date(originalStartDate + 'T00:00:00');
      orig.setDate(orig.getDate() + deltaDays);
      const newStart = formatDate(orig);
      const newEnd = addWorkingDays(newStart, originalDuration, calendar);
      onUpdateTask(draggingTaskId, { startDate: newStart, endDate: newEnd });
    } else if (dragType === 'resize') {
      const newDur = Math.max(1, originalDuration + deltaDays);
      const newEnd = addWorkingDays(originalStartDate, newDur, calendar);
      onUpdateTask(draggingTaskId, { duration: newDur, endDate: newEnd });
    }
  };

  const handleMouseUp = () => {
    setDraggingTaskId(null);
    setDragType(null);
    setConnectingFromId(null);
    setMousePos(null);
  };

  // Dependency Line Paths and Labels calculation
  const dependencyLines = useMemo(() => {
    const taskIndexMap = new Map<string, number>();
    tasks.forEach((t, index) => taskIndexMap.set(t.id, index));

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

    tasks.forEach((targetTask, targetIdx) => {
      if (!targetTask.predecessors) return;

      targetTask.predecessors.forEach((dep) => {
        const sourceIdx = taskIndexMap.get(dep.taskId);
        if (sourceIdx === undefined) return;
        const sourceTask = tasks[sourceIdx];

        // Anchor source point according to relationship type (FS/FF vs SS/SF)
        const sourceStarts = dep.type === 'SS' || dep.type === 'SF';
        const sourceX = sourceStarts ? dateToX(sourceTask.startDate) : dateToX(sourceTask.endDate) + dayWidth;
        const sourceY = headerHeight + sourceIdx * rowHeight + rowHeight / 2;

        // Anchor target point according to relationship type (FS/SS vs FF/SF)
        const targetEnds = dep.type === 'FF' || dep.type === 'SF';
        const targetX = targetEnds ? dateToX(targetTask.endDate) + dayWidth : dateToX(targetTask.startDate);
        const targetY = headerHeight + targetIdx * rowHeight + rowHeight / 2;

        const midX = sourceX + 16;
        let path = '';
        if (targetX >= sourceX + 24) {
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
          isCritical: !!(sourceTask.isCritical && targetTask.isCritical)
        });
      });
    });

    return lines;
  }, [tasks, minDateTime, dayWidth]);

  const todayStr = formatDate(new Date());
  const todayX = dateToX(todayStr);

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden border-l border-slate-200">
      {/* Zoom & View Control Bar */}
      <div className="h-10 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Timeline Zoom:</span>
          <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white">
            <button
              onClick={() => setZoom('day')}
              className={`px-2.5 py-1 ${zoom === 'day' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Days
            </button>
            <button
              onClick={() => setZoom('week')}
              className={`px-2.5 py-1 border-l border-slate-300 ${zoom === 'week' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Weeks
            </button>
            <button
              onClick={() => setZoom('month')}
              className={`px-2.5 py-1 border-l border-slate-300 ${zoom === 'month' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Months
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
            <span>Task</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-emerald-600 rotate-45"></div>
            <span>Milestone</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-1.5 bg-slate-900 rounded-xs"></div>
            <span>Summary</span>
          </div>
          {showBaseline && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-amber-400 border border-amber-600 rounded-xs"></div>
              <span>Baseline</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Gantt Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-auto relative bg-slate-50"
      >
        <div
          style={{ width: `${totalDays * dayWidth}px`, height: `${headerHeight + tasks.length * rowHeight}px` }}
          className="relative"
        >
          {/* Header Tier 1 (Months) & Tier 2 (Days) */}
          <div className="sticky top-0 z-20 flex flex-col bg-slate-100 border-b border-slate-300 shadow-xs">
            {/* Tier 1: Continuous Month & Year Blocks Spanning Across All Days */}
            <div className="flex h-7 border-b border-slate-300 bg-slate-200/80">
              {topHeaderSpans.map((span) => (
                <div
                  key={span.key}
                  style={{ width: `${span.width}px` }}
                  className="flex-shrink-0 flex items-center justify-center border-r border-slate-300 text-xs font-bold text-slate-800 tracking-wide px-2 bg-slate-100/90"
                >
                  <span className="truncate">{span.label}</span>
                </div>
              ))}
            </div>

            {/* Tier 2: Days Header */}
            <div className="flex h-7">
              {datesList.map((d) => {
                const dateObj = new Date(d + 'T00:00:00');
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isToday = d === todayStr;
                return (
                  <div
                    key={d}
                    style={{ width: `${dayWidth}px` }}
                    className={`flex-shrink-0 flex items-center justify-center text-[11px] font-semibold border-r border-slate-200 ${
                      isToday
                        ? 'bg-indigo-100 text-indigo-700 font-bold'
                        : isWeekend
                        ? 'bg-slate-200/60 text-slate-400'
                        : 'text-slate-700'
                    }`}
                    title={`${d} (${dateObj.toLocaleDateString(undefined, { weekday: 'short' })})`}
                  >
                    <span>{dateObj.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Background Columns */}
          <div className="absolute top-[56px] left-0 right-0 bottom-0 pointer-events-none flex">
            {datesList.map((d) => {
              const dateObj = new Date(d + 'T00:00:00');
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              return (
                <div
                  key={`bg-${d}`}
                  style={{ width: `${dayWidth}px` }}
                  className={`flex-shrink-0 h-full border-r border-slate-200/70 ${isWeekend ? 'bg-slate-100/60' : ''}`}
                />
              );
            })}
          </div>

          {/* Today Indicator Line */}
          {todayX > 0 && todayX < totalDays * dayWidth && (
            <div
              style={{ left: `${todayX + dayWidth / 2}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none shadow-sm"
            >
              <div className="bg-indigo-600 text-white text-[9px] px-1 rounded-sm -ml-4 font-bold">Today</div>
            </div>
          )}

          {/* SVG Layer for Dependency Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
              </marker>
              <marker
                id="arrowhead-critical"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
            </defs>
            {dependencyLines.map((line) => (
              <g key={line.id} className="pointer-events-auto cursor-pointer group">
                <path
                  d={line.d}
                  fill="none"
                  stroke={line.isCritical ? '#ef4444' : '#6366f1'}
                  strokeWidth={line.isCritical ? 2.5 : 1.75}
                  markerEnd={line.isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
                  className="opacity-90 group-hover:opacity-100 group-hover:stroke-indigo-800 transition-all"
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
                  stroke="#6366f1"
                  strokeWidth="1"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onOpenPredecessorModal && onOpenPredecessorModal(line.targetTask)}
                />
                <text
                  x={line.labelX}
                  y={line.labelY + 4}
                  textAnchor="middle"
                  className="text-[9px] fill-indigo-700 font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  {line.label}
                </text>
              </g>
            ))}
            {connectingFromId && mousePos && (
              <line
                x1={dateToX(tasks.find(t => t.id === connectingFromId)?.endDate || '') + dayWidth}
                y1={headerHeight + (tasks.findIndex(t => t.id === connectingFromId) * rowHeight) + rowHeight / 2}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#4f46e5"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* Task Bars Layer */}
          <div className="absolute top-[56px] left-0 right-0 z-10">
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

              return (
                <div
                  key={task.id}
                  style={{ top: `${topY}px`, height: `${rowHeight}px` }}
                  onClick={() => onSelectTask(task.id)}
                  className={`absolute left-0 right-0 flex items-center transition-colors ${
                    isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-100/50'
                  }`}
                >
                  {/* Baseline Bar (Rendered underneath) */}
                  {hasBaseline && (
                    <div
                      style={{
                        left: `${bStartX}px`,
                        width: `${bWidth}px`,
                        top: `${rowHeight - 10}px`
                      }}
                      title={`Baseline: ${task.baselineStartDate} to ${task.baselineEndDate}`}
                      className="absolute h-2 bg-amber-400 border border-amber-600/70 rounded-xs z-5 opacity-80"
                    />
                  )}

                  {/* Summary Task Bar (Bracket style) */}
                  {task.isSummary ? (
                    <div
                      style={{ left: `${startX}px`, width: `${barWidth}px` }}
                      className="absolute h-4 bg-slate-800 rounded-xs flex items-center shadow-xs cursor-pointer group"
                    >
                      <div className="absolute -left-1 top-2 w-2 h-2.5 border-l-2 border-b-2 border-slate-900 rotate-45"></div>
                      <div className="absolute -right-1 top-2 w-2 h-2.5 border-r-2 border-b-2 border-slate-900 -rotate-45"></div>
                      <div
                        style={{ width: `${task.progress}%` }}
                        className="h-full bg-slate-600/80 rounded-xs"
                      />
                      <span className="absolute left-full ml-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                        {task.name} ({task.progress}%)
                      </span>
                    </div>
                  ) : task.isMilestone || task.duration === 0 ? (
                    /* Milestone Diamond */
                    <div
                      style={{ left: `${startX + dayWidth / 2 - 8}px` }}
                      className="absolute w-4 h-4 bg-emerald-600 rotate-45 border-2 border-white shadow-md cursor-grab active:cursor-grabbing group hover:scale-110 transition-transform"
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      title={`Milestone: ${task.name} (${task.startDate})`}
                    >
                      <span className="absolute left-full ml-3 -top-1 -rotate-45 text-[11px] font-medium text-emerald-800 whitespace-nowrap">
                        {task.name}
                      </span>
                    </div>
                  ) : (
                    /* Normal Task Bar */
                    <div
                      style={{ left: `${startX}px`, width: `${barWidth}px` }}
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      className={`absolute h-6 rounded-md shadow-sm border border-indigo-700/30 flex items-center overflow-visible cursor-grab active:cursor-grabbing group ${
                        task.isCritical ? 'bg-red-500' : 'bg-indigo-500'
                      }`}
                    >
                      {/* Interior Progress fill */}
                      <div
                        style={{ width: `${task.progress}%` }}
                        className="h-full bg-black/20 rounded-l-md pointer-events-none"
                      />

                      {/* Text Label next to bar */}
                      <span className="absolute left-full ml-2 text-[11px] font-medium text-slate-700 whitespace-nowrap pointer-events-none">
                        {task.name} ({task.progress}%)
                        {task.baselineVarianceDays !== undefined && task.baselineVarianceDays > 0 && (
                          <span className="ml-1 text-red-600 font-bold">+{task.baselineVarianceDays}d</span>
                        )}
                      </span>

                      {/* Resize Handle on Right Edge */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize')}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/10 hover:bg-black/30 rounded-r-md"
                        title="Drag to resize duration"
                      />

                      {/* Dependency Connector Dot */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setConnectingFromId(task.id);
                        }}
                        onMouseUp={(e) => {
                          e.stopPropagation();
                          if (connectingFromId && connectingFromId !== task.id) {
                            onAddDependency(connectingFromId, task.id);
                          }
                          setConnectingFromId(null);
                        }}
                        className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-xs"
                        title="Drag to create dependency link"
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
