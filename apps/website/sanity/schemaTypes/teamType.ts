import { defineField, defineType } from "sanity";

export const teamType = defineType({
  name: "team",
  title: "Team",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Team name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "isNDSC",
      title: "NDSC team?",
      description: "Enable for our own teams; leave off for opposition clubs.",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "isNDSC", media: "logo" },
    prepare({ title, subtitle, media }: { title?: string; subtitle?: boolean; media?: unknown }) {
      return { title: title || "Unnamed", subtitle: subtitle ? "NDSC" : "Opposition", media };
    },
  },
});
