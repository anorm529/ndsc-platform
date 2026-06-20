import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Mail,
  MapPin,
  UserPlus,
} from "lucide-react";
import JsonLd from "@/app/components/JsonLd";
import Navbar from "@/app/components/Navbar";
import { absoluteUrl, buildMetadata, buildPageTitle } from "@/lib/seo";
import TournamentPhotoGrid from "./tournament-photo-grid";
import { PlayerInterestForm, TeamInterestForm } from "./interest-forms";
const sponsorEmailUrl =
  `mailto:northdownsoftballclub@gmail.com?cc=${encodeURIComponent(
    "anorman529@gmail.com,gilpin16@hotmail.com"
  )}&subject=${encodeURIComponent(
    "2027 NDSC Women's Tournament Sponsorship"
  )}&body=${encodeURIComponent(
    "Hi North Down Softball Club,\n\nI'm interested in supporting or sponsoring the 2027 women's tournament.\n\nPlease send me more information.\n\nThanks,"
  )}`;

// Upload final 2025 photos to: public/tournaments/leading-ladies/
const leadingLadiesPhotos = [
  "/tournaments/leading-ladies/Image-1.jpg",
  "/tournaments/leading-ladies/Image-2.jpg",
  "/tournaments/leading-ladies/Image-3.jpg",
  "/tournaments/leading-ladies/Image-4.jpg",
  "/tournaments/leading-ladies/Image-5.jpg",
  "/tournaments/leading-ladies/Image-6.jpg",
  "/tournaments/leading-ladies/Image-7.jpg",
  "/tournaments/leading-ladies/Image-8.jpg",
  "/tournaments/leading-ladies/Image-9.jpg",
];

// Upload final 2026 photos to: public/tournaments/pop-icons/
const popIconsPhotos = [
  "/tournaments/pop-icons/image-1.jpeg",
  "/tournaments/pop-icons/image-2.jpeg",
  "/tournaments/pop-icons/image-3.jpeg",
  "/tournaments/pop-icons/image-4.jpeg",
  "/tournaments/pop-icons/image-5.jpeg",
  "/tournaments/pop-icons/image-6.jpeg",
  "/tournaments/pop-icons/image-7.jpeg",
  "/tournaments/pop-icons/image-8.jpeg",
  "/tournaments/pop-icons/image-9.jpeg",
  "/tournaments/pop-icons/image-10.jpeg",
  "/tournaments/pop-icons/image-11.jpeg",
  "/tournaments/pop-icons/image-12.jpeg",
  "/tournaments/pop-icons/image-13.jpeg",
  "/tournaments/pop-icons/image-14.jpeg",
  "/tournaments/pop-icons/image-15.jpeg",
  "/tournaments/pop-icons/image-16.jpeg",
];

const tournaments = [
  {
    year: "2026",
    name: "Pop Icons",
    strapline:
      "Pop Icons raised the volume on women's softball with five teams, two diamonds, and players travelling from across Northern Ireland and Ireland. Built around a bold theme and a full day of games, it showed how much appetite there is for dedicated women's competition in the region.",
    accent: "#1ED0D8",
    bg: "#6A55A3",
    photos: popIconsPhotos,
    stats: [
      { value: "5", label: "Teams entered" },
      { value: "2", label: "NDSC teams represented" },
      { value: "50+", label: "Players across Northern Ireland and Ireland" },
      { value: "2nd", label: "Women's-only tournament in Softball Ulster history" },
      { value: "2", label: "Diamonds in use" },
      { value: "10am-4:30pm", label: "Full tournament day" },
    ],
  },
  {
    year: "2025",
    name: "Leading Ladies of the Diamond",
    strapline:
      "Leading Ladies of the Diamond was our first step into women-only tournament softball: four teams, 30+ players, and a milestone moment for the sport locally. It created a welcoming competitive space, brought players together at Ward Park, and set the foundation for everything that followed.",
    accent: "#F25CA2",
    bg: "#582D76",
    photos: leadingLadiesPhotos,
    stats: [
      { value: "4", label: "Teams entered" },
      { value: "30+", label: "Players involved" },
      { value: "1st", label: "Outdoor women's softball tournament in Softball Ulster history" },
      { value: "1st", label: "Women's softball tournament of its kind in Northern Ireland" },
    ],
  },
];

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Women's Tournaments"),
  description:
    "North Down Softball Club hosts women's softball tournaments in Northern Ireland — organisers of the first women's softball tournament in Softball Ulster history. Explore Leading Ladies of the Diamond and Pop Icons, and register interest for 2027.",
  path: "/tournaments",
  image: "/pop-icons-banner.png",
});


