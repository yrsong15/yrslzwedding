"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// Korean companions for the form's text. Only the guest /password page passes
// them; the admin login stays English only.
export type PasswordFormKo = {
  placeholder: string;
  enter: string;
  checking: string;
  wrongPassword: string;
  error: string;
};

export default function PasswordForm({
  scope = "site",
  onSuccess,
  label = "Password",
  ko,
}: {
  scope?: "site" | "admin";
  onSuccess: () => void;
  label?: string;
  ko?: PasswordFormKo;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ en: string; ko: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, scope }),
    });
    setLoading(false);
    if (res.ok) return onSuccess();
    const data = await res.json().catch(() => ({}));
    setError({
      en: data.error ?? "Something went wrong.",
      ko: res.status === 401 ? (ko?.wrongPassword ?? "") : (ko?.error ?? ""),
    });
    setShake((s) => s + 1);
  }

  return (
    <motion.form
      key={shake}
      onSubmit={submit}
      animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="mx-auto flex w-full max-w-xs flex-col gap-3"
    >
      <label htmlFor={`pw-${scope}`} className="sr-only">
        {ko ? `${label} · ${ko.placeholder}` : label}
      </label>
      <input
        id={`pw-${scope}`}
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={ko ? `${label} · ${ko.placeholder}` : label}
        // A placeholder can't mix fonts, so add Noto Serif KR after Jost: Jost
        // has no Hangul, so the Korean falls through to it.
        style={ko ? { fontFamily: "var(--font-jost), var(--font-noto-serif-kr)" } : undefined}
        className="rounded-full border border-ink/20 bg-white/70 px-5 py-3 text-center outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
      />
      <button
        type="submit"
        disabled={loading || !password}
        className="rounded-full bg-plum px-5 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-ink disabled:opacity-50"
      >
        {loading ? "Checking…" : "Enter"}
        {ko && (
          <>
            <span aria-hidden className="mx-2 opacity-50">
              ·
            </span>
            <span lang="ko" className="font-korean normal-case tracking-[0.05em]">
              {loading ? ko.checking : ko.enter}
            </span>
          </>
        )}
      </button>
      <p className="min-h-5 text-center text-sm text-orange-dark" role="alert">
        {error?.en}
        {error?.ko && (
          <span lang="ko" className="mt-1 block font-korean [word-break:keep-all]">
            {error.ko}
          </span>
        )}
      </p>
    </motion.form>
  );
}
