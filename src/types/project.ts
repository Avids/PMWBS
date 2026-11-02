export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  taskId: string;
  type: DependencyType;
  lag: number; // in days (+/-)
}

export type WeightMode = 'equal' | 'duration' | 'manhour' | 'manual';
export type FontSizeOption = 'small' | 'normal' | 'large'; // 8pt (small), 10pt (normal), 12pt (large)
export type ZoomTier = 'day' | 'week' | 'month';

export interface BaselineData {
  id: string;
  name: string;
  savedAt: string;
  tasks: Record<string, {
    startDate: string;
    endDate: string;
    duration: number;
    plannedManHours: number;
    weight: number;
  }>;
}

export interface Task {
  id: string;
  wbsCode: string;          // e.g. "1.1.2"
  name: string;
  parentId: string | null;  // null for root level
  isSummary: boolean;       // auto-computed if has children
  isMilestone: boolean;     // duration === 0 or explicit milestone
  isCollapsed?: boolean;

  // Schedule Dates
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  duration: number;         // working days
  
  // Actual & Progress
  progress: number;         // 0 - 100%
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Baseline Data (for active comparison)
  baselineStartDate?: string;
  baselineEndDate?: string;
  baselineDuration?: number;
  baselineVarianceDays?: number; // EndDate - BaselineEndDate

  // Dependencies (up to 10 supported)
  predecessors: TaskDependency[]; // Raw dependency objects
  predecessorText?: string;       // Formatted string: "1FS, 2SS+2d"

  // Man-Hours & Cost
  plannedManHours: number;
  actualManHours: number;
  remainingManHours: number;
  earnedManHours: number;        // (plannedManHours * progress) / 100

  // Activity Weight
  weightMode?: WeightMode;       // if manual or override
  weight: number;                // Weight in % for summary rollup (0 - 100)
  customWeight?: number;

  // Assignments & Notes
  assignedTo?: string;
  color?: string;
  notes?: string;

  // Float & Critical Path
  earlyStart?: string;
  earlyFinish?: string;
  lateStart?: string;
  lateFinish?: string;
  totalFloat?: number;
  freeFloat?: number;
  isCritical?: boolean;
}

export interface ProjectCalendar {
  workingDays: number[];         // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun (default 1-5)
  holidays: string[];            // YYYY-MM-DD list
  hoursPerDay: number;           // default 8
}

export interface ProjectSettings {
  name: string;
  author: string;
  company?: string;
  startDate: string;
  weightMode: WeightMode;        // Default project weight mode: 'equal' | 'duration' | 'manhour'
  calendar: ProjectCalendar;
  currency: string;
  showBaseline: boolean;
  showCriticalPath: boolean;
  showTaskLabels?: boolean;      // Toggle text labels next to bars on timeline
  fontSize?: FontSizeOption;     // 'small' (8pt), 'normal' (10pt), 'large' (12pt)
}

export interface ProjectFile {
  version: string;
  meta: ProjectSettings;
  calendar?: ProjectCalendar;
  baselines: BaselineData[];
  tasks: Task[];
}
