import Link from "next/link";
import { can, type AdminModule } from "@/lib/permissions";
import type { Role } from "@/lib/enums";
import { messages } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

// Phase-2 stand-in for each admin module — proves the RBAC gate works.
// Replaced module-by-module in Phase 6.
export function ModulePlaceholder({ module, role }: { module: AdminModule; role: Role }) {
  const t = messages.admin;
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[1px]">{module}</h1>
        <Badge tone="save">{t.moduleView}</Badge>
        {can(role, module, "edit") ? <Badge tone="navy">{t.moduleEdit}</Badge> : null}
      </header>
      <p className="text-sm text-gray-6">{t.placeholderNote}</p>
      <p>
        <Link href="/admin" className="text-sm font-bold text-navy hover:underline">
          ← {t.backToDashboard}
        </Link>
      </p>
    </div>
  );
}
