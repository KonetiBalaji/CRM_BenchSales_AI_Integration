import Link from "next/link";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/consultants", label: "Consultants" },
  { href: "/requirements", label: "Requirements" },
  { href: "/data-platform", label: "Data Platform" }
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-brand">
          BenchCRM
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 transition hover:bg-brand/10 hover:text-brand">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
