<div align="center">

# 📊 PathMaster — Project Scheduling & WBS Management Suite

### A high-performance, lightweight project scheduling suite combining the analytical rigor of **Primavera P6** and **Microsoft Project** with the speed, responsiveness, and aesthetic precision of modern web applications.

[![React](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-FCC72B?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Features](#-key-features) · [Theme & Typography](#-professional-theme-suite--typography) · [Quick Start](#-quick-start) · [Keyboard Shortcuts](#-keyboard-shortcuts-msp--excel-style) · [CPM & Lag Syntax](#-cpm-relationships--lag-syntax) · [Activity Weight Engine](#7-activity-weight-calculation-primavera-p6-standard) · [File Formats](#-native-wbs-file-format)

</div>

---

## 🌟 Overview

**PathMaster** is purpose-built for project managers, planners, and project controls engineers who require the scheduling discipline of **Oracle Primavera P6** and **Microsoft Project** without the sluggishness of legacy enterprise software.

Built with **React 19, TypeScript, Tailwind CSS v4, and Vite**, PathMaster provides a split-pane workstation:
1. **Spreadsheet Grid** (left pane): High-density data grid with adjustable resizable columns, one-click smart auto-fit, direct clipboard copy/paste (`Ctrl+C` / `Ctrl+V`), in-cell editing, multi-task selection, WBS tree indentation, and automatic parent rollups.
2. **Interactive SVG Gantt Chart** (right pane): Visual drag-and-drop bar movement, duration resizing, dependency linking, background halo masking, slim task bars, downward-bracket summary bars, zero-duration milestone diamonds, and dual-bar baseline comparison.
3. **Day-Cell Boundary Alignment**: Pixel-perfect grid snapping from the first pixel of the start day to the last pixel of the end day, immune to Daylight Saving Time (DST) or partial hours.
4. **DOM Virtual Scrolling (Windowing)**: Powered by `@tanstack/react-virtual`, rendering only the active viewport rows on both the spreadsheet grid and Gantt timeline, scaling to **10,000+ tasks at 60 FPS**.

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

### 3. Adjustable Resizable Columns & Smart Auto-Fit
* **Interactive Drag-to-Resize**: Hover and drag column dividers in the header to resize any column to custom widths in real time.
* **Canvas-Accurate Smart Auto-Fit**: Measures the exact pixel width of header labels and all task data (including WBS hierarchy indentation, milestone badges, summary folder chevrons, and progress bar widgets) using an offscreen canvas.
  * **Double-Click Divider**: Instantly auto-fits that specific column to its widest content.
  * **Double-Click Row Header (`#`)**: Auto-fits all columns simultaneously.
  * **Header Context Menu**: Right-click any column header for quick access to *Auto-fit This Column*, *Auto-fit All Columns*, or *Reset to Default Widths*.
  * **One-Click ActionBar Button**: Click the **Auto-Fit** button in the top action ribbon.
* **Automatic LocalStorage Persistence**: Custom column widths persist across sessions and page reloads.

### 4. Direct Clipboard Copy-Paste from Excel & Sheets (`Ctrl+C` / `Ctrl+V`)
* **Multi-Column Spreadsheet Pasting**: Copy individual cells, rows, or rectangular blocks from Microsoft Excel or Google Sheets and paste directly into PathMaster.
* **Automatic Row Expansion**: If pasted data contains more rows than exist in the current project, PathMaster automatically creates and inserts the necessary task rows.
* **Predecessor Cell Copy/Paste**: Pasting into the Predecessors column automatically parses CPM dependencies (`2FS`, `3SS+2d`, `1.2FF`), checks for circular cycles, verifies self-references, and recalculates the schedule instantly.
* **Batch Paste into Multiple Tasks**: Select multiple tasks with Shift/Ctrl and paste a cell value into all of them simultaneously.

### 5. Task Notes Indicator & Instant Tooltip Preview
* **Visual Memo Indicator**: Tasks with notes display an unobtrusive `📝` note icon directly beside the task name.
* **Zero-Click Tooltip Preview**: Hovering your cursor over the note icon displays an instant, styled tooltip with the complete note content without having to open the Task Info dialog.
* **Clean Milestone Formatting**: 0-day milestones display a clean `0 d` duration without redundant text, and the timeline footer legend includes the milestone diamond symbol (`◆`).

### 6. Non-Destructive Multi-Level Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)
* Up to **50 history snapshots** preserved in memory.
* Undo/Redo works across all grid edits, timeline drag-and-drop operations, indents/outdents, and task additions or deletions.

### 7. Activity Weight Calculation (Primavera P6 Standard)
Choose how individual activities contribute to summary and project progress:
* **Time-Based (Duration)**: $W_i = \frac{\text{Duration}_i}{\sum \text{Duration}} \times 100$
* **Man-Hour Based (P6 Standard)**: $W_i = \frac{\text{PlannedMH}_i}{\sum \text{PlannedMH}} \times 100$
* **Equal Weight**: All child activities in a branch carry equal weight ($1/N$).
* **Weighted Progress Rollup**: 
  $$\text{Summary Progress} = \sum_{i=1}^N \left(\text{Child Progress}_i \times \frac{W_i}{100}\right)$$

### 8. Man-Hour Tracking & Earned Value Management
* **Planned Man-Hours (Budget / Estimate)** (defaults to 0 for new tasks)
* **Actual Man-Hours** (Spent to date)
* **Remaining Man-Hours** ($\max(0, \text{Planned} - \text{Actual})$)
* **Earned Man-Hours** ($(\text{Planned Man-Hours} \times \text{Progress}) / 100$)

### 9. Dual-Bar Baseline & Variance Tracking
* **Baseline Manager**: Snapshot and freeze multiple project baselines (*Baseline 1*, *Contract Award*, etc.).
* **Dual-Bar Gantt Rendering**: Compare active schedule bars against underlying baseline bars.
* **Schedule Slippage Tracking**: Automatic variance calculation ($EndDate - BaselineEndDate$), color-coded red for delays and green for early completion.

### 10. MSP Quick Progress Update & Two-Tier Ribbon Toolbar
* **Microsoft Project (MSP) Quick Progress Controls**: Instantly set activity progress to `0%`, `25%`, `50%`, `75%`, or `100%` directly from the top ribbon or right-click context menu.
  * Features authentic MSP-style horizontal mini-taskbar graphics with progressive black fill lines and percentage labels.
  * Fully supports single or multi-selected activities in a single click with automated earned man-hour recalculations and parent summary progress rollups.
  * Active progress percentage is highlighted with an illuminated badge.
* **Two-Tier Ribbon Toolbar**:
  * **Tier 1 (Task Operations & Shortcuts)**: Add Activity, Copy (`Ctrl+C`), Paste (`Ctrl+V`), Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Indent (`Alt+Right`), Outdent (`Alt+Left`), Expand All, Collapse All, Task Info dialog, direct **Notes** shortcut, direct **Resources** shortcut, Predecessors / Relationships dialog, and Delete.
  * **Tier 2 (Progress, Formatting & Timeline)**: MSP Quick Progress buttons (`0%`, `25%`, `50%`, `75%`, `100%`), Font Family selector, Font Size pills (`8pt`, `10pt`, `12pt`), Task Labels toggle (`ON`/`OFF`), Auto-Fit Columns, and Timeline Zoom (`In`, `Out`, `Fit`, `Days`, `Weeks`, `Months`).

### 11. Right-Click Context Menu & Multi-Tab Task Information Dialog
* **Right-Click Context Menu**: Right-click any activity in the spreadsheet grid or Gantt timeline to access:
  * 📊 **Quick Progress Buttons**: One-click pills for `0%`, `25%`, `50%`, `75%`, and `100%`.
  * ✏️ **Task Information** (Opens General tab)
  * 📝 **Task Notes...** (Directly opens Notes documentation tab)
  * 👥 **Resources & Man-Hours...** (Directly opens Resources tab)
  * 📋 **Copy Task** (`Ctrl+C`) & **Paste Task Below** (`Ctrl+V`)
  * 📋 **Duplicate Task** (duplicates task with `(Copy)` suffix, planned MH, and dependencies)
  * ➕ **Add Activity** (Below / Subtask Child)
  * 🔗 **Dependencies** (Edit Relationships / Remove All Links)
  * 🔄 **Convert** (Toggle between 0d Milestone and Normal Task)
  * 🗑️ **Delete Activity**
* **Task Information Modal**: Double-click on WBS / row # / Gantt bars to open a 4-tab dialog:
  * **General**: Name, ID, Start, End, Duration, Progress %, Color Picker.
  * **Dependency**: Predecessors, Types (FS, SS, FF, SF), and Lag.
  * **Resources**: Planned Man-Hours, Actual Man-Hours, Remaining, and Earned.
  * **Notes**: Rich task comments and documentation.

### 11. Interactive Drag & Drop Gantt Chart with Day-Cell Snapping
* **Refined Task Bar Thickness**: Slim 10px regular task bars (8px on small zoom, 13px on large zoom) provide a clean, modern aesthetic.
* **Downward-Bracket Summary Bars**: Summary tasks feature thin 7px roof bars with downward triangular brackets at start and finish dates, clearly distinguishing them from task bars on screen and in print.
* **Milestone Zero-Duration Diamonds**: 0-day milestones render as crisp diamonds. Linked Finish-to-Start successors start on the exact same date as the milestone (with 0 lag).
* **Exact Day-Cell Boundary Alignment**: Timeline coordinates snap to column-index boundaries from 0px of the start day to the full width of the end day, immune to Daylight Saving Time (DST) or partial allocated hours.
* **Zero Selection Displacement**: Inset box-shadow highlight ensures selecting rows never causes horizontal jumping or bar displacement.
* **Collision-Free Label Halo Mask**: Task labels feature dynamic background pill masks preventing overlap with CPM dependency lines.
* **Drag Task Bars & Handles**: Move activities along the timeline or drag edges to resize durations.
* **Drag Link Handles**: Connect tasks via drag-and-drop handles.
* **Mouse Panning & Timescale Zooming**: Hold and drag the canvas to pan smoothly across Day, Week, and Month tiers.

### 12. Reorganized 3-Tab Settings Modal & Project Information
* **3-Tab Settings Modal**:
  * 📅 **Calendar & Work Week**: Configure working days (flexible 4-day, 5-day, or 6-day work weeks), work hours per day, and statutory holiday exceptions with instant addition/removal.
  * 🎨 **Appearance & Themes**: Select from 5 construction and engineering color palettes and 6 enterprise typography styles with instant live previews.
  * ⚖️ **Calculations & Weights**: Switch activity weight calculation mode (Duration, Man-Hour, or Equal) and customize the project currency symbol.
* **Project Information Modal**:
  * Comprehensive project profile dialog to track Project Name, Project Number (`#`), Company/Client, Jobsite Address, Lead Scheduler/Author, Schedule Target Start Date, and Project Notes alongside real-time task count, total man-hours, and finish date stats.

### 13. Advanced Vector PDF Export & Multi-Format Interoperability
* **PDF Export Engine**:
  * Standard North American paper sizes prioritized (**Letter**, **11x17 Tabloid**, **Legal**, plus **A4**, **A3**).
  * Timescale grouping options (**Days**, **Weeks**, **Months**).
  * Filter by **Task ID Range** (`From ID` to `To ID`).
  * Option to toggle the Gantt chart on/off for pure tabular reports.
  * Vector SVG downward summary brackets (`▼`) for clean, crisp presentation.
  * Unbroken orthogonal CPM relationship lines with exact-pixel vertex joins.
  * Streamlined compact export dialog with auto-scrolling dropdowns.
  * Corporate metadata typography and high-resolution vector printing.
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
| **Custom Palette** | Fully Personalized | User-customized hex colors for task bars, progress fills, summaries, milestones, headers, borders, surfaces, and dark/light contrast. |

### 🎨 Custom Palette Studio & Live Visualizer
Create your own personalized company or project color palette:
* **Interactive Live Visualizer**: Preview your customized palette on summary bars, progress bars, milestone diamonds, critical paths, and data grids in real time before applying.
* **1-Click Base Preset Cloner**: Start from any existing corporate theme (*Modern Enterprise*, *Construction*, *Primavera P6*, *Steel & Amber*, *Dark Mode*) and fine-tune individual colors without building from scratch.
* **Full Token Customization**:
  * **Gantt Activities**: Task bars, progress fills, summary phase roofs/brackets, milestone diamonds, critical path/delay flags, today line signal, and baseline bars.
  * **Surfaces & Interface**: Header ribbon, header text, app canvas background, table/timeline surfaces, and grid borders.
  * **Theme Contrast Mode**: One-click toggle between Light Mode and Dark Mode contrast optimization.
* **Full Persistence & Export**: Custom palettes are auto-saved to project `.wbs` files, persisted in LocalStorage, and carried cleanly into high-resolution vector PDF exports.

### Typography Options
Switch between enterprise fonts instantly via the **Action Bar Font dropdown** or in **Settings → Appearance & Themes**:
* **Segoe UI**: Modern Microsoft standard with crisp tabular figures.
* **Calibri**: Warm, corporate executive standard.
* **Verdana**: Renowned high readability with generous apertures for dense numbers.
* **Inter**: Clean tech and SaaS standard.
* **Barlow (DIN)**: DIN-style technical engineering aesthetic.
* **Arial / System**: Universal sans-serif fallback for consistent cross-platform rendering.

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
| **Delete** / **Ctrl + Delete** | Delete selected task(s) and their subtasks |
| **Alt + →** | **Indent** task or multi-selected tasks |
| **Alt + ←** | **Outdent** task or multi-selected tasks |
| **Ctrl + C** | Copy active cell value to clipboard |
| **Ctrl + S** | Save project as native `.wbs` file |
| **F1** | Open **Help & Documentation** dialog |
| **Escape** | Close modal dialogs / cancel in-cell edit |
| **Double-Click Divider** | Auto-fit column width to content |
| **Double-Click `#` Header** | Auto-fit all grid columns |

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
│   │   ├── ActionBar.tsx            # View controls, Font dropdown & sizes, Zoom tier, Undo/Redo, Auto-fit
│   │   ├── SpreadsheetGrid.tsx      # Keyboard data grid with Excel paste, virtual scroll & notes tooltips
│   │   ├── GanttTimeline.tsx        # Interactive SVG Gantt with drag-and-drop, downward summary brackets & halo masks
│   │   ├── TaskContextMenu.tsx      # Right-click contextual operations menu
│   │   ├── TaskInformationModal.tsx # 4-tab Task Properties dialog (General, Dep, Res, Notes)
│   │   ├── PredecessorModal.tsx     # Visual relationship and lag editor (up to 10 dependencies)
│   │   ├── BaselineModal.tsx        # Project baseline snapshot manager
│   │   ├── ProjectInfoModal.tsx     # Project metadata (Name, Number, Company, Address, Author)
│   │   ├── ProjectSettingsModal.tsx # 3-tab Settings (Calendar & Work Week, Appearance, Calculations)
│   │   ├── ExportModal.tsx          # PDF page setup, timescale & task range export dialog
│   │   └── HelpModal.tsx            # 8-topic searchable Help & Documentation dialog
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
