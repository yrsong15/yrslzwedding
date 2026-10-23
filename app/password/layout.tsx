import type { Metadata } from "next";
import { couple, passwordPageKo } from "@/lib/site";

// The page is a client component, so its metadata lives here. The tab title is
// bilingual like the page.
export const metadata: Metadata = {
  title: { absolute: `${couple.names} · ${passwordPageKo.title}` },
};

export default function PasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
