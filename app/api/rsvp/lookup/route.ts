import { NextResponse } from "next/server";
import { findPartiesByName } from "@/lib/rsvp";

// GET ?name=First Last → { parties: Party[] }
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim() ?? "";
  if (name.length < 3 || !name.includes(" ")) {
    return NextResponse.json({ error: "Please enter your first and last name." }, { status: 400 });
  }
  try {
    const parties = await findPartiesByName(name);
    return NextResponse.json({ parties });
  } catch (e) {
    console.error("RSVP lookup failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
