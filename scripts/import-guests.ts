// Import a guest list CSV into Supabase.
//   npm run import-guests -- guests.csv
// CSV columns: party_name,first_name,last_name,is_plus_one[,invited_to_welcome]
// Rows sharing a party_name become one party. Parties whose name already
// exists are skipped, so re-running after adding rows only imports new parties.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const truthy = (s: string | undefined) => /^(true|yes|y|1)$/i.test((s ?? "").trim());

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run import-guests -- <path/to/guests.csv>");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local)");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [header, ...data] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.map((h) => h.trim().toLowerCase()).indexOf(name);
    if (i === -1 && name !== "invited_to_welcome") throw new Error(`Missing column: ${name}`);
    return i;
  };
  const [pi, fi, li, plusi, wi] = ["party_name", "first_name", "last_name", "is_plus_one", "invited_to_welcome"].map(col);

  const parties = new Map<string, { welcome: boolean; guests: { first_name: string; last_name: string; is_plus_one: boolean }[] }>();
  for (const r of data) {
    const name = r[pi]?.trim();
    if (!name) continue;
    const p = parties.get(name) ?? { welcome: wi === -1 || r[wi]?.trim() === "" ? true : truthy(r[wi]), guests: [] };
    const plus = truthy(r[plusi]);
    p.guests.push({
      first_name: plus ? "" : (r[fi] ?? "").trim(),
      last_name: plus ? "" : (r[li] ?? "").trim(),
      is_plus_one: plus,
    });
    parties.set(name, p);
  }

  const { data: existing, error } = await db.from("parties").select("name");
  if (error) throw error;
  const have = new Set((existing ?? []).map((p) => p.name));

  let created = 0;
  for (const [name, p] of parties) {
    if (have.has(name)) {
      console.log(`skip  ${name} (already exists)`);
      continue;
    }
    const { data: row, error: pErr } = await db
      .from("parties")
      .insert({ name, invited_to_welcome: p.welcome })
      .select("id")
      .single();
    if (pErr) throw pErr;
    const { error: gErr } = await db.from("guests").insert(p.guests.map((g) => ({ ...g, party_id: row.id })));
    if (gErr) throw gErr;
    console.log(`add   ${name} (${p.guests.length} guest${p.guests.length === 1 ? "" : "s"})`);
    created++;
  }
  console.log(`\nDone: ${created} new part${created === 1 ? "y" : "ies"}.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
