// Small controls and helpers shared by the admin pages.

/** For matching searches: case- and spacing-insensitive. */
export const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Fixed locale and zone so the server render and hydration agree.
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "America/Los_Angeles" });

export function Switch({
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

export function Picker<T extends string>({
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
