"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "./icons";
import { field, quietButton } from "./styles";

/** Text with a pencil button that swaps it for inputs. Enter saves, Escape cancels. */
export default function EditableText({
  fields,
  onSave,
  editLabel,
  display,
}: {
  fields: { label: string; value: string; required?: boolean; width?: string; type?: "email" }[];
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
          type={f.type}
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
