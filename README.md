<div align="center">

# 📊 PathMaster — Project Scheduling & WBS Management Suite

### A high-performance, lightweight project scheduling suite combining the analytical rigor of **Primavera P6** and **Microsoft Project** with the speed, responsiveness, and aesthetic precision of modern web applications.

[![React](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-FCC72B?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Features](#-key-features) · [Theme & Typography](#-professional-theme-suite--typography) · [Quick Start](#-quick-start) · [Keyboard Shortcuts](#-keyboard-shortcuts-msp--excel-style) · [CPM & Lag Syntax](#-cpm-relationships--lag-syntax) · [Activity Weight Engine](#-activity-weight-calculation-primavera-p6) · [File Formats](#-native-wbs-file-format)

</div>

---

## 🌟 Overview

**PathMaster** is purpose-built for project managers, planners, and project controls engineers who require the scheduling discipline of **Oracle Primavera P6** and **Microsoft Project** without the sluggishness of legacy enterprise software.

Built with **React 19, TypeScript, Tailwind CSS v4, and Vite**, PathMaster provides a split-pane workstation:
1. **Spreadsheet Grid** (left pane): High-density data grid with direct Excel/Sheets clipboard paste (`Ctrl+V`), in-cell editing, WBS tree indentation, and automatic parent rollups.
2. **Interactive SVG Gantt Chart** (right pane): Visual drag-and-drop bar movement, duration resizing, dependency linking, background halo masking, and dual-bar baseline comparison.
3. **DOM Virtual Scrolling (Windowing)**: Powered by `@tanstack/react-virtual`, rendering only the ~35 active viewport rows on both the spreadsheet grid and Gantt timeline, scaling to **10,000+ tasks at 60 FPS**.

---

## 🚀 Key Features

### 1. WBS Tree Hierarchy & Automatic Summary Rollups
* **Recursive WBS Code Calculation**: Auto-generates hierarchical numbering (`1`, `1.1`, `1.1.1`, etc.).
* **Summary Activity Rollups**:
  * **Start Date**: Earliest child start date.
  * **Finish Date**: Latest child finish date.
  * **Duration**: Total working days between summary start and finish.
  * **Man-Hours**: Auto-sums Planned, Actual, Remaining, and Earned Man-Hours from child activities.
  * **Progress %**: Computed via configurable weighted distribution.
* **Instant Indent / Outdent**: `Alt + Right Arrow` (Indent) and `Alt + Left Arrow` (Outdent), or via toolbar and context menu.

### 2. Full CPM Relationships, Lag & Cycle Detection
* **All 4 CPM Relationship Types**:
  * **FS (Finish-to-Start)**: Successor starts after predecessor completes (*Default*).
  * **SS (Start-to-Start)**: Successor starts simultaneously with predecessor.
  * **FF (Finish-to-Finish)**: Successor finishes simultaneously with predecessor.
  * **SF (Start-to-Finish)**: Successor finishes after predecessor starts.
* **Positive Lag & Negative Lead**: Enter gaps such as `2FS+5d` (5 working days gap) or lead times like `3SS-2d`.
* **Real-time Cycle Detection Engine**: Detects circular dependency chains (`Task A → Task B → Task A`) before schedule recalculation, preventing deadlocks with warning notifications.
* **Interactive Dependency Badges**: Click any dependency connection line on the Gantt chart to edit type and lag duration.

### 3. Direct Excel & Google Sheets Clipboard Copy-Paste (`Ctrl+C` / `Ctrl+V`)
* Copy rows or rectangular blocks of cells directly from **Microsoft Excel** or **Google Sheets** and paste into PathMaster (`Ctrl+V`).
* Automatically maps columns starting at the selected cell: Task Name, Duration, Start Date, End Date, % Complete, Predecessors, Planned MH, Actual MH, and Notes.

### 4. Non-Destructive Multi-Level Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)
* Up to **50 history snapshots** preserved in memory.
* Undo/Redo works across all grid edits, timeline drag-and-drop operations, indents/outdents, and task additions or deletions.

### 5. Activity Weight Calculation (Primavera P6 Standard)
Choose how individual activities contribute to summary and project progress:
* **Time-Based (Duration)**: $W_i = \frac{\text{Duration}_i}{\sum \text{Duration}} \times 100$
* **Man-Hour Based (P6 Standard)**: $W_i = \frac{\text{PlannedMH}_i}{\sum \text{PlannedMH}} \times 100$
* **Equal Weight**: All child activities in a branch carry equal weight ($1/N$).
* **Weighted Progress Rollup**: 
  $$\text{Summary Progress} = \sum_{i=1}^N \left(\text{Child Progress}_i \times \frac{W_i}{100}\right)$$

### 6. Man-Hour Tracking & Earned Value Management
* **Planned Man-Hours (Budget / Estimate)** (defaults to 0 for new tasks)
* **Actual Man-Hours** (Spent to date)
* **Remaining Man-Hours** ($\max(0, \text{Planned} - \text{Actual})$)
* **Earned Man-Hours** ($(\text{Planned Man-Hours} \times \text{Progress}) / 100$)

### 7. Dual-Bar Baseline & Variance Tracking
* **Baseline Manager**: Snapshot and freeze multiple project baselines (*Baseline 1*, *Contract Award*, etc.).
* **Dual-Bar Gantt Rendering**: Compare active schedule bars against underlying baseline bars.
* **Schedule Slippage Tracking**: Automatic variance calculation ($EndDate - BaselineEndDate$), color-coded red for delays and green for early completion.

### 8. Right-Click Context Menu & Multi-Tab Task Information Dialog
* **Right-Click Context Menu**: Right-click any task in the spreadsheet grid or Gantt timeline to access:
  * ✏️ **Task Information**
  * 🗑️ **Delete Task**
  * ➕ **Add Task** (Add Task Below / Add Subtask Child)
  * 📋 **Duplicate Task** (duplicates task with `(Copy)` suffix, planned MH, and dependencies)
  * 🔗 **Delete Dependency** (Clears predecessor relationships)
  * 🔄 **Convert** (Toggle between 0d Milestone and Normal Task)
* **Task Information Modal**: Double-click on WBS / row # / Gantt bars to open a 4-tab dialog:
  * **General**: Name, ID, Start, End, Duration, Progress %, Color Picker.
  * **Dependency**: Predecessors, Types (FS, SS, FF, SF), and Lag.
  * **Resources**: Planned Man-Hours, Actual Man-Hours, Remaining, and Earned.
  * **Notes**: Rich task comments and documentation.

### 9. Interactive Drag & Drop Gantt Chart with Halo Masking
* **Collision-Free Label Halo Mask**: Task labels feature dynamic background pill masks preventing overlap with CPM dependency lines.
* **Drag Task Bars**: Move activities along the timeline with automatic successor date propagation.
* **Drag Edge Handles**: Resize task duration directly from the chart edges.
* **Drag Link Handles**: Connect tasks via drag-and-drop connection handles.
* **Mouse Panning**: Hold and drag the canvas to pan smoothly across months and years.
* **Timescale Zooming**: Seamless zoom levels across Day, Week, and Month tiers.

### 10. Advanced PDF Export & Multi-Format Interoperability
* **PDF Export Engine**:
  * Standard North American paper sizes prioritized (**Letter**, **11x17 Tabloid**, **Legal**, plus **A4**, **A3**).
  * Timescale grouping options (**Days**, **Weeks**, **Months**).
  * Filter by **Task ID Range** (`From ID` to `To ID`).
  * Option to toggle the Gantt chart on/off for pure tabular reports.
  * Corporate metadata typography and vector CPM relationship lines.
* **File Compatibility**:
  * **Native `.wbs` File**: Save and load complete project schedules (tasks, baselines, calendars, weights) as JSON files.
  * **Excel Import & Export (`.xlsx`)**: Import schedules directly from Excel spreadsheets or export with hierarchical formatting.
  * **Microsoft Project XML**: Open `.xml` schedules exported from Microsoft Project.

---

## 🎨 Professional Theme Suite & Typography

PathMaster includes five distinct theme palettes engineered for diverse work environments:

| Theme | Target Environment | Key Characteristics |
| :--- | :--- | :--- |
| **Modern Enterprise** | SaaS / Corporate Office | Deep navy ribbon, soft slate canvas, standard royal blue task bars. |
| **Construction & Engineering** | Field Office & Job Site | Rugged concrete grays, structural blue-grey bars, safety orange signals. |
| **High-Contrast Data (P6)** | Heavy Planning & Controls | Forest green bars, crimson critical path, crisp black grid lines. |
| **Industrial Steel & Amber** | Industrial Projects | Dark graphite header, industrial steel summary bars, construction amber alerts. |
| **Precision Dark Mode** | Night Shift & Trailer Screens | Low-glare obsidian surfaces, high-contrast text, reduced eye strain. |

### Typography Options
Switch between enterprise fonts in **Project Settings → Display & Theme**:
* **Segoe UI**: Modern Microsoft standard with crisp tabular figures.
* **Calibri**: Warm, corporate executive standard.
* **Verdana**: Renowned high readability with generous apertures for dense numbers.
* **Inter**: Clean tech and SaaS standard.
* **Barlow**: DIN-style technical engineering aesthetic.

---

## ⌨️ Keyboard Shortcuts (MSP & Excel Style)

| Key Binding | Action |
| :--- | :--- |
| **Arrow Keys** (`↑`, `↓`, `←`, `→`) | Navigate between cells in the spreadsheet |
| **Enter** | Enter in-cell edit mode / Commit edit and move to next row |
| **F2** or **Double-Click** | Edit selected cell |
| **Escape** | Cancel in-cell edit |
| **Tab** / **Shift + Tab** | Move to next / previous column |
| **Ctrl + Z** | **Undo** last action (up to 50 steps) |
| **Ctrl + Y** / **Ctrl + Shift + Z** | **Redo** action |
| **Ctrl + V** | **Paste from Clipboard** (supports copying columns/rows from Excel) |
| **Insert** | Insert a new task below current selection |
| **Ctrl + Delete** | Delete selected task and all subtasks |
| **Alt + →** | **Indent** task (make child of previous task) |
| **Alt + ←** | **Outdent** task (promote task up one hierarchy level) |

---

## 🔗 CPM Relationships & Lag Syntax

Enter dependencies directly into the **Predecessors** column using industry-standard shorthand:

| Syntax | Description | Example |
| :--- | :--- | :--- |
| `2` or `2FS` | Finish-to-Start (Starts after Row 2 finishes) | `2FS` |
| `2FS+5d` | Finish-to-Start with **5 working days gap** | `2FS+5d` |
| `3SS+2d` | Start-to-Start (Starts 2 working days after Row 3 starts) | `3SS+2d` |
| `4FF` | Finish-to-Finish (Finishes when Row 4 finishes) | `4FF` |
| `4FF-2d` | Finish-to-Finish with 2 days lead time | `4FF-2d` |
| `2FS, 3SS+2d` | **Multiple Predecessors** (comma separated, up to 10) | `2FS, 3SS+2d, 4FF` |

---

## 💾 Native `.wbs` File Format

PathMaster stores schedules as human-readable JSON files with the `.wbs` extension:

```json
{
  "version": "1.0",
  "meta": {
    "name": "Commercial Facility Project",
    "startDate": "2026-11-02",
    "weightMode": "duration",
    "calendar": {
      "workingDays": [1, 2, 3, 4, 5],
      "holidays": ["2026-11-26"],
      "hoursPerDay": 8
    }
  },
  "baselines": [],
  "tasks": [
    {
      "id": "t-1",
      "wbsCode": "1.1",
      "name": "Engineering Design",
      "startDate": "2026-11-02",
      "endDate": "2026-11-13",
      "duration": 10,
      "progress": 60,
      "predecessors": [
        { "taskId": "t-0", "type": "FS", "lag": 5 }
      ],
      "plannedManHours": 120,
      "actualManHours": 70,
      "weight": 50
    }
  ]
}
```

---

## 🛠️ Quick Start

### Prerequisites
* **Node.js** (v18+)
* **npm** or **pnpm**

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/Avids/PMWBS.git
cd PMWBS

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Automated Testing

Run the Vitest scheduling engine unit test suite:

```bash
npm test
```

### Production Build

```bash
# Type check and build client bundle
npm run build

# Preview production build
npm run preview
```

---

## 🏗️ Project Architecture

```
PMWBS/
├── src/
│   ├── types/
│   │   └── project.ts               # Core data models, Task, Calendar, Baselines, Themes
│   ├── engine/
│   │   ├── scheduler.ts             # Forward pass CPM, Working day calendar, Cycle detection
│   │   ├── importers.ts             # Native .wbs serializer, Excel / MSP XML parsers
│   │   ├── excelImporter.ts         # Excel spreadsheet sheet-to-task mapper
│   │   ├── pdfExport.ts             # jsPDF multi-scale, multi-page vector PDF generator
│   │   └── __tests__/
│   │       └── scheduler.test.ts    # Vitest suite (calendar math, CPM pass, cycle tests)
│   ├── theme/
│   │   └── themeConfig.ts           # 5 Color themes, typography configs & swatch definitions
│   ├── components/
│   │   ├── Toolbar.tsx              # Top ribbon: File menu, Theme switcher, KPI stats
│   │   ├── ActionBar.tsx            # View controls, Indent/Outdent, Undo/Redo, Zoom tier
│   │   ├── SpreadsheetGrid.tsx      # Keyboard data grid with Excel paste & WBS tree
│   │   ├── GanttTimeline.tsx        # Interactive SVG Gantt with drag-and-drop & halo masks
│   │   ├── TaskContextMenu.tsx      # Right-click contextual operations menu
│   │   ├── TaskInformationModal.tsx # 4-tab Task Properties dialog (General, Dep, Res, Notes)
│   │   ├── PredecessorModal.tsx     # Visual relationship and lag editor (up to 10 dependencies)
│   │   ├── BaselineModal.tsx        # Project baseline snapshot manager
│   │   ├── ProjectSettingsModal.tsx # 4-tab Settings (General, Calendar, Weight, Appearance)
│   │   └── ExportModal.tsx          # PDF page setup, timescale & task range export dialog
│   ├── services/
│   │   └── platform.ts              # Native desktop / browser file dialog abstractions
│   ├── App.tsx                      # Root application state, undo/redo stack & split pane
│   ├── main.tsx                     # React entrypoint
│   └── index.css                    # Tailwind CSS v4 & custom scrollbar styles
├── electron/
│   └── main.ts                      # Optional Electron desktop wrapper
├── package.json
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
