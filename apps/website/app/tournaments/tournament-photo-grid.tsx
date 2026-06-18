"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

type TournamentPhotoGridProps = {
  photos: string[];
  label: string;
};

const previewCount = 6;

export default function TournamentPhotoGrid({
  photos,
  label,
}: TournamentPhotoGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const previewPhotos = useMemo(() => photos.slice(0, previewCount), [photos]);
  const extraCount = Math.max(0, photos.length - previewCount);
  const activePhoto = activeIndex == null ? null : photos[activeIndex];

  const nextPhoto = useCallback(() => {
    setActiveIndex((index) => (index == null ? index : (index + 1) % photos.length));
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex == null) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") nextPhoto();
      if (event.key === "ArrowLeft") prevPhoto();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, nextPhoto, prevPhoto]);

  if (photos.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/18 bg-white/10 p-8 text-sm font-bold uppercase tracking-wide text-white/72">
        Photos coming soon
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {previewPhotos.map((src, index) => {
          const isLastPreview = index === previewPhotos.length - 1;
          const showMoreOverlay = isLastPreview && extraCount > 0;

          return (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative overflow-hidden rounded-[22px] border border-white/18 bg-white/10 text-left shadow-[0_18px_40px_rgba(19,12,42,0.18)]"
              aria-label={`Open ${label} tournament photo ${index + 1}`}
            >
              <Image
                src={src}
                alt={`${label} tournament photo ${index + 1}`}
                width={900}
                height={700}
                className="aspect-[4/3] h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              {showMoreOverlay ? (
                <div className="absolute inset-0 grid place-items-center bg-[#2B2254]/72 text-center">
                  <div>
                    <div className="text-4xl font-black italic text-white">
                      +{extraCount}
                    </div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-white/80">
                      More Photos
                    </div>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {photos.length > previewCount ? (
        <button
          type="button"
          onClick={() => setActiveIndex(0)}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/16"
        >
          View Full Gallery
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}

      {activePhoto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#130a26]/92 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setActiveIndex(null)}
            aria-label="Close tournament gallery"
          />

          <div className="relative z-10 w-full max-w-6xl">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute -top-12 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close tournament gallery"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-white/16 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <Image
                src={activePhoto}
                alt={`${label} tournament photo ${(activeIndex ?? 0) + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 text-sm font-bold uppercase tracking-wide text-white/72">
              <span>{label}</span>
              <span>
                {(activeIndex ?? 0) + 1} / {photos.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition hover:bg-white/20 md:left-8"
            aria-label="Previous tournament photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={nextPhoto}
            className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition hover:bg-white/20 md:right-8"
            aria-label="Next tournament photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
