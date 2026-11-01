import type { Task, TaskDependency, DependencyType } from '../types/project';

/**
 * Parses an ISO 8601 duration string (e.g. "PT40H0M0S", "PT8H", "P2D") into working days.
 * Standard workday is 8 hours.
 */
function parseMspDuration(durStr: string | null | undefined): number {
  if (!durStr) return 1;
  const str = durStr.trim();
  if (str === 'PT0H0M0S' || str === 'PT0H' || str === 'PT0M' || str === 'PT0S') return 0;

  // Day match: P3D or P3.5D
  const dayMatch = str.match(/P(\d+(?:\.\d+)?)D/);
  if (dayMatch) {
    return parseFloat(dayMatch[1]);
  }

  // Hours / Minutes / Seconds match: PT40H0M0S
  const hoursMatch = str.match(/(\d+(?:\.\d+)?)H/);
  const minsMatch = str.match(/(\d+(?:\.\d+)?)M/);
  let totalHours = 0;
  if (hoursMatch) totalHours += parseFloat(hoursMatch[1]);
  if (minsMatch) totalHours += parseFloat(minsMatch[1]) / 60;

  if (totalHours > 0) {
    return Math.max(1, Math.round(totalHours / 8));
  }

  // Raw number check (minutes or days)
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num > 480) return Math.max(1, Math.round(num / 480));
    if (num > 0 && num <= 100) return Math.round(num);
  }

  return 1;
}

/**
 * Parses work / man-hours duration string (e.g. "PT120H0M0S" -> 120)
 */
function parseMspWorkHours(workStr: string | null | undefined): number {
  if (!workStr) return 0;
  const hoursMatch = workStr.match(/(\d+(?:\.\d+)?)H/);
  if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]));
  const num = parseFloat(workStr);
  return !isNaN(num) ? Math.round(num) : 0;
}

/**
 * Parses MS Project PredecessorLink Type
 * 0 = FF, 1 = FS, 2 = SF, 3 = SS
 */
function parseMspDependencyType(typeVal: string | null | undefined): DependencyType {
  switch (typeVal) {
    case '0': return 'FF';
    case '1': return 'FS';
    case '2': return 'SF';
    case '3': return 'SS';
    default: return 'FS';
  }
}

/**
 * Parses MS Project LinkLag into working days
 */
function parseMspLag(lagVal: string | null | undefined): number {
  if (!lagVal) return 0;
  const num = parseFloat(lagVal);
  if (isNaN(num) || num === 0) return 0;
  // If > 1000, stored in tenths of minutes (4800 = 1 day)
  if (Math.abs(num) >= 2400) {
    return Math.round(num / 4800);
  }
  // If > 60, stored in minutes (480 = 1 day)
  if (Math.abs(num) >= 120) {
    return Math.round(num / 480);
  }
  return Math.round(num);
}

/**
 * Robust Microsoft Project XML (MSPDI) parser
 */
