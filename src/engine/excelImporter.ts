import * as XLSX from 'xlsx';
import type { Task, ProjectCalendar } from '../types/project';
import { formatDate, addWorkingDays, parsePredecessors, recalculateSchedule } from './scheduler';

export interface ExcelImportResult {
  projectTitle: string;
  startDate?: string;
  tasks: Task[];
}

/**
 * Robust date parser supporting Date instances, Excel serial numbers,
 * and common date string formats (ISO, MM/DD/YYYY, etc.).
 */
function parseDateValue(val: any, fallbackDate: string): string {
  if (val === undefined || val === null || val === '') return fallbackDate;

  // 1. JavaScript Date instance (from XLSX cellDates: true)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatDate(val);
  }

  // 2. Excel numeric serial date (e.g. 45620 for year 2024)
  if (typeof val === 'number' && val > 20000 && val < 70000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return formatDate(d);
  }

  // 3. String representation
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallbackDate;
    // Direct ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Date with slashes YYYY/MM/DD
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    // MM/DD/YYYY or DD/MM/YYYY
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDate(parsed);
    }
  }

  return fallbackDate;
}

/**
 * Parses an Excel (.xlsx, .xls, or .csv) file into PMWBS project tasks.
 * Automatically recognizes PM headers, WBS hierarchy, dates, durations,
 * predecessors, and man-hours.
 */
