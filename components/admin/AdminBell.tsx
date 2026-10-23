import { getBell, isAdmin } from "@/lib/admin";
import type { BellData } from "@/lib/types";
import NotificationBell from "./NotificationBell";

/**
 * The notifications bell in the top-right corner of every admin page, under the
 * nav. Checks the admin cookie itself before loading anything, since the layout
 * renders it alongside the page (which does its own check).
 */
export default async function AdminBell() {
  if (!(await isAdmin())) return null;
  let initial: BellData;
  try {
    initial = await getBell();
  } catch (e) {
    console.error(e);
    return null;
  }
  return (
    // Doesn't wrap the page, so the wide seating chart keeps its width.
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto">
          <NotificationBell initial={initial} />
        </div>
      </div>
    </div>
  );
}
