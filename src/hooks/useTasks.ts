import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DerivedTask, Metrics, Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks as sortDerived,
} from '@/utils/logic';
// Local storage removed per request; keep everything in memory
import { generateSalesTasks } from '@/utils/seed';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  addTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  clearLastDeleted: () => void;
}

// Module-level guard to avoid double-fetching during React StrictMode remounts
let hasLoadedTasksOnce = false;

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const fetchedRef = useRef(false);

  function normalizeTasks(input: any[]): Task[] {
    const now = Date.now();
    const arr = Array.isArray(input) ? input : [];
    const seen = new Set<string>();
    const out: Task[] = [];
    for (let idx = 0; idx < arr.length; idx++) {
      const t = arr[idx] ?? {};
      // id: ensure present and unique
      let id = typeof t.id === 'string' && t.id.trim() ? t.id.trim() : undefined;
      if (!id) id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `task-${now}-${idx}`;
      if (seen.has(id)) {
        // generate a new unique id
        id = `${id}-${idx}`;
      }
      seen.add(id);

      // title: non-empty
      const title = typeof t.title === 'string' && t.title.trim() ? t.title.trim() : 'Untitled Task';

      // revenue: numeric, default 0
      const revenue = Number(t.revenue);
      const safeRevenue = Number.isFinite(revenue) ? revenue : 0;

      // timeTaken: must be positive number, default 1
      const tt = Number(t.timeTaken);
      const timeTaken = Number.isFinite(tt) && tt > 0 ? Math.max(1, Math.round(tt)) : 1;

      // priority: ensure valid enum
      const priority = (t.priority === 'High' || t.priority === 'Medium' || t.priority === 'Low') ? t.priority : 'Low';

      // status: ensure valid enum
      const status = (t.status === 'Todo' || t.status === 'In Progress' || t.status === 'Done') ? t.status : 'Todo';

      const notes = typeof t.notes === 'string' ? t.notes : '';

      const created = t.createdAt ? new Date(t.createdAt) : new Date(now - (idx + 1) * 24 * 3600 * 1000);
      const createdAt = isNaN(created.getTime()) ? new Date(now - (idx + 1) * 24 * 3600 * 1000).toISOString() : created.toISOString();

      let completedAt = typeof t.completedAt === 'string' ? t.completedAt : undefined;
      if (!completedAt && status === 'Done') {
        const c = new Date(new Date(createdAt).getTime() + 24 * 3600 * 1000);
        completedAt = c.toISOString();
      }

      out.push({ id, title, revenue: safeRevenue, timeTaken, priority, status, notes, createdAt, completedAt } as Task);
    }
    return out;
  }

  // Initial load: public JSON -> fallback generated dummy
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        if (hasLoadedTasksOnce) {
          if (isMounted) {
            setLoading(false);
            fetchedRef.current = true;
          }
          return;
        }
        hasLoadedTasksOnce = true;
        const res = await fetch('/tasks.json');
        if (!res.ok) throw new Error(`Failed to load tasks.json (${res.status})`);
        const data = (await res.json()) as any[];
        const normalized: Task[] = normalizeTasks(data);
        const finalData = normalized.length > 0 ? normalized : generateSalesTasks(50);
        if (isMounted) setTasks(finalData);
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? 'Failed to load tasks');
      } finally {
        if (isMounted) {
          setLoading(false);
          fetchedRef.current = true;
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const derivedSorted = useMemo<DerivedTask[]>(() => {
    const withRoi = tasks.map(withDerived);
    return sortDerived(withRoi);
  }, [tasks]);

  const metrics = useMemo<Metrics>(() => {
    if (tasks.length === 0) return INITIAL_METRICS;
    const totalRevenue = computeTotalRevenue(tasks);
    const totalTimeTaken = tasks.reduce((s, t) => s + t.timeTaken, 0);
    const timeEfficiencyPct = computeTimeEfficiency(tasks);
    const revenuePerHour = computeRevenuePerHour(tasks);
    const averageROI = computeAverageROI(tasks);
    const performanceGrade = computePerformanceGrade(averageROI);
    return { totalRevenue, totalTimeTaken, timeEfficiencyPct, revenuePerHour, averageROI, performanceGrade };
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id'> & { id?: string }) => {
    setTasks(prev => {
      const now = Date.now();
      // id: ensure unique
      let id = typeof task.id === 'string' && task.id.trim() ? task.id.trim() : undefined;
      if (!id) id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `task-${now}`;
      const existingIds = new Set(prev.map(p => p.id));
      if (existingIds.has(id)) id = `${id}-${prev.length}`;

      const title = typeof task.title === 'string' && task.title.trim() ? task.title.trim() : 'Untitled Task';
      const revenue = Number(task.revenue);
      const safeRevenue = Number.isFinite(revenue) ? revenue : 0;
      const tt = Number(task.timeTaken);
      const timeTaken = Number.isFinite(tt) && tt > 0 ? Math.max(1, Math.round(tt)) : 1;
      const priority = (task.priority === 'High' || task.priority === 'Medium' || task.priority === 'Low') ? task.priority : 'Low';
      const status = (task.status === 'Todo' || task.status === 'In Progress' || task.status === 'Done') ? task.status : 'Todo';
      const notes = typeof task.notes === 'string' ? task.notes : '';
      const createdAt = new Date().toISOString();
      const completedAt = status === 'Done' ? createdAt : undefined;
      return [...prev, { id, title, revenue: safeRevenue, timeTaken, priority, status, notes, createdAt, completedAt }];
    });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        // Sanitize patch values
        const merged: Task = { ...t } as Task;
        if (patch.title !== undefined) merged.title = typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : 'Untitled Task';
        if (patch.revenue !== undefined) {
          const r = Number(patch.revenue as any);
          merged.revenue = Number.isFinite(r) ? r : merged.revenue;
        }
        if (patch.timeTaken !== undefined) {
          const tt = Number(patch.timeTaken as any);
          merged.timeTaken = Number.isFinite(tt) && tt > 0 ? Math.max(1, Math.round(tt)) : merged.timeTaken;
        }
        if (patch.priority !== undefined) merged.priority = (patch.priority === 'High' || patch.priority === 'Medium' || patch.priority === 'Low') ? patch.priority as Task['priority'] : merged.priority;
        if (patch.status !== undefined) merged.status = (patch.status === 'Todo' || patch.status === 'In Progress' || patch.status === 'Done') ? patch.status as Task['status'] : merged.status;
        if (patch.notes !== undefined) merged.notes = typeof patch.notes === 'string' ? patch.notes : merged.notes;
        // If status moved to Done, set completedAt
        if (t.status !== 'Done' && merged.status === 'Done' && !merged.completedAt) {
          merged.completedAt = new Date().toISOString();
        }
        // If status moved away from Done, clear completedAt
        if (t.status === 'Done' && merged.status !== 'Done') {
          merged.completedAt = undefined;
        }
        return merged;
      });
      // Ensure timeTaken remains > 0
      return next.map(t => (t.id === id && (patch.timeTaken ?? t.timeTaken) <= 0 ? { ...t, timeTaken: 1 } : t));
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) || null;
      setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  return { tasks, loading, error, derivedSorted, metrics, lastDeleted, addTask, updateTask, deleteTask, undoDelete, clearLastDeleted };
}




