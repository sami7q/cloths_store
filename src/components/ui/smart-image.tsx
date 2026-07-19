import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Absolute-fill mode (parent must be `relative`); otherwise pass width+height. */
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * next/image for raster sources, plain <img> for SVG: the optimizer blocks
 * SVG by default and an SVG gains nothing from resizing anyway. Seed
 * placeholders are SVG; merchant uploads are raster and get optimized.
 */
export function SmartImage({ src, alt, className, sizes, priority, fill, width, height }: Props) {
  const isSvg = src.split("?")[0].toLowerCase().endsWith(".svg");
  if (isSvg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? "eager" : "lazy"}
        className={fill ? cn("absolute inset-0 h-full w-full", className) : className}
      />
    );
  }
  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  }
  return (
    <Image src={src} alt={alt} width={width!} height={height!} sizes={sizes} priority={priority} className={className} />
  );
}
