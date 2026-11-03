import { describe, it, expect } from 'vitest';
import {
  isWorkingDay,
  countWorkingDays,
  addWorkingDays,
  subtractWorkingDays,
  getNextWorkingDay,
  getPrevWorkingDay,
  parsePredecessors,
  formatPredecessors,
  detectDependencyCycle,
  recalculateSchedule,
  computeIndentParentId,
  computeOutdentParentId,
  getTaskDepth
} from '../scheduler';
import type { Task, ProjectCalendar } from '../../types/project';

const standardCalendar: ProjectCalendar = {
  workingDays: [1, 2, 3, 4, 5], // Mon - Fri
  holidays: ['2026-11-26'],    // Thursday Thanksgiving holiday
  hoursPerDay: 8
};

describe('1. Calendar Arithmetic & Working Days Engine', () => {
  it('correctly classifies standard weekdays as working and weekends as non-working', () => {
    // 2026-11-02 is Monday, 2026-11-06 is Friday, 2026-11-07 is Saturday, 2026-11-08 is Sunday
    expect(isWorkingDay('2026-11-02', standardCalendar)).toBe(true);
    expect(isWorkingDay('2026-11-06', standardCalendar)).toBe(true);
    expect(isWorkingDay('2026-11-07', standardCalendar)).toBe(false);
    expect(isWorkingDay('2026-11-08', standardCalendar)).toBe(false);
  });

  it('skips designated project holidays', () => {
    // 2026-11-26 is a holiday (Thursday)
    expect(isWorkingDay('2026-11-25', standardCalendar)).toBe(true);
    expect(isWorkingDay('2026-11-26', standardCalendar)).toBe(false);
    expect(isWorkingDay('2026-11-27', standardCalendar)).toBe(true);
  });

  it('counts inclusive working days correctly over weekends', () => {
    // From Friday 2026-11-06 to Tuesday 2026-11-10: Fri(1), Mon(2), Tue(3) = 3 working days
    const count = countWorkingDays('2026-11-06', '2026-11-10', standardCalendar);
    expect(count).toBe(3);
  });

  it('adds working days jumping over weekends and holidays', () => {
    // Starting Wednesday 2026-11-25:
    // Day 1: Wed 2026-11-25
    // Thu 2026-11-26 is holiday (skipped)
    // Day 2: Fri 2026-11-27
    // Sat & Sun skipped
    // Day 3: Mon 2026-11-30
    const end = addWorkingDays('2026-11-25', 3, standardCalendar);
    expect(end).toBe('2026-11-30');
  });

  it('subtracts working days to find required start date', () => {
    // Ending on Monday 2026-11-09 with 3 working days duration:
    // Mon 11-09 (day 3), Fri 11-06 (day 2), Thu 11-05 (day 1)
    const start = subtractWorkingDays('2026-11-09', 3, standardCalendar);
    expect(start).toBe('2026-11-05');
  });

  it('finds the next and previous working day', () => {
    // Next working day after Friday 2026-11-06 is Monday 2026-11-09
    expect(getNextWorkingDay('2026-11-06', standardCalendar)).toBe('2026-11-09');
    // Previous working day before Monday 2026-11-09 is Friday 2026-11-06
    expect(getPrevWorkingDay('2026-11-09', standardCalendar)).toBe('2026-11-06');
  });
});

