import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Task, ProjectSettings } from '../types/project';
import { formatDate, isWorkingDay } from './scheduler';
import { getTheme } from '../theme/themeConfig';

export type PaperSize = 'letter' | 'tabloid' | 'legal' | 'a4' | 'a3';
export type TimelineScale = 'weeks' | 'months' | 'days' | 'none';
export type PageFitMode = 'auto' | 'single';

export interface ExportSettings {
  format: 'pdf' | 'png';
  header: 'project_name_date' | 'project_name' | 'none';
  footer: 'summary' | 'none';
  columns: 'all' | 'core' | 'name_only';
  timelineScale: TimelineScale;
  paperSize: PaperSize;
  orientation: 'landscape' | 'portrait';
  pageFit: PageFitMode;
  resolution: number; // 1, 2, 3
  taskRangeMode?: 'all' | 'custom';
  taskFromId?: number;
  taskToId?: number;
}

export const PAPER_DIMENSIONS: Record<PaperSize, { name: string; width: number; height: number; defaultRowsLandscape: number; defaultRowsPortrait: number }> = {
  letter: { name: 'Letter (8.5" x 11")', width: 215.9, height: 279.4, defaultRowsLandscape: 18, defaultRowsPortrait: 26 },
  tabloid: { name: '11x17 / Tabloid (11" x 17")', width: 279.4, height: 431.8, defaultRowsLandscape: 26, defaultRowsPortrait: 40 },
  legal: { name: 'Legal (8.5" x 14")', width: 215.9, height: 355.6, defaultRowsLandscape: 18, defaultRowsPortrait: 34 },
  a4: { name: 'A4 (210 x 297 mm)', width: 210, height: 297, defaultRowsLandscape: 17, defaultRowsPortrait: 26 },
  a3: { name: 'A3 (297 x 420 mm)', width: 297, height: 420, defaultRowsLandscape: 28, defaultRowsPortrait: 42 }
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'pdf',
  header: 'project_name_date',
  footer: 'summary',
  columns: 'core',
  timelineScale: 'weeks',
  paperSize: 'letter',
  orientation: 'landscape',
  pageFit: 'auto',
  resolution: 2,
  taskRangeMode: 'all',
  taskFromId: 1,
  taskToId: 100
};

/**
 * Exports project schedule to high-resolution vector PDF or PNG image.
 * Supports North American & International paper sizes, Weeks/Months/Days timeline scaling,
 * pure tabular export (Gantt off), and multi-page pagination.
 */
