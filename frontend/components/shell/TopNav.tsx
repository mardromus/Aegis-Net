"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aegis-Net masthead.
 *
 * Designed like a journal cover-strip: editorial wordmark on the left,
 * named sections in serif italic, a discreet keyboard search prompt.
 * No glow, no gradient, no glass.
 */
const sections = [
  { href: "/dashboard", label: "Briefing" },
  { href: "/map", label: "Atlas" },
  { href: "/dossier", label: "Dossiers" },
  { href: "/traces", label: "Reasoning" },
  { href: "/reason", label: "Console" },
  { href: "/architecture", label: "Blueprint" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-paper border-b border-ink">
      {/* Volume / issue strip */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-[1600px] px-6 h-7 flex items-center justify-between text-[10px] font-mono tracking-widest text-ink-3 uppercase">
          <span>Vol. I · Issue 01 · A reasoning atlas of Indian healthcare</span>
          <span className="hidden sm:inline">10,000 facilities · 28 states · 8 capabilities</span>
        </div>
      </div>

      {/* Masthead row */}
      <div className="mx-auto max-w-[1600px] px-6 h-[44px] flex items-center gap-8">
        <Link href="/" className="flex items-baseline gap-2.5 select-none">
          <span className="font-display font-bold tracking-tight text-[22px] text-ink leading-none">
            Aegis<span className="text-accent">·</span>Net
          </span>
          <span className="hidden md:inline font-display italic text-[13px] text-ink-3">
            the audited republic of care
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 ml-2">
          {sections.map((s) => {
            const active = pathname?.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "relative font-display text-[15px] transition-colors",
                  active
                    ? "text-accent italic"
                    : "text-ink hover:text-accent"
                )}
              >
                {s.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("aegis:open-command"));
          }}
          className="hidden sm:flex items-center gap-2 px-3 h-8 text-xs text-ink-3 hover:text-ink border border-rule-strong hover:border-ink transition-colors bg-paper-2"
        >
          <Search className="h-3 w-3" />
          <span className="font-display italic">Search the registry</span>
          <kbd className="ml-3 font-mono text-[10px] px-1.5 py-px bg-paper border border-rule">
            ⌘ K
          </kbd>
        </button>
      </div>
    </header>
  );
}
