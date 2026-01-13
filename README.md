**TaskGlitch — Local Task Dashboard**

- **Purpose:** A lightweight React + Vite task dashboard with analytics (ROI, throughput, funnel) and CRUD operations for tasks.
- **Tech:** `React` + `TypeScript`, `Vite`, `MUI` (Material UI), `@mui/x-charts`.

**Quick Start**
- **Install:**
```powershell
npm install
```
- **Run (dev):**
```powershell
npm run dev
```
- **Build:**
```powershell
npm run build
```
- **Preview production build:**
```powershell
npm run preview
```

**Project Structure (important files)**
- **`src/`**: application source
  - `App.tsx` — app shell, activity log wiring
  - `hooks/useTasks.ts` — main task state, loader, CRUD, undo
  - `context/TasksContext.tsx` — context provider
  - `components/` — UI components (TaskTable, TaskForm, TaskDetailsDialog, ActivityLog, UndoSnackbar, dashboards)
  - `utils/logic.ts` — analytics helpers (ROI, sorting, metrics)
  - `utils/csv.ts` — CSV export helpers
  - `utils/seed.ts` — fake data generator

**Notable fixes and hardening applied**
(These changes were applied to stabilize the app and fix reported bugs.)
- **Duplicate fetch prevention:** Added a module-level guard so the initial `/tasks.json` fetch runs exactly once (fixes StrictMode double-invoke / duplicate data).
- **Sanitization on load:** `normalizeTasks` now validates and normalizes incoming task data (unique ids, non-empty titles, numeric revenue/time, valid enums, sane timestamps).
- **Stable sorting:** `sortTasks` uses a deterministic tie-breaker (title → createdAt → id) instead of random ordering to prevent UI flicker.
- **Undo snackbar:** Closing the snackbar clears the `lastDeleted` state so undo only works while the snackbar is visible.
- **Dialog click handling:** Edit/Delete action buttons call `stopPropagation()` so a row click (View) does not also open.
- **ROI safety & formatting:** `computeROI` returns `null` for invalid inputs (time <= 0 or non-finite values); UI shows `—` for N/A and formats numeric values to two decimals.
- **CSV export:** Stable headers and robust escaping (quotes doubled, fields with commas/newlines quoted).
- **XSS prevention:** `notes` are rendered as plain text (removed `dangerouslySetInnerHTML`).

**How to verify the common bug fixes**
- Refresh the page and open DevTools > Network: `/tasks.json` should be requested once.
- Delete a task: a snackbar appears. Click **Undo** while visible → item restored. Wait for auto-close → Undo does nothing.
- Click a row: only View dialog opens. Click Edit icon: only Edit dialog opens. Click Delete icon: only Delete flow opens.
- Check ROI column: no `Infinity`/`NaN`. Invalid inputs display `—`. Metrics show two decimals.
- Export CSV: open downloaded file and confirm headers are stable and fields with commas/quotes/newlines are correctly quoted/escaped.

**Remaining recommendations (optional improvements)**
- Add automated tests (unit + e2e) for ROI, sorting stability, normalizeTasks, and undo lifecycle.
- Restore deleted tasks at original index on undo (currently restores to the end).
- If you need safe rich-text notes, integrate a sanitizer like `dompurify` instead of rendering raw HTML.
- Use a more robust multi-tab sync strategy (BroadcastChannel or server-driven updates) if needed.

**Contributing / Development notes**
- The repo uses Vite + TypeScript. Keep `npm run dev` running during development and edit `src/` files.
- When adding features that change data shape, update `normalizeTasks` accordingly to avoid runtime errors.

If you want, I can now:
- Add unit tests (Jest or Vitest) and run them, or
- Implement undo-to-original-index behavior, or
- Add a small CI workflow to run type checks and tests.

Which of the above would you like me to do next?