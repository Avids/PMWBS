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

### 3. Task Relationships (Up to 10 Dependencies)
* Supports all four standard CPM dependency types:
  * **FS** (Finish-to-Start)
  * **SS** (Start-to-Start)
  * **FF** (Finish-to-Finish)
  * **SF** (Start-to-Finish)
* Positive and negative lag (e.g. `2FS+3d`, `4SS-2d`, `5FF`).
* Auto-scheduling engine propagates dates through dependency chains.
* Interactive drag-and-drop dependency creation directly on the Gantt chart.

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

### 7. File Compatibility & Exports
* **Native File Format (`.wbs`)**: Clean human-readable JSON storing all tasks, calendars, WBS hierarchy, and baselines.
* **Microsoft Excel (`.xlsx`)**: Full structured export with indentations and computed metrics.
* **PDF & High-Resolution Print**: Print-ready styling with timeline and KPIs.
* **Browser LocalStorage**: Auto-saves every change instantly.
