export const POSTS_BY_KIND = `
*[
  _type == "post" &&
  postKind == $kind &&
  dateTime(publishedAt) >= dateTime(now()) - 60*60*24*365
]
| order(publishedAt desc)[0...24]{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  postKind,
  coverImage,
  teams,
  opponent,
  opponentTeam->{ name, "logo": logo },
  scoreFor,
  scoreAgainst
}
`;

export const POST_BY_SLUG = `
*[_type=="post" && slug.current==$slug][0]{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  postKind,
  teams,
  teamDisplay,
  opponent,
  opponentTeam->{ name, "logo": logo },
  scoreFor,
  scoreAgainst,
  venue,
  mvps[]{ name, category, runs, rbis, outs },
  debutants,
  highlights,
  coverImage,
  body,
  gallery
}
`;

export const ALL_POST_SLUGS = `
*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
  "slug": slug.current,
  publishedAt,
  _updatedAt
}
`;

export const RECENT_POSTS = `
*[
  _type == "post" &&
  defined(slug.current) &&
  dateTime(publishedAt) >= dateTime(now()) - 60*60*24*365
]
| order(publishedAt desc)[0...3]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  postKind
}
`;

export const SITE_SETTINGS = `
*[_type == "siteSettings" && _id == "siteSettings"][0]{
  clubReportBanner,
  matchReportBanner
}
`;

export const TEAMS = `
*[_type == "team"] | order(isNDSC desc, name asc){
  _id,
  name,
  "slug": slug.current,
  "logo": logo,
  isNDSC
}
`;
