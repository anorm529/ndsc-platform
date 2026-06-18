"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    FB?: any;
  }
}

export default function FacebookSection() {
  const FB_PAGE = "https://www.facebook.com/Northdownsoftballclub";
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(480);

  // Measure container width
  useEffect(() => {
    if (!wrapRef.current) return;

    const el = wrapRef.current;

    const ro = new ResizeObserver(() => {
      const w = Math.floor(el.getBoundingClientRect().width);
      // Facebook plugin works best in a sane range
      setWidth(Math.max(320, Math.min(w, 520)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-parse FB plugin when width changes (or when SDK loads)
  useEffect(() => {
    const t = setTimeout(() => {
      if (window.FB?.XFBML?.parse) {
        window.FB.XFBML.parse();
      }
    }, 150);

    return () => clearTimeout(t);
  }, [width]);

  return (
    <div className="grid gap-8 lg:grid-cols-2 items-stretch">
      {/* LEFT: Copy + CTA */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white h-full flex flex-col">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-500/10 px-4 py-2 text-xs font-semibold tracking-widest text-teal-200">
          FOLLOW THE CLUB
        </div>

        <h3 className="mt-5 text-3xl md:text-4xl font-semibold leading-tight">
          Match updates, fixtures, and club news —{" "}
          <span className="text-teal-300">right on Facebook</span>
        </h3>

        <p className="mt-4 text-white/70 leading-relaxed">
          We post training updates, game-day info, tournament photos, and community moments.
          Give the page a follow so you never miss what’s on.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-white/60">What you’ll see</div>
            <div className="mt-2 text-sm text-white/80">Fixtures • Results • Photos</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-white/60">Best for</div>
            <div className="mt-2 text-sm text-white/80">New players • Members • Fans</div>
          </div>
        </div>

        <div className="mt-auto pt-8">
            <div className="flex flex-col sm:flex-row gap-3">
                <a
                    href={FB_PAGE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-[#0B1324] hover:bg-teal-300 transition"
                >
                    Open Facebook Page →
                </a>

                <a
                    href="#join"
                    className="inline-flex justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                    Join NDSC
                </a>
            </div>    
        </div>

        <div className="mt-auto pt-6 text-xs text-white/40">
            Est. 2014 • Ward Park, Bangor • Softball Ulster
        </div>
      </div>

      {/* RIGHT: Embed in NDSC card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="text-sm font-semibold text-white/80">Facebook</div>
          <div className="text-xs text-white/50">NDSC Timeline</div>
        </div>

        {/* THIS wrapper controls the embed width */}
        <div ref={wrapRef} className="w-full">
          <div className="rounded-xl overflow-hidden bg-white">
            {/* key={width} forces re-render at correct size */}
            <div
              key={width}
              className="fb-page"
              data-href={FB_PAGE}
              data-tabs="timeline"
              data-width={String(width)}
              data-height="650"
              data-adapt-container-width="true"
              data-hide-cover="false"
              data-show-facepile="true"
              data-small-header="false"
            />
          </div>
        </div>
      </div>
    </div>
  );
}