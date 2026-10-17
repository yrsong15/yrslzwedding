"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function PasswordForm({
  scope = "site",
  onSuccess,
  label = "Password",
}: {
  scope?: "site" | "admin";
  onSuccess: () => void;
  label?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, scope }),
    });
    setLoading(false);
    if (res.ok) return onSuccess();
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Something went wrong.");
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
        {label}
      </label>
      <input
        id={`pw-${scope}`}
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={label}
        className="rounded-full border border-ink/20 bg-white/70 px-5 py-3 text-center outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
      />
      <button
        type="submit"
        disabled={loading || !password}
        className="rounded-full bg-plum px-5 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-ink disabled:opacity-50"
      >
        {loading ? "Checking…" : "Enter"}
      </button>
      <p className="min-h-5 text-center text-sm text-poppy" role="alert">
        {error}
      </p>
    </motion.form>
  );
}
