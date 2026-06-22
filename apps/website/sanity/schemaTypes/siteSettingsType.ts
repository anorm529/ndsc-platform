import { defineField, defineType } from "sanity";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "clubReportBanner",
      title: "Club Report Banner",
      description: "Default card image for Club News posts with no Card image set.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "matchReportBanner",
      title: "Match Report Banner (Generic Fallback)",
      description: "Used on team report cards only when no team-specific banner is set below.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "buccaneersReportBanner",
      title: "Buccaneers Report Banner",
      description: "Card image for Buccaneers team reports.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "barracudasReportBanner",
      title: "Barracudas Report Banner",
      description: "Card image for Barracudas team reports.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "sluggersReportBanner",
      title: "Sluggers Report Banner",
      description: "Card image for Sluggers team reports.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "stallionsReportBanner",
      title: "Stallions Report Banner",
      description: "Card image for Stallions team reports.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "nightmaresReportBanner",
      title: "Nightmares Report Banner",
      description: "Card image for Nightmares team reports.",
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
