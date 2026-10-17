"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import PasswordForm from "@/components/PasswordForm";
import { couple, weddingDateLabel, location } from "@/lib/site";

function Gate() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  // Only allow internal redirects.
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <PasswordForm
      onSuccess={() => {
        router.replace(dest);
        router.refresh();
      }}
    />
  );
}

export default function PasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-linen px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        <p className="text-xs uppercase tracking-[0.35em] text-lavender">Welcome to the wedding of</p>
        <h1 className="mt-4 font-serif text-5xl text-plum sm:text-6xl">{couple.names}</h1>
        <p className="mt-4 font-serif text-xl italic text-muted">
          {weddingDateLabel} · {location}
        </p>
        <div className="mx-auto my-8 h-px w-16 bg-poppy/60" />
        <p className="mb-6 text-sm text-muted">Please enter the password from your invitation.</p>
        <Suspense>
          <Gate />
        </Suspense>
      </motion.div>
    </main>
  );
}
