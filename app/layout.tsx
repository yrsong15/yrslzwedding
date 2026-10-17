import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { couple, weddingDateLabel, location } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: couple.names, template: `%s · ${couple.names}` },
  description: `${weddingDateLabel} · ${location}`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${jost.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