export async function parseExcelProject(file: File, calendar: ProjectCalendar): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no sheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The selected Excel sheet contains no data.');
  }

  // Identify the header row by scoring rows against common PM keywords
  const PM_KEYWORDS = [
    'name', 'task', 'activity', 'description', 'wbs', 'start', 'end', 'finish',
    'duration', 'days', 'progress', '%', 'predecessor', 'pred', 'dependencies',
    'hours', 'manhour', 'man-hour', 'weight', 'type'
  ];

  let bestRowIdx = 0;
  let bestScore = 0;

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    row.forEach((cell) => {
      const str = String(cell || '').trim().toLowerCase();
      if (PM_KEYWORDS.some((kw) => str.includes(kw))) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestRowIdx = r;
    }
  }

  const headerRow = rawRows[bestRowIdx] || [];
  const headerMap: Record<number, string> = {};

  headerRow.forEach((cell, colIdx) => {
    const norm = String(cell || '').trim().toLowerCase();
    if (!norm) return;

    if (/^(task\s*name|activity\s*name|task|activity|description|name|activity\s*description)$/i.test(norm)) {
      headerMap[colIdx] = 'name';
    } else if (/^(wbs|wbs\s*code|outline\s*number|activity\s*id|code)$/i.test(norm)) {
      headerMap[colIdx] = 'wbs';
    } else if (/^(start\s*date|start|startdate|early\s*start|begin)$/i.test(norm)) {
      headerMap[colIdx] = 'startDate';
    } else if (/^(end\s*date|finish\s*date|finish|enddate|early\s*finish|end)$/i.test(norm)) {
      headerMap[colIdx] = 'endDate';
    } else if (/^(duration|duration\s*\(days\)|duration\s*\(d\)|days|dur)$/i.test(norm)) {
      headerMap[colIdx] = 'duration';
    } else if (/^(% complete|progress\s*\(%\)|progress|percent\s*complete|pct|complete|%)$/i.test(norm)) {
      headerMap[colIdx] = 'progress';
    } else if (/^(predecessors|predecessor|pred|dependencies|links|logic)$/i.test(norm)) {
      headerMap[colIdx] = 'predecessors';
    } else if (/^(type|activity\s*type|task\s*type)$/i.test(norm)) {
      headerMap[colIdx] = 'type';
    } else if (/^(planned\s*man-hours|planned\s*man\s*hours|planned\s*hours|plan\s*mh|budgeted\s*hours|man\s*hours)$/i.test(norm)) {
      headerMap[colIdx] = 'plannedManHours';
    } else if (/^(actual\s*man-hours|actual\s*man\s*hours|actual\s*hours|act\s*mh)$/i.test(norm)) {
      headerMap[colIdx] = 'actualManHours';
    } else if (/^(weight|weight\s*\(%\)|wt)$/i.test(norm)) {
      headerMap[colIdx] = 'weight';
    } else if (/^(baseline\s*start|base\s*start)$/i.test(norm)) {
      headerMap[colIdx] = 'baselineStart';
    } else if (/^(baseline\s*end|base\s*end)$/i.test(norm)) {
      headerMap[colIdx] = 'baselineEnd';
    } else if (/^(assigned\s*to|assigned|resource|resources)$/i.test(norm)) {
      headerMap[colIdx] = 'assignedTo';
    }
  });

  // Fallback: If no column explicitly matched 'name', pick the first text column or column 0/1
  if (!Object.values(headerMap).includes('name')) {
    const candidateIdx = headerRow.findIndex((c) => {
      const s = String(c || '').toLowerCase();
      return s.includes('task') || s.includes('name') || s.includes('title') || s.includes('desc');
    });
    if (candidateIdx !== -1) {
      headerMap[candidateIdx] = 'name';
    } else {
      headerMap[headerRow.length > 1 ? 1 : 0] = 'name';
    }
  }

  const defaultStart = formatDate(new Date());

  // Intermediate raw extracted records
  interface RawRecord {
    rawName: string;
    name: string;
    wbsCode: string;
    indentLevel: number;
    startDate: string;
    endDate: string;
    duration: number;
    progress: number;
    weight: number;
    typeStr: string;
    predecessorText: string;
    plannedManHours: number;
    actualManHours: number;
    baselineStartDate?: string;
    baselineEndDate?: string;
    assignedTo?: string;
  }

  const rawRecords: RawRecord[] = [];

  for (let r = bestRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    const rowData: Record<string, any> = {};
    Object.entries(headerMap).forEach(([colIdxStr, field]) => {
      const colIdx = parseInt(colIdxStr, 10);
      rowData[field] = row[colIdx];
    });

    const rawNameStr = String(rowData['name'] || '');
    const trimmedName = rawNameStr.trim();
    if (!trimmedName) continue; // Skip rows with no task name

    // Detect indentation if present in Task Name cell
    const leadingSpaces = (rawNameStr.match(/^(\s+)/)?.[1]?.length || 0);
    const indentLevel = Math.floor(leadingSpaces / 2);

    // Duration parsing
    let duration = 5;
    if (rowData['duration'] !== undefined && rowData['duration'] !== '') {
      const durNum = parseInt(String(rowData['duration']).replace(/[^\d-]/g, ''), 10);
      duration = !isNaN(durNum) ? Math.max(0, durNum) : 5;
    }

    // Dates parsing
    const startDate = parseDateValue(rowData['startDate'], defaultStart);
    let endDate = parseDateValue(rowData['endDate'], '');
    if (!endDate) {
      endDate = addWorkingDays(startDate, Math.max(1, duration), calendar);
    }

    // Progress parsing (e.g. 0.5 or 50 or "50%")
    let progress = 0;
    if (rowData['progress'] !== undefined && rowData['progress'] !== '') {
      let pVal = parseFloat(String(rowData['progress']).replace('%', '').trim());
      if (!isNaN(pVal)) {
        if (pVal > 0 && pVal <= 1) pVal = pVal * 100;
        progress = Math.min(100, Math.max(0, Math.round(pVal)));
      }
    }

    const wbsCode = String(rowData['wbs'] || '').trim();
    const typeStr = String(rowData['type'] || '').trim().toLowerCase();
    const predecessorText = String(rowData['predecessors'] || '').trim();
    const plannedManHours = Math.max(0, parseFloat(String(rowData['plannedManHours'] || '0')) || 0);
    const actualManHours = Math.max(0, parseFloat(String(rowData['actualManHours'] || '0')) || 0);
    const weight = Math.max(0, parseFloat(String(rowData['weight'] || '0')) || 0);
    const baselineStartDate = rowData['baselineStart'] ? parseDateValue(rowData['baselineStart'], '') : undefined;
    const baselineEndDate = rowData['baselineEnd'] ? parseDateValue(rowData['baselineEnd'], '') : undefined;
    const assignedTo = rowData['assignedTo'] ? String(rowData['assignedTo']).trim() : undefined;

    rawRecords.push({
      rawName: rawNameStr,
      name: trimmedName,
      wbsCode,
      indentLevel,
      startDate,
      endDate,
      duration,
      progress,
      weight,
      typeStr,
      predecessorText,
      plannedManHours,
      actualManHours,
      baselineStartDate,
      baselineEndDate,
      assignedTo
    });
  }

  if (rawRecords.length === 0) {
    throw new Error('No valid activities found in the Excel sheet.');
  }

  // Build hierarchy and assign initial IDs
  const tempTasks: Task[] = [];
  const wbsToIdMap = new Map<string, string>();
  const outlineStack: { level: number; id: string }[] = [];

  rawRecords.forEach((rec, idx) => {
    const id = `t-imp-${idx + 1}`;
    let parentId: string | null = null;

    if (rec.wbsCode) {
      // Determine parent from WBS code: e.g. "1.2.3" -> parent is "1.2"
      const lastDot = rec.wbsCode.lastIndexOf('.');
      if (lastDot !== -1) {
        const parentWbs = rec.wbsCode.substring(0, lastDot);
        if (wbsToIdMap.has(parentWbs)) {
          parentId = wbsToIdMap.get(parentWbs)!;
        }
      }
      wbsToIdMap.set(rec.wbsCode, id);
    } else if (rec.indentLevel > 0) {
      // Determine parent from indent level stack
      while (outlineStack.length > 0 && outlineStack[outlineStack.length - 1].level >= rec.indentLevel) {
        outlineStack.pop();
      }
      parentId = outlineStack.length > 0 ? outlineStack[outlineStack.length - 1].id : null;
      outlineStack.push({ level: rec.indentLevel, id });
    }

    const isExplicitMilestone = rec.duration === 0 || rec.typeStr.includes('milestone');
    const isExplicitSummary = rec.typeStr.includes('summary');

    tempTasks.push({
      id,
      wbsCode: rec.wbsCode || String(idx + 1),
      name: rec.name,
      parentId,
      isSummary: isExplicitSummary,
      isMilestone: isExplicitMilestone,
      startDate: rec.startDate,
      endDate: rec.endDate,
      duration: isExplicitMilestone ? 0 : Math.max(1, rec.duration),
      progress: rec.progress,
      predecessors: [],
      predecessorText: rec.predecessorText,
      plannedManHours: rec.plannedManHours,
      actualManHours: rec.actualManHours,
      remainingManHours: Math.max(0, rec.plannedManHours - rec.actualManHours),
      earnedManHours: (rec.plannedManHours * rec.progress) / 100,
      weight: rec.weight,
      baselineStartDate: rec.baselineStartDate,
      baselineEndDate: rec.baselineEndDate,
      assignedTo: rec.assignedTo
    });
  });

  // Mark tasks with children as summary tasks
  const parentIdSet = new Set(tempTasks.map((t) => t.parentId).filter(Boolean));
  tempTasks.forEach((t) => {
    if (parentIdSet.has(t.id)) {
      t.isSummary = true;
    }
  });

  // Parse predecessors referencing row numbers or WBS codes
  tempTasks.forEach((t) => {
    if (t.predecessorText) {
      t.predecessors = parsePredecessors(t.predecessorText, tempTasks);
    }
  });

  // Clean project title from filename
  const cleanTitle = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  // Find minimum start date across all tasks
  let projectStartDate = tempTasks[0].startDate;
  tempTasks.forEach((t) => {
    if (t.startDate && t.startDate < projectStartDate) {
      projectStartDate = t.startDate;
    }
  });

  // Run full schedule recalculation to assign authoritative WBS codes, CPM dates, and rollups
  const scheduledTasks = recalculateSchedule(tempTasks, calendar, 'duration');

  return {
    projectTitle: cleanTitle || sheetName || 'Imported Schedule',
    startDate: projectStartDate,
    tasks: scheduledTasks
  };
}
