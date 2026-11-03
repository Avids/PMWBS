import * as XLSX from 'xlsx';
import type { ProjectFile, Task, ProjectSettings } from '../types/project';
export { parseMicrosoftProjectXML } from './mspXmlImporter';
export { parseExcelProject } from './excelImporter';

/**
 * Downloads a JavaScript object as a .wbs file (native JSON).
 */
export function saveNativeWBSFile(projectFile: ProjectFile, filename: string = 'Schedule.wbs') {
  const jsonStr = JSON.stringify(projectFile, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.wbs') ? filename : `${filename}.wbs`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses a .wbs or .json file from File object.
 */
export async function loadNativeWBSFile(file: File): Promise<ProjectFile> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
    throw new Error('Invalid project file format: missing tasks array');
  }
  return parsed as ProjectFile;
}

/**
 * Exports project tasks to Microsoft Excel (.xlsx) format.
 */
export function exportToExcel(tasks: Task[], settings: ProjectSettings, filename: string = 'Schedule_Export.xlsx') {
  const rows = tasks.map(t => ({
    'WBS': t.wbsCode,
    'Task Name': '  '.repeat(t.wbsCode.split('.').length - 1) + t.name,
    'Type': t.isSummary ? 'Summary' : t.isMilestone ? 'Milestone' : 'Task',
    'Start Date': t.startDate,
    'End Date': t.endDate,
    'Duration (Days)': t.duration,
    'Progress (%)': t.progress,
    'Weight (%)': t.weight,
    'Predecessors': t.predecessorText || '',
    'Planned Man-Hours': t.plannedManHours || 0,
    'Actual Man-Hours': t.actualManHours || 0,
    'Remaining Man-Hours': t.remainingManHours || 0,
    'Earned Man-Hours': t.earnedManHours || 0,
    'Baseline Start': t.baselineStartDate || '',
    'Baseline End': t.baselineEndDate || '',
    'Variance (Days)': t.baselineVarianceDays !== undefined ? t.baselineVarianceDays : '',
    'Assigned To': t.assignedTo || '',
    'Notes': t.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, // WBS
    { wch: 32 }, // Task Name
    { wch: 12 }, // Type
    { wch: 12 }, // Start Date
    { wch: 12 }, // End Date
    { wch: 14 }, // Duration
    { wch: 12 }, // Progress
    { wch: 12 }, // Weight
    { wch: 16 }, // Predecessors
    { wch: 18 }, // Planned MH
    { wch: 18 }, // Actual MH
    { wch: 18 }, // Remaining MH
    { wch: 18 }, // Earned MH
    { wch: 14 }, // Baseline Start
    { wch: 14 }, // Baseline End
    { wch: 14 }, // Variance
    { wch: 18 }, // Assigned To
    { wch: 28 }  // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, (settings.name || 'Schedule').slice(0, 31));

  // 2. Project Calendar & Settings Sheet (Preserves full calendar settings on export)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const workingDayLabels = (settings.calendar?.workingDays || [1, 2, 3, 4, 5])
    .map(d => dayNames[d] || `Day ${d}`)
    .join(', ');

  const calData = [
    { 'Setting': 'Project Name', 'Value': settings.name },
    { 'Setting': 'Project Number', 'Value': settings.projectNumber || '' },
    { 'Setting': 'Company / Client', 'Value': settings.company || '' },
    { 'Setting': 'Project Address', 'Value': settings.projectAddress || '' },
    { 'Setting': 'Project Author', 'Value': settings.author || '' },
    { 'Setting': 'Start Date', 'Value': settings.startDate },
    { 'Setting': 'Currency Symbol', 'Value': settings.currency || '$' },
    { 'Setting': 'Weight Computation Mode', 'Value': settings.weightMode || 'duration' },
    { 'Setting': 'Work Hours Per Day', 'Value': settings.calendar?.hoursPerDay || 8 },
    { 'Setting': 'Working Days (Indices)', 'Value': (settings.calendar?.workingDays || [1, 2, 3, 4, 5]).join(',') },
    { 'Setting': 'Working Days (Names)', 'Value': workingDayLabels },
    { 'Setting': 'Project Holidays & Shutdowns', 'Value': (settings.calendar?.holidays || []).join(', ') }
  ];

  const calWorksheet = XLSX.utils.json_to_sheet(calData);
  calWorksheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, calWorksheet, 'Project Calendar');

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
