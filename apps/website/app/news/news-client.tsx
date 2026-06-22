"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Newspaper, Trophy } from "lucide-react";

type PostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  postKind?: string;
  cardImageUrl?: string | null;
  teams?: string[] | null;
  opponent?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
};

const TEAM_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Buccaneers", value: "buccaneers" },
  { label: "Barracudas", value: "barracudas" },
  { label: "Sluggers", value: "sluggers" },
  { label: "Stallions", value: "stallions" },
  { label: "Nightmares", value: "nightmares" },
  { label: "Mixed / Club", value: "mixed" },
];

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Lane({
  title,
  posts,
  headerRight,
  icon: Icon,
}: {
  title: string;
  posts: PostCard[];
  headerRight?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [featured, ...rest] = posts;

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold md:text-xl">
          <Icon className="h-5 w-5 text-teal-300" />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {headerRight}
          <div className="text-xs text-white/50">{posts.length ? `${posts.length} posts` : ""}</div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-5 py-8 text-sm text-white/60">
          No posts yet.
        </div>
      ) : null}

      {featured ? (
        <Link
          href={`/news/${featured.slug}`}
          className="mt-4 grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08] md:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="relative aspect-[16/10] bg-white/5 md:aspect-auto">
            {featured.cardImageUrl ? (
              <Image
                src={featured.cardImageUrl}
                alt={`${featured.title} - North Down Softball Club news image`}
                fill
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-white/50">
                No image
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
              Featured
            </div>
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-white">
              {featured.title}
            </h3>
            {featured.postKind === "teamReport" &&
            typeof featured.scoreFor === "number" &&
            typeof featured.scoreAgainst === "number" ? (
              <div className="mt-2 text-3xl font-bold text-teal-300">
                {featured.scoreFor}–{featured.scoreAgainst}
                {featured.opponent ? (
                  <span className="ml-2 text-base font-normal text-white/60">
                    vs {featured.opponent}
                  </span>
                ) : null}
              </div>
            ) : null}
            {featured.excerpt ? (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">
                {featured.excerpt}
              </p>
            ) : null}
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-300">
              Read update <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      ) : null}

      {rest.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link
              key={p._id}
              href={`/news/${p.slug}`}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] transition hover:bg-white/[0.08]"
            >
              <div className="relative aspect-[16/10] w-full bg-white/5">
                {p.cardImageUrl ? (
                  <Image
                    src={p.cardImageUrl}
                    alt={`${p.title} - North Down Softball Club news image`}
                    fill
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-white/50">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="text-xs text-white/50">{formatDate(p.publishedAt)}</div>
                <div className="mt-2 line-clamp-2 text-base font-semibold leading-snug">
                  {p.title}
                </div>
                {p.postKind === "teamReport" &&
                typeof p.scoreFor === "number" &&
                typeof p.scoreAgainst === "number" ? (
                  <div className="mt-1 text-lg font-bold text-teal-300">
                    {p.scoreFor}–{p.scoreAgainst}
                    {p.opponent ? (
                      <span className="ml-1 text-xs font-normal text-white/50">
                        vs {p.opponent}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {p.excerpt ? (
                  <div className="mt-2 line-clamp-2 text-sm text-white/70">{p.excerpt}</div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function NewsClient({
  clubNews,
  teamReports,
}: {
  clubNews: PostCard[];
  teamReports: PostCard[];
}) {
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const filteredTeamReports = useMemo(() => {
    if (teamFilter === "all") return teamReports;
    return teamReports.filter((p) => p.teams?.includes(teamFilter));
  }, [teamReports, teamFilter]);

  const filterControl = (
    <div className="flex items-center gap-2">
      <div className="text-xs tracking-[0.25em] font-semibold text-teal-300 hidden sm:block">
        TEAM
      </div>
      <select
        value={teamFilter}
        onChange={(e) => setTeamFilter(e.target.value)}
        className="rounded-lg border border-white/10 bg-[#0B1324]/60 px-3 py-2 text-sm text-white outline-none"
      >
        {TEAM_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <Lane title="Club News" posts={clubNews} icon={Newspaper} />
      <Lane
        title="Team Reports"
        posts={filteredTeamReports}
        headerRight={filterControl}
        icon={Trophy}
      />
    </>
  );
}
