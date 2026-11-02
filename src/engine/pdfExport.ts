import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Task, ProjectSettings } from '../types/project';
import { formatDate, isWorkingDay } from './scheduler';

export interface ExportSettings {
  format: 'pdf' | 'png';
  header: 'project_name_date' | 'project_name' | 'none';
  footer: 'summary' | 'none';
  columns: 'all' | 'core' | 'name_only';
  timeline: 'zoom_fit' | 'full';
  paperSize: 'a4' | 'a3' | 'letter';
  orientation: 'landscape' | 'portrait';
  resolution: number; // 1, 2, 3
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'pdf',
  header: 'project_name_date',
  footer: 'summary',
  columns: 'core',
  timeline: 'zoom_fit',
  paperSize: 'a4',
  orientation: 'landscape',
  resolution: 2
};

/**
 * Generates an unconstrained, high-resolution printable report container
 * containing both the spreadsheet table and the full Gantt chart,
 * with continuous Month & Year header spans and crisp typography.
 */
export async function exportProjectDocument(
  tasks: Task[],
  settings: ProjectSettings,
  exportConfig: ExportSettings,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparing schedule document...');

  if (tasks.length === 0) {
    throw new Error('No tasks in project to export.');
  }

  // 1. Calculate project date range
  let minDate = tasks[0].startDate || formatDate(new Date());
  let maxDate = tasks[0].endDate || formatDate(new Date());

  tasks.forEach(t => {
    if (t.startDate && t.startDate < minDate) minDate = t.startDate;
    if (t.endDate && t.endDate > maxDate) maxDate = t.endDate;
    if (t.baselineStartDate && t.baselineStartDate < minDate) minDate = t.baselineStartDate;
    if (t.baselineEndDate && t.baselineEndDate > maxDate) maxDate = t.baselineEndDate;
  });

  const startDateObj = new Date(minDate + 'T00:00:00');
  startDateObj.setDate(startDateObj.getDate() - 5);
  const endDateObj = new Date(maxDate + 'T00:00:00');
  endDateObj.setDate(endDateObj.getDate() + 10);

  const totalDays = Math.max(14, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)));
  const minDateTime = startDateObj.getTime();

  // Day width & row height
  const dayWidth = exportConfig.timeline === 'zoom_fit' ? Math.max(18, Math.min(36, 800 / totalDays)) : 30;
  const rowHeight = 36;

  const dateToX = (dStr: string) => {
    if (!dStr) return 0;
    const diff = (new Date(dStr + 'T00:00:00').getTime() - minDateTime) / (1000 * 3600 * 24);
    return Math.max(0, diff * dayWidth);
  };

  const datesList: string[] = [];
  const curr = new Date(startDateObj);
  for (let i = 0; i < totalDays; i++) {
    datesList.push(formatDate(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // 2. Build off-screen container with cross-platform safe fonts
  const container = document.createElement('div');
  container.id = 'wbs-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = 'Arial, "Segoe UI", Helvetica, sans-serif';
  container.style.padding = '28px';
  container.style.boxSizing = 'border-box';
  container.style.lineHeight = '1.4';

  // Header HTML
  let headerHTML = '';
  if (exportConfig.header !== 'none') {
    headerHTML = `
      <div style="border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; font-family: Arial, sans-serif;">${settings.name}</h1>
          <div style="font-size: 13px; color: #64748b;">
            <span>Author: <strong style="color: #334155;">${settings.author || 'Project Scheduler'}</strong></span>
            ${exportConfig.header === 'project_name_date' ? `<span style="margin-left: 20px;">Export Date: <strong style="color: #334155;">${new Date().toLocaleDateString()}</strong></span>` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 12px; font-size: 12px;">
          <div style="background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600;">Schedule Window</div>
            <div style="font-weight: 700; color: #0f172a; font-family: monospace;">${minDate} &rarr; ${maxDate}</div>
          </div>
          <div style="background: #eef2ff; padding: 6px 12px; border-radius: 6px; border: 1px solid #c7d2fe;">
            <div style="font-size: 10px; color: #4338ca; text-transform: uppercase; font-weight: 600;">Total Activities</div>
            <div style="font-weight: 700; color: #3730a3; font-family: monospace;">${tasks.length}</div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Table Columns (Always include ID so Predecessor references 2FS, 6SS, etc. match row IDs)
  type ColDef = { key: keyof Task | 'id' | 'wbs' | 'variance'; label: string; width: number; align?: string };
  let chosenCols: ColDef[] = [];

  if (exportConfig.columns === 'name_only') {
    chosenCols = [
      { key: 'id', label: 'ID', width: 45, align: 'center' },
      { key: 'wbsCode' as any, label: 'WBS', width: 65, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: 320 }
    ];
  } else if (exportConfig.columns === 'core') {
    chosenCols = [
      { key: 'id', label: 'ID', width: 45, align: 'center' },
      { key: 'wbsCode' as any, label: 'WBS', width: 65, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: 280 },
      { key: 'duration', label: 'DUR (D)', width: 70, align: 'center' },
      { key: 'startDate', label: 'START', width: 95, align: 'center' },
      { key: 'endDate', label: 'END', width: 95, align: 'center' },
      { key: 'progress', label: 'PROG %', width: 70, align: 'center' },
      { key: 'predecessorText' as any, label: 'PREDECESSORS', width: 110, align: 'center' }
    ];
  } else {
    // All Columns
    chosenCols = [
      { key: 'id', label: 'ID', width: 40, align: 'center' },
      { key: 'wbsCode' as any, label: 'WBS', width: 60, align: 'center' },
      { key: 'name', label: 'TASK NAME', width: 240 },
      { key: 'duration', label: 'DUR', width: 55, align: 'center' },
      { key: 'startDate', label: 'START', width: 85, align: 'center' },
      { key: 'endDate', label: 'END', width: 85, align: 'center' },
      { key: 'progress', label: '%', width: 50, align: 'center' },
      { key: 'predecessorText' as any, label: 'PRED', width: 95, align: 'center' },
      { key: 'plannedManHours', label: 'PLAN MH', width: 70, align: 'right' },
      { key: 'actualManHours', label: 'ACT MH', width: 70, align: 'right' },
      { key: 'weight', label: 'WT %', width: 55, align: 'right' }
    ];
  }

  const tableWidth = chosenCols.reduce((sum, c) => sum + c.width, 0);
  const timelineWidth = totalDays * dayWidth;

  // 4. Build Table Rows HTML
  let tableRowsHTML = '';
  tasks.forEach((t, i) => {
    const isEven = i % 2 === 0;
    const depth = (t.wbsCode.match(/\./g) || []).length;
    tableRowsHTML += `
      <tr style="height: ${rowHeight}px; background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
    `;
    chosenCols.forEach(col => {
      let content = '';
      if (col.key === 'id') {
        content = `<strong style="font-family: monospace; font-size: 11px; color: #0f172a;">${i + 1}</strong>`;
      } else if (col.key === 'name') {
        const indent = depth * 14;
        let prefixIcon = '';
        if (t.isSummary) {
          prefixIcon = `<span style="display:inline-block;width:12px;height:10px;background:#1e293b;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>`;
        } else if (t.isMilestone || t.duration === 0) {
          prefixIcon = `<span style="display:inline-block;width:8px;height:8px;background:#0f172a;transform:rotate(45deg);margin-right:7px;vertical-align:middle;"></span>`;
        } else {
          prefixIcon = '';
        }

        content = `
          <div style="padding-left: ${indent}px; font-weight: ${t.isSummary ? '700' : '500'}; color: ${t.isSummary ? '#0f172a' : '#1e293b'}; font-size: 12px; line-height: 20px; white-space: nowrap;">
            ${prefixIcon}${t.name}
          </div>
        `;
      } else if (col.key === 'wbsCode') {
        content = `<span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #334155;">${t.wbsCode}</span>`;
      } else if (col.key === 'progress') {
        content = `<span style="font-weight: 700; color: #2563eb; font-size: 12px;">${t.progress}%</span>`;
      } else if (col.key === 'duration') {
        content = `<span style="font-size: 12px; font-weight: 600; color: #0f172a;">${t.duration}d</span>`;
      } else if (col.key === 'predecessorText') {
        content = `<span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #1e1b4b;">${t.predecessorText || '-'}</span>`;
      } else {
        const rawVal = (t as any)[col.key] ?? '';
        content = `<span style="font-size: 12px; color: #334155;">${rawVal}</span>`;
      }

      tableRowsHTML += `
        <td style="padding: 0 8px; vertical-align: middle; text-align: ${col.align || 'left'}; border-right: 1px solid #e2e8f0; height: ${rowHeight}px;">
          ${content}
        </td>
      `;
    });
    tableRowsHTML += `</tr>`;
  });

  // 5. Build Gantt Timeline Header HTML (Top Tier: Continuous Month & Year Blocks)
  const exportMonthSpans: Array<{ key: string; label: string; width: number }> = [];
  let curMKey = '';
  let curMLabel = '';
  let curMCount = 0;

  datesList.forEach((d) => {
    const dObj = new Date(d + 'T00:00:00');
    const key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
    const label = dObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (key === curMKey) {
      curMCount++;
    } else {
      if (curMKey) {
        exportMonthSpans.push({ key: curMKey, label: curMLabel, width: curMCount * dayWidth });
      }
      curMKey = key;
      curMLabel = label;
      curMCount = 1;
    }
  });
  if (curMKey) {
    exportMonthSpans.push({ key: curMKey, label: curMLabel, width: curMCount * dayWidth });
  }

  let monthSpansHTML = '';
  exportMonthSpans.forEach(m => {
    monthSpansHTML += `
      <div style="width: ${m.width}px; flex-shrink: 0; text-align: center; border-right: 2px solid #94a3b8; background-color: #e2e8f0; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 24px; letter-spacing: 0.5px; overflow: hidden; white-space: nowrap;">
        ${m.label}
      </div>
    `;
  });

  // Build Gantt Timeline Days Header HTML (Lower Tier)
  let timelineDaysHTML = '';
  datesList.forEach((d) => {
    const dObj = new Date(d + 'T00:00:00');
    const isNonWorking = !isWorkingDay(d, settings.calendar);
    timelineDaysHTML += `
      <div style="width: ${dayWidth}px; flex-shrink: 0; text-align: center; border-right: 1px solid #cbd5e1; background-color: ${isNonWorking ? '#e2e8f0' : '#ffffff'}; font-size: 10px; font-weight: 600; line-height: 24px; color: ${isNonWorking ? '#64748b' : '#1e293b'};">
        ${dObj.getDate()}
      </div>
    `;
  });

  // Build Gantt Task Bars HTML
  let taskBarsHTML = '';
  tasks.forEach((t, i) => {
    const startX = dateToX(t.startDate);
    const endX = dateToX(t.endDate) + dayWidth;
    const barWidth = Math.max(dayWidth, endX - startX);
    const topY = i * rowHeight + 6;

    if (t.isSummary) {
      taskBarsHTML += `
        <div style="position: absolute; left: ${startX}px; top: ${topY + 3}px; width: ${barWidth}px; height: 16px; background-color: #1e293b; border-radius: 3px;">
          <div style="width: ${t.progress}%; height: 100%; background-color: #0f172a; border-radius: 3px;"></div>
        </div>
      `;
    } else if (t.isMilestone || t.duration === 0) {
      const isCrit = !!(settings.showCriticalPath && t.isCritical);
      taskBarsHTML += `
        <div style="position: absolute; left: ${startX + dayWidth / 2 - 7}px; top: ${topY + 2}px; width: 14px; height: 14px; background-color: ${isCrit ? '#dc2626' : '#0f172a'}; transform: rotate(45deg); border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"></div>
      `;
    } else {
      const depth = (t.wbsCode.match(/\./g) || []).length;
      const isCrit = !!(settings.showCriticalPath && t.isCritical);
      const barColor = isCrit ? '#dc2626' : depth <= 1 ? '#2563eb' : depth === 2 ? '#0284c7' : '#4f46e5';
      const borderColor = isCrit ? '#b91c1c' : depth <= 1 ? '#1d4ed8' : depth === 2 ? '#0369a1' : '#4338ca';

      taskBarsHTML += `
        <div style="position: absolute; left: ${startX}px; top: ${topY + 1}px; width: ${barWidth}px; height: 20px; background-color: ${barColor}; border-radius: 4px; border: 1px solid ${borderColor}; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          <div style="width: ${t.progress}%; height: 100%; background-color: rgba(0,0,0,0.25);"></div>
        </div>
      `;
    }
  });

  // 6. Build SVG Dependency Lines for Timeline Side in PDF / Image Export
  const taskIndexMap = new Map<string, number>();
  tasks.forEach((t, i) => taskIndexMap.set(t.id, i));

  let dependencyPathsHTML = '';
  tasks.forEach((targetTask) => {
    const targetIdx = taskIndexMap.get(targetTask.id);
    if (targetIdx === undefined) return;

    (targetTask.predecessors || []).forEach((dep) => {
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

      const sourceY = sourceIdx * rowHeight + rowHeight / 2;
      const targetY = targetIdx * rowHeight + rowHeight / 2;

      let path = '';
      if (targetX >= sourceX + 10) {
        const midX = sourceX + (targetX - sourceX) / 2;
        path = `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
      } else {
        const detourY = sourceY < targetY ? sourceY + rowHeight / 2 : sourceY - rowHeight / 2;
        path = `M ${sourceX} ${sourceY} H ${sourceX + 8} V ${detourY} H ${targetX - 10} V ${targetY} H ${targetX}`;
      }

      const isCritical = !!(settings.showCriticalPath && sourceTask.isCritical && targetTask.isCritical);
      const stroke = isCritical ? '#dc2626' : '#0284c7';
      const strokeWidth = isCritical ? '1.75' : '1.25';
      const marker = isCritical ? 'url(#export-arrowhead-crit)' : 'url(#export-arrowhead)';

      dependencyPathsHTML += `
        <path
          d="${path}"
          fill="none"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
          marker-end="${marker}"
        />
      `;
    });
  });

  const svgDependencyLayerHTML = `
    <svg style="position: absolute; inset: 0; width: ${timelineWidth}px; height: ${tasks.length * rowHeight}px; pointer-events: none; z-index: 5;">
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
  `;

  // Footer HTML
  let footerHTML = '';
  if (exportConfig.footer === 'summary') {
    footerHTML = `
      <div style="margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
        <div>Generated by <strong>PMWBS</strong> — Project Scheduling & WBS Management Suite</div>
        <div>Total Project Duration: <strong>${tasks[0]?.duration || 0} Working Days</strong></div>
      </div>
    `;
  }

  // Combine full printable document markup
  container.innerHTML = `
    ${headerHTML}
    <div style="display: flex; border: 1px solid #94a3b8; border-radius: 6px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <!-- Spreadsheet Table Side -->
      <div style="width: ${tableWidth}px; flex-shrink: 0; border-right: 2px solid #64748b;">
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead>
            <tr style="height: 48px; background: #f1f5f9; border-bottom: 2px solid #94a3b8; font-size: 10px; text-transform: uppercase; color: #334155; font-weight: 700; letter-spacing: 0.5px;">
              ${chosenCols.map(c => `<th style="padding: 0 8px; vertical-align: middle; text-align: ${c.align || 'left'}; border-right: 1px solid #cbd5e1; height: 48px;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>

      <!-- Gantt Timeline Side -->
      <div style="width: ${timelineWidth}px; flex-shrink: 0; position: relative;">
        <!-- Top Tier: Month & Year Grouped Spans -->
        <div style="display: flex; height: 24px; border-bottom: 1px solid #cbd5e1; background: #e2e8f0;">
          ${monthSpansHTML}
        </div>
        <!-- Lower Tier: Days -->
        <div style="display: flex; height: 24px; border-bottom: 2px solid #94a3b8; background: #f1f5f9;">
          ${timelineDaysHTML}
        </div>

        <!-- Timeline Grid Background & Bars Area -->
        <div style="position: relative; height: ${tasks.length * rowHeight}px;">
          <!-- Vertical Day Lines -->
          <div style="display: flex; position: absolute; inset: 0; pointer-events: none;">
            ${datesList.map(d => {
              const isNonWorking = !isWorkingDay(d, settings.calendar);
              return `<div style="width: ${dayWidth}px; flex-shrink: 0; height: 100%; border-right: 1px solid #e2e8f0; background-color: ${isNonWorking ? '#f1f5f9' : '#ffffff'};"></div>`;
            }).join('')}
          </div>

          <!-- SVG Dependency Relationship Lines -->
          ${svgDependencyLayerHTML}

          <!-- Task Bars -->
          <div style="position: absolute; inset: 0; z-index: 10;">
            ${taskBarsHTML}
          </div>
        </div>
      </div>
    </div>
    ${footerHTML}
  `;

  document.body.appendChild(container);

  try {
    onProgress?.('Ensuring font rendering is complete...');
    if (document.fonts) {
      await document.fonts.ready;
    }

    onProgress?.('Rendering canvas graphics...');
    const scale = exportConfig.resolution || 2;
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: tableWidth + timelineWidth + 100
    });

    onProgress?.(`Generating ${exportConfig.format.toUpperCase()}...`);

    if (exportConfig.format === 'png') {
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${settings.name.replace(/\s+/g, '_')}_Schedule.png`;
      a.click();
    } else {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdfOrientation = exportConfig.orientation === 'portrait' ? 'p' : 'l';
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: exportConfig.paperSize
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - 16) {
        const scaleDown = (pageHeight - 16) / imgHeight;
        pdf.addImage(imgData, 'JPEG', 8, 8, imgWidth * scaleDown, imgHeight * scaleDown);
      } else {
        pdf.addImage(imgData, 'JPEG', 8, 8, imgWidth, imgHeight);
      }

      pdf.save(`${settings.name.replace(/\s+/g, '_')}_Schedule.pdf`);
    }
  } finally {
    document.body.removeChild(container);
  }
}
