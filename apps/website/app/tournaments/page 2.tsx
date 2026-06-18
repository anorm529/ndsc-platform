import type { Metadata } from "next";
import Image from "next/image";
import JsonLd from "@/app/components/JsonLd";
import { absoluteUrl, buildMetadata, buildPageTitle } from "@/lib/seo";
import { primaryNavLinks } from "@/lib/site-nav";

const signupUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSf2ISHt3qfHimf4ZbXn1YOFLMsmK1MN3BXKYyXvb8gLsmZyEw/viewform?usp=sharing&ouid=116926451685176140469";
const soloSignupUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPK_ceGMAEeAC6cdjTjcIq7UmcLLUPc66IWyWlyj0iQDCfNg/viewform?usp=header";
const galleryImages = [
  "/Pop%20Icons/Image%201.jpg",
  "/Pop%20Icons/Image%202.jpg",
  "/Pop%20Icons/Image%203.jpg",
  "/Pop%20Icons/Image%204.jpg",
  "/Pop%20Icons/Image%205.jpg",
  "/Pop%20Icons/Image%206.jpg",
  "/Pop%20Icons/Image%207.jpg",
  "/Pop%20Icons/Image%208.jpg",
  "/Pop%20Icons/Image%209.jpg",
];

type InfoCardProps = {
  label: string;
  value: string;
  accent: string;
};

type SignupCardProps = {
  title: string;
  blurb: string;
  href: string;
  buttonLabel: string;
  accentClass: string;
  borderClass: string;
  icon: string;
};

function EventHeader() {
  return (
    <header className="relative z-30 overflow-visible border-b border-white/12 bg-[#2B2254] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,94,196,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(30,208,216,0.18),transparent_24%)]" />
      <div className="h-2 w-full bg-[linear-gradient(90deg,#e33ea8_0%,#1ed0d8_35%,#ffd54d_68%,#95d28c_100%)]" />
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt="North Down Softball Club Logo"
              width={88}
              height={88}
              className="h-16 w-auto shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff79ca] sm:text-xs">
                Pop Icons
              </div>
              <div className="text-xl font-black uppercase italic leading-tight tracking-tight text-white drop-shadow-[3px_3px_0_rgba(21,16,44,0.38)] sm:text-2xl">
                NDSC Women&apos;s Tournament
              </div>
            </div>
          </div>

          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full border border-[#7f72b9] bg-[#33295f]/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/90 transition hover:border-[#1ed0d8]">
              Menu
            </summary>
            <div className="absolute right-0 top-full z-30 mt-3 flex w-[min(80vw,320px)] flex-col gap-2 rounded-[24px] border border-white/12 bg-[#31275f] p-4 shadow-[0_24px_60px_rgba(15,10,36,0.35)]">
              {primaryNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-[#7f72b9] bg-[#3a2f6b]/80 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:border-[#1ed0d8] hover:bg-[#433679]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </details>
        </div>

        <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="North Down Softball Club Logo"
              width={120}
              height={120}
              className="h-24 w-auto object-contain"
              priority
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff79ca]">
                Pop Icons
              </div>
              <div className="text-2xl font-black uppercase italic tracking-tight text-white drop-shadow-[3px_3px_0_rgba(21,16,44,0.38)]">
                NDSC Women&apos;s Tournament
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            {primaryNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-[#7f72b9] bg-[#33295f]/75 px-4 py-2 transition hover:border-[#1ed0d8] hover:bg-[#3d3170] hover:text-white hover:shadow-[0_0_0_1px_rgba(255,94,196,0.35)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function EventFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#6f9a80] px-4 py-14 text-white sm:px-6 sm:py-16">
      <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,#e33ea8_0%,#ff8a8a_40%,#95d28c_100%)]" />
      <div className="absolute left-10 top-12 h-16 w-16 bg-[#c58ab3]/55 [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
      <div className="absolute right-16 top-14 grid grid-cols-4 gap-3 opacity-30">
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} className="h-2.5 w-2.5 rounded-full bg-white/65" />
        ))}
      </div>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="text-3xl font-black uppercase italic tracking-tight text-white drop-shadow-[4px_4px_0_rgba(55,72,53,0.22)] sm:text-4xl md:text-5xl">
              North Down Softball Club
            </div>
            <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
              Fast Pitch. Big Hits. Community Spirit.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.facebook.com/Northdownsoftballclub"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/18"
            >
              Facebook
            </a>
            <a
              href="mailto:northdownsoftballclub@gmail.com"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/18"
            >
              Email
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/18 pt-6 text-sm text-white/75">
          Copyright {new Date().getFullYear()} North Down Softball Club. Pop Icons
          tournament page.
        </div>
      </div>
    </footer>
  );
}

