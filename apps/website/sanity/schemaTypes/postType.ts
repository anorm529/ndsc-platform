// sanity/schemaTypes/postType.ts
import { defineArrayMember, defineField, defineType } from "sanity";

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),

    // ✅ NEW: kind
    defineField({
      name: "postKind",
      title: "Post kind",
      type: "string",
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
      name: "teams",
      title: "Teams (Team Reports only)",
      type: "array",
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
          const kind = (ctx.document as any)?.postKind;
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
      description: "Shown on the post itself, e.g. 'Barracudas' or 'Barracudas vs Sluggers'",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),

    // ✅ Match report fields (Team Reports only)
    defineField({
      name: "opponent",
      title: "Opponent",
      type: "string",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "scoreFor",
      title: "Runs (NDSC)",
      type: "number",
      validation: (r) => r.min(0),
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "scoreAgainst",
      title: "Runs (Opponent)",
      type: "number",
      validation: (r) => r.min(0),
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),
    defineField({
      name: "venue",
      title: "Match Venue",
      type: "string",
      description: "Where the match was played, e.g. Ward Park or Mallusk",
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),

    defineField({
      name: "mvps",
      title: "MVPs",
      type: "array",
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
      of: [{ type: "string" }],
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),

    defineField({
      name: "highlights",
      title: "Highlights",
      type: "array",
      of: [{ type: "string" }],
      hidden: ({ document }) => document?.postKind !== "teamReport",
    }),

    defineField({
      name: "excerpt",
      title: "Excerpt / SEO Description",
      description:
        "Shown on news cards and used as the Google meta description and social preview. Aim for 120–155 characters. If left blank, the description is auto-generated from the article body (or match score for team reports).",
      type: "text",
      rows: 3,
      validation: (r) => r.max(155).warning("Over 155 characters — Google may truncate this in search results."),
    }),

    // ✅ NEW: cover image
    defineField({
      name: "coverImage",
      title: "Cover image",
      type: "image",
      options: { hotspot: true },
    }),

    {
      name: "gallery",
      title: "Gallery",
      type: "array",
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

    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),

    // existing body/block content
    defineField({ name: "body", type: "blockContent" }),
  ],
});