export async function exportProjectDocument(
  tasks: Task[],
  settings: ProjectSettings,
  exportConfig: ExportSettings,
  onProgress?: (status: string) => void
): Promise<void> {
  if (tasks.length === 0) {
    throw new Error('No tasks in project to export.');
  }

  // Task Range Filtering (From ID - To ID)
  let filteredTasks = tasks;
  let rangeStartNumber = 1;

  if (exportConfig.taskRangeMode === 'custom') {
    const from = Math.max(1, Math.min(exportConfig.taskFromId || 1, tasks.length));
    const to = Math.max(from, Math.min(exportConfig.taskToId || tasks.length, tasks.length));
    filteredTasks = tasks.slice(from - 1, to);
    rangeStartNumber = from;
  }

  if (filteredTasks.length === 0) {
    throw new Error('No tasks found in the specified export range.');
  }

  onProgress?.('Preparing schedule data...');

  const showGantt = exportConfig.timelineScale !== 'none';
  const paperInfo = PAPER_DIMENSIONS[exportConfig.paperSize] || PAPER_DIMENSIONS.letter;
  const isLandscape = exportConfig.orientation === 'landscape';

  // Calculate paper width and height in mm
  const pdfPageWidthMm = isLandscape ? paperInfo.height : paperInfo.width;
  const pdfPageHeightMm = isLandscape ? paperInfo.width : paperInfo.height;

  // Determine row height and pagination limits
  const rowHeight = 32;
  const baseRowsPerPage = isLandscape ? paperInfo.defaultRowsLandscape : paperInfo.defaultRowsPortrait;
  const rowsPerPage = exportConfig.pageFit === 'single' ? filteredTasks.length : Math.max(8, baseRowsPerPage);

  // 1. Column Definitions
  type ColDef = { key: keyof Task | 'id' | 'wbsCode' | 'predecessorText'; label: string; width: number; align?: string };
  let chosenCols: ColDef[] = [];

  if (exportConfig.columns === 'name_only') {
    chosenCols = [
      { key: 'id', label: 'ID', width: 45, align: 'center' },
      { key: 'wbsCode', label: 'WBS', width: 65, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: showGantt ? 300 : 650 }
    ];
  } else if (exportConfig.columns === 'core') {
    chosenCols = [
      { key: 'id', label: 'ID', width: 45, align: 'center' },
      { key: 'wbsCode', label: 'WBS', width: 65, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: showGantt ? 260 : 380 },
      { key: 'duration', label: 'DUR (D)', width: 65, align: 'center' },
      { key: 'startDate', label: 'START', width: 90, align: 'center' },
      { key: 'endDate', label: 'END', width: 90, align: 'center' },
      { key: 'progress', label: 'PROG %', width: 65, align: 'center' },
      { key: 'predecessorText', label: 'PREDECESSORS', width: showGantt ? 100 : 130, align: 'center' }
    ];
  } else {
    // All Columns (Complete 18 spreadsheet columns)
    chosenCols = [
      { key: 'id', label: '#', width: 34, align: 'center' },
      { key: 'wbsCode', label: 'WBS', width: 55, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: showGantt ? 200 : 260 },
      { key: 'duration', label: 'DUR', width: 48, align: 'center' },
      { key: 'startDate', label: 'START', width: 75, align: 'center' },
      { key: 'endDate', label: 'END', width: 75, align: 'center' },
      { key: 'progress', label: '%', width: 42, align: 'center' },
      { key: 'weight', label: 'WT %', width: 48, align: 'right' },
      { key: 'predecessorText', label: 'PRED', width: 70, align: 'center' },
      { key: 'totalFloat', label: 'FLOAT', width: 48, align: 'center' },
      { key: 'plannedManHours', label: 'PLAN MH', width: 58, align: 'right' },
      { key: 'actualManHours', label: 'ACT MH', width: 58, align: 'right' },
      { key: 'remainingManHours', label: 'REM MH', width: 58, align: 'right' },
      { key: 'earnedManHours', label: 'EARN MH', width: 58, align: 'right' },
      { key: 'baselineStartDate', label: 'BASE START', width: 75, align: 'center' },
      { key: 'baselineEndDate', label: 'BASE END', width: 75, align: 'center' },
      { key: 'baselineVarianceDays', label: 'VAR', width: 48, align: 'center' },
      { key: 'notes', label: 'NOTES', width: showGantt ? 90 : 160, align: 'left' }
    ];
  }

  const tableWidth = chosenCols.reduce((sum, c) => sum + c.width, 0);

  // 2. Timeline Scale Geometry (Weeks, Months, Days, None)
  let timelineWidth = 0;
  let topHeadersHTML = '';
  let subHeadersHTML = '';
  let gridLinesHTML = '';
  let dateToX: (dStr: string) => number = () => 0;
  let calcBarWidth: (s: string, e: string) => number = () => 0;

  if (showGantt) {
    let minDate = tasks[0].startDate || formatDate(new Date());
    let maxDate = tasks[0].endDate || formatDate(new Date());

    tasks.forEach(t => {
      if (t.startDate && t.startDate < minDate) minDate = t.startDate;
      if (t.endDate && t.endDate > maxDate) maxDate = t.endDate;
    });

    if (exportConfig.timelineScale === 'weeks') {
      // Align to starting Sunday
      const startD = new Date(minDate + 'T00:00:00');
      startD.setDate(startD.getDate() - startD.getDay());
      const endD = new Date(maxDate + 'T00:00:00');
      endD.setDate(endD.getDate() + (6 - endD.getDay()) + 7);

      const minTime = startD.getTime();
      const totalDays = Math.max(14, Math.ceil((endD.getTime() - minTime) / 86400000));
      const totalWeeks = Math.ceil(totalDays / 7);
      const weekWidth = 36;
      timelineWidth = totalWeeks * weekWidth;

      dateToX = (dStr: string) => {
        if (!dStr) return 0;
        const diff = (new Date(dStr + 'T00:00:00').getTime() - minTime) / 86400000;
        return Math.max(0, (diff / 7) * weekWidth);
      };

      calcBarWidth = (sStr: string, eStr: string) => {
        const sx = dateToX(sStr);
        const ex = dateToX(eStr) + (weekWidth / 7);
        return Math.max(8, ex - sx);
      };

      // Build weekly list
      const weeks: { label: string; monthLabel: string; monthKey: string }[] = [];
      const cur = new Date(startD);
      for (let w = 0; w < totalWeeks; w++) {
        const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = cur.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dayLabel = `${cur.getMonth() + 1}/${cur.getDate()}`;
        weeks.push({ label: dayLabel, monthLabel: mLabel, monthKey: mKey });
        cur.setDate(cur.getDate() + 7);
      }

      // Group into month spans
      const monthSpans: { label: string; width: number }[] = [];
      let cKey = '', cLabel = '', cCount = 0;
      weeks.forEach(w => {
        if (w.monthKey === cKey) {
          cCount++;
        } else {
          if (cKey) monthSpans.push({ label: cLabel, width: cCount * weekWidth });
          cKey = w.monthKey;
          cLabel = w.monthLabel;
          cCount = 1;
        }
      });
      if (cKey) monthSpans.push({ label: cLabel, width: cCount * weekWidth });

      topHeadersHTML = monthSpans.map(m => `
        <div style="width: ${m.width}px; flex-shrink: 0; text-align: center; border-right: 2px solid #94a3b8; background-color: #e2e8f0; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 24px; overflow: hidden; white-space: nowrap;">
          ${m.label}
        </div>
      `).join('');

      subHeadersHTML = weeks.map(w => `
        <div style="width: ${weekWidth}px; flex-shrink: 0; text-align: center; border-right: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 9px; font-weight: 700; color: #334155; line-height: 24px;">
          ${w.label}
        </div>
      `).join('');

      gridLinesHTML = weeks.map(() => `
        <div style="width: ${weekWidth}px; flex-shrink: 0; height: 100%; border-right: 1px solid #e2e8f0;"></div>
      `).join('');

    } else if (exportConfig.timelineScale === 'months') {
      // Monthly scale
      const startD = new Date(minDate + 'T00:00:00');
      startD.setDate(1);
      const endD = new Date(maxDate + 'T00:00:00');
      endD.setMonth(endD.getMonth() + 2, 0);

      const months: { label: string; yearLabel: string; yearKey: string; daysInMonth: number; year: number; month: number }[] = [];
      const cur = new Date(startD);
      while (cur <= endD) {
        const y = cur.getFullYear();
        const m = cur.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        months.push({
          label: cur.toLocaleString('default', { month: 'short' }),
          yearLabel: String(y),
          yearKey: String(y),
          daysInMonth,
          year: y,
          month: m
        });
        cur.setMonth(cur.getMonth() + 1, 1);
      }

      const monthWidth = 60;
      timelineWidth = months.length * monthWidth;

      const startYear = startD.getFullYear();
      const startMonth = startD.getMonth();

      dateToX = (dStr: string) => {
        if (!dStr) return 0;
        const d = new Date(dStr + 'T00:00:00');
        const mDiff = (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
        const dayFraction = (d.getDate() - 1) / 30.5;
        return Math.max(0, (mDiff + dayFraction) * monthWidth);
      };

      calcBarWidth = (sStr: string, eStr: string) => {
        const sx = dateToX(sStr);
        const ex = dateToX(eStr) + (monthWidth / 30);
        return Math.max(8, ex - sx);
      };

      // Group into year spans
      const yearSpans: { label: string; width: number }[] = [];
      let cYKey = '', cYCount = 0;
      months.forEach(m => {
        if (m.yearKey === cYKey) {
          cYCount++;
        } else {
          if (cYKey) yearSpans.push({ label: cYKey, width: cYCount * monthWidth });
          cYKey = m.yearKey;
          cYCount = 1;
        }
      });
      if (cYKey) yearSpans.push({ label: cYKey, width: cYCount * monthWidth });

      topHeadersHTML = yearSpans.map(y => `
        <div style="width: ${y.width}px; flex-shrink: 0; text-align: center; border-right: 2px solid #94a3b8; background-color: #e2e8f0; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 24px; overflow: hidden; white-space: nowrap;">
          ${y.label}
        </div>
      `).join('');

      subHeadersHTML = months.map(m => `
        <div style="width: ${monthWidth}px; flex-shrink: 0; text-align: center; border-right: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 10px; font-weight: 700; color: #334155; line-height: 24px;">
          ${m.label}
        </div>
      `).join('');

      gridLinesHTML = months.map(() => `
        <div style="width: ${monthWidth}px; flex-shrink: 0; height: 100%; border-right: 1px solid #e2e8f0;"></div>
      `).join('');

    } else {
      // Days scale (standard daily view)
      const startD = new Date(minDate + 'T00:00:00');
      startD.setDate(startD.getDate() - 4);
      const endD = new Date(maxDate + 'T00:00:00');
      endD.setDate(endD.getDate() + 8);

      const minTime = startD.getTime();
      const totalDays = Math.max(14, Math.ceil((endD.getTime() - minTime) / 86400000));
      const dayWidth = 24;
      timelineWidth = totalDays * dayWidth;

      dateToX = (dStr: string) => {
        if (!dStr) return 0;
        const diff = (new Date(dStr + 'T00:00:00').getTime() - minTime) / 86400000;
        return Math.max(0, diff * dayWidth);
      };

      calcBarWidth = (sStr: string, eStr: string) => {
        const sx = dateToX(sStr);
        const ex = dateToX(eStr) + dayWidth;
        return Math.max(dayWidth, ex - sx);
      };

      const daysList: { dateStr: string; dateNum: number; isNonWorking: boolean; monthKey: string; monthLabel: string }[] = [];
      const cur = new Date(startD);
      for (let i = 0; i < totalDays; i++) {
        const ds = formatDate(cur);
        const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = cur.toLocaleString('default', { month: 'long', year: 'numeric' });
        daysList.push({
          dateStr: ds,
          dateNum: cur.getDate(),
          isNonWorking: !isWorkingDay(ds, settings.calendar),
          monthKey: mKey,
          monthLabel: mLabel
        });
        cur.setDate(cur.getDate() + 1);
      }

      // Group into month spans
      const monthSpans: { label: string; width: number }[] = [];
      let cKey = '', cLabel = '', cCount = 0;
      daysList.forEach(d => {
        if (d.monthKey === cKey) {
          cCount++;
        } else {
          if (cKey) monthSpans.push({ label: cLabel, width: cCount * dayWidth });
          cKey = d.monthKey;
          cLabel = d.monthLabel;
          cCount = 1;
        }
      });
      if (cKey) monthSpans.push({ label: cLabel, width: cCount * dayWidth });

      topHeadersHTML = monthSpans.map(m => `
        <div style="width: ${m.width}px; flex-shrink: 0; text-align: center; border-right: 2px solid #94a3b8; background-color: #e2e8f0; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 24px; overflow: hidden; white-space: nowrap;">
          ${m.label}
        </div>
      `).join('');

      subHeadersHTML = daysList.map(d => `
        <div style="width: ${dayWidth}px; flex-shrink: 0; text-align: center; border-right: 1px solid #cbd5e1; background-color: ${d.isNonWorking ? '#e2e8f0' : '#ffffff'}; font-size: 10px; font-weight: 600; line-height: 24px; color: ${d.isNonWorking ? '#64748b' : '#1e293b'};">
          ${d.dateNum}
        </div>
      `).join('');

      gridLinesHTML = daysList.map(d => `
        <div style="width: ${dayWidth}px; flex-shrink: 0; height: 100%; border-right: 1px solid #e2e8f0; background-color: ${d.isNonWorking ? '#f1f5f9' : '#ffffff'};"></div>
      `).join('');
    }
  }

  // 3. Paginate filtered tasks into chunks
  const taskChunks: Task[][] = [];
  for (let i = 0; i < filteredTasks.length; i += rowsPerPage) {
    taskChunks.push(filteredTasks.slice(i, i + rowsPerPage));
  }
  const totalPages = Math.max(1, taskChunks.length);

  // Overall Task Lookup Map for predecessor IDs
  const globalTaskIndexMap = new Map<string, number>();
  tasks.forEach((t, i) => globalTaskIndexMap.set(t.id, i));

  // 4. Initialize jsPDF instance
  const pdfOrientation = isLandscape ? 'l' : 'p';
  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: [paperInfo.width, paperInfo.height]
  });

  const totalWidthPx = showGantt ? tableWidth + timelineWidth : tableWidth;

  // 5. Render Each Page Chunk
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageTasks = taskChunks[pageIdx];
    const pageStartIdx = pageIdx * rowsPerPage;

    onProgress?.(`Rendering page ${pageIdx + 1} of ${totalPages}...`);

    // Top Header HTML (Clean, professional engineering document header - no bubbly badge boxes)
    let headerHTML = '';
    if (exportConfig.header !== 'none') {
      headerHTML = `
        <div style="border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.2px;">${settings.name}</h1>
            <div style="font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <span>Author: <strong style="color: #334155;">${settings.author || 'Project Scheduler'}</strong></span>
              ${exportConfig.header === 'project_name_date' ? `<span style="margin-left: 16px;">Export Date: <strong style="color: #334155;">${new Date().toLocaleDateString()}</strong></span>` : ''}
              ${exportConfig.taskRangeMode === 'custom' ? `<span style="margin-left: 16px; color: #475569;">Scope: <strong>Task IDs ${exportConfig.taskFromId} – ${exportConfig.taskToId}</strong></span>` : ''}
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Schedule Start:</span> <strong style="color: #0f172a; font-family: monospace; font-size: 11px; margin-left: 6px;">${settings.startDate}</strong></div>
            <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Activities:</span> <strong style="color: #0f172a; font-family: monospace; font-size: 11px; margin-left: 6px;">${filteredTasks.length} ${filteredTasks.length !== tasks.length ? `(of ${tasks.length})` : ''}</strong></div>
            ${totalPages > 1 ? `<div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Page:</span> <strong style="color: #1e293b; font-size: 11px; margin-left: 6px;">${pageIdx + 1} of ${totalPages}</strong></div>` : ''}
          </div>
        </div>
      `;
    }

    // Table Rows HTML for this page
    let tableRowsHTML = '';
    pageTasks.forEach((t, localIdx) => {
      const globalRowIdx = rangeStartNumber + pageStartIdx + localIdx;
      const isEven = localIdx % 2 === 0;
      const depth = (t.wbsCode.match(/\./g) || []).length;

      tableRowsHTML += `<tr style="height: ${rowHeight}px; background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">`;
      chosenCols.forEach(col => {
        let content = '';
        if (col.key === 'id') {
          content = `<strong style="font-family: monospace; font-size: 11px; color: #0f172a;">${globalRowIdx}</strong>`;
        } else if (col.key === 'name') {
          const indent = depth * 14;
          let prefixIcon = '';
          if (t.isSummary) {
            prefixIcon = `<svg width="10" height="10" viewBox="0 0 10 10" style="display:inline-block;margin-right:6px;vertical-align:-1px;fill:#0f172a;"><polygon points="1,2 9,2 5,8" /></svg>`;
          } else if (t.isMilestone || t.duration === 0) {
            prefixIcon = `<svg width="9" height="9" viewBox="0 0 10 10" style="display:inline-block;margin-right:6px;vertical-align:-1px;fill:#0f172a;"><polygon points="5,0 10,5 5,10 0,5" /></svg>`;
          }
          content = `
            <div style="padding-left: ${indent}px; font-weight: ${t.isSummary ? '700' : '500'}; color: ${t.isSummary ? '#0f172a' : '#1e293b'}; font-size: 11px; line-height: 18px; white-space: nowrap;">
              ${prefixIcon}${t.name}
            </div>
          `;
        } else if (col.key === 'wbsCode') {
          content = `<span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #334155;">${t.wbsCode}</span>`;
        } else if (col.key === 'progress') {
          content = `<span style="font-weight: 700; color: #2563eb; font-size: 11px;">${t.progress}%</span>`;
        } else if (col.key === 'duration') {
          content = `<span style="font-size: 11px; font-weight: 600; color: #0f172a;">${t.duration}d</span>`;
        } else if (col.key === 'predecessorText') {
          content = `<span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #1e1b4b;">${t.predecessorText || '-'}</span>`;
        } else if (col.key === 'weight') {
          content = `<span style="font-size: 11px; color: #334155; font-family: monospace;">${(t.weight || 0).toFixed(1)}%</span>`;
        } else if (col.key === 'totalFloat') {
          content = `<span style="font-size: 11px; font-weight: 600; color: ${t.isCritical ? '#dc2626' : '#334155'}; font-family: monospace;">${t.totalFloat !== undefined ? `${t.totalFloat}d` : '-'}</span>`;
        } else if (col.key === 'plannedManHours') {
          content = `<span style="font-size: 11px; color: #334155; font-family: monospace;">${t.plannedManHours || 0}</span>`;
        } else if (col.key === 'actualManHours') {
          content = `<span style="font-size: 11px; color: #334155; font-family: monospace;">${t.actualManHours || 0}</span>`;
        } else if (col.key === 'remainingManHours') {
          const val = t.remainingManHours !== undefined ? t.remainingManHours : Math.max(0, (t.plannedManHours || 0) - (t.actualManHours || 0));
          content = `<span style="font-size: 11px; color: #334155; font-family: monospace;">${val}</span>`;
        } else if (col.key === 'earnedManHours') {
          const val = t.earnedManHours !== undefined ? t.earnedManHours : Math.round(((t.plannedManHours || 0) * (t.progress || 0)) / 100);
          content = `<span style="font-size: 11px; color: #166534; font-weight: 600; font-family: monospace;">${val}</span>`;
        } else if (col.key === 'baselineStartDate') {
          content = `<span style="font-size: 10px; color: #475569; font-family: monospace;">${t.baselineStartDate || '-'}</span>`;
        } else if (col.key === 'baselineEndDate') {
          content = `<span style="font-size: 10px; color: #475569; font-family: monospace;">${t.baselineEndDate || '-'}</span>`;
        } else if (col.key === 'baselineVarianceDays') {
          content = t.baselineVarianceDays !== undefined
            ? `<span style="font-size: 11px; font-weight: 600; color: ${t.baselineVarianceDays > 0 ? '#dc2626' : t.baselineVarianceDays < 0 ? '#16a34a' : '#334155'}; font-family: monospace;">${t.baselineVarianceDays > 0 ? `+${t.baselineVarianceDays}d` : `${t.baselineVarianceDays}d`}</span>`
            : `<span style="font-size: 11px; color: #94a3b8;">-</span>`;
        } else if (col.key === 'notes') {
          content = `<span style="font-size: 10px; color: #475569; max-width: 140px; overflow: hidden; text-overflow: ellipsis; display: block;" title="${t.notes || ''}">${t.notes || ''}</span>`;
        } else {
          const rawVal = (t as any)[col.key] ?? '';
          content = `<span style="font-size: 11px; color: #334155;">${rawVal}</span>`;
        }

        tableRowsHTML += `
          <td style="padding: 0 6px; vertical-align: middle; text-align: ${col.align || 'left'}; border-right: 1px solid #e2e8f0; height: ${rowHeight}px;">
            ${content}
          </td>
        `;
      });
      tableRowsHTML += `</tr>`;
    });

    // Gantt Task Bars for this page
    let taskBarsHTML = '';
    let dependencyPathsHTML = '';

    if (showGantt) {
      const theme = getTheme(settings.colorTheme);

      pageTasks.forEach((t, localIdx) => {
        const startX = dateToX(t.startDate);
        const barWidth = calcBarWidth(t.startDate, t.endDate);
        const topY = localIdx * rowHeight + 5;

        if (t.isSummary) {
          taskBarsHTML += `
            <div style="position: absolute; left: ${startX}px; top: ${topY + 3}px; width: ${barWidth}px; height: 14px; background-color: ${theme.summaryBar}; border-radius: 3px;">
              <div style="width: ${t.progress}%; height: 100%; background-color: ${theme.summaryBarProgress}; border-radius: 3px;"></div>
            </div>
          `;
        } else if (t.isMilestone || t.duration === 0) {
          const isCrit = !!(settings.showCriticalPath && t.isCritical);
          const mileColor = isCrit ? theme.critical : t.color ? t.color : theme.milestone;
          taskBarsHTML += `
            <div style="position: absolute; left: ${startX - 6}px; top: ${topY + 2}px; width: 12px; height: 12px; background-color: ${mileColor}; transform: rotate(45deg); border: 2px solid #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.15);"></div>
          `;
        } else {
          const isCrit = !!(settings.showCriticalPath && t.isCritical);
          const barColor = isCrit ? theme.critical : t.color ? t.color : theme.taskBar;
          const borderColor = isCrit ? (theme.criticalBorder || theme.critical) : t.color ? t.color : (theme.taskBarBorder || theme.taskBar);
          const progFill = isCrit ? 'rgba(0,0,0,0.3)' : theme.taskProgressFill;

          taskBarsHTML += `
            <div style="position: absolute; left: ${startX}px; top: ${topY + 1}px; width: ${barWidth}px; height: 18px; background-color: ${barColor}; border-radius: 3px; border: 1px solid ${borderColor}; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              <div style="width: ${t.progress}%; height: 100%; background-color: ${progFill};"></div>
            </div>
          `;
        }

        // Draw dependencies visible within this page
        (t.predecessors || []).forEach(dep => {
          const sourceGlobalIdx = globalTaskIndexMap.get(dep.taskId);
          if (sourceGlobalIdx === undefined) return;
          const sourceLocalIdx = sourceGlobalIdx - pageStartIdx;
          if (sourceLocalIdx < 0 || sourceLocalIdx >= pageTasks.length) return; // Only draw within this page

          const sourceTask = tasks[sourceGlobalIdx];
          if (!sourceTask) return;

          const sourceStartX = dateToX(sourceTask.startDate);
          const sourceBarWidth = calcBarWidth(sourceTask.startDate, sourceTask.endDate);
          const isSourceMilestone = !!(sourceTask.isMilestone || sourceTask.duration === 0);
          const sourceRightX = isSourceMilestone ? sourceStartX + 6 : sourceStartX + sourceBarWidth;
          const sourceLeftX = isSourceMilestone ? sourceStartX - 6 : sourceStartX;

          const targetStartX = dateToX(t.startDate);
          const targetBarWidth = calcBarWidth(t.startDate, t.endDate);
          const isTargetMilestone = !!(t.isMilestone || t.duration === 0);
          const targetLeftX = isTargetMilestone ? targetStartX - 6 : targetStartX;
          const targetRightX = isTargetMilestone ? targetStartX + 6 : targetStartX + targetBarWidth;

          let sourceX = sourceRightX;
          let targetX = targetLeftX;

          if (dep.type === 'SS') {
            sourceX = sourceLeftX;
            targetX = targetLeftX;
          } else if (dep.type === 'FF') {
            sourceX = sourceRightX;
            targetX = targetRightX;
          } else if (dep.type === 'SF') {
            sourceX = sourceLeftX;
            targetX = targetRightX;
          }

          const sourceY = sourceLocalIdx * rowHeight + rowHeight / 2;
          const targetY = localIdx * rowHeight + rowHeight / 2;

          let path = '';
          if (targetX >= sourceX + 6) {
            const midX = sourceX + (targetX - sourceX) / 2;
            path = `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
          } else {
            const detourY = sourceY < targetY ? sourceY + rowHeight / 2 : sourceY - rowHeight / 2;
            path = `M ${sourceX} ${sourceY} H ${sourceX + 6} V ${detourY} H ${targetX - 8} V ${targetY} H ${targetX}`;
          }

          const isCritical = !!(settings.showCriticalPath && sourceTask.isCritical && t.isCritical);
          const stroke = isCritical ? '#dc2626' : '#0284c7';
          const marker = isCritical ? 'url(#export-arrowhead-crit)' : 'url(#export-arrowhead)';

          dependencyPathsHTML += `
            <path d="${path}" fill="none" stroke="${stroke}" stroke-width="1.25" marker-end="${marker}" />
          `;
        });
      });
    }

    const svgLayerHTML = showGantt ? `
      <svg style="position: absolute; inset: 0; width: ${timelineWidth}px; height: ${pageTasks.length * rowHeight}px; pointer-events: none; z-index: 5;">
        <defs>
          <marker id="export-arrowhead" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#0284c7" />
          </marker>
          <marker id="export-arrowhead-crit" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="#dc2626" />
          </marker>
        </defs>
        ${dependencyPathsHTML}
      </svg>
    ` : '';

    // Footer HTML with Schedule Legend
    const theme = getTheme(settings.colorTheme);
    const legendHTML = `
      <div style="display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 10px; color: #334155;">
        <span style="font-weight: 700; color: #0f172a;">Legend:</span>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 10px; height: 10px; background-color: ${theme.summaryBar}; border-radius: 2px;"></div>
          <span>Summary</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 10px; height: 10px; background-color: ${theme.taskBar}; border-radius: 2px;"></div>
          <span>Task</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 8px; height: 8px; background-color: ${theme.milestone}; transform: rotate(45deg); border: 1px solid #ffffff;"></div>
          <span>Milestone</span>
        </div>
        ${settings.showCriticalPath ? `
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 10px; height: 10px; background-color: ${theme.critical}; border-radius: 2px;"></div>
          <span style="color: ${theme.critical};">Critical Path</span>
        </div>` : ''}
        ${settings.showBaseline ? `
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 5px; background-color: ${theme.baseline}; border: 1px solid ${theme.baselineBorder || theme.baseline}; border-radius: 1px;"></div>
          <span style="color: #64748b;">Baseline</span>
        </div>` : ''}
      </div>
    `;

    const footerHTML = `
      <div style="margin-top: 10px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; font-family: Arial, sans-serif;">
        ${legendHTML}
        <div style="display: flex; align-items: center; gap: 14px; font-weight: 500;">
          ${exportConfig.footer === 'summary' ? `<div>Project Duration: <strong>${tasks[0]?.duration || 0} Working Days</strong></div>` : ''}
          ${totalPages > 1 ? `<div>Page ${pageIdx + 1} of ${totalPages}</div>` : ''}
          <div>Generated by <strong>PathMaster</strong></div>
        </div>
      </div>
    `;

    // Combine page DOM container
    const pageContainer = document.createElement('div');
    pageContainer.id = `wbs-export-page-${pageIdx}`;
    pageContainer.style.position = 'fixed';
    pageContainer.style.left = '0';
    pageContainer.style.top = '0';
    pageContainer.style.zIndex = '-9999';
    pageContainer.style.pointerEvents = 'none';
    pageContainer.style.backgroundColor = '#ffffff';
    pageContainer.style.color = '#1e293b';
    pageContainer.style.fontFamily = 'Arial, "Segoe UI", Helvetica, sans-serif';
    pageContainer.style.padding = '20px';
    pageContainer.style.boxSizing = 'border-box';
    pageContainer.style.width = `${totalWidthPx + 40}px`;

    pageContainer.innerHTML = `
      ${headerHTML}
      <div style="display: flex; border: 1px solid #94a3b8; border-radius: 5px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <!-- Table Side -->
        <div style="width: ${tableWidth}px; flex-shrink: 0; ${showGantt ? 'border-right: 2px solid #64748b;' : 'width: 100%;'}">
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <thead>
              <tr style="height: 48px; background: #f1f5f9; border-bottom: 2px solid #94a3b8; font-size: 10px; text-transform: uppercase; color: #334155; font-weight: 700; letter-spacing: 0.5px;">
                ${chosenCols.map(c => `<th style="padding: 0 6px; vertical-align: middle; text-align: ${c.align || 'left'}; border-right: 1px solid #cbd5e1; height: 48px;">${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        </div>

        ${showGantt ? `
        <!-- Gantt Timeline Side -->
        <div style="width: ${timelineWidth}px; flex-shrink: 0; position: relative;">
          <!-- Top Tier -->
          <div style="display: flex; height: 24px; border-bottom: 1px solid #cbd5e1; background: #e2e8f0;">
            ${topHeadersHTML}
          </div>
          <!-- Sub Tier -->
          <div style="display: flex; height: 24px; border-bottom: 2px solid #94a3b8; background: #f1f5f9;">
            ${subHeadersHTML}
          </div>
          <!-- Grid & Bars -->
          <div style="position: relative; height: ${pageTasks.length * rowHeight}px;">
            <div style="display: flex; position: absolute; inset: 0; pointer-events: none;">
              ${gridLinesHTML}
            </div>
            ${svgLayerHTML}
            <div style="position: absolute; inset: 0; z-index: 10;">
              ${taskBarsHTML}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
      ${footerHTML}
    `;

    document.body.appendChild(pageContainer);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const scale = exportConfig.resolution || 2;
      const canvas = await html2canvas(pageContainer, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: totalWidthPx + 100
      });

      if (exportConfig.format === 'png') {
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `${settings.name.replace(/\s+/g, '_')}_Schedule${totalPages > 1 ? `_p${pageIdx + 1}` : ''}.png`;
        a.click();
        if (pageIdx === totalPages - 1 || exportConfig.pageFit === 'single') break;
      } else {
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (pageIdx > 0) {
          pdf.addPage([paperInfo.width, paperInfo.height], pdfOrientation);
        }

        const margin = 8;
        const printableWidth = pdfPageWidthMm - (margin * 2);
        const printableHeight = pdfPageHeightMm - (margin * 2);

        const imgWidth = printableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > printableHeight) {
          const scaleFactor = printableHeight / imgHeight;
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth * scaleFactor, imgHeight * scaleFactor);
        } else {
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        }
      }
    } finally {
      document.body.removeChild(pageContainer);
    }
  }

  if (exportConfig.format === 'pdf') {
    onProgress?.('Saving PDF document...');
    pdf.save(`${settings.name.replace(/\s+/g, '_')}_Schedule.pdf`);
  }
}