describe('2. Dependency Cycle Detection & Prevention', () => {
  const baseTasks: Task[] = [
    {
      id: 't-1',
      name: 'Task 1',
      wbsCode: '1.1',
      parentId: null,
      isSummary: false,
      isMilestone: false,
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      duration: 5,
      progress: 0,
      predecessors: [],
      plannedManHours: 40,
      actualManHours: 0,
      remainingManHours: 40,
      earnedManHours: 0,
      weight: 0
    },
    {
      id: 't-2',
      name: 'Task 2',
      wbsCode: '1.2',
      parentId: null,
      isSummary: false,
      isMilestone: false,
      startDate: '2026-11-09',
      endDate: '2026-11-13',
      duration: 5,
      progress: 0,
      predecessors: [{ taskId: 't-1', type: 'FS', lag: 0 }],
      plannedManHours: 40,
      actualManHours: 0,
      remainingManHours: 40,
      earnedManHours: 0,
      weight: 0
    },
    {
      id: 't-3',
      name: 'Task 3',
      wbsCode: '1.3',
      parentId: null,
      isSummary: false,
      isMilestone: false,
      startDate: '2026-11-16',
      endDate: '2026-11-20',
      duration: 5,
      progress: 0,
      predecessors: [{ taskId: 't-2', type: 'FS', lag: 0 }],
      plannedManHours: 40,
      actualManHours: 0,
      remainingManHours: 40,
      earnedManHours: 0,
      weight: 0
    }
  ];

  it('validates a correct linear DAG as cycle-free', () => {
    const result = detectDependencyCycle(baseTasks);
    expect(result.hasCycle).toBe(false);
  });

  it('detects a direct self-dependency (A -> A)', () => {
    const result = detectDependencyCycle(baseTasks, {
      taskId: 't-1',
      newPredecessors: [{ taskId: 't-1', type: 'FS', lag: 0 }]
    });
    expect(result.hasCycle).toBe(true);
    expect(result.message).toContain('Self-dependency error');
  });

  it('detects a transitive cycle across 3 tasks (1 -> 2 -> 3 -> 1)', () => {
    // Attempting to add t-3 as predecessor of t-1
    const result = detectDependencyCycle(baseTasks, {
      taskId: 't-1',
      newPredecessors: [{ taskId: 't-3', type: 'FS', lag: 0 }]
    });
    expect(result.hasCycle).toBe(true);
    expect(result.message).toContain('Circular dependency loop detected');
    expect(result.cyclePathFormatted.length).toBeGreaterThanOrEqual(3);
  });

  it('prevents a child task from depending on its summary parent', () => {
    const hierarchyTasks: Task[] = [
      {
        id: 'parent',
        name: 'Parent Summary',
        wbsCode: '1',
        parentId: null,
        isSummary: true,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 5,
        progress: 0,
        predecessors: [],
        plannedManHours: 40,
        actualManHours: 0,
        remainingManHours: 40,
        earnedManHours: 0,
        weight: 0
      },
      {
        id: 'child',
        name: 'Child Subtask',
        wbsCode: '1.1',
        parentId: 'parent',
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 5,
        progress: 0,
        predecessors: [],
        plannedManHours: 40,
        actualManHours: 0,
        remainingManHours: 40,
        earnedManHours: 0,
        weight: 0
      }
    ];

    const result = detectDependencyCycle(hierarchyTasks, {
      taskId: 'child',
      newPredecessors: [{ taskId: 'parent', type: 'FS', lag: 0 }]
    });
    expect(result.hasCycle).toBe(true);
    expect(result.message).toContain('cannot depend on its own parent summary task');
  });
});

describe('3. CPM Forward Pass & Relationship Types', () => {
  it('correctly schedules Finish-to-Start (FS) with lag', () => {
    const tasks: Task[] = [
      {
        id: 'A',
        name: 'Design',
        wbsCode: '1.1',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06', // Friday
        duration: 5,
        progress: 100,
        predecessors: [],
        plannedManHours: 40,
        actualManHours: 40,
        remainingManHours: 0,
        earnedManHours: 40,
        weight: 50
      },
      {
        id: 'B',
        name: 'Procurement',
        wbsCode: '1.2',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 5,
        progress: 0,
        // FS with +2 working days lag: next working day is Mon 11-09 + 2 days offset = Wed 11-11
        predecessors: [{ taskId: 'A', type: 'FS', lag: 2 }],
        plannedManHours: 40,
        actualManHours: 0,
        remainingManHours: 40,
        earnedManHours: 0,
        weight: 50
      }
    ];

    const scheduled = recalculateSchedule(tasks, standardCalendar);
    const taskB = scheduled.find(t => t.id === 'B')!;

    expect(taskB.startDate).toBe('2026-11-11');
    // 5 working days from Wed 11-11: Wed(1), Thu(2), Fri(3), Mon 11-16(4), Tue 11-17(5)
    expect(taskB.endDate).toBe('2026-11-17');
  });

  it('correctly schedules Start-to-Start (SS) with lag', () => {
    const tasks: Task[] = [
      {
        id: 'A',
        name: 'Excavation',
        wbsCode: '1.1',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02', // Monday
        endDate: '2026-11-13',
        duration: 10,
        progress: 0,
        predecessors: [],
        plannedManHours: 80,
        actualManHours: 0,
        remainingManHours: 80,
        earnedManHours: 0,
        weight: 50
      },
      {
        id: 'B',
        name: 'Shoring',
        wbsCode: '1.2',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 5,
        progress: 0,
        // Starts 3 working days after A starts: Mon 11-02 + 3 days offset = Thu 11-05
        predecessors: [{ taskId: 'A', type: 'SS', lag: 3 }],
        plannedManHours: 40,
        actualManHours: 0,
        remainingManHours: 40,
        earnedManHours: 0,
        weight: 50
      }
    ];

    const scheduled = recalculateSchedule(tasks, standardCalendar);
    const taskB = scheduled.find(t => t.id === 'B')!;

    expect(taskB.startDate).toBe('2026-11-05');
  });
});

