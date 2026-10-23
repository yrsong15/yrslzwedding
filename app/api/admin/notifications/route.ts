import { NextResponse } from "next/server";
import { adminMutation, getBell, isAdmin, notificationUpdateSchema, updateNotifications } from "@/lib/admin";

// GET → the bell's latest notifications and how many are new to whoever's checking.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getBell());
  } catch (e) {
    console.error("Notifications failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// PATCH { action: "who", who }        → which of the couple is checking on this device
//       { action: "seen", id, list }  → everything up to this notification has been seen
export async function PATCH(req: Request) {
  return adminMutation(req, notificationUpdateSchema, updateNotifications);
}
