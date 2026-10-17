"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Party } from "@/lib/types";
import { couple } from "@/lib/site";
import RsvpForm from "./RsvpForm";
import RsvpSummary from "./RsvpSummary";

type Step = { kind: "lookup" } | { kind: "choose"; parties: Party[] } | { kind: "form"; party: Party } | { kind: "done"; party: Party };

// Show the summary only if everyone has answered. Someone invited after the
// party responded hasn't, so the party goes back to the form.
const stepFor = (p: Party): Step =>
  p.responded_at && p.guests.every((g) => g.attending !== null) ? { kind: "done", party: p } : { kind: "form", party: p };

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

export default function RsvpFlow() {
  const [step, setStep] = useState<Step>({ kind: "lookup" });

  return (
    <AnimatePresence mode="wait">
      {step.kind === "lookup" && (
        <motion.div key="lookup" {...slide}>
          <Lookup
            onFound={(parties) => {
              if (parties.length === 1) setStep(stepFor(parties[0]));
              else setStep({ kind: "choose", parties });
            }}
          />
        </motion.div>
      )}

      {step.kind === "choose" && (
        <motion.div key="choose" {...slide} className="space-y-3">
          <p className="text-center text-muted">We found more than one invitation. Which is yours?</p>
          {step.parties.map((p) => (
            <button
              key={p.id}
              onClick={() => setStep(stepFor(p))}
              className="block w-full rounded-2xl border border-ink/10 bg-white/60 p-5 text-left transition hover:border-lavender"
            >
              <p className="font-serif text-2xl text-plum">{p.name}</p>
              <p className="text-sm text-muted">
                {p.guests.filter((g) => !g.is_plus_one).map((g) => `${g.first_name} ${g.last_name}`).join(", ")}
              </p>
            </button>
          ))}
          <BackLink onClick={() => setStep({ kind: "lookup" })} />
        </motion.div>
      )}

      {step.kind === "form" && (
        <motion.div key="form" {...slide}>
          <RsvpForm party={step.party} onSaved={(party) => setStep({ kind: "done", party })} />
          <BackLink onClick={() => setStep({ kind: "lookup" })} label="Not you? Search again" />
        </motion.div>
      )}

      {step.kind === "done" && (
        <motion.div key="done" {...slide}>
          <RsvpSummary
            party={step.party}
            onEdit={() => setStep({ kind: "form", party: step.party })}
            onCleared={(party) => setStep({ kind: "form", party })}
          />
          <BackLink onClick={() => setStep({ kind: "lookup" })} label="RSVP for someone else" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BackLink({ onClick, label = "← Back to search" }: { onClick: () => void; label?: string }) {
  return (
    <p className="mt-8 text-center">
      <button onClick={onClick} className="text-sm text-muted underline-offset-4 hover:text-orange-dark hover:underline">
        {label}
      </button>
    </p>
  );
}

function Lookup({ onFound }: { onFound: (parties: Party[]) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = name.trim().replace(/\s+/g, " ");
    if (!q.includes(" ")) return setError("Please enter your first and last name.");
    setLoading(true);
    try {
      const res = await fetch(`/api/rsvp/lookup?name=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Something went wrong.");
      if (data.parties.length === 0) {
        return setError(
          `Hmm, we couldn't find that name. Try it exactly as it appears on your invitation, or email us at ${couple.contactEmail}.`,
        );
      }
      onFound(data.parties);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={search} className="mx-auto max-w-md">
      <label htmlFor="rsvp-name" className="mb-2 block text-center text-xs uppercase tracking-[0.25em] text-muted">
        Your full name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="rsvp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Heungmin Son"
          autoComplete="name"
          className="flex-1 rounded-full border border-ink/20 bg-white/70 px-5 py-3 outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-plum px-8 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-ink disabled:opacity-50"
        >
          {loading ? "Searching…" : "Find me"}
        </button>
      </div>
      <p className="mt-4 min-h-6 text-center text-sm text-orange-dark" role="alert">
        {error}
      </p>
    </form>
  );
}