describe('4. WBS Tree Hierarchy & Summary Rollup', () => {
  it('rolls up earliest start, latest finish, and man-hours from children', () => {
    const tasks: Task[] = [
      {
        id: 'p-1',
        name: 'Phase 1 Summary',
        wbsCode: '',
        parentId: null,
        isSummary: true,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        duration: 0,
        progress: 0,
        predecessors: [],
        plannedManHours: 0,
        actualManHours: 0,
        remainingManHours: 0,
        earnedManHours: 0,
        weight: 0
      },
      {
        id: 'c-1',
        name: 'Activity 1',
        wbsCode: '',
        parentId: 'p-1',
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 5,
        progress: 100,
        predecessors: [],
        plannedManHours: 50,
        actualManHours: 50,
        remainingManHours: 0,
        earnedManHours: 50,
        weight: 0
      },
      {
        id: 'c-2',
        name: 'Activity 2',
        wbsCode: '',
        parentId: 'p-1',
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-09',
        endDate: '2026-11-20',
        duration: 10,
        progress: 50,
        predecessors: [{ taskId: 'c-1', type: 'FS', lag: 0 }],
        plannedManHours: 100,
        actualManHours: 40,
        remainingManHours: 60,
        earnedManHours: 50,
        weight: 0
      }
    ];

    const scheduled = recalculateSchedule(tasks, standardCalendar, 'manhour');
    const parent = scheduled.find(t => t.id === 'p-1')!;

    // WBS Codes auto-computed
    expect(parent.wbsCode).toBe('1');
    expect(scheduled.find(t => t.id === 'c-1')!.wbsCode).toBe('1.1');
    expect(scheduled.find(t => t.id === 'c-2')!.wbsCode).toBe('1.2');

    // Rollup dates & duration
    expect(parent.startDate).toBe('2026-11-02');
    expect(parent.endDate).toBe('2026-11-20');
    expect(parent.duration).toBe(15); // 15 working days total

    // Rollup Man-Hours
    expect(parent.plannedManHours).toBe(150);
    expect(parent.actualManHours).toBe(90);
    expect(parent.remainingManHours).toBe(60);
    expect(parent.earnedManHours).toBe(100);

    // Man-Hour Weighted Progress Rollup:
    // c-1: 50/150 = 33.3% weight, 100% complete => 33.3%
    // c-2: 100/150 = 66.7% weight, 50% complete => 33.3%
    // Total progress = 67%
    expect(parent.progress).toBe(67);
  });
});

describe('5. Predecessor Text Parsing & Serialization', () => {
  it('parses MSP-style strings with relationships and positive/negative lag', () => {
    const taskList: Task[] = [
      { id: 't-1', wbsCode: '1.1' } as any,
      { id: 't-2', wbsCode: '1.2' } as any,
      { id: 't-3', wbsCode: '1.3' } as any
    ];

    // Row 1 FS + 5 days lag, Row 2 SS - 1 day lead
    const parsed = parsePredecessors('1FS+5d, 2SS-1d', taskList);
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual({ taskId: 't-1', type: 'FS', lag: 5 });
    expect(parsed[1]).toEqual({ taskId: 't-2', type: 'SS', lag: -1 });
  });

  it('formats dependencies into human-friendly row numbers', () => {
    const taskList: Task[] = [
      { id: 't-1', wbsCode: '1.1' } as any,
      { id: 't-2', wbsCode: '1.2' } as any
    ];

    const formatted = formatPredecessors([
      { taskId: 't-1', type: 'FS', lag: 3 }
    ], taskList);

    expect(formatted).toBe('1FS+3d');
  });
});

