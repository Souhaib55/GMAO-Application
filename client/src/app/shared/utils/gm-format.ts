/** Formatting helpers shared by the module screens (French conventions, Tunisian dinar). */

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const nf3 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function fmtNumber(value: number | null | undefined, decimals: 0 | 1 = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return (decimals === 1 ? nf1 : nf0).format(value);
}

/** Money in dinars: 3 decimals in tables, rounded in headline figures. */
export function fmtMoney(value: number | null | undefined, exact = false): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${(exact ? nf3 : nf0).format(value)} DT`;
}

export function fmtPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${nf1.format(value)} %`;
}

export function fmtHours(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (value < 1 && value > 0) return `${Math.round(value * 60)} min`;
  return `${nf1.format(value)} h`;
}

export function fmtMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h} h ${m.toString().padStart(2, '0')}`;
}

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Dates from the API are local times without zone
  return new Date(value.length === 10 ? value + 'T00:00:00' : value);
}

export function fmtDate(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? `${fmtDate(d)} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '—';
}

export function fmtMonth(isoMonth: string): string {
  const [y, m] = isoMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '');
}

/** yyyy-MM-dd in local time (never through UTC, which shifts the day). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** yyyy-MM-ddTHH:mm in local time, for datetime-local inputs. */
export function isoDateTimeLocal(d: Date): string {
  return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function daysFromToday(value: string | Date | null | undefined): number | null {
  const d = parseDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86400000);
}

export function relativeDays(value: string | Date | null | undefined): string {
  const n = daysFromToday(value);
  if (n === null) return '—';
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}

export function otCode(id: number | null | undefined): string {
  return id ? `INT-${String(id).padStart(4, '0')}` : '—';
}

/** Readable message from an HttpErrorResponse (server message first). */
export function errorMessage(err: any, fallback = "L'opération n'a pas pu être enregistrée."): string {
  if (!err) return fallback;
  if (err.status === 0) return 'Le serveur est injoignable. Vérifiez la connexion au réseau.';
  if (err.status === 403) return err.error?.message || "Vous n'avez pas les droits pour cette action.";
  const e = err.error;
  if (typeof e === 'string' && e.length < 300) return e;
  if (e?.message) return e.message;
  if (e?.errors) {
    const first = Object.values(e.errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
  }
  return fallback;
}

/** Downloads rows as a CSV file Excel opens directly (UTF-8 BOM, semicolons). */
export function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(';'), ...rows.map(r => r.map(escape).join(';'))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  saveBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const STATUTS_OT: { [id: number]: { label: string; dot: string } } = {
  1: { label: 'À traiter', dot: 'd-info' },
  2: { label: 'En cours', dot: 'd-warn' },
  3: { label: 'Réalisée', dot: 'd-ok' },
  4: { label: 'Clôturée', dot: 'd-done' },
  5: { label: 'Annulée', dot: 'd-muted' }
};
