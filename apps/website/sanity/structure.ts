import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("NDSC Content")
    .items([
      // ── Posts ──────────────────────────────────────────────────────────
      S.listItem()
        .title("Club News")
        .child(
          S.documentList()
            .title("Club News")
            .schemaType("post")
            .filter('_type == "post" && postKind == "clubNews"')
        ),
      S.listItem()
        .title("Team Reports")
        .child(
          S.documentList()
            .title("Team Reports")
            .schemaType("post")
            .filter('_type == "post" && postKind == "teamReport"')
        ),
      S.listItem()
        .title("Featured Posts")
        .child(
          S.documentList()
            .title("Featured Posts")
            .schemaType("post")
            .filter('_type == "post" && featured == true')
        ),
      S.divider(),
      S.documentTypeListItem("post").title("All Posts"),
      S.divider(),

      // ── Teams ──────────────────────────────────────────────────────────
      S.listItem()
        .title("NDSC Teams")
        .child(
          S.documentList()
            .title("NDSC Teams")
            .schemaType("team")
            .filter('_type == "team" && isNDSC == true')
        ),
      S.listItem()
        .title("Opposition Teams")
        .child(
          S.documentList()
            .title("Opposition Teams")
            .schemaType("team")
            .filter('_type == "team" && isNDSC != true')
        ),
      S.divider(),

      // ── Site ───────────────────────────────────────────────────────────
      S.listItem()
        .title("Site Settings")
        .id("siteSettings")
        .child(
          S.document()
            .schemaType("siteSettings")
            .documentId("siteSettings")
        ),
      S.divider(),

      // ── Meta ───────────────────────────────────────────────────────────
      S.documentTypeListItem("author").title("Authors"),
      S.documentTypeListItem("category").title("Categories"),
    ]);
