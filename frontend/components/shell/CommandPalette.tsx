"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = {
  facility_id: string;
  name: string;
  address_city: string;
  address_stateOrRegion: string;
};

const navItems = [
  { label: "Briefing", href: "/dashboard", hint: "Daily numbers" },
  { label: "Atlas", href: "/map", hint: "Hexagonal map of medical deserts" },
  { label: "Dossiers", href: "/dossier", hint: "Per-facility audit ledger" },
  { label: "Reasoning", href: "/traces", hint: "Agent chain-of-thought log" },
  { label: "Console", href: "/reason", hint: "Multi-attribute search" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const customOpen = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("aegis:open-command", customOpen);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("aegis:open-command", customOpen);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12`);
        const data = await r.json();
        setHits(data.hits || []);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4 bg-ink/30 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <Command
        loop
        className="w-full max-w-xl bg-paper border border-ink shadow-letterpress"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-ink">
          <Search className="h-3.5 w-3.5 text-ink-3" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search facility, city, capability…"
            className="flex-1 h-12 bg-transparent text-ink placeholder:text-ink-4 outline-none text-sm font-display italic"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
          <kbd className="text-[10px] font-mono px-1.5 py-px text-ink-3 border border-rule-strong">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-ink-3 font-display italic">
            Nothing in the registry matches.
          </Command.Empty>

          {hits.length > 0 && (
            <Command.Group
              heading={
                <div className="eyebrow px-3 pt-2 pb-1">In the registry</div> as never
              }
            >
              {hits.map((h) => (
                <Command.Item
                  key={h.facility_id}
                  value={`${h.facility_id} ${h.name} ${h.address_city}`}
                  onSelect={() => {
                    router.push(`/dossier/${h.facility_id}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer",
                    "data-[selected=true]:bg-paper-3 hover:bg-paper-3"
                  )}
                >
                  <span className="block w-1 h-8 bg-accent" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{h.name}</div>
                    <div className="text-xs text-ink-3 truncate">
                      {h.address_city}, {h.address_stateOrRegion}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-ink-4">
                    {h.facility_id}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading={
              <div className="eyebrow px-3 pt-2 pb-1">Sections</div> as never
            }
          >
            {navItems.map((n) => (
              <Command.Item
                key={n.href}
                value={n.label + " " + n.hint}
                onSelect={() => {
                  router.push(n.href);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 cursor-pointer",
                  "data-[selected=true]:bg-paper-3 hover:bg-paper-3"
                )}
              >
                <span className="font-display text-sm">{n.label}</span>
                <span className="text-xs text-ink-3 font-display italic">{n.hint}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
