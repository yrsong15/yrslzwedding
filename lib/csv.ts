// The CSV export from /admin. Pure (no server imports), so it can be run on its own.

import type { SummaryRow } from "./admin";

/**
 * One cell. Guests type some of these (plus-one names, dietary notes, the
 * email), and a spreadsheet runs a cell that starts with = + - or @ as a
 * formula, so those get a leading apostrophe, which makes them plain text.
 */
export const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: SummaryRow[]): string {
  const headers = ["party", "side", "first_name", "last_name", "is_plus_one", "invited", "attending", "welcome_drinks", "meal", "dietary", "responded_at", "email"] as const;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n");
}
