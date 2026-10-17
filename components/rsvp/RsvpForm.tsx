"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Guest, Party } from "@/lib/types";
import { mealOptions, schedule } from "@/lib/site";

type Draft = {
  id: string;
  is_plus_one: boolean;
  first_name: string;
  last_name: string;
  attending: boolean | null;
  attending_welcome: boolean | null;
  meal: string | null;
  dietary: string;
};

const toDraft = (g: Guest): Draft => ({
  id: g.id,
  is_plus_one: g.is_plus_one,
  first_name: g.first_name,
  last_name: g.last_name,
  attending: g.attending,
  attending_welcome: g.attending_welcome,
  meal: g.meal,
  dietary: g.dietary ?? "",
});

const welcome = schedule[0].events[0];

export default function RsvpForm({ party, onSaved }: { party: Party; onSaved: (p: Party) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => party.guests.map(toDraft));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  function clientError(): string | null {
    for (const d of drafts) {
      const who = d.is_plus_one ? "your guest" : d.first_name;
      if (d.attending === null) return `Please let us know if ${who} can make it.`;
      if (d.attending && !d.meal) return `Please choose a meal for ${who}.`;
      if (d.is_plus_one && d.attending && !(d.first_name.trim() && d.last_name.trim()))
        return "Please enter your guest's name.";
      if (party.invited_to_welcome && d.attending_welcome === null)
        return `Please let us know if ${who} will join us for welcome drinks.`;
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = clientError();
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: party.id,
          guests: drafts.map((d) => ({
            id: d.id,
            attending: d.attending,
            attending_welcome: party.invited_to_welcome ? d.attending_welcome : null,
            meal: d.attending ? d.meal : null,
            dietary: d.attending ? d.dietary : null,
            ...(d.is_plus_one && { first_name: d.first_name, last_name: d.last_name }),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Something went wrong.");
      onSaved(data.party);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Invitation for</p>
        <h2 className="font-serif text-4xl text-plum">{party.name}</h2>
      </div>

      {drafts.map((d, i) => (
        <motion.fieldset
          key={d.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-3xl border border-ink/10 bg-white/60 p-6"
        >
          <legend className="sr-only">{d.is_plus_one ? "Your guest" : `${d.first_name} ${d.last_name}`}</legend>
          <h3 className="font-serif text-2xl text-ink">
            {d.is_plus_one ? "Your guest" : `${d.first_name} ${d.last_name}`}
          </h3>

          <Choice
            label="Wedding · Saturday, July 24"
            value={d.attending}
            yes="Joyfully accepts"
            no="Regretfully declines"
            onChange={(v) => update(d.id, { attending: v })}
          />

          <AnimatePresence initial={false}>
            {d.attending && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-5 pt-5">
                  {d.is_plus_one && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Guest first name" value={d.first_name} onChange={(v) => update(d.id, { first_name: v })} />
                      <Input label="Guest last name" value={d.last_name} onChange={(v) => update(d.id, { last_name: v })} />
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">Dinner</p>
                    <div className="grid gap-2">
                      {mealOptions.map((m) => (
                        <label
                          key={m.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            d.meal === m.value ? "border-lavender bg-lavender/10" : "border-ink/10 hover:border-lavender/60"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`meal-${d.id}`}
                            checked={d.meal === m.value}
                            onChange={() => update(d.id, { meal: m.value })}
                            className="accent-plum"
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`diet-${d.id}`} className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted">
                      Dietary restrictions or allergies <span className="normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      id={`diet-${d.id}`}
                      rows={2}
                      maxLength={500}
                      value={d.dietary}
                      onChange={(e) => update(d.id, { dietary: e.target.value })}
                      className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {party.invited_to_welcome && (
            <Choice
              label={`${welcome.title} · Friday, July 23 at ${welcome.place}`}
              value={d.attending_welcome}
              yes="I'll be there"
              no="Can't make it"
              onChange={(v) => update(d.id, { attending_welcome: v })}
            />
          )}
        </motion.fieldset>
      ))}

      <p className="min-h-6 text-center text-sm text-poppy" role="alert">
        {error}
      </p>
      <div className="text-center">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-poppy px-10 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-poppy-dark disabled:opacity-50"
        >
          {saving ? "Sending…" : party.responded_at ? "Update RSVP" : "Send RSVP"}
        </button>
      </div>
    </form>
  );
}

function Choice({
  label,
  value,
  yes,
  no,
  onChange,
}: {
  label: string;
  value: boolean | null;
  yes: string;
  no: string;
  onChange: (v: boolean) => void;
}) {
  const btn = (active: boolean) =>
    `flex-1 rounded-full border px-4 py-2.5 text-sm transition ${
      active ? "border-plum bg-plum text-cream" : "border-ink/15 hover:border-lavender"
    }`;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={value === true} className={btn(value === true)} onClick={() => onChange(true)}>
          {yes}
        </button>
        <button type="button" role="radio" aria-checked={value === false} className={btn(value === false)} onClick={() => onChange(false)}>
          {no}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted">{label}</span>
      <input
        value={value}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-2.5 outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
      />
    </label>
  );
}
