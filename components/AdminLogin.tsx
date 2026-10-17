"use client";

import { useRouter } from "next/navigation";
import PasswordForm from "./PasswordForm";

export default function AdminLogin() {
  const router = useRouter();
  return <PasswordForm scope="admin" label="Admin password" onSuccess={() => router.refresh()} />;
}
