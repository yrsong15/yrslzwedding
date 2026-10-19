"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type Over,
} from "@dnd-kit/core";
import {
  arrangeTable,
  doors,
  moveWithinTable,
  noRoomMessage,
  openWall,
  pillars,
  room,
  savedSeat,
  seatingTables,
  seatsPerTable,
  sweetheart,
  tableName,
} from "@/lib/seating";
import { sides } from "@/lib/site";
import type { SeatingParty, Side } from "@/lib/types";
import { send } from "./send";

type Table = (typeof seatingTables)[number];
type Person = SeatingParty["guests"][number];
type Change = { kind: "table"; id: string; table: number | null } | { kind: "seat"; guest: string; seat: number };
/** A party, or one person in it, being moved: picked by click or dragged. */
type Picked = { party: string; guest: string | null };
/** Where a drag is: a table, or one seat at it. */
type Spot = { table: number; seat: number | null };

// Drawing sizes in feet, like the room (lib/seating.ts). Seats sit on an
// ellipse, taller than wide, so the pills above and below a table clear the
// ones beside them. The widest pill keeps side-by-side tables (10.2 ft apart at
// the closest) from touching, and the table is drawn a little under its real
// 5 ft so the pills beside it have room.
const CHAIRS_X = 3.35;
const CHAIRS_Y = 4;
const PILL_WIDTH = 3.3;
const PILL_FONT = 0.6;
const TABLE_DRAWN = 4.4;
/** A table's drop area: the table and its seats. */
const ZONE = { w: 2 * (CHAIRS_X + PILL_WIDTH / 2), h: 2 * (CHAIRS_Y + 0.5) };
/** A seat's drop area, at least: short names still get room to aim at. */
const SEAT_ZONE = { w: 2, h: 1.1 };

/** A length in feet as CSS, scaled to the floor plan's width (its container). */
const ft = (n: number) => `${+((n * 100) / room.width).toFixed(3)}cqw`;
/** A point on the floor plan, as CSS left/top. */
const at = (x: number, y: number) => ({ left: `${(x / room.width) * 100}%`, top: `${(y / room.height) * 100}%` });

// Party fills around a table alternate so neighbours stand apart, with a third
// for the last party when an odd number wraps around to meet the first.
const fills = ["bg-lilac", "bg-peach", "bg-orange/60"];
const fillFor = (i: number, count: number) => fills[count > 1 && count % 2 === 1 && i === count - 1 ? 2 : i % 2];

const firstName = (g: Person) => g.first_name || "Guest";
const fullName = (g: Person) => (g.first_name ? `${g.first_name} ${g.last_name}`.trim() : "Plus-one, no name yet");
const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const ROSTER = "roster";
const pickedOf = (a: Active) => a.data.current as Picked | undefined;
const spotOf = (o: Over): Spot => ({ table: o.data.current?.table as number, seat: (o.data.current?.seat as number | undefined) ?? null });

// Drop on whatever is under the pointer: a seat before the table around it,
// and if two drop areas still overlap there, the nearer one.
const underPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const seats = hits.filter((h) => String(h.id).startsWith("seat:"));
  const pool = seats.length > 0 ? seats : hits;
  if (pool.length < 2) return pool;
  const ids = new Set(pool.map((h) => h.id));
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(c.id)) });
};

const sideOptions: ["all" | Side, string][] = [["all", "All"], ...sides.map((s): [Side, string] => [s.value, s.label])];

