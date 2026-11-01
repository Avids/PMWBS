import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Task, ProjectSettings } from '../types/project';
import { formatDate } from './scheduler';

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
 * then converts it into a PDF or PNG download.
 */
export async function exportProjectDocument(
  tasks: Task[],
  settings: ProjectSettings,
  exportConfig: ExportSettings,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparing schedule document...');

  // 1. Calculate project date range
  if (tasks.length === 0) {
    throw new Error('No tasks in project to export.');
  }

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

  // Column day width for export
  const dayWidth = exportConfig.timeline === 'zoom_fit' ? Math.max(16, Math.min(32, 800 / totalDays)) : 28;
  const rowHeight = 32;

  // Date conversion helpers
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

  // 2. Build off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1400px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  // Header HTML
  let headerHTML = '';
  if (exportConfig.header !== 'none') {
    headerHTML = `
      <div style="border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${settings.name}</h1>
          <div style="font-size: 12px; color: #64748b;">
            <span>Author: <strong>${settings.author || 'Project Lead'}</strong></span>
            ${exportConfig.header === 'project_name_date' ? `<span style="margin-left: 16px;">Export Date: <strong>${new Date().toLocaleDateString()}</strong></span>` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 16px; font-size: 11px; color: #334155;">
          <div style="background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">Date Range</div>
            <div style="font-weight: 700; font-family: monospace;">${minDate} → ${maxDate}</div>
          </div>
          <div style="background: #e0e7ff; padding: 6px 10px; border-radius: 6px; border: 1px solid #c7d2fe;">
            <div style="font-size: 9px; color: #4338ca; text-transform: uppercase; font-weight: 600;">Total Tasks</div>
            <div style="font-weight: 700; color: #3730a3; font-family: monospace;">${tasks.length}</div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Table Column definitions based on user selection
  type ColDef = { key: keyof Task | 'wbs' | 'variance'; label: string; width: number; align?: string };
  let chosenCols: ColDef[] = [];

  if (exportConfig.columns === 'name_only') {
    chosenCols = [
      { key: 'wbsCode' as any, label: 'WBS', width: 60 },
      { key: 'name', label: 'Task Name', width: 220 }
    ];
  } else if (exportConfig.columns === 'core') {
    chosenCols = [
      { key: 'wbsCode' as any, label: 'WBS', width: 55 },
      { key: 'name', label: 'Task Name', width: 190 },
      { key: 'duration', label: 'Dur (d)', width: 60, align: 'center' },
      { key: 'startDate', label: 'Start', width: 85 },
      { key: 'endDate', label: 'End', width: 85 },
      { key: 'progress', label: 'Prog %', width: 65, align: 'center' },
      { key: 'predecessorText' as any, label: 'Predecessors', width: 95 }
    ];
  } else {
    // All Columns
    chosenCols = [
      { key: 'wbsCode' as any, label: 'WBS', width: 55 },
      { key: 'name', label: 'Task Name', width: 160 },
      { key: 'duration', label: 'Dur', width: 50, align: 'center' },
      { key: 'startDate', label: 'Start', width: 80 },
      { key: 'endDate', label: 'End', width: 80 },
      { key: 'progress', label: '%', width: 45, align: 'center' },
      { key: 'predecessorText' as any, label: 'Pred', width: 85 },
      { key: 'plannedManHours', label: 'Plan MH', width: 60, align: 'right' },
      { key: 'actualManHours', label: 'Act MH', width: 60, align: 'right' },
      { key: 'weight', label: 'Wt %', width: 50, align: 'right' }
    ];
  }

  const tableWidth = chosenCols.reduce((sum, c) => sum + c.width, 0);
  const timelineWidth = totalDays * dayWidth;

  // 4. Build Table Rows HTML
  let tableRowsHTML = '';
  tasks.forEach((t, i) => {
    const isEven = i % 2 === 0;
    const depth = (t.wbsCode.match(/\./g) || []).length;
    tableRowsHTML += `<tr style="height: ${rowHeight}px; background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0; font-size: 11px;">`;
    chosenCols.forEach(col => {
      let val = (t as any)[col.key] ?? '';
      if (col.key === 'name') {
        const indent = depth * 12;
        val = `<div style="padding-left: ${indent}px; font-weight: ${t.isSummary ? '700' : '400'}; color: ${t.isSummary ? '#0f172a' : '#334155'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.isSummary ? '📁 ' : t.isMilestone ? '◆ ' : '• '}${t.name}</div>`;
      } else if (col.key === 'progress') {
        val = `<span style="font-weight: 600; color: #4338ca;">${t.progress}%</span>`;
      } else if (col.key === 'duration') {
        val = `${t.duration}d`;
      }
      tableRowsHTML += `<td style="padding: 4px 6px; text-align: ${col.align || 'left'}; border-right: 1px solid #e2e8f0; white-space: nowrap;">${val}</td>`;
    });
    tableRowsHTML += `</tr>`;
  });

  // 5. Build Gantt Timeline SVG & Bars HTML
  let timelineDaysHTML = '';
  datesList.forEach((d) => {
    const dObj = new Date(d + 'T00:00:00');
    const isWknd = dObj.getDay() === 0 || dObj.getDay() === 6;
    timelineDaysHTML += `
      <div style="width: ${dayWidth}px; flex-shrink: 0; text-align: center; border-right: 1px solid #e2e8f0; background-color: ${isWknd ? '#f1f5f9' : '#ffffff'}; font-size: 9px; line-height: 24px; color: ${isWknd ? '#94a3b8' : '#475569'};">
        ${dObj.getDate()}
      </div>
    `;
  });

  let taskBarsHTML = '';
  tasks.forEach((t, i) => {
    const startX = dateToX(t.startDate);
    const endX = dateToX(t.endDate) + dayWidth;
    const barWidth = Math.max(dayWidth, endX - startX);
    const topY = i * rowHeight + 4;

    if (t.isSummary) {
      taskBarsHTML += `
        <div style="position: absolute; left: ${startX}px; top: ${topY + 3}px; width: ${barWidth}px; height: 16px; background-color: #1e293b; border-radius: 2px;">
          <div style="width: ${t.progress}%; height: 100%; background-color: #64748b; border-radius: 2px;"></div>
        </div>
      `;
    } else if (t.isMilestone || t.duration === 0) {
      taskBarsHTML += `
        <div style="position: absolute; left: ${startX + dayWidth / 2 - 7}px; top: ${topY + 2}px; width: 14px; height: 14px; background-color: #059669; transform: rotate(45deg); border: 2px solid #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></div>
      `;
    } else {
      taskBarsHTML += `
        <div style="position: absolute; left: ${startX}px; top: ${topY + 2}px; width: ${barWidth}px; height: 20px; background-color: #6366f1; border-radius: 4px; border: 1px solid #4f46e5; overflow: hidden;">
          <div style="width: ${t.progress}%; height: 100%; background-color: rgba(0,0,0,0.25);"></div>
        </div>
      `;
    }
  });

  // Footer HTML
  let footerHTML = '';
  if (exportConfig.footer === 'summary') {
    footerHTML = `
      <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <div>Generated by PMWBS (Project Scheduling & WBS Suite)</div>
        <div>Total Duration: ${tasks[0]?.duration || 0} Working Days | All Rights Reserved</div>
      </div>
    `;
  }

  // Combine full printable document markup
  container.innerHTML = `
    ${headerHTML}
    <div style="display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
      <!-- Spreadsheet Table Side -->
      <div style="width: ${tableWidth}px; flex-shrink: 0; border-right: 2px solid #94a3b8;">
        <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
          <thead>
            <tr style="height: 25px; background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #475569; font-weight: 700;">
              ${chosenCols.map(c => `<th style="padding: 4px 6px; text-align: ${c.align || 'left'}; border-right: 1px solid #e2e8f0;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>

      <!-- Gantt Timeline Side -->
      <div style="width: ${timelineWidth}px; flex-shrink: 0; position: relative;">
        <!-- Timeline Days Header -->
        <div style="display: flex; height: 25px; border-bottom: 2px solid #cbd5e1; background: #f8fafc;">
          ${timelineDaysHTML}
        </div>

        <!-- Timeline Grid Background & Bars Area -->
        <div style="position: relative; height: ${tasks.length * rowHeight}px;">
          <!-- Vertical Day Lines -->
          <div style="display: flex; position: absolute; inset: 0; pointer-events: none;">
            ${datesList.map(d => {
              const isWknd = new Date(d + 'T00:00:00').getDay() % 6 === 0;
              return `<div style="width: ${dayWidth}px; flex-shrink: 0; height: 100%; border-right: 1px solid #f1f5f9; background-color: ${isWknd ? 'rgba(241,245,249,0.5)' : 'transparent'};"></div>`;
            }).join('')}
          </div>

          <!-- Task Bars -->
          <div style="position: absolute; inset: 0;">
            ${taskBarsHTML}
          </div>
        </div>
      </div>
    </div>
    ${footerHTML}
  `;

  document.body.appendChild(container);

  try {
    onProgress?.('Rendering canvas graphics...');
    const scale = exportConfig.resolution || 2;
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    onProgress?.(`Generating ${exportConfig.format.toUpperCase()}...`);

    if (exportConfig.format === 'png') {
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${settings.name.replace(/\s+/g, '_')}_Schedule.png`;
      a.click();
    } else {
      // PDF export with jsPDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfOrientation = exportConfig.orientation === 'portrait' ? 'p' : 'l';
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: exportConfig.paperSize
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Fit image onto page proportionally
      const imgWidth = pageWidth - 16; // 8mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - 16) {
        // Multi-page or scale to fit
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
