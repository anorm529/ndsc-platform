import { defineField, defineType } from "sanity";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "clubReportBanner",
      title: "Club Report Banner",
      description: "Applied automatically to all Club News posts.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "matchReportBanner",
      title: "Match Report Banner",
      description: "Applied automatically to all Team Report posts.",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Settings" };
    },
  },
});
