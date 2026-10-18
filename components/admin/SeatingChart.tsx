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
import { doors, noRoomMessage, openWall, pillars, room, seatingTables, seatsPerTable, sweetheart, tableName } from "@/lib/seating";
import { sides } from "@/lib/site";
import type { SeatingParty, Side } from "@/lib/types";
import { send } from "./send";

type Table = (typeof seatingTables)[number];
type Person = SeatingParty["guests"][number];
type Move = { id: string; table: number | null };

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
const partyOf = (a: Active) => a.data.current?.partyId as string | undefined;

// Drop on whatever is under the pointer; if two drop areas overlap there, the nearer one.
const underPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length < 2) return hits;
  const ids = new Set(hits.map((h) => h.id));
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(c.id)) });
};

const sideOptions: ["all" | Side, string][] = [["all", "All"], ...sides.map((s): [Side, string] => [s.value, s.label])];

export default function SeatingChart({ parties }: { parties: SeatingParty[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"all" | Side>("all");
  // A party picked by clicking, waiting for a table (the keyboard and touch way to move).
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [shown, show] = useOptimistic(parties, (ps: SeatingParty[], m: Move) =>
    ps.map((p) => (p.id === m.id ? { ...p, table_number: m.table } : p)),
  );
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
  const atTable = new Map<number, SeatingParty[]>(seatingTables.map((t) => [t.number, []]));
  for (const p of shown) if (p.table_number !== null) atTable.get(p.table_number)?.push(p);
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
    setError("");
    // Shows at once; the refresh that follows runs in the same transition, so nothing flips back.
    startTransition(async () => {
      show({ id, table });
      const problem = await send("PATCH", "/api/admin/parties", { action: "table", id, table });
      if (problem) setError(problem);
      startTransition(() => router.refresh());
    });
  }

  const toggle = (id: string) => setSelected((s) => (s === id ? null : id));

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

  const selectedParty = selected ? (byId.get(selected) ?? null) : null;
  const draggingParty = dragging ? (byId.get(dragging) ?? null) : null;

  const nameOf = (a: Active) => byId.get(partyOf(a) ?? "")?.name ?? "the party";
  const placeOf = (o: Over) => (o.id === ROSTER ? "the list of parties to seat" : tableName(o.data.current?.table));
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
            draggable: "Press Enter to pick up this party, then choose Seat here on a table. With a mouse, you can also drag it.",
          },
        }}
        onDragStart={({ active }) => {
          setSelected(null);
          setDragging(partyOf(active) ?? null);
        }}
        onDragEnd={({ active, over }) => {
          setDragging(null);
          const id = partyOf(active);
          if (id && over) move(id, over.id === ROSTER ? null : (over.data.current?.table as number));
        }}
        onDragCancel={() => setDragging(null)}
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
            selected={selected}
            dragging={dragging}
            draggingSeated={draggingParty?.table_number != null}
            onSelect={toggle}
          />

          <div className="min-w-0">
            <div className="sticky top-2 z-20 mb-3 flex min-h-11 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-ink/10 bg-cream/95 px-5 py-2 text-sm shadow-sm backdrop-blur">
              {selectedParty ? (
                <>
                  <span>
                    Moving <span className="font-medium text-plum">{selectedParty.name}</span> (
                    {plural(selectedParty.guests.length, "person", "people")}): choose <em>Seat here</em> on a table.
                  </span>
                  {selectedParty.table_number !== null && (
                    <button
                      type="button"
                      onClick={() => move(selectedParty.id, null)}
                      className="rounded-full bg-plum px-4 py-1 text-xs uppercase tracking-[0.15em] text-cream hover:bg-ink"
                    >
                      Unseat
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
                  Drag a party onto a table, or click a name and then a table. Everyone in a party sits together.
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
                        active={draggingParty ?? selectedParty}
                        selecting={selectedParty !== null}
                        selected={selected}
                        dragging={dragging}
                        onSelect={toggle}
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
              {draggingParty.name} · {draggingParty.guests.length}
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
  const { setNodeRef, attributes, listeners } = useDraggable({ id: `roster:${party.id}`, data: { partyId: party.id } });
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
  active,
  selecting,
  selected,
  dragging,
  onSelect,
  onSeat,
}: {
  table: Table;
  /** The parties at this table, in the couple's saved order. */
  parties: SeatingParty[];
  /** The party being dragged or picked, if any. */
  active: SeatingParty | null;
  /** A party is picked by click: the table becomes a Seat here button. */
  selecting: boolean;
  selected: string | null;
  dragging: string | null;
  onSelect: (partyId: string) => void;
  onSeat: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.number}`, data: { table: table.number } });
  // Each party takes seats next to each other, clockwise from the top.
  const people = parties.flatMap((p, i) =>
    p.guests.map((guest, j) => ({ guest, party: p, fill: fillFor(i, parties.length), first: j === 0 })),
  );
  const count = people.length;
  const seats = Math.max(seatsPerTable, count);
  const here = active?.table_number === table.number;
  const left = seatsPerTable - count + (here && active ? active.guests.length : 0);
  const fits = !active || active.guests.length <= left;
  const hovered = isOver && dragging !== null;
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
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / seats;
        const spot = {
          left: `calc(50% + ${ft(CHAIRS_X * Math.cos(angle))})`,
          top: `calc(50% + ${ft(CHAIRS_Y * Math.sin(angle))})`,
        };
        const person = people[i];
        if (!person) {
          return (
            <span
              key={`empty-${i}`}
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ink/30"
              style={{ ...spot, width: ft(0.7), height: ft(0.7) }}
            />
          );
        }
        return (
          <SeatPill
            key={person.guest.id}
            {...person}
            tableLabel={table.name}
            spot={spot}
            selected={selected === person.party.id}
            dimmed={dragging === person.party.id}
            onSelect={() => onSelect(person.party.id)}
          />
        );
      })}
    </div>
  );
}

/** One person at a table. Grabbing anyone moves their whole party. */
function SeatPill({
  guest,
  party,
  fill,
  first,
  tableLabel,
  spot,
  selected,
  dimmed,
  onSelect,
}: {
  guest: Person;
  party: SeatingParty;
  fill: string;
  /** The party's first person: the only one in the tab order. */
  first: boolean;
  tableLabel: string;
  spot: { left: string; top: string };
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: `seat:${guest.id}`, data: { partyId: party.id } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      tabIndex={first ? 0 : -1}
      aria-pressed={selected}
      aria-label={first ? `${party.name} at ${tableLabel}: ${party.guests.map(fullName).join(", ")}` : fullName(guest)}
      title={`${fullName(guest)} · ${party.name}`}
      onClick={onSelect}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab truncate rounded-full leading-tight text-ink shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum active:cursor-grabbing ${fill} ${
        selected ? "ring-2 ring-plum" : ""
      } ${dimmed ? "opacity-30" : ""}`}
      style={{ ...spot, maxWidth: ft(PILL_WIDTH), fontSize: ft(PILL_FONT), padding: `${ft(0.12)} ${ft(0.28)}` }}
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
