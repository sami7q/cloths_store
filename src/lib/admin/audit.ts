import { db } from "@/lib/db";

/**
 * Audit log on all mutating admin actions (§6 Security). Never throws —
 * an audit failure must not roll back the action it describes.
 */
export async function audit(
  userId: string | null | undefined,
  action: string,
  entity: string,
  entityId: string,
  diff?: unknown,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entity,
        entityId,
        diff: diff === undefined ? undefined : JSON.parse(JSON.stringify(diff)),
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", action, entity, entityId, err);
  }
}
