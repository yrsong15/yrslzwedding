"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { sides } from "@/lib/site";
import type { AdminGuest, AdminParty, Side } from "@/lib/types";

type Draft = { first_name: string; last_name: string; is_plus_one: boolean; invited: boolean };

// Invited starts unchecked, like a blank cell in the imported sheet.
const emptyDraft = (): Draft => ({ first_name: "", last_name: "", is_plus_one: false, invited: false });

const field =
  "w-40 rounded-full border border-ink/20 bg-white/70 px-4 py-1.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30";
const darkButton =
  "rounded-full bg-plum px-5 py-2 text-xs uppercase tracking-[0.2em] text-cream transition hover:bg-ink disabled:opacity-50";
const quietButton = "whitespace-nowrap text-xs uppercase tracking-[0.15em] text-muted transition hover:text-orange-dark";
const handle =
  "flex h-7 w-5 cursor-grab touch-none items-center justify-center rounded text-muted transition hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender active:cursor-grabbing";

/** Edits the list shows immediately, before the server confirms them. */
type Change =
  | { type: "invite"; ids: string[]; invited: boolean }
  | { type: "side"; partyId: string; side: Side }
  | { type: "rename-guest"; id: string; first_name: string; last_name: string }
  | { type: "rename-party"; id: string; name: string }
  | { type: "reorder-parties"; ids: string[] }
  | { type: "reorder-guests"; partyId: string; ids: string[] };

const inOrder = <T extends { id: string }>(items: T[], ids: string[]) => {
  const rank = (id: string) => (ids.includes(id) ? ids.indexOf(id) : ids.length);
  return [...items].sort((a, b) => rank(a.id) - rank(b.id));
};

function applyChange(parties: AdminParty[], c: Change): AdminParty[] {
  switch (c.type) {
    case "invite":
      return parties.map((p) => ({
        ...p,
        guests: p.guests.map((g) => (c.ids.includes(g.id) ? { ...g, invited: c.invited } : g)),
      }));
    case "side":
      return parties.map((p) => (p.id === c.partyId ? { ...p, side: c.side } : p));
    case "rename-guest":
      return parties.map((p) => ({
        ...p,
        guests: p.guests.map((g) => (g.id === c.id ? { ...g, first_name: c.first_name, last_name: c.last_name } : g)),
      }));
    case "rename-party":
      return parties.map((p) => (p.id === c.id ? { ...p, name: c.name } : p));
    case "reorder-parties":
      return inOrder(parties, c.ids);
    case "reorder-guests":
      return parties.map((p) => (p.id === c.partyId ? { ...p, guests: inOrder(p.guests, c.ids) } : p));
  }
}

function requestFor(c: Change): Promise<string | null> {
  switch (c.type) {
    case "invite":
      return send("PATCH", "/api/admin/guests", { action: "invite", ids: c.ids, invited: c.invited });
    case "side":
      return send("PATCH", "/api/admin/parties", { action: "side", id: c.partyId, side: c.side });
    case "rename-guest":
      return send("PATCH", "/api/admin/guests", { action: "rename", id: c.id, first_name: c.first_name, last_name: c.last_name });
    case "rename-party":
      return send("PATCH", "/api/admin/parties", { action: "rename", id: c.id, name: c.name });
    case "reorder-parties":
      return send("PATCH", "/api/admin/parties", { action: "reorder", ids: c.ids });
    case "reorder-guests":
      return send("PATCH", "/api/admin/guests", { action: "reorder", partyId: c.partyId, ids: c.ids });
  }
}

/** JSON request to an admin route. Returns an error message, or null on success. */
async function send(method: "POST" | "PATCH" | "DELETE", path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

/** Null for a plus-one who hasn't been given a name yet. */
const guestName = (g: AdminGuest) => (g.is_plus_one && !g.first_name ? null : `${g.first_name} ${g.last_name}`);

const answer = (v: boolean | null) => (v === null ? "pending" : v ? "yes" : "no");

const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Fixed locale and zone so the server render and hydration agree.
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "America/Los_Angeles" });