describe('6. WBS Hierarchy Indent & Outdent Calculations', () => {
  const sampleHierarchy: Task[] = [
    { id: 't-1', name: 'Root CSI', parentId: null, wbsCode: '1', startDate: '2026-11-02', duration: 5 } as any,
    { id: 't-2', name: 'Distribution', parentId: 't-1', wbsCode: '1.1', startDate: '2026-11-02', duration: 5 } as any,
    { id: 't-3', name: 'Switchgear & Panels', parentId: 't-2', wbsCode: '1.1.1', startDate: '2026-11-02', duration: 5 } as any,
    { id: 't-4', name: 'Feeders', parentId: 't-2', wbsCode: '1.1.2', startDate: '2026-11-02', duration: 5 } as any,
    { id: 't-5', name: 'Electrical Grounding', parentId: 't-1', wbsCode: '1.2', startDate: '2026-11-02', duration: 5 } as any,
    { id: 't-6', name: 'Generator System', parentId: 't-1', wbsCode: '1.3', startDate: '2026-11-02', duration: 5 } as any
  ];

  it('correctly calculates task depth in the hierarchy tree', () => {
    const taskMap = new Map<string, Task>();
    sampleHierarchy.forEach(t => taskMap.set(t.id, t));

    expect(getTaskDepth(sampleHierarchy[0], taskMap)).toBe(0); // Root (1)
    expect(getTaskDepth(sampleHierarchy[1], taskMap)).toBe(1); // 1.1
    expect(getTaskDepth(sampleHierarchy[2], taskMap)).toBe(2); // 1.1.1
    expect(getTaskDepth(sampleHierarchy[3], taskMap)).toBe(2); // 1.1.2
    expect(getTaskDepth(sampleHierarchy[4], taskMap)).toBe(1); // 1.2
  });

  it('indents task #5 into summary task #2 without turning task #4 into a summary', () => {
    // When indenting t-5 (currently under t-1 at depth 1, preceded by t-4 at depth 2):
    // It should join t-2 as 1.1.3, NOT become a subtask of t-4
    const newParentId = computeIndentParentId(sampleHierarchy, 't-5');
    expect(newParentId).toBe('t-2');

    // Simulate update in schedule
    const updated = sampleHierarchy.map(t => t.id === 't-5' ? { ...t, parentId: newParentId ?? null } : t);
    const scheduled = recalculateSchedule(updated, standardCalendar);

    const task2 = scheduled.find(t => t.id === 't-2')!;
    const task4 = scheduled.find(t => t.id === 't-4')!;
    const task5 = scheduled.find(t => t.id === 't-5')!;
    const task6 = scheduled.find(t => t.id === 't-6')!;

    expect(task2.wbsCode).toBe('1.1');
    expect(task2.isSummary).toBe(true);

    expect(task4.wbsCode).toBe('1.1.2');
    expect(task4.isSummary).toBe(false); // Task 4 must NOT become a summary!

    expect(task5.wbsCode).toBe('1.1.3'); // Task 5 becomes subtask 1.1.3 under Task 2!
    expect(task5.isSummary).toBe(false);

    expect(task6.wbsCode).toBe('1.2'); // Following sibling adjusts to 1.2
  });

  it('indents peer siblings directly under the preceding task when depths are equal', () => {
    // Both t-3 and t-4 are at depth 2 (parent: t-2). Indenting t-4 puts it under t-3
    const newParentId = computeIndentParentId(sampleHierarchy, 't-4');
    expect(newParentId).toBe('t-3');
  });

  it('prevents indenting the first child of a summary task', () => {
    // t-2 is the first child of t-1. Preceding task is t-1 (its current parent)
    const newParentId = computeIndentParentId(sampleHierarchy, 't-2');
    expect(newParentId).toBeUndefined();
  });

  it('outdents a task to its grandparent', () => {
    // Outdenting t-3 (parent: t-2, grandparent: t-1) should set parentId to t-1
    const newParentId = computeOutdentParentId(sampleHierarchy, 't-3');
    expect(newParentId).toBe('t-1');
  });

  it('outdents a task under root to null (root level)', () => {
    // Outdenting t-2 (parent: t-1, grandparent: null) should set parentId to null
    const newParentId = computeOutdentParentId(sampleHierarchy, 't-2');
    expect(newParentId).toBeNull();
  });

  it('indents multiple selected tasks together', () => {
    // Select both t-5 and t-6 (both currently at depth 1 under t-1)
    const selected = ['t-5', 't-6'];
    let currentList = [...sampleHierarchy];
    for (const id of selected) {
      const newParentId = computeIndentParentId(currentList, id);
      expect(newParentId).toBe('t-2');
      currentList = currentList.map(t => t.id === id ? { ...t, parentId: newParentId ?? null } : t);
    }
    const scheduled = recalculateSchedule(currentList, standardCalendar);
    expect(scheduled.find(t => t.id === 't-5')!.wbsCode).toBe('1.1.3');
    expect(scheduled.find(t => t.id === 't-6')!.wbsCode).toBe('1.1.4');
  });

  it('outdents multiple selected tasks together', () => {
    // Outdent both t-3 and t-4 from t-2 up to t-1
    const selected = ['t-3', 't-4'];
    let currentList = [...sampleHierarchy];
    for (const id of selected) {
      const newParentId = computeOutdentParentId(currentList, id);
      expect(newParentId).toBe('t-1');
      currentList = currentList.map(t => t.id === id ? { ...t, parentId: newParentId ?? null } : t);
    }
    const scheduled = recalculateSchedule(currentList, standardCalendar);
    expect(scheduled.find(t => t.id === 't-3')!.parentId).toBe('t-1');
    expect(scheduled.find(t => t.id === 't-4')!.parentId).toBe('t-1');
  });
});

