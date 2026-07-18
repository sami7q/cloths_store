"use client";

import { useActionState, useState } from "react";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/server/account";
import type { AuthFormState } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type AddressRow = {
  id: string;
  label: string;
  country: string;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  phone: string;
  isDefault: boolean;
};

type Strings = typeof import("../../../../../messages/en.json")["account"] &
  typeof import("../../../../../messages/en.json")["checkout"];

export function AddressesClient({ addresses, t }: { addresses: AddressRow[]; t: Strings }) {
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const action = editing === "new" ? createAddress : updateAddress;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    async (prev, fd) => {
      const result = await action(prev, fd);
      if (result.success) setEditing(null);
      return result;
    },
    {},
  );

  const initial = editing !== "new" && editing ? editing : null;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {addresses.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-white p-4">
            <div className="min-w-0">
              <p className="font-extrabold">
                {a.label} {a.isDefault ? <Badge tone="save">{t.default}</Badge> : null}
              </p>
              <p className="mt-0.5 text-sm text-gray-6">
                {a.street}
                {a.building ? `, ${a.building}` : ""}, {a.area ? `${a.area}, ` : ""}
                {a.city}, {a.country} · {a.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!a.isDefault ? (
                <form action={setDefaultAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="ghost" size="sm">{t.setDefault}</Button>
                </form>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                {t.editAddress}
              </Button>
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="danger" size="sm">{t.deleteAddress}</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {editing === null ? (
        <Button className="self-start" onClick={() => setEditing("new")}>
          + {t.addAddress}
        </Button>
      ) : (
        <form action={formAction} className="flex max-w-[520px] flex-col gap-3 rounded-[10px] border border-navy bg-white p-5">
          {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.label}
              <Input name="label" defaultValue={initial?.label ?? ""} required className="h-11" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.phone}
              <Input name="phone" defaultValue={initial?.phone ?? ""} required className="h-11" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.country}
              <Input name="country" defaultValue={initial?.country ?? "Egypt"} required className="h-11" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.city}
              <Input name="city" defaultValue={initial?.city ?? ""} required className="h-11" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {t.area}
            <Input name="area" defaultValue={initial?.area ?? ""} className="h-11" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {t.street}
            <Input name="street" defaultValue={initial?.street ?? ""} required className="h-11" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {t.building}
            <Input name="building" defaultValue={initial?.building ?? ""} className="h-11" />
          </label>
          {state.error ? <p className="text-sm font-semibold text-deal-red">{state.error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{t.save}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t.cancel}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