export async function parseMicrosoftProjectXML(file: File): Promise<{
  projectTitle: string;
  startDate: string;
  tasks: Task[];
}> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.mpp')) {
    throw new Error(
      'Microsoft Project (.mpp) is a proprietary binary format. In Microsoft Project, please click "File > Save As", select "XML Format (*.xml)", and import the resulting XML file.'
    );
  }

  const xmlText = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for XML parse errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Failed to parse XML file. Please ensure this is a valid Microsoft Project XML export.');
  }

  // Project Level Meta
  const nameEl = xmlDoc.querySelector('Project > Name') || xmlDoc.querySelector('Project > Title');
  const projectTitle = nameEl?.textContent?.trim() || file.name.replace(/\.[^/.]+$/, '');

  const startEl = xmlDoc.querySelector('Project > StartDate') || xmlDoc.querySelector('Project > Start');
  let projectStartDate = startEl?.textContent?.split('T')[0] || new Date().toISOString().split('T')[0];

  // Parse Tasks
  const taskElements = Array.from(xmlDoc.querySelectorAll('Tasks > Task'));
  if (taskElements.length === 0) {
    throw new Error('No tasks found in this Microsoft Project XML file.');
  }

  // Build intermediate task records
  interface TempMspTask {
    uid: string;
    id: string;
    name: string;
    start: string;
    finish: string;
    duration: number;
    percentComplete: number;
    outlineLevel: number;
    outlineNumber: string;
    isSummary: boolean;
    isMilestone: boolean;
    workHours: number;
    actualWorkHours: number;
    predLinks: Array<{ predUid: string; type: DependencyType; lag: number }>;
  }

  const tempTasks: TempMspTask[] = [];
  const uidMap = new Map<string, string>(); // MSP UID -> Our Task ID

  taskElements.forEach((el) => {
    const uid = el.querySelector('UID')?.textContent?.trim() || '';
    const id = el.querySelector('ID')?.textContent?.trim() || uid;
    const isNull = el.querySelector('IsNull')?.textContent?.trim() === '1';
    if (isNull) return;

    const name = el.querySelector('Name')?.textContent?.trim() || `Task ${id}`;
    const outlineLevelStr = el.querySelector('OutlineLevel')?.textContent?.trim() || '1';
    const outlineLevel = parseInt(outlineLevelStr, 10) || 1;
    const outlineNumber = el.querySelector('OutlineNumber')?.textContent?.trim() || '';

    // Check if this is the MSP "Project Summary Task" (UID 0 or OutlineLevel 0)
    if (uid === '0' || outlineLevel === 0) {
      // Use as project title if available
      return;
    }

    const startRaw = el.querySelector('Start')?.textContent?.trim() || '';
    const finishRaw = el.querySelector('Finish')?.textContent?.trim() || '';
    const startDate = startRaw ? startRaw.split('T')[0] : projectStartDate;
    const endDate = finishRaw ? finishRaw.split('T')[0] : startDate;

    const isSummary = el.querySelector('Summary')?.textContent?.trim() === '1';
    const isMilestone = el.querySelector('Milestone')?.textContent?.trim() === '1';
    const duration = isMilestone ? 0 : parseMspDuration(el.querySelector('Duration')?.textContent);
    const percentComplete = parseInt(el.querySelector('PercentComplete')?.textContent?.trim() || '0', 10) || 0;

    const workHours = parseMspWorkHours(el.querySelector('Work')?.textContent);
    const actualWorkHours = parseMspWorkHours(el.querySelector('ActualWork')?.textContent);

    // Predecessors
    const predLinks: Array<{ predUid: string; type: DependencyType; lag: number }> = [];
    const predEls = Array.from(el.querySelectorAll('PredecessorLink'));
    predEls.forEach((p) => {
      const predUid = p.querySelector('PredecessorUID')?.textContent?.trim();
      if (predUid && predUid !== uid && predUid !== '0') {
        const type = parseMspDependencyType(p.querySelector('Type')?.textContent);
        const lag = parseMspLag(p.querySelector('LinkLag')?.textContent);
        predLinks.push({ predUid, type, lag });
      }
    });

    tempTasks.push({
      uid,
      id,
      name,
      start: startDate,
      finish: endDate,
      duration,
      percentComplete,
      outlineLevel,
      outlineNumber,
      isSummary,
      isMilestone,
      workHours,
      actualWorkHours,
      predLinks
    });
  });

  if (tempTasks.length === 0) {
    throw new Error('No valid activities found to import in the XML file.');
  }

  // Assign internal IDs
  tempTasks.forEach((t) => {
    uidMap.set(t.uid, `t-msp-${t.uid}`);
  });

  // Calculate parent-child hierarchy from outlineLevel and outlineNumber
  const finalTasks: Task[] = [];
  const levelStack: Array<{ level: number; id: string }> = [];

  tempTasks.forEach((t) => {
    const ourId = uidMap.get(t.uid)!;

    // Pop higher or equal levels from hierarchy stack
    while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= t.outlineLevel) {
      levelStack.pop();
    }

    const parentId = levelStack.length > 0 ? levelStack[levelStack.length - 1].id : null;
    levelStack.push({ level: t.outlineLevel, id: ourId });

    // Map predecessors
    const predecessors: TaskDependency[] = [];
    t.predLinks.forEach((pl) => {
      const mappedTargetId = uidMap.get(pl.predUid);
      if (mappedTargetId) {
        predecessors.push({
          taskId: mappedTargetId,
          type: pl.type,
          lag: pl.lag
        });
      }
    });

    finalTasks.push({
      id: ourId,
      wbsCode: t.outlineNumber || String(finalTasks.length + 1),
      name: t.name,
      parentId,
      isSummary: t.isSummary,
      isMilestone: t.isMilestone || t.duration === 0,
      isCollapsed: false,
      startDate: t.start,
      endDate: t.finish,
      duration: t.duration,
      progress: Math.min(100, Math.max(0, t.percentComplete)),
      predecessors,
      plannedManHours: t.workHours,
      actualManHours: t.actualWorkHours,
      remainingManHours: Math.max(0, t.workHours - t.actualWorkHours),
      earnedManHours: Math.round((t.workHours * t.percentComplete) / 100),
      weight: 0
    });
  });

  return {
    projectTitle,
    startDate: finalTasks[0]?.startDate || projectStartDate,
    tasks: finalTasks
  };
}
