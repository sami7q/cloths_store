"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/i18n";
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
  uploadProductImages,
} from "@/server/admin/products";
import { AdminIcons } from "@/components/admin/icons";
import { AdminSelect } from "@/components/admin/list-controls";

const t = messages.admin.products;
const tc = messages.admin.common;

type ImageItem = { id: string; url: string; alt: string; variantColorRef: string | null };

export function MediaManager({
  productId,
  images,
  colorNames,
}: {
  productId: string;
  images: ImageItem[];
  colorNames: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ImageItem[]>(images);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const formData = new FormData();
    formData.set("productId", productId);
    for (const file of Array.from(files)) formData.append("files", file);
    startTransition(async () => {
      await uploadProductImages(formData);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  };

  const drop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    setDragIndex(null);
    startTransition(async () => {
      await reorderProductImages(productId, next.map((i) => i.id));
      router.refresh();
    });
  };

  const saveMeta = (image: ImageItem) =>
    startTransition(async () => {
      await updateProductImage({ imageId: image.id, alt: image.alt, variantColorRef: image.variantColorRef });
      router.refresh();
    });

  const remove = (id: string) => {
    setItems((list) => list.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteProductImage(id);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="h-10 rounded-full bg-navy px-5 text-sm font-bold uppercase tracking-[0.5px] text-white hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? tc.uploading : t.uploadImages}
        </button>
        <p className="text-xs text-gray-4">{t.mediaHint}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-gray-4">
          {messages.admin.table.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(index)}
              className="flex gap-3 rounded-2xl border border-line bg-white p-3"
            >
              <span className="mt-1 cursor-grab text-gray-4" title={t.mediaHint}>
                <AdminIcons.drag width={16} height={16} />
              </span>
              <Image
                src={image.url}
                alt={image.alt}
                width={84}
                height={84}
                className="h-[84px] w-[84px] shrink-0 rounded-xl border border-line object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  value={image.alt}
                  onChange={(e) =>
                    setItems((list) => list.map((i) => (i.id === image.id ? { ...i, alt: e.target.value } : i)))
                  }
                  onBlur={() => saveMeta({ ...image, alt: items.find((i) => i.id === image.id)?.alt ?? image.alt })}
                  placeholder={t.altText}
                  className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm outline-none placeholder:text-gray-4 focus:border-navy"
                />
                <div className="flex items-center gap-2">
                  <AdminSelect
                    value={image.variantColorRef ?? ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setItems((list) => list.map((i) => (i.id === image.id ? { ...i, variantColorRef: value } : i)));
                      saveMeta({ ...image, variantColorRef: value });
                    }}
                    aria-label={t.bindToColor}
                    className="h-9 flex-1 rounded-lg px-2.5 text-sm"
                  >
                    <option value="">{t.allColors}</option>
                    {colorNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </AdminSelect>
                  <button
                    type="button"
                    onClick={() => remove(image.id)}
                    aria-label={t.deleteImage}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-4 hover:bg-card hover:text-deal-red"
                  >
                    <AdminIcons.trash width={15} height={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
