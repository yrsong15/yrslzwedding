"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Party } from "@/lib/types";
import { mealOptions } from "@/lib/site";

const mealLabel = (v: string | null) => mealOptions.find((m) => m.value === v)?.label ?? "—";

export default function RsvpSummary({
  party,
  onEdit,
  onCleared,
}: {
  party: Party;
  onEdit: () => void;
  onCleared: (p: Party) => void;
}) {
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  // Unnamed plus-ones who declined have nothing to show.
  const guests = party.guests.filter((g) => !(g.is_plus_one && !g.attending));
  const anyoneComing = party.guests.some((g) => g.attending);

  async function clear() {
    if (!confirm("Clear your RSVP? You can fill it out again afterwards.")) return;
    setClearing(true);
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Something went wrong.");
      onCleared(data.party);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lavender/20 font-serif text-3xl text-plum"
      >
        {anyoneComing ? "♥" : "✉"}
      </motion.div>
      <h2 className="mt-4 font-serif text-4xl text-plum">
        {anyoneComing ? "We can't wait to celebrate with you!" : "We'll miss you!"}
      </h2>
      <p className="mt-2 text-muted">Here&apos;s what we have for {party.name}:</p>

      <ul className="mt-8 space-y-3 text-left">
        {guests.map((g) => (
          <li key={g.id} className="rounded-2xl border border-ink/10 bg-white/60 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-serif text-2xl">
                {g.first_name} {g.last_name}
              </p>
              <span className={`text-sm ${g.attending ? "text-plum" : "text-muted"}`}>
                {g.attending ? "Attending" : "Not attending"}
              </span>
            </div>
            {g.attending && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-muted">
                <dt>Dinner</dt>
                <dd className="text-ink">{mealLabel(g.meal)}</dd>
                {g.dietary && (
                  <>
                    <dt>Dietary</dt>
                    <dd className="text-ink">{g.dietary}</dd>
                  </>
                )}
              </dl>
            )}
            {party.invited_to_welcome && (
              <p className="mt-1 text-sm text-muted">
                Welcome drinks: <span className="text-ink">{g.attending_welcome ? "Yes" : "No"}</span>
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={onEdit}
          className="rounded-full border border-plum px-8 py-3 text-sm uppercase tracking-[0.2em] text-plum transition hover:bg-plum hover:text-cream"
        >
          Edit RSVP
        </button>
        <button
          onClick={clear}
          disabled={clearing}
          className="rounded-full px-6 py-3 text-sm uppercase tracking-[0.2em] text-muted transition hover:text-orange-dark disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear response"}
        </button>
      </div>
      <p className="mt-3 min-h-5 text-sm text-orange-dark" role="alert">
        {error}
      </p>
    </div>
  );
}
