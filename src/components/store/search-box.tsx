"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";
import { searchSuggestions, type SearchSuggestion } from "@/server/search";

type Labels = {
  placeholder: string;
  searchLabel: string;
  seeAll: string;
  noSuggestions: string;
};

/** Header search with debounced live suggestions (§5 /search). */
export function SearchBox({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchSuggestion[] | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onChange = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      latest.current = trimmed;
      const res = await searchSuggestions(trimmed);
      if (latest.current === trimmed) {
        setResults(res);
        setOpen(true);
      }
    }, 250);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} role="search">
        <input
          type="search"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder={labels.placeholder}
          className="h-14 w-full rounded-[32px] border border-line bg-white pe-16 ps-[26px] text-base text-ink outline-none transition-colors placeholder:text-gray-4 focus:border-navy"
        />
        <button
          type="submit"
          aria-label={labels.searchLabel}
          className="absolute end-1.5 top-1.5 flex size-11 items-center justify-center rounded-full bg-navy text-white"
        >
          <SearchIcon className="size-[18px]" />
        </button>
      </form>

      {open && results ? (
        <div className="absolute inset-x-0 top-[60px] z-[70] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          {results.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-6">{labels.noSuggestions}</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/product/${r.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-4 py-2.5 hover:bg-card"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-card">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" className="h-4/5 w-4/5 object-contain" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
                    <span className="text-sm font-extrabold text-navy">{r.priceLabel}</span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-line">
                <button
                  type="button"
                  onClick={submit}
                  className="w-full px-5 py-3 text-start text-sm font-bold text-navy hover:bg-card"
                >
                  {labels.seeAll} →
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
