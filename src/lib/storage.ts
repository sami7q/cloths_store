import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Upload storage — local `/public/uploads` driver for dev (§2). Production
 * swaps in an S3-compatible driver implementing the same interface; callers
 * only ever see `putFile`/`deleteFile` and public URLs.
 */

export type StorageDriver = {
  /** Persist a file and return its public URL. */
  putFile(file: File, subdir: string): Promise<string>;
  /** Best-effort delete by public URL (no-op for unknown URLs). */
  deleteFile(url: string): Promise<void>;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

class LocalStorageDriver implements StorageDriver {
  private root = path.join(process.cwd(), "public", "uploads");

  async putFile(file: File, subdir: string): Promise<string> {
    const ext = EXT_BY_MIME[file.type];
    if (!ext) throw new Error("unsupported_file_type");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("file_too_large");
    const safeSubdir = subdir.replace(/[^a-z0-9-]/gi, "");
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = `${createHash("sha1").update(buffer).digest("hex").slice(0, 10)}-${randomUUID().slice(0, 8)}.${ext}`;
    const dir = path.join(this.root, safeSubdir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
    return `/uploads/${safeSubdir}/${name}`;
  }

  async deleteFile(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    const rel = url.slice("/uploads/".length).split("/").filter((p) => p && p !== "..");
    try {
      await unlink(path.join(this.root, ...rel));
    } catch {
      // already gone — fine
    }
  }
}

export const storage: StorageDriver = new LocalStorageDriver();
