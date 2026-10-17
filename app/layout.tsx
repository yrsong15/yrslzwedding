import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Noto_Serif_KR } from "next/font/google";
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

// Korean text (Home page message). No "korean" subset exists in next/font, so
// skip preload; Google splits Hangul into unicode-range chunks, so browsers
// fetch only the glyphs a page uses.
const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  weight: ["400"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: couple.names, template: `%s · ${couple.names}` },
  description: `${weddingDateLabel} · ${location}`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${jost.variable} ${notoSerifKr.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