function InfoCard({ label, value, accent }: InfoCardProps) {
  return (
    <div className="rounded-[24px] border border-white/18 bg-white/8 px-5 py-5 shadow-[0_18px_40px_rgba(42,28,82,0.18)] backdrop-blur-sm sm:rounded-[28px] sm:px-6 sm:py-6">
      <div className="flex items-center gap-4">
        <div
          className="grid h-12 w-12 place-items-center rounded-full text-base font-extrabold text-[#2D2457] sm:h-14 sm:w-14 sm:text-lg"
          style={{ backgroundColor: accent }}
        >
          +
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            {label}
          </div>
          <div className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SignupCard({
  title,
  blurb,
  href,
  buttonLabel,
  accentClass,
  borderClass,
  icon,
}: SignupCardProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-[26px] border-2 bg-white p-6 text-center shadow-[0_12px_0_rgba(52,43,91,0.18)] sm:rounded-[30px] sm:p-8 sm:shadow-[0_14px_0_rgba(52,43,91,0.18)] ${borderClass}`}
    >
      <div
        className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-xl font-black text-white sm:h-18 sm:w-18 sm:text-2xl ${accentClass}`}
      >
        {icon}
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="flex min-h-[4.5rem] items-center justify-center text-2xl font-black uppercase italic tracking-tight text-[#5D4B91] sm:min-h-[5.5rem] sm:text-3xl">
          {title}
        </h3>
        <p className="mx-auto mt-4 flex min-h-[5rem] max-w-xs items-start justify-center text-base leading-7 text-[#344c74] sm:min-h-[6.5rem] sm:text-lg sm:leading-8">
          {blurb}
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-8 inline-flex min-w-[220px] max-w-full self-center justify-center rounded-2xl px-6 py-4 text-lg font-black text-white shadow-[0_8px_0_rgba(52,43,91,0.2)] transition hover:translate-y-[1px] sm:px-7 ${accentClass}`}
      >
        {buttonLabel}
      </a>
    </div>
  );
}

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Tournaments"),
  description:
    "Join Pop Icons, North Down Softball Club's women's-only competition. Find event details and sign up online.",
  path: "/tournaments",
  image: "/pop-icons-banner.png",
});

export default function TournamentsPage() {
  const tournamentsSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "Pop Icons",
    description:
      "North Down Softball Club's women's Pop Icons competition with team and individual signup options.",
    sport: "Softball",
    organizer: {
      "@type": "SportsOrganization",
      name: "North Down Softball Club",
      url: absoluteUrl("/"),
    },
    url: absoluteUrl("/tournaments"),
    isAccessibleForFree: true,
  };

  return (
    <main className="min-h-screen bg-[#5D4B91] text-white">
      <JsonLd data={tournamentsSchema} />
      <EventHeader />

      <section className="relative overflow-hidden border-b-4 border-[#1ED0D8] bg-transparent">
        <div className="absolute inset-x-0 bottom-0 h-4 bg-[linear-gradient(90deg,#e33ea8_0%,#1ed0d8_35%,#ffd54d_68%,#95d28c_100%)]" />
        <div className="mx-auto max-w-[1900px] px-0 py-0">
          <div className="overflow-hidden rounded-none border-0 bg-transparent shadow-none">
            <Image
              src="/pop-icons-banner.png"
              alt="Pop Icons women's tournament banner"
              width={2400}
              height={1100}
              priority
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#7867A8] px-4 py-14 sm:px-6 md:py-24">
        <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,#1ed0d8_0%,#e33ea8_45%,#ffd54d_100%)]" />
        <div className="absolute left-10 top-14 grid grid-cols-5 gap-3 opacity-35">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#ff7aca]" />
          ))}
        </div>
        <div className="absolute right-14 top-16 h-28 w-28 rotate-12 rounded-[30px] border-[10px] border-[#1ed0d8]/45" />
        <div className="absolute bottom-14 left-16 h-24 w-24 bg-[#ffcf43]/25 [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
        <div className="mx-auto max-w-6xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-[#ff5ec4]">
            Pop Icons Edition
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-[5px_5px_0_rgba(37,24,78,0.45)] sm:text-5xl md:text-7xl lg:text-8xl">
            NDSC Women&apos;s Tournament
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/86 sm:text-lg sm:leading-8 md:text-2xl md:leading-10">
            Join us for a brilliant day of softball at Pop Icons. Open to teams and
            individual players from across Northern Ireland and Ireland.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Date" value="30th May" accent="#E545A5" />
            <InfoCard label="Venue" value="Ward Park" accent="#18D5D2" />
            <InfoCard label="Team Fee" value="£80" accent="#FFD64C" />
            <InfoCard label="Solo Players" value="Welcome" accent="#F268C3" />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#93AC8A] px-4 py-16 sm:px-6 md:py-28">
        <div className="absolute left-8 top-10 h-20 w-20 rounded-[24px] border-[14px] border-[#c58ab3]/70 opacity-60" />
        <div className="absolute right-14 top-16 h-24 w-24 rotate-45 bg-[#51C6B5]/60" />
        <div className="absolute bottom-12 left-12 h-18 w-18 bg-[#c58ab3]/70 [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
        <div className="absolute left-10 top-28 grid grid-cols-5 gap-4 opacity-30">
          {Array.from({ length: 15 }).map((_, index) => (
            <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#d86cb0]" />
          ))}
        </div>
        <div className="absolute bottom-12 right-16 grid grid-cols-4 gap-3 opacity-35">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} className="h-2 w-2 rounded-full bg-[#8b6fb0]" />
          ))}
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-[#f5f0ff]/85">
            Sign Up Now
          </div>
          <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-[5px_5px_0_rgba(63,53,101,0.28)] sm:text-5xl md:text-7xl lg:text-8xl">
            Ready To Join?
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/90 sm:text-xl sm:leading-9 md:text-2xl md:leading-10">
            Join us for a brilliant day of softball at Pop Icons. Enter as a full
            team or sign up on your own and we&apos;ll help place you with a squad.
          </p>

          <div className="mx-auto mt-14 grid max-w-3xl gap-6 md:grid-cols-2">
            <SignupCard
              title="Register a Team"
              blurb="Bring your squad and compete. Team fee is £80."
              href={signupUrl}
              buttonLabel="Register Team"
              accentClass="bg-[#6A5AA0]"
              borderClass="border-[#6A5AA0]"
              icon="T"
            />
            <SignupCard
              title="Join as Individual"
              blurb="Flying solo? No problem. We&apos;ll match you with a team."
              href={soloSignupUrl}
              buttonLabel="Sign Up Solo"
              accentClass="bg-[#18C9D1]"
              borderClass="border-[#18C9D1]"
              icon="I"
            />
          </div>

          <div className="mx-auto mt-12 flex max-w-xl flex-col items-center justify-center gap-1 rounded-[28px] bg-white/18 px-5 py-4 text-center text-base font-semibold text-white/92 backdrop-blur-sm sm:inline-flex sm:max-w-none sm:flex-row sm:gap-0 sm:rounded-full sm:px-6">
            <span>Questions? Email us at</span>
            <a
              href="mailto:northdownsoftballclub@gmail.com"
              className="break-all text-[#ffe55d] underline underline-offset-4 sm:break-normal sm:pl-1"
            >
              northdownsoftballclub@gmail.com
            </a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#51407B] px-4 py-16 sm:px-6 md:py-24">
        <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,#e33ea8_0%,#ff8a8a_40%,#95d28c_100%)]" />
        <div className="absolute left-10 top-16 grid grid-cols-4 gap-3 opacity-25">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#ff67c0]" />
          ))}
        </div>
        <div className="absolute right-12 top-20 h-24 w-24 rotate-45 border-[10px] border-[#1ed0d8]/35" />
        <div className="absolute bottom-18 right-20 h-16 w-16 rounded-full border-[8px] border-[#ffd84d]/35" />
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-[#ff76c8]">
              Find Us
            </div>
            <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-[5px_5px_0_rgba(29,19,59,0.45)] sm:text-5xl md:text-7xl lg:text-8xl">
              Ward Park
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 md:text-xl md:leading-9">
              Ward Park, Bangor, Northern Ireland. Easy to access, great softball
              facilities, and plenty nearby for teams coming in for the day.
            </p>
          </div>

          <div className="mt-14">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[30px] border-[3px] border-[#ff5bbd] bg-white shadow-[0_30px_60px_rgba(18,12,40,0.22)]">
              <iframe
                title="Ward Park Map"
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                src="https://www.google.com/maps?q=54.65628969954839,-5.658349500806431&z=16&output=embed"
              />
            </div>

            <div className="mt-8">
              <div className="text-center text-3xl font-black uppercase italic tracking-tight text-white drop-shadow-[4px_4px_0_rgba(29,19,59,0.3)] sm:text-4xl">
                Venue Details
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-3">
                <div className="rounded-[26px] border border-[#ff59bc]/40 bg-white/8 p-7 text-center shadow-[0_18px_40px_rgba(18,12,40,0.16)]">
                  <div className="text-xl font-black uppercase tracking-wide text-[#ff59bc]">
                    Address
                  </div>
                  <div className="mt-4 text-lg leading-8 text-white/90 sm:text-xl sm:leading-9">
                    Ward Park
                    <br />
                    Bangor
                    <br />
                    Co. Down
                    <br />
                    Northern Ireland
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#19d0d5]/40 bg-white/8 p-7 text-center shadow-[0_18px_40px_rgba(18,12,40,0.16)]">
                  <div className="text-xl font-black uppercase tracking-wide text-[#19d0d5]">
                    Getting There
                  </div>
                  <p className="mt-4 text-base leading-7 text-white/88 sm:text-lg sm:leading-8">
                    Ward Park is easily accessible by car, with parking nearby and
                    Bangor town centre just a short walk away.
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#ffd84d]/40 bg-white/8 p-7 text-center shadow-[0_18px_40px_rgba(18,12,40,0.16)]">
                  <div className="text-xl font-black uppercase tracking-wide text-[#ffd84d]">
                    Facilities
                  </div>
                  <ul className="mt-4 space-y-2 text-base text-white/88 sm:text-lg">
                    <li>Softball pitches</li>
                    <li>Changing facilities</li>
                    <li>Free parking nearby</li>
                    <li>Cafes and shops within walking distance</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=54.65628969954839,-5.658349500806431"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-[#e041a3] px-6 py-4 text-lg font-black text-white shadow-[0_8px_0_rgba(84,35,86,0.3)] transition hover:translate-y-[1px]"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#6e5a9f] px-4 py-16 sm:px-6 md:py-24">
        <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,#1ed0d8_0%,#ff5ec4_48%,#ffd54d_100%)]" />
        <div className="absolute left-10 top-14 grid grid-cols-5 gap-3 opacity-25">
          {Array.from({ length: 15 }).map((_, index) => (
            <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#ff7aca]" />
          ))}
        </div>
        <div className="absolute right-16 top-20 h-22 w-22 rotate-12 rounded-[28px] border-[10px] border-[#1ed0d8]/35" />

        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-[#ff76c8]">
              2025 Tournament
            </div>
            <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-[5px_5px_0_rgba(37,24,78,0.35)] sm:text-5xl md:text-7xl">
              Gallery
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 md:text-xl">
              A few moments from the 2025 tournament to bring the page to life.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleryImages.map((src, index) => (
              <div
                key={src}
                className="overflow-hidden rounded-[26px] border border-white/14 bg-white/8 shadow-[0_24px_50px_rgba(33,20,67,0.22)]"
              >
                <Image
                  src={src}
                  alt={`2025 tournament gallery image ${index + 1}`}
                  width={1200}
                  height={1200}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <EventFooter />
    </main>
  );
}
