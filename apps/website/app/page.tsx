import type React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import TeamsSection from "@/app/components/TeamsSection";
import GalleryCarousel from "./components/GalleryCarousel";
import Navbar from "@/app/components/Navbar";
import FacebookSection from "@/app/components/FacebookSection";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import JsonLd from "@/app/components/JsonLd";
import SiteFooter from "@/app/components/SiteFooter";
import { sanityClient } from "@/lib/sanity/client";
import { RECENT_POSTS } from "@/lib/sanity/queries";
import { primaryNavLinks } from "@/lib/site-nav";
import {
  SITE_EMAIL,
  SITE_NAME,
  absoluteUrl,
  buildMetadata,
  buildPageTitle,
} from "@/lib/seo";

const sponsors = [
  {
    name: "Tim Hortons Bangor",
    logo: "Tim-Hortons-logo.png",
    url: "https://timhortons.co.uk/",
  },
  {
    name: "Become a Sponsor",
    logo: "become-a-sponsor.png",
    url: "https://tally.so/r/A7d20W",
  },
];

type RecentPost = {
  _id: string;
  title: string;
  slug: string;
};

export const metadata: Metadata = buildMetadata({
  title: buildPageTitle("Home"),
  description:
    "North Down Softball Club is one of the most active adult sports clubs in Bangor and North Down, Northern Ireland — a co-ed softball club at Ward Park competing in Softball Ulster.",
  path: "/",
  image: "/hero.jpg",
});

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  dark,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 py-20",
        dark ? "bg-[#0B1324] text-white" : "bg-white text-[#0B1324]"
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="text-center">
          {eyebrow ? (
            <div
              className={cn(
                "text-xs font-semibold tracking-[0.25em]",
                dark ? "text-teal-300" : "text-teal-600"
              )}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2
            className={cn(
              "mt-3 text-4xl font-semibold md:text-5xl",
              dark ? "text-white" : "text-[#0B1324]"
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cn(
                "mx-auto mt-4 max-w-2xl text-base md:text-lg",
                dark ? "text-white/70" : "text-slate-600"
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 border-b border-slate-200 pb-5 last:border-b-0 md:border-b-0 md:pb-0">
      <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-[#0B1324]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

async function getRecentPosts() {
  if (!sanityClient) return [];

  return sanityClient.fetch<RecentPost[]>(
    RECENT_POSTS,
    {},
    { next: { revalidate: 300 } }
  );
}

export default async function Page() {
  const recentPosts = await getRecentPosts();
  const navLinks = primaryNavLinks.map((link) =>
    link.href.startsWith("/#")
      ? { ...link, href: link.href.slice(1) }
      : { ...link }
  );

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: SITE_NAME,
    sport: "Softball",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    email: SITE_EMAIL,
    foundingDate: "2014",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ward Park",
      addressLocality: "Bangor",
      addressRegion: "Northern Ireland",
      postalCode: "BT20",
      addressCountry: "GB",
    },
    memberOf: [
      {
        "@type": "SportsOrganization",
        name: "Softball Ulster",
        url: "https://softballulster.com/",
      },
      {
        "@type": "SportsOrganization",
        name: "Softball Ireland",
        url: "https://softball.ie/",
      },
    ],
    sameAs: ["https://www.facebook.com/Northdownsoftballclub"],
  };

  return (
    <main id="top" className="min-h-screen bg-[#0B1324] text-white">
      <JsonLd data={organizationSchema} />
      <Navbar />
      <AnnouncementBar />

      <section className="relative isolate">
        <div className="relative h-[520px] w-full md:h-[620px]">
          <Image
            src="/hero.jpg"
            alt="North Down Softball Club players at Ward Park, Bangor, Northern Ireland"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[#0B1324]/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1324]/70 via-transparent to-[#0B1324]" />
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col items-center text-center">


              <h1 className="mt-8 text-5xl font-semibold leading-tight text-white md:text-7xl">
                North Down <span className="text-teal-300">Softball Club</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base text-white/70 md:text-lg">
                Fast Pitch. Big Hits. Community Spirit.
              </p>

              <p className="mt-4 max-w-3xl text-sm text-white/80 md:text-base">
                North Down Softball Club is a softball Ireland affiliated club for
                adult co-ed softball in Bangor, Northern Ireland, with training and
                match play at Ward Park.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#join"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-400 px-8 py-3 text-sm font-semibold text-[#0B1324] transition hover:bg-teal-300"
                >
                  <Users className="h-4 w-4" />
                  Try a Free Session
                </a>
                <a
                  href="#training"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <CalendarDays className="h-4 w-4" />
                  See Training Times
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section
        id="about"
        eyebrow="ABOUT US"
        title="More Than a Club. A Community."
        subtitle="North Down Softball Club (NDSC) is a community-focused sports club based in Bangor, Northern Ireland."
      >
        <div className="grid items-start gap-10 md:grid-cols-[1fr_0.9fr]">
          <div className="leading-relaxed text-slate-600">
            <p>
              Founded over 10 years ago, we have grown into one of the most active
              softball clubs in the region.
            </p>
            <p className="mt-4">
              We compete across two divisions in the Softball Ulster leagues and
              welcome players of all skill levels. As one of the most welcoming
              adult sports clubs in North Down, there is a place for you whether
              you are picking up a bat for the first time or have years of
              experience.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <Users className="mb-4 h-5 w-5 text-teal-700" />
              <div className="text-4xl font-semibold text-[#0B1324]">50+</div>
              <div className="mt-2 text-sm text-slate-600">Members</div>
            </Card>
            <Card>
              <ShieldCheck className="mb-4 h-5 w-5 text-teal-700" />
              <div className="text-4xl font-semibold text-[#0B1324]">5</div>
              <div className="mt-2 text-sm text-slate-600">Teams</div>
            </Card>
            <Card>
              <Trophy className="mb-4 h-5 w-5 text-teal-700" />
              <div className="text-4xl font-semibold text-[#0B1324]">10+</div>
              <div className="mt-2 text-sm text-slate-600">Years Established</div>
            </Card>
          </div>
        </div>
      </Section>

      <Section id="teams" dark eyebrow="OUR TEAMS" title="Five Teams. One Club.">
        <TeamsSection />
      </Section>

      <Section
        id="recent-news"
        eyebrow="RECENT NEWS"
        title="Latest From NDSC"
        subtitle="Read the latest club updates and match reports from North Down Softball Club."
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          {recentPosts.length > 0 ? (
            <ul className="w-full space-y-4 text-left">
              {recentPosts.map((post) => (
                <li key={post._id} className="border-b border-slate-200 pb-4">
                  <Link
                    href={`/news/${post.slug}`}
                    className="text-lg font-semibold text-[#0B1324] hover:text-teal-700"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600">
              News updates from softball Bangor will appear here as new articles are
              published.
            </p>
          )}
          <p className="mt-6 text-center text-sm text-slate-600">
            Browse all club updates and Softball Ulster match reports on the{" "}
            <Link href="/news" className="font-semibold text-teal-700 hover:text-teal-800">
              news page
            </Link>
            .
          </p>
        </div>
      </Section>

      <Section
        id="training"
        eyebrow="TRAINING & MATCHES"
        title="Come Train With Us at Ward Park"
        subtitle="Our home ground is Ward Park in Bangor, one of the best softball venues in Northern Ireland."
      >
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6 text-slate-600">
            <InfoItem
              icon={MapPin}
              title="Location"
              text="Ward Park, Bangor, Northern Ireland."
            />
            <InfoItem
              icon={CalendarDays}
              title="Training"
              text="Monday and Thursday, 6:30 to 8:30pm. Sunday, 2:00 to 4:00pm."
            />
            <InfoItem
              icon={Trophy}
              title="Season and Matches"
              text="April to September, with league fixtures on Monday, Wednesday, and Sunday."
            />
            <InfoItem
              icon={CheckCircle2}
              title="New Players"
              text="Beginners are welcome, your first few sessions are free, and equipment is provided."
            />
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <iframe
                title="Ward Park Map"
                className="h-[360px] w-full"
                loading="lazy"
                src="https://www.google.com/maps?q=54.65628969954839,-5.658349500806431&z=16&output=embed"
              />
            </div>

            <div className="flex justify-center">
              <a
                href="https://www.google.com/maps/search/?api=1&query=54.65628969954839,-5.658349500806431"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-6 py-3 text-sm font-semibold text-[#0B1324] transition shadow-md hover:bg-teal-300"
              >
                <MapPin className="h-4 w-4" />
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="join"
        dark
        eyebrow="GET INVOLVED"
        title="Ready to Step Up to the Plate?"
        subtitle="Want to try softball in Bangor? Whether you are a complete beginner or a seasoned player, there is a place for you at North Down Softball Club."
      >
        <div className="mx-auto max-w-3xl">
          <ul className="space-y-4 text-white/80">
            {[
              "First few training sessions are completely free",
              "Annual membership is just £60 for new players",
              "All equipment provided",
              "Welcoming, inclusive environment",
              "Players of all abilities welcome",
              "Train on Northern Ireland's dedicated softball field at Ward Park Bangor",
            ].map((x) => (
              <li key={x} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-400 font-bold text-[#0B1324]">
                  +
                </span>
                <span>{x}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <a
              href="https://tally.so/r/7RKdrz"
              target="_blank"
              rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-400 px-10 py-4 text-sm font-semibold text-[#0B1324] transition shadow-[0_10px_30px_rgba(45,212,191,0.35)] hover:bg-teal-300"
              >
              <Users className="h-4 w-4" />
              Register Interest
            </a>
          </div>
        </div>
      </Section>

      <Section
        id="sponsors"
        eyebrow="OUR SUPPORTERS"
        title="Proudly Supported By"
        subtitle="We are grateful to our sponsors who help make community softball possible."
      >
        <div className="grid grid-cols-2 items-center gap-5 md:grid-cols-2">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-6 opacity-80 transition hover:opacity-100"
            >
              <Image
                src={`/sponsors/${sponsor.logo}`}
                alt={`${sponsor.name} - sponsor of North Down Softball Club`}
                width={180}
                height={80}
                className="object-contain"
              />
            </a>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="text-xs font-semibold tracking-[0.25em] text-[#0B1324]">
            GOVERNING BODIES
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-10">
            <a
              href="https://softballulster.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:scale-105"
            >
              <Image
                src="/softball-ulster.png"
                alt="Softball Ulster"
                width={180}
                height={80}
                className="object-contain"
              />
            </a>

            <a
              href="https://softball.ie/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:scale-105"
            >
              <Image
                src="/softball-ireland.png"
                alt="Softball Ireland"
                width={180}
                height={80}
                className="object-contain"
              />
            </a>
          </div>
        </div>
      </Section>

      <Section
        id="facebook"
        dark
        eyebrow="FOLLOW US"
        title="Stay Connected on Facebook"
        subtitle="Match updates, club news, and community highlights."
      >
        <FacebookSection />
      </Section>

      <Section
        id="gallery"
        dark
        eyebrow="GALLERY"
        title="Club Moments"
        subtitle="A few snaps from training, match days, and tournaments."
      >
        <GalleryCarousel />
      </Section>

      <section className="bg-[#0B1324] px-6 pb-6 text-center text-sm text-white/70">
        <p className="mx-auto max-w-5xl">
          North Down Softball Club is a co-ed adult sports club and women&apos;s
          sports club in Bangor, Northern Ireland. Come try softball at Ward Park
          — one of the most active sports clubs in North Down — with Softball
          Ulster fixtures, results, and women&apos;s softball Northern Ireland
          competition throughout the season.
        </p>
      </section>

      <SiteFooter navLinks={navLinks} />
    </main>
  );
}
