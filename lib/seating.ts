// The reception room and its tables, for the /admin seating chart. Safe to
// import from client components: it's the floor plan only, not who sits where.
//
// Everything is in feet, from the room's top-left inside corner (x to the
// right, y down), measured off the venue's blueprint (about 10.7 px per ft).

export const seatsPerTable = 8;

export const room = { width: 64, height: 48 };

// The open squares on the blueprint: pillars.
export const pillars: { x: number; y: number }[] = [
  { x: 13.3, y: 15.7 },
  { x: 29, y: 15.7 },
  { x: 46.7, y: 15.7 },
  { x: 13.3, y: 32 },
  { x: 29, y: 32 },
  { x: 46.7, y: 32 },
  { x: 55.7, y: 32 },
  // Along the walls.
  { x: 14, y: 0.7 },
  { x: 47.4, y: 0.7 },
  { x: 31, y: 46.8 },
  { x: 34.8, y: 46.8 },
  { x: 40.7, y: 46.8 },
  { x: 44.9, y: 46.8 },
];

/** The double doors in the bottom wall. */
export const doors = { x1: 3.9, x2: 9.5 };

/** The stretch of the top wall drawn dashed on the blueprint. */
export const openWall = { x1: 17, x2: 43 };

/** The couple's table: they aren't in the guest list, so it's fixed. Chairs behind it, facing the room. */
export const sweetheart = { x: 32, y: 42.5, width: 6, depth: 2.5, seats: ["Lauren", "Young Re"] };

// 60" rounds, placed temporarily until the venue sends their layout: five loose
// rows around the pillars, at least 10.1 ft between centers, numbered from the
// sweetheart table up the room. Numbers 1 to 23 match the CHECK constraint on
// parties.table_number in supabase/schema.sql: change one, change both.
export const seatingTables: { number: number; name: string; ko?: string; x: number; y: number }[] = [
  { number: 1, name: "Hallasan", ko: "한라산", x: 15.5, y: 43.5 },
  { number: 2, name: "Crater Lake", x: 50.4, y: 43.5 },
  { number: 3, name: "Yosemite", x: 7.3, y: 37.5 },
  { number: 4, name: "Mount Rainier", x: 23.5, y: 37.2 },
  { number: 5, name: "Olympic", x: 42.1, y: 37.5 },
  { number: 6, name: "Zion", x: 58.8, y: 37.3 },
  { number: 7, name: "Glacier", x: 5.2, y: 27.2 },
  { number: 8, name: "Grand Canyon", x: 15.4, y: 27.2 },
  { number: 9, name: "Acadia", x: 25.6, y: 27.2 },
  { number: 10, name: "Yellowstone", x: 38.2, y: 28 },
  { number: 11, name: "Jirisan", ko: "지리산", x: 48.6, y: 27.1 },
  { number: 12, name: "Arches", x: 58.8, y: 27.1 },
  { number: 13, name: "Joshua Tree", x: 8.3, y: 17.6 },
  { number: 14, name: "Seoraksan", ko: "설악산", x: 20.5, y: 18.2 },
  { number: 15, name: "Grand Teton", x: 32.4, y: 19.6 },
  { number: 16, name: "Rocky Mountain", x: 42.5, y: 18.8 },
  { number: 17, name: "Great Smoky Mountains", x: 53.7, y: 18.3 },
  { number: 18, name: "Bryce Canyon", x: 5.4, y: 6.5 },
  { number: 19, name: "Sequoia", x: 15.6, y: 6.6 },
  { number: 20, name: "Denali", x: 26.2, y: 6.6 },
  { number: 21, name: "Bukhansan", ko: "북한산", x: 36.5, y: 6.6 },
  { number: 22, name: "Redwood", x: 47.7, y: 6.4 },
  { number: 23, name: "Haleakalā", x: 58, y: 6.5 },
];

export const tableName = (n: number) => seatingTables.find((t) => t.number === n)?.name ?? `Table ${n}`;

/** Who needs a seat: anyone invited who hasn't said no. */
export const takesSeat = (g: { invited: boolean; attending: boolean | null }) => g.invited && g.attending !== false;

/** Shared by the chart and the server, so the wording matches. */
export function noRoomMessage(partyName: string, needed: number, table: number, left: number): string {
  const people = needed === 1 ? "1 person" : `${needed} people`;
  const seats = left <= 0 ? "it's full" : left === 1 ? "only 1 seat is left" : `only ${left} seats are left`;
  return `${partyName} (${people}) won't fit at ${tableName(table)}: ${seats}.`;
}
