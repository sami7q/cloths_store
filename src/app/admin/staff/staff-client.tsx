"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import { inviteStaff, setStaffRole, toggleStaffActive } from "@/server/admin/staff";
import { AdminIcons } from "@/components/admin/icons";
import { AdminSelect } from "@/components/admin/list-controls";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const t = messages.admin;
const ts = t.staff;
const ROLES = ["STAFF", "MANAGER", "ADMIN"] as const;

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joined: string;
  isSelf: boolean;
};

export function StaffClient({ rows }: { rows: StaffRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const changeRole = (row: StaffRow, role: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await setStaffRole({ userId: row.id, role });
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  const toggle = (row: StaffRow) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleStaffActive({ userId: row.id });
      setFeedback(result.ok ? result.message : result.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
        >
          <AdminIcons.plus width={15} height={15} /> {ts.invite}
        </button>
        {feedback && <p className="text-sm font-bold text-gray-6">{feedback}</p>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-line bg-card/60 text-[11.5px] uppercase tracking-[0.5px] text-gray-6">
              <th className="px-4 py-3 text-start font-bold">{ts.member}</th>
              <th className="px-4 py-3 text-start font-bold">{ts.inviteRole}</th>
              <th className="px-4 py-3 text-start font-bold">{t.customers.joined}</th>
              <th className="px-4 py-3 text-start font-bold">{t.common.status}</th>
              <th className="px-4 py-3 text-start font-bold">{t.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">
                    {row.name}
                    {row.isSelf && <span className="ms-2 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase text-white">you</span>}
                  </p>
                  <p className="text-xs text-gray-4">{row.email}</p>
                </td>
                <td className="px-4 py-3">
                  {row.isSelf ? (
                    <span className="font-bold">{row.role}</span>
                  ) : (
                    <AdminSelect
                      value={row.role}
                      disabled={pending}
                      onChange={(e) => changeRole(row, e.target.value)}
                      aria-label={ts.changeRole}
                      className="h-9"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </AdminSelect>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-6">{row.joined}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      row.isActive ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]",
                    )}
                  >
                    {row.isActive ? t.common.active : t.common.inactive}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!row.isSelf && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(row)}
                      className={cn(
                        "rounded-full border border-line px-3.5 py-1.5 text-xs font-bold uppercase",
                        row.isActive ? "text-deal-red hover:border-deal-red" : "text-save-green hover:border-save-green",
                      )}
                    >
                      {row.isActive ? ts.deactivate : ts.activate}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSaved={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteStaff({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "STAFF"),
      });
      if (result.ok) {
        setTempPassword(result.tempPassword);
        onSaved();
      } else setError(result.error);
    });
  };

  return (
    <Modal open onClose={onClose} title={ts.invite} className="max-w-md">
      {tempPassword ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-save-green">{ts.invited}</p>
          <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{ts.tempPassword}</p>
          <code className="rounded-xl border border-line bg-card px-4 py-3 text-center font-mono text-lg font-bold text-navy">
            {tempPassword}
          </code>
          <p className="text-xs text-gray-4">{ts.tempPasswordNote}</p>
          <button
            type="button"
            onClick={onClose}
            className="h-10 self-start rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep"
          >
            {t.common.back}
          </button>
        </div>
      ) : (
        <form action={submit} className="flex flex-col gap-4">
          <Field label={ts.inviteName}>
            <input
              name="name"
              required
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-navy"
            />
          </Field>
          <Field label={ts.inviteEmail}>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-navy"
            />
          </Field>
          <Field label={ts.inviteRole}>
            <AdminSelect name="role" defaultValue="STAFF" className="h-10 w-full rounded-lg px-3">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </AdminSelect>
          </Field>
          {error && <p className="text-sm font-bold text-deal-red">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-navy px-7 text-sm font-extrabold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
            >
              {pending ? t.common.saving : ts.sendInvite}
            </button>
            <button type="button" onClick={onClose} className="text-sm font-bold text-gray-6 hover:text-navy">
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.5px] text-gray-6">{label}</span>
      {children}
    </label>
  );
}
