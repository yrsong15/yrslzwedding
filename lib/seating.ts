// The reception room and its tables, for the /admin seating chart. Safe to
// import from client components: it's the floor plan only, not who sits where.
//
// Everything is in feet, from the room's top-left inside corner (x to the
// right, y down), measured off the venue's blueprint (about 10.7 px per ft).

// Matches the CHECK constraint on guests.seat in supabase/schema.sql: change one, change both.
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

/**
 * The couple's table: they aren't in the guest list, so it's fixed. Chairs behind it, facing the room,
 * centered between the middle two pillars on the bottom wall (34.8 and 40.7).
 */
export const sweetheart = { x: 37.75, y: 42.5, width: 6, depth: 2.5, seats: ["Lauren", "Young Re"] };

// 60" rounds, placed temporarily until the venue sends their layout. Loose
// rows around the pillars, numbered from the sweetheart table up the room.
// Counting each table with its chairs as 9 ft across, the centers are at least
// 11.1 ft apart (about 2 ft between chair backs), and chairs clear the walls,
// pillars, entrance doors and sweetheart table. Numbers 1 to 23 match the CHECK
// constraint on parties.table_number in supabase/schema.sql: change one, change both.
export const seatingTables: { number: number; name: string; ko?: string; x: number; y: number }[] = [
  { number: 1, name: "Hallasan", ko: "한라산", x: 15.3, y: 43.5 },
  { number: 2, name: "Crater Lake", x: 26.5, y: 43.1 },
  { number: 3, name: "Yosemite", x: 58.4, y: 42.2 },
  { number: 4, name: "Mount Rainier", x: 5.1, y: 38.4 },
  { number: 5, name: "Olympic", x: 19, y: 32.7 },
  { number: 6, name: "Zion", x: 35.5, y: 36.2 },
  { number: 7, name: "Glacier", x: 47.6, y: 38.8 },
  { number: 8, name: "Grand Canyon", x: 4.9, y: 27.2 },
  { number: 9, name: "Acadia", x: 14.8, y: 22 },
  { number: 10, name: "Yellowstone", x: 27.1, y: 24.9 },
  { number: 11, name: "Jirisan", ko: "지리산", x: 38.4, y: 25.4 },
  { number: 12, name: "Arches", x: 49.4, y: 22.6 },
  { number: 13, name: "Joshua Tree", x: 59.5, y: 27.7 },
  { number: 14, name: "Seoraksan", ko: "설악산", x: 5, y: 15.8 },
  { number: 15, name: "Grand Teton", x: 22.9, y: 14.4 },
  { number: 16, name: "Rocky Mountain", x: 34.6, y: 14.8 },
  { number: 17, name: "Shenandoah", x: 49.1, y: 10.7 },
  { number: 18, name: "Bryce Canyon", x: 59.3, y: 16.5 },
  { number: 19, name: "Badlands", x: 4.8, y: 4.7 },
  { number: 20, name: "Denali", x: 16, y: 5.4 },
  { number: 21, name: "Bukhansan", ko: "북한산", x: 28.3, y: 4.6 },
  { number: 22, name: "Redwood", x: 39.5, y: 4.8 },
  { number: 23, name: "Hawaiʻi Volcanoes", x: 58.8, y: 4.9 },
];

export const tableName = (n: number) => seatingTables.find((t) => t.number === n)?.name ?? `Table ${n}`;

/** Who needs a seat: anyone invited who hasn't said no. */
export const takesSeat = (g: { invited: boolean; attending: boolean | null }) => g.invited && g.attending !== false;

type Sitter = { id: string; seat: number | null };

/**
 * Who sits where at one table: a seat number for each person, given the people
 * there who need a seat, party by party in the couple's saved order. Seats are
 * numbered 1 to 8 clockwise from the top. A saved seat holds unless someone
 * earlier already has it, which only a hand edit in the database should cause.
 * Everyone else takes free seats (say, someone who declined, lost their seat,
 * and then said yes again), a party side by side where it can. A table over 8 gives the extras seats 9 and up, which aren't saved.
 * Shared by the chart and the server, so both arrive at the same seats.
 */
export function arrangeTable(parties: { guests: Sitter[] }[]): Map<string, number> {
  const ring = Math.max(seatsPerTable, parties.reduce((n, p) => n + p.guests.length, 0));
  const at = new Map<string, number>();
  const taken = new Set<number>();
  const take = (id: string, seat: number) => (taken.add(seat), at.set(id, seat));
  for (const p of parties) {
    for (const g of p.guests) if (g.seat !== null && g.seat <= seatsPerTable && !taken.has(g.seat)) take(g.id, g.seat);
  }
  const wrap = (seat: number) => ((seat - 1) % ring) + 1;
  const seatNumbers = Array.from({ length: ring }, (_, i) => i + 1);
  for (const p of parties) {
    const left = p.guests.filter((g) => !at.has(g.id));
    if (left.length === 0) continue;
    // The first run of free seats that fits all of them, or else any free seats.
    const start = seatNumbers.find((s) => left.every((_, j) => !taken.has(wrap(s + j))));
    left.forEach((g, j) => take(g.id, start ? wrap(start + j) : seatNumbers.find((s) => !taken.has(s))!));
  }
  return at;
}

/** Everyone's seat at a table after one person moves to `seat`, swapping with whoever sat there. */
export function moveWithinTable(parties: { guests: Sitter[] }[], guestId: string, seat: number): Map<string, number> {
  const at = arrangeTable(parties);
  const from = at.get(guestId);
  if (from === undefined) return at;
  for (const [id, n] of at) if (n === seat) at.set(id, from);
  return at.set(guestId, seat);
}

/** A seat as saved: the extras at a table over 8 have none. */
export const savedSeat = (seat: number | undefined) => (seat !== undefined && seat <= seatsPerTable ? seat : null);

/** Shared by the chart and the server, so the wording matches. */
export function noRoomMessage(partyName: string, needed: number, table: number, left: number): string {
  const people = needed === 1 ? "1 person" : `${needed} people`;
  const seats = left <= 0 ? "it's full" : left === 1 ? "only 1 seat is left" : `only ${left} seats are left`;
  return `${partyName} (${people}) won't fit at ${tableName(table)}: ${seats}.`;
}