describe('7. Milestone Zero-Duration Predecessor Scheduling', () => {
  it('schedules an FS successor on the exact same date as a milestone predecessor when lag is 0', () => {
    const tasks: Task[] = [
      {
        id: 'm-1',
        name: 'Project Start Milestone',
        wbsCode: '1.1',
        parentId: null,
        isSummary: false,
        isMilestone: true,
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        duration: 0,
        progress: 100,
        predecessors: []
      } as any,
      {
        id: 'm-2',
        name: 'IFC Drawings Milestone',
        wbsCode: '1.2',
        parentId: null,
        isSummary: false,
        isMilestone: true,
        startDate: '2026-11-05', // Initially different date
        endDate: '2026-11-05',
        duration: 0,
        progress: 0,
        predecessors: [{ taskId: 'm-1', type: 'FS', lag: 0 }]
      } as any,
      {
        id: 't-1',
        name: 'Design Work Activity',
        wbsCode: '1.3',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-05',
        endDate: '2026-11-12',
        duration: 5,
        progress: 0,
        predecessors: [{ taskId: 'm-1', type: 'FS', lag: 0 }]
      } as any
    ];

    const scheduled = recalculateSchedule(tasks, standardCalendar);

    const m1 = scheduled.find(t => t.id === 'm-1')!;
    const m2 = scheduled.find(t => t.id === 'm-2')!;
    const t1 = scheduled.find(t => t.id === 't-1')!;

    // Milestone 1 is on 2026-11-02
    expect(m1.startDate).toBe('2026-11-02');
    expect(m1.endDate).toBe('2026-11-02');

    // Milestone 2 linked via FS (0 lag) starts on the exact SAME date 2026-11-02
    expect(m2.startDate).toBe('2026-11-02');
    expect(m2.endDate).toBe('2026-11-02');

    // 5-day Activity linked via FS (0 lag) also starts on 2026-11-02 and finishes 5 working days later (2026-11-06)
    expect(t1.startDate).toBe('2026-11-02');
    expect(t1.endDate).toBe('2026-11-06');
  });

  it('respects lag when successor is linked to a milestone via FS with positive lag', () => {
    const tasks: Task[] = [
      {
        id: 'm-1',
        name: 'Notice to Proceed',
        wbsCode: '1.1',
        parentId: null,
        isSummary: false,
        isMilestone: true,
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        duration: 0,
        progress: 100,
        predecessors: []
      } as any,
      {
        id: 't-1',
        name: 'Mobilization (+2d Lag)',
        wbsCode: '1.2',
        parentId: null,
        isSummary: false,
        isMilestone: false,
        startDate: '2026-11-02',
        endDate: '2026-11-06',
        duration: 3,
        progress: 0,
        predecessors: [{ taskId: 'm-1', type: 'FS', lag: 2 }]
      } as any
    ];

    const scheduled = recalculateSchedule(tasks, standardCalendar);
    const t1 = scheduled.find(t => t.id === 't-1')!;

    // 2 working days after 2026-11-02 (Mon) is 2026-11-04 (Wed)
    expect(t1.startDate).toBe('2026-11-04');
    expect(t1.endDate).toBe('2026-11-06');
  });
});
