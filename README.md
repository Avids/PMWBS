<div align="center">

# 📊 PathMaster — Project Scheduling & WBS Management Suite

### A powerful, lightweight project scheduling engine combining the analytical depth of **Primavera P6** and **Microsoft Project** with the speed of modern web apps.

[![React](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Features](#-key-features) · [Quick Start](#-quick-start) · [Keyboard Shortcuts](#-keyboard-shortcuts-msp-style) · [CPM Relationships & Lag](#-cpm-relationships--lag-syntax) · [Activity Weight Engine](#-activity-weight-calculation-primavera-p6) · [File Formats](#-native-wbs-file-format)

</div>

---

## 🌟 Overview

**PathMaster** is designed for project managers, planners, and schedulers who want the rigorous scheduling capabilities of **Primavera P6** and **Microsoft Project** without the steep learning curve or heavy desktop installations.

Built with **React 19, TypeScript, and Tailwind CSS**, PathMaster features a split-pane layout:
1. **Spreadsheet Grid** on the left: Fast, keyboard-driven data entry with in-cell editing, WBS tree indentation, and automatic parent rollups.
2. **Interactive SVG Gantt Chart** on the right: Visual drag-and-drop bar movement, duration resizing, dependency linking, and dual-bar baseline comparison.

---

## 🚀 Key Features

### 1. WBS Tree Hierarchy & Automatic Summary Rollups
* **Recursive WBS Codes**: Automatically computes hierarchical numbering (`1.0`, `1.1`, `1.1.2`, etc.).
* **Summary Activity Rollup**:
  * **Start Date**: Automatically set to the earliest child start date.
  * **Finish Date**: Automatically set to the latest child finish date.
  * **Duration**: Working days between summary start and finish.
  * **Man-Hours**: Automatically sums Planned, Actual, Remaining, and Earned Man-Hours from child activities.
* **Instant Indent / Outdent**: Restructure the schedule using `Alt + Right Arrow` (Indent) and `Alt + Left Arrow` (Outdent) or toolbar buttons.

### 2. Full CPM Relationships (FS, SS, FF, SF) & Lag Duration
* Supports all four Critical Path Method dependency types:
  * **FS (Finish-to-Start)**: Successor starts after predecessor completes (*Default*).
  * **SS (Start-to-Start)**: Successor starts simultaneously with predecessor.
  * **FF (Finish-to-Finish)**: Successor finishes simultaneously with predecessor.
  * **SF (Start-to-Finish)**: Successor finishes after predecessor starts.
* **Lag / Lead Support**: Add positive gaps (e.g. `2FS+5d` for 5 days gap) or negative lead times (e.g. `3SS-2d`).
* **Visual Predecessor Modal**: Manage up to **10 predecessors per activity** using a dedicated dialog or type directly in the grid.
* **Interactive Gantt Dependency Badges**: Hovering on connection lines displays relationship tags (e.g. `FS+5d`), and clicking opens the relationship dialog.

### 3. Activity Weight Calculation (Primavera P6 Standard)
Choose how individual activities contribute to summary and project progress:
* **Time-Based (Duration)**: $W_i = \frac{\text{Duration}_i}{\sum \text{Duration}} \times 100$
* **Man-Hour Based (P6 Standard)**: $W_i = \frac{\text{PlannedMH}_i}{\sum \text{PlannedMH}} \times 100$
* **Equal Weight**: All child activities in a branch carry equal weight ($1/N$).
* **Weighted Progress Rollup**: 
  $$\text{Summary Progress} = \sum_{i=1}^N \left(\text{Child Progress}_i \times \frac{W_i}{100}\right)$$

### 4. Man-Hour Tracking & Earned Value
* **Planned Man-Hours (Budget / Estimate)**
* **Actual Man-Hours** (Spent to date)
* **Remaining Man-Hours** ($\max(0, \text{Planned} - \text{Actual})$)
* **Earned Man-Hours** ($(\text{Planned Man-Hours} \times \text{Progress}) / 100$)

### 5. Actual vs. Plan & Baseline Variance Tracking
* **Baseline Manager**: Snapshot and freeze project baselines (*Baseline 1*, *Contract Award*, etc.).
* **Dual-Bar Gantt Rendering**: View the active schedule bar alongside an underlying yellow baseline bar.
* **Schedule Slippage Tracking**: Automatic variance calculation ($EndDate - BaselineEndDate$), color-coded red for delays and green for early completion.

### 6. Interactive Drag & Drop Gantt Chart
* **Drag Task Bars**: Move activities along the timeline with automatic predecessor date propagation.
* **Drag Edge Handles**: Resize task duration directly from the chart.
* **Drag Link Handles**: Drag connector dots between tasks to create new Finish-to-Start dependency lines.

### 7. File Compatibility & Multi-Format Exports
* **Native `.wbs` File**: Save and load complete project schedules (tasks, baselines, calendars, weights) as JSON files.
* **Excel Export (`.xlsx`)**: One-click export to formatted spreadsheets with WBS hierarchy indentations.
* **PDF / High-Resolution Print**: Clean printable layout for progress meetings and executive reports.
* **Auto-Save**: Changes are persisted to browser `localStorage` in real time.

---

## ⌨️ Keyboard Shortcuts (MSP Style)

| Key Binding | Action |
| :--- | :--- |
| **Arrow Keys** (`↑`, `↓`, `←`, `→`) | Navigate between cells in the spreadsheet |
| **Enter** | Commit edit and move to the next row (appends new row if at bottom) |
| **Tab** / **Shift + Tab** | Move to the next / previous column |
| **F2** or **Double-Click** | Edit selected cell |
| **Escape** | Cancel in-cell edit |
| **Insert** | Insert a new task below selection |
| **Ctrl + Delete** | Delete selected task and all subtasks |
| **Alt + →** | **Indent** task (make it child of the task above) |
| **Alt + ←** | **Outdent** task (promote task up one hierarchy level) |

---

## 🔗 CPM Relationships & Lag Syntax

You can enter relationships directly into the **Predecessors** column using intuitive syntax:

| Syntax | Description | Example |
| :--- | :--- | :--- |
| `2` or `2FS` | Finish-to-Start (Starts after Row 2 finishes) | `2FS` |
| `2FS+5d` | Finish-to-Start with **5 working days gap** | `2FS+5d` |
| `3SS+2d` | Start-to-Start (Starts 2 working days after Row 3 starts) | `3SS+2d` |
| `4FF` | Finish-to-Finish (Finishes when Row 4 finishes) | `4FF` |
| `4FF-2d` | Finish-to-Finish with 2 days lead time | `4FF-2d` |
| `2FS, 3SS+2d` | **Multiple Predecessors** (comma separated, up to 10) | `2FS, 3SS+2d, 4FF` |

> [!TIP]
> You can also click the **Relationships** button on the grid toolbar or click any dependency line on the Gantt chart to configure relationships visually.

---

## 💾 Native `.wbs` File Format

PathMaster saves schedules as human-readable JSON files with a `.wbs` extension:

```json
{
  "version": "1.0",
  "meta": {
    "name": "Commercial Facility Project",
    "startDate": "2026-11-02",
    "weightMode": "duration",
    "calendar": {
      "workingDays": [1, 2, 3, 4, 5],
      "holidays": [],
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
* **pnpm** (or npm / yarn)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Avids/PathMaster.git
cd PathMaster

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
# Type check and build
pnpm build

# Preview production build
pnpm preview
```

---

## 🏗️ Project Architecture

```
PathMaster/
├── src/
│   ├── types/
│   │   └── project.ts               # Core data models, Task, Calendar, Baselines
│   ├── engine/
│   │   ├── scheduler.ts             # Forward pass CPM, Working day calendar, Weight rollup
│   │   └── importers.ts             # Native .wbs file serializer, Excel XLSX exporter
│   ├── components/
│   │   ├── Toolbar.tsx              # Application Ribbon with KPIs, File, Export, Baseline tools
│   │   ├── SpreadsheetGrid.tsx      # Keyboard-navigable spreadsheet grid with WBS tree
│   │   ├── GanttTimeline.tsx        # Interactive SVG Gantt with drag-and-drop & baseline bars
│   │   ├── PredecessorModal.tsx     # Visual relationship and lag editor (up to 10 dependencies)
│   │   ├── BaselineModal.tsx        # Project baseline snapshot manager
│   │   └── ProjectSettingsModal.tsx # Calendar, working hours, and weight mode settings
│   ├── App.tsx                      # Root application state & resizable split pane
│   ├── main.tsx                     # React entrypoint
│   └── index.css                    # Tailwind CSS v4 & custom scrollbar styles
├── PROJECT_LOG.md                   # Detailed technical documentation & decision log
└── package.json
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
