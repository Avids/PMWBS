# WBS Master: Industrial Project Scheduling Suite (MSP & Primavera P6 Architecture)

## Overview
**WBS Master** is an enterprise-grade project scheduling and Work Breakdown Structure (WBS) management engine built with **React 19, TypeScript, Vite, and Tailwind CSS**. It bridges the deep scheduling power of **Primavera P6** and **Microsoft Project** with a responsive, modern interface designed to remain accessible for novice users while offering full professional CPM capabilities.

---

## Key Features & Architectural Highlights

### 1. WBS Tree & Hierarchy
* Automatic recursive WBS numbering (`1.0`, `1.1`, `1.1.2`, etc.).
* Summary task auto-rollup:
  * Start Date = $\min(\text{Children.StartDate})$
  * End Date = $\max(\text{Children.EndDate})$
  * Duration = Working days between summary start and finish.
  * Man-Hours rollup: Planned, Actual, Remaining, and Earned.
* Direct keyboard indent (`Alt + Right Arrow`) and outdent (`Alt + Left Arrow`).

### 2. Activity Weight Calculation Engine (Primavera P6 Standard)
Three distinct weight distribution modes:
1. **Time-Based (Duration)**:
   $$W_i = \frac{\text{Duration}_i}{\sum \text{Duration}} \times 100$$
2. **Man-Hour Based**:
   $$W_i = \frac{\text{PlannedMH}_i}{\sum \text{PlannedMH}} \times 100$$
3. **Equal Weight**:
   $$W_i = \frac{1}{N} \times 100$$
Summary Progress rollup:
$$\text{Summary Progress} = \sum_{i=1}^N \left(\text{Progress}_i \times \frac{W_i}{100}\right)$$

### 3. Task Relationships & Lag Duration (Up to 10 Dependencies)
* Supports all four standard CPM dependency types:
  * **FS** (Finish-to-Start): Successor starts after predecessor completes.
  * **SS** (Start-to-Start): Successor starts simultaneously with predecessor.
  * **FF** (Finish-to-Finish): Successor finishes simultaneously with predecessor.
  * **SF** (Start-to-Finish): Successor finishes after predecessor starts.
* **Positive and Negative Lag / Duration Gap**:
  * e.g. `2FS+5d` (5 working days gap between task 2 finish and task start).
  * e.g. `3SS+2d` (starts 2 days after task 3 starts).
  * e.g. `4FF-1d` (finishes 1 day before task 4 finishes).
* **Two Ways to Configure**:
  1. **Direct Keyboard Entry**: Type e.g. `2FS+5d` directly in the Predecessors cell. The parser automatically resolves row numbers, WBS codes, or IDs.
  2. **Visual Predecessor Modal**: Click the Relationship button or icon on the cell to configure up to 10 predecessors with task dropdowns, relationship types, and numeric lag in days.
* **Interactive Gantt Dependency Badges**:
  * Relationship lines display relationship tags (e.g., `FS+5d`).
  * Clicking a dependency line on the Gantt chart opens the relationship editor directly.

### 4. Actual vs Plan & Baseline Variance Tracking
* **Baseline Manager**: Snapshot and save baseline plans (Baseline 1, Baseline 2, etc.).
* **Dual-Bar Gantt Rendering**: Displays active planned/actual bar with an underlying baseline bar.
* **Variance Indicator**: Automatic calculation of schedule variance in days ($EndDate - BaselineEndDate$). Color-coded red for delays and green for ahead of schedule.

### 5. Man-Hour Tracking
* Planned Man-Hours (Budget / Estimate).
* Actual Man-Hours spent.
* Remaining Man-Hours.
* Earned Man-Hours = $(\text{PlannedMH} \times \text{Progress}) / 100$.

### 6. Easy Data Entry by Keyboard (Spreadsheet Mode)
* Arrow keys navigation across rows and columns.
* `Enter` commits edits and moves down (or appends a new row at the bottom).
* `Tab` / `Shift+Tab` navigates between fields.
* `F2` or double-click activates cell editing.
* `Insert` inserts an activity below the selection.
* `Ctrl+Delete` removes the activity and children.

### 7. File Compatibility & Multi-Format Exports
* **Native File Format (`.wbs`)**: Clean human-readable JSON storing all tasks, calendars, WBS hierarchy, and baselines.
* **Microsoft Excel (`.xlsx`)**: Full structured export with indentations and computed metrics.
* **Comprehensive Export to PDF & PNG Modal**:
  * Modeled after the OnlineGantt export interface with customizable settings.
  * **Formats**: PDF Document (`.pdf`) and High-Resolution PNG Image (`.png`).
  * **Header**: Project Name & Date, Project Name, or None.
  * **Footer**: Schedule Summary, Total Duration, or None.
  * **Columns**: Core Columns (WBS, Name, Duration, Dates, Progress), WBS + Name only, or All Columns.
  * **Timeline**: Zoom to fit or Full Timeline.
  * **Page Setup**: A4 / A3 (Wide) / Letter in Landscape or Portrait orientation.
  * **Resolution**: 1x (Standard), 2x (High-Res 300 DPI Print Quality), or 3x (Ultra Sharp).
  * Uses vector/canvas rendering to capture the unconstrained full schedule without clipping or scrollbars.
* **Browser LocalStorage**: Auto-saves every change instantly.
