import Image from "next/image";
import { PHOTOS, type PhotoKey } from "@/content/photos";

/**
 * One photo slot (see src/content/photos.ts). A slot is filled once it has a description (alt);
 * tests/unit/photos.test.ts checks that every filled slot's file exists. Empty slots show nothing live.
 */
export function Photo({ slot, wide, priority }: { slot: PhotoKey; wide?: boolean; priority?: boolean }) {
  const p = PHOTOS[slot] as (typeof PHOTOS)[PhotoKey] & { caption?: string; credit?: string; position?: string };
  if (!p.alt.trim()) {
    if (process.env.NODE_ENV !== "development") return null;
    return (
      <figure className={`photo placeholder${wide ? " wide" : ""}`} aria-hidden="true">
        <span>
          Photo goes here: public/photos/{p.file}
          <br />
          {p.suggest}
        </span>
      </figure>
    );
  }
  return (
    <figure className={`photo${wide ? " wide" : ""}`}>
      <div className="photo-frame">
        <Image
          src={`/photos/${p.file}`}
          alt={p.alt}
          fill
          priority={priority}
          unoptimized={p.file.endsWith(".svg")}
          style={p.position ? { objectPosition: p.position } : undefined}
          sizes={wide ? "(max-width: 1200px) 100vw, 1200px" : "(max-width: 900px) 100vw, 560px"}
        />
      </div>
      {(p.caption || p.credit) && (
        <figcaption className="hint">
          {p.caption}
          {p.caption && p.credit ? " · " : ""}
          {p.credit && `Photo: ${p.credit}`}
        </figcaption>
      )}
    </figure>
  );
}
