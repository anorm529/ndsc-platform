// sanity/schemaTypes/postType.ts
import { defineArrayMember, defineField, defineType } from "sanity";

type PostDocumentValue = {
  postKind?: string;
};

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",

  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "matchDetails", title: "Match Details" },
    { name: "publishing", title: "Publishing" },
  ],

  fields: [
    // ── Content ───────────────────────────────────────────────────────────
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "postKind",
      title: "Post kind",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Club News", value: "clubNews" },
          { title: "Team Report", value: "teamReport" },
        ],
        layout: "radio",
      },
      initialValue: "clubNews",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt / SEO Description",
      description:
        "Shown on news cards and used as the Google meta description and social preview. Aim for 120–155 characters. If left blank, the description is auto-generated from the article body (or match score for team reports).",
      type: "text",
      rows: 3,
      group: "content",
      validation: (r) =>
        r.max(155).warning("Over 155 characters — Google may truncate this in search results."),
    }),
    defineField({
      name: "body",
      type: "blockContent",
      group: "content",
    }),

    // ── Media ─────────────────────────────────────────────────────────────
    defineField({
      name: "cardImage",
      title: "Card image",
      description:
        "Thumbnail shown on the news listing page. If left blank, the default banner from Site Settings is used automatically.",
      type: "image",
      group: "media",
      options: { hotspot: true },
    }),
    defineField({
      name: "coverImage",
      title: "Cover image",
      description:
        "Large image displayed inside the article. Not shown on the news listing — upload a Card image above for that.",
      type: "image",
      group: "media",
      options: { hotspot: true },
    }),
    {
      name: "gallery",
      title: "Gallery",
      type: "array",
      group: "media",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", title: "Alt text", type: "string" },
            { name: "caption", title: "Caption", type: "string" },
          ],
        },
      ],
    },

    // ── Match Details ─────────────────────────────────────────────────────
    defineField({
      name: "teams",
      title: "NDSC Team(s)",
      type: "array",
      group: "matchDetails",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Buccaneers", value: "buccaneers" },
          { title: "Barracudas", value: "barracudas" },
          { title: "Sluggers", value: "sluggers" },
          { title: "Stallions", value: "stallions" },
          { title: "Nightmares", value: "nightmares" },
          { title: "Mixed / Club", value: "mixed" },
        ],
        layout: "grid",
      },
      hidden: ({ document }) => document?.postKind !== "teamReport",
      validation: (r) =>
        r.custom((val, ctx) => {
          const kind = (ctx.document as PostDocumentValue | undefined)?.postKind;
          if (kind === "teamReport" && (!val || val.length === 0)) {
            return "Select at least one team for Team Reports.";
          }
          return true;
        }),
    }),
    defineField({
      name: "teamDisplay",
      title: "Team display name",
      type: "string",
      group: "matchDetails",
      description: "Shown on the post itself, e.g. 'Barracudas' or 'Barracudas vs Sluggers'",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "opponent",
      title: "Opponent name",
      type: "string",
      group: "matchDetails",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "opponentTeam",
      title: "Opponent team (for logo)",
      description: "Link to a Team document to pull in the opposition logo.",
      type: "reference",
      to: [{ type: "team" }],
      group: "matchDetails",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "scoreFor",
      title: "Runs (NDSC)",
      type: "number",
      group: "matchDetails",
      validation: (r) => r.min(0),
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "scoreAgainst",
      title: "Runs (Opponent)",
      type: "number",
      group: "matchDetails",
      validation: (r) => r.min(0),
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "venue",
      title: "Match Venue",
      type: "string",
      group: "matchDetails",
      description: "Where the match was played, e.g. Ward Park or Mallusk",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "mvps",
      title: "MVPs",
      type: "array",
      group: "matchDetails",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({
              name: "category",
              title: "Category",
              type: "string",
              options: {
                list: [
                  { title: "Female MVP", value: "female" },
                  { title: "Male MVP", value: "male" },
                ],
                layout: "radio",
              },
            }),
            defineField({ name: "runs", title: "Runs", type: "number" }),
            defineField({ name: "rbis", title: "RBIs", type: "number" }),
            defineField({ name: "outs", title: "Outs", type: "number" }),
          ],
          preview: {
            select: { title: "name", subtitle: "category" },
            prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
              const cat = subtitle === "female" ? "Female MVP" : subtitle === "male" ? "Male MVP" : "MVP";
              return { title: title || "Unnamed", subtitle: cat };
            },
          },
        }),
      ],
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "debutants",
      title: "Debutants",
      description: "Players making their first appearance — shown on the match report",
      type: "array",
      group: "matchDetails",
      of: [{ type: "string" }],
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "highlights",
      title: "Highlights",
      type: "array",
      group: "matchDetails",
      of: [{ type: "string" }],
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),

    // ── Publishing ────────────────────────────────────────────────────────
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      group: "publishing",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "publishing",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      group: "publishing",
      description: "Pin this post to the top of the news feed.",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      group: "publishing",
      initialValue: () => new Date().toISOString(),
    }),
  ],
});
