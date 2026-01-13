import { Task } from '@/types';

export function toCSV(tasks: ReadonlyArray<Task>): string {
  // Stable headers and proper escaping
  const headers = ['id', 'title', 'revenue', 'timeTaken', 'priority', 'status', 'notes'];
  const rows = tasks.map(t => [
    t.id ?? '',
    escapeCsv(t.title ?? ''),
    String(Number.isFinite(t.revenue) ? t.revenue : ''),
    String(Number.isFinite(t.timeTaken) ? t.timeTaken : ''),
    t.priority ?? '',
    t.status ?? '',
    escapeCsv(t.notes ?? ''),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function escapeCsv(v: string): string {
  // Quote fields that contain special characters and escape double quotes by doubling them
  if (v == null) return '';
  const needsQuote = /[",\n,\r]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


