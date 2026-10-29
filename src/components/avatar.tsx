"use client";

import { useState } from "react";

/**
 * A round photo that falls back to initials if the image is missing or fails.
 * LinkedIn photo links expire, so the fallback keeps the About page intact.
 */
export function Avatar({ src, name, size = 80 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <span
      className="mx-auto flex items-center justify-center overflow-hidden rounded-full bg-mint-soft font-display text-mint-ink ring-4 ring-card"
      style={{ width: size, height: size, fontSize: size / 3.2 }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote profile photo, fixed small size
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
