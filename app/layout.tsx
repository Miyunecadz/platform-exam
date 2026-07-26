import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import { REPO_URL } from "@/lib/site";

// Grotesque display over serif body: the note argues in prose but is built on
// tables and ids, so the mono face carries every structural marker.
const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Platform Foundation — Take-Home Submission",
    template: "%s — Platform Foundation",
  },
  description:
    "Architecture note, a definition-driven validation library, and a closing reflection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <SiteNav />
        {children}
        <footer>
          <div className="footer-inner">
            <span>Built with Next.js · deployed on Vercel</span>
            <a href={REPO_URL}>github ↗</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
