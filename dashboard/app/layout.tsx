import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Calendar, Layers, FileText, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier Yu Log",
  description: "Personal time tracking dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen text-[13px]">
        {/* Sidebar */}
        <aside className="w-[200px] border-r border-[#E7E5E4] bg-[#FAFAF9] flex-shrink-0 flex flex-col pt-8">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold text-[#1C1917]">Atelier Log</h1>
          </div>
          <nav className="flex-1 flex flex-col gap-2 px-4">
            <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Today" />
            <NavItem href="/period" icon={<Calendar size={18} />} label="Period" />
            <NavItem href="/hierarchy" icon={<Layers size={18} />} label="Hierarchy" />
            <NavItem href="/reports" icon={<FileText size={18} />} label="Reports" />
            <NavItem href="/settings" icon={<Settings size={18} />} label="Settings" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-[1200px] mx-auto px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#E7E5E4] transition-colors text-[#1C1917]"
    >
      <span className="text-[#78716C]">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
