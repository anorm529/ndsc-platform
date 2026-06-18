"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

const galleryAlts = [
  "North Down Softball Club players warming up at Ward Park Bangor",
  "North Down Softball Club batting practice at Ward Park in Bangor",
  "NDSC players training together on the Ward Park softball field",
  "North Down Softball Club team huddle before a game in Bangor",
  "North Down Softball Club fielding drills at Ward Park Bangor",
  "Softball Bangor match action featuring North Down Softball Club",
  "North Down Softball Club players on base during a Ward Park fixture",
  "North Down Softball Club co-ed softball game in Northern Ireland",
  "NDSC players celebrating a big play at Ward Park Bangor",
  "North Down Softball Club training session under evening light in Bangor",
  "North Down Softball Club outfield play at Ward Park",
  "North Down Softball Club infield action during a Softball Ulster game",
  "North Down Softball Club players preparing to bat in Bangor",
  "North Down Softball Club squad photo moment at Ward Park Bangor",
  "North Down Softball Club runners and fielders in live game action",
  "North Down Softball Club teammates supporting each other from the dugout",
  "North Down Softball Club softball training for new players in Bangor",
  "North Down Softball Club team competing in softball Northern Ireland action",
  "North Down Softball Club players during a Ward Park league game",
  "North Down Softball Club club day at Ward Park Bangor",
];

export default function GalleryReel() {
  const images = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        src: `/gallery/g${String(i + 1).padStart(2, "0")}.png`,
        alt: galleryAlts[i],
      })),
    []
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(t);
  }, [images.length]);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="relative">
      <div className="mx-auto w-fit">
        <Image
          src={images[index].src}
          alt={images[index].alt}
          width={1200}
          height={800}
          className="h-auto max-h-[560px] w-auto max-w-[900px] rounded-xl object-contain"
          priority
        />
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="Previous image"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/40 px-3 py-2 text-white transition hover:bg-black/60"
      >
        &lt;
      </button>

      <button
        type="button"
        onClick={next}
        aria-label="Next image"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/40 px-3 py-2 text-white transition hover:bg-black/60"
      >
        &gt;
      </button>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to image ${i + 1}`}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "bg-teal-300" : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
