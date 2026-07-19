"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { saveLinks } from "@/server/admin/content";
import { AdminIcons } from "@/components/admin/icons";

const t = messages.admin;
const tc = t.content;

export type CmsLink = { label: string; labelAr: string; href: string };

const input =
  "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy";

export function LinksClient({
  navLinks,
  footerLinks,
  canEdit,
}: {
  navLinks: CmsLink[];
  footerLinks: CmsLink[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nav, setNav] = useState<CmsLink[]>(navLinks);
  const [footer, setFooter] = useState<CmsLink[]>(footerLinks);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const clean = (list: CmsLink[]) => list.filter((l) => l.label.trim() && l.href.trim());
      const result = await saveLinks({ navLinks: clean(nav), footerLinks: clean(footer) });
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <LinkListEditor
        title={tc.navLinksTitle}
        hint={tc.navLinksHint}
        list={nav}
        setList={setNav}
        max={10}
        disabled={!canEdit}
      />
      <LinkListEditor
        title={tc.footerLinksTitle}
        hint={tc.footerLinksHint}
        list={footer}
        setList={setFooter}
        max={15}
        disabled={!canEdit}
      />
      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
          {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
        </div>
      )}
    </div>
  );
}

function LinkListEditor({
  title,
  hint,
  list,
  setList,
  max,
  disabled,
}: {
  title: string;
  hint: string;
  list: CmsLink[];
  setList: (updater: (prev: CmsLink[]) => CmsLink[]) => void;
  max: number;
  disabled: boolean;
}) {
  const set = (index: number, patch: Partial<CmsLink>) =>
    setList((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.5px]">{title}</h2>
      <p className="mb-3 mt-1 text-xs text-gray-4">{hint}</p>
      <div className="flex flex-col gap-2">
        {list.map((link, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              value={link.label}
              onChange={(e) => set(index, { label: e.target.value })}
              placeholder={tc.linkLabel}
              disabled={disabled}
              className={`${input} max-w-[180px]`}
            />
            <input
              value={link.labelAr}
              onChange={(e) => set(index, { labelAr: e.target.value })}
              placeholder={tc.linkLabelAr}
              dir="rtl"
              disabled={disabled}
              className={`${input} max-w-[180px]`}
            />
            <input
              value={link.href}
              onChange={(e) => set(index, { href: e.target.value })}
              placeholder="/pages/…"
              disabled={disabled}
              className={`${input} min-w-[160px] flex-1`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => setList((prev) => prev.filter((_, i) => i !== index))}
                aria-label={t.common.remove}
                className="grid h-9 w-9 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
              >
                <AdminIcons.trash width={15} height={15} />
              </button>
            )}
          </div>
        ))}
        {!disabled && list.length < max && (
          <button
            type="button"
            onClick={() => setList((prev) => [...prev, { label: "", labelAr: "", href: "" }])}
            className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-navy hover:underline"
          >
            <AdminIcons.plus width={13} height={13} /> {tc.addLink}
          </button>
        )}
      </div>
    </section>
  );
}