function TournamentShowcase({
  tournament,
  reverse = false,
}: {
  tournament: (typeof tournaments)[number];
  reverse?: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 text-white sm:px-6 md:py-24"
      style={{ backgroundColor: tournament.bg }}
    >
      <div className="absolute inset-x-0 top-0 h-3 bg-[linear-gradient(90deg,#ff4aa8_0%,#1ed0d8_45%,#ffd84d_100%)]" />
      <div className="absolute left-8 top-14 grid grid-cols-5 gap-3 opacity-25">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-2.5 w-2.5 rounded-full bg-white" />
        ))}
      </div>
      <div className="absolute bottom-10 right-12 h-28 w-28 rotate-12 rounded-[30px] border-[10px] border-white/18" />

      <div
        className={`relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-center ${
          reverse ? "lg:grid-flow-dense" : ""
        }`}
      >
        <div className={reverse ? "lg:col-start-2" : ""}>
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.24em]"
            style={{ color: tournament.accent }}
          >
            <Calendar className="h-4 w-4" />
            {tournament.year}
          </div>
          <h2 className="mt-5 text-4xl font-black uppercase italic leading-tight tracking-tight drop-shadow-[5px_5px_0_rgba(25,14,48,0.3)] sm:text-5xl md:text-6xl">
            {tournament.name}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/86 md:text-xl md:leading-9">
            {tournament.strapline}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {tournament.stats.map((stat) => (
              <div
                key={`${stat.value}-${stat.label}`}
                className="rounded-[20px] border border-white/16 bg-white/10 px-4 py-4"
              >
                <div
                  className="text-2xl font-black uppercase italic tracking-tight"
                  style={{ color: tournament.accent }}
                >
                  {stat.value}
                </div>
                <div className="mt-2 text-xs font-bold uppercase leading-5 tracking-wide text-white/82">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <TournamentPhotoGrid photos={tournament.photos} label={tournament.name} />
      </div>
    </section>
  );
}

function InterestSection() {
  return (
    <section className="relative overflow-hidden bg-[#F2D35B] px-4 py-16 text-[#2B2254] sm:px-6 md:py-24">
      <div className="absolute left-8 top-10 h-24 w-24 rounded-full border-[12px] border-[#e33ea8]/30" />
      <div className="absolute right-10 bottom-10 h-28 w-28 rotate-45 bg-[#1ed0d8]/35" />

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2B2254] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white">
            <UserPlus className="h-4 w-4" />
            2027 Interest
          </div>
          <h2 className="mt-5 text-4xl font-black uppercase italic leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Want To Play In 2027?
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#49386f] md:text-xl md:leading-9">
            We are collecting interest for the next NDSC women&apos;s tournament.
            Sign up as an individual player and we&apos;ll keep you posted as plans,
            dates, and team options take shape.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["2027", "Next tournament"],
              ["Ward Park", "Bangor venue"],
              ["TBC", "Format and date"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-[22px] border-2 border-[#2B2254]/18 bg-white/42 px-4 py-4 shadow-[0_8px_0_rgba(43,34,84,0.08)]"
              >
                <div className="text-2xl font-black uppercase italic tracking-tight">
                  {value}
                </div>
                <div className="mt-1 text-xs font-black uppercase tracking-wide text-[#604c7c]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[30px] border-2 border-[#2B2254] bg-white p-6 shadow-[0_14px_0_rgba(43,34,84,0.2)] sm:p-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#e33ea8] text-white">
              <UserPlus className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-2xl font-black uppercase italic tracking-tight text-[#2B2254]">
              Individual Player Interest
            </h3>
            <p className="mt-3 text-base leading-7 text-[#55466f]">
              Best for players who want to join but do not yet have a full team.
            </p>
            <PlayerInterestForm />
          </div>

          <div className="rounded-[30px] border-2 border-[#2B2254] bg-white p-6 shadow-[0_14px_0_rgba(43,34,84,0.2)] sm:p-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#2B2254] text-white">
              <UserPlus className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-2xl font-black uppercase italic tracking-tight text-[#2B2254]">
              Team Interest
            </h3>
            <p className="mt-3 text-base leading-7 text-[#55466f]">
              Best for captains, coaches, or groups planning to bring a full squad.
            </p>
            <TeamInterestForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function SponsorshipSection() {
  const sponsorReasons = [
    "Support the growth of women's softball in Northern Ireland",
    "Reach players, families, clubs, and supporters across the softball community",
    "Align your brand with a positive, inclusive, community-led sporting event",
    "Create photo, social media, and event-day visibility around a distinctive tournament",
  ];

  return (
    <section className="relative overflow-hidden bg-[#1ED0D8] px-4 py-16 text-[#2B2254] sm:px-6 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,62,168,0.25),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2B2254] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white">
            <Mail className="h-4 w-4" />
            Sponsorship
          </div>
          <h2 className="mt-5 text-4xl font-black uppercase italic leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Support The Next Step.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#49386f] md:text-xl md:leading-9">
            Our women&apos;s tournaments have grown from a first-of-its-kind local
            event into a cross-community softball platform. Sponsorship helps us
            improve the player experience, promote the tournament, and keep building
            opportunities for women in the sport.
          </p>
        </div>

        <div className="rounded-[32px] border-2 border-[#2B2254] bg-white p-6 shadow-[0_16px_0_rgba(43,34,84,0.18)] sm:p-8">
          <h3 className="text-2xl font-black uppercase italic tracking-tight">
            Why Sponsor This?
          </h3>
          <div className="mt-6 grid gap-3">
            {sponsorReasons.map((reason) => (
              <div
                key={reason}
                className="rounded-2xl bg-[#f4eefc] px-4 py-4 text-sm font-bold leading-6 text-[#51406d]"
              >
                {reason}
              </div>
            ))}
          </div>
          <a
            href={sponsorEmailUrl}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e33ea8] px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-[0_8px_0_rgba(43,34,84,0.18)] transition hover:translate-y-[1px]"
          >
            Email About Sponsorship
            <ArrowRight className="h-5 w-5" />
          </a>

        </div>
      </div>
    </section>
  );
}

function VenueSection() {
  return (
    <section className="relative overflow-hidden bg-[#3A2B66] px-4 py-16 text-white sm:px-6 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#1ed0d8]">
            <MapPin className="h-4 w-4" />
            Ward Park, Bangor
          </div>
          <h2 className="mt-5 text-4xl font-black uppercase italic tracking-tight sm:text-5xl md:text-6xl">
            Built Around A Brilliant Softball Venue.
          </h2>
          <p className="mt-5 text-lg leading-8 text-white/78">
            NDSC women&apos;s tournaments are hosted at Ward Park, home of North Down
            Softball Club and one of the best softball settings in Northern Ireland.
          </p>
          <a
            href="mailto:northdownsoftballclub@gmail.com"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/16"
          >
            <Mail className="h-4 w-4" />
            Ask a tournament question
          </a>
        </div>

        <div className="overflow-hidden rounded-[28px] border-2 border-[#1ed0d8] bg-white shadow-[0_28px_70px_rgba(0,0,0,0.24)]">
          <iframe
            title="Ward Park Map"
            className="h-[420px] w-full"
            loading="lazy"
            src="https://www.google.com/maps?q=54.65628969954839,-5.658349500806431&z=16&output=embed"
          />
        </div>
      </div>
    </section>
  );
}

function TournamentFooter() {
  return (
    <footer className="bg-[#2B2254] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-white/12 pt-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-black uppercase italic tracking-tight">
            North Down Softball Club Women&apos;s Tournaments
          </div>
          <div className="mt-2 text-sm text-white/62">
            Leading Ladies of the Diamond. Pop Icons. More to come.
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-5 py-3 text-sm font-bold transition hover:bg-white/16"
        >
          Back to main club site
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </footer>
  );
}

export default function TournamentsPage() {
  const tournamentsSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "North Down Softball Club Women's Tournaments",
    description:
      "North Down Softball Club's women's-only softball tournaments, including Leading Ladies of the Diamond and Pop Icons.",
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
    <main className="min-h-screen bg-[#2B2254] text-white">
      <JsonLd data={tournamentsSchema} />
      <Navbar headerClassName="bg-[#2B2254]" />

      <section className="relative overflow-hidden bg-[#E84AA5] px-4 py-16 text-white sm:px-6 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,216,77,0.36),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(30,208,216,0.35),transparent_30%)]" />
        <div className="absolute left-8 top-16 grid grid-cols-6 gap-3 opacity-35">
          {Array.from({ length: 30 }).map((_, index) => (
            <span key={index} className="h-2.5 w-2.5 rounded-full bg-white" />
          ))}
        </div>
        <div className="relative mx-auto max-w-6xl text-center">
          
          <h1 className="mx-auto mt-6 max-w-5xl text-5xl font-black uppercase italic leading-[0.95] tracking-tight drop-shadow-[7px_7px_0_rgba(43,34,84,0.28)] sm:text-6xl md:text-8xl">
            NDSC Women&apos;s Tournaments
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-white/90 md:text-2xl md:leading-10">
            Celebrating women&apos;s softball at Ward Park, from Leading Ladies of
            the Diamond to Pop Icons, with tournament highlights, photo galleries,
            and 2027 interest for players and teams.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#register-2027"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2B2254] px-6 py-4 font-black uppercase tracking-wide text-white shadow-[0_8px_0_rgba(43,34,84,0.2)] transition hover:translate-y-[1px]"
            >
              2027 Interest
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#past-tournaments"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/24 bg-white/14 px-6 py-4 font-black uppercase tracking-wide text-white transition hover:bg-white/20"
            >
              View Tournaments
            </a>
          </div>
        </div>
      </section>

      <section id="past-tournaments">
        <TournamentShowcase tournament={tournaments[0]} />
        <TournamentShowcase tournament={tournaments[1]} reverse />
      </section>

      <section id="register-2027">
        <InterestSection />
      </section>

      <SponsorshipSection />
      <VenueSection />
      <TournamentFooter />
    </main>
  );
}