type Filters = {
  query: string;
  invite: "all" | "invited" | "not";
  rsvp: "all" | "yes" | "no" | "pending";
  side: "all" | Side | "none";
  sort: "custom" | "name" | "responded";
};
const noFilters: Filters = { query: "", invite: "all", rsvp: "all", side: "all", sort: "custom" };
const inviteOptions: [Filters["invite"], string][] = [["all", "All"], ["invited", "Invited"], ["not", "Not invited"]];
const rsvpOptions: [Filters["rsvp"], string][] = [["all", "All"], ["yes", "Attending"], ["no", "Declined"], ["pending", "Pending"]];
const sideOptions: [Filters["side"], string][] = [
  ["all", "All"],
  ...sides.map((s): [Side, string] => [s.value, s.label]),
  ["none", "Not set"],
];
const sortOptions: [Filters["sort"], string][] = [["custom", "Your order"], ["name", "Name A–Z"], ["responded", "Recently responded"]];

/**
 * Search picks which parties show (by party or member name); the invite and
 * RSVP filters pick which people show inside them.
 */
function applyFilters(parties: AdminParty[], f: Filters) {
  const q = normName(f.query);
  const filteringPeople = f.invite !== "all" || f.rsvp !== "all";
  const rsvpValue = { all: undefined, yes: true, no: false, pending: null }[f.rsvp];
  const keepGuest = (g: AdminGuest) =>
    (f.invite === "all" || g.invited === (f.invite === "invited")) && (f.rsvp === "all" || g.attending === rsvpValue);
  const rows = parties
    .filter((p) => f.side === "all" || p.side === (f.side === "none" ? null : f.side))
    .filter(
      (p) =>
        !q || normName(p.name).includes(q) || p.guests.some((g) => normName(`${g.first_name} ${g.last_name}`).includes(q)),
    )
    .map((p) => ({ party: p, guests: p.guests.filter(keepGuest) }))
    .filter((r) => r.guests.length > 0 || (!filteringPeople && r.party.guests.length === 0));
  if (f.sort === "name") rows.sort((a, b) => a.party.name.localeCompare(b.party.name));
  if (f.sort === "responded") {
    rows.sort(
      (a, b) =>
        (b.party.responded_at ?? "").localeCompare(a.party.responded_at ?? "") || a.party.name.localeCompare(b.party.name),
    );
  }
  return rows;
}

// Drag only up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function useDragSensors() {
  return useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
}

/** Screen reader messages that use names instead of database ids. */
const announcements = (nameOf: (id: UniqueIdentifier) => string): Announcements => ({
  onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
  onDragOver: ({ active, over }) =>
    over && over.id !== active.id ? `${nameOf(active.id)} is now in ${nameOf(over.id)}'s place.` : undefined,
  onDragEnd: ({ active }) => `Dropped ${nameOf(active.id)}.`,
  onDragCancel: ({ active }) => `Move cancelled. ${nameOf(active.id)} is back where it was.`,
});

// dnd-kit renders its screen reader text where the context is unless given a
// container, and a <div> inside a table is invalid. Undefined on the server,
// where that text isn't rendered anyway.
const a11yContainer = () => (typeof document === "undefined" ? undefined : document.body);

/** New order of `ids` after dragging `active` onto `over`, or null for no move. */
function moved(ids: string[], { active, over }: DragEndEvent): string[] | null {
  if (!over || active.id === over.id) return null;
  return arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
}

