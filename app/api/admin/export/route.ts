import { NextResponse } from "next/server";
import { getSummary, isAdmin, toCsv } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // BOM so Excel opens UTF-8 names correctly.
  const csv = "﻿" + toCsv(await getSummary());
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvps-${date}.csv"`,
    },
  });
}
