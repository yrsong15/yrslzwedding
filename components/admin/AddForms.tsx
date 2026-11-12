"use client";

// The Invite list's forms for adding a person to a party, or a new party.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sides } from "@/lib/site";
import type { Side } from "@/lib/types";
import { send } from "./send";
import { darkButton, field, quietButton } from "./styles";

type Draft = { first_name: string; last_name: string; is_plus_one: boolean; invited: boolean };

// Invited starts unchecked, like a blank cell in the imported sheet.
const emptyDraft = (): Draft => ({ first_name: "", last_name: "", is_plus_one: false, invited: false });

/** Add one person to an existing party. */
export function AddGuestForm({ partyId, onClose }: { partyId: string; onClose: () => void }) {
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
export function AddPartyForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side | null>(null);
  const [guests, setGuests] = useState<Draft[]>(() => [emptyDraft()]);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const nameOptional = guests.length === 1 && !guests[0].is_plus_one;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSaving(async () => {
      const problem = await send("POST", "/api/admin/parties", { name, side, guests });
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
