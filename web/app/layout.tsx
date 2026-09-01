import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silent Legacy",
  description: "Editorial control center for Silent Legacy Media",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <div className="font-semibold tracking-tight">Silent Legacy</div>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/drafts" className="hover:underline">
                  Drafts
                </Link>
                <Link href="/queue" className="hover:underline">
                  Editorial Queue
                </Link>
                <form action="/api/logout" method="post">
                  <button type="submit" className="text-slate-500 hover:underline">
                    Log out
                  </button>
                </form>
              </nav>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