export default function SeatingChart({ parties }: { parties: SeatingParty[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"all" | Side>("all");
  // A party or person picked by clicking, waiting for a table or seat (the keyboard and touch way to move).
  const [selected, setSelected] = useState<Picked | null>(null);
  const [drag, setDrag] = useState<Picked | null>(null);
  const [over, setOver] = useState<Spot | null>(null);
  const [, startTransition] = useTransition();
  const [shown, show] = useOptimistic(parties, (ps: SeatingParty[], c: Change) => {
    // A party arriving at a table takes free seats there, as on the server.
    if (c.kind === "table") {
      return ps.map((p) => (p.id === c.id ? { ...p, table_number: c.table, guests: p.guests.map((g) => ({ ...g, seat: null })) } : p));
    }
    const table = ps.find((p) => p.guests.some((g) => g.id === c.guest))?.table_number;
    if (table == null) return ps;
    const at = moveWithinTable(
      ps.filter((p) => p.table_number === table),
      c.guest,
      c.seat,
    );
    return ps.map((p) => (p.table_number === table ? { ...p, guests: p.guests.map((g) => ({ ...g, seat: savedSeat(at.get(g.id)) })) } : p));
  });
  const sensors = useSensors(
    // A click without moving selects instead of dragging.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press to drag on touch screens, so a swipe still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const byId = new Map(shown.map((p) => [p.id, p]));
  const guestById = new Map(shown.flatMap((p) => p.guests.map((g) => [g.id, g])));
  const atTable = new Map<number, SeatingParty[]>(seatingTables.map((t) => [t.number, []]));
  for (const p of shown) if (p.table_number !== null) atTable.get(p.table_number)?.push(p);
  /** Everyone's seat number at their table. */
  const seatOf = new Map<string, number>();
  for (const ps of atTable.values()) for (const [id, n] of arrangeTable(ps)) seatOf.set(id, n);
  /** People at a table, leaving out one party (the one being moved). */
  const taken = (table: number, except?: string) =>
    (atTable.get(table) ?? []).reduce((n, p) => (p.id === except ? n : n + p.guests.length), 0);

  /** Seat a party (null = back to the list). Refuses, like the server, if it doesn't fit. */
  function move(id: string, table: number | null) {
    setSelected(null);
    const party = byId.get(id);
    if (!party || party.table_number === table) return;
    if (table !== null) {
      const left = seatsPerTable - taken(table, id);
      if (party.guests.length > left) return setError(noRoomMessage(party.name, party.guests.length, table, left));
    }
    save({ kind: "table", id, table }, "/api/admin/parties", { action: "table", id, table });
  }

  /** Move one person to another seat at their table, swapping with whoever sits there. */
  function moveGuest(guest: string, seat: number) {
    setSelected(null);
    if (seatOf.get(guest) === seat) return;
    save({ kind: "seat", guest, seat }, "/api/admin/guests", { action: "seat", id: guest, seat });
  }

  function save(change: Change, path: string, body: unknown) {
    setError("");
    // Shows at once; the refresh that follows runs in the same transition, so nothing flips back.
    startTransition(async () => {
      show(change);
      const problem = await send("PATCH", path, body);
      if (problem) setError(problem);
      startTransition(() => router.refresh());
    });
  }

  const pickParty = (id: string) => setSelected((s) => (s?.party === id ? null : { party: id, guest: null }));

  // Counts.
  const people = shown.reduce((n, p) => n + p.guests.length, 0);
  const capacity = seatingTables.length * seatsPerTable;
  const seated = seatingTables.reduce((n, t) => n + taken(t.number), 0);
  const openSeats = seatingTables.reduce((n, t) => n + Math.max(0, seatsPerTable - taken(t.number)), 0);
  const full = seatingTables.filter((t) => taken(t.number) >= seatsPerTable).length;
  const overfull = seatingTables.filter((t) => taken(t.number) > seatsPerTable);

  // The list of parties without a table.
  const unseated = shown.filter((p) => p.table_number === null);
  const waiting = unseated.reduce((n, p) => n + p.guests.length, 0);
  const q = normName(query);
  const roster = unseated
    .filter((p) => side === "all" || p.side === side)
    .filter((p) => !q || normName(p.name).includes(q) || p.guests.some((g) => normName(`${g.first_name} ${g.last_name}`).includes(q)));

  const selectedParty = selected ? (byId.get(selected.party) ?? null) : null;
  const selectedGuest = selected?.guest ? (guestById.get(selected.guest) ?? null) : null;
  // Someone picked at a table: the other seats there become places to move them.
  const reseatAt = selectedGuest ? (selectedParty?.table_number ?? null) : null;
  const draggingParty = drag ? (byId.get(drag.party) ?? null) : null;
  const draggingGuest = drag?.guest ? (guestById.get(drag.guest) ?? null) : null;
  // Dragging someone over a seat at their own table moves just them.
  const reseating = draggingGuest !== null && over?.seat != null && over.table === draggingParty?.table_number;

  /** A click on someone at a table: swap the picked person with them, or pick them. */
  function pickPerson(party: string, guest: string, table: number) {
    if (selected?.guest && reseatAt === table && selected.guest !== guest) return moveGuest(selected.guest, seatOf.get(guest)!);
    setSelected((s) => (s?.guest === guest ? null : { party, guest }));
  }
  const dimmed = (party: string, guest: string) => drag !== null && (reseating ? drag.guest === guest : drag.party === party);

  const nameOf = (a: Active) => {
    const p = pickedOf(a);
    const g = p?.guest ? guestById.get(p.guest) : undefined;
    return g ? fullName(g) : (byId.get(p?.party ?? "")?.name ?? "the party");
  };
  const placeOf = (o: Over) => {
    if (o.id === ROSTER) return "the list of parties to seat";
    const { table, seat } = spotOf(o);
    return seat === null ? tableName(table) : `seat ${seat} at ${tableName(table)}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active)} is over ${placeOf(over)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active)} on ${placeOf(over)}.` : `Dropped ${nameOf(active)}.`),
    onDragCancel: ({ active }) => `Move cancelled. ${nameOf(active)} is back where it was.`,
  };

  return (
    <section>
      <p className="text-center text-sm text-muted">
        {seated} of {people} seated · {plural(openSeats, "open seat")} · {full} of {seatingTables.length} tables full
      </p>
      {people > capacity && (
        <p className="mt-1 text-center text-sm text-orange-dark">
          {people} people need a seat, but {seatingTables.length} tables of {seatsPerTable} hold {capacity}, so{" "}
          {plural(people - capacity, "person", "people")} can&apos;t be seated until someone declines.
        </p>
      )}
      {overfull.length > 0 && (
        <p className="mt-1 text-center text-sm text-orange-dark">
          Over {seatsPerTable}: {overfull.map((t) => `${t.name} (${taken(t.number)})`).join(", ")}. Someone was invited or
          changed their answer after these were seated.
        </p>
      )}
      <p className="mt-1 min-h-5 text-center text-sm text-orange-dark" role="alert">
        {error}
      </p>

      <DndContext
        // A fixed id keeps the server render and hydration in sync (dnd-kit uses it in element ids).
        id="dnd-seating"
        sensors={sensors}
        collisionDetection={underPointer}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Press Enter to pick this party or person, then choose Seat here on a table. For someone already at a table, you can instead choose another seat there to move just them. With a mouse, you can also drag.",
          },
        }}
        onDragStart={({ active }) => {
          setSelected(null);
          setDrag(pickedOf(active) ?? null);
        }}
        onDragOver={({ over: o }) => setOver(o && o.id !== ROSTER ? spotOf(o) : null)}
        onDragEnd={({ active, over: o }) => {
          setDrag(null);
          setOver(null);
          const picked = pickedOf(active);
          if (!picked || !o) return;
          if (o.id === ROSTER) return move(picked.party, null);
          const spot = spotOf(o);
          if (picked.guest && spot.table === byId.get(picked.party)?.table_number) {
            if (spot.seat !== null) moveGuest(picked.guest, spot.seat);
            return;
          }
          move(picked.party, spot.table);
        }}
        onDragCancel={() => {
          setDrag(null);
          setOver(null);
        }}
      >
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Roster
            parties={roster}
            unseatedCount={unseated.length}
            waiting={waiting}
            query={query}
            onQuery={setQuery}
            side={side}
            onSide={setSide}
            selected={selected?.party ?? null}
            dragging={drag?.party ?? null}
            draggingSeated={draggingParty?.table_number != null}
            onSelect={pickParty}
          />

          <div className="min-w-0">
            <div className="sticky top-2 z-20 mb-3 flex min-h-11 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-ink/10 bg-cream/95 px-5 py-2 text-sm shadow-sm backdrop-blur">
              {selectedParty ? (
                <>
                  {selectedGuest && reseatAt !== null ? (
                    <span>
                      Moving <span className="font-medium text-plum">{fullName(selectedGuest)}</span>: pick another seat at{" "}
                      {tableName(reseatAt)}, or choose <em>Seat here</em> on another table
                      {selectedParty.guests.length > 1 &&
                        ` to move all of ${selectedParty.name} (${plural(selectedParty.guests.length, "person", "people")})`}
                      .
                    </span>
                  ) : (
                    <span>
                      Moving <span className="font-medium text-plum">{selectedParty.name}</span> (
                      {plural(selectedParty.guests.length, "person", "people")}): choose <em>Seat here</em> on a table.
                    </span>
                  )}
                  {selectedParty.table_number !== null && (
                    <button
                      type="button"
                      onClick={() => move(selectedParty.id, null)}
                      className="rounded-full bg-plum px-4 py-1 text-xs uppercase tracking-[0.15em] text-cream hover:bg-ink"
                    >
                      {selectedGuest && selectedParty.guests.length > 1 ? "Unseat party" : "Unseat"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-xs uppercase tracking-[0.15em] text-muted transition hover:text-orange-dark"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <span className="text-muted">
                  Drag a party onto a table, or click a name and then a table. Everyone in a party sits at the same table. To
                  change seats, drag someone to another seat at their table, or click them and then the seat.
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white/60">
              {/* Below this width the plan stops shrinking and scrolls, so names stay readable. */}
              <div className="min-w-[64rem] px-6 pb-24 pt-8">
                <div className="@container">
                  <div role="group" aria-label="Floor plan" className="relative aspect-[64/48]">
                    <Room />
                    <Sweetheart />
                    {seatingTables.map((t) => (
                      <TableSpot
                        key={t.number}
                        table={t}
                        parties={atTable.get(t.number) ?? []}
                        seatOf={seatOf}
                        active={draggingParty ?? selectedParty}
                        selecting={selectedParty !== null}
                        selected={selected}
                        swapping={reseatAt === t.number ? selectedGuest : null}
                        hovered={drag !== null && !reseating && over?.table === t.number}
                        targetSeat={reseating && over?.table === t.number ? over.seat : null}
                        dimmed={dimmed}
                        onPerson={(party, guest) => pickPerson(party, guest, t.number)}
                        onEmptySeat={(seat) => selected?.guest && moveGuest(selected.guest, seat)}
                        onSeat={() => selectedParty && move(selectedParty.id, t.number)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted">
              64 × 48 ft, from the venue&apos;s blueprint. The small squares are pillars. Table placement is
              temporary.
            </p>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingParty && (
            <div className="w-max cursor-grabbing rounded-full bg-plum px-4 py-2 text-sm text-cream shadow-lg">
              {reseating && draggingGuest ? firstName(draggingGuest) : `${draggingParty.name} · ${draggingParty.guests.length}`}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

function Roster({
  parties,
  unseatedCount,
  waiting,
  query,
  onQuery,
  side,
  onSide,
  selected,
  dragging,
  draggingSeated,
  onSelect,
}: {
  /** The unseated parties that pass the search and filter. */
  parties: SeatingParty[];
  unseatedCount: number;
  waiting: number;
  query: string;
  onQuery: (q: string) => void;
  side: "all" | Side;
  onSide: (s: "all" | Side) => void;
  selected: string | null;
  dragging: string | null;
  draggingSeated: boolean;
  onSelect: (id: string) => void;
}) {
  // Dropping a seated party here takes it off its table.
  const { setNodeRef, isOver } = useDroppable({ id: ROSTER });
  return (
    <aside
      ref={setNodeRef}
      aria-label="Parties to seat"
      className={`flex max-h-96 flex-col rounded-2xl border bg-white/60 transition lg:sticky lg:top-2 lg:max-h-[calc(100svh-1rem)] ${
        isOver && draggingSeated ? "border-lavender ring-4 ring-lavender/40" : "border-ink/10"
      }`}
    >
      <div className="space-y-3 border-b border-ink/10 p-4">
        <div>
          <h2 className="font-serif text-2xl text-plum">To seat</h2>
          <p className="text-xs text-muted">
            {plural(waiting, "person", "people")} in {plural(unseatedCount, "party", "parties")}
            {draggingSeated && " · drop here to unseat"}
          </p>
        </div>
        <input
          type="search"
          aria-label="Search names or parties"
          placeholder="Search names or parties"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="w-full rounded-full border border-ink/20 bg-white/70 px-4 py-1.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
        />
        <div role="group" aria-label="Guests of" className="flex overflow-hidden rounded-full border border-plum/30 text-xs">
          {sideOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={side === value}
              onClick={() => onSide(value)}
              className={`flex-1 whitespace-nowrap px-2 py-1 transition ${side === value ? "bg-plum text-cream" : "text-plum hover:bg-lavender/15"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="min-h-24 flex-1 space-y-2 overflow-y-auto p-3">
        {parties.map((p) => (
          <li key={p.id}>
            <RosterChip party={p} selected={selected === p.id} dimmed={dragging === p.id} onSelect={() => onSelect(p.id)} />
          </li>
        ))}
        {parties.length === 0 && (
          <li className="p-4 text-center text-sm text-muted">{unseatedCount === 0 ? "Everyone has a seat." : "No one matches."}</li>
        )}
      </ul>
    </aside>
  );
}

function RosterChip({ party, selected, dimmed, onSelect }: { party: SeatingParty; selected: boolean; dimmed: boolean; onSelect: () => void }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: `roster:${party.id}`, data: { party: party.id, guest: null } satisfies Picked });
  const side = sides.find((s) => s.value === party.side);
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      onClick={onSelect}
      title={party.guests.map(fullName).join(", ")}
      className={`w-full cursor-grab rounded-xl border bg-white px-3 py-2 text-left transition hover:border-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum active:cursor-grabbing ${
        selected ? "border-plum ring-2 ring-plum" : "border-ink/10"
      } ${dimmed ? "opacity-30" : ""}`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium text-plum">{party.name}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {side && <span title={`${side.label}'s guests`}>{side.short} · </span>}
          {party.guests.length}
        </span>
      </span>
      <span className="block truncate text-xs text-muted">{party.guests.map(firstName).join(", ")}</span>
    </button>
  );
}

function TableSpot({
  table,
  parties,
  seatOf,
  active,
  selecting,
  selected,
  swapping,
  hovered,
  targetSeat,
  dimmed,
  onPerson,
  onEmptySeat,
  onSeat,
}: {
  table: Table;
  /** The parties at this table, in the couple's saved order. */
  parties: SeatingParty[];
  /** Everyone's seat number at their table. */
  seatOf: Map<string, number>;
  /** The party being dragged or picked, if any. */
  active: SeatingParty | null;
  /** A party is picked by click: the table becomes a Seat here button. */
  selecting: boolean;
  selected: Picked | null;
  /** Someone at this table picked by click: the other seats here are places to move them. */
  swapping: Person | null;
  /** A party is dragged over this table. */
  hovered: boolean;
  /** Someone at this table is dragged over this seat. */
  targetSeat: number | null;
  dimmed: (party: string, guest: string) => boolean;
  onPerson: (party: string, guest: string) => void;
  onEmptySeat: (seat: number) => void;
  onSeat: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: `table:${table.number}`, data: { table: table.number } });
  const people = parties.flatMap((p, i) => p.guests.map((guest) => ({ guest, party: p, fill: fillFor(i, parties.length) })));
  const bySeat = new Map(people.map((person) => [seatOf.get(person.guest.id), person]));
  const count = people.length;
  const seats = Math.max(seatsPerTable, count);
  const here = active?.table_number === table.number;
  const left = seatsPerTable - count + (here && active ? active.guests.length : 0);
  const fits = !active || active.guests.length <= left;
  const space = left <= 0 ? "Full" : `${left} left`;
  const status = selecting ? (here ? "Seated here" : fits ? "Seat here" : space) : hovered && !fits ? space : `${count} / ${seatsPerTable}`;
  const warn = count > seatsPerTable || ((selecting || hovered) && !fits && !here);

  const circle = `absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 bg-white text-center shadow-sm transition ${
    count > seatsPerTable ? "border-orange-dark" : "border-ink/15"
  }`;
  const circleSize = { width: ft(TABLE_DRAWN), height: ft(TABLE_DRAWN), padding: ft(0.3) };
  const label = (
    <>
      <span className="text-muted" style={{ fontSize: ft(0.5) }}>
        {table.number}
      </span>
      <span className="text-balance font-serif text-plum" style={{ fontSize: ft(0.72), lineHeight: 1.05 }}>
        {table.name}
      </span>
      {table.ko && (
        <span lang="ko" className="font-korean text-muted" style={{ fontSize: ft(0.46) }}>
          {table.ko}
        </span>
      )}
      <span
        className={`tabular-nums ${warn ? "font-medium text-orange-dark" : selecting && !here ? "font-medium uppercase tracking-wider text-plum" : "text-muted"}`}
        style={{ fontSize: ft(0.5), marginTop: ft(0.08) }}
      >
        {status}
      </span>
    </>
  );

  return (
    <div
      ref={setNodeRef}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ ...at(table.x, table.y), width: ft(ZONE.w), height: ft(ZONE.h) }}
    >
      {selecting ? (
        <button
          type="button"
          onClick={onSeat}
          disabled={here || !fits}
          aria-label={`${status}: table ${table.number}, ${table.name}, ${count} of ${seatsPerTable} seats taken`}
          className={`${circle} enabled:cursor-pointer enabled:border-plum enabled:hover:bg-lilac/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-plum/40`}
          style={circleSize}
        >
          {label}
        </button>
      ) : (
        <div className={`${circle} ${hovered ? (fits ? "ring-4 ring-lavender/70" : "ring-4 ring-orange-dark/40") : ""}`} style={circleSize}>
          {label}
        </div>
      )}

      {Array.from({ length: seats }, (_, i) => {
        const seat = i + 1;
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / seats;
        const spot = {
          left: `calc(50% + ${ft(CHAIRS_X * Math.cos(angle))})`,
          top: `calc(50% + ${ft(CHAIRS_Y * Math.sin(angle))})`,
        };
        const person = bySeat.get(seat);
        return (
          <SeatSpot key={seat} table={table.number} seat={seat} spot={spot} target={targetSeat === seat}>
            {person ? (
              <SeatPill
                {...person}
                seat={seat}
                tableLabel={table.name}
                selected={selected?.guest === person.guest.id}
                mate={selected?.guest !== person.guest.id && selected?.party === person.party.id}
                swapWith={swapping && swapping.id !== person.guest.id ? swapping : null}
                dimmed={dimmed(person.party.id, person.guest.id)}
                onSelect={() => onPerson(person.party.id, person.guest.id)}
              />
            ) : swapping && seat <= seatsPerTable ? (
              <button
                type="button"
                onClick={() => onEmptySeat(seat)}
                aria-label={`Move ${fullName(swapping)} to seat ${seat}`}
                title={`Move ${firstName(swapping)} here`}
                className="cursor-pointer rounded-full border border-dashed border-plum bg-white transition hover:bg-lilac/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
                style={{ width: ft(0.9), height: ft(0.9) }}
              />
            ) : (
              <span aria-hidden className="rounded-full border border-dashed border-ink/30" style={{ width: ft(0.7), height: ft(0.7) }} />
            )}
          </SeatSpot>
        );
      })}
    </div>
  );
}

/** One seat at a table, a drop area for moving someone there. */
function SeatSpot({
  table,
  seat,
  spot,
  target,
  children,
}: {
  table: number;
  seat: number;
  spot: { left: string; top: string };
  /** Someone is dragged over it. */
  target: boolean;
  children: React.ReactNode;
}) {
  // The extra seats at a table over 8 aren't real seats, so nobody moves onto them.
  const { setNodeRef } = useDroppable({ id: `seat:${table}:${seat}`, data: { table, seat }, disabled: seat > seatsPerTable });
  return (
    <div
      ref={setNodeRef}
      className={`absolute flex w-max -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition ${
        target ? "bg-lavender/25 ring-4 ring-lavender/70" : ""
      }`}
      style={{ ...spot, minWidth: ft(SEAT_ZONE.w), minHeight: ft(SEAT_ZONE.h) }}
    >
      {children}
    </div>
  );
}

/** One person at a table. Dragged to another seat here, they move alone; to another table, their whole party goes. */
function SeatPill({
  guest,
  party,
  fill,
  seat,
  tableLabel,
  selected,
  mate,
  swapWith,
  dimmed,
  onSelect,
}: {
  guest: Person;
  party: SeatingParty;
  fill: string;
  seat: number;
  tableLabel: string;
  selected: boolean;
  /** Someone else in their party is picked, so they'd move along to another table. */
  mate: boolean;
  /** Someone else at this table is picked: clicking here swaps the two. */
  swapWith: Person | null;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: `guest:${guest.id}`,
    data: { party: party.id, guest: guest.id } satisfies Picked,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      aria-label={
        swapWith
          ? `Swap ${fullName(swapWith)} with ${fullName(guest)}, seat ${seat}`
          : `${fullName(guest)}, ${party.name}, seat ${seat} at ${tableLabel}`
      }
      title={`${fullName(guest)} · ${party.name}`}
      onClick={onSelect}
      className={`cursor-grab truncate rounded-full leading-tight text-ink shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum active:cursor-grabbing ${fill} ${
        selected ? "ring-2 ring-plum" : mate ? "ring-1 ring-plum/50" : swapWith ? "hover:ring-2 hover:ring-lavender" : ""
      } ${dimmed ? "opacity-30" : ""}`}
      style={{ maxWidth: ft(PILL_WIDTH), fontSize: ft(PILL_FONT), padding: `${ft(0.12)} ${ft(0.28)}` }}
    >
      {firstName(guest)}
    </button>
  );
}

/** The couple's table, fixed: they aren't in the guest list. */
function Sweetheart() {
  const { x, y, width, depth, seats } = sweetheart;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ ...at(x, y), width: ft(width), height: ft(depth) }}>
      <div
        className="flex size-full items-center justify-center rounded-sm border border-plum/40 bg-blush font-serif text-plum"
        style={{ fontSize: ft(0.62) }}
      >
        Sweetheart
      </div>
      {/* Their chairs are behind the table, facing the room. */}
      {seats.map((name, i) => (
        <span
          key={name}
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-plum leading-tight text-cream"
          style={{ left: `${25 + 50 * i}%`, top: `calc(100% + ${ft(0.3)})`, fontSize: ft(PILL_FONT), padding: `${ft(0.12)} ${ft(0.28)}` }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

/** Walls, doors and pillars, drawn in feet. */
function Room() {
  const { width: W, height: H } = room;
  const mid = (doors.x1 + doors.x2) / 2;
  const leaf = mid - doors.x1;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="absolute inset-0 size-full overflow-visible">
        <g className="fill-none stroke-ink/55" strokeWidth={0.3} strokeLinecap="square">
          <path d={`M0 0 V${H} M${W} 0 V${H}`} />
          <path d={`M0 0 H${openWall.x1} M${openWall.x2} 0 H${W}`} />
          <path d={`M0 ${H} H${doors.x1} M${doors.x2} ${H} H${W}`} />
        </g>
        <path d={`M${openWall.x1} 0 H${openWall.x2}`} className="fill-none stroke-ink/35" strokeWidth={0.15} strokeDasharray="0.8 0.6" />
        {/* The double doors swing out. */}
        <g className="fill-none stroke-ink/40" strokeWidth={0.1}>
          <path d={`M${doors.x1} ${H} v${leaf} A${leaf} ${leaf} 0 0 0 ${mid} ${H}`} />
          <path d={`M${doors.x2} ${H} v${leaf} A${leaf} ${leaf} 0 0 1 ${mid} ${H}`} />
        </g>
        {pillars.map((p) => (
          <rect key={`${p.x},${p.y}`} x={p.x - 0.6} y={p.y - 0.6} width={1.2} height={1.2} className="fill-white stroke-ink/50" strokeWidth={0.12} />
        ))}
      </svg>
      <span
        className="absolute -translate-x-1/2 uppercase tracking-[0.2em] text-muted"
        style={{ left: at(mid, H).left, top: `calc(100% + ${ft(leaf + 0.4)})`, fontSize: ft(0.5) }}
      >
        Entrance
      </span>
    </>
  );
}
