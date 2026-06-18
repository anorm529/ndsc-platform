"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

export default function GalleryCarousel() {
  const images = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        src: `/gallery/g${String(i + 1).padStart(2, "0")}.png`,
        alt: galleryAlts[i],
      })),
    []
  );

  const itemsPerPage = 3;
  const totalPages = Math.ceil(images.length / itemsPerPage);
  const [page, setPage] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const next = () => setPage((p) => (p + 1) % totalPages);
  const prev = () => setPage((p) => (p - 1 + totalPages) % totalPages);
  const activeImage = activeIndex == null ? null : images[activeIndex];
  const nextImage = useCallback(() => {
    setActiveIndex((index) => (index == null ? index : (index + 1) % images.length));
  }, [images.length]);
  const prevImage = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index - 1 + images.length) % images.length
    );
  }, [images.length]);

  useEffect(() => {
    if (activeIndex == null) return;

    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") nextImage();
      if (event.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, nextImage, prevImage]);

  return (
    <div className="softball-cursor relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {Array.from({ length: totalPages }).map((_, pageIndex) => (
            <div
              key={pageIndex}
              className="min-w-full grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {images
                .slice(
                  pageIndex * itemsPerPage,
                  pageIndex * itemsPerPage + itemsPerPage
                )
                .map((image) => (
                  <button
                    type="button"
                    key={image.src}
                    className="softball-cursor overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-left transition hover:border-teal-300/50"
                    onClick={() =>
                      setActiveIndex(images.findIndex((entry) => entry.src === image.src))
                    }
                    aria-label={`Open gallery image: ${image.alt}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={1200}
                      height={800}
                      className="h-64 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={prev}
        className="softball-cursor absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
        aria-label="Previous gallery images"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={next}
        className="softball-cursor absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
        aria-label="Next gallery images"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {activeImage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#040915]/90 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setActiveIndex(null)}
            aria-label="Close gallery image"
          />

          <div className="relative z-10 w-full max-w-6xl">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="softball-cursor absolute -top-12 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close gallery image"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-black">
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <p className="mt-3 text-center text-sm text-white/75">{activeImage.alt}</p>
          </div>

          <button
            type="button"
            onClick={prevImage}
            className="softball-cursor absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 md:left-8"
            aria-label="Previous gallery image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="softball-cursor absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 md:right-8"
            aria-label="Next gallery image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