export default function GuestList({ parties }: { parties: AdminParty[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState(noFilters);
  const [, startTransition] = useTransition();
  // Edits show at once. The refresh that follows runs in the same transition,
  // so nothing flips back while the saved list loads.
  const [shown, show] = useOptimistic(parties, applyChange);
  const sensors = useDragSensors();

  /** Send a change, report any error, then reload the list and the counts above it. */
  function save(request: () => Promise<string | null>, optimistic?: () => void) {
    setError("");
    startTransition(async () => {
      optimistic?.();
      const problem = await request();
      if (problem) setError(problem);
      startTransition(() => router.refresh());
    });
  }

  const change = (c: Change) =>
    save(
      () => requestFor(c),
      () => show(c),
    );

  function removeGuest(g: AdminGuest, party: AdminParty) {
    const name = guestName(g);
    const lines = [name ? `Remove ${name}?` : `Remove the plus-one from ${party.name}?`];
    if (g.attending !== null) lines.push("They've already RSVP'd, and their answers will be deleted too.");
    if (party.guests.length === 1) lines.push(`This is the last person in ${party.name}, so the party will be removed too.`);
    if (confirm(lines.join("\n\n"))) save(() => send("DELETE", "/api/admin/guests", { id: g.id }));
  }

  function removeParty(party: AdminParty) {
    const n = party.guests.length;
    const people = n === 0 ? "" : ` and its ${n === 1 ? "1 person" : `${n} people`}`;
    if (confirm(`Delete ${party.name}${people}? This can't be undone.`)) {
      save(() => send("DELETE", "/api/admin/parties", { id: party.id }));
    }
  }

  const rows = applyFilters(shown, filters);
  // Reordering a filtered or re-sorted list is ambiguous, so drag only in the full saved order.
  const draggable = (Object.keys(noFilters) as (keyof Filters)[]).every((k) => filters[k] === noFilters[k]);
  const people = rows.reduce((n, r) => n + r.guests.length, 0);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const partyName = (id: UniqueIdentifier) => shown.find((p) => p.id === id)?.name ?? "party";

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-plum">Guest list</h2>
        <div className="flex flex-wrap gap-3">
          {!adding && (
            <button onClick={() => setAdding(true)} className={darkButton}>
              + Add guest
            </button>
          )}
          <a
            href="/api/admin/export"
            className="rounded-full border border-plum px-5 py-2 text-xs uppercase tracking-[0.2em] text-plum transition hover:bg-plum hover:text-cream"
          >
            Download CSV
          </a>
        </div>
      </div>

      {adding && <AddPartyForm onClose={() => setAdding(false)} />}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <input
          type="search"
          aria-label="Search names or parties"
          placeholder="Search names or parties"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          className={`${field} w-64`}
        />
        <Picker label="Invite" value={filters.invite} options={inviteOptions} onChange={(invite) => set({ invite })} />
        <Picker label="RSVP" value={filters.rsvp} options={rsvpOptions} onChange={(rsvp) => set({ rsvp })} />
        <Picker label="Guest of" value={filters.side} options={sideOptions} onChange={(side) => set({ side })} />
        <Picker label="Sort" value={filters.sort} options={sortOptions} onChange={(sort) => set({ sort })} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {people} {people === 1 ? "person" : "people"} in {rows.length} {rows.length === 1 ? "party" : "parties"}
        {draggable ? (
          " · drag the handles to reorder"
        ) : (
          <>
            {" · dragging works in Your order with no search or filters · "}
            <button onClick={() => setFilters(noFilters)} className="underline underline-offset-4 hover:text-orange-dark">
              Clear
            </button>
          </>
        )}
      </p>
      <p className="mt-1 min-h-5 text-sm text-orange-dark" role="alert">
        {error}
      </p>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-ink/10 bg-white/60">
        <DndContext
          // Fixed ids keep the server render and hydration in sync (dnd-kit uses them as element ids).
          id="dnd-parties"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[verticalOnly]}
          accessibility={{ container: a11yContainer(), announcements: announcements(partyName) }}
          onDragEnd={(e) => {
            const ids = moved(
              shown.map((p) => p.id),
              e,
            );
            if (ids) change({ type: "reorder-parties", ids });
          }}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.15em] text-muted">
              <tr>
                <th className="w-8">
                  <span className="sr-only">Reorder</span>
                </th>
                {/* whitespace-pre: never wraps on its own, but keeps the \n line break. */}
                {["Invite", "Name", "Guest of", "Wedding", "Welcome\ndrinks", "Meal", "Dietary"].map((h) => (
                  <th key={h} className="whitespace-pre px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <SortableContext items={rows.map((r) => r.party.id)} strategy={verticalListSortingStrategy}>
              {rows.map(({ party, guests }) => (
                <PartyRows
                  key={party.id}
                  party={party}
                  guests={guests}
                  draggable={draggable}
                  onChange={change}
                  onRemoveGuest={(g) => removeGuest(g, party)}
                  onRemoveParty={() => removeParty(party)}
                />
              ))}
            </SortableContext>
          </table>
        </DndContext>
        {rows.length === 0 && (
          <p className="p-6 text-center text-muted">
            {shown.length === 0 ? "No guests yet. Import your guest list, or use + Add guest." : "No one matches."}
          </p>
        )}
      </div>
    </section>
  );
}

function PartyRows({
  party,
  guests,
  draggable,
  onChange,
  onRemoveGuest,
  onRemoveParty,
}: {
  party: AdminParty;
  /** The members that pass the filters (all of them when unfiltered). */
  guests: AdminGuest[];
  draggable: boolean;
  onChange: (c: Change) => void;
  onRemoveGuest: (g: AdminGuest) => void;
  onRemoveParty: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const sensors = useDragSensors();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: party.id,
    disabled: !draggable,
  });
  const total = party.guests.length;
  const invited = party.guests.filter((g) => g.invited).length;
  const state = invited === 0 ? false : invited === total ? true : "mixed";
  const who = (id: UniqueIdentifier) => {
    const g = party.guests.find((x) => x.id === id);
    return (g && guestName(g)) ?? "the plus-one";
  };

  return (
    <tbody
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`border-t border-ink/10 first-of-type:border-t-0 ${isDragging ? "relative z-10 bg-cream shadow-lg" : ""}`}
    >
      <tr className="bg-linen/70">
        <td className="pl-3">
          {draggable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Move party: ${party.name}`}
              className={handle}
            >
              <Grip />
            </button>
          )}
        </td>
        <td className="px-4 py-2.5">
          {total > 0 && (
            <Switch
              checked={state}
              tristate
              // Fully invited turns everyone off; otherwise invite everyone.
              onClick={() => onChange({ type: "invite", ids: party.guests.map((g) => g.id), invited: state !== true })}
              label={`Invite everyone in ${party.name}`}
            />
          )}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <EditableText
              fields={[{ label: "Party name", value: party.name, required: true, width: "w-64" }]}
              onSave={([name]) => onChange({ type: "rename-party", id: party.id, name })}
              editLabel={`Rename party: ${party.name}`}
              display={<span className="font-serif text-xl text-plum">{party.name}</span>}
            />
            <span className="whitespace-nowrap text-xs text-muted">
              {invited} of {total} invited
              {party.responded_at ? ` · responded ${shortDate(party.responded_at)}` : ""}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <SideToggle
            value={party.side}
            partyName={party.name}
            onChange={(side) => onChange({ type: "side", partyId: party.id, side })}
          />
        </td>
        <td colSpan={4} />
        {/* In the remove column, lined up with each person's × button. */}
        <td className="px-4 py-2.5 text-right">
          <button
            onClick={onRemoveParty}
            aria-label={`Delete party: ${party.name}`}
            title="Delete party"
            className="p-1 text-muted transition hover:text-orange-dark"
          >
            <Trash />
          </button>
        </td>
      </tr>

      <DndContext
        id={`dnd-guests-${party.id}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{ container: a11yContainer(), announcements: announcements(who) }}
        onDragEnd={(e) => {
          const ids = moved(
            party.guests.map((g) => g.id),
            e,
          );
          if (ids) onChange({ type: "reorder-guests", partyId: party.id, ids });
        }}
      >
        <SortableContext items={guests.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {guests.map((g) => (
            <GuestRow
              key={g.id}
              guest={g}
              party={party}
              draggable={draggable}
              onChange={onChange}
              onRemove={() => onRemoveGuest(g)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Last line of the party, under its people, so it reads as part of the group. */}
      <tr>
        <td colSpan={2} />
        <td colSpan={7} className={adding ? "px-4 py-3" : "px-4 pb-3 pt-1"}>
          {adding ? (
            <AddGuestForm partyId={party.id} onClose={() => setAdding(false)} />
          ) : (
            <button onClick={() => setAdding(true)} className={quietButton}>
              + Add to party
            </button>
          )}
        </td>
      </tr>
    </tbody>
  );
}

function GuestRow({
  guest: g,
  party,
  draggable,
  onChange,
  onRemove,
}: {
  guest: AdminGuest;
  party: AdminParty;
  draggable: boolean;
  onChange: (c: Change) => void;
  onRemove: () => void;
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: g.id,
    disabled: !draggable,
  });
  const name = guestName(g);
  const who = name ?? `the plus-one in ${party.name}`;
  // Dim everything but the controls for people who aren't invited.
  const dim = g.invited ? "" : "opacity-50";
  const cell = `px-4 py-2.5 ${dim}`;

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 bg-cream shadow-md" : ""}
    >
      <td className="pl-3">
        {draggable && (
          <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Move ${who}`} className={handle}>
            <Grip />
          </button>
        )}
      </td>
      <td className="px-4 py-2.5">
        <Switch checked={g.invited} onClick={() => onChange({ type: "invite", ids: [g.id], invited: !g.invited })} label={`Invite ${who}`} />
      </td>
      <td className="whitespace-nowrap px-4 py-2.5">
        <EditableText
          fields={[
            // A plus-one can stay unnamed; the server wants both names or neither.
            { label: "First name", value: g.first_name, required: !g.is_plus_one },
            { label: "Last name", value: g.last_name, required: !g.is_plus_one },
          ]}
          onSave={([first_name, last_name]) => onChange({ type: "rename-guest", id: g.id, first_name, last_name })}
          editLabel={`Rename ${who}`}
          display={<span className={dim}>{name ?? <span className="text-muted">(plus-one)</span>}</span>}
        />
      </td>
      <td />
      <td className={cell}>
        <Badge v={answer(g.attending)} />
      </td>
      <td className={cell}>
        <Badge v={party.invited_to_welcome ? answer(g.attending_welcome) : "not invited"} />
      </td>
      <td className={cell}>{g.meal ?? ""}</td>
      <td className={cell}>{g.dietary ?? ""}</td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={onRemove}
          aria-label={`Remove ${who}`}
          className="px-1 text-lg leading-none text-muted transition hover:text-orange-dark"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/** Text with a pencil button that swaps it for inputs. Enter saves, Escape cancels. */
function EditableText({
  fields,
  onSave,
  editLabel,
  display,
}: {
  fields: { label: string; value: string; required?: boolean; width?: string }[];
  onSave: (values: string[]) => void;
  editLabel: string;
  display: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const pencil = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  // Put keyboard focus back on the pencil when editing ends, instead of losing it.
  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false;
      pencil.current?.focus();
    }
  }, [editing]);

  function stop() {
    refocus.current = true;
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {display}
        <button
          ref={pencil}
          type="button"
          onClick={() => {
            setValues(fields.map((f) => f.value));
            setEditing(true);
          }}
          aria-label={editLabel}
          title={editLabel}
          className="rounded p-1 text-muted transition hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <Pencil />
        </button>
      </span>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = values.map((v) => v.trim().replace(/\s+/g, " "));
    stop();
    if (next.some((v, i) => v !== fields[i].value)) onSave(next);
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") stop();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      {fields.map((f, i) => (
        <input
          key={f.label}
          aria-label={f.label}
          placeholder={f.label}
          autoFocus={i === 0}
          required={f.required}
          value={values[i]}
          onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
          className={`${field} ${f.width ?? "w-32"} py-1`}
        />
      ))}
      <button type="submit" className="rounded-full bg-plum px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-cream hover:bg-ink">
        Save
      </button>
      <button type="button" onClick={stop} className={quietButton}>
        Cancel
      </button>
    </form>
  );
}

function Trash() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function Pencil() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function SideToggle({ value, partyName, onChange }: { value: Side | null; partyName: string; onChange: (s: Side) => void }) {
  return (
    <div
      role="group"
      aria-label={`Whose guests are ${partyName}?`}
      // Orange outline while not set, so unassigned invites stand out.
      className={`flex overflow-hidden rounded-full border text-xs ${value ? "border-plum/30" : "border-orange-dark/60"}`}
    >
      {sides.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={value === s.value}
          aria-label={s.label}
          title={s.label}
          onClick={() => value !== s.value && onChange(s.value)}
          className={`whitespace-nowrap px-3 py-1 transition ${
            value === s.value ? "bg-plum text-cream" : "text-plum hover:bg-lavender/15"
          }`}
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}

function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-full border border-ink/20 bg-white/70 px-3 py-1.5 text-sm normal-case tracking-normal text-ink outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Add one person to an existing party. */
function AddGuestForm({ partyId, onClose }: { partyId: string; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSaving(async () => {
      const problem = await send("POST", "/api/admin/guests", { partyId, ...draft });
      if (problem) return setError(problem);
      startSaving(() => {
        onClose();
        router.refresh();
      });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <GuestFields value={draft} onChange={setDraft} />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className={darkButton}>
          {saving ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={onClose} className={quietButton}>
          Cancel
        </button>
        <p className="text-sm text-orange-dark" role="alert">
          {error}
        </p>
      </div>
    </form>
  );
}

/** Add a new party. One person and no party name makes a party of one, named after them. */
function AddPartyForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side | null>(null);
  const [welcome, setWelcome] = useState(true);
  const [guests, setGuests] = useState<Draft[]>(() => [emptyDraft()]);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const nameOptional = guests.length === 1 && !guests[0].is_plus_one;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSaving(async () => {
      const problem = await send("POST", "/api/admin/parties", { name, side, invited_to_welcome: welcome, guests });
      if (problem) return setError(problem);
      startSaving(() => {
        onClose();
        router.refresh();
      });
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-5 rounded-2xl border border-ink/10 bg-white/60 p-6">
      <h3 className="font-serif text-2xl text-plum">Add a guest or party</h3>
      <div className="space-y-3">
        {guests.map((g, i) => (
          <GuestFields
            key={i}
            value={g}
            onChange={(d) => setGuests(guests.map((x, j) => (j === i ? d : x)))}
            onRemove={guests.length > 1 ? () => setGuests(guests.filter((_, j) => j !== i)) : undefined}
          />
        ))}
        <button type="button" onClick={() => setGuests([...guests, emptyDraft()])} className={quietButton}>
          + Another person
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <input
          aria-label="Party name"
          placeholder={nameOptional ? "Party name (optional)" : "Party name, e.g. The Lopez Family"}
          required={!nameOptional}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${field} w-72`}
        />
        <div role="radiogroup" aria-label="Whose guest?" className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted">Whose guest?</span>
          {sides.map((s) => (
            <label key={s.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="side"
                required
                checked={side === s.value}
                onChange={() => setSide(s.value)}
                className="accent-plum"
              />
              {s.label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} className="accent-plum" />
          Invited to welcome drinks
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className={darkButton}>
          {saving ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={onClose} className={quietButton}>
          Cancel
        </button>
        <p className="text-sm text-orange-dark" role="alert">
          {error}
        </p>
      </div>
    </form>
  );
}

function GuestFields({
  value,
  onChange,
  onRemove,
}: {
  value: Draft;
  onChange: (d: Draft) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {value.is_plus_one ? (
        <span className="text-sm text-muted">Plus-one: their name is filled in when the party RSVPs</span>
      ) : (
        <>
          <input
            aria-label="First name"
            placeholder="First name"
            required
            value={value.first_name}
            onChange={(e) => set({ first_name: e.target.value })}
            className={field}
          />
          <input
            aria-label="Last name"
            placeholder="Last name"
            required
            value={value.last_name}
            onChange={(e) => set({ last_name: e.target.value })}
            className={field}
          />
        </>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_plus_one}
          onChange={(e) => set({ is_plus_one: e.target.checked })}
          className="accent-plum"
        />
        Plus-one
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.invited}
          onChange={(e) => set({ invited: e.target.checked })}
          className="accent-plum"
        />
        Invited
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this person"
          className="px-1 text-lg leading-none text-muted transition hover:text-orange-dark"
        >
          ×
        </button>
      )}
    </div>
  );
}

function Switch({
  checked,
  onClick,
  label,
  tristate = false,
}: {
  checked: boolean | "mixed";
  onClick: () => void;
  label: string;
  tristate?: boolean;
}) {
  const on = checked === true;
  return (
    <button
      type="button"
      // A party can be partly invited, which only the checkbox role can express.
      role={tristate ? "checkbox" : "switch"}
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
        on ? "bg-plum" : checked === "mixed" ? "bg-lavender" : "bg-ink/20"
      }`}
    >
      <span
        aria-hidden
        className={`size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
          on ? "translate-x-5.5" : checked === "mixed" ? "translate-x-3" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Grip() {
  return (
    <svg viewBox="0 0 10 16" aria-hidden className="h-4 w-2.5" fill="currentColor">
      {[2, 8].flatMap((x) => [2, 8, 14].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
    </svg>
  );
}

function Badge({ v }: { v: string }) {
  const style =
    v === "yes" ? "bg-lavender/20 text-plum" : v === "no" ? "bg-peach/40 text-orange-dark" : "bg-ink/5 text-muted";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${style}`}>{v}</span>;
}
